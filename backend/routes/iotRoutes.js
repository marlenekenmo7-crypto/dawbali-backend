const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');
const { verifyToken } = require('../middleware/auth');

// Ingestion GPS depuis un collier physique (clé API IoT — pas de JWT)
router.post('/gps', iotController.ingestGPS);

// Dernière position connue d'un troupeau
router.get('/position/:id_troupeau', verifyToken, iotController.getLastPosition);

// Historique des positions d'un troupeau
router.get('/history/:id_troupeau', verifyToken, iotController.getHistory);

// Simulation de déplacement GPS vers la zone la plus proche
router.post('/simulate/:id_troupeau', verifyToken, iotController.simulateMovement);

module.exports = router;
