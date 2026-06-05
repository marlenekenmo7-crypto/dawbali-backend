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
const collierRoutes = require('./routes/collierRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./utils/swagger');

// ... 
app.use(express.urlencoded({ extended: true }));

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// Routes de l'API
app.use('/api/eleveurs', eleveurRoutes);
// ...

// Routes
app.use('/api/troupeaux', troupeauRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/alertes', alerteRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/eleveurs', eleveurRoutes);
app.use('/api/colliers', collierRoutes);
app.use('/api/auth', authRoutes);

// Route principale
app.get('/', (req, res) => {
  res.json({
    message: 'API Dawbali - Système d\'alerte agro-pastoral',
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ═══════════════════════════════════════════════════════
  🚀 Serveur Dawbali démarré !
  ═══════════════════════════════════════════════════════
  📍 URL: http://0.0.0.0:${PORT}
  📡 API: http://0.0.0.0:${PORT}/api
  ═══════════════════════════════════════════════════════
  `);
});