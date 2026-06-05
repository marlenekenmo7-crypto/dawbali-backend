const express = require('express');
const router = express.Router();
const collierController = require('../controllers/collierController');

/**
 * @swagger
 * tags:
 *   name: Colliers
 *   description: Gestion des colliers GPS
 */

/**
 * @swagger
 * /api/colliers:
 *   get:
 *     summary: Liste tous les colliers
 *     tags: [Colliers]
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
 *                     $ref: '#/components/schemas/Collier'
 */
router.get('/', collierController.getAllColliers);

/**
 * @swagger
 * /api/colliers/{id}:
 *   get:
 *     summary: Récupérer un collier par son ID (entier)
 *     tags: [Colliers]
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
 *                   $ref: '#/components/schemas/Collier'
 */
router.get('/:id', collierController.getCollierById);

/**
 * @swagger
 * /api/colliers/troupeau/{id_troupeau}:
 *   get:
 *     summary: Récupérer le collier associé à un troupeau
 *     tags: [Colliers]
 *     parameters:
 *       - in: path
 *         name: id_troupeau
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Succès
 */
router.get('/troupeau/:id_troupeau', collierController.getCollierByTroupeau);

/**
 * @swagger
 * /api/colliers:
 *   post:
 *     summary: Créer un nouveau collier (ID auto-généré)
 *     tags: [Colliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_troupeau
 *             properties:
 *               niveau_batterie:
 *                 type: integer
 *                 default: 100
 *               statut:
 *                 type: string
 *                 enum: [actif, inactif]
 *                 default: actif
 *               id_troupeau:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Collier créé
 */
router.post('/', collierController.createCollier);

/**
 * @swagger
 * /api/colliers/{id}/batterie:
 *   put:
 *     summary: Mettre à jour le niveau de batterie d'un collier
 *     tags: [Colliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - niveau_batterie
 *             properties:
 *               niveau_batterie:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Batterie mise à jour
 */
router.put('/:id/batterie', collierController.updateBatterie);

/**
 * @swagger
 * /api/colliers/{id}:
 *   delete:
 *     summary: Supprimer un collier
 *     tags: [Colliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Collier supprimé
 */
router.delete('/:id', collierController.deleteCollier);


// Routes
router.post('/', collierController.createCollier);
router.get('/', collierController.getAllColliers);
router.get('/:id', collierController.getCollierById);
router.get('/troupeau/:id_troupeau', collierController.getCollierByTroupeau);
//router.put('/:id', collierController.updateCollier);
router.put('/:id/batterie', collierController.updateBatterie);
router.delete('/:id', collierController.deleteCollier);

module.exports = router;