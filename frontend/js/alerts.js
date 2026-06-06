/* ════════════════════════════════════════
   ALERTS — filtrage, rendu, résolution
   ════════════════════════════════════════ */
function applyAlertFilters() {
  const type   = document.getElementById('alert-filter')?.value        || '';
  const status = document.getElementById('alert-status-filter')?.value || '';
  const date   = document.getElementById('alert-date-filter')?.value   || '';

  let filtered = S.allAlerts;
  if (type)   filtered = filtered.filter(a => a.type_alerte === type);
  if (status) filtered = filtered.filter(a =>
    status === 'resolved' ? a.status !== 'pending' : a.status === status
  );
  if (date)   filtered = filtered.filter(a => a.created_at?.startsWith(date));

  renderAlerts(filtered);
}

function clearAlertFilters() {
  const ids = ['alert-filter', 'alert-status-filter', 'alert-date-filter'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  applyAlertFilters();
}

function renderAlerts(alerts) {
  const pending = S.allAlerts.filter(a => a.status === 'pending');

  // KPI dashboard
  setEl('kpi-alerts',  pending.length);
  setEl('kpi-alerts-delta', pending.length > 0 ? `${pending.length} non résolues` : 'Aucune alerte');
  const deltaEl = document.getElementById('kpi-alerts-delta');
  if (deltaEl) deltaEl.className = `kpi-delta ${pending.length > 0 ? 'down' : 'up'}`;
  setWidth('bar-alerts', Math.min(pending.length * 14, 100));

  // Badges nav
  const alertBadge = document.getElementById('alert-badge');
  if (alertBadge) {
    alertBadge.textContent = pending.length;
    alertBadge.className   = `nav-badge${pending.length === 0 ? ' hidden' : ''}`;
  }
  const mapBadge = document.getElementById('map-badge');
  if (mapBadge) {
    mapBadge.textContent = pending.length;
    mapBadge.className   = `nav-badge warn${pending.length === 0 ? ' hidden' : ''}`;
  }

  setEl('alerts-active-count', `${pending.length} en cours`);
  setEl('alerts-total-count',  `${alerts.length} total`);

  // Constructeur d'un item alerte
  const makeItem = (a, withResolve = false) => {
    const t = ALERT_ICONS[a.type_alerte] || { icon: '•', cls: 'info' };
    const d = a.created_at ? new Date(a.created_at).toLocaleString('fr-FR') : '—';
    const id = a.id_alerte || a.id || '';
    const resolveBtn = withResolve && a.status === 'pending'
      ? `<button class="btn btn-secondary btn-sm" onclick="resolveAlert(${id},event)">Résoudre</button>`
      : '';
    return `<div class="alert-item">
      <div class="alert-icon ${t.cls}">${t.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.type_alerte || 'ALERTE'}</div>
        <div class="alert-desc" title="${a.message || ''}">${a.message || 'Alerte système'}</div>
        <div class="alert-time">${d}</div>
      </div>
      <div class="alert-actions">
        <span class="pill ${a.status === 'pending' ? 'danger' : 'ok'}">${a.status === 'pending' ? 'En cours' : 'Résolu'}</span>
        ${resolveBtn}
      </div>
    </div>`;
  };

  // Panneau alertes actives
  const activeEl = document.getElementById('alerts-active');
  if (activeEl) {
    const activePending = alerts.filter(a => a.status === 'pending');
    activeEl.innerHTML = activePending.length
      ? activePending.slice(0, 10).map(a => makeItem(a, true)).join('')
      : '<div class="empty"><div class="empty-icon">✓</div><div class="empty-title">Aucune alerte active</div></div>';
  }

  // Widget dashboard (5 dernières)
  const recentEl = document.getElementById('recent-alerts');
  if (recentEl) {
    recentEl.innerHTML = S.allAlerts.slice(0, 5).length
      ? S.allAlerts.slice(0, 5).map(a => makeItem(a)).join('')
      : '<div class="empty"><div class="empty-icon">◈</div><div class="empty-title">Aucune alerte</div></div>';
  }

  // Tableau historique
  const tbody = document.getElementById('alerts-list');
  if (tbody) {
    if (!alerts.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-title">Aucune alerte correspondante</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = alerts.map(a => {
      const t  = ALERT_ICONS[a.type_alerte] || { icon: '•', cls: 'info' };
      const d  = a.created_at ? new Date(a.created_at).toLocaleString('fr-FR') : '—';
      const id = a.id_alerte || a.id || '';
      const resolveBtn = a.status === 'pending'
        ? `<button class="btn btn-secondary btn-sm" onclick="resolveAlert(${id},event)">Résoudre</button>`
        : '<span style="color:var(--text3);font-size:12px;">—</span>';
      return `<tr>
        <td class="mono tbl-hide-xs" style="font-size:11px;white-space:nowrap;">${d}</td>
        <td style="font-weight:600;">${a.type_alerte || '—'}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${a.message || ''}">${a.message || '—'}</td>
        <td><span class="pill ${a.status === 'pending' ? 'danger' : 'ok'}">${a.status === 'pending' ? 'En cours' : 'Résolu'}</span></td>
        <td>${resolveBtn}</td>
      </tr>`;
    }).join('');
  }
}

async function resolveAlert(id, ev) {
  if (ev) ev.stopPropagation();
  const { ok } = await api(`/alertes/${id}`, 'PATCH', { status: 'resolved' });
  if (ok) {
    const a = S.allAlerts.find(x => (x.id_alerte || x.id) === id);
    if (a) a.status = 'resolved';
    applyAlertFilters();
    showToast('ok', 'Alerte résolue', `#${id} marquée comme résolue`);
  } else {
    showToast('warn', 'Impossible de résoudre', 'Vérifiez les droits ou l\'endpoint backend');
  }
}
