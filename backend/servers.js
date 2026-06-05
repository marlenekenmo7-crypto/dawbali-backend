const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Importer les routes
const troupeauRoutes = require('./routes/troupeauRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const alerteRoutes = require('./routes/alerteRoutes');
const iotRoutes = require('./routes/iotRoutes');
const eleveurRoutes = require('./routes/eleveurRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/troupeaux', troupeauRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/alertes', alerteRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/eleveurs', eleveurRoutes);

// Route principale
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Dawbali - Système d\'alerte agro-pastoral',
    version: '1.0.0',
    endpoints: {
      eleveurs: '/api/eleveurs',
      troupeaux: '/api/troupeaux',
      zones: '/api/zones',
      alertes: '/api/alertes',
      iot: '/api/iot/gps'
    }
  });
});

// Route santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`
  ═══════════════════════════════════════════════════════
  🚀 Serveur Dawbali démarré !
  ═══════════════════════════════════════════════════════
  📍 URL: http://localhost:${PORT}
  📡 API: http://localhost:${PORT}/api
  ═══════════════════════════════════════════════════════
  `);
});