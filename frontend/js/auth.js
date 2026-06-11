/* ════════════════════════════════════════
   AUTH — connexion / déconnexion
   ════════════════════════════════════════ */
async function login(telephone, password, role) {
  if (!telephone || !password) {
    showToast('warn', 'Champs vides', 'Saisissez votre téléphone et mot de passe');
    return false;
  }
  const ep = role === 'eleveur' ? '/auth/login/eleveur' : '/auth/login/admin';
  const { ok, data } = await api(ep, 'POST', { telephone, mot_de_passe: password });
  if (ok && data.token) {
    S.token = data.token;
    S.user  = data.user;
    localStorage.setItem('token', S.token);
    localStorage.setItem('user',  JSON.stringify(S.user));
    updateUserUI();
    closeLoginModal();
    refreshAll();
    connectSSE(S.token);
    showToast('ok', 'Connexion réussie', `Bienvenue, ${S.user.nom}`);
    return true;
  }
  const errEl = document.getElementById('login-error');
  errEl.textContent  = data.error || 'Identifiants incorrects';
  errEl.style.display = 'block';
  return false;
}

function logout() {
  S.token = null;
  S.user  = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('user-name').textContent   = 'Non connecté';
  document.getElementById('user-avatar').textContent = '?';
  document.getElementById('user-role').textContent   = 'Cliquez pour vous connecter';
  document.getElementById('logout-icon').style.display = 'none';
  document.documentElement.removeAttribute('data-role');
  disconnectSSE();
  showToast('info', 'Déconnexion', 'Session terminée');
  setTimeout(showLoginModal, 400);
}

function updateUserUI() {
  if (!S.user) return;
  document.getElementById('user-name').textContent   = S.user.nom;
  document.getElementById('user-avatar').textContent = S.user.nom.substring(0, 2).toUpperCase();
  document.getElementById('user-role').textContent   = S.user.role === 'administrateur' ? 'Administrateur' : 'Éleveur';
  document.getElementById('logout-icon').style.display = 'block';
  applyRoleUI(S.user.role);
}

function applyRoleUI(role) {
  const isAdmin = role === 'administrateur';
  document.documentElement.setAttribute('data-role', isAdmin ? 'admin' : 'eleveur');
  if (!isAdmin) {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav && activeNav.dataset.page === 'eleveurs') showPage('dashboard');
  }
}

function showLoginModal()  { document.getElementById('login-modal').classList.add('open'); }
function closeLoginModal() {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('login-error').style.display = 'none';
}

async function submitLogin() {
  const btn = document.getElementById('btn-login');
  btn.textContent = 'Connexion…';
  btn.disabled    = true;
  await login(
    document.getElementById('login-phone').value,
    document.getElementById('login-password').value,
    document.getElementById('login-role').value
  );
  btn.textContent = 'Se connecter';
  btn.disabled    = false;
}
