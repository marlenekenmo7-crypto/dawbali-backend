const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
dotenv.config();

const initDb = require('./config/initDb');

const troupeauRoutes = require('./routes/troupeauRoutes');
const zoneRoutes     = require('./routes/zoneRoutes');
const alerteRoutes   = require('./routes/alerteRoutes');
const iotRoutes      = require('./routes/iotRoutes');
const eleveurRoutes  = require('./routes/eleveurRoutes');
const collierRoutes  = require('./routes/collierRoutes');
const authRoutes     = require('./routes/authRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500',
     'https://dawbali.netlify.app', 'https://geoalerte-cm.netlify.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── SWAGGER ───────────────────────────────────────────────
try {
  const swaggerUi   = require('swagger-ui-express');
  const swaggerSpec = require('./utils/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
} catch (_) { /* swagger optionnel */ }

// ── ROUTES ────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/eleveurs',  eleveurRoutes);
app.use('/api/troupeaux', troupeauRoutes);
app.use('/api/colliers',  collierRoutes);
app.use('/api/zones',     zoneRoutes);
app.use('/api/alertes',   alerteRoutes);
app.use('/api/iot',       iotRoutes);

// ── SSE : flux d'alertes temps réel ─────────────────────
// Les clients se connectent à /api/events et reçoivent les alertes en push
const sseClients = new Map(); // userId → [res, ...]

app.get('/api/events', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx
  res.flushHeaders();

  // Envoyer un ping immédiat pour confirmer la connexion
  res.write('event: connected\ndata: {"ok":true}\n\n');

  const clientId = Date.now() + '_' + Math.random();
  if (!sseClients.has(token)) sseClients.set(token, new Map());
  sseClients.get(token).set(clientId, res);

  // Ping toutes les 25s pour maintenir la connexion
  const pingTimer = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(pingTimer);
    sseClients.get(token)?.delete(clientId);
  });
});

// Exposer la fonction de broadcast pour le GeofencingService
app.broadcastAlerte = function(alerte, id_eleveur) {
  sseClients.forEach((clients, token) => {
    clients.forEach(res => {
      try {
        res.write(`event: alerte\ndata: ${JSON.stringify(alerte)}\n\n`);
      } catch (_) {}
    });
  });
};

// ── SANTÉ ─────────────────────────────────────────────────
app.get('/',       (_req, res) => res.json({ app: 'GeoAlerte-CM', version: '1.1.0', status: 'running' }));
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ── DÉMARRAGE ─────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ═══════════════════════════════════════════════
  🚀  GeoAlerte-CM démarré sur le port ${PORT}
  📡  API  : http://0.0.0.0:${PORT}/api
  📡  SSE  : http://0.0.0.0:${PORT}/api/events
  ═══════════════════════════════════════════════`);
  });
});

module.exports = app; // export pour les tests
