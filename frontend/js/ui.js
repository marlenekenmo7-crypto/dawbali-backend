/* ════════════════════════════════════════
   UI — toasts, modals, settings, éleveurs CRUD
   ════════════════════════════════════════ */

// ── TOAST ─────────────────────────────
function showToast(type, title, msg, ms = 4000) {
  const icons = { ok: '✓', warn: '⚠', danger: '✕', info: 'i' };
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || 'i'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
    <span class="toast-close" onclick="this.closest('.toast').remove()">×</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.cssText = 'opacity:0;transform:translateX(110%);transition:all .3s';
    setTimeout(() => el.remove(), 300);
  }, ms);
}

// ── CONFIRM MODAL ─────────────────────
function showConfirm(title, message, onOk, danger = true) {
  setEl('confirm-title',   title);
  setEl('confirm-message', message);
  const btn = document.getElementById('confirm-ok-btn');
  btn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
  btn.onclick   = () => { closeConfirm(); onOk(); };
  document.getElementById('confirm-modal').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirm-modal').classList.remove('open');
}

// ── ÉLEVEURS CRUD ─────────────────────
function openEleveurModal() {
  document.getElementById('eleveur-id').value        = '';
  document.getElementById('eleveur-nom').value       = '';
  document.getElementById('eleveur-tel').value       = '';
  document.getElementById('eleveur-localite').value  = '';
  document.getElementById('eleveur-mdp').value       = '';
  document.getElementById('eleveur-error').style.display = 'none';
  setEl('eleveur-modal-title', 'Nouvel éleveur');
  document.getElementById('eleveur-modal').classList.add('open');
}

function editEleveur(id) {
  const e = S.allEleveurs.find(x => x.id_eleveur === id);
  if (!e) return;
  document.getElementById('eleveur-id').value        = e.id_eleveur;
  document.getElementById('eleveur-nom').value       = e.nom_eleveur || '';
  document.getElementById('eleveur-tel').value       = e.telephone || '';
  document.getElementById('eleveur-localite').value  = e.localite  || '';
  document.getElementById('eleveur-mdp').value       = '';
  document.getElementById('eleveur-error').style.display = 'none';
  setEl('eleveur-modal-title', 'Modifier éleveur');
  document.getElementById('eleveur-modal').classList.add('open');
}

function closeEleveurModal() {
  document.getElementById('eleveur-modal').classList.remove('open');
}

async function saveEleveur() {
  const id        = document.getElementById('eleveur-id').value;
  const nom       = document.getElementById('eleveur-nom').value.trim();
  const telephone = document.getElementById('eleveur-tel').value.trim();
  const localite  = document.getElementById('eleveur-localite').value.trim();

  if (!nom) {
    const errEl = document.getElementById('eleveur-error');
    errEl.textContent  = 'Le nom est requis';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('btn-save-eleveur');
  btn.textContent = 'Enregistrement…';
  btn.disabled    = true;

  const mdp = document.getElementById('eleveur-mdp').value;
  const payload = { nom_eleveur: nom, telephone, localite };
  if (mdp) payload.mot_de_passe = mdp;
  const { ok, data } = id
    ? await api(`/eleveurs/${id}`, 'PUT',  payload)
    : await api('/eleveurs',       'POST', payload);

  btn.textContent = 'Enregistrer';
  btn.disabled    = false;

  if (ok) {
    closeEleveurModal();
    await fetchEleveurs();
    showToast('ok', id ? 'Éleveur modifié' : 'Éleveur créé', nom);
  } else {
    const errEl = document.getElementById('eleveur-error');
    errEl.textContent  = data.error || 'Erreur lors de l\'enregistrement';
    errEl.style.display = 'block';
  }
}

function deleteEleveur(id, nom) {
  showConfirm(
    'Supprimer éleveur',
    `Supprimer "${nom}" ? Cette action est irréversible.`,
    async () => {
      const { ok } = await api(`/eleveurs/${id}`, 'DELETE');
      if (ok) { await fetchEleveurs(); showToast('ok', 'Éleveur supprimé', nom); }
      else showToast('danger', 'Erreur', 'Impossible de supprimer cet éleveur');
    }
  );
}

// ── PARAMÈTRES ────────────────────────
function loadSettings() {
  const apiInput = document.getElementById('cfg-api-url');
  const mapInt   = document.getElementById('cfg-map-interval');
  const batThr   = document.getElementById('cfg-bat-threshold');
  if (apiInput) apiInput.value = CONFIG.apiBase;
  if (mapInt)   mapInt.value   = String(CONFIG.mapInterval);
  if (batThr)   batThr.value   = String(CONFIG.batThreshold);
}

function saveApiUrl() {
  const val = document.getElementById('cfg-api-url')?.value.trim();
  if (!val) return;
  localStorage.setItem('apiBase', val);
  showToast('ok', 'URL sauvegardée', 'Rechargez la page pour appliquer');
}

async function testApiConnection() {
  const { ok } = await api('/health');
  showToast(ok ? 'ok' : 'danger', ok ? 'Connexion OK' : 'Connexion échouée', CONFIG.apiBase);
}

function saveMapInterval() {
  const val = document.getElementById('cfg-map-interval')?.value;
  if (!val) return;
  localStorage.setItem('mapInterval', val);
  if (S.mapTimer) { clearInterval(S.mapTimer); S.mapTimer = null; }
  if (S.map) S.mapTimer = setInterval(updateMapPositions, parseInt(val) * 1000);
  showToast('ok', 'Intervalle mis à jour', `Actualisation toutes les ${val}s`);
}

function saveBatThreshold() {
  const val = parseInt(document.getElementById('cfg-bat-threshold')?.value);
  if (isNaN(val) || val < 5 || val > 50) {
    showToast('warn', 'Valeur invalide', 'Entre 5 et 50 %');
    return;
  }
  localStorage.setItem('batThreshold', val);
  showToast('ok', 'Seuil mis à jour', `Alerte critique sous ${val} %`);
}

// ── INSCRIPTION ───────────────────────
function openRegisterModal() {
  ['reg-nom','reg-tel','reg-localite','reg-mdp'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('reg-error').style.display = 'none';
  closeLoginModal();
  document.getElementById('register-modal').classList.add('open');
}
function closeRegisterModal() {
  document.getElementById('register-modal').classList.remove('open');
}
async function submitRegister() {
  const nom      = document.getElementById('reg-nom').value.trim();
  const tel      = document.getElementById('reg-tel').value.trim();
  const localite = document.getElementById('reg-localite').value.trim();
  const mdp      = document.getElementById('reg-mdp').value;
  const errEl    = document.getElementById('reg-error');

  if (!nom || !tel || !mdp) {
    errEl.textContent = 'Nom, téléphone et mot de passe sont requis';
    errEl.style.display = 'block'; return;
  }
  const btn = document.getElementById('btn-register');
  btn.textContent = 'Inscription…'; btn.disabled = true;

  const { ok, data } = await api('/auth/register', 'POST', { nom_eleveur: nom, telephone: tel, mot_de_passe: mdp, localite });
  btn.textContent = "S'inscrire"; btn.disabled = false;

  if (ok) {
    S.token = data.token; S.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    updateUserUI();
    closeRegisterModal();
    refreshAll();
    showToast('ok', 'Compte créé', `Bienvenue, ${data.user.nom} !`);
  } else {
    errEl.textContent = data.error || 'Erreur lors de l\'inscription';
    errEl.style.display = 'block';
  }
}

// ── TROUPEAUX CRUD ────────────────────
function openTroupeauModal() {
  document.getElementById('troupeau-id').value    = '';
  document.getElementById('troupeau-nom').value   = '';
  document.getElementById('troupeau-taille').value= '';
  document.getElementById('troupeau-error').style.display = 'none';
  setEl('troupeau-modal-title', 'Nouveau troupeau');
  _populateEleveurSelect();
  document.getElementById('troupeau-modal').classList.add('open');
}
function editTroupeau(id) {
  const t = S.allHerds.find(x => x.id_troupeau === id);
  if (!t) return;
  document.getElementById('troupeau-id').value     = t.id_troupeau;
  document.getElementById('troupeau-nom').value    = t.nom_troupeau || '';
  document.getElementById('troupeau-taille').value = t.taille || '';
  document.getElementById('troupeau-error').style.display = 'none';
  setEl('troupeau-modal-title', 'Modifier troupeau');
  _populateEleveurSelect(t.id_eleveur);
  document.getElementById('troupeau-modal').classList.add('open');
}
function closeTroupeauModal() {
  document.getElementById('troupeau-modal').classList.remove('open');
}
function _populateEleveurSelect(selectedId) {
  const sel = document.getElementById('troupeau-eleveur');
  sel.innerHTML = S.allEleveurs.map(e =>
    `<option value="${e.id_eleveur}" ${e.id_eleveur == selectedId ? 'selected' : ''}>${e.nom_eleveur}</option>`
  ).join('');
}
async function saveTroupeau() {
  const id       = document.getElementById('troupeau-id').value;
  const nom      = document.getElementById('troupeau-nom').value.trim();
  const taille   = parseInt(document.getElementById('troupeau-taille').value) || 0;
  const eleveur  = document.getElementById('troupeau-eleveur').value;
  const errEl    = document.getElementById('troupeau-error');

  if (!nom) { errEl.textContent = 'Le nom est requis'; errEl.style.display = 'block'; return; }

  const btn = document.getElementById('btn-save-troupeau');
  btn.textContent = 'Enregistrement…'; btn.disabled = true;

  const payload = { nom_troupeau: nom, taille, id_eleveur: parseInt(eleveur) };
  const { ok, data } = id
    ? await api(`/troupeaux/${id}`, 'PUT',  { nom_troupeau: nom, taille })
    : await api('/troupeaux',       'POST', payload);

  btn.textContent = 'Enregistrer'; btn.disabled = false;

  if (ok) {
    closeTroupeauModal();
    await fetchHerds();
    showToast('ok', id ? 'Troupeau modifié' : 'Troupeau créé', nom);
  } else {
    errEl.textContent = data.error || 'Erreur lors de l\'enregistrement';
    errEl.style.display = 'block';
  }
}
function deleteTroupeau(id, nom) {
  showConfirm('Supprimer troupeau', `Supprimer "${nom}" ? Cette action est irréversible.`, async () => {
    const { ok } = await api(`/troupeaux/${id}`, 'DELETE');
    if (ok) { await fetchHerds(); showToast('ok', 'Troupeau supprimé', nom); }
    else showToast('danger', 'Erreur', 'Impossible de supprimer ce troupeau');
  });
}

// ── COLLIERS CRUD ─────────────────────
function openCollierModal() {
  document.getElementById('collier-id').value       = '';
  document.getElementById('collier-batterie').value = '100';
  document.getElementById('collier-statut').value   = 'actif';
  document.getElementById('collier-error').style.display = 'none';
  setEl('collier-modal-title', 'Nouveau collier');
  _populateTroupeauSelect();
  document.getElementById('collier-modal').classList.add('open');
}
function editCollier(id) {
  const c = S.allDevices.find(x => x.id_collier === id);
  if (!c) return;
  document.getElementById('collier-id').value       = c.id_collier;
  document.getElementById('collier-batterie').value = c.niveau_batterie || 100;
  document.getElementById('collier-statut').value   = c.statut || 'actif';
  document.getElementById('collier-error').style.display = 'none';
  setEl('collier-modal-title', 'Modifier collier');
  _populateTroupeauSelect(c.id_troupeau);
  document.getElementById('collier-modal').classList.add('open');
}
function closeCollierModal() {
  document.getElementById('collier-modal').classList.remove('open');
}
function _populateTroupeauSelect(selectedId) {
  const sel = document.getElementById('collier-troupeau');
  sel.innerHTML = '<option value="">— Aucun —</option>' + S.allHerds.map(h =>
    `<option value="${h.id_troupeau}" ${h.id_troupeau == selectedId ? 'selected' : ''}>${h.nom_troupeau}</option>`
  ).join('');
}
async function saveCollier() {
  const id       = document.getElementById('collier-id').value;
  const troupeau = document.getElementById('collier-troupeau').value;
  const statut   = document.getElementById('collier-statut').value;
  const batterie = parseInt(document.getElementById('collier-batterie').value) || 100;
  const errEl    = document.getElementById('collier-error');

  const btn = document.getElementById('btn-save-collier');
  btn.textContent = 'Enregistrement…'; btn.disabled = true;

  let ok, data;
  if (id) {
    ({ ok, data } = await api(`/colliers/${id}/batterie`, 'PUT', { niveau_batterie: batterie }));
  } else {
    if (!troupeau) { errEl.textContent = 'Sélectionnez un troupeau'; errEl.style.display = 'block'; btn.textContent = 'Enregistrer'; btn.disabled = false; return; }
    ({ ok, data } = await api('/colliers', 'POST', { id_troupeau: parseInt(troupeau), statut, niveau_batterie: batterie }));
  }

  btn.textContent = 'Enregistrer'; btn.disabled = false;

  if (ok) {
    closeCollierModal();
    await fetchDevices();
    showToast('ok', id ? 'Collier mis à jour' : 'Collier créé', '');
  } else {
    errEl.textContent = data.error || 'Erreur lors de l\'enregistrement';
    errEl.style.display = 'block';
  }
}
function deleteCollier(id) {
  showConfirm('Supprimer collier', `Supprimer le collier #${id} ?`, async () => {
    const { ok } = await api(`/colliers/${id}`, 'DELETE');
    if (ok) { await fetchDevices(); showToast('ok', 'Collier supprimé', ''); }
    else showToast('danger', 'Erreur', 'Impossible de supprimer ce collier');
  });
}

// ── SIDEBAR MOBILE ────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay').classList.toggle('visible');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}
