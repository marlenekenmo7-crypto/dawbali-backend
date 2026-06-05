const express = require('express');
const router = express.Router();
const alerteController = require('../controllers/alerteController');

/**
 * @swagger
 * tags:
 *   name: Alertes
 *   description: Gestion des alertes générées par le géofencing
 */

/**
 * @swagger
 * /api/alertes:
 *   get:
 *     summary: Liste de toutes les alertes
 *     tags: [Alertes]
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alerte'
 */
router.get('/', alerteController.getAllAlertes);

/**
 * @swagger
 * /api/alertes/zone/{id_zone}:
 *   get:
 *     summary: Alertes d'une zone spécifique
 *     tags: [Alertes]
 *     parameters:
 *       - in: path
 *         name: id_zone
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
 *                 zone:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alerte'
 */
router.get('/zone/:id_zone', alerteController.getAlertesByZone);

/**
 * @swagger
 * /api/alertes/zone/{id_zone}/recentes:
 *   get:
 *     summary: Alertes récentes d'une zone (dernières heures)
 *     tags: [Alertes]
 *     parameters:
 *       - in: path
 *         name: id_zone
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: heures
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Nombre d'heures dans le passé
 *     responses:
 *       200:
 *         description: Succès
 */
router.get('/zone/:id_zone/recentes', alerteController.getRecentAlertesByZone);

/**
 * @swagger
 * /api/alertes/zone/{id_zone}/stats:
 *   get:
 *     summary: Statistiques d'alertes pour une zone
 *     tags: [Alertes]
 *     parameters:
 *       - in: path
 *         name: id_zone
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
 *                   type: object
 *                   properties:
 *                     total_alertes: { type: integer }
 *                     entrees_zone: { type: integer }
 *                     approches_zone: { type: integer }
 *                     alertes_non_resolues: { type: integer }
 */
router.get('/zone/:id_zone/stats', alerteController.getZoneAlertStats);

// Routes
router.get('/', alerteController.getAllAlertes);
router.get('/zone/:id_zone', alerteController.getAlertesByZone);
router.get('/zone/:id_zone/recentes', alerteController.getRecentAlertesByZone);
router.get('/zone/:id_zone/stats', alerteController.getZoneAlertStats);

module.exports = router;