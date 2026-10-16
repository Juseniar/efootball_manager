
    // ── ADMIN ─────────────────────────────────────────────────────────────────────
    async function renderAdmin() {
      const el = document.getElementById('admin-body');
      el.innerHTML = '<div style="color:var(--apagado);padding:40px;text-align:center">Cargando...</div>';
      try {
        const r = await fetch('/api/admin/usuarios');
        if (r.status === 403) {
          el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--apagado)"><div style="font-size:3rem;margin-bottom:12px">🔒</div><div style="font-size:1.1rem;font-weight:600">Acceso restringido</div><div style="font-size:.85rem;margin-top:6px">Solo el usuario <strong>admin</strong> puede ver este panel.</div></div>';
          return;
        }
        const usuarios = await r.json();

        const totalJugs = usuarios.reduce((a, u) => a + u.jugadores, 0);
        const totalTecs = usuarios.reduce((a, u) => a + u.tecnicos, 0);

        el.innerHTML = `
        <div class="admin-titulo">⚙️ Panel de Administración</div>
        <div class="admin-sub">Gestión de usuarios registrados en el sistema</div>

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px">
          <div class="stats-kpi">
            <div class="stats-kpi-val">${usuarios.length}</div>
            <div class="stats-kpi-lbl">Usuarios</div>
          </div>
          <div class="stats-kpi">
            <div class="stats-kpi-val">${totalJugs}</div>
            <div class="stats-kpi-lbl">Jugadores totales</div>
          </div>
          <div class="stats-kpi">
            <div class="stats-kpi-val">${totalTecs}</div>
            <div class="stats-kpi-lbl">Técnicos totales</div>
          </div>
        </div>

        <!-- Tabla -->
        <table class="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Jugadores</th>
              <th>Técnicos</th>
              <th>Carpetas</th>
              <th>Seg.</th>
              <th>Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${usuarios.map(u => `
              <tr>
                <td><span style="font-weight:700;color:var(--oro)">@${u.username}</span></td>
                <td>${u.nombre}</td>
                <td><span class="admin-badge" style="background:rgba(240,180,41,.15);color:var(--oro)">${u.jugadores}</span></td>
                <td><span class="admin-badge" style="background:rgba(59,130,246,.15);color:#60a5fa">${u.tecnicos}</span></td>
                <td><span class="admin-badge">${u.carpetas}</span></td>
                <td>${u.tiene_pregunta ? '✅' : '❌'}</td>
                <td style="font-size:.75rem;color:var(--apagado)">${u.created ? u.created.slice(0, 10) : '—'}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn-sm" onclick="adminResetPwd('${u.username}')" title="Resetear contraseña" style="font-size:.7rem">🔑 Reset</button>
                    ${u.username !== 'admin' ? `<button class="btn-sm" onclick="adminEliminar('${u.username}')" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);color:var(--rojo);font-size:.7rem">🗑 Eliminar</button>` : ''}
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      `;
      } catch (e) {
        el.innerHTML = '<div style="color:var(--rojo);padding:20px">Error cargando usuarios.</div>';
      }
    }

    async function adminResetPwd(username) {
      const nueva = prompt(`Nueva contraseña para @${username} (mín. 4 caracteres):`);
      if (!nueva) return;
      if (nueva.length < 4) { alert('Mínimo 4 caracteres'); return; }
      const r = await fetch('/api/admin/reset_pwd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, nueva_pwd: nueva })
      });
      const d = await r.json();
      if (r.ok) alert(`✅ Contraseña de @${username} actualizada.`);
      else alert('Error: ' + (d.error || 'desconocido'));
    }

    async function adminEliminar(username) {
      if (!confirm(`¿Eliminar usuario @${username}? Esto NO borra sus archivos de datos.`)) return;
      const r = await fetch('/api/admin/eliminar_usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const d = await r.json();
      if (r.ok) { alert(`✅ Usuario @${username} eliminado.`); renderAdmin(); }
      else alert('Error: ' + (d.error || 'desconocido'));
    }

    // Show admin tab only if user is admin
    fetch('/api/admin/yo').then(r => r.json()).then(d => {
      if (d.es_admin) {
        const t = document.getElementById('tab-admin');
        if (t) t.style.display = '';
      }
    }).catch(() => { });
  