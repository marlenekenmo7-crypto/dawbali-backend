/* ════════════════════════════════════════
   API — appel HTTP centralisé
   ════════════════════════════════════════ */
async function api(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = `Bearer ${S.token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(`${CONFIG.apiBase}${endpoint}`, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e.message } };
  }
}
