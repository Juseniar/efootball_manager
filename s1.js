
      // ── SPOTLIGHT ─────────────────────────────────────────────────────────────────
      let spotlightIdx = -1;
      function abrirSpotlight() {
        document.getElementById('spotlight-overlay').classList.remove('oculto');
        const inp = document.getElementById('spotlight-input');
        inp.value = ''; spotlightIdx = -1; renderSpotlight('');
        setTimeout(() => inp.focus(), 30);
      }
      function cerrarSpotlight() {
        document.getElementById('spotlight-overlay').classList.add('oculto'); spotlightIdx = -1;
      }
      function renderSpotlight(q) {
        const res = document.getElementById('spotlight-results');
        q = q.toLowerCase().trim();
        if (!q) { res.innerHTML = '<div class="spl-empty">Escribe para buscar jugadores o técnicos...</div>'; return; }
        const jugRes = jugadores.filter(j => (j.nombre || '').toLowerCase().includes(q) || (j.posicion || '').toLowerCase().includes(q) || (j.equipo || '').toLowerCase().includes(q)).slice(0, 6);
        const tecRes = tecnicos.filter(t => (t.nombre || '').toLowerCase().includes(q) || (t.formacion || '').toLowerCase().includes(q)).slice(0, 4);
        if (!jugRes.length && !tecRes.length) { res.innerHTML = `<div class="spl-empty">Sin resultados para "${q}"</div>`; return; }
        let html = '';
        if (jugRes.length) {
          html += '<div class="spl-grupo">Jugadores</div>';
          jugRes.forEach(j => { html += `<div class="spl-item" data-type="jugador" data-id="${j.id}">${j.imagen ? `<img class="spl-img" src="${j.imagen}" onerror="this.style.display='none'">` : '<div class="spl-img spl-img-fb">🧑</div>'}<div class="spl-info"><div class="spl-nombre">${j.nombre || '—'}</div><div class="spl-meta">${j.posicion ? `<span class="spl-pill">${j.posicion}</span>` : ''} ${j.equipo ? `<span class="spl-pill">${j.equipo}</span>` : ''}</div></div><div class="spl-ovr">${j.overall || '—'}</div></div>`; });
        }
        if (tecRes.length) {
          html += '<div class="spl-grupo">Técnicos</div>';
          tecRes.forEach(t => { html += `<div class="spl-item" data-type="tecnico" data-id="${t.id}"><div class="spl-img spl-img-fb">🧑‍💼</div><div class="spl-info"><div class="spl-nombre">${t.nombre || '—'}</div><div class="spl-meta">${t.formacion ? `<span class="spl-pill">${t.formacion}</span>` : ''}</div></div></div>`; });
        }
        res.innerHTML = html;
        res.querySelectorAll('.spl-item').forEach(el => el.addEventListener('click', () => spotlightAbrir(el)));
        spotlightIdx = -1;
      }
      function spotlightAbrir(el) {
        const type = el.dataset.type, id = el.dataset.id;
        cerrarSpotlight();
        if (type === 'jugador') verJugador(id, true);
        else { cambiarTab('tecnicos'); setTimeout(() => abrirCarpeta(id), 150); }
      }
      function spotlightNavegar(e) {
        const items = document.querySelectorAll('#spotlight-results .spl-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); spotlightIdx = Math.min(spotlightIdx + 1, items.length - 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); spotlightIdx = Math.max(spotlightIdx - 1, 0); }
        else if (e.key === 'Enter' && spotlightIdx >= 0) { e.preventDefault(); spotlightAbrir(items[spotlightIdx]); return; }
        items.forEach((el, i) => el.classList.toggle('activo', i === spotlightIdx));
        if (items[spotlightIdx]) items[spotlightIdx].scrollIntoView({ block: 'nearest' });
      }
      document.getElementById('spotlight-input').addEventListener('input', e => { spotlightIdx = -1; renderSpotlight(e.target.value); });
      document.getElementById('spotlight-input').addEventListener('keydown', spotlightNavegar);
      document.addEventListener('keydown', e => {
        const overlay = document.getElementById('spotlight-overlay');
        const abierto = !overlay.classList.contains('oculto');
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); abierto ? cerrarSpotlight() : abrirSpotlight(); }
        else if (e.key === '/' && !abierto && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); abrirSpotlight(); }
        else if (e.key === 'Escape' && abierto) cerrarSpotlight();
      });

      // ── SQUAD BUILDER ─────────────────────────────────────────────────────────────
      const POS_LINEAS = { PT: 0, LI: 1, DC: 1, LD: 1, MCD: 2, MDI: 2, MDD: 2, MC: 3, MO: 3, EXI: 4, EXD: 4, CAI: 4, CAD: 4, SD: 5, CD: 5 };
      async function exportarSquadBuilder(tid) {
        const btn = document.querySelector(`button[onclick="exportarSquadBuilder('${tid}')"]`);
        if (btn) { btn.textContent = '⏳...'; btn.disabled = true; }
        const tec = tecnicos.find(t => t.id === tid) || {};
        let jugadoresSquad = [];
        try {
          const r = await fetch(`/api/plantillas/${tid}`);
          if (r.ok) {
            const d = await r.json();
            const posiciones = Array.isArray(d) ? d : (d.posiciones || []);
            jugadoresSquad = posiciones.map(p => jugadores.find(j => j.id === p.jugador_id)).filter(Boolean);
          }
        } catch (e) { }
        if (!jugadoresSquad.length) jugadoresSquad = [...jugadores];
        const lineas = [[], [], [], [], [], []];
        [...jugadoresSquad].sort((a, b) => (parseInt(b.overall) || 0) - (parseInt(a.overall) || 0)).forEach(j => { const l = POS_LINEAS[j.posicion] ?? 5; lineas[l].push(j); });
        const lineasActivas = lineas.filter(l => l.length > 0);
        const CARD_W = 130, CARD_H = 170, GAP_X = 14, GAP_Y = 20;
        const maxPerLine = Math.max(...lineasActivas.map(l => l.length), 1);
        const COLS = Math.min(maxPerLine, 6);
        const W = COLS * (CARD_W + GAP_X) + GAP_X + 40;
        const HEADER_H = 72;
        const H = lineasActivas.length * (CARD_H + GAP_Y) + GAP_Y + HEADER_H + 50;
        const canvas = document.getElementById('squad-canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0a1f0a'); bg.addColorStop(0.5, '#0d280d'); bg.addColorStop(1, '#0a1f0a');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.025)' : 'transparent'; ctx.fillRect(0, i * H / 10, W, H / 10); }
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(20, HEADER_H, W - 40, H - HEADER_H - 20);
        ctx.beginPath(); ctx.moveTo(20, H / 2); ctx.lineTo(W - 20, H / 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2); ctx.stroke();
        const hGrad = ctx.createLinearGradient(0, 0, W, 0);
        hGrad.addColorStop(0, 'rgba(240,180,41,.0)'); hGrad.addColorStop(0.5, 'rgba(240,180,41,.18)'); hGrad.addColorStop(1, 'rgba(240,180,41,.0)');
        ctx.fillStyle = hGrad; ctx.fillRect(0, 0, W, HEADER_H);
        ctx.fillStyle = '#f0b429'; ctx.font = 'bold 28px "Bebas Neue",Arial'; ctx.textAlign = 'center';
        ctx.fillText((tec.nombre || 'MI PLANTILLA').toUpperCase(), W / 2, 34);
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '600 13px Inter,Arial';
        const prom = jugadoresSquad.length ? (jugadoresSquad.reduce((a, j) => a + (parseInt(j.overall) || 0), 0) / jugadoresSquad.length).toFixed(1) : '—';
        ctx.fillText(`${jugadoresSquad.length} jugadores · OVR prom. ${prom}${tec.formacion ? ' · ' + tec.formacion : ''}`, W / 2, 56);
        const imgCache = {};
        await Promise.all(jugadoresSquad.filter(j => j.imagen).map(j => new Promise(res => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { imgCache[j.id] = img; res(); }; img.onerror = res; img.src = j.imagen; })));
        lineasActivas.forEach((linea, li) => {
          const count = linea.length; const totalW = count * CARD_W + (count - 1) * GAP_X; const startX = (W - totalW) / 2;
          const lineY = HEADER_H + GAP_Y + (lineasActivas.length - 1 - li) * (CARD_H + GAP_Y);
          linea.forEach((j, ci) => { const cx = startX + ci * (CARD_W + GAP_X); drawCard(ctx, j, cx, lineY, CARD_W, CARD_H, imgCache[j.id]); });
        });
        ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.font = '600 12px Inter,Arial'; ctx.textAlign = 'center'; ctx.fillText('eFootball Manager', W / 2, H - 8);
        document.getElementById('squad-overlay').classList.remove('oculto');
        if (btn) { btn.textContent = '📸 Squad'; btn.disabled = false; }
      }
      function drawCard(ctx, j, x, y, W, H, imgEl) {
        const R = 10;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, W, H, R); else ctx.rect(x, y, W, H);
        ctx.fillStyle = '#0e1828'; ctx.fill(); ctx.restore();
        const cg = ctx.createLinearGradient(x, y, x, y + H); cg.addColorStop(0, '#1a2540'); cg.addColorStop(1, '#0e1520');
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, W, H, R); else ctx.rect(x, y, W, H); ctx.fillStyle = cg; ctx.fill();
        const imgH = Math.floor(H * 0.63);
        if (imgEl) {
          ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, W, imgH, [R, R, 0, 0]); else ctx.rect(x, y, W, imgH); ctx.clip();
          const scale = W / imgEl.naturalWidth; ctx.drawImage(imgEl, x, y, W, imgEl.naturalHeight * scale); ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, W, imgH, [R, R, 0, 0]); else ctx.rect(x, y, W, imgH); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.font = `${Math.floor(imgH * .45)}px Arial`; ctx.textAlign = 'center'; ctx.fillText('🧑', x + W / 2, y + imgH * .65);
        }
        const fg = ctx.createLinearGradient(x, y + imgH * .5, x, y + imgH); fg.addColorStop(0, 'transparent'); fg.addColorStop(1, 'rgba(10,18,32,.92)');
        ctx.fillStyle = fg; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, W, imgH, [R, R, 0, 0]); else ctx.rect(x, y, W, imgH); ctx.fill();
        const ob = ctx.createLinearGradient(x + 6, y + 6, x + 6, y + 32); ob.addColorStop(0, '#f0b429'); ob.addColorStop(1, '#c88a00');
        ctx.fillStyle = ob; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x + 6, y + 6, 36, 26, 6); else ctx.rect(x + 6, y + 6, 36, 26); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText(j.overall || '—', x + 24, y + 23);
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x + W - 42, y + 6, 36, 22, 5); else ctx.rect(x + W - 42, y + 6, 36, 22); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(j.posicion || '', x + W - 24, y + 21);
        const infoY = y + imgH, infoH = H - imgH;
        const apellido = (j.nombre || '').split(' ').slice(-1)[0];
        const dn = apellido.length > 10 ? apellido.substring(0, 10) + '…' : apellido;
        ctx.fillStyle = '#e8eaf0'; ctx.font = `bold ${W > 110 ? 13 : 11}px Inter,Arial`; ctx.textAlign = 'center'; ctx.fillText(dn, x + W / 2, infoY + infoH * .42);
        ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.font = `${W > 110 ? 9 : 8}px Inter,Arial`; ctx.fillText((j.equipo || '').substring(0, 14), x + W / 2, infoY + infoH * .72);
        const ovr = parseInt(j.overall) || 0;
        ctx.strokeStyle = ovr >= 99 ? 'rgba(240,180,41,.9)' : ovr >= 97 ? 'rgba(240,180,41,.5)' : 'rgba(255,255,255,.12)';
        ctx.lineWidth = ovr >= 99 ? 2 : 1; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, W, H, R); else ctx.rect(x, y, W, H); ctx.stroke();
      }
      function descargarSquad() {
        const canvas = document.getElementById('squad-canvas');
        const link = document.createElement('a'); link.download = 'mi_plantilla_efootball.png'; link.href = canvas.toDataURL('image/png', 1.0); link.click();
      }
      document.getElementById('squad-overlay').addEventListener('click', function (e) { if (e.target === this) this.classList.add('oculto'); });

      // ── MODO PRESENTACIÓN ─────────────────────────────────────────────────────────
      let presIdx = -1, presJugadores = [], presAutoPlay = false, presAutoTimer = null, presAnimando = false;
      function iniciarPresentacion() {
        presJugadores = [...jugadores].sort((a, b) => (parseInt(a.overall) || 0) - (parseInt(b.overall) || 0));
        if (!presJugadores.length) { alert('No hay jugadores.'); return; }
        presIdx = -1; presAnimando = false;
        document.getElementById('pres-progreso').innerHTML = presJugadores.map((_, i) => `<div class="pres-dot" id="pres-dot-${i}"></div>`).join('');
        document.getElementById('pres-cartas-grid').innerHTML = '';
        document.getElementById('pres-carta-reveal').innerHTML = '';
        document.getElementById('pres-carta-reveal').className = '';
        document.getElementById('pres-nombre-reveal').style.opacity = '0';
        document.getElementById('pres-nombre-reveal').innerHTML = '';
        document.getElementById('pres-contador').textContent = '';
        document.getElementById('pres-overlay').classList.remove('oculto');
        document.body.style.overflow = 'hidden';
        setTimeout(() => presSiguiente(), 600);
      }
      function cerrarPresentacion() {
        document.getElementById('pres-overlay').classList.add('oculto');
        document.body.style.overflow = '';
        if (presAutoTimer) clearInterval(presAutoTimer);
        presAutoPlay = false; document.getElementById('pres-auto-btn').textContent = '▶ Auto';
      }
      function toggleAutoPlay() {
        presAutoPlay = !presAutoPlay;
        const btn = document.getElementById('pres-auto-btn');
        if (presAutoPlay) {
          btn.textContent = '⏸ Auto'; btn.style.background = 'rgba(240,180,41,.2)';
          presAutoTimer = setInterval(() => {
            if (presIdx >= presJugadores.length - 1) { clearInterval(presAutoTimer); presAutoPlay = false; btn.textContent = '▶ Auto'; btn.style.background = ''; }
            else presSiguiente();
          }, 2800);
        } else { clearInterval(presAutoTimer); btn.textContent = '▶ Auto'; btn.style.background = ''; }
      }
      function presAnterior() {
        if (presIdx <= 0 || presAnimando) return;
        presIdx -= 2;
        const grid = document.getElementById('pres-cartas-grid');
        const wraps = grid.querySelectorAll('.pres-carta-wrap');
        if (wraps.length) { const last = wraps[wraps.length - 1]; last.style.animation = 'none'; last.style.opacity = '0'; setTimeout(() => last.remove(), 200); }
        setTimeout(() => presSiguiente(), 250);
      }
      async function presSiguiente() {
        if (presAnimando) return;
        presIdx++;
        if (presIdx >= presJugadores.length) { presFinale(); return; }
        presAnimando = true;
        const j = presJugadores[presIdx];
        document.getElementById('pres-contador').textContent = `${presIdx + 1} / ${presJugadores.length}`;
        presJugadores.forEach((_, i) => { const dot = document.getElementById(`pres-dot-${i}`); if (!dot) return; dot.className = 'pres-dot' + (i < presIdx ? ' visto' : i === presIdx ? ' activo' : ''); });
        const nombreEl = document.getElementById('pres-nombre-reveal');
        nombreEl.style.opacity = '0';
        const revealEl = document.getElementById('pres-carta-reveal');
        const stage = document.getElementById('pres-stage');
        const stageH = stage.offsetHeight;
        const cartaH = Math.min(stageH * .72, 380);
        const cartaW = Math.floor(cartaH * .75);
        revealEl.style.cssText = `position:absolute;top:50%;left:50%;z-index:6;width:${cartaW}px;filter:drop-shadow(0 0 60px rgba(240,180,41,.5));pointer-events:none`;
        revealEl.innerHTML = htmlCarta(j);
        revealEl.className = 'entrando';
        await new Promise(res => setTimeout(res, 820));
        nombreEl.innerHTML = `<div class="pres-jug-nombre">${j.nombre || 'Sin nombre'}</div><div class="pres-jug-meta">${j.overall ? `<span class="pres-pill">OVR ${j.overall}</span>` : ''} ${j.posicion ? `<span class="pres-pill pres-pill-blue">${j.posicion}</span>` : ''} ${j.equipo ? `<span class="pres-pill" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.7)">${j.equipo}</span>` : ''}</div>`;
        nombreEl.style.opacity = '1';
        await new Promise(res => setTimeout(res, 900));
        revealEl.className = 'saliendo';
        await new Promise(res => setTimeout(res, 400));
        revealEl.className = ''; revealEl.innerHTML = ''; nombreEl.style.opacity = '0';
        const grid = document.getElementById('pres-cartas-grid');
        const gridCardW = calcGridCardWidth();
        const wrap = document.createElement('div');
        wrap.className = 'pres-carta-wrap'; wrap.style.width = gridCardW + 'px';
        wrap.innerHTML = htmlCarta(j); grid.appendChild(wrap);
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));
        presAnimando = false;
      }
      function calcGridCardWidth() {
        const total = presJugadores.length;
        const stage = document.getElementById('pres-stage');
        const W = stage.offsetWidth - 32, H = stage.offsetHeight - 32, GAP = 10;
        let bestW = 85;
        for (let cols = 1; cols <= total; cols++) {
          const rows = Math.ceil(total / cols);
          const cardW = Math.floor((W - (cols - 1) * GAP) / cols);
          const cardH = cardW / .75;
          if (cardH * rows + (rows - 1) * GAP <= H && cardW > bestW) bestW = cardW;
        }
        return Math.min(bestW, 175);
      }
      function presFinale() {
        document.getElementById('pres-instruccion').style.display = 'none';
        document.getElementById('pres-contador').textContent = '✓ Plantilla completa';
        document.querySelectorAll('.pres-carta-wrap').forEach((w, i) => {
          setTimeout(() => { const carta = w.querySelector('.carta'); if (carta) { carta.style.animation = 'cartaGlow 1.5s linear infinite'; carta.style.borderWidth = '2.5px'; } }, i * 80);
        });
      }
      document.addEventListener('keydown', e => {
        const pres = document.getElementById('pres-overlay');
        if (pres.classList.contains('oculto')) return;
        if (e.key === 'Escape') cerrarPresentacion();
        else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); presSiguiente(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); presAnterior(); }
      });

      // ── TEMAS ─────────────────────────────────────────────────────────────────────
      const TEMAS = ['default', 'madrid', 'barca', 'chelsea', 'psg', 'custom'];
      let temaActual = 'default';
      function abrirTemas() { document.getElementById('temas-overlay').classList.remove('oculto'); actualizarBotonesTema(); }
      function cerrarTemas() { document.getElementById('temas-overlay').classList.add('oculto'); }
      function actualizarBotonesTema() { TEMAS.forEach(t => { const el = document.getElementById('tema-' + t); if (el) el.classList.toggle('activo', t === temaActual); }); }
      function aplicarTema(t) {
        TEMAS.forEach(t2 => document.body.classList.remove('tema-' + t2));
        temaActual = t;
        if (t !== 'default') document.body.classList.add('tema-' + t);
        document.getElementById('temas-custom-panel').style.display = t === 'custom' ? 'block' : 'none';
        if (t === 'custom') actualizarCustom();
        actualizarBotonesTema();
        try { localStorage.setItem('efm_tema', t); } catch (e) { }
      }
      function actualizarCustom() {
        const oro = document.getElementById('custom-oro').value;
        const azul = document.getElementById('custom-azul').value;
        const card = document.getElementById('custom-card').value;
        const oro2 = adjustColor(oro, -20);
        document.documentElement.style.setProperty('--oro', oro);
        document.documentElement.style.setProperty('--oro2', oro2);
        document.documentElement.style.setProperty('--azul', azul);
        document.documentElement.style.setProperty('--card', card);
        document.getElementById('custom-dot-1').style.background = oro;
        document.getElementById('custom-dot-2').style.background = azul;
        document.getElementById('custom-dot-3').style.background = card;
        try { localStorage.setItem('efm_custom_oro', oro); localStorage.setItem('efm_custom_azul', azul); localStorage.setItem('efm_custom_card', card); } catch (e) { }
      }
      function adjustColor(hex, amount) {
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      }
      function initTema() {
        try {
          const saved = localStorage.getItem('efm_tema');
          if (saved) {
            aplicarTema(saved);
            if (saved === 'custom') {
              const oro = localStorage.getItem('efm_custom_oro') || '#f0b429';
              const azul = localStorage.getItem('efm_custom_azul') || '#2563eb';
              const card = localStorage.getItem('efm_custom_card') || '#141820';
              document.getElementById('custom-oro').value = oro;
              document.getElementById('custom-azul').value = azul;
              document.getElementById('custom-card').value = card;
              actualizarCustom();
            }
          }
        } catch (e) { }
      }

      // ── SONIDOS ───────────────────────────────────────────────────────────────────
      function reproducirSonido(tipo) { } // sonidos desactivados

      document.addEventListener('DOMContentLoaded', () => { initTema(); });
  