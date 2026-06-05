const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');

/**
 * @swagger
 * tags:
 *   name: Zones
 *   description: Gestion des zones de géofencing
 */

/**
 * @swagger
 * /api/zones:
 *   get:
 *     summary: Liste toutes les zones actives
 *     tags: [Zones]
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
 *                     $ref: '#/components/schemas/Zone'
 */
router.get('/', zoneController.getAllZones);

/**
 * @swagger
 * /api/zones/{id}:
 *   get:
 *     summary: Récupérer une zone par son ID
 *     tags: [Zones]
 *     parameters:
 *       - in: path
 *         name: id
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
 *                   $ref: '#/components/schemas/Zone'
 */
router.get('/:id', zoneController.getZoneById);

/**
 * @swagger
 * /api/zones:
 *   post:
 *     summary: Créer une nouvelle zone
 *     tags: [Zones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom_zone
 *               - type_zone
 *               - forme_geographique
 *             properties:
 *               nom_zone:
 *                 type: string
 *               type_zone:
 *                 type: string
 *                 enum: [agricole, pastorale, interdite, tampon]
 *               forme_geographique:
 *                 type: object
 *                 description: GeoJSON Polygon
 *                 example: { "type": "Polygon", "coordinates": [[[10.35,5.72],[10.38,5.72],[10.38,5.75],[10.35,5.75],[10.35,5.72]]] }
 *               description_zone:
 *                 type: string
 *               rayon_alerte_approche:
 *                 type: integer
 *                 default: 500
 *     responses:
 *       201:
 *         description: Zone créée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Zone'
 */
router.post('/', zoneController.createZone);

/**
 * @swagger
 * /api/zones/{id}:
 *   put:
 *     summary: Mettre à jour une zone
 *     tags: [Zones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom_zone:
 *                 type: string
 *               type_zone:
 *                 type: string
 *               rayon_alerte_approche:
 *                 type: integer
 *               actif:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Zone mise à jour
 */
router.put('/:id', zoneController.updateZone);

/**
 * @swagger
 * /api/zones/{id}:
 *   delete:
 *     summary: Désactiver (soft delete) une zone
 *     tags: [Zones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zone désactivée
 */
router.delete('/:id', zoneController.deleteZone);


// Routes
router.post('/', zoneController.createZone);
router.get('/', zoneController.getAllZones);
router.get('/:id', zoneController.getZoneById);
router.put('/:id', zoneController.updateZone);
router.delete('/:id', zoneController.deleteZone);

module.exports = router;