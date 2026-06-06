/* ════════════════════════════════════════
   DATA — fetch + rendu de toutes les entités
   ════════════════════════════════════════ */
async function refreshAll() {
  if (!S.token) return;
  await Promise.all([
    fetchEleveurs(),
    fetchHerds(),
    fetchDevices(),
    fetchZones(),
    fetchAlerts(),
  ]);
  renderDashboardChart();
}

// ── ÉLEVEURS ──────────────────────────
async function fetchEleveurs() {
  const { ok, data } = await api('/eleveurs');
  if (!ok || !data.data) return;
  S.allEleveurs = data.data;
  S.eleveurMap  = Object.fromEntries(data.data.map(e => [e.id_eleveur, e]));

  const total = data.data.length;
  setEl('kpi-eleveurs',       total);
  setEl('kpi-eleveurs-delta', `${total} éleveurs enregistrés`);
  setWidth('bar-eleveurs',    Math.min(total * 10, 100));
  setEl('eleveurs-sub',       `${total} éleveurs enregistrés`);
  renderEleveursTable();
}

// ── TROUPEAUX ─────────────────────────
async function fetchHerds() {
  const { ok, data } = await api('/troupeaux');
  if (!ok || !data.data) return;
  S.allHerds = data.data;

  const total = data.data.length;
  setEl('kpi-herds',       total);
  setEl('kpi-herds-delta', `${total} troupeaux suivis`);
  setWidth('bar-herds',    Math.min(total * 8, 100));
  setEl('herds-sub',       `${total} troupeaux enregistrés`);
  renderHerdsTable();
}

// ── COLLIERS ──────────────────────────
async function fetchDevices() {
  const { ok, data } = await api('/colliers');
  if (!ok || !data.data) return;
  S.allDevices = data.data;

  const total    = data.data.length;
  const online   = data.data.filter(d => d.statut === 'actif').length;
  const offline  = total - online;
  const critical = data.data.filter(d => (d.niveau_batterie || 0) < CONFIG.batThreshold).length;

  setEl('kpi-devices',  online);
  setEl('kpi-devices-delta', offline > 0 ? `${offline} hors ligne` : 'Tous en ligne');
  setWidth('bar-devices', total ? (online / total * 100) : 0);
  const deltaEl = document.getElementById('kpi-devices-delta');
  if (deltaEl) deltaEl.className = `kpi-delta ${offline > 0 ? 'warn' : 'up'}`;

  setEl('dev-total',    total);
  setEl('dev-online',   online);
  setEl('dev-offline',  offline);
  setEl('dev-critical', critical);
  setEl('device-ok-count',      `${online} actifs`);
  setEl('device-offline-count', `${offline} hors ligne`);

  renderDevicesTable();
  renderDashboardDevices();
}

// ── ZONES ─────────────────────────────
async function fetchZones() {
  const { ok, data } = await api('/zones');
  if (!ok || !data.data) return;
  S.allZones = data.data;

  const total = data.data.length;
  setEl('kpi-zones',       total);
  setEl('kpi-zones-delta', `${total} zones configurées`);
  setWidth('bar-zones',    Math.min(total * 12, 100));

  const agri  = data.data.filter(z => z.type_zone !== 'transhumance');
  const trans = data.data.filter(z => z.type_zone === 'transhumance');
  setEl('zones-agri-count',  `${agri.length} zones`);
  setEl('zones-trans-count', `${trans.length} couloirs`);

  renderZoneList(agri,  'zones-agricultural', 'danger');
  renderZoneList(trans, 'zones-transhumance',  'ok');
  renderZonesTable();
  drawZonesOnMap();
}

// ── ALERTES ───────────────────────────
async function fetchAlerts() {
  const { ok, data } = await api('/alertes');
  if (!ok || !data.data) return;
  S.allAlerts = data.data;
  applyAlertFilters();
}

/* ════════════════════════════════════════
   RENDUS
   ════════════════════════════════════════ */
function renderEleveursTable() {
  const tbody = document.getElementById('eleveurs-table');
  if (!tbody) return;
  if (!S.allEleveurs.length) {
    tbody.innerHTML = emptyRow(5, '◎', 'Aucun éleveur');
    return;
  }
  const herdCount = id => S.allHerds.filter(h => h.id_eleveur === id).length;
  tbody.innerHTML = S.allEleveurs.map(e => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${e.couleur || 'var(--gold)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">
            ${(e.nom_eleveur || '?').substring(0, 2).toUpperCase()}
          </div>
          <span style="font-weight:600;">${e.nom_eleveur || '—'}</span>
        </div>
      </td>
      <td class="mono">${e.telephone || '—'}</td>
      <td>${e.localite || '—'}</td>
      <td><span class="pill gold">${herdCount(e.id_eleveur)} troupeau(x)</span></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="editEleveur(${e.id_eleveur})">Modifier</button>
          <button class="btn btn-danger btn-sm"    onclick="deleteEleveur(${e.id_eleveur},'${(e.nom_eleveur || '').replace(/'/g, "\\'")}')">Suppr.</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderHerdsTable() {
  const tbody = document.getElementById('herds-table');
  if (!tbody) return;
  if (!S.allHerds.length) {
    tbody.innerHTML = emptyRow(7, '⬡', 'Aucun troupeau');
    return;
  }
  tbody.innerHTML = S.allHerds.map(h => {
    const elev   = S.eleveurMap[h.id_eleveur];
    const elevNom = elev ? elev.nom_eleveur : `#${h.id_eleveur}`;
    const collar  = S.allDevices.find(d => d.id_troupeau === h.id_troupeau);
    const collarBadge = collar
      ? `<span class="pill ${collar.statut === 'actif' ? 'ok' : 'off'}">${collar.id_collier}</span>`
      : `<span class="pill off">—</span>`;
    return `<tr>
      <td class="mono tbl-hide-xs">${h.id_troupeau}</td>
      <td style="font-weight:600;">${h.nom_troupeau || '—'}</td>
      <td>${elevNom}</td>
      <td>${h.taille || 0} têtes</td>
      <td>${collarBadge}</td>
      <td><span class="pill ok">Actif</span></td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="viewHerdOnMap(${h.id_troupeau})">Carte</button>
          <button class="btn btn-secondary btn-sm" onclick="editTroupeau(${h.id_troupeau})">Modifier</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTroupeau(${h.id_troupeau},'${(h.nom_troupeau||'').replace(/'/g,"\\'")}')">Suppr.</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderDevicesTable() {
  const tbody = document.getElementById('devices-table');
  if (!tbody) return;
  if (!S.allDevices.length) {
    tbody.innerHTML = emptyRow(5, '⊟', 'Aucun dispositif');
    return;
  }
  tbody.innerHTML = S.allDevices.map(d => {
    const bat     = d.niveau_batterie || 0;
    const batCol  = bat > 50 ? 'var(--green)' : bat > CONFIG.batThreshold ? 'var(--orange)' : 'var(--red)';
    const herd    = S.allHerds.find(h => h.id_troupeau === d.id_troupeau);
    const lastUpd = d.updated_at ? new Date(d.updated_at).toLocaleString('fr-FR') : '—';
    return `<tr>
      <td class="mono">${d.id_collier}</td>
      <td>${herd ? herd.nom_troupeau : (d.nom_troupeau || '—')}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress" style="width:70px;"><div class="progress-fill" style="width:${bat}%;background:${batCol};"></div></div>
          <span style="font-size:11px;font-family:var(--mono);color:${batCol}">${bat}%</span>
        </div>
      </td>
      <td><span class="pill ${d.statut === 'actif' ? 'ok' : 'off'}">${d.statut || 'inactif'}</span></td>
      <td class="mono tbl-hide-xs" style="font-size:11px;">${lastUpd}</td>
      <td>
        <div style="display:flex;gap:5px;">
          <button class="btn btn-secondary btn-sm" onclick="editCollier(${d.id_collier})">Modifier</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCollier(${d.id_collier})">Suppr.</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderDashboardDevices() {
  const el = document.getElementById('device-list-dash');
  if (!el) return;
  if (!S.allDevices.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⊟</div><div class="empty-title">Aucun collier</div></div>';
    return;
  }
  el.innerHTML = S.allDevices.slice(0, 6).map(d => {
    const bat    = d.niveau_batterie || 0;
    const batCol = bat > 50 ? 'var(--green)' : bat > CONFIG.batThreshold ? 'var(--orange)' : 'var(--red)';
    const herd   = S.allHerds.find(h => h.id_troupeau === d.id_troupeau);
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid var(--border);">
      <div style="width:8px;height:8px;border-radius:50%;background:${d.statut === 'actif' ? 'var(--green)' : 'var(--text3)'};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${herd ? herd.nom_troupeau : (d.nom_troupeau || '—')}</div>
        <div style="font-size:11px;color:var(--text2);">Collier ${d.id_collier}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="progress" style="width:50px;"><div class="progress-fill" style="width:${bat}%;background:${batCol};"></div></div>
        <span style="font-size:11px;font-family:var(--mono);color:${batCol};width:30px;text-align:right;">${bat}%</span>
      </div>
    </div>`;
  }).join('');
}

function renderZoneList(zones, containerId, pillClass) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!zones.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⬟</div><div class="empty-title">Aucune zone</div></div>';
    return;
  }
  el.innerHTML = zones.map(z => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 18px;border-bottom:1px solid var(--border);gap:8px;">
      <div style="min-width:0;">
        <div style="font-size:13px;font-weight:600;">${z.nom_zone || '—'}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">Rayon approche : ${z.rayon_alerte_approche || 500} m</div>
      </div>
      <span class="pill ${pillClass}" style="flex-shrink:0;">${z.type_zone || '—'}</span>
    </div>`).join('');
}

function renderZonesTable() {
  const tbody = document.getElementById('zones-table');
  if (!tbody) return;
  tbody.innerHTML = S.allZones.map(z => `
    <tr>
      <td style="font-weight:600;">${z.nom_zone || '—'}</td>
      <td><span class="pill ${z.type_zone === 'transhumance' ? 'ok' : 'danger'}">${z.type_zone || '—'}</span></td>
      <td class="mono">${z.rayon_alerte || z.rayon_alerte_entree || '—'} m</td>
      <td class="mono">${z.rayon_alerte_approche || 500} m</td>
    </tr>`).join('');
}

// Ligne vide dans un tableau
function emptyRow(cols, icon, title) {
  return `<tr><td colspan="${cols}"><div class="empty"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div></div></td></tr>`;
}
