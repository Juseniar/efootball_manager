
      // ── PANEL SYNC ────────────────────────────────────────────────────────────────
      let _pwaPrompt = null;
      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        _pwaPrompt = e;
      });

      function instalarPWA() {
        if (_pwaPrompt) {
          _pwaPrompt.prompt();
          _pwaPrompt.userChoice.then(r => {
            if (r.outcome === 'accepted') {
              cerrarSync();
            }
            _pwaPrompt = null;
          });
        } else {
          alert('Para instalar:\n\n• Chrome/Edge: menú ⋮ → "Instalar aplicación"\n• Safari iOS: botón compartir → "Añadir a pantalla inicio"\n\nO accede desde http://localhost:5000 con el servidor activo.');
        }
      }

      function abrirSincronizacion() {
        document.getElementById('sync-overlay').classList.remove('oculto');
        actualizarEstadoSync();
      }

      function cerrarSync() {
        document.getElementById('sync-overlay').classList.add('oculto');
      }

      async function actualizarEstadoSync() {
        const dot = document.getElementById('sync-dot');
        const txt = document.getElementById('sync-estado-txt');
        const box = document.getElementById('sync-estado-box');
        dot.style.background = '#f0b429';
        txt.textContent = 'Verificando...';
        try {
          const r = await fetch('/api/jugadores', { signal: AbortSignal.timeout(1500) });
          if (r.ok) {
            dot.style.background = '#10b981';
            txt.textContent = '🟢 Servidor Python activo — datos sincronizados';
            box.style.borderColor = 'rgba(16,185,129,.3)';
          } else throw new Error();
        } catch {
          dot.style.background = '#ef4444';
          txt.textContent = '📴 Sin servidor — usando datos locales del navegador';
          box.style.borderColor = 'rgba(239,68,68,.3)';
        }
      }
  