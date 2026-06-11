/* ════════════════════════════════════════
   MAP — Leaflet, zones, trajectoire
   ════════════════════════════════════════ */
function initMap() {
  if (S.map) { S.map.invalidateSize(); return; }

  S.map = L.map('map').setView([7.5, 13.8], 7);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  L.tileLayer(tileUrl, { attribution: '© CartoDB', maxZoom: 19 }).addTo(S.map);

  drawZonesOnMap();
  updateMapPositions();

  if (S.mapTimer) clearInterval(S.mapTimer);
  S.mapTimer = setInterval(updateMapPositions, CONFIG.mapInterval * 1000);
}

function drawZonesOnMap() {
  if (!S.map) return;
  S.zonePolygons.forEach(l => S.map.removeLayer(l));
  S.zonePolygons = [];
  if (!S.showZones) return;

  S.allZones.forEach(zone => {
    if (!zone.geometrie) return;
    try {
      const geo    = typeof zone.geometrie === 'string' ? JSON.parse(zone.geometrie) : zone.geometrie;
      const isTrans = zone.type_zone === 'transhumance';
      const color  = isTrans ? '#22C55E' : '#EF4444';
      const layer  = L.geoJSON(geo, {
        style: {
          color, fillColor: color, fillOpacity: 0.15, weight: 2,
          dashArray: isTrans ? '6,4' : null,
        }
      })
        .bindPopup(`<b>${zone.nom_zone}</b><br><span style="font-size:11px;color:var(--text2);">${zone.type_zone} · Rayon ${zone.rayon_alerte_approche || 500}m</span>`)
        .addTo(S.map);
      S.zonePolygons.push(layer);
    } catch (_) {}
  });
}

function toggleZonesOnMap() {
  S.showZones = !S.showZones;
  const btn = document.getElementById('btn-toggle-zones');
  if (btn) btn.textContent = S.showZones ? '◫ Masquer zones' : '◫ Afficher zones';
  drawZonesOnMap();
}

async function updateMapPositions() {
  if (!S.map || !S.token) return;

  S.markers.forEach(m => S.map.removeLayer(m));
  S.markers = [];

  const herds = S.allHerds.length ? S.allHerds : ((await api('/troupeaux')).data?.data || []);

  for (const herd of herds.slice(0, 50)) {
    const { data } = await api(`/iot/position/${herd.id_troupeau}`);
    if (!data?.data?.latitude) continue;

    const hasPending = S.allAlerts.some(
      a => a.status === 'pending' && String(a.id_troupeau || '') === String(herd.id_troupeau)
    );
    const color = hasPending ? '#EF4444' : '#22C55E';

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.7);box-shadow:0 2px 6px rgba(0,0,0,.6);cursor:pointer;"></div>`,
      iconSize: [13, 13], iconAnchor: [6, 6],
    });

    const marker = L.marker([data.data.latitude, data.data.longitude], { icon })
      .addTo(S.map)
      .on('click', () => selectHerdOnMap(herd));
    S.markers.push(marker);
  }

  // Afficher/masquer le bandeau "pas de données GPS"
  const noData = document.getElementById('map-no-data');
  if (noData) noData.style.display = S.markers.length === 0 ? 'flex' : 'none';

  setEl('map-last-update', new Date().toLocaleTimeString('fr-FR'));
}

function selectHerdOnMap(herd) {
  S.selectedHerd = herd;
  const panel = document.getElementById('map-herd-panel');
  const info  = document.getElementById('map-herd-info');
  if (!panel || !info) return;
  panel.style.display = 'block';

  const elev = S.eleveurMap[herd.id_eleveur];
  info.innerHTML = `
    <div style="font-weight:600;color:var(--text);margin-bottom:4px;">${herd.nom_troupeau}</div>
    <div>Éleveur : ${elev ? elev.nom : '#' + herd.id_eleveur}</div>
    <div>Effectif : ${herd.taille || 0} têtes</div>`;

  const btn = document.getElementById('btn-show-trajectory');
  if (btn) btn.onclick = () => showTrajectory(herd.id_troupeau);
}

async function showTrajectory(id) {
  if (S.trajLayer) { S.map.removeLayer(S.trajLayer); S.trajLayer = null; }

  const { ok, data } = await api(`/iot/history/${id}`);
  if (!ok || !data.data?.length) {
    showToast('info', 'Pas de trajectoire', 'Aucun historique GPS disponible');
    return;
  }

  const pts = data.data
    .map(p => [p.latitude, p.longitude])
    .filter(p => p[0] && p[1]);

  if (pts.length < 2) {
    showToast('info', 'Trajectoire trop courte', `${pts.length} point(s) disponible(s)`);
    return;
  }

  S.trajLayer = L.polyline(pts, { color: '#F0A030', weight: 3, opacity: .8, dashArray: '8,4' }).addTo(S.map);
  S.map.fitBounds(S.trajLayer.getBounds(), { padding: [40, 40] });
  showToast('ok', 'Trajectoire affichée', `${pts.length} positions chargées`);
}

function viewHerdOnMap(id) {
  showPage('map');
  const herd = S.allHerds.find(h => h.id_troupeau === id);
  if (herd) setTimeout(() => selectHerdOnMap(herd), 300);
}

function centerMap() {
  if (S.map) S.map.setView([7.5, 13.8], 7);
  if (S.trajLayer) { S.map.removeLayer(S.trajLayer); S.trajLayer = null; }
  const panel = document.getElementById('map-herd-panel');
  if (panel) panel.style.display = 'none';
}

async function simulateHerd() {
  const herds = S.allHerds;
  if (!herds.length) {
    showToast('warn', 'Simulation impossible', 'Aucun troupeau disponible');
    return;
  }

  // Si un troupeau est sélectionné sur la carte, l'utiliser ; sinon prendre le premier
  const herd = S.selectedHerd || herds[0];
  const btn  = document.getElementById('btn-simulate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Simulation…'; }

  const { ok, data } = await api(`/iot/simulate/${herd.id_troupeau}`, 'POST');

  if (btn) { btn.disabled = false; btn.textContent = '▶ Simuler'; }

  if (!ok) {
    showToast('danger', 'Erreur simulation', data.error || 'Échec');
    return;
  }

  showToast('ok', 'Simulation réussie', `${data.message} · ${herd.nom_troupeau}`);

  // Rafraîchir carte + alertes après un court délai (le géofencing est async côté serveur)
  setTimeout(async () => {
    await updateMapPositions();
    if (data.waypoints?.length >= 2) {
      const pts = data.waypoints.map(w => [w.lat, w.lon]);
      if (S.trajLayer) S.map.removeLayer(S.trajLayer);
      S.trajLayer = L.polyline(pts, { color: '#F0A030', weight: 3, opacity: .85, dashArray: '8,4' }).addTo(S.map);
      S.map.fitBounds(S.trajLayer.getBounds(), { padding: [60, 60] });
    }
  }, 800);

  setTimeout(() => fetchAlerts(), 1500);
}
