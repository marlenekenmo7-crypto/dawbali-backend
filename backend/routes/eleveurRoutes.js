const express = require('express');
const router = express.Router();
const eleveurController = require('../controllers/eleveurController');
const { verifyToken } = require('../middleware/auth');

router.get('/',      verifyToken, eleveurController.getAllEleveurs);
router.get('/:id',   verifyToken, eleveurController.getEleveurById);
router.post('/',     verifyToken, eleveurController.createEleveur);
router.put('/:id',   verifyToken, eleveurController.updateEleveur);
router.delete('/:id',verifyToken, eleveurController.deleteEleveur);

module.exports = router;
