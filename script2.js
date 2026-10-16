
    function abrirPreguntaSeguridad() {
      cerrarSync();
      document.getElementById('pregunta-overlay').classList.remove('oculto');
    }
    function cerrarPregunta() {
      document.getElementById('pregunta-overlay').classList.add('oculto');
    }
    async function guardarPregunta() {
      const pregunta = document.getElementById('pq-pregunta').value;
      const respuesta = document.getElementById('pq-respuesta').value.trim();
      const msg = document.getElementById('pq-msg');
      if (!pregunta) { mostrarPqMsg('Selecciona una pregunta', 'error'); return; }
      if (!respuesta) { mostrarPqMsg('Escribe tu respuesta', 'error'); return; }
      try {
        const r = await fetch('/api/configurar_pregunta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pregunta, respuesta })
        });
        const d = await r.json();
        if (r.ok) {
          mostrarPqMsg('✅ Pregunta guardada correctamente', 'exito');
          setTimeout(cerrarPregunta, 1500);
        } else {
          mostrarPqMsg(d.error || 'Error al guardar', 'error');
        }
      } catch { mostrarPqMsg('Error de conexión', 'error'); }
    }
    function mostrarPqMsg(txt, tipo) {
      const el = document.getElementById('pq-msg');
      el.textContent = txt;
      el.style.display = 'block';
      el.style.background = tipo === 'exito' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)';
      el.style.border = tipo === 'exito' ? '1px solid rgba(16,185,129,.3)' : '1px solid rgba(239,68,68,.3)';
      el.style.color = tipo === 'exito' ? 'var(--verde)' : 'var(--rojo)';
    }
  