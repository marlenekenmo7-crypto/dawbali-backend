const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

/**
 * @swagger
 * tags:
 *   name: IoT
 *   description: Ingestion des données GPS des colliers
 */

/**
 * @swagger
 * /api/iot/gps:
 *   post:
 *     summary: Envoyer une position GPS (depuis le collier)
 *     tags: [IoT]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - id_troupeau
 *               - longitude
 *               - latitude
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: Clé API IoT (définie dans .env)
 *               id_troupeau:
 *                 type: integer
 *               longitude:
 *                 type: number
 *                 format: float
 *               latitude:
 *                 type: number
 *                 format: float
 *               precision_pos:
 *                 type: integer
 *                 default: 10
 *               direction:
 *                 type: number
 *               niveau_batterie:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Position enregistrée, alertes générées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 alertes_generees:
 *                   type: integer
 *                 alertes:
 *                   type: array
 *       401:
 *         description: Clé API invalide
 *       404:
 *         description: Troupeau non trouvé
 */
router.post('/gps', iotController.ingestGPS);

/**
 * @swagger
 * /api/iot/position/{id_troupeau}:
 *   get:
 *     summary: Dernière position connue d'un troupeau
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: id_troupeau
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PositionGPS'
 */
router.get('/position/:id_troupeau', iotController.getLastPosition);

/**
 * @swagger
 * /api/iot/history/{id_troupeau}:
 *   get:
 *     summary: Historique des positions d'un troupeau
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: id_troupeau
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre maximum de positions
 *     responses:
 *       200:
 *         description: Succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PositionGPS'
 */
router.get('/history/:id_troupeau', iotController.getHistory);


router.post('/gps', iotController.ingestGPS);
router.get('/position/:id_troupeau', iotController.getLastPosition);
router.get('/history/:id_troupeau', iotController.getHistory);

module.exports = router;