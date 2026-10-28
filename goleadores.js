/**
 * eFootball Manager — Control de Goleadores y Nivelación de Temporada
 * Permite seleccionar las cartas exactas de cada delantero de tu plantilla,
 * balancear sus goles para que todos queden igualados y controlar el progreso de nivelación.
 */

(function () {
  'use strict';

  // ── Estado Local ────────────────────────────────────────────────────────────
  let gState = {
    delanteros: [],
    estrella_id: null,
    meta_modo: 'max', // 'max' (automático al mayor regular) o 'fija'
    meta_fija: 20,
    asistente_estrella_id: null,
    asistencias_meta_modo: 'max',
    asistencias_meta_fija: 20,
    temporada: 'Temporada Actual',
    historial_partidos: [],
    temporadas_archivadas: []
  };

  let gFiltro = 'todos';
  let gBusqueda = '';
  let gOrden = 'faltantes'; // 'faltantes' (más faltantes primero) o 'mas' (más goles/asistencias primero)
  let gModoEstadistica = 'goles';
  let gPickerJugadorSeleccionado = null;
  let gPickerModo = 'agregar'; // 'agregar' o 'cambiar'
  let gPickerTargetId = null;
  let gPickerLoadError = '';
  let gSyncError = '';
  let gRosterError = '';
  let gPlantillaCargada = false;

  // ── Carga y Persistencia ────────────────────────────────────────────────────
  async function cargarGoleadores() {
    try {
      const cache = localStorage.getItem('ef_goleadores_data');
      if (cache) {
        try {
          const parsed = JSON.parse(cache);
          if (parsed && Array.isArray(parsed.delanteros)) {
            gState = parsed;
          }
        } catch (e) { }
      }

      const res = await fetch('/api/goleadores');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.delanteros)) {
          gState = data;
          localStorage.setItem('ef_goleadores_data', JSON.stringify(data));
        }
      }
    } catch (err) {
      console.warn('Cargando desde almacenamiento local:', err);
    }
    normalizarTotales();
  }

  async function guardarGoleadores() {
    normalizarTotales();
    localStorage.setItem('ef_goleadores_data', JSON.stringify(gState));
    try {
      const res = await fetch('/api/goleadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gState)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      gSyncError = '';
    } catch (err) {
      console.error('Error sincronizando con el servidor:', err);
      gSyncError = 'Los cambios se guardaron en este dispositivo, pero no se pudieron sincronizar con tu cuenta.';
    }
  }

  function obtenerCartaActual(jugador) {
    const playerId = String(jugador.player_id || jugador.id || '');
    const cartaActual = (window.jugadores || []).find(j => String(j.id) === playerId);
    return cartaActual
      ? { ...jugador, ...cartaActual, id: jugador.id || cartaActual.id, player_id: playerId }
      : jugador;
  }

  function normalizarTotales() {
    if (!Array.isArray(gState.delanteros)) gState.delanteros = [];
    if (!Array.isArray(gState.historial_partidos)) gState.historial_partidos = [];
    if (!Array.isArray(gState.temporadas_archivadas)) gState.temporadas_archivadas = [];
    gState.delanteros.forEach(d => {
      d.goles_base = parseInt(d.goles_base, 10) || 0;
      d.goles_nuevos = parseInt(d.goles_nuevos, 10) || 0;
      d.goles_totales = d.goles_base + d.goles_nuevos;
      d.asistencias_base = parseInt(d.asistencias_base, 10) || 0;
      d.asistencias_nuevas = parseInt(d.asistencias_nuevas, 10) || 0;
      d.asistencias_totales = d.asistencias_base + d.asistencias_nuevas;
    });

    if (!['max', 'fija'].includes(gState.asistencias_meta_modo)) {
      gState.asistencias_meta_modo = 'max';
    }
    gState.asistencias_meta_fija = parseInt(gState.asistencias_meta_fija, 10) || 20;

    if (!gState.delanteros.some(d => d.id === gState.estrella_id)) {
      const estrella = gState.delanteros.find(d => d.es_estrella) || gState.delanteros[0];
      gState.estrella_id = estrella ? estrella.id : null;
    }
    gState.delanteros.forEach(d => d.es_estrella = (d.id === gState.estrella_id));

    if (!gState.delanteros.some(d => d.id === gState.asistente_estrella_id)) {
      gState.asistente_estrella_id = gState.estrella_id
        || (gState.delanteros[0] ? gState.delanteros[0].id : null);
    }
  }

  function configEstadistica() {
    return gModoEstadistica === 'asistencias'
      ? {
        base: 'asistencias_base',
        nuevos: 'asistencias_nuevas',
        total: 'asistencias_totales',
        estrella: 'asistente_estrella_id',
        metaModo: 'asistencias_meta_modo',
        metaFija: 'asistencias_meta_fija',
        singular: 'asistencia',
        plural: 'asistencias',
        mayuscula: 'Asistencias',
        icono: '🎯'
      }
      : {
        base: 'goles_base',
        nuevos: 'goles_nuevos',
        total: 'goles_totales',
        estrella: 'estrella_id',
        metaModo: 'meta_modo',
        metaFija: 'meta_fija',
        singular: 'gol',
        plural: 'goles',
        mayuscula: 'Goles',
        icono: '⚽'
      };
  }

  window.cambiarModoEstadistica = function (modo) {
    if (!['goles', 'asistencias'].includes(modo)) return;
    gModoEstadistica = modo;
    gFiltro = 'todos';
    window.renderGoleadores();
  };

  // ── Cálculos de Nivelación y Métricas ──────────────────────────────────────
  function calcularMetricas() {
    normalizarTotales();
    const config = configEstadistica();
    const jugadores = gState.delanteros;

    let meta = 0;
    if (gState[config.metaModo] === 'fija') {
      meta = parseInt(gState[config.metaFija], 10) || 20;
    } else {
      meta = jugadores.reduce((max, d) => Math.max(max, d[config.total]), 0);
    }

    const totalEquipo = jugadores.reduce((sum, d) => sum + d[config.total], 0);
    let totalFaltan = 0;
    let niveladosCount = 0;

    jugadores.forEach(d => {
      const dif = meta - d[config.total];
      if (dif <= 0) {
        niveladosCount++;
      } else {
        totalFaltan += dif;
      }
    });

    const porcentajeNivelacion = jugadores.length > 0
      ? Math.round((niveladosCount / jugadores.length) * 100)
      : 100;

    const recomendados = [...jugadores]
      .filter(d => d[config.total] < meta)
      .sort((a, b) => a[config.total] - b[config.total])
      .slice(0, 3);

    return {
      jugadores,
      meta,
      totalEquipo,
      totalFaltan,
      niveladosCount,
      porcentajeNivelacion,
      recomendados
    };
  }

  // Helper para renderizar la carta eFootball
  function renderCardHtml(d, clickFn = '') {
    const carta = obtenerCartaActual(d);
    if (typeof window.htmlCarta === 'function') {
      const jObj = {
        ...carta,
        id: carta.player_id || carta.id,
        overall: carta.overall || carta.ovr
      };
      return window.htmlCarta(jObj, clickFn);
    }
    // Fallback si no está htmlCarta
    return `
      <div class="carta" ${clickFn ? `onclick="${clickFn}"` : ''}>
        ${carta.imagen ? `<img src="${carta.imagen}" alt="" onerror="this.style.display='none'">` : '<div class="carta-placeholder">⚽</div>'}
        <div class="carta-grad"></div>
        <div class="carta-ovr">
          <span class="carta-ovr-n">${carta.overall || carta.ovr || '—'}</span>
          <span class="carta-ovr-p">${carta.posicion || 'DC'}</span>
        </div>
        <div class="carta-nombre-wrap">
          <div class="carta-nombre">${carta.nombre}</div>
          ${carta.edicion ? `<span class="carta-ed">${carta.edicion}</span>` : ''}
        </div>
      </div>
    `;
  }

  // ── Render Principal ────────────────────────────────────────────────────────
  window.renderGoleadores = async function () {
    const contenedor = document.getElementById('goleadores-body');
    if (!contenedor) return;

    if (!gState.delanteros || gState.delanteros.length === 0) {
      await cargarGoleadores();
    }
    try {
      await obtenerJugadoresPlantilla();
      gRosterError = '';
    } catch (error) {
      console.warn('No se pudieron actualizar las cartas desde tu plantilla:', error);
      gRosterError = 'No se pudieron actualizar las cartas; se muestran los datos guardados.';
    }

    const config = configEstadistica();
    const {
      jugadores,
      meta,
      totalEquipo,
      totalFaltan,
      niveladosCount,
      porcentajeNivelacion,
      recomendados
    } = calcularMetricas();

    // Filtro y búsqueda
    let listaMostrar = [...gState.delanteros];
    if (gBusqueda.trim()) {
      const q = gBusqueda.toLowerCase().trim();
      listaMostrar = listaMostrar.filter(d => (d.nombre || '').toLowerCase().includes(q));
    }

    if (gFiltro === 'pendientes') {
      listaMostrar = listaMostrar.filter(d => d[config.total] < meta);
    } else if (gFiltro === 'nivelados') {
      listaMostrar = listaMostrar.filter(d => d[config.total] >= meta);
    }

    // Ordenamiento
    if (gOrden === 'faltantes') {
      listaMostrar.sort((a, b) => a[config.total] - b[config.total]);
    } else if (gOrden === 'mas') {
      listaMostrar.sort((a, b) => b[config.total] - a[config.total]);
    }

    // Si aún no tiene jugadores agregados
    const tieneJugadores = gState.delanteros.length > 0;

    let html = `
      <div class="gol-container">
        ${gSyncError ? `<div role="status" style="margin-bottom:12px;padding:10px 14px;border:1px solid rgba(239,68,68,.4);border-radius:8px;background:rgba(239,68,68,.1);color:#fecaca">${gSyncError}</div>` : ''}
        ${gRosterError ? `<div role="status" style="margin-bottom:12px;padding:10px 14px;border:1px solid rgba(240,180,41,.4);border-radius:8px;background:rgba(240,180,41,.1);color:#fbbf24">${gRosterError}</div>` : ''}
        <!-- Banner Superior de Control -->
        <div class="gol-header-banner">
          <div class="gol-header-titles">
            <h1>
              ${config.icono} CONTROL DE ${config.mayuscula.toUpperCase()} <span class="badge-pill">${gState.temporada || 'Temporada Actual'}</span>
            </h1>
            <p>
              Controla las ${config.plural} de cada carta de tu plantilla y equilibra las estadísticas para que todos tus delanteros queden nivelados.
            </p>
          </div>
          <div class="gol-actions-bar">
            <button class="btn-gol-primary" onclick="window.abrirModalAgregarJugador()" title="Seleccionar una carta de tu plantilla para añadirla">
              + Agregar Delantero (Elegir Carta)
            </button>
            <button class="btn-gol-sec" onclick="window.abrirModalAjustarBase()" title="Cargar o modificar goles y asistencias iniciales">
              ⚡ Ajustar Estadísticas
            </button>
            <button class="btn-gol-sec" onclick="window.abrirModalRegistrarPartido()" title="Anotar goles de un partido recién jugado">
              📋 Registrar Partido
            </button>
            <button class="btn-gol-sec" onclick="window.abrirModalHistorial()" title="Ver historial de goles y partidos">
              📜 Historial
            </button>
            <button class="btn-gol-sec" onclick="window.abrirModalConfigMeta()" title="Modificar modo o meta de nivelación">
              ⚙️ Meta
            </button>
            <button class="btn-gol-sec btn-gol-reset" onclick="window.reiniciarTemporada()" title="Archiva las estadísticas actuales y comienza una temporada nueva" ${tieneJugadores ? '' : 'disabled'}>
              🔄 Reiniciar temporada
            </button>
          </div>
          <div class="gol-mode-switch" role="group" aria-label="Tipo de estadística">
            <button class="gol-pill-btn ${gModoEstadistica === 'goles' ? 'activo' : ''}" onclick="window.cambiarModoEstadistica('goles')" aria-pressed="${gModoEstadistica === 'goles'}">⚽ Goleadores</button>
            <button class="gol-pill-btn ${gModoEstadistica === 'asistencias' ? 'activo' : ''}" onclick="window.cambiarModoEstadistica('asistencias')" aria-pressed="${gModoEstadistica === 'asistencias'}">🎯 Asistencias</button>
          </div>
        </div>

        ${!tieneJugadores ? `
          <!-- Pantalla de Bienvenida cuando está vacío -->
          <div style="background:var(--card);border:2px dashed var(--borde);border-radius:16px;padding:36px 24px;text-align:center;">
            <div style="font-size:3.5rem;margin-bottom:12px;">⚽</div>
            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--oro);margin:0 0 8px 0;letter-spacing:0.04em;">
              SELECCIONA TUS DELANTEROS FIJOS
            </h2>
            <p style="color:var(--apagado);max-width:620px;margin:0 auto 24px auto;font-size:0.9rem;line-height:1.5;">
              Para que el contador tenga exactamente las cartas que tú utilizas en tu juego, 
              agrégalas directamente desde tu plantilla con su imagen, media (OVR) y edición real.
            </p>

            <button class="btn-gol-primary" style="font-size:0.95rem;padding:12px 24px;" onclick="window.abrirModalAgregarJugador()">
              ➕ Seleccionar y Agregar Delanteros de mi Plantilla
            </button>
            <p style="font-size:0.78rem;color:var(--apagado);margin:16px auto 0;max-width:520px;line-height:1.45;">
              Primero debes tener cada jugador en <b style="color:var(--texto)">Plantilla</b> con su carta (imagen subida).
              Aquí solo eliges cuáles entran al contador de goles — igual que al agregar a la carpeta del técnico.
            </p>
          </div>
        ` : `
          <!-- Dashboard: Termómetro de Nivelación -->
          <div class="gol-dashboard-single">
            <div class="gol-dash-card">
              <div class="dash-card-header">
                <span class="dash-card-tag" style="color:#10b981;">⚖️ Nivelación del Grupo (${jugadores.length} Delanteros)</span>
                <span style="font-size:0.75rem;color:var(--apagado);">
                  Meta: <b style="color:#fff">${meta} ${config.plural}</b> (${gState[config.metaModo] === 'max' ? 'Auto-Mayor' : 'Fija'})
                </span>
              </div>
              
              <div class="balance-stats-row">
                <div class="balance-item">
                  <span class="balance-label">${config.mayuscula} Totales del Equipo</span>
                  <span class="balance-val highlight">${totalEquipo}</span>
                </div>
                <div class="balance-item">
                  <span class="balance-label">Jugadores al Día</span>
                  <span class="balance-val">${niveladosCount} / ${jugadores.length}</span>
                </div>
                <div class="balance-item">
                  <span class="balance-label">Faltan para Nivelar</span>
                  <span class="balance-val" style="color:${totalFaltan === 0 ? '#10b981' : '#f0b429'}">
                    ${totalFaltan === 0 ? '¡100% Nivelados!' : `${totalFaltan} ${config.plural}`}
                  </span>
                </div>
              </div>

              <!-- Barra de Nivelación -->
              <div class="barra-balance-wrap" title="${porcentajeNivelacion}% de jugadores nivelados en ${config.plural}">
                <div class="barra-balance-fill" style="width: ${porcentajeNivelacion}%"></div>
              </div>

              <!-- Sugerencia Inteligente para el próximo partido -->
              <div class="sugerencia-box">
                <span style="font-size:1.1rem">💡</span>
                <div>
                  ${recomendados.length > 0 ? `
                    <b>Jugadores recomendados:</b> Prioriza a
                    ${recomendados.map(r => `<strong>${r.nombre.split(' ')[0]}</strong> (faltan ${meta - r[config.total]})`).join(', ')}
                    para nivelar ${config.plural}.
                  ` : `
                    <b style="color:#10b981;">¡Todos tus jugadores están nivelados en ${meta} ${config.plural}!</b>
                  `}
                </div>
              </div>
            </div>

            <!-- Gráfica de Distribución Visual -->
            ${renderGraficaDistribucion(jugadores, meta, config)}
          </div>

          <!-- Barra de Filtros y Búsqueda -->
          <div class="gol-filter-bar">
            <div class="gol-pills-wrap">
              <button class="gol-pill-btn ${gFiltro === 'todos' ? 'activo' : ''}" onclick="window.cambiarFiltroGoles('todos')">
                Todos (${gState.delanteros.length})
              </button>
              <button class="gol-pill-btn ${gFiltro === 'pendientes' ? 'activo' : ''}" onclick="window.cambiarFiltroGoles('pendientes')">
                ⏳ Pendientes (${jugadores.filter(d => d[config.total] < meta).length})
              </button>
              <button class="gol-pill-btn ${gFiltro === 'nivelados' ? 'activo' : ''}" onclick="window.cambiarFiltroGoles('nivelados')">
                ✅ Nivelados (${jugadores.filter(d => d[config.total] >= meta).length})
              </button>
            </div>

            <div class="gol-sort-and-search">
              <div class="gol-sort-wrap">
                <span class="gol-sort-label">Ordenar:</span>
                <button class="gol-sort-btn ${gOrden === 'faltantes' ? 'activo' : ''}" onclick="window.cambiarOrdenGoles('faltantes')" title="Los que más les faltan primero">
                  📉 Más faltantes
                </button>
                <button class="gol-sort-btn ${gOrden === 'mas' ? 'activo' : ''}" onclick="window.cambiarOrdenGoles('mas')" title="Los que más ${config.plural} tienen primero">
                  📈 Más ${config.plural}
                </button>
              </div>
              <input 
                type="text" 
                id="goleadores-search-input"
                class="gol-search-input" 
                placeholder="🔍 Buscar por nombre..." 
                value="${gBusqueda}"
                oninput="window.filtrarPorNombre(this.value)"
              >
            </div>
          </div>

          <!-- Grid de Delanteros con Cartas Auténticas eFootball -->
          <div class="gol-cards-grid">
            ${listaMostrar.map(d => renderCardDelantero(d, meta)).join('')}
          </div>
        `}
      </div>
    `;

    contenedor.innerHTML = html;
  };

  // ── Gráfica de Distribución Visual (Barras Horizontales) ─────────────────────
  function renderGraficaDistribucion(jugadores, meta, config) {
    if (!jugadores || jugadores.length === 0) return '';

    // Ordenar por total DESC para la gráfica
    const ordenados = [...jugadores].sort((a, b) => b[config.total] - a[config.total]);
    const maxVal    = Math.max(meta, ordenados[0][config.total], 1);

    const barras = ordenados.map(d => {
      const total    = d[config.total];
      const pct      = Math.round((total / maxVal) * 100);
      const metaPct  = Math.min(100, Math.round((meta / maxVal) * 100));
      const nivelado = total >= meta;
      const dif      = meta - total;
      const nombre   = d.nombre.split(' ').slice(0, 2).join(' ');

      const barColor = nivelado
        ? 'linear-gradient(90deg, #10b981, #34d399)'
        : total >= meta * 0.75
          ? 'linear-gradient(90deg, #f0b429, #fbbf24)'
          : 'linear-gradient(90deg, #ef4444, #fb923c)';

      return `
        <div class="dist-row">
          <div class="dist-nombre" title="${d.nombre}">${nombre}</div>
          <div class="dist-bar-wrap">
            <div class="dist-bar-track">
              <!-- Marca de la meta -->
              <div class="dist-meta-mark" style="left:${metaPct}%" title="Meta: ${meta}"></div>
              <!-- Barra del jugador -->
              <div class="dist-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
          </div>
          <div class="dist-val ${nivelado ? 'dist-val-ok' : dif <= 3 ? 'dist-val-near' : 'dist-val-lejos'}">
            ${total}${nivelado ? ' ✓' : ` <small>(-${dif})</small>`}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="gol-dist-card">
        <div class="dash-card-header">
          <span class="dash-card-tag" style="color:#38bdf8;">📊 Distribución Visual de ${config.mayuscula}</span>
          <span style="font-size:0.72rem;color:var(--apagado);">
            Línea = meta <b style="color:#fff">${meta}</b>
          </span>
        </div>
        <div class="dist-chart">
          ${barras}
        </div>
        <div class="dist-legend">
          <span class="dist-leg-dot" style="background:#10b981"></span> Al día
          <span class="dist-leg-dot" style="background:#f0b429;margin-left:10px"></span> Cerca
          <span class="dist-leg-dot" style="background:#ef4444;margin-left:10px"></span> Lejos
          <span style="margin-left:10px;border-left:2px dashed rgba(255,255,255,0.3);padding-left:10px;color:var(--apagado)">| línea = meta</span>
        </div>
      </div>
    `;
  }

  // ── Render de Tarjeta Individual con Carta eFootball Auténtica ─────────────

  function renderCardDelantero(d, meta) {
    const config = configEstadistica();
    const carta = obtenerCartaActual(d);
    const dif = meta - d[config.total];

    let pillClass = 'pendiente';
    let pillText = `⏳ Faltan ${dif} ${config.plural}`;

    if (dif === 0) {
      pillClass = 'nivelado';
      pillText = '✅ Nivelado';
    } else if (dif < 0) {
      pillClass = 'adelantado';
      pillText = `🏆 Líder (+${Math.abs(dif)} sobre la meta)`;
    }

    const porcentaje = meta > 0 ? Math.min(100, Math.round((d[config.total] / meta) * 100)) : 100;

    return `
      <div class="gol-player-card" id="card-delantero-${d.id}">
        <div class="gol-card-split">
          <!-- Columna Izquierda: Carta eFootball Auténtica -->
          <div class="gol-carta-col">
            <div class="gol-carta-wrap" onclick="window.abrirModalCambiarCarta('${d.id}')" title="Haz clic para cambiar la carta">
              ${renderCardHtml(carta)}
            </div>
            <button class="btn-cambiar-carta" onclick="window.abrirModalCambiarCarta('${d.id}')" title="Cambiar edición o carta de ${d.nombre}">
              🔄 Cambiar Carta
            </button>
          </div>

          <!-- Columna Derecha: Panel de Goles y Acciones -->
          <div class="gol-stats-col">
            <div class="gol-status-row">
              <span class="gol-status-pill ${pillClass}">
                ${pillText}
              </span>
            </div>

            <!-- Gran Contador de Goles -->
            <div class="gol-counter-row">
              <div class="gol-total-display">
                <span class="gol-total-num" id="gol-num-${d.id}">${d[config.total]}</span>
                <span class="gol-total-lbl">${config.mayuscula} Totales</span>
              </div>
              <div class="gol-breakdown-details">
                <span>Base inicial: <b>${d[config.base]}</b></span>
                <span class="nuevos">Nuevos sumados: <b>+${d[config.nuevos]}</b></span>
                <span>${gModoEstadistica === 'goles' ? '🎯 Asistencias' : '⚽ Goles'}: <b>${gModoEstadistica === 'goles' ? d.asistencias_totales : d.goles_totales}</b></span>
              </div>
            </div>

            ${dif > 0 ? `
              <!-- Indicador prominente de cuántos faltan -->
              <div class="gol-faltan-badge">
                <span class="gol-faltan-num">${dif}</span>
                <span class="gol-faltan-text">${config.plural} para nivelar</span>
              </div>
            ` : ''}

            <!-- Barra de Progreso hacia la Meta -->
            <div class="gol-player-progress-wrap">
              <div class="gol-player-progress-info">
                <span>Hacia la meta (${meta} ${config.plural})</span>
                <span><b>${porcentaje}%</b></span>
              </div>
              <div class="gol-player-progress-bar">
                <div class="gol-player-progress-fill ${dif <= 0 ? 'completo' : 'incompleto'}" style="width: ${porcentaje}%"></div>
              </div>
            </div>

            <!-- Acciones de la estadística seleccionada -->
            <div class="gol-buttons-grid">
              ${gModoEstadistica === 'asistencias' ? `
                <button class="btn-assist-add" onclick="window.sumarAsistencia('${d.id}', 1)" title="Sumar 1 asistencia">🎯 +1 Asistencia</button>
                <button class="btn-assist-quick" onclick="window.sumarAsistencia('${d.id}', 2)" title="Sumar 2 asistencias">+2</button>
                <button class="btn-quick-sub" onclick="window.restarAsistencia('${d.id}', 1)" title="Deshacer 1 asistencia">↩ -1</button>
              ` : `
                <button class="btn-sumar-1" onclick="window.sumarGol('${d.id}', 1)" title="Sumar 1 gol">⚽ +1 Gol</button>
                <button class="btn-quick-add" onclick="window.sumarGol('${d.id}', 2)" title="Sumar 2 goles (Doblete)">+2</button>
                <button class="btn-quick-add" onclick="window.sumarGol('${d.id}', 3)" title="Sumar 3 goles (Hat-Trick)">🎩 +3</button>
                <button class="btn-quick-sub" onclick="window.restarGol('${d.id}', 1)" title="Deshacer 1 gol">↩ -1</button>
              `}
            </div>

            <!-- Footer de la tarjeta con opciones -->
            <div class="gol-card-footer">
              <button class="btn-icon-subtle" onclick="window.abrirModalEditarJugador('${d.id}')" title="Editar goles o asistencias">
                ✏️ Editar estadísticas
              </button>
              <button class="btn-icon-subtle eliminar" onclick="window.quitarJugador('${d.id}')" title="Quitar de la lista de goleadores">
                🗑️ Quitar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Acciones de Gol ────────────────────────────────────────────────────────
  window.sumarGol = async function (id, cantidad = 1) {
    const jugador = gState.delanteros.find(d => d.id === id);
    if (!jugador) return;

    jugador.goles_nuevos = (parseInt(jugador.goles_nuevos, 10) || 0) + cantidad;
    jugador.goles_totales = (parseInt(jugador.goles_base, 10) || 0) + jugador.goles_nuevos;

    if (!Array.isArray(gState.historial_partidos)) gState.historial_partidos = [];
    gState.historial_partidos.unshift({
      id: Date.now().toString(),
      fecha: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
      tipo: 'gol',
      jugador: jugador.nombre,
      jugador_id: jugador.id,
      cantidad: cantidad
    });
    if (gState.historial_partidos.length > 50) gState.historial_partidos.pop();

    const numEl = document.getElementById(`gol-num-${id}`);
    if (numEl) {
      numEl.classList.remove('gol-pop-anim');
      void numEl.offsetWidth;
      numEl.classList.add('gol-pop-anim');
    }

    await guardarGoleadores();
    window.renderGoleadores();
  };

  window.restarGol = async function (id, cantidad = 1) {
    const jugador = gState.delanteros.find(d => d.id === id);
    if (!jugador) return;

    if (jugador.goles_nuevos >= cantidad) {
      jugador.goles_nuevos -= cantidad;
    } else if (jugador.goles_totales >= cantidad) {
      const rem = cantidad - jugador.goles_nuevos;
      jugador.goles_nuevos = 0;
      jugador.goles_base = Math.max(0, jugador.goles_base - rem);
    } else {
      jugador.goles_nuevos = 0;
      jugador.goles_base = 0;
    }
    jugador.goles_totales = jugador.goles_base + jugador.goles_nuevos;

    await guardarGoleadores();
    window.renderGoleadores();
  };

  window.sumarAsistencia = async function (id, cantidad = 1) {
    const jugador = gState.delanteros.find(d => d.id === id);
    if (!jugador) return;

    jugador.asistencias_nuevas = (parseInt(jugador.asistencias_nuevas, 10) || 0) + cantidad;
    jugador.asistencias_totales = (parseInt(jugador.asistencias_base, 10) || 0) + jugador.asistencias_nuevas;

    if (!Array.isArray(gState.historial_partidos)) gState.historial_partidos = [];
    gState.historial_partidos.unshift({
      id: Date.now().toString(),
      fecha: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
      tipo: 'asistencia',
      jugador: jugador.nombre,
      jugador_id: jugador.id,
      cantidad
    });
    if (gState.historial_partidos.length > 50) gState.historial_partidos.pop();

    await guardarGoleadores();
    window.renderGoleadores();
  };

  window.restarAsistencia = async function (id, cantidad = 1) {
    const jugador = gState.delanteros.find(d => d.id === id);
    if (!jugador) return;

    if (jugador.asistencias_nuevas >= cantidad) {
      jugador.asistencias_nuevas -= cantidad;
    } else if (jugador.asistencias_totales >= cantidad) {
      const rem = cantidad - jugador.asistencias_nuevas;
      jugador.asistencias_nuevas = 0;
      jugador.asistencias_base = Math.max(0, jugador.asistencias_base - rem);
    } else {
      jugador.asistencias_nuevas = 0;
      jugador.asistencias_base = 0;
    }
    jugador.asistencias_totales = jugador.asistencias_base + jugador.asistencias_nuevas;

    await guardarGoleadores();
    window.renderGoleadores();
  };

  window.reiniciarTemporada = async function () {
    if (!gState.delanteros.length) return;
    if (!window.confirm('Se guardarán las estadísticas completas de esta temporada en el historial y los contadores actuales empezarán en cero. ¿Deseas continuar?')) return;

    const delanterosArchivados = JSON.parse(JSON.stringify(gState.delanteros));
    const temporadasArchivadas = Array.isArray(gState.temporadas_archivadas)
      ? gState.temporadas_archivadas
      : [];
    temporadasArchivadas.unshift({
      id: Date.now().toString(),
      temporada: gState.temporada || 'Temporada Actual',
      fecha: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
      total_goles: delanterosArchivados.reduce((total, jugador) => total + jugador.goles_totales, 0),
      total_asistencias: delanterosArchivados.reduce((total, jugador) => total + jugador.asistencias_totales, 0),
      delanteros: delanterosArchivados,
      historial_partidos: JSON.parse(JSON.stringify(gState.historial_partidos || [])),
      meta_modo: gState.meta_modo,
      meta_fija: gState.meta_fija,
      asistencias_meta_modo: gState.asistencias_meta_modo,
      asistencias_meta_fija: gState.asistencias_meta_fija,
      estrella_id: gState.estrella_id,
      asistente_estrella_id: gState.asistente_estrella_id
    });

    gState.temporadas_archivadas = temporadasArchivadas;
    gState.temporada = `Temporada ${temporadasArchivadas.length + 1}`;
    gState.historial_partidos = [];
    gState.delanteros.forEach(jugador => {
      jugador.goles_base = 0;
      jugador.goles_nuevos = 0;
      jugador.goles_totales = 0;
      jugador.asistencias_base = 0;
      jugador.asistencias_nuevas = 0;
      jugador.asistencias_totales = 0;
    });

    await guardarGoleadores();
    window.renderGoleadores();
  };

  window.hacerEstrella = async function (id) {
    const config = configEstadistica();
    gState[config.estrella] = id;
    if (gModoEstadistica === 'goles') {
      gState.delanteros.forEach(d => d.es_estrella = (d.id === id));
    }
    await guardarGoleadores();
    window.renderGoleadores();
  };

  window.quitarJugador = async function (id) {
    const jugador = gState.delanteros.find(d => d.id === id);
    if (!jugador) return;
    if (!confirm(`¿Deseas quitar a ${jugador.nombre} del registro de goleadores?`)) return;

    gState.delanteros = gState.delanteros.filter(d => d.id !== id);
    if (gState.estrella_id === id && gState.delanteros.length > 0) {
      gState.estrella_id = gState.delanteros[0].id;
    }
    if (gState.asistente_estrella_id === id) {
      gState.asistente_estrella_id = gState.delanteros.length ? gState.delanteros[0].id : null;
    }
    await guardarGoleadores();
    window.renderGoleadores();
  };

  window.cambiarFiltroGoles = function (f) {
    gFiltro = f;
    window.renderGoleadores();
  };

  window.cambiarOrdenGoles = function (orden) {
    if (!['faltantes', 'mas'].includes(orden)) return;
    gOrden = orden;
    window.renderGoleadores();
  };

  window.filtrarPorNombre = function (val) {
    gBusqueda = val;
    const input = document.getElementById('goleadores-search-input');
    const caret = input ? input.selectionStart : val.length;
    window.renderGoleadores().then(() => {
      const updatedInput = document.getElementById('goleadores-search-input');
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(caret, caret);
      }
    });
  };

  // ── MODAL VISUAL: SELECTOR DE CARTAS DE PLANTILLA ───────────────────────────
  // (Funciona exactamente igual a cuando se agrega a la carpeta del técnico)
  window.abrirModalAgregarJugador = async function (busquedaInicial = '') {
    gPickerModo = 'agregar';
    gPickerTargetId = null;
    gPickerJugadorSeleccionado = null;
    await mostrarModalPickerCartas(busquedaInicial);
  };

  window.abrirModalAgregarConBusqueda = function (nombre) {
    window.abrirModalAgregarJugador(nombre);
  };

  window.abrirModalCambiarCarta = async function (delanteroId) {
    const d = gState.delanteros.find(x => x.id === delanteroId);
    if (!d) return;
    gPickerModo = 'cambiar';
    gPickerTargetId = delanteroId;
    gPickerJugadorSeleccionado = null;
    // Buscamos con el nombre del delantero para que sus cartas salgan de inmediato
    const primerNombre = (d.nombre || '').split(' ')[0];
    await mostrarModalPickerCartas(primerNombre);
  };

  async function obtenerJugadoresPlantilla(forceRefresh = false) {
    if (!forceRefresh && gPlantillaCargada && Array.isArray(window.jugadores)) {
      return window.jugadores;
    }
    const res = await fetch('/api/jugadores');
    if (!res.ok) {
      throw new Error(`No se pudieron cargar tus cartas (HTTP ${res.status}).`);
    }
    const jugadores = await res.json();
    if (!Array.isArray(jugadores)) {
      throw new Error('La respuesta de tus cartas no tiene un formato válido.');
    }
    window.jugadores = jugadores;
    gPlantillaCargada = true;
    return jugadores;
  }

  async function mostrarModalPickerCartas(busquedaInicial = '') {
    let plantilla = [];
    let errorCarga = '';
    gPickerLoadError = '';
    try {
      plantilla = await obtenerJugadoresPlantilla(true);
    } catch (error) {
      console.error('Error cargando las cartas de tu plantilla:', error);
      errorCarga = 'No se pudieron cargar tus cartas. Comprueba tu conexión e inténtalo de nuevo.';
    }
    gPickerLoadError = errorCarga;

    const overlay = document.createElement('div');
    overlay.className = 'gol-modal-backdrop';
    overlay.id = 'ov-picker-cartas';

    overlay.innerHTML = `
      <div class="gol-modal-card">
        <div class="gol-modal-header">
          <h3>
            ${gPickerModo === 'cambiar' ? '🔄 Cambiar Carta de Delantero' : '+ Seleccionar Carta de tu Plantilla'}
          </h3>
          <button class="gol-modal-close" onclick="window.cerrarModalGol('ov-picker-cartas')">✕</button>
        </div>
        <div class="gol-modal-body">
          <!-- Toolbar del selector -->
          <div class="gol-picker-toolbar">
            <input 
              type="text" 
              id="picker-busqueda-input" 
              class="gol-search-input" 
              style="flex:1" 
              placeholder="🔍 Buscar carta por nombre, posición o edición..."
              value="${busquedaInicial}"
              oninput="window.filtrarPickerCartas()"
            >
            <div class="gol-picker-chips">
              <button class="gol-chip-btn activo" id="chip-pos-todas" onclick="window.filtrarPickerPos('')">Todas</button>
              <button class="gol-chip-btn" id="chip-pos-del" onclick="window.filtrarPickerPos('DEL')">Delanteros</button>
              <button class="gol-chip-btn" id="chip-pos-cd" onclick="window.filtrarPickerPos('CD')">CD</button>
              <button class="gol-chip-btn" id="chip-pos-sd" onclick="window.filtrarPickerPos('SD')">SD</button>
              <button class="gol-chip-btn" id="chip-pos-ext" onclick="window.filtrarPickerPos('EXT')">Extremos</button>
              <button class="gol-chip-btn" id="chip-pos-mo" onclick="window.filtrarPickerPos('MO')">MO</button>
            </div>
          </div>

          <!-- Grid Visual de Cartas -->
          <div class="gol-picker-grid" id="picker-cartas-grid">
            <!-- Se llena dinámicamente -->
          </div>

          <!-- Barra de Confirmación de Carta Seleccionada -->
          <div class="gol-picker-selection-bar" id="picker-selection-bar" style="display:none;">
            <div class="picker-selected-info">
              <div id="sel-card-preview" class="picker-selected-carta"></div>
              <div>
                <b id="sel-card-nombre" style="font-size:1.05rem;color:#fff;display:block;">—</b>
                <span id="sel-card-meta" style="font-size:0.75rem;color:var(--apagado);">—</span>
              </div>
            </div>

            <div class="picker-inputs-group">
              ${gPickerModo === 'agregar' ? `
                <div>
                  <label style="font-size:0.7rem;color:var(--apagado);text-transform:uppercase;font-weight:700;display:block;">Goles ya hechos (Base):</label>
                  <input type="number" id="sel-card-goles-base" class="gol-search-input" style="width:85px;padding:6px 10px;" value="0" min="0">
                </div>
                <button class="btn-gol-primary" onclick="window.confirmarSeleccionCarta()">
                  ➕ Añadir a Goleadores
                </button>
              ` : `
                <button class="btn-gol-primary" onclick="window.confirmarSeleccionCarta()">
                  ✅ Asignar Esta Carta
                </button>
              `}
            </div>
          </div>
        </div>
        <div class="gol-modal-footer">
          <button class="btn-gol-sec" onclick="window.cerrarModalGol('ov-picker-cartas')">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    window.pickerFiltroPos = '';
    window.renderGridPickerCartas(plantilla, busquedaInicial, errorCarga);
  }

  window.renderGridPickerCartas = function (plantilla, busqueda = '', errorCarga = gPickerLoadError) {
    const grid = document.getElementById('picker-cartas-grid');
    if (!grid) return;

    if (errorCarga) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--rojo);">
          ${errorCarga}
        </div>
      `;
      return;
    }

    let filtrados = [...plantilla];

    // Filtro por texto
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter(j =>
        (j.nombre || '').toLowerCase().includes(q) ||
        (j.posicion || '').toLowerCase().includes(q) ||
        (j.edicion || '').toLowerCase().includes(q)
      );
    }

    // Filtro por posición
    const pos = window.pickerFiltroPos || '';
    if (pos === 'DEL') {
      filtrados = filtrados.filter(j => ['DC', 'SD', 'CD', 'EXI', 'EXD'].includes(j.posicion));
    } else if (pos === 'EXT') {
      filtrados = filtrados.filter(j => ['EXI', 'EXD'].includes(j.posicion));
    } else if (pos) {
      filtrados = filtrados.filter(j => j.posicion === pos);
    }

    if (plantilla.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--apagado);">
          <p style="margin:0 0 10px 0">Aún no hay jugadores en tu plantilla.</p>
          <p style="margin:0;font-size:0.85rem">Ve a la pestaña <b style="color:var(--oro)">Plantilla</b>, agrega cada delantero y sube la imagen de su carta; luego vuelve aquí para elegirlos.</p>
        </div>
      `;
      return;
    }

    if (filtrados.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--apagado);">
          No se encontraron cartas en tu plantilla que coincidan con la búsqueda.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtrados.map(j => {
      const jid = String(j.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
      <div 
        class="gol-picker-item ${gPickerJugadorSeleccionado && gPickerJugadorSeleccionado.id === j.id ? 'seleccionado' : ''}" 
        id="picker-item-${j.id}"
        onclick="window.seleccionarCartaEnPicker('${jid}')"
      >
        ${renderCardHtml(j)}
      </div>`;
    }).join('');
  };

  window.filtrarPickerCartas = function () {
    const val = document.getElementById('picker-busqueda-input').value;
    const plantilla = window.jugadores || [];
    window.renderGridPickerCartas(plantilla, val);
  };

  window.filtrarPickerPos = function (pos) {
    window.pickerFiltroPos = pos;
    document.querySelectorAll('.gol-chip-btn').forEach(b => b.classList.remove('activo'));
    if (!pos) document.getElementById('chip-pos-todas').classList.add('activo');
    else if (pos === 'DEL') document.getElementById('chip-pos-del').classList.add('activo');
    else if (pos === 'CD') document.getElementById('chip-pos-cd').classList.add('activo');
    else if (pos === 'SD') document.getElementById('chip-pos-sd').classList.add('activo');
    else if (pos === 'EXT') document.getElementById('chip-pos-ext').classList.add('activo');
    else if (pos === 'MO') document.getElementById('chip-pos-mo').classList.add('activo');

    window.filtrarPickerCartas();
  };

  window.seleccionarCartaEnPicker = function (jid) {
    const plantilla = window.jugadores || [];
    const jug = plantilla.find(x => String(x.id) === String(jid));
    if (!jug) return;

    gPickerJugadorSeleccionado = jug;

    // Resaltar en grid
    document.querySelectorAll('.gol-picker-item').forEach(el => el.classList.remove('seleccionado'));
    const itemEl = document.getElementById(`picker-item-${jid}`);
    if (itemEl) itemEl.classList.add('seleccionado');

    // Mostrar barra inferior
    const bar = document.getElementById('picker-selection-bar');
    if (bar) bar.style.display = 'flex';

    const preview = document.getElementById('sel-card-preview');
    if (preview) preview.innerHTML = renderCardHtml(jug);

    const nom = document.getElementById('sel-card-nombre');
    if (nom) nom.textContent = jug.nombre;

    const meta = document.getElementById('sel-card-meta');
    if (meta) meta.textContent = `${jug.posicion || 'DC'} · OVR ${jug.overall || '—'} · ${jug.edicion || 'Estándar'}`;
  };

  window.confirmarSeleccionCarta = async function () {
    if (!gPickerJugadorSeleccionado) {
      alert('Por favor selecciona una carta');
      return;
    }

    const jug = gPickerJugadorSeleccionado;

    if (gPickerModo === 'cambiar') {
      const index = gState.delanteros.findIndex(x => x.id === gPickerTargetId);
      if (index < 0) return;
      const delanteroActual = gState.delanteros[index];
      gState.delanteros[index] = {
        ...jug,
        id: delanteroActual.id,
        player_id: jug.id,
        goles_base: delanteroActual.goles_base,
        goles_nuevos: delanteroActual.goles_nuevos,
        goles_totales: delanteroActual.goles_totales,
        asistencias_base: delanteroActual.asistencias_base,
        asistencias_nuevas: delanteroActual.asistencias_nuevas,
        asistencias_totales: delanteroActual.asistencias_totales,
        es_estrella: delanteroActual.es_estrella
      };
    } else {
      if (gState.delanteros.some(d => String(d.player_id || d.id) === String(jug.id))) {
        alert('Esta carta ya está en la lista de goleadores. Si tienes otra edición, agrégala como una carta diferente en tu plantilla.');
        return;
      }

      // Agregar nuevo jugador
      const baseEl = document.getElementById('sel-card-goles-base');
      const base = baseEl ? Math.max(0, parseInt(baseEl.value, 10) || 0) : 0;
      const esEstrella = document.getElementById('sel-card-es-estrella') ? document.getElementById('sel-card-es-estrella').checked : false;

      const uid = 'g_' + jug.id + '_' + Date.now().toString().slice(-4);

      if (esEstrella) {
        gState.estrella_id = uid;
        gState.delanteros.forEach(x => x.es_estrella = false);
      }

      gState.delanteros.push({
        ...jug,
        id: uid,
        player_id: jug.id,
        goles_base: base,
        goles_nuevos: 0,
        goles_totales: base,
        asistencias_base: 0,
        asistencias_nuevas: 0,
        asistencias_totales: 0,
        es_estrella: esEstrella
      });
    }

    await guardarGoleadores();
    window.cerrarModalGol('ov-picker-cartas');
    window.renderGoleadores();
  };

  // ── MODAL 1: Carga Masiva de Estadísticas Iniciales / Históricas ────────────
  window.abrirModalAjustarBase = function () {
    const overlay = document.createElement('div');
    overlay.className = 'gol-modal-backdrop';
    overlay.id = 'ov-goles-base';

    overlay.innerHTML = `
      <div class="gol-modal-card" style="max-width: 650px;">
        <div class="gol-modal-header">
          <h3>⚡ Ajustar Goles y Asistencias Actuales</h3>
          <button class="gol-modal-close" onclick="window.cerrarModalGol('ov-goles-base')">✕</button>
        </div>
        <div class="gol-modal-body">
          <p style="color:var(--apagado);font-size:0.82rem;margin:0">
            Ingresa los goles y asistencias que ya tiene cada delantero. Las estadísticas nuevas se sumarán automáticamente sobre estos valores.
          </p>
          <div class="gol-table-wrap">
            <table class="gol-table">
              <thead>
                <tr>
                  <th>Delantero</th>
                  <th>Goles Base (Ya hechos)</th>
                  <th>Goles Nuevos</th>
                  <th style="text-align:right">Total</th>
                  <th>Asist. Base</th>
                  <th>Asist. Nuevas</th>
                  <th style="text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${gState.delanteros.map(d => `
                  <tr>
                    <td>
                      <div class="gol-mini-player">
                        <img src="${d.imagen || '/imagenes/default_player.png'}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'40\\' fill=\\'%23666\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'5\\'/><path d=\\'M3 21v-2a7 7 0 0 1 14 0v2\\'/></svg>'">
                        <div>
                          <b style="color:#fff">${d.nombre}</b>
                          <div style="font-size:0.7rem;color:var(--apagado)">${d.posicion || 'DC'} · OVR ${d.overall || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <input type="number" id="base-input-${d.id}" min="0" value="${d.goles_base}" oninput="window.calcTotalPreview('${d.id}')">
                    </td>
                    <td>
                      <input type="number" id="nuevos-input-${d.id}" min="0" value="${d.goles_nuevos}" oninput="window.calcTotalPreview('${d.id}')">
                    </td>
                    <td style="text-align:right">
                      <b id="prev-tot-${d.id}" style="color:var(--oro);font-size:1.1rem">${d.goles_totales}</b>
                    </td>
                    <td>
                      <input type="number" id="asist-base-input-${d.id}" min="0" value="${d.asistencias_base}" oninput="window.calcTotalPreview('${d.id}')">
                    </td>
                    <td>
                      <input type="number" id="asist-nuevas-input-${d.id}" min="0" value="${d.asistencias_nuevas}" oninput="window.calcTotalPreview('${d.id}')">
                    </td>
                    <td style="text-align:right">
                      <b id="asist-prev-tot-${d.id}" style="color:#38bdf8;font-size:1.1rem">${d.asistencias_totales}</b>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="gol-modal-footer">
          <button class="btn-gol-sec" onclick="window.cerrarModalGol('ov-goles-base')">Cancelar</button>
          <button class="btn-gol-primary" onclick="window.guardarGolesBaseMasivos()">Guardar Estadísticas</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  };

  window.calcTotalPreview = function (id) {
    const baseVal = parseInt(document.getElementById(`base-input-${id}`).value, 10) || 0;
    const nuevosVal = parseInt(document.getElementById(`nuevos-input-${id}`).value, 10) || 0;
    const prevEl = document.getElementById(`prev-tot-${id}`);
    if (prevEl) prevEl.textContent = (baseVal + nuevosVal).toString();
    const asistBaseEl = document.getElementById(`asist-base-input-${id}`);
    const asistNuevasEl = document.getElementById(`asist-nuevas-input-${id}`);
    const asistPreview = document.getElementById(`asist-prev-tot-${id}`);
    if (asistBaseEl && asistNuevasEl && asistPreview) {
      asistPreview.textContent = ((parseInt(asistBaseEl.value, 10) || 0) + (parseInt(asistNuevasEl.value, 10) || 0)).toString();
    }
  };

  window.guardarGolesBaseMasivos = async function () {
    gState.delanteros.forEach(d => {
      const bEl = document.getElementById(`base-input-${d.id}`);
      const nEl = document.getElementById(`nuevos-input-${d.id}`);
      const asistBaseEl = document.getElementById(`asist-base-input-${d.id}`);
      const asistNuevasEl = document.getElementById(`asist-nuevas-input-${d.id}`);
      if (bEl && nEl && asistBaseEl && asistNuevasEl) {
        d.goles_base = Math.max(0, parseInt(bEl.value, 10) || 0);
        d.goles_nuevos = Math.max(0, parseInt(nEl.value, 10) || 0);
        d.goles_totales = d.goles_base + d.goles_nuevos;
        d.asistencias_base = Math.max(0, parseInt(asistBaseEl.value, 10) || 0);
        d.asistencias_nuevas = Math.max(0, parseInt(asistNuevasEl.value, 10) || 0);
        d.asistencias_totales = d.asistencias_base + d.asistencias_nuevas;
      }
    });

    await guardarGoleadores();
    window.cerrarModalGol('ov-goles-base');
    window.renderGoleadores();
  };

  // ── MODAL 2: Scorecard Post-Partido (entrada rápida) ────────────────────────
  window.abrirModalRegistrarPartido = function () {
    const ahora = new Date();
    const fechaDisplay = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const horaDisplay  = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const overlay = document.createElement('div');
    overlay.className = 'gol-modal-backdrop';
    overlay.id = 'ov-partido';

    overlay.innerHTML = `
      <div class="gol-modal-card scorecard-modal">
        <div class="gol-modal-header scorecard-header">
          <div class="scorecard-title-group">
            <span class="scorecard-icon">📋</span>
            <div>
              <h3 style="margin:0">Scorecard del Partido</h3>
              <span class="scorecard-fecha-auto">📅 ${fechaDisplay} · ${horaDisplay}</span>
            </div>
          </div>
          <button class="gol-modal-close" onclick="window.cerrarModalGol('ov-partido')">✕</button>
        </div>

        <div class="gol-modal-body scorecard-body">
          <!-- Info del partido: rival + marcador -->
          <div class="scorecard-match-info">
            <div class="scorecard-rival-wrap">
              <label class="scorecard-label">🆚 Rival / Ocasión</label>
              <input type="text" id="partido-rival" class="scorecard-text-input"
                placeholder="ej. División 2, vs Amigo, Copa…" autocomplete="off">
            </div>
            <div class="scorecard-marcador-wrap">
              <label class="scorecard-label">🏟️ Marcador</label>
              <div class="scorecard-marcador-inputs">
                <div class="scorecard-score-side">
                  <span class="scorecard-score-team">Tú</span>
                  <div class="scorecard-score-stepper">
                    <button class="sc-step-btn" onclick="window.scStepMarcador('mi', -1)">−</button>
                    <span id="sc-mi-goles" class="scorecard-score-num">0</span>
                    <button class="sc-step-btn" onclick="window.scStepMarcador('mi', 1)">+</button>
                  </div>
                </div>
                <span class="scorecard-score-vs">–</span>
                <div class="scorecard-score-side">
                  <span class="scorecard-score-team">Rival</span>
                  <div class="scorecard-score-stepper">
                    <button class="sc-step-btn" onclick="window.scStepMarcador('rival', -1)">−</button>
                    <span id="sc-rival-goles" class="scorecard-score-num">0</span>
                    <button class="sc-step-btn" onclick="window.scStepMarcador('rival', 1)">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Separador -->
          <div class="scorecard-section-label">
            <span>⚽ Actuaciones de Jugadores</span>
            <span class="scorecard-section-hint">Toca para activar · ajusta con los botones</span>
          </div>

          <!-- Lista de jugadores tipo scorecard -->
          <div class="scorecard-players-list">
            ${gState.delanteros.map(d => `
              <div class="scorecard-player-row" id="sc-row-${d.id}" onclick="window.scToggleJugador('${d.id}')">
                <div class="scorecard-player-info">
                  <img src="${d.imagen || '/imagenes/default_player.png'}"
                    onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'36\\' height=\\'36\\' fill=\\'%23666\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'5\\'/><path d=\\'M3 21v-2a7 7 0 0 1 14 0v2\\'/></svg>'"
                    class="scorecard-player-img">
                  <div class="scorecard-player-meta">
                    <span class="scorecard-player-name">${d.nombre}</span>
                    <span class="scorecard-player-sub">${d.posicion || 'DC'} · OVR ${d.overall || '—'} · Actual: ${d.goles_totales}G ${d.asistencias_totales}A</span>
                  </div>
                </div>
                <div class="scorecard-player-controls" id="sc-controls-${d.id}" style="display:none">
                  <div class="sc-stat-stepper">
                    <span class="sc-stat-label">⚽</span>
                    <button class="sc-step-btn sc-step-sm" onclick="event.stopPropagation(); window.scStep('${d.id}', -1, 'gol')">−</button>
                    <b id="sc-gol-${d.id}" class="sc-stat-val">0</b>
                    <button class="sc-step-btn sc-step-sm sc-step-plus" onclick="event.stopPropagation(); window.scStep('${d.id}', 1, 'gol')">+</button>
                  </div>
                  <div class="sc-stat-stepper">
                    <span class="sc-stat-label">🎯</span>
                    <button class="sc-step-btn sc-step-sm" onclick="event.stopPropagation(); window.scStep('${d.id}', -1, 'asistencia')">−</button>
                    <b id="sc-asist-${d.id}" class="sc-stat-val">0</b>
                    <button class="sc-step-btn sc-step-sm sc-step-plus" onclick="event.stopPropagation(); window.scStep('${d.id}', 1, 'asistencia')">+</button>
                  </div>
                </div>
                <div class="scorecard-player-toggle" id="sc-toggle-${d.id}">
                  <span class="sc-toggle-off">+ Activar</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="gol-modal-footer scorecard-footer">
          <div class="scorecard-resumen" id="sc-resumen"><span style="color:var(--apagado)">Sin estadísticas aún</span></div>
          <div style="display:flex;gap:8px">
            <button class="btn-gol-sec" onclick="window.cerrarModalGol('ov-partido')">Cancelar</button>
            <button class="btn-gol-primary" onclick="window.guardarPartido()">✅ Guardar Partido</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    window._scActivos   = {};
    window._scMarcador  = { mi: 0, rival: 0 };
  };

  window.scStepMarcador = function (lado, delta) {
    if (!window._scMarcador) window._scMarcador = { mi: 0, rival: 0 };
    window._scMarcador[lado] = Math.max(0, (window._scMarcador[lado] || 0) + delta);
    const el = document.getElementById(lado === 'mi' ? 'sc-mi-goles' : 'sc-rival-goles');
    if (el) el.textContent = window._scMarcador[lado];
  };

  window.scToggleJugador = function (id) {
    if (!window._scActivos) window._scActivos = {};
    const activo = !window._scActivos[id];
    window._scActivos[id] = activo;
    const row      = document.getElementById(`sc-row-${id}`);
    const controls = document.getElementById(`sc-controls-${id}`);
    const toggle   = document.getElementById(`sc-toggle-${id}`);
    if (row)      row.classList.toggle('sc-activo', activo);
    if (controls) controls.style.display = activo ? 'flex' : 'none';
    if (toggle)   toggle.innerHTML = activo
      ? '<span class="sc-toggle-on">✓ Activo</span>'
      : '<span class="sc-toggle-off">+ Activar</span>';
    window.scActualizarResumen();
  };

  window.scStep = function (id, delta, tipo) {
    const elId = tipo === 'asistencia' ? `sc-asist-${id}` : `sc-gol-${id}`;
    const el = document.getElementById(elId);
    if (!el) return;
    const val = Math.max(0, (parseInt(el.textContent, 10) || 0) + delta);
    el.textContent = val;
    if (val > 0 && window._scActivos && !window._scActivos[id]) {
      window.scToggleJugador(id);
    }
    window.scActualizarResumen();
  };

  window.scActualizarResumen = function () {
    const resumen = document.getElementById('sc-resumen');
    if (!resumen) return;
    const partes = [];
    gState.delanteros.forEach(d => {
      if (!window._scActivos || !window._scActivos[d.id]) return;
      const g = parseInt((document.getElementById(`sc-gol-${d.id}`) || {}).textContent, 10) || 0;
      const a = parseInt((document.getElementById(`sc-asist-${d.id}`) || {}).textContent, 10) || 0;
      if (g > 0 || a > 0) {
        partes.push(`<b>${d.nombre.split(' ')[0]}</b>${g ? ` ⚽×${g}` : ''}${a ? ` 🎯×${a}` : ''}`);
      }
    });
    resumen.innerHTML = partes.length
      ? partes.join('&nbsp;&nbsp;·&nbsp;&nbsp;')
      : '<span style="color:var(--apagado)">Sin estadísticas ingresadas aún</span>';
  };

  window.guardarPartido = async function () {
    const rivalEl = document.getElementById('partido-rival');
    const rival = (rivalEl ? rivalEl.value.trim() : '') || 'Partido';
    const marcador = window._scMarcador || { mi: 0, rival: 0 };
    let detalle = [];
    let algunaEstadistica = false;

    gState.delanteros.forEach(d => {
      const golesEl      = document.getElementById(`sc-gol-${d.id}`) || document.getElementById(`match-gol-val-${d.id}`);
      const asistenciasEl = document.getElementById(`sc-asist-${d.id}`) || document.getElementById(`match-asist-val-${d.id}`);
      const goles       = golesEl      ? parseInt(golesEl.textContent,      10) || 0 : 0;
      const asistencias = asistenciasEl ? parseInt(asistenciasEl.textContent, 10) || 0 : 0;
      if (goles > 0 || asistencias > 0) {
        d.goles_nuevos       += goles;
        d.goles_totales       = d.goles_base + d.goles_nuevos;
        d.asistencias_nuevas += asistencias;
        d.asistencias_totales = d.asistencias_base + d.asistencias_nuevas;
        detalle.push({ nombre: d.nombre, goles, asistencias });
        algunaEstadistica = true;
      }
    });

    if (algunaEstadistica) {
      if (!Array.isArray(gState.historial_partidos)) gState.historial_partidos = [];
      gState.historial_partidos.unshift({
        id: Date.now().toString(),
        fecha: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
        tipo: 'partido',
        rival,
        marcador,
        detalle
      });
      await guardarGoleadores();
    }

    window.cerrarModalGol('ov-partido');
    window.renderGoleadores();
  };

  // ── MODAL 3: Editar Goles Individuales ──────────────────────────────────────
  window.abrirModalEditarJugador = function (id) {
    const d = gState.delanteros.find(x => x.id === id);
    if (!d) return;
    const config = configEstadistica();

    const overlay = document.createElement('div');
    overlay.className = 'gol-modal-backdrop';
    overlay.id = 'ov-edit-j';

    overlay.innerHTML = `
      <div class="gol-modal-card" style="max-width: 480px;">
        <div class="gol-modal-header">
          <h3>✏️ Editar Estadísticas: ${d.nombre}</h3>
          <button class="gol-modal-close" onclick="window.cerrarModalGol('ov-edit-j')">✕</button>
        </div>
        <div class="gol-modal-body">
          <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:10px;border:1px solid var(--borde)">
            <img src="${d.imagen || '/imagenes/default_player.png'}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">
            <div>
              <b style="color:#fff">${d.nombre}</b>
              <div style="font-size:0.75rem;color:var(--apagado)">${d.posicion || 'DC'} · OVR ${d.overall || '—'} · ${d.edicion || ''}</div>
            </div>
            <button class="btn-gol-sec" style="margin-left:auto;font-size:0.72rem;padding:4px 8px;" onclick="window.cerrarModalGol('ov-edit-j'); window.abrirModalCambiarCarta('${d.id}')">
              🔄 Cambiar Carta
            </button>
          </div>

          <div class="gol-edit-stat-grid">
            <div>
              <label>Goles Base</label>
              <input type="number" id="edit-base" class="gol-search-input" style="width:100%;margin-top:4px;" value="${d.goles_base}">
            </div>
            <div>
              <label>Goles Nuevos</label>
              <input type="number" id="edit-nuevos" class="gol-search-input" style="width:100%;margin-top:4px;" value="${d.goles_nuevos}">
            </div>
            <div>
              <label>Asistencias Base</label>
              <input type="number" id="edit-asist-base" class="gol-search-input" style="width:100%;margin-top:4px;" value="${d.asistencias_base}">
            </div>
            <div>
              <label>Asistencias Nuevas</label>
              <input type="number" id="edit-asist-nuevas" class="gol-search-input" style="width:100%;margin-top:4px;" value="${d.asistencias_nuevas}">
            </div>
          </div>
        </div>
        <div class="gol-modal-footer">
          <button class="btn-gol-sec" onclick="window.cerrarModalGol('ov-edit-j')">Cancelar</button>
          <button class="btn-gol-primary" onclick="window.confirmarEditarJugador('${d.id}')">Guardar Cambios</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  };

  window.confirmarEditarJugador = async function (id) {
    const d = gState.delanteros.find(x => x.id === id);
    if (!d) return;

    d.goles_base = Math.max(0, parseInt(document.getElementById('edit-base').value, 10) || 0);
    d.goles_nuevos = Math.max(0, parseInt(document.getElementById('edit-nuevos').value, 10) || 0);
    d.goles_totales = d.goles_base + d.goles_nuevos;
    d.asistencias_base = Math.max(0, parseInt(document.getElementById('edit-asist-base').value, 10) || 0);
    d.asistencias_nuevas = Math.max(0, parseInt(document.getElementById('edit-asist-nuevas').value, 10) || 0);
    d.asistencias_totales = d.asistencias_base + d.asistencias_nuevas;

    await guardarGoleadores();
    window.cerrarModalGol('ov-edit-j');
    window.renderGoleadores();
  };

  // ── MODAL 4: Configurar Meta ───────────────────────────────────────────────
  window.abrirModalConfigMeta = function () {
    const config = configEstadistica();
    const tipo = config.plural;
    const overlay = document.createElement('div');
    overlay.className = 'gol-modal-backdrop';
    overlay.id = 'ov-config-meta';

    overlay.innerHTML = `
      <div class="gol-modal-card" style="max-width: 460px;">
        <div class="gol-modal-header">
          <h3>⚙️ Meta de Nivelación de ${tipo}</h3>
          <button class="gol-modal-close" onclick="window.cerrarModalGol('ov-config-meta')">✕</button>
        </div>
        <div class="gol-modal-body">
          <p style="font-size:0.82rem;color:var(--apagado);margin:0">
            ¿Cómo deseas calcular la meta a la que deben llegar los jugadores regulares?
          </p>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:6px;">
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
              <input type="radio" name="meta-modo" value="max" ${gState[config.metaModo] === 'max' ? 'checked' : ''} style="margin-top:3px;">
              <div>
                <b style="color:#fff">Automático: Emparejar la cifra más alta</b>
                <div style="font-size:0.75rem;color:var(--apagado)">La meta será el valor más alto entre los jugadores regulares.</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
              <input type="radio" name="meta-modo" value="fija" ${gState[config.metaModo] === 'fija' ? 'checked' : ''} style="margin-top:3px;">
              <div>
                <b style="color:#fff">Meta fija personalizada</b>
                <div style="font-size:0.75rem;color:var(--apagado)">Fija una cantidad objetivo por temporada.</div>
              </div>
            </label>
            <div id="wrap-meta-fija" style="margin-left:26px;">
              <label style="font-size:0.72rem;color:var(--apagado);font-weight:700">Cantidad objetivo:</label>
              <input type="number" id="input-meta-fija-val" class="gol-search-input" value="${gState[config.metaFija] || 20}" min="1" style="width:100px;margin-top:4px;">
            </div>
          </div>
        </div>
        <div class="gol-modal-footer">
          <button class="btn-gol-sec" onclick="window.cerrarModalGol('ov-config-meta')">Cancelar</button>
          <button class="btn-gol-primary" onclick="window.guardarConfigMeta()">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  };

  window.guardarConfigMeta = async function () {
    const config = configEstadistica();
    const modoRadio = document.querySelector('input[name="meta-modo"]:checked');
    if (modoRadio) gState[config.metaModo] = modoRadio.value;
    const valInput = document.getElementById('input-meta-fija-val');
    if (valInput) gState[config.metaFija] = Math.max(1, parseInt(valInput.value, 10) || 20);

    await guardarGoleadores();
    window.cerrarModalGol('ov-config-meta');
    window.renderGoleadores();
  };

  // ── MODAL 5: Seleccionar Estrella ──────────────────────────────────────────
  window.abrirModalSeleccionarEstrella = function () {
    const config = configEstadistica();
    const starId = gState[config.estrella];
    const overlay = document.createElement('div');
    overlay.className = 'gol-modal-backdrop';
    overlay.id = 'ov-sel-estrella';

    overlay.innerHTML = `
      <div class="gol-modal-card" style="max-width: 480px;">
        <div class="gol-modal-header">
          <h3>👑 Elegir ${gModoEstadistica === 'asistencias' ? 'Asistente' : 'Goleador'} Estrella</h3>
          <button class="gol-modal-close" onclick="window.cerrarModalGol('ov-sel-estrella')">✕</button>
        </div>
        <div class="gol-modal-body">
          <p style="font-size:0.82rem;color:var(--apagado);margin:0">
            Elige al jugador que será la estrella de ${config.plural}:
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;">
            ${gState.delanteros.map(d => `
              <div 
                style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;cursor:pointer;background:${d.id === starId ? 'rgba(240,180,41,0.15)' : 'rgba(255,255,255,0.03)'};border:1px solid ${d.id === starId ? 'var(--oro)' : 'var(--borde)'}"
                onclick="window.seleccionarEstrellaDirecta('${d.id}')"
              >
                <div class="gol-mini-player">
                  <img src="${d.imagen || '/imagenes/default_player.png'}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'36\\' height=\\'36\\' fill=\\'%23666\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'5\\'/><path d=\\'M3 21v-2a7 7 0 0 1 14 0v2\\'/></svg>'">
                  <div>
                    <b style="color:#fff">${d.nombre}</b>
                    <div style="font-size:0.75rem;color:var(--apagado)">${d[config.total]} ${config.plural} actuales · OVR ${d.overall || '—'}</div>
                  </div>
                </div>
                ${d.id === starId ? '<span style="color:var(--oro);font-weight:700">👑 Actual</span>' : '<button class="btn-gol-sec" style="padding:4px 10px;font-size:0.72rem">Elegir</button>'}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  };

  window.seleccionarEstrellaDirecta = async function (id) {
    const config = configEstadistica();
    gState[config.estrella] = id;
    if (gModoEstadistica === 'goles') {
      gState.delanteros.forEach(d => d.es_estrella = (d.id === id));
    }
    await guardarGoleadores();
    window.cerrarModalGol('ov-sel-estrella');
    window.renderGoleadores();
  };

  // ── MODAL 6: Historial de Partidos y Goles ──────────────────────────────────
  window.abrirModalHistorial = function () {
    const overlay = document.createElement('div');
    overlay.className = 'gol-modal-backdrop';
    overlay.id = 'ov-historial';

    const logs = Array.isArray(gState.historial_partidos) ? gState.historial_partidos : [];
    const temporadas = Array.isArray(gState.temporadas_archivadas) ? gState.temporadas_archivadas : [];

    overlay.innerHTML = `
      <div class="gol-modal-card" style="max-width: 600px;">
        <div class="gol-modal-header">
          <h3>📜 Historial de Temporadas, Goles y Partidos</h3>
          <button class="gol-modal-close" onclick="window.cerrarModalGol('ov-historial')">✕</button>
        </div>
        <div class="gol-modal-body" style="max-height:450px;">
          ${temporadas.length ? `
            <h4 style="margin:0 0 10px;color:var(--oro)">Temporadas archivadas</h4>
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
              ${temporadas.map(temporada => `
                <details style="background:rgba(255,255,255,0.03);border:1px solid var(--borde);border-radius:10px;padding:12px 14px">
                  <summary style="cursor:pointer;color:var(--oro);font-weight:700">
                    ${temporada.temporada} · ${temporada.total_goles || 0} goles · ${temporada.total_asistencias || 0} asistencias
                    <span style="float:right;font-size:0.72rem;color:var(--apagado)">${temporada.fecha || ''}</span>
                  </summary>
                  <div style="font-size:0.8rem;color:#e5e7eb;margin-top:10px">
                    ${(temporada.delanteros || []).map(jugador => `
                      <div style="padding:5px 0;border-top:1px solid var(--borde)">
                        <b>${jugador.nombre}</b> · ⚽ ${jugador.goles_totales || 0} goles · 🎯 ${jugador.asistencias_totales || 0} asistencias
                      </div>
                    `).join('')}
                  </div>
                </details>
              `).join('')}
            </div>
          ` : ''}
          ${logs.length === 0 && temporadas.length === 0 ? `
            <div style="text-align:center;padding:30px;color:var(--apagado)">
              Aún no hay registros de goles o partidos guardados.
            </div>
          ` : logs.length ? `
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${temporadas.length ? '<h4 style="margin:0;color:var(--oro)">Temporada actual</h4>' : ''}
              ${logs.map(item => `
                <div style="background:rgba(255,255,255,0.03);border:1px solid var(--borde);border-radius:10px;padding:12px 14px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <b style="color:var(--oro)">${item.tipo === 'partido' ? `📋 ${item.rival || 'Partido'}${item.marcador ? ` <span style="font-family:'Bebas Neue',sans-serif;font-size:1.05rem;color:#fff;margin-left:6px">${item.marcador.mi}–${item.marcador.rival}</span>` : ''}` : item.tipo === 'asistencia' ? `🎯 Asistencia de ${item.jugador}` : `⚽ Gol de ${item.jugador}`}</b>
                    <span style="font-size:0.72rem;color:var(--apagado)">${item.fecha}</span>
                  </div>
                  ${item.tipo === 'partido' && Array.isArray(item.detalle) ? `
                    <div style="font-size:0.8rem;color:#e5e7eb;margin-top:4px;">
                      Estadísticas: ${item.detalle.map(x => `<b>${x.nombre}${x.goles ? ` · ⚽ +${x.goles}` : ''}${x.asistencias ? ` · 🎯 +${x.asistencias}` : ''}</b>`).join(', ')}
                    </div>
                  ` : `
                    <div style="font-size:0.8rem;color:#e5e7eb;">
                      ${item.tipo === 'asistencia' ? `+${item.cantidad} asistencia(s) registrada(s)` : `+${item.cantidad} gol(es) registrado(s)`}
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="gol-modal-footer">
          <button class="btn-gol-sec" onclick="window.cerrarModalGol('ov-historial')">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  };

  window.cerrarModalGol = function (id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  };

})();
