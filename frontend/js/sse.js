/* ════════════════════════════════════════
   SSE — flux d'alertes temps réel
   ════════════════════════════════════════ */
let _sseSource = null;

function connectSSE(token) {
  if (_sseSource) _sseSource.close();
  if (!token) return;

  const url = `${CONFIG.apiBase.replace('/api', '')}/api/events?token=${encodeURIComponent(token)}`;
  _sseSource = new EventSource(url);

  _sseSource.addEventListener('connected', () => {
    console.log('SSE connecté — flux alertes actif');
  });

  _sseSource.addEventListener('alerte', e => {
    try {
      const alerte = JSON.parse(e.data);
      _handleSSEAlerte(alerte);
    } catch (_) {}
  });

  _sseSource.onerror = () => {
    // Reconnexion automatique gérée par le navigateur
    console.warn('SSE : connexion perdue, tentative de reconnexion…');
  };
}

function disconnectSSE() {
  if (_sseSource) { _sseSource.close(); _sseSource = null; }
}

function _handleSSEAlerte(alerte) {
  // 1. Toast visible immédiatement
  const type  = alerte.type_alerte || 'ALERTE';
  const troup = alerte.nom_troupeau || `Troupeau #${alerte.id_troupeau}`;
  const zone  = alerte.nom_zone    || 'zone';
  showToast('danger', `🚨 ${type.replace('_', ' ')}`, `${troup} — ${zone}`);

  // 2. Badge sidebar
  _incrementAlertBadge();

  // 3. Insérer en tête de la liste locale sans recharger tout
  if (!S.allAlerts) S.allAlerts = [];
  S.allAlerts.unshift(alerte);

  // 4. Rafraîchir l'affichage des alertes si la page est visible
  const alertsPage = document.getElementById('alerts');
  if (alertsPage?.classList.contains('active')) {
    applyAlertFilters();
  }

  // 5. Rafraîchir le dashboard (KPI alertes)
  fetchAlerts();
}

function _incrementAlertBadge() {
  const badge = document.getElementById('alert-badge');
  if (!badge) return;
  const cur = parseInt(badge.textContent) || 0;
  badge.textContent = cur + 1;
  badge.classList.remove('hidden');
}
