/* ════════════════════════════════════════
   APP — navigation, init, event listeners
   ════════════════════════════════════════ */

// ── NAVIGATION ────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const meta = PAGE_META[pageId];
  if (!meta) return;

  document.getElementById(meta.id)?.classList.add('active');
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
  setEl('topbar-title', meta.title);
  setEl('topbar-path',  meta.path);

  if (pageId === 'map') {
    setTimeout(() => {
      initMap();
      if (S.map) setTimeout(() => S.map.invalidateSize(), 150);
    }, 50);
  }
  if (pageId === 'reports')  setTimeout(initReportsCharts, 100);
  if (pageId === 'settings') loadSettings();
  if (pageId === 'iotguide') setTimeout(_fillGuideUrls, 50);

  closeSidebar(); // ferme le drawer mobile si ouvert
}

// ── EVENT LISTENERS ───────────────────
document.querySelectorAll('.nav-item').forEach(nav => {
  nav.addEventListener('click', () => showPage(nav.dataset.page));
});

document.getElementById('user-chip').addEventListener('click', () => {
  if (S.token) {
    showConfirm('Déconnexion', 'Voulez-vous mettre fin à votre session ?', logout, false);
  } else {
    showLoginModal();
  }
});

// Fermer les modals en cliquant l'overlay
const _modalClosers = {
  'confirm-modal':   closeConfirm,
  'eleveur-modal':   closeEleveurModal,
  'register-modal':  closeRegisterModal,
  'troupeau-modal':  closeTroupeauModal,
  'collier-modal':   closeCollierModal,
};
['login-modal', 'confirm-modal', 'eleveur-modal', 'register-modal', 'troupeau-modal', 'collier-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id !== id) return;
    const fn = _modalClosers[id];
    if (fn) fn();
    else if (id !== 'login-modal' || S.token) closeLoginModal();
  });
});

document.getElementById('login-password')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitLogin();
});

// ── GUIDE IoT : remplir l'URL dynamique quand la page s'affiche ──
const _origShowPage = showPage;
// On va écraser showPage pour injecter l'URL dans le guide quand on l'ouvre
// (défini après, voir ci-dessous)

function _fillGuideUrls() {
  const base = CONFIG.apiBase || '';
  const el1  = document.getElementById('guide-api-url');
  const el2  = document.getElementById('guide-curl-url');
  if (el1) el1.textContent = base;
  if (el2) el2.textContent = base;
}

function copyGuideCode(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent.trim()).then(() =>
    showToast('ok', 'Copié !', 'Texte copié dans le presse-papiers')
  ).catch(() => showToast('warn', 'Copie échouée', 'Copiez manuellement'));
}

function copyRawCode(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.value).then(() =>
    showToast('ok', 'Copié !', 'JSON copié dans le presse-papiers')
  ).catch(() => showToast('warn', 'Copie échouée', 'Copiez manuellement'));
}

function copyArduinoCode() {
  const el = document.getElementById('guide-code-arduino');
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() =>
    showToast('ok', 'Copié !', 'Code Arduino copié')
  ).catch(() => showToast('warn', 'Copie échouée', 'Copiez manuellement'));
}

function copyCurlCode() {
  const base = CONFIG.apiBase || '';
  const text = `curl -X POST ${base}/iot/gps \\\n  -H "Content-Type: application/json" \\\n  -d '{"api_key":"dawbali_iot_key_2024","id_troupeau":1,"longitude":13.605,"latitude":7.421,"precision_pos":4,"niveau_batterie":82}'`;
  navigator.clipboard.writeText(text).then(() =>
    showToast('ok', 'Copié !', 'Commande curl copiée')
  ).catch(() => showToast('warn', 'Copie échouée', 'Copiez manuellement'));
}

// ── INIT : restauration de session ────
(function init() {
  const savedToken = localStorage.getItem('token');
  const savedUser  = localStorage.getItem('user');
  if (savedToken && savedUser) {
    try {
      S.token = savedToken;
      S.user  = JSON.parse(savedUser);
      updateUserUI();
      refreshAll();
      connectSSE(S.token);
      setTimeout(() => showToast('ok', 'GeoAlerte-CM — Système actif', `Session restaurée · ${S.user.nom}`), 500);
    } catch (_) {
      setTimeout(showLoginModal, 300);
    }
  } else {
    setTimeout(showLoginModal, 300);
  }
})();
