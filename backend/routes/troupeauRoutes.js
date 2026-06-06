const express = require('express');
const router = express.Router();
const troupeauController = require('../controllers/troupeauController');
const { verifyToken } = require('../middleware/auth');

router.get('/',                          verifyToken, troupeauController.getAllTroupeaux);
router.get('/eleveur/:id_eleveur',       verifyToken, troupeauController.getTroupeauxByEleveur);
router.get('/:id',                       verifyToken, troupeauController.getTroupeauById);
router.post('/',                         verifyToken, troupeauController.createTroupeau);
router.put('/:id',                       verifyToken, troupeauController.updateTroupeau);
router.delete('/:id',                    verifyToken, troupeauController.deleteTroupeau);

module.exports = router;
