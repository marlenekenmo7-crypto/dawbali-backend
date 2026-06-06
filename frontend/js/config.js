/* ════════════════════════════════════════
   CONFIG — paramètres persistés
   ════════════════════════════════════════ */
const CONFIG = {
  get apiBase()      { return localStorage.getItem('apiBase')      || 'https://dawbali-backend.onrender.com/api'; },
  get batThreshold() { return parseInt(localStorage.getItem('batThreshold') || '20'); },
  get mapInterval()  { return parseInt(localStorage.getItem('mapInterval')  || '30'); },
};

/* ════════════════════════════════════════
   STATE — état runtime de l'application
   ════════════════════════════════════════ */
const S = {
  token:        null,
  user:         null,
  map:          null,
  markers:      [],
  zonePolygons: [],
  trajLayer:    null,
  mapTimer:     null,
  showZones:    true,
  allAlerts:    [],
  allHerds:     [],
  allDevices:   [],
  allZones:     [],
  allEleveurs:  [],
  eleveurMap:   {},   // id_eleveur → objet éleveur
  charts:       {},
  selectedHerd: null,
};

/* ════════════════════════════════════════
   CONSTANTES
   ════════════════════════════════════════ */
const ALERT_ICONS = {
  ENTREE_ZONE:   { icon: '↘', cls: 'danger' },
  APPROCHE_ZONE: { icon: '!',  cls: 'warn'   },
  SORTIE_ZONE:   { icon: '↗', cls: 'info'   },
  BATTERIE:      { icon: '⚡', cls: 'warn'   },
};

const PAGE_META = {
  dashboard: { title: 'Tableau de bord', path: 'Vue générale',              id: 'dashboard' },
  map:       { title: 'Carte en direct', path: 'Suivi GPS temps réel',      id: 'map-page'  },
  alerts:    { title: 'Alertes',         path: 'Historique des événements', id: 'alerts'    },
  eleveurs:  { title: 'Éleveurs',        path: 'Gestion',                   id: 'eleveurs'  },
  herds:     { title: 'Troupeaux',       path: 'Gestion',                   id: 'herds'     },
  devices:   { title: 'Dispositifs IoT', path: 'Colliers GPS/GSM',          id: 'devices'   },
  zones:     { title: 'Zones protégées', path: 'Géorepérage',               id: 'zones'     },
  reports:   { title: 'Rapports',        path: 'Statistiques & Analyse',    id: 'reports'   },
  settings:  { title: 'Paramètres',      path: 'Configuration système',     id: 'settings'  },
};

/* ════════════════════════════════════════
   UTILITAIRES DOM partagés
   ════════════════════════════════════════ */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}

function loading(html = '') {
  return html || '<div class="loading"><div class="spinner"></div> Chargement…</div>';
}

/* ════════════════════════════════════════
   THÈME — bascule clair / sombre
   ════════════════════════════════════════ */
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = next === 'light' ? '☀' : '🌙';
}

(function applyTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = saved === 'light' ? '☀' : '🌙';
  });
})();
