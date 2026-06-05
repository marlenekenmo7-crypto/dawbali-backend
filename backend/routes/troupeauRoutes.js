const express = require('express');
const router = express.Router();
const troupeauController = require('../controllers/troupeauController');

/**
 * @swagger
 * tags:
 *   name: Troupeaux
 *   description: Gestion des troupeaux
 */

/**
 * @swagger
 * /api/troupeaux:
 *   get:
 *     summary: Liste tous les troupeaux
 *     tags: [Troupeaux]
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
 *                     $ref: '#/components/schemas/Troupeau'
 */
router.get('/', troupeauController.getAllTroupeaux);

/**
 * @swagger
 * /api/troupeaux/{id}:
 *   get:
 *     summary: Récupérer un troupeau par son ID
 *     tags: [Troupeaux]
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
 *                   $ref: '#/components/schemas/Troupeau'
 *       404:
 *         description: Troupeau non trouvé
 */
router.get('/:id', troupeauController.getTroupeauById);

/**
 * @swagger
 * /api/troupeaux/eleveur/{id_eleveur}:
 *   get:
 *     summary: Liste des troupeaux d'un éleveur
 *     tags: [Troupeaux]
 *     parameters:
 *       - in: path
 *         name: id_eleveur
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Troupeau'
 */
router.get('/eleveur/:id_eleveur', troupeauController.getTroupeauxByEleveur);

/**
 * @swagger
 * /api/troupeaux:
 *   post:
 *     summary: Créer un nouveau troupeau
 *     tags: [Troupeaux]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom_troupeau
 *               - id_eleveur
 *             properties:
 *               nom_troupeau:
 *                 type: string
 *                 example: "Troupeau Bandjoun"
 *               taille:
 *                 type: integer
 *                 example: 50
 *               id_eleveur:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Troupeau créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Troupeau'
 */
router.post('/', troupeauController.createTroupeau);

/**
 * @swagger
 * /api/troupeaux/{id}:
 *   put:
 *     summary: Mettre à jour un troupeau
 *     tags: [Troupeaux]
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
 *               nom_troupeau:
 *                 type: string
 *               taille:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Mise à jour réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Troupeau'
 */
router.put('/:id', troupeauController.updateTroupeau);

/**
 * @swagger
 * /api/troupeaux/{id}:
 *   delete:
 *     summary: Supprimer un troupeau
 *     tags: [Troupeaux]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Troupeau supprimé
 *       404:
 *         description: Troupeau non trouvé
 *       400:
 *         description: Le troupeau a des positions associées (ne peut être supprimé)
 */
router.delete('/:id', troupeauController.deleteTroupeau);


// Vérification que le contrôleur est bien chargé
console.log('🔍 Vérification troupeauController:', Object.keys(troupeauController));

// Routes
router.post('/', troupeauController.createTroupeau);
router.get('/', troupeauController.getAllTroupeaux);
router.get('/eleveur/:id_eleveur', troupeauController.getTroupeauxByEleveur);
router.get('/:id', troupeauController.getTroupeauById);
router.put('/:id', troupeauController.updateTroupeau);
router.delete('/:id', troupeauController.deleteTroupeau);

module.exports = router;