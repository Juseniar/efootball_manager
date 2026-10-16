
      // ── ESTADÍSTICAS ─────────────────────────────────────────────────────────────
      function renderEstadisticas() {
        const el = document.getElementById('stats-body');
        if (!jugadores.length) {
          el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--apagado)"><div style="font-size:3rem;margin-bottom:12px">📊</div><div style="font-size:1.1rem;font-weight:600">No hay jugadores todavía</div><div style="font-size:.85rem;margin-top:6px">Agrega jugadores para ver las estadísticas</div></div>';
          return;
        }

        // ── Cálculos base ──
        const ovrs = jugadores.map(j => parseInt(j.overall) || 0).filter(v => v > 0);
        const promOvr = ovrs.length ? (ovrs.reduce((a, b) => a + b, 0) / ovrs.length).toFixed(1) : '—';
        const maxOvr = ovrs.length ? Math.max(...ovrs) : 0;
        const minOvr = ovrs.length ? Math.min(...ovrs) : 0;

        // Posiciones
        const porPos = {};
        jugadores.forEach(j => {
          const p = j.posicion || 'Sin pos.';
          porPos[p] = (porPos[p] || 0) + 1;
        });
        const posOrdenadas = Object.entries(porPos).sort((a, b) => b[1] - a[1]);
        const maxPos = posOrdenadas[0]?.[1] || 1;

        // OVR distribución (rangos de 5)
        const rangos = {};
        for (let i = 70; i <= 100; i += 5) rangos[i] = 0;
        ovrs.forEach(v => {
          const r = Math.floor(v / 5) * 5;
          const key = Math.max(70, Math.min(100, r));
          rangos[key] = (rangos[key] || 0) + 1;
        });
        const maxRango = Math.max(...Object.values(rangos), 1);

        // Condición
        const condMap = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        jugadores.forEach(j => { const c = (j.condicion || 'B').toUpperCase(); if (condMap[c] !== undefined) condMap[c]++; });
        const condColores = { A: '#10b981', B: '#3b82f6', C: '#f0b429', D: '#f97316', E: '#ef4444' };

        // Equipos top 5
        const porEquipo = {};
        jugadores.forEach(j => { const e = j.equipo || 'Sin equipo'; porEquipo[e] = (porEquipo[e] || 0) + 1; });
        const equiposTop = Object.entries(porEquipo).sort((a, b) => b[1] - a[1]).slice(0, 7);
        const maxEq = equiposTop[0]?.[1] || 1;

        // Ediciones
        const porEdicion = {};
        jugadores.forEach(j => { const e = j.edicion || 'Sin edición'; porEdicion[e] = (porEdicion[e] || 0) + 1; });
        const edicionesTop = Object.entries(porEdicion).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const maxEd = edicionesTop[0]?.[1] || 1;

        // Técnicos con más jugadores
        const jugPorTec = {};
        tecnicos.forEach(t => {
          const n = carpetas.filter(c => c.tecnico_id === t.id).length;
          if (n > 0) jugPorTec[t.nombre || t.id] = n;
        });
        const tecTop = Object.entries(jugPorTec).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxTec = tecTop[0]?.[1] || 1;

        el.innerHTML = `
      <!-- KPIs superiores -->
      <div class="stats-kpis">
        <div class="stats-kpi">
          <div class="stats-kpi-val">${jugadores.length}</div>
          <div class="stats-kpi-lbl">Jugadores</div>
        </div>
        <div class="stats-kpi">
          <div class="stats-kpi-val">${promOvr}</div>
          <div class="stats-kpi-lbl">OVR Promedio</div>
        </div>
        <div class="stats-kpi">
          <div class="stats-kpi-val">${maxOvr}</div>
          <div class="stats-kpi-lbl">OVR Máximo</div>
        </div>
        <div class="stats-kpi">
          <div class="stats-kpi-val">${tecnicos.length}</div>
          <div class="stats-kpi-lbl">Técnicos</div>
        </div>
      </div>

      <div class="stats-grid">

        <!-- Distribución OVR -->
        <div class="stats-panel">
          <div class="stats-panel-titulo">📈 Distribución de OVR</div>
          <div class="stats-panel-sub">Cantidad de jugadores por rango de OVR</div>
          <div class="ovr-dist">
            ${Object.entries(rangos).map(([r, n]) => {
          const pct = Math.round((n / maxRango) * 100);
          return `<div class="ovr-col">
                <div style="font-size:.6rem;color:var(--apagado);margin-bottom:2px">${n || ''}</div>
                <div class="ovr-bar" style="height:${Math.max(pct, n ? 2 : 0)}px;opacity:${n ? 1 : .2}"></div>
                <div class="ovr-lbl">${r}+</div>
              </div>`;
        }).join('')}
          </div>
        </div>

        <!-- Jugadores por posición -->
        <div class="stats-panel">
          <div class="stats-panel-titulo">⚽ Jugadores por Posición</div>
          <div class="stats-panel-sub">Distribución de tu plantilla</div>
          ${posOrdenadas.slice(0, 10).map(([pos, n]) => `
            <div class="bar-row">
              <div class="bar-label">${pos}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.round(n / maxPos * 100)}%"></div>
              </div>
              <div class="bar-val">${n}</div>
            </div>`).join('')}
        </div>

        <!-- Estado de condición -->
        <div class="stats-panel">
          <div class="stats-panel-titulo">💪 Condición de la Plantilla</div>
          <div class="stats-panel-sub">Estado físico actual de tus jugadores</div>
          <div class="cond-grid">
            ${Object.entries(condMap).map(([c, n]) => `
              <div class="cond-item">
                <div class="cond-letra" style="color:${condColores[c]}">${c}</div>
                <div class="cond-n">${n} jug.</div>
                <div style="font-size:.6rem;color:var(--apagado);margin-top:2px">${jugadores.length ? Math.round(n / jugadores.length * 100) : 0}%</div>
              </div>`).join('')}
          </div>
          <div style="margin-top:16px">
            ${Object.entries(condMap).map(([c, n]) => `
              <div class="bar-row">
                <div class="bar-label" style="color:${condColores[c]}">${c}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${jugadores.length ? Math.round(n / jugadores.length * 100) : 0}%;background:${condColores[c]}"></div>
                </div>
                <div class="bar-val">${n}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Top equipos -->
        <div class="stats-panel">
          <div class="stats-panel-titulo">🏟️ Top Equipos</div>
          <div class="stats-panel-sub">Equipos con más representación</div>
          ${equiposTop.map(([eq, n]) => `
            <div class="bar-row">
              <div class="bar-label" style="width:90px;font-size:.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${eq}">${eq}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.round(n / maxEq * 100)}%;background:linear-gradient(90deg,#3b82f6,#60a5fa)"></div>
              </div>
              <div class="bar-val">${n}</div>
            </div>`).join('')}
        </div>

        <!-- Ediciones -->
        <div class="stats-panel">
          <div class="stats-panel-titulo">🎴 Por Edición de Carta</div>
          <div class="stats-panel-sub">Distribución de ediciones en tu plantilla</div>
          ${edicionesTop.map(([ed, n]) => `
            <div class="bar-row">
              <div class="bar-label" style="width:90px;font-size:.68rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${ed}">${ed}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.round(n / maxEd * 100)}%;background:linear-gradient(90deg,#8b5cf6,#a78bfa)"></div>
              </div>
              <div class="bar-val">${n}</div>
            </div>`).join('')}
        </div>

        <!-- Técnicos con más jugadores -->
        ${tecTop.length ? `<div class="stats-panel">
          <div class="stats-panel-titulo">📋 Técnicos — Jugadores Asignados</div>
          <div class="stats-panel-sub">¿Quién tiene más jugadores en su carpeta?</div>
          ${tecTop.map(([nombre, n]) => `
            <div class="bar-row">
              <div class="bar-label" style="width:90px;font-size:.68rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${nombre}">${nombre}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.round(n / maxTec * 100)}%;background:linear-gradient(90deg,#10b981,#34d399)"></div>
              </div>
              <div class="bar-val">${n}</div>
            </div>`).join('')}
        </div>` : ''}

        <!-- Top 10 jugadores por OVR -->
        <div class="stats-panel" style="grid-column:1/-1">
          <div class="stats-panel-titulo">🏆 Top 10 Jugadores por OVR</div>
          <div class="stats-panel-sub">Los mejores de tu plantilla</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:4px">
            ${[...jugadores].sort((a, b) => (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0)).slice(0, 10).map((j, i) => `
              <div style="display:flex;align-items:center;gap:10px;background:var(--oscuro);border-radius:10px;padding:10px 12px;cursor:pointer" onclick="verJugador('${j.id}',true)">
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--apagado);width:18px;flex-shrink:0">${i + 1}</div>
                ${j.imagen ? `<img src="${j.imagen}" style="width:36px;height:44px;object-fit:cover;object-position:top;border-radius:6px;flex-shrink:0" onerror="this.style.display='none'">` : '<div style="width:36px;height:44px;background:var(--muted);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">🧑</div>'}
                <div style="min-width:0">
                  <div style="font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.nombre || '—'}</div>
                  <div style="font-size:.7rem;color:var(--apagado)">${j.posicion || ''} · ${j.equipo || ''}</div>
                </div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:var(--oro);margin-left:auto;flex-shrink:0">${j.overall || '—'}</div>
              </div>`).join('')}
          </div>
        </div>

      </div>`;
      }
  