const express = require('express');
const router = express.Router();
const eleveurController = require('../controllers/eleveurController');

/**
 * @swagger
 * tags:
 *   name: Éleveurs
 *   description: Gestion des éleveurs
 */

/**
 * @swagger
 * /api/eleveurs:
 *   get:
 *     summary: Récupérer la liste de tous les éleveurs
 *     tags: [Éleveurs]
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
 *                     $ref: '#/components/schemas/Eleveur'
 */
router.get('/', eleveurController.getAllEleveurs);

/**
 * @swagger
 * /api/eleveurs/{id}:
 *   get:
 *     summary: Récupérer un éleveur par son ID
 *     tags: [Éleveurs]
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
 *                   $ref: '#/components/schemas/Eleveur'
 *       404:
 *         description: Éleveur non trouvé
 */
router.get('/:id', eleveurController.getEleveurById);

/**
 * @swagger
 * /api/eleveurs:
 *   post:
 *     summary: Créer un nouvel éleveur
 *     tags: [Éleveurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom_eleveur
 *               - telephone
 *             properties:
 *               nom_eleveur:
 *                 type: string
 *                 example: "Jean Mbarga"
 *               telephone:
 *                 type: string
 *                 example: "699887766"
 *               localite:
 *                 type: string
 *                 example: "Bandjoun"
 *     responses:
 *       201:
 *         description: Éleveur créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Eleveur'
 *       400:
 *         description: Données manquantes ou invalides
 */
router.post('/', eleveurController.createEleveur);

/**
 * @swagger
 * /api/eleveurs/{id}:
 *   put:
 *     summary: Mettre à jour un éleveur
 *     tags: [Éleveurs]
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
 *             properties:
 *               nom_eleveur:
 *                 type: string
 *               telephone:
 *                 type: string
 *               localite:
 *                 type: string
 *     responses:
 *       200:
 *         description: Éleveur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Eleveur'
 *       404:
 *         description: Éleveur non trouvé
 */
router.put('/:id', eleveurController.updateEleveur);

/**
 * @swagger
 * /api/eleveurs/{id}:
 *   delete:
 *     summary: Supprimer un éleveur
 *     tags: [Éleveurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Éleveur supprimé
 *       404:
 *         description: Éleveur non trouvé
 *       400:
 *         description: L'éleveur possède encore des troupeaux (ne peut être supprimé)
 */
router.delete('/:id', eleveurController.deleteEleveur);

router.post('/', eleveurController.createEleveur);
router.get('/', eleveurController.getAllEleveurs);
router.get('/:id', eleveurController.getEleveurById);
router.put('/:id', eleveurController.updateEleveur);
router.delete('/:id', eleveurController.deleteEleveur);

module.exports = router;