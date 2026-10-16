
    // ── Estado global ─────────────────────────────────────────────────────────────
    let jugadores = [], tecnicos = [], carpetas = [], partidos = [], escudosCache = [];
    let tab = 'inicio', tecActual = null, editId = null, sortJug = 'ovr-desc';
    let comparT1 = null, comparT2 = null;
    let comparJ1 = null, comparJ2 = null;

    // ── Constantes ────────────────────────────────────────────────────────────────
    const POSICIONES = ['PT', 'DC', 'LI', 'LD', 'MCD', 'MDI', 'MDD', 'MC', 'MO',
      'EXI', 'EXD', 'SD', 'CD', 'CAI', 'CAD'];

    const POTENCIADORES = [
      '— Sin potenciador —',
      'Actitud ofensiva +1', 'Actitud ofensiva +2', 'Actitud ofensiva +3',
      'Control de balón +1', 'Control de balón +2', 'Control de balón +3',
      'Dribbling +1', 'Dribbling +2', 'Dribbling +3',
      'Posesión de balón +1', 'Posesión de balón +2', 'Posesión de balón +3',
      'Pase al ras +1', 'Pase al ras +2', 'Pase al ras +3',
      'Pase bombeado +1', 'Pase bombeado +2', 'Pase bombeado +3',
      'Finalización +1', 'Finalización +2', 'Finalización +3',
      'Cabeceador +1', 'Cabeceador +2', 'Cabeceador +3',
      'Ejecución a balón parado +1', 'Ejecución a balón parado +2', 'Ejecución a balón parado +3',
      'Efecto +1', 'Efecto +2', 'Efecto +3',
      'Actitud defensiva +1', 'Actitud defensiva +2', 'Actitud defensiva +3',
      'Entrada +1', 'Entrada +2', 'Entrada +3',
      'Agresividad +1', 'Agresividad +2', 'Agresividad +3',
      'Dedicación defensiva +1', 'Dedicación defensiva +2', 'Dedicación defensiva +3',
      'Atajar (PT) +1', 'Atajar (PT) +2', 'Atajar (PT) +3',
      'Parada (PT) +1', 'Parada (PT) +2', 'Parada (PT) +3',
      'Reflejos (PT) +1', 'Reflejos (PT) +2', 'Reflejos (PT) +3',
      'Cobertura (PT) +1', 'Cobertura (PT) +2', 'Cobertura (PT) +3',
      'Velocidad +1', 'Velocidad +2', 'Velocidad +3',
      'Aceleración +1', 'Aceleración +2', 'Aceleración +3',
      'Potencia de tiro +1', 'Potencia de tiro +2', 'Potencia de tiro +3',
      'Salto +1', 'Salto +2', 'Salto +3',
      'Contacto físico +1', 'Contacto físico +2', 'Contacto físico +3',
      'Equilibrio +1', 'Equilibrio +2', 'Equilibrio +3',
      'Resistencia +1', 'Resistencia +2', 'Resistencia +3',
    ];

    const ESTILOS_DOM = [
      ['est_juego_posesion', 'Juego de posesión'],
      ['est_contraataque_rapido', 'Contraataques rápidos'],
      ['est_contraataque_largo', 'Contraataque largo'],
      ['est_bandas', 'Por las bandas'],
      ['est_balones_largos', 'Balones largos'],
    ];

    const SA = [
      ['actitud_ofensiva', 'Actitud ofensiva'], ['control_balon', 'Control de balón'],
      ['drible', 'Drible'], ['posesion_balon', 'Posesión de balón'],
      ['pase_ras', 'Pase al ras'], ['pase_bombeado', 'Pase bombeado'],
      ['finalizacion', 'Finalización'], ['cabeceador', 'Cabeceador'],
      ['ejecucion_balon', 'Ejecución a balón parado'], ['efecto', 'Efecto'],
    ];
    const SD = [
      ['actitud_defensiva', 'Actitud defensiva'], ['entrada', 'Entrada'],
      ['agresividad', 'Agresividad'], ['dedicacion_defensiva', 'Dedicación defensiva'],
      ['actitud_portero', 'Actitud de portero'], ['atajar_pt', 'Atajar (PT)'],
      ['parada_pt', 'Parada (PT)'], ['reflejos_pt', 'Reflejos (PT)'], ['cobertura_pt', 'Cobertura (PT)'],
    ];
    const SF = [
      ['velocidad', 'Velocidad'], ['aceleracion', 'Aceleración'],
      ['potencia_tiro', 'Potencia de tiro'], ['salto', 'Salto'],
      ['contacto_fisico', 'Contacto físico'], ['equilibrio', 'Equilibrio'], ['resistencia', 'Resistencia'],
    ];
    const TODAS = [...SA, ...SD, ...SF];

    // ── Formaciones ────────────────────────────────────────────────────────────────
    const DEF_FORM = {
      '4-2-3-1': [['PT'], ['LI', 'DC', 'DC', 'LD'], ['MCD', 'MCD'], ['EXI', 'MO', 'EXD'], ['CD']],
      '4-3-3': [['PT'], ['LI', 'DC', 'DC', 'LD'], ['MC', 'MC', 'MC'], ['EXI', 'CD', 'EXD']],
      '4-4-2': [['PT'], ['LI', 'DC', 'DC', 'LD'], ['EXI', 'MC', 'MC', 'EXD'], ['CD', 'CD']],
      '3-5-2': [['PT'], ['DC', 'DC', 'DC'], ['LI', 'MCD', 'MC', 'MCD', 'LD'], ['CD', 'CD']],
      '4-1-4-1': [['PT'], ['LI', 'DC', 'DC', 'LD'], ['MCD'], ['EXI', 'MC', 'MC', 'EXD'], ['CD']],
      '3-4-3': [['PT'], ['DC', 'DC', 'DC'], ['LI', 'MC', 'MC', 'LD'], ['EXI', 'CD', 'EXD']],
      '4-2-2-2': [['PT'], ['LI', 'DC', 'DC', 'LD'], ['MCD', 'MCD'], ['MDI', 'MDD'], ['CD', 'CD']],
      '5-3-2': [['PT'], ['LI', 'DC', 'DC', 'DC', 'LD'], ['MC', 'MC', 'MC'], ['CD', 'CD']],
      '4-5-1': [['PT'], ['LI', 'DC', 'DC', 'LD'], ['EXI', 'MC', 'MCD', 'MC', 'EXD'], ['CD']],
    };
    const COMPAT = {
      'PT': ['PT'],
      'DC': ['DC'],
      'LI': ['LI', 'LD', 'DC'],
      'LD': ['LD', 'LI', 'DC'],
      'MCD': ['MCD', 'MC'],
      'MC': ['MC', 'MCD', 'MDI', 'MDD', 'MO'],
      'MDI': ['MDI', 'MC', 'MCD', 'MO', 'EXI'],
      'MDD': ['MDD', 'MC', 'MCD', 'MO', 'EXD'],
      'MO': ['MO', 'MC', 'MDI', 'MDD', 'SD', 'CAI', 'CAD'],
      'EXI': ['EXI', 'CAI', 'SD', 'MDI', 'MO'],
      'EXD': ['EXD', 'CAD', 'SD', 'MDD', 'MO'],
      'SD': ['SD', 'CD', 'EXI', 'EXD', 'MO', 'CAI', 'CAD'],
      'CD': ['CD', 'SD', 'CAI', 'CAD'],
      'CAI': ['CAI', 'EXI', 'SD', 'CD'],
      'CAD': ['CAD', 'EXD', 'SD', 'CD'],
    };

    let modoPlantilla = false;
    let plantillaActual = [];
    let dragState = null;
    let drawings = [];
    let drawMode = false;
    let activeTool = "arrow";
    let activeColor = "#ef4444";
    let activeWidth = 3;
    let drawingState = null;


    // ── Utilidades ────────────────────────────────────────────────────────────────
    function colBarra(v) {
      if (v >= 90) return '#f0b429';
      if (v >= 80) return '#10b981';
      if (v >= 65) return '#2563eb';
      if (v >= 50) return '#6366f1';
      return '#5a6475';
    }

    function statMax(j) {
      let max = 0, nom = '';
      TODAS.forEach(([k, n]) => { const v = parseInt(j[k]) || 0; if (v > max) { max = v; nom = n; } });
      return max ? { valor: max, nombre: nom } : null;
    }

    function sugerirPot(j) {
      const mapa = {
        aceleracion: 'Aceleración', velocidad: 'Velocidad', equilibrio: 'Equilibrio',
        control_balon: 'Control de balón', drible: 'Dribbling', pase_ras: 'Pase al ras',
        finalizacion: 'Finalización', potencia_tiro: 'Potencia de tiro',
        cabeceador: 'Cabeceador', entrada: 'Entrada', agresividad: 'Agresividad',
        resistencia: 'Resistencia', salto: 'Salto', contacto_fisico: 'Contacto físico',
        reflejos_pt: 'Reflejos (PT)', atajar_pt: 'Atajar (PT)',
      };
      let mejor = null, mejorVal = 0;
      Object.entries(mapa).forEach(([k, n]) => {
        const v = parseInt(j[k]) || 0;
        if (v > mejorVal) { mejorVal = v; mejor = n; }
      });
      return mejor ? `${mejor} +1` : null;
    }

    function sel(arr, val = '') {
      return arr.map(v => `<option${v === val ? ' selected' : ''}>${v}</option>`).join('');
    }

    function potDisplay(j) {
      if (!j) return '';
      const p = j.potenciador, pm = j.potenciador_manual;
      const out = (p && p !== '— Sin potenciador —' && p !== '__manual__') ? p
        : (pm && pm !== '__manual__') ? pm : '';
      return out;
    }

    // ── Carta ─────────────────────────────────────────────────────────────────────
    function htmlCarta(j, fnClick = '') {
      const boost = j.base && j.overall && parseInt(j.overall) > parseInt(j.base);
      const sm = statMax(j);
      const click = fnClick ? `onclick="${fnClick}"` : '';
      return `<div class="carta" ${click}>
    ${j.imagen
          ? `<img src="${j.imagen}" alt="" onerror="this.style.display='none'">`
          : `<div class="carta-placeholder">🧑</div>`}
    <div class="carta-grad"></div>
    <div class="carta-ovr">
      <span class="carta-ovr-n">${j.overall || '—'}</span>
      ${j.posicion ? `<span class="carta-ovr-p">${j.posicion}</span>` : ''}
    </div>
    ${boost
          ? `<div class="carta-base">
           <span class="carta-base-n">${j.base}</span>
           <span class="carta-boost"> ▲+${parseInt(j.overall) - parseInt(j.base)}</span>
         </div>`
          : j.base ? `<div class="carta-base"><span class="carta-base-n">Base ${j.base}</span></div>` : ''}
    ${j.condicion ? `<div class="carta-cond">${j.condicion}</div>` : ''}
    ${sm ? `<div class="carta-stat">
      <span class="carta-stat-v">${sm.valor}</span>
      <span class="carta-stat-n">${sm.nombre}</span>
    </div>` : ''}
    ${j.dorsal ? `<div class="carta-dorsal">#${j.dorsal}</div>` : ''}
    <div class="carta-nombre-wrap">
      <div class="carta-nombre">${j.nombre || 'Sin nombre'}</div>
      ${j.edicion ? `<span class="carta-ed">${j.edicion}</span>` : ''}
    </div>
  </div>`;
    }

    // ── Carga inicial ─────────────────────────────────────────────────────────────
    async function cargarEscudos() {
      if (escudosCache.length) return escudosCache;
      try {
        const r = await fetch('/api/escudos');
        if (r.ok) escudosCache = await r.json();
      } catch (e) { console.warn('Escudos:', e); }
      return escudosCache;
    }

    function escudoDelDia() {
      if (!escudosCache.length) return null;
      return escudosCache[new Date().getDate() % escudosCache.length];
    }

    function setFavicon(url) {
      let link = document.getElementById('favicon') || document.querySelector('link[rel="icon"]');
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = url;
      link.type = /\.svg$/i.test(url) ? 'image/svg+xml' : 'image/png';
    }

    async function cargar() {
      await cargarEscudos();
      try {
        const [j, t, c] = await Promise.all([
          API.getAll('jugadores'),
          API.getAll('tecnicos'),
          API.getAll('carpetas'),
        ]);
        jugadores = j; tecnicos = t; carpetas = c;
      } catch (e) {
        console.error('Error cargando datos:', e);
        jugadores = []; tecnicos = []; carpetas = [];
      }
      renderizar();
    }

    function renderizar() {
      if (tab === 'inicio') renderDashboard();
      else if (tab === 'jugadores') renderJugadores();
      else if (tab === 'tecnicos') renderTecnicos();
      else if (tab === 'carpeta') renderCarpeta();
    }

    function dashImg(j, fallback = '🧑') {
      return j?.imagen
        ? `<img src="${j.imagen}" alt="" onerror="this.outerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;background:var(--oscuro)\\'>${fallback}</div>'">`
        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;background:var(--oscuro)">${fallback}</div>`;
    }

    function imgTecnico(t) {
      if (!t) return '';
      if (t.imagen) return t.imagen;
      if (t.nombre) return `/imagenes/tecnicos/${t.nombre}.png`;
      return '';
    }

    function dashImgTec(t) {
      const src = imgTecnico(t);
      return src
        ? `<img src="${src}" alt="${t.nombre || ''}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;align-items:center;justify-content:center;height:100%;font-size:3rem;background:var(--oscuro)">🧑‍💼</div>`
        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;background:var(--oscuro)">🧑‍💼</div>`;
    }

    function renderDashboard() {
      const el = document.getElementById('dash-inner'); if (!el) return;
      const ovrs = jugadores.map(j => parseInt(j.overall) || 0).filter(v => v > 0);
      const ovrProm = ovrs.length ? (ovrs.reduce((a, b) => a + b, 0) / ovrs.length).toFixed(1) : '—';
      const ovrMax = ovrs.length ? Math.max(...ovrs) : 0;
      const posCount = {};
      jugadores.forEach(j => { if (j.posicion) posCount[j.posicion] = (posCount[j.posicion] || 0) + 1; });
      const posOrden = Object.entries(posCount).sort((a, b) => b[1] - a[1]);
      const posMax = posOrden.length ? posOrden[0][1] : 1;
      const topSorted = [...jugadores].sort((a, b) => (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0));
      const topJug = topSorted[0];
      const top3 = topSorted.slice(0, 3);
      const tecCount = {};
      carpetas.forEach(c => { tecCount[c.tecnico_id] = (tecCount[c.tecnico_id] || 0) + 1; });
      const topTecEntry = Object.entries(tecCount).sort((a, b) => b[1] - a[1])[0];
      const topTec = topTecEntry ? tecnicos.find(t => t.id === topTecEntry[0]) : null;
      const progSums = PROG_KEYS.map(([k, n]) => ({ n, v: jugadores.reduce((a, j) => a + (parseInt(j[k]) || 0), 0) }))
        .filter(x => x.v > 0);
      const progTotal = progSums.reduce((a, x) => a + x.v, 0);
      const progMax = progSums.length ? Math.max(...progSums.map(x => x.v)) : 1;
      const ranks = ['🥈', '🥇', '🥉'];
      const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
      const esc = escudoDelDia();

      el.innerHTML = `
    <div class="dash-hero">
      <div class="dash-hero-grid">
        <div>
          <div class="dash-hero-titulo-wrap">
            ${esc ? `<img class="dash-hero-escudo" src="${esc.url}" alt="${esc.nombre}" title="${esc.nombre}">` : ''}
            <div class="dash-hero-titulo">Tu Plantilla</div>
          </div>
          <div class="dash-hero-sub">Resumen completo de tu eFootball Manager</div>
          <div class="dash-hero-stats">
            <div class="dash-hero-stat"><div><div class="dash-hero-stat-n">${jugadores.length}</div><div class="dash-hero-stat-l">Jugadores</div></div></div>
            <div class="dash-hero-stat"><div><div class="dash-hero-stat-n">${tecnicos.length}</div><div class="dash-hero-stat-l">Técnicos</div></div></div>
            <div class="dash-hero-stat"><div><div class="dash-hero-stat-n">${ovrProm}</div><div class="dash-hero-stat-l">OVR Prom.</div></div></div>
            <div class="dash-hero-stat"><div><div class="dash-hero-stat-n">${carpetas.length}</div><div class="dash-hero-stat-l">Asignaciones</div></div></div>
          </div>
        </div>
        ${top3.length ? `<div class="dash-podium">
          ${podiumOrder.map((j, i) => {
        const realRank = top3.indexOf(j);
        return `<div class="dash-podium-item" style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:185px;cursor:pointer" onclick="verJugador('${j.id}',true)">
                ${htmlCarta(j)}
              </div>
              <div class="dash-podium-rank">${ranks[realRank] || ''}</div>
            </div>`;
      }).join('')}
        </div>` : ''}
      </div>
    </div>
    <div class="dash-body">
      <div class="dash-kpi">
        <div class="dash-kpi-card kpi-ovr" style="animation-delay:.05s">
          <div class="dash-kpi-icon">📊</div>
          <div class="dash-kpi-titulo">OVR Promedio</div>
          <div class="dash-kpi-valor">${ovrProm}</div>
          <div class="dash-kpi-sub">de ${jugadores.length} jugador${jugadores.length !== 1 ? 'es' : ''}</div>
        </div>
        <div class="dash-kpi-card kpi-top" style="animation-delay:.1s">
          <div class="dash-kpi-icon">⭐</div>
          <div class="dash-kpi-titulo">Máximo OVR</div>
          <div class="dash-kpi-valor">${ovrMax || '—'}</div>
          <div class="dash-kpi-sub">${topJug ? topJug.nombre : 'Sin datos'}</div>
        </div>
        <div class="dash-kpi-card kpi-tec" style="animation-delay:.15s">
          ${topTec && imgTecnico(topTec) ? `<img src="${imgTecnico(topTec)}" style="width:42px;height:42px;border-radius:8px;object-fit:cover;border:1px solid var(--borde);margin-bottom:6px;position:relative" alt="" onerror="this.style.display='none'">` : '<div class="dash-kpi-icon">🧑‍💼</div>'}
          <div class="dash-kpi-titulo">Mejor Técnico</div>
          <div class="dash-kpi-valor" style="font-size:1.5rem">${topTec ? topTec.nombre.split(' ').slice(-1)[0] : '—'}</div>
          <div class="dash-kpi-sub">${topTecEntry ? topTecEntry[1] + ' jugadores' : 'Sin carpetas'}</div>
        </div>
        <div class="dash-kpi-card kpi-prog" style="animation-delay:.2s">
          <div class="dash-kpi-icon">📈</div>
          <div class="dash-kpi-titulo">Progresión</div>
          <div class="dash-kpi-valor">${progTotal}</div>
          <div class="dash-kpi-sub">puntos totales</div>
        </div>
      </div>
      <div class="dash-main">
        ${topJug ? `<div class="dash-spotlight" onclick="verJugador('${topJug.id}',true)" style="cursor:pointer">
          <div class="dash-spotlight-inner">
            <div class="dash-spotlight-img">${dashImg(topJug)}</div>
            <div class="dash-spotlight-info">
              <div class="dash-spotlight-badge">⭐ MVP de la plantilla</div>
              <div class="dash-spotlight-nombre">${topJug.nombre || '—'}</div>
              <div class="dash-spotlight-meta">
                <span class="dash-spotlight-pill" style="color:var(--oro);border-color:#f0b42955">OVR ${topJug.overall || '—'}</span>
                ${topJug.posicion ? `<span class="dash-spotlight-pill">${topJug.posicion}</span>` : ''}
                ${topJug.edicion ? `<span class="dash-spotlight-pill" style="color:var(--verde)">${topJug.edicion}</span>` : ''}
                ${topJug.equipo ? `<span class="dash-spotlight-pill">🏟️ ${topJug.equipo}</span>` : ''}
              </div>
            </div>
          </div>
        </div>` : '<div class="dash-spotlight"><div style="padding:40px;text-align:center;color:var(--apagado)">Agrega jugadores para ver el MVP</div></div>'}
        ${topTec ? `<div class="dash-coach-card">
          <div class="dash-coach-inner">
            <div class="dash-coach-photo">${dashImgTec(topTec)}</div>
            <div class="dash-coach-info">
              <div class="dash-spotlight-badge" style="animation:none">🏆 Técnico líder</div>
              <div class="dash-coach-nombre">${topTec.nombre}</div>
              <div class="dash-spotlight-meta" style="margin-top:8px">
                ${topTec.formacion ? `<span class="dash-spotlight-pill">${topTec.formacion}</span>` : ''}
                ${topTec.edicion ? `<span class="dash-spotlight-pill" style="color:var(--verde)">${topTec.edicion}</span>` : ''}
                ${topTec.fuerza_colectiva ? `<span class="dash-spotlight-pill" style="color:var(--oro)">⚡ ${topTec.fuerza_colectiva}</span>` : ''}
              </div>
              <div class="dash-coach-count">${topTecEntry[1]} <span style="font-size:.85rem;color:var(--apagado);font-family:Inter">jugadores asignados</span></div>
            </div>
          </div>
        </div>` : '<div class="dash-coach-card"><div style="padding:30px;text-align:center;color:var(--apagado)">Sin técnicos asignados</div></div>'}
      </div>
      ${posOrden.length ? `<div class="dash-panel">
        <div class="dash-panel-titulo">📍 Distribución por posición</div>
        ${posOrden.map(([p, n]) => `<div class="dash-pos-bar">
          <span class="dash-pos-lbl">${p}</span>
          <div class="dash-pos-track"><div class="dash-pos-fill" style="--w:${Math.round(n / posMax * 100)}%;width:${Math.round(n / posMax * 100)}%"></div></div>
          <span class="dash-pos-num">${n}</span>
        </div>`).join('')}
      </div>` : ''}
      ${progSums.length ? `<div class="dash-panel">
        <div class="dash-panel-titulo">📈 Progresión acumulada</div>
        ${progSums.map(x => `<div class="dash-prog-row">
          <span class="dash-prog-lbl">${x.n}</span>
          <div class="dash-prog-track"><div class="dash-prog-fill" style="--w:${Math.round(x.v / progMax * 100)}%;width:${Math.round(x.v / progMax * 100)}%"></div></div>
          <span class="dash-prog-num">${x.v}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>`;
      document.getElementById('contador').textContent =
        `${jugadores.length} jugadores · ${tecnicos.length} técnicos · OVR ${ovrProm}`;
    }

    // ── Render jugadores ──────────────────────────────────────────────────────────
    function renderJugadores() {
      const q = document.getElementById('buscar').value.toLowerCase();
      const pos = document.getElementById('filtro-pos').value;
      let f = jugadores.filter(j =>
        (!q || (j.nombre || '').toLowerCase().includes(q)) &&
        (!pos || j.posicion === pos));
      if (sortJug === 'ovr-desc') f.sort((a, b) => (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0));
      else if (sortJug === 'ovr-asc') f.sort((a, b) => (parseInt(a.overall) || 0) - (parseInt(b.overall) || 0));
      else if (sortJug === 'nombre') f.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
      else if (sortJug === 'posicion') f.sort((a, b) => POSICIONES.indexOf(a.posicion) - POSICIONES.indexOf(b.posicion));
      document.getElementById('contador').textContent = `${f.length} jugador${f.length !== 1 ? 'es' : ''}`;
      const grid = document.getElementById('grid-j');
      if (!f.length) {
        grid.innerHTML = `<div class="vacio"><div class="vacio-i">⚽</div>
      <h3>${jugadores.length ? 'Sin resultados' : 'No hay jugadores'}</h3>
      <p>Haz clic en "+ Agregar" para empezar</p></div>`;
        return;
      }
      grid.innerHTML = f.map(j => htmlCarta(j, `verJugador('${j.id}')`)).join('');
    }

    // ── Render técnicos ───────────────────────────────────────────────────────────
    function renderTecnicos() {
      const q = document.getElementById('buscar').value.toLowerCase();
      const f = tecnicos.filter(t => (!q || (t.nombre || '').toLowerCase().includes(q)));
      document.getElementById('contador').textContent = `${f.length} técnico${f.length !== 1 ? 's' : ''}`;
      const grid = document.getElementById('grid-t');
      if (!f.length) {
        grid.innerHTML = `<div class="vacio" style="grid-column:1/-1"><div class="vacio-i">🧑‍💼</div>
      <h3>${tecnicos.length ? 'Sin resultados' : 'No hay técnicos'}</h3>
      <p>Haz clic en "+ Agregar" para empezar</p></div>`;
        return;
      }
      grid.innerHTML = f.map(t => {
        const nj = carpetas.filter(c => c.tecnico_id === t.id).length;
        return `<div class="tec-card">
      <div class="tec-top" onclick="abrirCarpeta('${t.id}')">
        ${imgTecnico(t)
            ? `<img class="tec-img" src="${imgTecnico(t)}" onerror="this.style.display='none'">`
            : `<div class="tec-img-ph">🧑‍💼</div>`}
        <div>
          <div class="tec-name">${t.nombre || 'Sin nombre'}</div>
          ${t.edicion ? `<div class="tec-ed">${t.edicion}</div>` : ''}
          <div class="tec-badges">
            ${t.estilo_usado ? `<span class="badge badge-azul">${t.estilo_usado}</span>` : ''}
            ${t.formacion ? `<span class="badge badge-verde">${t.formacion}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="tec-footer">
        <span class="tec-count">👥 ${nj} jugador${nj !== 1 ? 'es' : ''}</span>
        ${t.fuerza_colectiva ? `<span class="tec-fuerza">⚡ ${t.fuerza_colectiva}</span>` : ''}
        <div style="display:flex;gap:6px">
          <button class="btn-sm btn-sm-oro" onclick="editarTecnico('${t.id}')">✏️ Editar</button>
          <button class="btn-sm btn-sm-abrir" onclick="abrirCarpeta('${t.id}')">Abrir →</button>
        </div>
      </div>
    </div>`;
      }).join('');
    }

    // ── Carpeta ───────────────────────────────────────────────────────────────────
    function abrirCarpeta(tid) {
      tecActual = tid;
      tab = 'carpeta';
      modoPlantilla = false;
      document.getElementById('vista-j').classList.add('oculto');
      document.getElementById('vista-t').classList.add('oculto');
      document.getElementById('vista-c').classList.remove('oculto');
      document.getElementById('breadcrumb').classList.remove('oculto');
      document.getElementById('btn-nuevo').textContent = '+ Agregar jugador';
      syncToolbar();
      const t = tecnicos.find(x => x.id === tid);
      if (t) {
        document.getElementById('bc-nombre').textContent = t.nombre;
        document.getElementById('bc-fuerza').textContent =
          t.fuerza_colectiva ? `⚡ Fuerza Colectiva: ${t.fuerza_colectiva}` : '';
      }
      renderCarpeta();
    }

    function cerrarCarpeta() {
      tecActual = null; tab = 'tecnicos';
      document.getElementById('vista-c').classList.add('oculto');
      document.getElementById('vista-t').classList.remove('oculto');
      document.getElementById('breadcrumb').classList.add('oculto');
      document.getElementById('btn-nuevo').textContent = '+ Agregar';
      syncToolbar();
      renderTecnicos();
    }

    function renderCarpeta() {
      const t = tecnicos.find(x => x.id === tecActual);
      if (!t) return;

      // Banner
      const estilos = ESTILOS_DOM.map(([k, n]) => {
        const v = parseInt(t[k]) || 0; if (!v) return '';
        return `<div class="info-fila">
      <span class="info-label">${n}</span>
      <div class="est-barra-wrap" style="gap:8px;flex:1;margin-left:12px">
        <div class="est-barra-cont"><div class="est-barra" style="width:${v}%;background:${colBarra(v)}"></div></div>
        <span class="info-val-oro" style="min-width:24px">${v}</span>
      </div>
    </div>`;
      }).join('');

      const pots = [t.potenciador1, t.potenciador2, t.potenciador3]
        .filter(p => p && p !== '— Sin potenciador —');

      // Best XI section
      const xiSeccion = renderXIEnCarpeta(tecActual);
      document.getElementById('banner-c').innerHTML = `
    <div class="banner">
      <div class="banner-top">
        ${t.imagen
          ? `<img class="banner-img" src="${t.imagen}">`
          : `<div class="banner-img-ph">🧑‍💼</div>`}
        <div>
          <div class="banner-h2">${t.nombre || ''}</div>
          ${t.edicion ? `<div class="banner-sub">${t.edicion}</div>` : ''}
          <div class="tec-badges" style="margin-top:8px">
            ${t.fuerza_colectiva ? `<span class="badge badge-oro">⚡ ${t.fuerza_colectiva}</span>` : ''}
            ${t.estilo_usado ? `<span class="badge badge-azul">${t.estilo_usado}</span>` : ''}
            ${t.formacion ? `<span class="badge badge-verde">${t.formacion}</span>` : ''}
          </div>
          <div class="banner-acciones">
            <button class="btn-sm btn-sm-oro" onclick="editarTecnico('${t.id}')">✏️ Editar técnico</button>
            <button class="btn-sm" style="background:#ef4444;color:#fff" onclick="borrarTecnico('${t.id}')">🗑️ Eliminar</button>
            <button class="btn-sm" id="btn-plantilla" style="background:#6366f1;color:#fff" onclick="togglePlantilla('${t.id}')">🏟️ Ver Plantilla</button>
            <button class="btn-sm" style="background:#10b981;color:#fff" onclick="descargarTxt('${t.id}')">⬇️ .txt</button>
          </div>
        </div>
      </div>
      <div class="info-grid">
        ${estilos ? `<div class="info-bloque">
          <div class="info-titulo">🎮 Dom. del Estilo de Juego</div>${estilos}</div>` : ''}
        ${t.compatibilidad ? `<div class="info-bloque">
          <div class="info-titulo">🤝 Compatibilidad</div>
          <p style="font-size:.8rem;color:var(--verde);line-height:1.5">${t.compatibilidad}</p></div>` : ''}
        ${pots.length ? `<div class="info-bloque">
          <div class="info-titulo">💊 Potenciadores</div>
          ${pots.map(p => `<div class="info-fila"><span class="info-val-verde">+ ${p}</span></div>`).join('')}
        </div>` : ''}
        ${t.jugada_enlace ? `<div class="info-bloque">
          <div class="info-titulo">🔗 Jugada Enlace</div>
          <p style="font-size:.88rem;font-weight:700">${t.jugada_enlace}</p></div>` : ''}
        ${t.pieza_central_estilo || t.pieza_central_pos ? `<div class="info-bloque">
          <div class="info-titulo">⭐ Pieza Central</div>
          ${t.pieza_central_estilo ? `<div class="info-fila"><span class="info-label">Estilo</span><span class="info-val">${t.pieza_central_estilo}</span></div>` : ''}
          ${t.pieza_central_pos ? `<div class="info-fila"><span class="info-label">Posición</span><span class="info-val-oro">${t.pieza_central_pos}</span></div>` : ''}
        </div>` : ''}
        ${t.hombre_clave_estilo || t.hombre_clave_pos ? `<div class="info-bloque">
          <div class="info-titulo">🗝️ Hombre Clave</div>
          ${t.hombre_clave_estilo ? `<div class="info-fila"><span class="info-label">Estilo</span><span class="info-val">${t.hombre_clave_estilo}</span></div>` : ''}
          ${t.hombre_clave_pos ? `<div class="info-fila"><span class="info-label">Posición</span><span class="info-val-oro">${t.hombre_clave_pos}</span></div>` : ''}
        </div>` : ''}
      </div>
    </div>
    <div class="carp-xi-wrap">
      <div class="sec" style="margin-top:0">🏆 Mejor XI con este Técnico</div>
      ${xiSeccion}
    </div>`;

      // Jugadores
      const q = document.getElementById('buscar').value.toLowerCase();
      const pos = document.getElementById('filtro-pos').value;
      const items = carpetas
        .filter(c => c.tecnico_id === tecActual)
        .map(c => {
          const base = jugadores.find(j => j.id === c.jugador_id) || {};
          return { ...base, ...c, _cid: c.id, _base: base };
        })
        .filter(j =>
          (!q || (j.nombre || '').toLowerCase().includes(q)) &&
          (!pos || j.posicion === pos));

      document.getElementById('contador').textContent =
        `${items.length} jugador${items.length !== 1 ? 'es' : ''}`;

      const grid = document.getElementById('grid-c');
      if (!items.length) {
        grid.innerHTML = `<div class="vacio"><div class="vacio-i">👥</div>
      <h3>Sin jugadores en esta carpeta</h3>
      <p>Haz clic en "+ Agregar jugador" para añadir jugadores</p></div>`;
        return;
      }
      grid.innerHTML = items.map(j =>
        htmlCarta(j, `verCarpetaEntry('${j._cid}')`)).join('');
    }

    // ── Detalle jugador ───────────────────────────────────────────────────────────
    async function fetchJson(url) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return r.json();
    }

    async function verJugador(id, soloLectura = false) {
      const j = jugadores.find(x => x.id === id);
      if (!j) return;
      mostrarDetalle(j, null, soloLectura);
      setTimeout(() => drawRadar(j), 50);
      try {
        const [hist, progHist] = await Promise.all([
          fetchJson(`/api/historial/${id}`),
          fetchJson(`/api/prog_historial/${id}`),
        ]);
        const el = document.getElementById('det-historial');
        if (el) el.innerHTML = renderHistorial(hist, j);
        const ph = document.getElementById('det-prog-hist');
        if (ph) ph.innerHTML = renderProgHistorial(progHist, j);
      } catch (e) {
        console.error(e);
        const ph = document.getElementById('det-prog-hist');
        if (ph) ph.innerHTML = '<p style="color:var(--apagado);font-size:.82rem;font-style:italic">No se pudo cargar el historial.</p>';
        const el = document.getElementById('det-historial');
        if (el) el.innerHTML = '<p style="color:var(--apagado);font-size:.82rem;font-style:italic">No se pudo cargar el historial.</p>';
      }
    }

    function verCarpetaEntry(cid) {
      const c = carpetas.find(x => x.id === cid);
      if (!c) return;
      const base = jugadores.find(j => j.id === c.jugador_id) || {};
      const merged = { ...base, ...c, _cid: cid, _base: base };
      mostrarDetalle(merged, c);
      setTimeout(() => drawRadar(merged), 50);
    }

    function mostrarDetalle(j, cEntry, soloLectura = false) {
      const base = cEntry ? (j._base || {}) : j;
      const renderStat = (k, n) => {
        const v = parseInt(j[k]) || 0; if (!v) return '';
        const vb = parseInt(base[k]) || 0;
        const dif = cEntry && vb && v !== vb ? v - vb : 0;
        return `<div class="stat">
      <span class="stat-n">${n}</span>
      <div class="stat-b"><div class="stat-bf" style="width:${Math.min(100, v)}%;background:${colBarra(v)}"></div></div>
      <span class="stat-v">${v}${dif ? `<span class="stat-mod">${dif > 0 ? '+' + dif : dif}</span>` : ''}</span>
    </div>`;
      };
      document.getElementById('det-body').innerHTML = `
    <div class="det-header">
      <div class="det-carta det-carta-anim">${htmlCarta(j)}</div>
      <div class="det-info det-info-anim">
        <h2>${j.nombre || 'Sin nombre'}</h2>
        <div class="det-badges">
          ${j.overall ? `<span class="badge badge-oro">OVR ${j.overall}</span>` : ''}
          ${j.base ? `<span class="badge" style="background:#1e2535;color:#94a3b8">Base ${j.base}</span>` : ''}
          ${j.posicion ? `<span class="badge badge-azul">${j.posicion}</span>` : ''}
          ${j.condicion ? `<span class="badge badge-verde">${j.condicion}</span>` : ''}
          ${j.dorsal ? `<span class="badge-dorsal">#${j.dorsal}</span>` : ''}
        </div>
        ${j.edicion ? `<div style="color:var(--verde);font-size:.82rem;font-weight:600;margin-top:6px">✦ ${j.edicion}</div>` : ''}
        ${j.equipo ? `<div style="color:var(--apagado);font-size:.82rem;margin-top:4px">🏟️ ${j.equipo}</div>` : ''}
        <div class="det-acciones">
          ${soloLectura ? `<span class="badge" style="background:#1e2535;color:var(--apagado);font-size:.72rem">👁️ Solo lectura</span>`
          : cEntry
            ? `<button class="btn-edit" onclick="editarCarpeta('${cEntry.id}')">✏️ Editar stats</button>
               <button class="btn-del"  onclick="borrarCarpeta('${cEntry.id}')">🗑️ Quitar</button>`
            : `<button class="btn-edit" onclick="editarJugador('${j.id}')">✏️ Editar</button>
               <button class="btn-del"  onclick="borrarJugador('${j.id}')">🗑️ Eliminar</button>
               <button class="btn-sm" style="background:#6366f1;color:#fff" onclick="descargarFichaPDF('${j.id}')">📄 PDF</button>`}
        </div>
      </div>
    </div>
    <div class="det-body det-cuerpo-anim">
      <div class="stats-3col">
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-ataque">⚔️ Ataque</div>
          ${SA.map(([k, n]) => renderStat(k, n)).join('')}
        </div>
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-defensa">🛡️ Defensa</div>
          ${SD.map(([k, n]) => renderStat(k, n)).join('')}
        </div>
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-fuerza">⚡ Fuerza</div>
          ${SF.map(([k, n]) => renderStat(k, n)).join('')}
        </div>
      </div>

      <div class="sec" style="margin-top:14px">🕸️ Radar</div>
      <div class="radar-wrap">
        <canvas id="radar-canvas" width="280" height="280"></canvas>
        <div class="radar-legend" id="radar-legend"></div>
      </div>

      ${!cEntry ? `
      <div class="sec" style="margin-top:12px">📈 Progresión</div>
      <div id="det-prog-hist" style="color:var(--apagado);font-size:.82rem;padding:4px 0">Cargando...</div>
      ` : ''}
      ${mejorTecnicoSection(j.id || (j._base && j._base.id) || '', cEntry ? (j._base && j._base.overall) || '' : j.overall || '')}
      ${!cEntry ? `<div class="sec">📜 Historial de Stats</div><div id="det-historial" style="color:var(--apagado);font-size:.82rem;padding:6px 0">Cargando...</div>` : ''}
    </div>`;
      document.getElementById('ov-det').classList.remove('oculto');
    }

    // ── Formularios ───────────────────────────────────────────────────────────────
    function abrirNuevo() {
      editId = null;
      if (tab === 'jugadores') {
        mostrarFormJugador();
      } else if (tab === 'tecnicos') {
        mostrarFormTecnico();
      } else if (tab === 'carpeta') {
        mostrarFormCarpeta();
      }
    }

    function editarJugador(id) {
      editId = id;
      const j = jugadores.find(x => x.id === id);
      mostrarFormJugador(j);
      cerrar('ov-det');
    }

    function editarTecnico(id) {
      editId = id;
      const t = tecnicos.find(x => x.id === id);
      mostrarFormTecnico(t);
    }

    function editarCarpeta(cid) {
      editId = cid;
      const c = carpetas.find(x => x.id === cid);
      mostrarFormCarpeta(c);
      cerrar('ov-det');
    }

    function campoStat(k, n, val = '') {
      return `<div class="fg">
    <label>${n}</label>
    <input type="number" name="${k}" min="1" max="115" value="${val}">
  </div>`;
    }

    function mostrarFormJugador(j = {}) {
      const suger = j.id ? sugerirPot(j) : null;
      document.getElementById('form-body').innerHTML = `
    <div class="form-header">
      <h2>${j.id ? 'Editar Jugador' : 'Nuevo Jugador'}</h2>
      <p>Completa los datos del jugador</p>
    </div>
    <div class="form-body">
    <form id="FORM" enctype="multipart/form-data">
    <div class="fgrid">
      <div class="sep">📋 General</div>
      <div class="upload-area fg full">
        <input type="file" name="imagen" accept="image/*" onchange="prevImg(this,'prev-j')">
        <div id="prev-j">
          ${j.imagen
          ? `<img src="${j.imagen}" class="upload-preview">`
          : `<p style="color:var(--apagado);font-size:.9rem">📁 Subir imagen de la carta</p>`}
        </div>
      </div>
      <div class="fg full"><label>Nombre *</label>
        <input type="text" name="nombre" value="${j.nombre || ''}" placeholder="Ej: Iker Casillas" required></div>
      <div class="fg"><label>🔢 Dorsal</label>
        <div class="dorsal-input-wrap">
          <input type="number" name="dorsal" id="dorsal-input" min="1" max="99"
            value="${j.dorsal || ''}" placeholder="Ej: 10"
            onchange="validarDorsal(this.value,'${j.id || ''}')"
            oninput="validarDorsal(this.value,'${j.id || ''}')">
          <div id="dorsal-msg"></div>
          <div class="dorsal-ocupados" id="dorsal-ocupados"></div>
        </div>
      </div>
      <div class="fg"><label>Posición</label>
        <select name="posicion">
          <option value="">— Seleccionar —</option>${sel(POSICIONES, j.posicion || '')}
        </select></div>
      <div class="fg"><label>💊 Potenciador (escribe o elige)</label>
        <input type="text" name="potenciador" list="pot-lista" value="${j.potenciador || ''}" placeholder="Ej: Aceleración +1"></div>
      ${suger ? `<p class="pot-hint">💡 Sugerido según sus stats: <b>${suger}</b></p>` : ''}
      <div class="fg"><label>Overall</label>
        <input type="number" name="overall" min="1" max="130" value="${j.overall || ''}"></div>
      <div class="fg"><label>Overall Base</label>
        <input type="number" name="base" min="1" max="120" value="${j.base || ''}"></div>
      <div class="fg"><label>Condición (A/B/S)</label>
        <input type="text" name="condicion" maxlength="2" value="${j.condicion || ''}"></div>
      <div class="fg"><label>Edición</label>
        <input type="text" name="edicion" value="${j.edicion || ''}" placeholder="Edición Dorada"></div>
      <div class="fg full"><label>Equipo</label>
        <input type="text" name="equipo" value="${j.equipo || ''}"></div>

      <div class="sep" style="background:linear-gradient(90deg,#1a1500,transparent);
        color:var(--oro);padding:8px 12px;border-radius:6px;margin-top:4px">
        📈 Modo Progresión
      </div>
      <div class="fg full" style="background:#0a0f18;border:1px solid #1e2535;
        border-radius:10px;padding:14px;margin-top:2px">
        <label style="font-size:.72rem;font-weight:700;text-transform:uppercase;
          letter-spacing:.08em;color:var(--apagado);display:block;margin-bottom:10px">
          Puntos de progresión actuales
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 14px">
          <div class="prog-item">
            <label>🎯 Tiros</label>
            <input type="number" name="prog_tiros" min="0" max="9999" value="${j.prog_tiros || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>🔵 Pases</label>
            <input type="number" name="prog_pases" min="0" max="9999" value="${j.prog_pases || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>⚡ Dribles</label>
            <input type="number" name="prog_dribles" min="0" max="9999" value="${j.prog_dribles || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>🌟 Destreza</label>
            <input type="number" name="prog_destreza" min="0" max="9999" value="${j.prog_destreza || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>💪 Tren inferior</label>
            <input type="number" name="prog_tren" min="0" max="9999" value="${j.prog_tren || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>🦅 Fuerza aérea</label>
            <input type="number" name="prog_f_aerea" min="0" max="9999" value="${j.prog_f_aerea || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>🛡️ Defensa</label>
            <input type="number" name="prog_defensa" min="0" max="9999" value="${j.prog_defensa || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>🧤 PT1</label>
            <input type="number" name="prog_pt1" min="0" max="9999" value="${j.prog_pt1 || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>🧤 PT2</label>
            <input type="number" name="prog_pt2" min="0" max="9999" value="${j.prog_pt2 || ''}" placeholder="0">
          </div>
          <div class="prog-item">
            <label>🧤 PT3</label>
            <input type="number" name="prog_pt3" min="0" max="9999" value="${j.prog_pt3 || ''}" placeholder="0">
          </div>
        </div>
      </div>
      <div class="stats-3col">
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-ataque">⚔️ Ataque</div>
          ${SA.map(([k, n]) => campoStat(k, n, j[k] || '')).join('')}
        </div>
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-defensa">🛡️ Defensa</div>
          ${SD.map(([k, n]) => campoStat(k, n, j[k] || '')).join('')}
        </div>
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-fuerza">⚡ Fuerza</div>
          ${SF.map(([k, n]) => campoStat(k, n, j[k] || '')).join('')}
        </div>
      </div>
      <div class="form-acc">
        <button type="button" class="btn-cancelar" onclick="cerrar('ov-form')">Cancelar</button>
        <button type="submit" class="btn-guardar">💾 Guardar Jugador</button>
      </div>
    </div></form></div>`;
      document.getElementById('ov-form').classList.remove('oculto');
      bindForm('FORM', '/api/jugadores', editId, 'multipart');
    }

    function mostrarFormTecnico(t = {}) {
      const opPot = v => `<select name="${v}">
    ${sel(POTENCIADORES, t[v] || '— Sin potenciador —')}
  </select>`;
      const opEst = ESTILOS_DOM.map(([k, n]) => `<div class="fg">
    <label>${n} (0-100)</label>
    <input type="number" name="${k}" min="0" max="100" value="${t[k] || ''}">
  </div>`).join('');
      document.getElementById('form-body').innerHTML = `
    <div class="form-header">
      <h2>${t.id ? 'Editar Técnico' : 'Nuevo Técnico'}</h2>
    </div>
    <div class="form-body">
    <form id="FORM" enctype="multipart/form-data">
    <div class="fgrid">
      <div class="sep">📋 General</div>
      <div class="upload-area fg full">
        <input type="file" name="imagen" accept="image/*" onchange="prevImg(this,'prev-t')">
        <div id="prev-t">
          ${t.imagen
          ? `<img src="${t.imagen}" class="upload-preview">`
          : `<p style="color:var(--apagado);font-size:.9rem">📁 Subir imagen del técnico</p>`}
        </div>
      </div>
      <div class="fg full"><label>Nombre *</label>
        <input type="text" name="nombre" value="${t.nombre || ''}" required></div>
      <div class="fg"><label>Overall</label>
        <input type="number" name="overall" value="${t.overall || ''}"></div>
      <div class="fg"><label>Overall Base</label>
        <input type="number" name="base" value="${t.base || ''}"></div>
      <div class="fg full"><label>Edición</label>
        <input type="text" name="edicion" value="${t.edicion || ''}"></div>
      <div class="fg"><label>Formación</label>
        <input type="text" name="formacion" value="${t.formacion || ''}" placeholder="4-2-3-1"></div>
      <div class="fg"><label>⚡ Fuerza Colectiva</label>
        <input type="number" name="fuerza_colectiva" value="${t.fuerza_colectiva || ''}"></div>
      <div class="fg full"><label>Estilo de Juego Usado</label>
        <input type="text" name="estilo_usado" value="${t.estilo_usado || ''}"></div>
      <div class="sep">🎮 Dom. del Estilo de Juego</div>
      ${opEst}
      <div class="sep">🤝 Compatibilidad</div>
      <div class="fg full"><label>Texto</label>
        <textarea name="compatibilidad" rows="2" style="resize:vertical">${t.compatibilidad || ''}</textarea></div>
      <div class="sep">💊 Potenciadores</div>
      <div class="fg"><label>Potenciador 1 (escribe o elige)</label>
        <input type="text" name="potenciador1" list="pot-lista"
          value="${t.potenciador1 || ''}" placeholder="Ej: Aceleración +1"></div>
      <div class="fg"><label>Potenciador 2 (escribe o elige)</label>
        <input type="text" name="potenciador2" list="pot-lista"
          value="${t.potenciador2 || ''}" placeholder="Ej: Aceleración +1"></div>
      <div class="fg full"><label>Potenciador 3 (escribe o elige)</label><input type="text" name="potenciador3" list="pot-lista" value="${t.potenciador3 || ''}" placeholder="Ej: Equilibrio +1"></div>
      <div class="sep">🔗 Jugada Enlace</div>
      <div class="fg full"><label>Jugada(s)</label>
        <input type="text" name="jugada_enlace" value="${t.jugada_enlace || ''}" placeholder="1-2 Corte A"></div>
      <div class="sep">⭐ Pieza Central</div>
      <div class="fg"><label>Estilo de juego</label>
        <input type="text" name="pieza_central_estilo" value="${t.pieza_central_estilo || ''}"></div>
      <div class="fg"><label>Posición(es)</label>
        <input type="text" name="pieza_central_pos" value="${t.pieza_central_pos || ''}" placeholder="MDI, MDD"></div>
      <div class="sep">🗝️ Hombre Clave</div>
      <div class="fg"><label>Estilo de juego</label>
        <input type="text" name="hombre_clave_estilo" value="${t.hombre_clave_estilo || ''}"></div>
      <div class="fg"><label>Posición(es)</label>
        <input type="text" name="hombre_clave_pos" value="${t.hombre_clave_pos || ''}" placeholder="CD"></div>
      <div class="form-acc">
        <button type="button" class="btn-cancelar" onclick="cerrar('ov-form')">Cancelar</button>
        <button type="submit" class="btn-guardar">💾 Guardar Técnico</button>
      </div>
    </div></form></div>`;
      document.getElementById('ov-form').classList.remove('oculto');
      bindForm('FORM', '/api/tecnicos', editId, 'multipart');
    }

    function campoStatCarpeta(k, n, carpetaVal, baseVal) {
      const val = (carpetaVal !== undefined && carpetaVal !== '') ? carpetaVal : (baseVal || '');
      const base = baseVal || '';
      const dif = val && base && parseInt(val) !== parseInt(base)
        ? `<span style="color:${parseInt(val) > parseInt(base) ? 'var(--verde)' : 'var(--rojo)'}"> (${parseInt(val) > parseInt(base) ? '+' : ''}${parseInt(val) - parseInt(base)})</span>`
        : '';
      return `<div class="fg">
    <label>${n} <span style="color:var(--apagado);font-weight:400;font-size:.68rem">base: ${base || '—'}</span>${dif}</label>
    <input type="number" name="${k}" id="fc_${k}" min="1" max="115" value="${val}">
  </div>`;
    }

    function mostrarFormCarpeta(c = {}) {
      const t = tecnicos.find(x => x.id === tecActual) || {};
      const jugSel = c.jugador_id || '';
      const base = jugSel ? (jugadores.find(j => j.id === jugSel) || {}) : {};
      const esEdit = !!c.id;
      const editId = c.id || null;

      const buildStats = (bj, car) => `
    <div class="stats-3col">
      <div class="stats-col">
        <div class="stats-col-titulo stats-col-ataque">⚔️ Ataque</div>
        ${SA.map(([k, n]) => campoStatCarpeta(k, n, car[k], bj[k])).join('')}
      </div>
      <div class="stats-col">
        <div class="stats-col-titulo stats-col-defensa">🛡️ Defensa</div>
        ${SD.map(([k, n]) => campoStatCarpeta(k, n, car[k], bj[k])).join('')}
      </div>
      <div class="stats-col">
        <div class="stats-col-titulo stats-col-fuerza">⚡ Fuerza</div>
        ${SF.map(([k, n]) => campoStatCarpeta(k, n, car[k], bj[k])).join('')}
      </div>
    </div>`;

      document.getElementById('form-body').innerHTML = `
    <div class="form-header">
      <h2>${esEdit ? 'Editar stats con este técnico' : 'Agregar Jugador a Carpeta'}</h2>
      <p>Técnico: <b style="color:var(--oro)">${t.nombre || ''}</b></p>
    </div>
    <div class="form-body">
    <form id="FORM">
    <div class="fgrid">
      <div class="sep">👤 Jugador</div>

      ${esEdit
          ? `<input type="hidden" name="jugador_id" value="${jugSel}">
           <div class="fg full" style="flex-direction:row;align-items:center;gap:14px;
             background:var(--oscuro);border:1px solid var(--borde);border-radius:10px;padding:12px">
             ${base.imagen ? `<img src="${base.imagen}" style="width:54px;height:54px;
               border-radius:8px;object-fit:cover;border:1px solid var(--borde)">` : ''}
             <div>
               <div style="font-weight:700;font-size:1rem">${base.nombre || 'Jugador'}</div>
               <div style="font-size:.8rem;color:var(--apagado);margin-top:2px">
                 ${base.posicion || ''} · OVR ${base.overall || '—'} · ${base.edicion || ''}
               </div>
             </div>
           </div>`
          : `<div class="fg full">
             <label>Seleccionar jugador (stats base se cargan automáticamente)</label>
             <input type="hidden" name="jugador_id" id="sel-jug-hidden" value="${jugSel}">
             <input type="text" id="psl-search" placeholder="🔍 Buscar jugador por nombre o posición..." oninput="filtrarPSL(this.value)" style="margin-bottom:8px; width:100%; padding:10px; border-radius:6px; background:var(--oscuro); border:1px solid var(--borde); color:var(--texto);">
             <div id="psl-list" style="max-height:250px;overflow-y:auto;border:1px solid var(--borde);border-radius:6px;background:var(--oscuro); display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:6px; padding:6px">
               ${jugadores.filter(j => j.id == jugSel || !carpetas.some(carp => carp.tecnico_id == tecActual && carp.jugador_id == j.id)).map(j =>
            `<div class="psl-item" data-id="${j.id}" data-search="${(j.nombre + ' ' + j.posicion).toLowerCase()}" onclick="seleccionarJugadorCustom('${j.id}', this)" style="display:flex;align-items:center;padding:8px;gap:10px;cursor:pointer;border:1px solid ${j.id == jugSel ? 'var(--oro)' : 'transparent'};border-radius:6px;background:${j.id == jugSel ? '#2a3441' : '#1e2535'};transition:all 0.2s">
                   ${j.imagen ? `<img src="${j.imagen}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">` : `<div style="width:40px;height:40px;background:#333;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem">🧑</div>`}
                   <div style="flex:1; overflow:hidden">
                     <div style="font-weight:700; white-space:nowrap; text-overflow:ellipsis; overflow:hidden">${j.nombre}</div>
                     <div style="font-size:0.8rem;color:var(--apagado)">${j.posicion || '?'} · OVR ${j.overall || '—'}</div>
                   </div>
                 </div>`
          ).join('')}
             </div>
             <p style="font-size:.74rem;color:var(--verde);margin-top:5px">
               💡 Al elegir un jugador, todos sus campos se pre-llenan. Solo modifica lo que cambia con este técnico.
             </p>
           </div>`}

      <div class="sep">📊 Overall con este técnico</div>
      <div class="fg">
        <label>Overall <span style="color:var(--apagado);font-weight:400;font-size:.68rem">base: ${base.overall || '—'}</span></label>
        <input type="number" name="overall" id="fc_overall" min="1" max="130" value="${c.overall || base.overall || ''}">
      </div>
      <div class="fg">
        <label>💊 Potenciador (escribe o elige)</label>
        <input type="text" name="potenciador" id="fc_potenciador" list="pot-lista"
          value="${potDisplay(c) || potDisplay(base) || ''}" placeholder="Ej: Aceleración +1">
      </div>

      <div id="stats-carpeta">
        ${buildStats(base, c)}
      </div>

      <div class="form-acc">
        <button type="button" class="btn-cancelar" onclick="cerrar('ov-form')">Cancelar</button>
        <button type="submit" class="btn-guardar">💾 Guardar</button>
      </div>
    </div></form></div>`;

      document.getElementById('ov-form').classList.remove('oculto');
      bindForm('FORM', '/api/carpetas', editId, 'carpeta');
    }

    /* Al seleccionar un jugador, pre-llena todos los campos con sus stats base */
    function autoFillCarpeta(selectEl) {
      const jid = selectEl.value;
      const j = jugadores.find(x => x.id === jid);
      if (!j) return;

      // Overall
      const ovEl = document.getElementById('fc_overall');
      if (ovEl) {
        ovEl.value = j.overall || '';
        ovEl.previousElementSibling.innerHTML =
          `Overall <span style="color:var(--apagado);font-weight:400;font-size:.68rem">base: ${j.overall || '—'}</span>`;
      }

      // Potenciador
      const potEl = document.getElementById('fc_potenciador');
      if (potEl) potEl.value = potDisplay(j) || '';

      // Reconstruir stats con las del jugador como base
      const container = document.getElementById('stats-carpeta');
      if (container) {
        container.innerHTML = `
      <div class="stats-3col">
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-ataque">⚔️ Ataque</div>
          ${SA.map(([k, n]) => campoStatCarpeta(k, n, '', j[k])).join('')}
        </div>
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-defensa">🛡️ Defensa</div>
          ${SD.map(([k, n]) => campoStatCarpeta(k, n, '', j[k])).join('')}
        </div>
        <div class="stats-col">
          <div class="stats-col-titulo stats-col-fuerza">⚡ Fuerza</div>
          ${SF.map(([k, n]) => campoStatCarpeta(k, n, '', j[k])).join('')}
        </div>
      </div>`;
      }
    }

    function filtrarPSL(val) {
      const q = val.toLowerCase();
      document.querySelectorAll('.psl-item').forEach(el => {
        if (el.dataset.search.includes(q)) el.style.display = '';
        else el.style.display = 'none';
      });
    }

    function seleccionarJugadorCustom(jid, el) {
      document.querySelectorAll('.psl-item').forEach(e => {
        e.style.borderColor = 'transparent';
        e.style.background = '#1e2535';
      });
      el.style.borderColor = 'var(--oro)';
      el.style.background = '#2a3441';
      document.getElementById('sel-jug-hidden').value = jid;
      autoFillCarpeta({ value: jid });
    }

    // ── Bind de formulario ────────────────────────────────────────────────────────
    function bindForm(formId, endpoint, eid, tipo) {
      const form = document.getElementById(formId);
      if (!form) { console.error('Form not found:', formId); return; }
      form.onsubmit = async function (e) {
        e.preventDefault();
        e.stopPropagation();
        const fd = new FormData(form);
        if (tipo === 'carpeta' && tecActual) {
          fd.set('tecnico_id', tecActual);
          if (eid) {
            const c = carpetas.find(x => x.id === eid);
            if (c) fd.set('jugador_id', c.jugador_id);
          }
          const potVal = (form.querySelector('[name="potenciador"]')?.value || '').trim();
          if (potVal) fd.set('potenciador', potVal);
        }
        const url = eid ? `${endpoint}/${eid}` : endpoint;
        const method = eid ? 'PUT' : 'POST';
        const prevJug = (tipo === 'multipart' && eid) ? jugadores.find(x => x.id === eid) : null;
        try {
          const r = await fetch(url, { method, body: fd });
          if (!r.ok) { console.error('Error:', r.status, await r.text()); return; }
          const saved = (tipo === 'multipart') ? await r.json() : null;
          if (tipo === 'multipart' && saved?.id) {
            const snap = {};
            let tieneProg = false;
            PROG_KEYS.forEach(([k]) => {
              const v = fd.get(k);
              if (v !== null && v !== '') { snap[k] = parseInt(v); tieneProg = true; }
            });
            const cambio = tieneProg && PROG_KEYS.some(([k]) => String(prevJug?.[k] || '') !== String(snap[k] || ''));
            if (cambio) await API.saveProgHistorial(saved.id, snap);
          }
          cerrar('ov-form');
          editId = null;
          await cargar();
          initBranding();
          initModo();
          if (tab === 'carpeta') renderCarpeta();
        } catch (err) {
          console.error('Fetch error:', err);
        }
      };
    }

    // ── Borrar ────────────────────────────────────────────────────────────────────
    async function borrarJugador(id) {
      if (!confirm('¿Eliminar este jugador?')) return;
      await API.delete('jugadores', id);
      cerrar('ov-det');
      await cargar();
      initBranding();
      initModo();
    }
    async function borrarTecnico(id) {
      if (!confirm('¿Eliminar este técnico y todos sus jugadores asignados?')) return;
      await API.delete('tecnicos', id);
      cerrarCarpeta();
      await cargar();
      initBranding();
      initModo();
    }
    async function borrarCarpeta(cid) {
      if (!confirm('¿Quitar este jugador del técnico?')) return;
      await API.delete('carpetas', cid);
      cerrar('ov-det');
      await cargar();
      initBranding();
      initModo();
      renderCarpeta();
    }

    // ── Imagen preview ────────────────────────────────────────────────────────────
    function prevImg(input, divId) {
      if (!input.files[0]) return;
      const r = new FileReader();
      r.onload = e => {
        document.getElementById(divId).innerHTML =
          `<img src="${e.target.result}" class="upload-preview">`;
      };
      r.readAsDataURL(input.files[0]);
    }

    // ── Navegación ────────────────────────────────────────────────────────────────
    function syncToolbar() {
      const t = tab;
      const toolbar = document.getElementById('toolbar');
      const showToolbar = t === 'jugadores' || t === 'carpeta';
      if (toolbar) toolbar.classList.toggle('oculto', !showToolbar);
      const sb = document.getElementById('sort-bar');
      if (sb) sb.style.display = t === 'jugadores' ? '' : 'none';
      const btn = document.getElementById('btn-nuevo');
      if (btn) btn.style.display = ['inicio', 'xi', 'comparar', 'jcomparar', 'stats'].includes(t) ? 'none' : '';
    }

    function cambiarTab(t) {
      if (tab === 'carpeta') cerrarCarpeta();
      tab = t;
      document.getElementById('tab-inicio').classList.toggle('activo', t === 'inicio');
      document.getElementById('tab-j').classList.toggle('activo', t === 'jugadores');
      document.getElementById('tab-t').classList.toggle('activo', t === 'tecnicos');
      document.getElementById('tab-x').classList.toggle('activo', t === 'xi');
      document.getElementById('tab-comp').classList.toggle('activo', t === 'comparar');
      document.getElementById('tab-jcomp').classList.toggle('activo', t === 'jcomparar');
      document.getElementById('tab-stats').classList.toggle('activo', t === 'stats');
      document.getElementById('tab-admin').classList.toggle('activo', t === 'admin');
      // Sync móvil select
      const sel = document.getElementById('tabs-mobile');
      if (sel && sel.value !== t) {
        const opt = sel.querySelector(`option[value="${t}"]`);
        if (opt) sel.value = t;
      }
      document.getElementById('vista-inicio').classList.toggle('oculto', t !== 'inicio');
      document.getElementById('vista-j').classList.toggle('oculto', t !== 'jugadores');
      document.getElementById('vista-t').classList.toggle('oculto', t !== 'tecnicos');
      document.getElementById('vista-xi').classList.toggle('oculto', t !== 'xi');
      document.getElementById('vista-comp').classList.toggle('oculto', t !== 'comparar');
      document.getElementById('vista-jcomp').classList.toggle('oculto', t !== 'jcomparar');
      document.getElementById('vista-stats').classList.toggle('oculto', t !== 'stats');
      document.getElementById('vista-admin').classList.toggle('oculto', t !== 'admin');
      document.getElementById('btn-nuevo').textContent = t === 'carpeta' ? '+ Agregar jugador' : '+ Agregar';
      syncToolbar();
      if (t === 'xi') renderMejorXI();
      else if (t === 'comparar') renderComparador();
      else if (t === 'jcomparar') renderComparadorJugadores();
      else if (t === 'stats') renderEstadisticas();
      else if (t === 'admin') renderAdmin();
      else renderizar();
    }

    function cerrar(id) {
      document.getElementById(id).classList.add('oculto');
    }

    // ── Descargar .txt ────────────────────────────────────────────────────────────
    function descargarTxt(tid) {
      const t = tecnicos.find(x => x.id === tid); if (!t) return;
      const asig = carpetas.filter(c => c.tecnico_id === tid);
      const sep = '═'.repeat(54);
      const lin = '─'.repeat(54);
      let txt = sep + '\n';
      txt += '  ⚽ eFootball Manager — Plantilla del Técnico\n';
      txt += sep + '\n\n';
      txt += `  TÉCNICO   : ${t.nombre || '—'}\n`;
      if (t.edicion) txt += `  EDICIÓN   : ${t.edicion}\n`;
      if (t.formacion) txt += `  FORMACIÓN : ${t.formacion}\n`;
      if (t.fuerza_colectiva) txt += `  FUERZA COLECTIVA : ${t.fuerza_colectiva}\n`;
      if (t.estilo_usado) txt += `  ESTILO DE JUEGO  : ${t.estilo_usado}\n`;
      const domLines = ESTILOS_DOM.filter(([k]) => t[k]).map(([k, n]) => `  ${n}: ${t[k]}`);
      if (domLines.length) txt += '\n' + lin + '\n  🎮  DOM. ESTILO DE JUEGO\n' + lin + '\n' + domLines.join('\n') + '\n';
      const pots = [t.potenciador1, t.potenciador2, t.potenciador3].filter(p => p && p !== '— Sin potenciador —');
      if (pots.length) txt += '\n' + lin + '\n  💊  POTENCIADORES DEL TÉCNICO\n' + lin + '\n' + pots.map(p => `  ${p}`).join('\n') + '\n';
      txt += '\n' + sep + '\n';
      txt += `  JUGADORES (${asig.length})\n`;
      txt += sep + '\n';
      const playerSep = '\n\n' + sep + '\n' + sep + '\n\n';
      asig.forEach((c, i) => {
        const b = jugadores.find(j => j.id === c.jugador_id) || {};
        const j = { ...b, ...c };
        if (i > 0) txt += playerSep;
        txt += generarFichaTxt(j, { base: b, incluirTecnicos: false });
      });
      txt += '\n' + sep + '\n';
      txt += `  eFootball Manager · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
      txt += sep + '\n';
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (t.nombre || 'tecnico').replace(/[^a-zA-Z0-9 ]/g, '_') + '.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    }


    // ── CAMPO / PLANTILLA ─────────────────────────────────────────────────────────
    async function togglePlantilla(tid) {
      modoPlantilla = !modoPlantilla;
      const btn = document.getElementById('btn-plantilla');
      if (btn) btn.textContent = modoPlantilla ? '📋 Ver Carpeta' : '🏟️ Ver Plantilla';
      const gridC = document.getElementById('grid-c');
      const campoC = document.getElementById('campo-c');
      if (modoPlantilla) {
        gridC.style.display = 'none';
        campoC.style.display = '';
        campoC.innerHTML = `<div style="padding:30px;text-align:center;color:var(--apagado)">
      ⏳ Cargando plantilla...</div>`;
        await buildPlantilla(tid);
      } else {
        limpiarDrag();
        campoC.style.display = 'none';
        campoC.innerHTML = '';
        gridC.style.display = '';
        renderCarpeta();
      }
    }

    function autoAsignar(lines, jugsCarpeta) {
      const usados = new Set();
      const sorted = [...jugsCarpeta].sort((a, b) =>
        (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0));
      return lines.map(line =>
        line.map(pos => {
          const compat = COMPAT[pos] || [pos];
          const jug = sorted.find(p => !usados.has(p.cid) && compat.includes(p.posicion));
          if (jug) usados.add(jug.cid);
          return { pos, jug: jug || null };
        })
      );
    }

    async function buildPlantilla(tid) {
      const t = tecnicos.find(x => x.id === tid); if (!t) return;
      const formStr = t.formacion || '4-2-3-1';
      const lines = DEF_FORM[formStr] || DEF_FORM['4-2-3-1'];

      const jugsCarp = carpetas.filter(c => c.tecnico_id === tid).map(c => {
        const base = jugadores.find(j => j.id === c.jugador_id) || {};
        return { ...base, ...c, cid: c.id };
      });

      // Load saved positions + drawings
      let savedPos = []; drawings = [];
      try {
        const d = await API.getPlantilla(tid);
        if (d) {
          const d = await API.getPlantilla(tid);
          if (Array.isArray(d)) { savedPos = d; }
          else { savedPos = d.posiciones || []; drawings = d.dibujos || []; }
        }
      } catch (e) { }

      plantillaActual = [];
      const positioned = new Set();

      for (const sv of savedPos) {
        const jug = jugsCarp.find(j => j.cid === sv.cid);
        if (jug) { plantillaActual.push({ ...jug, x: sv.x, y: sv.y, pos: sv.pos }); positioned.add(sv.cid); }
      }

      // Auto-assign remaining
      const remaining = jugsCarp.filter(j => !positioned.has(j.cid));
      const asig = autoAsignar(lines, remaining);
      const nL = asig.length;
      asig.forEach((line, li) => {
        const yP = nL === 1 ? 50 : 85 - ((85 - 12) / (nL - 1)) * li;
        line.forEach((item, pi) => {
          if (!item.jug) return;
          const xP = line.length === 1 ? 50 : 10 + (80 / (line.length - 1)) * pi;
          plantillaActual.push({ ...item.jug, x: xP, y: yP, pos: item.pos });
        });
      });

      renderCampo(tid);
    }

    function svgShapes() {
      const colors = {
        '#ef4444': 'arr-red', '#ffffff': 'arr-white', '#f0b429': 'arr-yellow',
        '#10b981': 'arr-green', '#60a5fa': 'arr-blue'
      };
      const defs = Object.entries(colors).map(([c, id]) => `
    <marker id="${id}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 6 3, 0 6" fill="${c}"/>
    </marker>`).join('');
      const shapes = drawings.map((d, i) => {
        const mid = colors[d.color] || 'arr-red';
        if (d.type === 'arrow')
          return `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}"
        stroke="${d.color}" stroke-width="${d.w || 3}" stroke-linecap="round"
        marker-end="url(#${mid})" data-i="${i}"/>`;
        if (d.type === 'circle')
          return `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}"
        stroke="${d.color}" stroke-width="${d.w || 3}" fill="none"
        stroke-dasharray="${d.dashed ? '4 3' : ''}" data-i="${i}"/>`;
        if (d.type === 'cross') {
          const s = d.s || 20;
          return `<g data-i="${i}">
            <line x1="${d.cx - s}" y1="${d.cy - s}" x2="${d.cx + s}" y2="${d.cy + s}"
              stroke="${d.color}" stroke-width="${d.w || 3}" stroke-linecap="round"/>
            <line x1="${d.cx + s}" y1="${d.cy - s}" x2="${d.cx - s}" y2="${d.cy + s}"
              stroke="${d.color}" stroke-width="${d.w || 3}" stroke-linecap="round"/>
          </g>`;
        }
        return '';
      }).join('');
      return `<defs>${defs}</defs>${shapes}`;
    }

    function renderCampo(tid) {
      const t = tecnicos.find(x => x.id === tid) || {};

      const fieldSvg = `<svg viewBox="0 0 460 620" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">
    <rect x="20" y="14" width="420" height="592" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <line x1="20" y1="310" x2="440" y2="310" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="230" cy="310" r="70" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="230" cy="310" r="4" fill="rgba(255,255,255,.5)"/>
    <rect x="110" y="14"  width="240" height="100" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="110" y="506" width="240" height="100" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="165" y="14"  width="130" height="44"  fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="165" y="562" width="130" height="44"  fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="230" cy="114" r="4" fill="rgba(255,255,255,.5)"/>
    <circle cx="230" cy="506" r="4" fill="rgba(255,255,255,.5)"/>
  </svg>`;

      const slotsHtml = plantillaActual.map(p => {
        const apellido = (p.nombre || '').split(' ').slice(-1)[0];
        return `<div class="campo-slot" data-cid="${p.cid}"
      style="position:absolute;left:${p.x}%;top:${p.y}%;
        transform:translate(-50%,-50%);display:flex;flex-direction:column;
        align-items:center;gap:3px;z-index:2"
      onmousedown="initDrag(event,'${p.cid}')"
      ontouchstart="initDrag(event,'${p.cid}')">
      <div class="campo-pos">${p.pos || p.posicion || ''}</div>
      <div class="campo-circulo">
        ${p.imagen ? `<img src="${p.imagen}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top">`
            : `<span style="font-size:1.4rem">🧑</span>`}
      </div>
      <div class="campo-ovr">${p.overall || '—'}</div>
      <div class="campo-nombre">${apellido}</div>
    </div>`;
      }).join('');

      const COLORS = ['#ef4444', '#ffffff', '#f0b429', '#10b981', '#60a5fa'];

      document.getElementById('campo-c').innerHTML = `
    <div class="campo-wrap">
      <div class="campo-export-bar">
        <span class="campo-titulo-text">🏟️ ${t.formacion || '4-2-3-1'}</span>
        <button class="btn-sm" style="background:#6366f1;color:#fff"
          onclick="togglePizarra('${tid}')">✏️ Pizarra</button>
        <button class="btn-sm btn-sm-oro"
          onclick="exportarPlantillaPng('${tid}')">📥 PNG</button>
        <button class="btn-sm" style="background:linear-gradient(135deg,#f0b429,#e09a00);color:#000;font-weight:700"
          onclick="exportarSquadBuilder('${tid}')">📸 Squad</button>
      </div>

      <div class="pizarra-bar oculto" id="piz-bar">
        <button class="piz-btn activo" id="piz-arrow" onclick="setTool('arrow')">→ Flecha</button>
        <button class="piz-btn"       id="piz-circle" onclick="setTool('circle')">⭕ Círculo</button>
        <button class="piz-btn"       id="piz-cross" onclick="setTool('cross')">✕ Cruz</button>
        <button class="piz-btn"       id="piz-move" onclick="setTool('move')">✋ Mover</button>
        <div class="piz-sep"></div>
        ${COLORS.map(c => `
          <div class="piz-color ${c === activeColor ? 'activo' : ''}"
            style="background:${c}" onclick="setColor('${c}')" title="${c}"></div>`).join('')}
        <div class="piz-sep"></div>
        <select class="piz-width" onchange="setWidth(this.value)">
          <option value="2" ${activeWidth == 2 ? 'selected' : ''}>Fino</option>
          <option value="4" ${activeWidth == 4 ? 'selected' : ''}>Medio</option>
          <option value="6" ${activeWidth == 6 ? 'selected' : ''}>Grueso</option>
        </select>
        <div class="piz-sep"></div>
        <button class="piz-btn" onclick="undoShape()" title="Deshacer último">↩️</button>
        <button class="piz-btn" onclick="clearShapes()" title="Limpiar todo">🗑️</button>
      </div>

      <div class="campo" id="campo-field" style="position:relative">
        ${fieldSvg}
        <div style="position:absolute;inset:0" id="campo-jugs">${slotsHtml}</div>
        <svg id="drawing-svg" viewBox="0 0 460 620" preserveAspectRatio="none"
          style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none">
          ${svgShapes()}
        </svg>
      </div>
      <p class="campo-hint">💡 Arrastra jugadores para reposicionarlos · ✏️ Pizarra para dibujar</p>
    </div>`;
    }


    // ── DRAG & DROP ───────────────────────────────────────────────────────────────
    function initDrag(e, cid) {
      if (e.cancelable) e.preventDefault();
      const campo = document.getElementById('campo-field');
      if (!campo) return;
      const rect = campo.getBoundingClientRect();
      const el = e.currentTarget;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy2 = e.touches ? e.touches[0].clientY : e.clientY;
      const curLeft = parseFloat(el.style.left) / 100 * rect.width;
      const curTop = parseFloat(el.style.top) / 100 * rect.height;
      dragState = {
        cid, rect, el,
        ox: cx - rect.left - curLeft,
        oy: cy2 - rect.top - curTop
      };
      el.classList.add('dragging-now');
      document.addEventListener('mousemove', onDragMove, { passive: false });
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('touchend', onDragEnd);
    }

    function onDragMove(e) {
      if (!dragState) return;
      if (e.cancelable) e.preventDefault();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const { rect, el, ox, oy } = dragState;
      const xPct = Math.max(4, Math.min(96, (cx - rect.left - ox) / rect.width * 100));
      const yPct = Math.max(4, Math.min(96, (cy - rect.top - oy) / rect.height * 100));
      el.style.left = xPct + '%';
      el.style.top = yPct + '%';
    }

    function onDragEnd() {
      if (!dragState) return;
      const { cid, el } = dragState;
      el.classList.remove('dragging-now');
      const x = parseFloat(el.style.left);
      const y = parseFloat(el.style.top);
      const entry = plantillaActual.find(p => p.cid === cid);
      if (entry) { entry.x = x; entry.y = y; }
      limpiarDrag();
      guardarPlantilla(tecActual);
    }

    function limpiarDrag() {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
      dragState = null;
    }

    async function guardarPlantilla(tid) {
      if (!tid) return;
      const posiciones = plantillaActual.map(p => ({ cid: p.cid, jugador_id: p.jugador_id, x: p.x, y: p.y, pos: p.pos || p.posicion || '' }));
      await fetch(`/api/plantillas/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posiciones, dibujos: drawings })
      });
    }

    // ── EXPORTAR PNG (canvas manual, alta calidad) ────────────────────────────────
    async function exportarPlantillaPng(tid) {
      const t = tecnicos.find(x => x.id === tid) || {};
      const btn = document.querySelector('.campo-export-bar .btn-sm-oro');
      if (btn) { btn.textContent = '⏳ Generando...'; btn.disabled = true; }

      const W = 920, H = 1240, R = 46;
      const c2 = document.createElement('canvas');
      c2.width = W; c2.height = H;
      const ctx = c2.getContext('2d');

      // Stripes
      const cols = ['#1e7a1e', '#228b22'];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = cols[i % 2];
        ctx.fillRect(0, i * H / 8, W, H / 8);
      }

      // Lines
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
      ctx.strokeRect(40, 28, W - 80, H - 56);
      ctx.beginPath(); ctx.moveTo(40, H / 2); ctx.lineTo(W - 40, H / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 115, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.strokeRect(205, 28, W - 410, 185);
      ctx.strokeRect(300, 28, W - 600, 74);
      ctx.strokeRect(205, H - 213, W - 410, 185);
      ctx.strokeRect(300, H - 102, W - 600, 74);
      ctx.beginPath(); ctx.arc(W / 2, 105, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
      ctx.beginPath(); ctx.arc(W / 2, H - 105, 5, 0, Math.PI * 2); ctx.fill();

      // Coach name top
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
      ctx.fillText((t.nombre || '').toUpperCase(), W / 2, 22);

      // Load images
      const imgMap = {};
      await Promise.all(plantillaActual.filter(p => p.imagen).map(p =>
        new Promise(res => {
          const img = new Image(); img.crossOrigin = 'anonymous';
          img.onload = () => { imgMap[p.cid] = img; res() };
          img.onerror = res;
          img.src = p.imagen;
        })
      ));

      // Players
      for (const p of plantillaActual) {
        const cx = W * p.x / 100, cy = H * p.y / 100;

        // Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 5;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = '#0e1218'; ctx.fill();
        ctx.restore();

        // Photo
        if (imgMap[p.cid]) {
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(imgMap[p.cid], cx - R + 2, cy - R + 2, (R - 2) * 2, (R - 2) * 2);
          ctx.restore();
        }

        // Ring
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.stroke();

        // Position above
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(p.pos || p.posicion || '', cx, cy - R - 10);

        // OVR badge
        const bw = 52, bh = 22, bx = cx - bw / 2, by = cy + R + 5;
        ctx.fillStyle = '#f0b429';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 6);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 15px Arial';
        ctx.fillText(p.overall || '', cx, by + bh - 5);

        // Name
        const apellido = (p.nombre || '').split(' ').slice(-1)[0].substring(0, 13);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial';
        ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
        ctx.fillText(apellido, cx, cy + R + 36);
        ctx.shadowBlur = 0;
      }

      // ── Draw shapes on canvas ─────────────────────────────────────────────────
      for (const d of drawings) {
        ctx.save();
        ctx.strokeStyle = d.color; ctx.fillStyle = d.color;
        ctx.lineWidth = (d.w || 3) * 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;

        if (d.type === 'arrow') {
          const ax = W * d.x1 / 460, ay = H * d.y1 / 620;
          const bx = W * d.x2 / 460, by = H * d.y2 / 620;
          const angle = Math.atan2(by - ay, bx - ax);
          const hw = (d.w || 3) * 5; // arrowhead size

          // Line (end before arrowhead)
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx - hw * 0.7 * Math.cos(angle), by - hw * 0.7 * Math.sin(angle));
          ctx.stroke();

          // Arrowhead filled triangle
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx - hw * Math.cos(angle - Math.PI / 6), by - hw * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(bx - hw * Math.cos(angle + Math.PI / 6), by - hw * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

        } else if (d.type === 'circle') {
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(W * d.cx / 460, H * d.cy / 620, W * d.r / 460, 0, Math.PI * 2);
          ctx.stroke();
        } else if (d.type === 'cross') {
          ctx.shadowBlur = 0;
          const cx2 = W * d.cx / 460, cy2 = H * d.cy / 620;
          const s2 = W * d.s / 460;
          ctx.beginPath(); ctx.moveTo(cx2 - s2, cy2 - s2); ctx.lineTo(cx2 + s2, cy2 + s2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx2 + s2, cy2 - s2); ctx.lineTo(cx2 - s2, cy2 + s2); ctx.stroke();
        }
        ctx.restore();
      }

      // Watermark
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
      ctx.fillText('eFootball Manager', W / 2, H - 10);

      if (btn) { btn.textContent = '📥 Exportar PNG'; btn.disabled = false; }

      const link = document.createElement('a');
      link.download = `plantilla_${(t.nombre || 'equipo').replace(/\s+/g, '_')}.png`;
      link.href = c2.toDataURL('image/png', 1.0);
      link.click();
    }

    // ── MEJOR TÉCNICO PARA UN JUGADOR ─────────────────────────────────────────────
    function mejorTecnicoSection(jid, ovBase) {
      const enCarpetas = carpetas.filter(c => c.jugador_id === jid);
      if (!enCarpetas.length)
        return `<div class="sec">📊 Rendimiento por Técnico</div>
      <p class="mejor-sin">Este jugador aún no está en ninguna carpeta de técnico.</p>`;

      const ranking = enCarpetas
        .map(c => ({ c, t: tecnicos.find(x => x.id === c.tecnico_id) }))
        .filter(x => x.t)
        .map(x => ({ ...x, ovr: parseInt(x.c.overall) || parseInt(ovBase) || 0 }))
        .sort((a, b) => b.ovr - a.ovr);

      const base = parseInt(ovBase) || 0;

      return `<div class="sec">📊 Rendimiento por Técnico</div>
    <div class="mejores-grid">
      ${ranking.map((item, i) => {
        const dif = item.ovr - base;
        return `<div class="mejor-fila ${i === 0 ? 'mejor-top' : ''}">
          <span class="mejor-rank">${i === 0 ? '⭐' : (i + 1) + 'º'}</span>
          ${item.t.imagen
            ? `<img src="${item.t.imagen}" class="mejor-img">`
            : '<span style="font-size:1.4rem">🧑‍💼</span>'}
          <span class="mejor-nombre">${item.t.nombre}</span>
          <span class="mejor-ovr">${item.ovr || '—'}</span>
          ${base && item.ovr
            ? `<span class="mejor-dif" style="color:${dif >= 0 ? 'var(--verde)' : 'var(--rojo)'}">
                ${dif >= 0 ? '+' : ''}${dif}</span>` : ''}
        </div>`;
      }).join('')}
    </div>`;
    }


    // ── PIZARRA ───────────────────────────────────────────────────────────────────
    function togglePizarra(tid) {
      drawMode = !drawMode;
      const bar = document.getElementById('piz-bar');
      const svg = document.getElementById('drawing-svg');
      const campo = document.getElementById('campo-field');
      const btn = document.querySelector('.campo-export-bar button[onclick*="togglePizarra"]');
      if (drawMode) {
        bar && bar.classList.remove('oculto');
        svg && (svg.style.pointerEvents = 'all', svg.style.cursor = 'crosshair');
        campo && campo.classList.add('pizarra-activa');
        btn && (btn.textContent = '✅ Pizarra ON', btn.style.background = '#10b981');
        updateSVG();
      } else {
        bar && bar.classList.add('oculto');
        svg && (svg.style.pointerEvents = 'none', svg.style.cursor = '');
        campo && campo.classList.remove('pizarra-activa');
        btn && (btn.textContent = '✏️ Pizarra', btn.style.background = '#6366f1');
      }
    }

    function setTool(t) {
      activeTool = t;
      document.getElementById('piz-arrow')?.classList.toggle('activo', t === 'arrow');
      document.getElementById('piz-circle')?.classList.toggle('activo', t === 'circle');
      document.getElementById('piz-cross')?.classList.toggle('activo', t === 'cross');
      document.getElementById('piz-move')?.classList.toggle('activo', t === 'move');
      const svg = document.getElementById('drawing-svg');
      if (svg) svg.style.cursor = t === 'move' ? 'grab' : 'crosshair';
    }

    // ── MOVE SHAPES ──────────────────────────────────────────────────────────────
    let moveState = null; // { idx, startX, startY, origShape }

    function getShapeAt(pt) {
      // Find closest shape center within 25px
      let best = -1, bestDist = 25;
      drawings.forEach((d, i) => {
        let cx, cy;
        if (d.type === 'circle' || d.type === 'cross') { cx = d.cx; cy = d.cy; }
        else if (d.type === 'arrow') { cx = (d.x1 + d.x2) / 2; cy = (d.y1 + d.y2) / 2; }
        const dist = Math.sqrt(Math.pow(pt.x - cx, 2) + Math.pow(pt.y - cy, 2));
        if (dist < bestDist) { best = i; bestDist = dist; }
      });
      return best;
    }

    function startMove(e) {
      if (!drawMode || activeTool !== 'move') return;
      if (e.cancelable) e.preventDefault();
      const pt = getSVGPt(e);
      const idx = getShapeAt(pt);
      if (idx < 0) return;
      moveState = { idx, startX: pt.x, startY: pt.y, origShape: JSON.parse(JSON.stringify(drawings[idx])) };
      const svg = document.getElementById('drawing-svg');
      if (svg) svg.style.cursor = 'grabbing';
    }

    function doMove(e) {
      if (!moveState) return;
      if (e.cancelable) e.preventDefault();
      const pt = getSVGPt(e);
      const dx = pt.x - moveState.startX;
      const dy = pt.y - moveState.startY;
      const orig = moveState.origShape;
      const d = drawings[moveState.idx];
      if (d.type === 'circle' || d.type === 'cross') {
        d.cx = orig.cx + dx; d.cy = orig.cy + dy;
      } else if (d.type === 'arrow') {
        d.x1 = orig.x1 + dx; d.y1 = orig.y1 + dy;
        d.x2 = orig.x2 + dx; d.y2 = orig.y2 + dy;
      }
      const svg = document.getElementById('drawing-svg');
      if (svg) svg.innerHTML = svgShapes();
    }

    function endMove(e) {
      if (!moveState) return;
      moveState = null;
      const svg = document.getElementById('drawing-svg');
      if (svg) svg.style.cursor = 'grab';
      guardarPlantilla(tecActual);
      updateSVG();
    }

    function setColor(c) {
      activeColor = c;
      document.querySelectorAll('.piz-color').forEach(el =>
        el.classList.toggle('activo', el.style.background === c || el.style.backgroundColor === c));
    }

    function setWidth(v) { activeWidth = parseInt(v); }

    function getSVGPt(e) {
      const svg = document.getElementById('drawing-svg');
      if (!svg) return { x: 230, y: 310 };
      const r = svg.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.max(0, Math.min(460, (cx - r.left) / r.width * 460)),
        y: Math.max(0, Math.min(620, (cy - r.top) / r.height * 620))
      };
    }

    function startDraw(e) {
      if (!drawMode) return;
      if (activeTool === 'move') { startMove(e); return; }
      if (e.cancelable) e.preventDefault();
      const pt = getSVGPt(e);
      drawingState = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, preview: null };
    }

    function updateDraw(e) {
      if (!drawMode) return;
      if (activeTool === 'move') { doMove(e); return; }
      if (!drawingState) return;
      if (e.cancelable) e.preventDefault();
      const pt = getSVGPt(e);
      drawingState.x2 = pt.x; drawingState.y2 = pt.y;

      // Remove old preview
      if (drawingState.preview) drawingState.preview.remove();
      const svg = document.getElementById('drawing-svg');
      if (!svg) return;

      if (activeTool === 'arrow') {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const mid = {
          '#ef4444': 'arr-red', '#ffffff': 'arr-white', '#f0b429': 'arr-yellow',
          '#10b981': 'arr-green', '#60a5fa': 'arr-blue'
        }[activeColor] || 'arr-red';
        el.setAttribute('x1', drawingState.x1); el.setAttribute('y1', drawingState.y1);
        el.setAttribute('x2', pt.x); el.setAttribute('y2', pt.y);
        el.setAttribute('stroke', activeColor); el.setAttribute('stroke-width', activeWidth);
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('marker-end', `url(#${mid})`);
        el.setAttribute('opacity', '0.7');
        svg.appendChild(el); drawingState.preview = el;
      } else if (activeTool === 'circle') {
        const dx = pt.x - drawingState.x1, dy = pt.y - drawingState.y1;
        const r = Math.sqrt(dx * dx + dy * dy);
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('cx', drawingState.x1); el.setAttribute('cy', drawingState.y1);
        el.setAttribute('r', r);
        el.setAttribute('stroke', activeColor); el.setAttribute('stroke-width', activeWidth);
        el.setAttribute('fill', 'none'); el.setAttribute('opacity', '0.7');
        svg.appendChild(el); drawingState.preview = el;
      } else if (activeTool === 'cross') {
        const s = Math.max(Math.abs(pt.x - drawingState.x1), Math.abs(pt.y - drawingState.y1), 8);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('opacity', '0.7');
        const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l1.setAttribute('x1', drawingState.x1 - s); l1.setAttribute('y1', drawingState.y1 - s);
        l1.setAttribute('x2', drawingState.x1 + s); l1.setAttribute('y2', drawingState.y1 + s);
        l1.setAttribute('stroke', activeColor); l1.setAttribute('stroke-width', activeWidth);
        l1.setAttribute('stroke-linecap', 'round');
        const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l2.setAttribute('x1', drawingState.x1 + s); l2.setAttribute('y1', drawingState.y1 - s);
        l2.setAttribute('x2', drawingState.x1 - s); l2.setAttribute('y2', drawingState.y1 + s);
        l2.setAttribute('stroke', activeColor); l2.setAttribute('stroke-width', activeWidth);
        l2.setAttribute('stroke-linecap', 'round');
        g.appendChild(l1); g.appendChild(l2);
        svg.appendChild(g); drawingState.preview = g;
      }
    }

    function endDraw(e) {
      if (!drawMode) return;
      if (activeTool === 'move') { endMove(e); return; }
      if (!drawingState) return;
      if (drawingState.preview) drawingState.preview.remove();
      const pt = getSVGPt(e.changedTouches ? { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY } : e);

      const dist = Math.sqrt(Math.pow(pt.x - drawingState.x1, 2) + Math.pow(pt.y - drawingState.y1, 2));
      if (dist < 3) { drawingState = null; return; } // too small, ignore

      if (activeTool === 'arrow') {
        drawings.push({
          type: 'arrow', x1: drawingState.x1, y1: drawingState.y1,
          x2: pt.x, y2: pt.y, color: activeColor, w: activeWidth
        });
      } else if (activeTool === 'circle') {
        drawings.push({
          type: 'circle', cx: drawingState.x1, cy: drawingState.y1,
          r: dist, color: activeColor, w: activeWidth
        });
      } else if (activeTool === 'cross') {
        const s = Math.max(dist, 8);
        drawings.push({
          type: 'cross', cx: drawingState.x1, cy: drawingState.y1,
          s: s, color: activeColor, w: activeWidth
        });
      }
      drawingState = null;
      updateSVG();
      guardarPlantilla(tecActual);
    }

    function updateSVG() {
      const svg = document.getElementById('drawing-svg');
      if (!svg) return;
      svg.innerHTML = svgShapes();
      // Re-bind events
      svg.onmousedown = startDraw;
      svg.onmousemove = updateDraw;
      svg.onmouseup = endDraw;
      svg.ontouchstart = startDraw;
      svg.ontouchmove = updateDraw;
      svg.ontouchend = endDraw;
    }

    function undoShape() {
      if (!drawings.length) return;
      drawings.pop();
      updateSVG();
      guardarPlantilla(tecActual);
    }

    function clearShapes() {
      if (!drawings.length) return;
      if (!confirm('¿Borrar todos los dibujos?')) return;
      drawings = [];
      updateSVG();
      guardarPlantilla(tecActual);
    }


    // ── HISTORIAL ─────────────────────────────────────────────────────────────────
    function renderHistorial(hist, jugBase) {
      if (!hist.length) return '<p style="color:var(--apagado);font-size:.82rem;font-style:italic">Edita el jugador para empezar a registrar el historial.</p>';

      const makeEntry = (entry, i) => {
        const prev = hist[i + 1];
        const esActual = i === 0;
        const ts = entry._ts ? new Date(entry._ts.replace('T', ' ')) : null;
        const fecha = ts ? ts.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        const hora = ts ? ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

        // Compute changed stats vs previous version
        let cambiosHtml = '';
        if (prev) {
          const cambios = TODAS.filter(([k]) => entry[k] && prev[k] && entry[k] !== prev[k]);
          if (cambios.length) {
            cambiosHtml = `<div class="hist-cambios">${cambios.map(([k, n]) => {
              const dif = parseInt(entry[k]) - parseInt(prev[k]);
              return `<div class="hist-fila">
            <span class="hist-nom">${n}</span>
            <span class="hist-val-old">${prev[k]}</span>
            <span class="hist-arrow">→</span>
            <span class="hist-val-new" style="color:${dif > 0 ? 'var(--verde)' : 'var(--rojo)'}">${entry[k]}</span>
            <span class="hist-dif" style="color:${dif > 0 ? 'var(--verde)' : 'var(--rojo)'}">${dif > 0 ? '+' : ''}${dif}</span>
          </div>`;
            }).join('')}</div>`;
          } else {
            cambiosHtml = `<p class="hist-primera">Sin cambios en stats (solo datos generales)</p>`;
          }
        } else {
          cambiosHtml = `<p class="hist-primera">📌 Versión inicial registrada</p>`;
        }

        return `<div class="historial-entry">
      <div class="hist-header">
        <span class="hist-fecha">📅 ${fecha} · ${hora}</span>
        ${esActual ? '<span class="badge badge-verde" style="font-size:.65rem">Actual</span>' : ''}
      </div>
      <div class="hist-ovr">OVR ${entry.overall || '—'} · Base ${entry.base || '—'} · ${entry.edicion || ''}</div>
      ${cambiosHtml}
    </div>`;
      };

      const actual = makeEntry(hist[0], 0);
      const anteriores = hist.slice(1);
      if (!anteriores.length) return actual;

      const plural = anteriores.length !== 1 ? 's' : '';
      return `${actual}
    <details class="prog-hist-details" style="margin-top:8px">
      <summary>📂 Historial anterior (${anteriores.length} registro${plural})</summary>
      <div class="prog-hist-pasado">
        ${anteriores.map((e, i) => makeEntry(e, i + 1)).join('')}
      </div>
    </details>`;
    }

    // ── MEJOR XI ─────────────────────────────────────────────────────────────────
    function calcularXI(formStr) {
      const lines = DEF_FORM[formStr] || DEF_FORM['4-2-3-1'];
      const sorted = [...jugadores].sort((a, b) => (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0));
      const usados = new Set();
      const titulares = [];
      const nL = lines.length;

      lines.forEach((line, li) => {
        const yP = nL === 1 ? 50 : 85 - ((85 - 12) / (nL - 1)) * li;
        line.forEach((pos, pi) => {
          const compat = COMPAT[pos] || [pos];
          const jug = sorted.find(j => !usados.has(j.id) && compat.includes(j.posicion));
          const xP = line.length === 1 ? 50 : 10 + (80 / (line.length - 1)) * pi;
          if (jug) { usados.add(jug.id); titulares.push({ ...jug, x: xP, y: yP, pos }); }
          else titulares.push({ x: xP, y: yP, pos, vacio: true });
        });
      });

      const suplentes = sorted.filter(j => !usados.has(j.id)).slice(0, 7);
      return { titulares, suplentes };
    }

    function renderMejorXI() {
      const xi = document.getElementById('xi-inner');
      if (!xi) return;

      if (!jugadores.length) {
        xi.innerHTML = `<div class="xi-empty"><div style="font-size:3rem;margin-bottom:12px">⚽</div>
      <h3 style="color:var(--muted)">No hay jugadores aún</h3></div>`;
        return;
      }

      const formStr = document.getElementById('xi-form-sel')?.value || '4-2-3-1';
      const { titulares, suplentes } = calcularXI(formStr);

      const fieldSvg = `<svg viewBox="0 0 460 620" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">
    <rect x="20" y="14" width="420" height="592" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <line x1="20" y1="310" x2="440" y2="310" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="230" cy="310" r="70" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="230" cy="310" r="4" fill="rgba(255,255,255,.5)"/>
    <rect x="110" y="14"  width="240" height="100" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="110" y="506" width="240" height="100" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="165" y="14"  width="130" height="44"  fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="165" y="562" width="130" height="44"  fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="230" cy="114" r="4" fill="rgba(255,255,255,.5)"/>
    <circle cx="230" cy="506" r="4" fill="rgba(255,255,255,.5)"/>
  </svg>`;

      const slotsHtml = titulares.map(p => {
        if (p.vacio) return `<div style="position:absolute;left:${p.x}%;top:${p.y}%;
      transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px">
      <div class="campo-pos">${p.pos}</div>
      <div class="campo-circulo-empty">?</div>
      <div class="campo-vacio">Vacío</div></div>`;
        const apellido = (p.nombre || '').split(' ').slice(-1)[0];
        return `<div class="campo-slot" style="position:absolute;left:${p.x}%;top:${p.y}%;
      transform:translate(-50%,-50%);display:flex;flex-direction:column;
      align-items:center;gap:3px;z-index:2" onclick="verJugador('${p.id}')">
      <div class="campo-pos">${p.pos}</div>
      <div class="campo-circulo">
        ${p.imagen ? `<img src="${p.imagen}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top">`
            : `<span style="font-size:1.4rem">🧑</span>`}
      </div>
      <div class="campo-ovr">${p.overall || '—'}</div>
      <div class="campo-nombre">${apellido}</div>
    </div>`;
      }).join('');

      const formsOpts = Object.keys(DEF_FORM).map(f =>
        `<option value="${f}" ${f === formStr ? 'selected' : ''}>${f}</option>`).join('');

      const overallTitulares = titulares.filter(p => !p.vacio)
        .reduce((s, p) => s + (parseInt(p.overall) || 0), 0);
      const promedio = titulares.filter(p => !p.vacio).length
        ? Math.round(overallTitulares / titulares.filter(p => !p.vacio).length) : 0;

      xi.innerHTML = `
    <div class="xi-controls">
      <span class="xi-titulo">🏆 Mejor XI recomendado</span>
      <select id="xi-form-sel" class="filtro" onchange="renderMejorXI()">${formsOpts}</select>
    </div>
    <div style="display:flex;gap:10px;width:100%;max-width:460px;margin-top:-8px">
      <div style="background:var(--card);border:1px solid var(--borde);border-radius:8px;
        padding:8px 14px;flex:1;text-align:center">
        <div style="font-size:.68rem;color:var(--apagado);font-weight:700;text-transform:uppercase">OVR Promedio</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--oro)">${promedio}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--borde);border-radius:8px;
        padding:8px 14px;flex:1;text-align:center">
        <div style="font-size:.68rem;color:var(--apagado);font-weight:700;text-transform:uppercase">Jugadores</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--verde)">${jugadores.length}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--borde);border-radius:8px;
        padding:8px 14px;flex:1;text-align:center">
        <div style="font-size:.68rem;color:var(--apagado);font-weight:700;text-transform:uppercase">Formación</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--azul,#60a5fa)">${formStr}</div>
      </div>
    </div>
    <div class="campo" style="position:relative;width:100%;max-width:460px;aspect-ratio:460/620">
      ${fieldSvg}
      <div style="position:absolute;inset:0">${slotsHtml}</div>
    </div>
    ${suplentes.length ? `
    <div class="xi-suplentes-wrap">
      <div class="xi-sup-titulo">🪑 Suplentes recomendados</div>
      <div class="xi-sup-grid">
        ${suplentes.map(j => htmlCarta(j, `verJugador('${j.id}')`)).join('')}
      </div>
    </div>` : ''}`;
    }


    // ── SORT ─────────────────────────────────────────────────────────────────────
    function setSort(s) {
      sortJug = s;
      ['ovr-desc', 'ovr-asc', 'nombre', 'posicion'].forEach(k => {
        const el = document.getElementById('sb-' + k.replace('-', '').replace('desc', 'd').replace('asc', 'a').replace('posicion', 'pos').replace('nombre', 'nom'));
        if (el) el.classList.toggle('activo', k === s);
      });
      renderJugadores();
    }

    // ── MEJOR XI EN CARPETA ───────────────────────────────────────────────────────
    function renderXIEnCarpeta(tid) {
      const t = tecnicos.find(x => x.id === tid);
      const formStr = t?.formacion || '4-2-3-1';
      const lines = DEF_FORM[formStr] || DEF_FORM['4-2-3-1'];

      const jugsCarp = carpetas.filter(c => c.tecnico_id === tid).map(c => {
        const base = jugadores.find(j => j.id === c.jugador_id) || {};
        return { ...base, ...c, cid: c.id };
      });
      if (!jugsCarp.length) return `<p style="color:var(--apagado);font-size:.85rem;padding:8px 0">Añade jugadores a la carpeta para ver el Mejor XI.</p>`;

      const sorted = [...jugsCarp].sort((a, b) => (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0));
      const usados = new Set();
      const titulares = [];
      const nL = lines.length;

      lines.forEach((line, li) => {
        const yP = nL === 1 ? 50 : 85 - ((85 - 12) / (nL - 1)) * li;
        line.forEach((pos, pi) => {
          const compat = COMPAT[pos] || [pos];
          const jug = sorted.find(j => !usados.has(j.cid) && compat.includes(j.posicion));
          const xP = line.length === 1 ? 50 : 10 + (80 / (line.length - 1)) * pi;
          if (jug) { usados.add(jug.cid); titulares.push({ ...jug, x: xP, y: yP, pos }); }
          else titulares.push({ x: xP, y: yP, pos, vacio: true });
        });
      });

      const suplentes = sorted.filter(j => !usados.has(j.cid)).slice(0, 12);
      const prom = Math.round(titulares.filter(p => !p.vacio).reduce((s, p) => s + (parseInt(p.overall) || 0), 0) / Math.max(1, titulares.filter(p => !p.vacio).length));

      const fieldSvg = `<svg viewBox="0 0 460 620" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">
    <rect x="20" y="14" width="420" height="592" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <line x1="20" y1="310" x2="440" y2="310" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="230" cy="310" r="70" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="110" y="14" width="240" height="100" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="110" y="506" width="240" height="100" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="165" y="14" width="130" height="44"  fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="165" y="562" width="130" height="44" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
  </svg>`;

      const slotsHtml = titulares.map(p => {
        if (p.vacio) return `<div style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px">
      <div class="campo-pos" style="font-size:.5rem">${p.pos}</div>
      <div class="campo-circulo-empty" style="width:34px;height:34px;font-size:.9rem">?</div>
    </div>`;
        const apellido = (p.nombre || '').split(' ').slice(-1)[0];
        return `<div style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%);
      display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;z-index:2"
      onclick="verCarpetaEntry('${p.cid}')">
      <div class="campo-pos" style="font-size:.5rem">${p.pos}</div>
      <div class="campo-circulo" style="width:34px;height:34px">
        ${p.imagen ? `<img src="${p.imagen}" style="width:100%;height:100%;object-fit:cover;object-position:top">` : `<span style="font-size:.9rem">🧑</span>`}
      </div>
      <div class="campo-ovr" style="font-size:.6rem;padding:1px 4px">${p.overall || '—'}</div>
      <div class="campo-nombre" style="font-size:.5rem;max-width:48px">${apellido}</div>
    </div>`;
      }).join('');

      const supsHtml = suplentes.length ? `
    <div style="margin-top:10px">
      <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
        color:var(--apagado);margin-bottom:6px">🪑 Suplentes (${suplentes.length})</div>
      <div class="carp-xi-sups">
        ${suplentes.map(j => htmlCarta(j, `verCarpetaEntry('${j.cid}')`)).join('')}
      </div>
    </div>` : '';

      return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:.7rem;font-weight:700;text-transform:uppercase;
        letter-spacing:.08em;color:var(--oro)">🏟️ Formación: ${formStr}</span>
      <span style="font-size:.78rem;color:var(--apagado)">OVR prom: <b style="color:var(--oro)">${prom}</b></span>
    </div>
    <div class="carp-xi-campo">
      ${fieldSvg}
      <div style="position:absolute;inset:0">${slotsHtml}</div>
    </div>
    ${supsHtml}`;
    }

    // ── BRANDING (logo + favicon) ───────────────────────────────────────────────────
    async function initBranding() {
      await cargarEscudos();
      const esc = escudoDelDia();
      const logoEl = document.getElementById('logo-header') || document.querySelector('.logo');
      if (esc) {
        setFavicon(esc.url);
        if (logoEl) logoEl.innerHTML =
          `<img class="logo-escudo" src="${esc.url}" alt="${esc.nombre}" title="${esc.nombre}">` +
          '<span>eFootball Manager</span>';
      } else if (logoEl) {
        logoEl.innerHTML = '<span>eFootball Manager</span>';
      }
    }


    // ══ COMPARADOR DE TÉCNICOS ════════════════════════════════════════════════════
    function renderComparador() {
      const el = document.getElementById('comp-inner');
      if (!el) return;

      const opcionesTec = tecnicos.map(t =>
        `<option value="${t.id}">${t.nombre}</option>`).join('');

      el.innerHTML = `
    <div class="comp-selectors">
      <div class="comp-select-box ${comparT1 ? 'seleccionado-1' : ''}"
        style="cursor:default" id="comp-box-1">
        ${comparT1 ? _miniCoach(comparT1, '#60a5fa') : `
          <span style="font-size:2rem">🧑‍💼</span>
          <div>
            <div style="font-weight:700;font-size:.9rem">Técnico 1</div>
            <select style="margin-top:6px;padding:6px 10px;border-radius:6px;
              background:var(--oscuro);border:1px solid var(--borde);color:var(--texto);
              font-size:.85rem;cursor:pointer;color-scheme:dark light" onchange="seleccionarComp(1,this.value)">
              <option value="">— Seleccionar —</option>${opcionesTec}
            </select>
          </div>`}
      </div>
      <div class="comp-vs">VS</div>
      <div class="comp-select-box ${comparT2 ? 'seleccionado-2' : ''}"
        style="cursor:default" id="comp-box-2">
        ${comparT2 ? _miniCoach(comparT2, '#f472b6') : `
          <span style="font-size:2rem">🧑‍💼</span>
          <div>
            <div style="font-weight:700;font-size:.9rem">Técnico 2</div>
            <select style="margin-top:6px;padding:6px 10px;border-radius:6px;
              background:var(--oscuro);border:1px solid var(--borde);color:var(--texto);
              font-size:.85rem;cursor:pointer;color-scheme:dark light" onchange="seleccionarComp(2,this.value)">
              <option value="">— Seleccionar —</option>${opcionesTec}
            </select>
          </div>`}
      </div>
    </div>
    ${comparT1 && comparT2 ? _buildComparacion() : _placeholderComp()}`;
    }

    function seleccionarComp(slot, tid) {
      if (slot === 1) comparT1 = tid ? tecnicos.find(t => t.id === tid) || null : null;
      else comparT2 = tid ? tecnicos.find(t => t.id === tid) || null : null;
      renderComparador();
    }

    function _miniCoach(t, color) {
      return `
    <div>
      ${t.imagen ? `<img class="comp-coach-img" src="${t.imagen}">`
          : `<div class="comp-coach-img-ph">🧑‍💼</div>`}
    </div>
    <div class="comp-coach-info">
      <h3 style="color:${color}">${t.nombre}</h3>
      <div class="sub">${t.edicion || ''}</div>
      ${t.fuerza_colectiva ? `<div class="comp-fuerza">⚡${t.fuerza_colectiva}</div>` : ''}
    </div>
    <button onclick="seleccionarComp(${color === '#60a5fa' ? 1 : 2},'')"
      style="margin-left:auto;background:none;border:none;color:var(--apagado);
        font-size:1.1rem;cursor:pointer;padding:4px">✕</button>`;
    }

    function _placeholderComp() {
      return `<div class="comp-placeholder">
    <div class="icon">⚖️</div>
    <p>Selecciona dos técnicos arriba para comparar sus carpetas</p>
  </div>`;
    }

    function _jPorCarpeta(tid) {
      return carpetas.filter(c => c.tecnico_id === tid).map(c => {
        const base = jugadores.find(j => j.id === c.jugador_id) || {};
        return { ...base, ...c, _cid: c.id };
      }).sort((a, b) => (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0));
    }

    function _buildComparacion() {
      const t1 = comparT1, t2 = comparT2;
      const j1 = _jPorCarpeta(t1.id);
      const j2 = _jPorCarpeta(t2.id);
      const ids1 = new Set(j1.map(j => j.jugador_id));
      const ids2 = new Set(j2.map(j => j.jugador_id));
      const comunes = [...ids1].filter(id => ids2.has(id));

      const colorBarra = v => {
        if (v >= 90) return '#f0b429'; if (v >= 80) return '#10b981';
        if (v >= 65) return '#2563eb'; return '#5a6475';
      };

      // Columna de estilos
      const estiloFila = (k, nom) => {
        const v1 = parseInt(t1[k]) || 0, v2 = parseInt(t2[k]) || 0;
        if (!v1 && !v2) return '';
        return `<div class="comp-estilo-fila">
      <span class="comp-estilo-nom">${nom}</span>
      <span class="comp-estilo-val" style="color:${colorBarra(v1)}">${v1 || '—'}</span>
      <div class="comp-bar-wrap" style="width:60px">
        <div class="comp-bar-fill" style="width:${v1}%;background:${colorBarra(v1)}"></div></div>
      <span style="color:var(--apagado);font-size:.7rem;padding:0 4px">|</span>
      <div class="comp-bar-wrap" style="width:60px">
        <div class="comp-bar-fill" style="width:${v2}%;background:${colorBarra(v2)}"></div></div>
      <span class="comp-estilo-val" style="color:${colorBarra(v2)}">${v2 || '—'}</span>
    </div>`;
      };

      const estilosHtml = ESTILOS_DOM.map(([k, n]) => estiloFila(k, n)).join('');

      // Potenciadores
      const potHtml = (t) => [t.potenciador1, t.potenciador2, t.potenciador3]
        .filter(p => p && p !== '— Sin potenciador —')
        .map(p => `<span class="comp-pot-badge">⚡${p}</span>`).join('') || '<span style="color:var(--apagado);font-size:.8rem">—</span>';

      // Jugadores
      const jugadorFila = (j, isComun) => {
        const cl = isComun ? 'comp-jug-fila-comun' : '';
        return `<div class="comp-jugador-fila ${cl}" onclick="verDetalle('${j.id || j.jugador_id}','jugador')">
      ${j.imagen ? `<img class="comp-jug-img" src="${j.imagen}">`
            : `<div class="comp-jug-img-ph">🧑</div>`}
      <span class="comp-jug-pos">${j.posicion || '?'}</span>
      <span class="comp-jug-nombre">${j.nombre || '—'}</span>
      <span class="comp-jug-ovr">${j.overall || '—'}</span>
      ${isComun ? '<span style="font-size:.7rem;color:var(--verde)" title="En ambos técnicos">✓</span>' : ''}
    </div>`;
      };

      const colJugadores = (jArr, ids_otro) => {
        if (!jArr.length) return `<p style="color:var(--apagado);font-size:.82rem;padding:8px 0">Sin jugadores en esta carpeta</p>`;
        const comunes = jArr.filter(j => ids_otro.has(j.jugador_id));
        const soloEste = jArr.filter(j => !ids_otro.has(j.jugador_id));
        let html = '';
        if (comunes.length) {
          html += `<div class="comp-sec-header">✓ En ambas carpetas (${comunes.length})</div>`;
          html += comunes.map(j => jugadorFila(j, true)).join('');
        }
        if (soloEste.length) {
          html += `<div class="comp-sec-header" style="margin-top:8px">Solo aquí (${soloEste.length})</div>`;
          html += soloEste.map(j => jugadorFila(j, false)).join('');
        }
        return html;
      };

      // Comparar jugadores comunes stat a stat
      const statsComunes = comunes.length ? comunes.map(jid => {
        const jj1 = j1.find(j => j.jugador_id === jid);
        const jj2 = j2.find(j => j.jugador_id === jid);
        const base = jugadores.find(j => j.id === jid) || {};
        const ovr1 = parseInt(jj1?.overall) || 0, ovr2 = parseInt(jj2?.overall) || 0;
        const dif = ovr1 - ovr2;
        return `<div style="background:var(--card);border:1px solid var(--borde);border-radius:10px;
      padding:12px;display:flex;align-items:center;gap:10px;margin-bottom:8px">
      ${base.imagen ? `<img src="${base.imagen}" style="width:44px;height:44px;border-radius:50%;
        object-fit:cover;object-position:top;border:1px solid var(--borde)">`
            : `<div style="width:44px;height:44px;border-radius:50%;background:var(--muted);
          display:flex;align-items:center;justify-content:center;font-size:1.2rem">🧑</div>`}
      <div style="flex:1">
        <div style="font-weight:700;font-size:.88rem">${base.nombre || ''}</div>
        <div style="font-size:.72rem;color:var(--apagado)">${base.posicion || ''} · ${base.edicion || ''}</div>
      </div>
      <div style="text-align:center;min-width:44px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;
          color:#60a5fa">${ovr1 || '—'}</div>
        <div style="font-size:.6rem;color:var(--apagado)">T1</div>
      </div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;
        color:${dif > 0 ? 'var(--verde)' : dif < 0 ? 'var(--rojo)' : 'var(--apagado)'}">
        ${dif > 0 ? '+' + dif : dif === 0 ? '=' : (dif)}
      </div>
      <div style="text-align:center;min-width:44px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;
          color:#f472b6">${ovr2 || '—'}</div>
        <div style="font-size:.6rem;color:var(--apagado)">T2</div>
      </div>
    </div>`;
      }).join('') : '';

      return `
    <!-- ENCABEZADO COMPARACIÓN -->
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;margin-bottom:16px;align-items:center">
      <div style="background:linear-gradient(135deg,#0e1a30,var(--card));border:1px solid #60a5fa33;
        border-radius:12px;padding:14px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:#60a5fa">${t1.nombre}</div>
        <div style="font-size:.78rem;color:var(--apagado)">${t1.formacion || ''} · ${j1.length} jugadores</div>
        ${t1.fuerza_colectiva ? `<div class="comp-fuerza" style="font-size:1.5rem">⚡${t1.fuerza_colectiva}</div>` : ''}
      </div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--oro);
        text-align:center;padding:0 8px">VS</div>
      <div style="background:linear-gradient(135deg,#1a0e20,var(--card));border:1px solid #f472b633;
        border-radius:12px;padding:14px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:#f472b6">${t2.nombre}</div>
        <div style="font-size:.78rem;color:var(--apagado)">${t2.formacion || ''} · ${j2.length} jugadores</div>
        ${t2.fuerza_colectiva ? `<div class="comp-fuerza" style="font-size:1.5rem">⚡${t2.fuerza_colectiva}</div>` : ''}
      </div>
    </div>

    <!-- ESTILOS DE JUEGO -->
    ${estilosHtml ? `<div class="comp-bloque" style="margin-bottom:14px">
      <div class="comp-bloque-titulo">🎮 Dom. del Estilo de Juego
        <span style="float:right;font-size:.7rem;color:#60a5fa">T1</span>
        <span style="float:right;margin-right:4px;font-size:.7rem;color:#f472b6">T2 </span>
      </div>
      <div class="comp-bloque-body">${estilosHtml}</div>
    </div>` : ''}

    <!-- POTENCIADORES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div class="comp-bloque">
        <div class="comp-bloque-titulo" style="color:#60a5fa">💊 Potenciadores T1</div>
        <div class="comp-bloque-body">${potHtml(t1)}</div>
      </div>
      <div class="comp-bloque">
        <div class="comp-bloque-titulo" style="color:#f472b6">💊 Potenciadores T2</div>
        <div class="comp-bloque-body">${potHtml(t2)}</div>
      </div>
    </div>

    <!-- JUGADORES COMPARTIDOS -->
    ${statsComunes ? `<div class="comp-bloque" style="margin-bottom:14px">
      <div class="comp-bloque-titulo">👥 Jugadores en ambas carpetas — Comparación OVR (${comunes.length})</div>
      <div class="comp-bloque-body">${statsComunes}</div>
    </div>` : ''}

    <!-- CARPETAS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="comp-bloque comp-col-1">
        <div class="comp-bloque-titulo" style="color:#60a5fa">📁 Carpeta de ${t1.nombre} (${j1.length})</div>
        <div class="comp-bloque-body">${colJugadores(j1, ids2)}</div>
      </div>
      <div class="comp-bloque comp-col-2">
        <div class="comp-bloque-titulo" style="color:#f472b6">📁 Carpeta de ${t2.nombre} (${j2.length})</div>
        <div class="comp-bloque-body">${colJugadores(j2, ids1)}</div>
      </div>
    </div>`;
    }

    // ── VALIDACIÓN DE DORSAL ─────────────────────────────────────────────────────
    function validarDorsal(val, propiojid = '') {
      const num = parseInt(val);
      const msgEl = document.getElementById('dorsal-msg');
      const ocEl = document.getElementById('dorsal-ocupados');
      if (!msgEl) return true;

      if (!val || isNaN(num)) {
        msgEl.innerHTML = '';
        ocEl && (ocEl.innerHTML = _dorsalesOcupados(propiojid));
        return true; // sin dorsal = OK
      }
      if (num < 1 || num > 99) {
        msgEl.innerHTML = '<span class="dorsal-error">⚠️ El dorsal debe ser entre 1 y 99</span>';
        return false;
      }

      // Buscar si otro jugador ya tiene ese dorsal
      const ocupado = jugadores.find(j =>
        j.id !== propiojid && parseInt(j.dorsal) === num
      );
      if (ocupado) {
        msgEl.innerHTML = `<span class="dorsal-error">
      ❌ El jugador <b>${ocupado.nombre}</b> ya tiene asignado el dorsal <b>#${num}</b>
    </span>`;
        ocEl && (ocEl.innerHTML = _dorsalesOcupados(propiojid));
        return false;
      }

      msgEl.innerHTML = `<span class="dorsal-ok">✓ Dorsal #${num} disponible</span>`;
      ocEl && (ocEl.innerHTML = _dorsalesOcupados(propiojid));
      return true;
    }

    function _dorsalesOcupados(propioId = '') {
      const ocupados = jugadores
        .filter(j => j.id !== propioId && j.dorsal)
        .sort((a, b) => parseInt(a.dorsal) - parseInt(b.dorsal))
        .map(j => `<span title="${j.nombre}" style="
      display:inline-block;background:var(--muted);border-radius:4px;
      padding:1px 5px;margin:1px;font-size:.65rem;font-family:'Bebas Neue',sans-serif;
      color:var(--apagado)">#${j.dorsal}</span>`).join('');
      return ocupados
        ? `<div style="margin-top:4px">Dorsales ocupados: ${ocupados}</div>`
        : '';
    }


    // ── MODO CLARO / OSCURO ────────────────────────────────────────────────────────
    function toggleModo() {
      const claro = document.body.classList.toggle('modo-claro');
      const btn = document.getElementById('modo-btn');
      if (btn) btn.textContent = claro ? '☀️' : '🌙';
      try { localStorage.setItem('efm_modo', claro ? 'claro' : 'oscuro'); } catch (e) { }
    }

    function initModo() {
      try {
        const saved = localStorage.getItem('efm_modo');
        if (saved === 'claro') {
          document.body.classList.add('modo-claro');
          const btn = document.getElementById('modo-btn');
          if (btn) btn.textContent = '☀️';
        }
      } catch (e) { }
    }


    // ══ RADAR SPIDER ═════════════════════════════════════════════════════════════
    function drawRadar(j) {
      const canvas = document.getElementById('radar-canvas');
      const legend = document.getElementById('radar-legend');
      if (!canvas) return;

      const ejes = [
        { label: 'Ataque', color: '#f87171', keys: ['actitud_ofensiva', 'finalizacion', 'pase_ras', 'efecto', 'ejecucion_balon'] },
        { label: 'Pase', color: '#60a5fa', keys: ['pase_ras', 'pase_bombeado', 'posesion_balon', 'control_balon'] },
        { label: 'Drible', color: '#a78bfa', keys: ['drible', 'control_balon', 'efecto', 'equilibrio'] },
        { label: 'Defensa', color: '#34d399', keys: ['actitud_defensiva', 'entrada', 'agresividad', 'dedicacion_defensiva'] },
        { label: 'Físico', color: '#fbbf24', keys: ['velocidad', 'aceleracion', 'potencia_tiro', 'salto', 'contacto_fisico', 'resistencia'] },
        { label: 'Portero', color: '#f472b6', keys: ['actitud_portero', 'atajar_pt', 'parada_pt', 'reflejos_pt', 'cobertura_pt'] },
      ];

      const vals = ejes.map(e => {
        const avg = e.keys.reduce((s, k) => s + (parseInt(j[k]) || 0), 0) / e.keys.length;
        return Math.min(100, Math.max(0, avg));
      });

      const W = 280, H = 280, cx = 140, cy = 140, R = 105, N = ejes.length;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      const pt = (r, i) => [cx + r * Math.sin(2 * Math.PI * i / N - Math.PI / 2), cy - r * Math.cos(2 * Math.PI * i / N - Math.PI / 2)];

      // Grid circles
      [20, 40, 60, 80, 100].forEach(pct => {
        const r = R * pct / 100;
        ctx.beginPath();
        for (let i = 0; i < N; i++) { const [x, y] = pt(r, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.font = '8px Inter'; ctx.textAlign = 'center';
        ctx.fillText(pct, (cx + 0 + (R * pct / 100) * .15).toFixed(), cy - R * pct / 100 - 2);
      });

      // Axes
      for (let i = 0; i < N; i++) {
        const [x, y] = pt(R, i);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1; ctx.stroke();
        // Axis label
        const [lx, ly] = pt(R + 20, i);
        ctx.fillStyle = ejes[i].color; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; ctx.fillText(ejes[i].label, lx, ly);
      }

      // Data shape
      ctx.beginPath();
      vals.forEach((v, i) => {
        const [x, y] = pt(R * v / 100, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(240,180,41,.2)'; ctx.fill();
      ctx.strokeStyle = 'rgba(240,180,41,.85)'; ctx.lineWidth = 2.5; ctx.stroke();

      // Dots
      vals.forEach((v, i) => {
        const [x, y] = pt(R * v / 100, i);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ejes[i].color; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
        // Value label
        const [dx, dy] = pt(R * v / 100 + 14, i);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; ctx.fillText(Math.round(v), dx, dy);
      });

      // Legend
      if (legend) legend.innerHTML = ejes.map((e, i) =>
        `<div class="radar-legend-item">
      <div class="radar-legend-dot" style="background:${e.color}"></div>
      <span>${e.label}: <b>${Math.round(vals[i])}</b></span>
    </div>`).join('');
    }


    // ══ COMPARADOR DE JUGADORES ═══════════════════════════════════════════════════
    function renderComparadorJugadores() {
      const el = document.getElementById('jcomp-inner');
      if (!el) return;

      const opts = jugadores.map(j =>
        `<option value="${j.id}">${j.nombre} (${j.posicion || '?'}) OVR ${j.overall || '—'}</option>`).join('');

      el.innerHTML = `
    <div class="jcomp-sel">
      <div class="jcomp-box ${comparJ1 ? 'sel-1' : ''}">
        ${comparJ1 ? _miniJug(comparJ1, '#60a5fa', 1) : `
          <span style="font-size:1.8rem">👤</span>
          <div><div style="font-weight:700;font-size:.9rem">Jugador 1</div>
          <select style="margin-top:5px;padding:6px 10px;border-radius:6px;background:var(--oscuro);
            border:1px solid var(--borde);color:var(--texto);font-size:.82rem;color-scheme:dark light"
            onchange="selJComp(1,this.value)">
            <option value="">— Seleccionar —</option>${opts}
          </select></div>`}
      </div>
      <div class="jcomp-vs">VS</div>
      <div class="jcomp-box ${comparJ2 ? 'sel-2' : ''}">
        ${comparJ2 ? _miniJug(comparJ2, '#f472b6', 2) : `
          <span style="font-size:1.8rem">👤</span>
          <div><div style="font-weight:700;font-size:.9rem">Jugador 2</div>
          <select style="margin-top:5px;padding:6px 10px;border-radius:6px;background:var(--oscuro);
            border:1px solid var(--borde);color:var(--texto);font-size:.82rem;color-scheme:dark light"
            onchange="selJComp(2,this.value)">
            <option value="">— Seleccionar —</option>${opts}
          </select></div>`}
      </div>
    </div>
    ${comparJ1 && comparJ2 ? _buildJComp() : '<div class="comp-placeholder"><div class="icon">👥</div><p>Selecciona dos jugadores para comparar</p></div>'}`;
    }

    function selJComp(slot, id) {
      if (slot === 1) comparJ1 = id ? jugadores.find(j => j.id === id) || null : null;
      else comparJ2 = id ? jugadores.find(j => j.id === id) || null : null;
      renderComparadorJugadores();
      if (comparJ1 && comparJ2) {
        setTimeout(() => { drawRadar2(comparJ1, '#60a5fa', 'radar-j1'); drawRadar2(comparJ2, '#f472b6', 'radar-j2'); }, 50);
      }
    }

    function _miniJug(j, color, slot) {
      return `
    ${j.imagen ? `<img src="${j.imagen}" style="width:46px;height:46px;border-radius:50%;
      object-fit:cover;object-position:top;border:2px solid ${color};flex-shrink:0">`
          : `<div style="width:46px;height:46px;border-radius:50%;background:var(--muted);
        display:flex;align-items:center;justify-content:center;font-size:1.4rem">🧑</div>`}
    <div style="flex:1">
      <div style="font-weight:700;font-size:.9rem;color:${color}">${j.nombre}</div>
      <div style="font-size:.75rem;color:var(--apagado)">${j.posicion || ''} · OVR ${j.overall || '—'}</div>
    </div>
    <button onclick="selJComp(${slot},'')"
      style="background:none;border:none;color:var(--apagado);cursor:pointer;font-size:1rem;padding:4px">✕</button>`;
    }

    function _buildJComp() {
      const j1 = comparJ1, j2 = comparJ2;
      const wins = { j1: 0, j2: 0, empate: 0 };

      const statRow = (k, nom) => {
        const v1 = parseInt(j1[k]) || 0, v2 = parseInt(j2[k]) || 0;
        if (!v1 && !v2) return '';
        const max = Math.max(v1, v2, 1);
        const w1 = v1 / max * 100, w2 = v2 / max * 100;
        const win = v1 > v2 ? 1 : (v2 > v1 ? 2 : 0);
        if (win === 1) wins.j1++; else if (win === 2) wins.j2++; else wins.empate++;
        return `<div class="jcomp-stat-row">
      <span class="jcomp-val" style="color:${v1 >= v2 ? 'var(--texto)' : 'var(--apagado)'}">${v1 || '—'}</span>
      <div class="jcomp-bar-l"><div class="jcomp-b" style="width:${w1}%;background:#60a5fa;opacity:${win === 1 ? .9 : .4}"></div></div>
      <span class="jcomp-stat-nom">${nom}</span>
      <div class="jcomp-bar-r"><div class="jcomp-b" style="width:${w2}%;background:#f472b6;opacity:${win === 2 ? .9 : .4}"></div></div>
      <span class="jcomp-val" style="color:${v2 >= v1 ? 'var(--texto)' : 'var(--apagado)'}">${v2 || '—'}</span>
    </div>`;
      };

      const seccCol = (arr, titulo) => `
    <div class="jcomp-seccion">${titulo}</div>
    ${arr.map(([k, n]) => statRow(k, n)).join('')}`;

      // Best coach per player
      const bestCoach = (j) => {
        const enCarp = carpetas.filter(c => c.jugador_id === j.id);
        if (!enCarp.length) return '<span style="color:var(--apagado);font-size:.8rem">Sin técnico asignado</span>';
        const sorted = enCarp.map(c => ({ c, t: tecnicos.find(t => t.id === c.tecnico_id) }))
          .filter(x => x.t).sort((a, b) => (parseInt(b.c.overall) || 0) - (parseInt(a.c.overall) || 0));
        if (!sorted.length) return '<span style="color:var(--apagado)">—</span>';
        const best = sorted[0];
        return `<div style="display:flex;align-items:center;gap:6px;background:var(--oscuro);
      border:1px solid var(--borde);border-radius:8px;padding:7px 10px;margin-top:4px">
      ${best.t.imagen ? `<img src="${best.t.imagen}" style="width:28px;height:28px;border-radius:6px;object-fit:cover">` :
            '<span>🧑‍💼</span>'}
      <span style="font-weight:700;font-size:.82rem">${best.t.nombre}</span>
      <span class="badge badge-oro" style="margin-left:auto">OVR ${best.c.overall || j.overall || '—'}</span>
    </div>
    ${sorted.slice(1).map(x => `<div style="display:flex;align-items:center;gap:6px;padding:4px 10px;
      font-size:.78rem;color:var(--apagado)">
      ${x.t.imagen ? `<img src="${x.t.imagen}" style="width:20px;height:20px;border-radius:4px;object-fit:cover">` :
                '<span>🧑‍💼</span>'}
      <span>${x.t.nombre}</span>
      <span style="margin-left:auto;font-weight:700">OVR ${x.c.overall || j.overall || '—'}</span>
    </div>`).join('')}`;
      };

      // Build stats first to count wins
      const statsHtml =
        seccCol(SA, '⚔️ Ataque') +
        seccCol(SD, '🛡️ Defensa') +
        seccCol(SF, '⚡ Fuerza');

      return `
    <!-- Encabezado ganador -->
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;
      align-items:center;margin-bottom:16px">
      <div style="background:linear-gradient(135deg,#0e1a30,var(--card));
        border:1px solid #60a5fa33;border-radius:12px;padding:12px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:#60a5fa">${j1.nombre}</div>
        <div style="font-size:.78rem;color:var(--apagado)">${j1.posicion || ''} · ${j1.edicion || ''}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--oro);margin-top:4px">${j1.overall || '—'}</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--oro)">VS</div>
      </div>
      <div style="background:linear-gradient(135deg,#1a0e20,var(--card));
        border:1px solid #f472b633;border-radius:12px;padding:12px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:#f472b6">${j2.nombre}</div>
        <div style="font-size:.78rem;color:var(--apagado)">${j2.posicion || ''} · ${j2.edicion || ''}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--oro);margin-top:4px">${j2.overall || '—'}</div>
      </div>
    </div>

    <!-- Radar side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:var(--card);border:1px solid #60a5fa33;border-radius:12px;padding:10px;text-align:center">
        <div style="font-size:.7rem;font-weight:700;color:#60a5fa;text-transform:uppercase;margin-bottom:6px">Radar ${j1.nombre.split(' ')[0]}</div>
        <canvas id="radar-j1" width="200" height="200" style="max-width:100%"></canvas>
      </div>
      <div style="background:var(--card);border:1px solid #f472b633;border-radius:12px;padding:10px;text-align:center">
        <div style="font-size:.7rem;font-weight:700;color:#f472b6;text-transform:uppercase;margin-bottom:6px">Radar ${j2.nombre.split(' ')[0]}</div>
        <canvas id="radar-j2" width="200" height="200" style="max-width:100%"></canvas>
      </div>
    </div>

    <!-- Stats comparación -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--card);border:1px solid var(--borde);border-radius:12px;padding:12px">
        ${statsHtml}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <!-- Marcador -->
        <div style="background:var(--card);border:1px solid var(--borde);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;color:var(--apagado);margin-bottom:10px">Estadísticas ganadas</div>
          <div style="display:flex;justify-content:space-around;align-items:center">
            <div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:#60a5fa">${wins.j1}</div>
              <div style="font-size:.7rem;color:#60a5fa;font-weight:700">${j1.nombre.split(' ')[0]}</div>
            </div>
            <div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:var(--apagado)">${wins.empate}</div>
              <div style="font-size:.68rem;color:var(--apagado)">Empates</div>
            </div>
            <div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:#f472b6">${wins.j2}</div>
              <div style="font-size:.7rem;color:#f472b6;font-weight:700">${j2.nombre.split(' ')[0]}</div>
            </div>
          </div>
          <div style="margin-top:10px;padding:8px 12px;border-radius:8px;
            background:${wins.j1 > wins.j2 ? 'rgba(96,165,250,.12)' : wins.j2 > wins.j1 ? 'rgba(244,114,182,.12)' : 'var(--oscuro)'};
            border:1px solid ${wins.j1 > wins.j2 ? '#60a5fa44' : wins.j2 > wins.j1 ? '#f472b644' : 'var(--borde)'}">
            <div style="font-size:.75rem;font-weight:700;
              color:${wins.j1 > wins.j2 ? '#60a5fa' : wins.j2 > wins.j1 ? '#f472b6' : 'var(--apagado)'}">
              ${wins.j1 > wins.j2 ? '🏆 ' + j1.nombre + ' es mejor en más stats' : wins.j2 > wins.j1 ? '🏆 ' + j2.nombre + ' es mejor en más stats' : '🤝 Jugadores muy igualados'}
            </div>
          </div>
        </div>
        <!-- Mejor técnico J1 -->
        <div style="background:var(--card);border:1px solid #60a5fa33;border-radius:12px;padding:12px">
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;color:#60a5fa;margin-bottom:6px">
            🧑‍💼 ${j1.nombre.split(' ')[0]} rinde mejor con
          </div>
          ${bestCoach(j1)}
        </div>
        <!-- Mejor técnico J2 -->
        <div style="background:var(--card);border:1px solid #f472b633;border-radius:12px;padding:12px">
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;color:#f472b6;margin-bottom:6px">
            🧑‍💼 ${j2.nombre.split(' ')[0]} rinde mejor con
          </div>
          ${bestCoach(j2)}
        </div>
      </div>
    </div>`;
    }

    // Mini radar en comparador (color único)
    function drawRadar2(j, color, canvasId) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ejes = [
        { label: 'ATQ', keys: ['actitud_ofensiva', 'finalizacion', 'pase_ras', 'efecto', 'ejecucion_balon'] },
        { label: 'PAS', keys: ['pase_ras', 'pase_bombeado', 'posesion_balon', 'control_balon'] },
        { label: 'DRI', keys: ['drible', 'control_balon', 'efecto', 'equilibrio'] },
        { label: 'DEF', keys: ['actitud_defensiva', 'entrada', 'agresividad', 'dedicacion_defensiva'] },
        { label: 'FIS', keys: ['velocidad', 'aceleracion', 'potencia_tiro', 'salto', 'contacto_fisico', 'resistencia'] },
        { label: 'PT', keys: ['actitud_portero', 'atajar_pt', 'parada_pt', 'reflejos_pt', 'cobertura_pt'] },
      ];
      const vals = ejes.map(e => Math.min(100, e.keys.reduce((s, k) => s + (parseInt(j[k]) || 0), 0) / e.keys.length));
      const W = 200, H = 200, cx = 100, cy = 100, R = 72, N = 6;
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, W, H);
      const pt = (r, i) => [cx + r * Math.sin(2 * Math.PI * i / N - Math.PI / 2), cy - r * Math.cos(2 * Math.PI * i / N - Math.PI / 2)];
      [25, 50, 75, 100].forEach(p => {
        const r = R * p / 100; ctx.beginPath();
        for (let i = 0; i < N; i++) { const [x, y] = pt(r, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath(); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke();
      });
      for (let i = 0; i < N; i++) {
        const [x, y] = pt(R, i); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
        const [lx, ly] = pt(R + 14, i);
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ejes[i].label, lx, ly);
      }
      ctx.beginPath();
      vals.forEach((v, i) => { const [x, y] = pt(R * v / 100, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      const hex = color.replace('#', '');
      ctx.fillStyle = `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},.25)`;
      ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      vals.forEach((v, i) => {
        const [x, y] = pt(R * v / 100, i); ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      });
    }


    // ── PROGRESIÓN GUARDADO E HISTORIAL ──────────────────────────────────────────
    const PROG_KEYS = [
      ['prog_tiros', '🎯 Tiros'], ['prog_pases', '🔵 Pases'], ['prog_dribles', '⚡ Dribles'],
      ['prog_destreza', '🌟 Destreza'], ['prog_tren', '💪 Tren inferior'], ['prog_f_aerea', '🦅 Fuerza aérea'],
      ['prog_defensa', '🛡️ Defensa'], ['prog_pt1', '🧤 PT1'], ['prog_pt2', '🧤 PT2'], ['prog_pt3', '🧤 PT3'],
    ];

    function generarFichaTxt(j, opts = {}) {
      const { base = null, incluirTecnicos = true } = opts;
      const lin = '─'.repeat(54);
      const col = (txt, w) => (txt + '').padEnd(w);
      const rpad = (txt, w) => (txt + '').padStart(w);
      const pot = potDisplay(j);
      let txt = '';
      txt += `  JUGADOR   : ${j.nombre || '—'}\n`;
      txt += `  POSICIÓN  : ${j.posicion || '—'}\n`;
      if (j.dorsal) txt += `  DORSAL    : #${j.dorsal}\n`;
      if (j.overall) txt += `  OVERALL   : ${j.overall}${j.base ? ' (Base ' + j.base + ')' : ''}\n`;
      if (j.condicion) txt += `  CONDICIÓN : ${j.condicion}\n`;
      if (j.edicion) txt += `  EDICIÓN   : ${j.edicion}\n`;
      if (j.equipo) txt += `  EQUIPO    : ${j.equipo}\n`;
      if (pot) txt += `  POTENC.   : ${pot}\n`;
      txt += '\n' + lin + '\n  ⚔️  ATAQUE\n' + lin + '\n';
      SA.forEach(([k, n]) => {
        const v = j[k]; if (!v) return;
        const vb = base ? base[k] : null;
        const mod = base && vb && v != vb ? ` (${parseInt(v) - parseInt(vb) > 0 ? '+' : ''}${parseInt(v) - parseInt(vb)})` : '';
        txt += `  ${col(n, 28)}: ${rpad(v, 4)}${mod}\n`;
      });
      txt += '\n' + lin + '\n  🛡️  DEFENSA\n' + lin + '\n';
      SD.forEach(([k, n]) => {
        const v = j[k]; if (!v) return;
        const vb = base ? base[k] : null;
        const mod = base && vb && v != vb ? ` (${parseInt(v) - parseInt(vb) > 0 ? '+' : ''}${parseInt(v) - parseInt(vb)})` : '';
        txt += `  ${col(n, 28)}: ${rpad(v, 4)}${mod}\n`;
      });
      txt += '\n' + lin + '\n  ⚡  FUERZA\n' + lin + '\n';
      SF.forEach(([k, n]) => {
        const v = j[k]; if (!v) return;
        const vb = base ? base[k] : null;
        const mod = base && vb && v != vb ? ` (${parseInt(v) - parseInt(vb) > 0 ? '+' : ''}${parseInt(v) - parseInt(vb)})` : '';
        txt += `  ${col(n, 28)}: ${rpad(v, 4)}${mod}\n`;
      });
      const pItems = PROG_KEYS.filter(([k]) => j[k]);
      if (pItems.length) {
        txt += '\n' + lin + '\n  📈  PROGRESIÓN\n' + lin + '\n';
        pItems.forEach(([k, n]) => { txt += `  ${col(n, 28)}: ${rpad(j[k], 6)}\n`; });
      }
      if (incluirTecnicos) {
        const jid = j.id || j.jugador_id;
        const enCarp = carpetas.filter(c => c.jugador_id === jid)
          .map(c => ({ c, t: tecnicos.find(t => t.id === c.tecnico_id) }))
          .filter(x => x.t)
          .sort((a, b) => (parseInt(b.c.overall) || 0) - (parseInt(a.c.overall) || 0));
        if (enCarp.length) {
          txt += '\n' + lin + '\n  🧑‍💼  RENDIMIENTO POR TÉCNICO\n' + lin + '\n';
          enCarp.forEach(({ c, t }, i) => {
            const star = i === 0 ? '⭐ ' : `${i + 1}º `;
            txt += `  ${star}${t.nombre}`;
            if (t.formacion) txt += `  [${t.formacion}]`;
            txt += `  →  OVR ${c.overall || j.overall || '—'}\n`;
            if (t.edicion) txt += `     ${t.edicion}\n`;
          });
        }
      }
      return txt;
    }

    async function descargarFichaPDF(jid) {
      const j = jugadores.find(x => x.id === jid); if (!j) return;
      const sep = '═'.repeat(54);
      let txt = sep + '\n  ⚽ eFootball Manager — Ficha del Jugador\n' + sep + '\n\n';
      txt += generarFichaTxt(j);
      txt += '\n' + sep + '\n';
      txt += `  eFootball Manager · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
      txt += sep + '\n';
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ficha_${(j.nombre || 'jugador').replace(/\s+/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function renderProgGrid(data, prev) {
      const items = PROG_KEYS.filter(([k]) => data[k] !== undefined && data[k] !== '' && data[k] !== null);
      if (!items.length) return '';
      return `<div class="prog-hist-grid">
    ${items.map(([k, n]) => {
        const v = data[k];
        const vp = prev ? (prev[k] || 0) : 0;
        const dif = prev && (prev[k] !== undefined && prev[k] !== '') ? v - vp : 0;
        return `<div class="prog-hist-item">
        <span class="prog-hist-nom">${n}</span>
        <div class="prog-hist-row">
          <span class="prog-hist-val">${v}</span>
          ${dif ? `<span class="prog-hist-dif" style="color:${dif > 0 ? 'var(--verde)' : 'var(--rojo)'}">${dif > 0 ? '+' : ''}${dif}</span>` : ''}
        </div>
      </div>`;
      }).join('')}
  </div>`;
    }

    function renderProgHistorial(hist, j) {
      const tieneActual = PROG_KEYS.some(([k]) => j[k]);
      if (!tieneActual && !hist.length) return `<p style="color:var(--apagado);font-size:.82rem;
    font-style:italic;padding:6px 0">Edita el jugador y guarda progresión para verla aquí.</p>`;

      let html = '<div class="prog-hist-section">';
      if (tieneActual) {
        html += `<div class="prog-hist-entry" style="border-color:#10b98144">
      <div class="prog-hist-fecha">📈 Actual <span class="badge badge-verde" style="font-size:.6rem">En curso</span></div>
      ${renderProgGrid(j, null)}
    </div>`;
      }
      if (hist.length) {
        html += `<details class="prog-hist-details">
      <summary>📂 Progresión anterior (${hist.length} registro${hist.length !== 1 ? 's' : ''})</summary>
      <div class="prog-hist-pasado">
        ${hist.map((entry, i) => {
          const prev = hist[i + 1];
          const ts = entry._ts ? new Date(entry._ts.replace('T', ' ')) : null;
          const fecha = ts ? ts.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
          const hora = ts ? ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
          const grid = renderProgGrid(entry, prev);
          if (!grid) return '';
          return `<div class="prog-hist-entry">
            <div class="prog-hist-fecha">📅 ${fecha} · ${hora}</div>
            ${grid}
          </div>`;
        }).join('')}
      </div>
    </details>`;
      }
      html += '</div>';
      return html;
    }

    // ── Inicialización ────────────────────────────────────────────────────────────
    document.querySelectorAll('.overlay').forEach(o =>
      o.addEventListener('click', e => { if (e.target === o) o.classList.add('oculto'); }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape')
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('oculto'));
    });
    document.getElementById('buscar').addEventListener('input', renderizar);
    document.getElementById('filtro-pos').addEventListener('input', renderizar);


    // ══════════════════════════════════════════════════════════════════════════
    // ██  CAPA OFFLINE — IndexedDB replica la API del servidor  ████████████████
    // ══════════════════════════════════════════════════════════════════════════
    const EFM_DB_NAME = 'efootball-manager';
    const EFM_DB_VER = 1;
    let _db = null;

    function abrirDB() {
      if (_db) return Promise.resolve(_db);
      return new Promise((res, rej) => {
        const req = indexedDB.open(EFM_DB_NAME, EFM_DB_VER);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          ['jugadores', 'tecnicos', 'carpetas', 'plantillas', 'historial', 'prog_historial']
            .forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); });
        };
        req.onsuccess = e => { _db = e.target.result; res(_db); };
        req.onerror = e => rej(e.target.error);
      });
    }

    async function idbGet(store, key) {
      const db = await abrirDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(store, 'readonly');
        const req = key !== undefined ? tx.objectStore(store).get(key) : tx.objectStore(store).getAll();
        req.onsuccess = () => res(req.result ?? (key !== undefined ? null : []));
        req.onerror = e => rej(e.target.error);
      });
    }

    async function idbSet(store, key, val) {
      const db = await abrirDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(val, key);
        tx.oncomplete = () => res(val);
        tx.onerror = e => rej(e.target.error);
      });
    }

    async function idbDel(store, key) {
      const db = await abrirDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = res;
        tx.onerror = e => rej(e.target.error);
      });
    }

    // ── Detectar si el servidor Python está disponible ─────────────────────
    let _modoOffline = false;

    async function detectarModo() {
      try {
        const r = await fetch('/api/jugadores', { signal: AbortSignal.timeout(1500) });
        _modoOffline = !r.ok;
      } catch {
        _modoOffline = true;
      }
      actualizarIndicadorOffline();
    }

    function actualizarIndicadorOffline() {
      let ind = document.getElementById('offline-indicator');
      if (!ind) {
        ind = document.createElement('div');
        ind.id = 'offline-indicator';
        ind.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:9999;padding:6px 14px;border-radius:20px;font-size:.72rem;font-weight:700;font-family:Inter,sans-serif;display:flex;align-items:center;gap:6px;transition:all .3s;cursor:pointer;';
        ind.title = 'Click para sincronizar';
        ind.onclick = sincronizarConServidor;
        document.body.appendChild(ind);
      }
      if (_modoOffline) {
        ind.style.background = 'rgba(239,68,68,.15)';
        ind.style.border = '1px solid rgba(239,68,68,.4)';
        ind.style.color = '#ef4444';
        ind.innerHTML = '📴 Modo offline — datos locales';
      } else {
        ind.style.background = 'rgba(16,185,129,.15)';
        ind.style.border = '1px solid rgba(16,185,129,.4)';
        ind.style.color = '#10b981';
        ind.innerHTML = '🟢 Conectado al servidor';
        setTimeout(() => { ind.style.opacity = '0'; setTimeout(() => ind.style.opacity = '1', 3000); }, 2500);
      }
    }

    // ── API abstracta: usa servidor si está disponible, si no IndexedDB ────
    const API = {
      async getAll(tipo) {
        if (!_modoOffline) {
          try {
            const r = await fetch(`/api/${tipo}`);
            if (r.ok) {
              const data = await r.json();
              await idbSet('__cache__' in indexedDB ? '__cache__' : tipo, tipo, data);
              await idbSet(tipo, '__all__', data);
              return data;
            }
          } catch { }
          _modoOffline = true; actualizarIndicadorOffline();
        }
        return (await idbGet(tipo, '__all__')) || [];
      },

      async save(tipo, data, imagen = null) {
        if (!_modoOffline) {
          try {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
            if (imagen) fd.append('imagen', imagen);
            const url = data.id ? `/api/${tipo}/${data.id}` : `/api/${tipo}`;
            const method = data.id ? 'PUT' : 'POST';
            const r = await fetch(url, { method, body: fd });
            if (r.ok) return await r.json();
          } catch { }
          _modoOffline = true; actualizarIndicadorOffline();
        }
        // Offline: save to IndexedDB
        const list = (await idbGet(tipo, '__all__')) || [];
        if (!data.id) data.id = Math.random().toString(36).slice(2, 10);
        // Handle image as base64
        if (imagen) {
          data.imagen = await new Promise(res => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.readAsDataURL(imagen);
          });
        }
        data._ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const idx = list.findIndex(x => x.id === data.id);
        if (idx >= 0) list[idx] = data; else list.push(data);
        await idbSet(tipo, '__all__', list);
        // Historial snapshot for jugadores
        if (tipo === 'jugadores') {
          const hist = (await idbGet('historial', data.id)) || [];
          const snap = { ...data, _ts: data._ts };
          hist.unshift(snap);
          await idbSet('historial', data.id, hist.slice(0, 30));
        }
        return data;
      },

      async delete(tipo, id) {
        if (!_modoOffline) {
          try {
            const r = await fetch(`/api/${tipo}/${id}`, { method: 'DELETE' });
            if (r.ok) return true;
          } catch { }
          _modoOffline = true; actualizarIndicadorOffline();
        }
        const list = ((await idbGet(tipo, '__all__')) || []).filter(x => x.id !== id);
        await idbSet(tipo, '__all__', list);
        return true;
      },

      async getHistorial(jid) {
        if (!_modoOffline) {
          try {
            const r = await fetch(`/api/historial/${jid}`);
            if (r.ok) return await r.json();
          } catch { }
        }
        return (await idbGet('historial', jid)) || [];
      },

      async getProgHistorial(jid) {
        if (!_modoOffline) {
          try {
            const r = await fetch(`/api/prog_historial/${jid}`);
            if (r.ok) return await r.json();
          } catch { }
        }
        return (await idbGet('prog_historial', jid)) || [];
      },

      async saveProgHistorial(jid, snap) {
        if (!_modoOffline) {
          try {
            const r = await fetch(`/api/prog_historial/${jid}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snap)
            });
            if (r.ok) return await r.json();
          } catch { }
        }
        const hist = (await idbGet('prog_historial', jid)) || [];
        snap._ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
        hist.unshift(snap);
        await idbSet('prog_historial', jid, hist.slice(0, 30));
        return snap;
      },

      async getPlantilla(tid) {
        if (!_modoOffline) {
          try {
            const r = await fetch(`/api/plantillas/${tid}`);
            if (r.ok) return await r.json();
          } catch { }
        }
        return (await idbGet('plantillas', tid)) || { posiciones: [], dibujos: [] };
      },

      async savePlantilla(tid, data) {
        if (!_modoOffline) {
          try {
            const r = await fetch(`/api/plantillas/${tid}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            if (r.ok) return await r.json();
          } catch { }
        }
        await idbSet('plantillas', tid, data);
        return data;
      }
    };

    // ── Exportar/Importar para sincronizar ────────────────────────────────────
    async function exportarDatos() {
      const data = {
        version: 1,
        fecha: new Date().toISOString(),
        jugadores: (await idbGet('jugadores', '__all__')) || jugadores,
        tecnicos: (await idbGet('tecnicos', '__all__')) || tecnicos,
        carpetas: (await idbGet('carpetas', '__all__')) || carpetas,
        plantillas: {},
        historial: {},
        prog_historial: {}
      };
      // Plantillas
      const pids = [...new Set(((await idbGet('tecnicos', '__all__')) || tecnicos).map(t => t.id))];
      for (const tid of pids) {
        const p = await idbGet('plantillas', tid);
        if (p) data.plantillas[tid] = p;
      }
      // Historiales
      const jids = [...new Set(((await idbGet('jugadores', '__all__')) || jugadores).map(j => j.id))];
      for (const jid of jids) {
        const h = await idbGet('historial', jid);
        const ph = await idbGet('prog_historial', jid);
        if (h) data.historial[jid] = h;
        if (ph) data.prog_historial[jid] = ph;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `efm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    }

    async function importarDatos(file) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.jugadores) await idbSet('jugadores', '__all__', data.jugadores);
        if (data.tecnicos) await idbSet('tecnicos', '__all__', data.tecnicos);
        if (data.carpetas) await idbSet('carpetas', '__all__', data.carpetas);
        if (data.plantillas) for (const [k, v] of Object.entries(data.plantillas)) await idbSet('plantillas', k, v);
        if (data.historial) for (const [k, v] of Object.entries(data.historial)) await idbSet('historial', k, v);
        if (data.prog_historial) for (const [k, v] of Object.entries(data.prog_historial)) await idbSet('prog_historial', k, v);
        await cargar();
        alert('✅ Datos importados correctamente');
      } catch (e) {
        alert('❌ Error al importar: ' + e.message);
      }
    }

    async function sincronizarConServidor() {
      const old = _modoOffline;
      _modoOffline = false;
      await detectarModo();
      if (!_modoOffline && old) {
        await cargar();
      }
    }

    // ── Service Worker ─────────────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { });
    }

    function ejecutarHerramienta(v) {
      if (v === 'presentacion') iniciarPresentacion();
      else if (v === 'temas') abrirTemas();
      else if (v === 'sync') abrirSincronizacion();
    }

    function toggleMenuMob() {
      const d = document.getElementById('menu-mob-drop');
      if (d) d.classList.toggle('oculto');
    }

    function toggleHerramientas() {
      const d = document.getElementById('menu-herramientas');
      if (d) d.classList.toggle('oculto');
    }

    // Close menus when clicking outside
    document.addEventListener('click', e => {
      const wraps = document.querySelectorAll('.menu-mob-wrap');
      let clickedInside = false;
      wraps.forEach(wrap => {
        if (wrap.contains(e.target)) clickedInside = true;
      });
      if (!clickedInside) {
        const d1 = document.getElementById('menu-mob-drop');
        if (d1) d1.classList.add('oculto');
        const d2 = document.getElementById('menu-herramientas');
        if (d2) d2.classList.add('oculto');
      }
    });

    async function cerrarSesion() {
      if (!confirm('¿Cerrar sesión?')) return;
      try { await fetch('/api/logout', { method: 'POST' }); } catch { }
      window.location.href = '/login';
    }

    // Verificar sesión activa antes de cargar
    (async () => {
      try {
        const r = await fetch('/api/me');
        if (!r.ok) { window.location.replace('/login'); return; }
        const d = await r.json();
        if (!d || d.error) { window.location.replace('/login'); return; }
        const el = document.getElementById('user-nombre');
        if (el && d.nombre) el.textContent = '👤 ' + d.nombre;
      } catch {
        window.location.replace('/login'); return;
      }

      // Detectar boton atras del navegador (bfcache) y verificar sesion
      window.addEventListener('pageshow', e => {
        if (e.persisted) {
          fetch('/api/me', { cache: 'no-store' })
            .then(r => { if (!r.ok) window.location.replace('/login'); })
            .catch(() => window.location.replace('/login'));
        }
      });

      cargar();
      initBranding();
      initModo();
      syncToolbar();
      detectarModo();
    })();
  