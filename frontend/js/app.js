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
  if (pageId === 'reports') setTimeout(initReportsCharts, 100);
  if (pageId === 'settings') loadSettings();

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
      setTimeout(() => showToast('ok', 'GeoAlerte-CM — Système actif', `Session restaurée · ${S.user.nom}`), 500);
    } catch (_) {
      setTimeout(showLoginModal, 300);
    }
  } else {
    setTimeout(showLoginModal, 300);
  }
})();
