const express = require('express');
const router = express.Router();
const eleveurController = require('../controllers/eleveurController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/',       verifyToken, isAdmin, eleveurController.getAllEleveurs);
router.get('/:id',    verifyToken, eleveurController.getEleveurById);
router.post('/',      verifyToken, isAdmin, eleveurController.createEleveur);
router.put('/:id',    verifyToken, eleveurController.updateEleveur);
router.delete('/:id', verifyToken, isAdmin, eleveurController.deleteEleveur);

module.exports = router;
