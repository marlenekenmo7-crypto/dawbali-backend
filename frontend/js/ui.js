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
  document.getElementById('eleveur-error').style.display = 'none';
  setEl('eleveur-modal-title', 'Nouvel éleveur');
  document.getElementById('eleveur-modal').classList.add('open');
}

function editEleveur(id) {
  const e = S.allEleveurs.find(x => x.id_eleveur === id);
  if (!e) return;
  document.getElementById('eleveur-id').value        = e.id_eleveur;
  document.getElementById('eleveur-nom').value       = e.nom       || '';
  document.getElementById('eleveur-tel').value       = e.telephone || '';
  document.getElementById('eleveur-localite').value  = e.localite  || '';
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

  const payload   = { nom, telephone, localite };
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

// ── SIDEBAR MOBILE ────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay').classList.toggle('visible');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}
