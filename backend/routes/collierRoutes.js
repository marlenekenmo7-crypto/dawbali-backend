const express = require('express');
const router = express.Router();
const collierController = require('../controllers/collierController');
const { verifyToken } = require('../middleware/auth');

router.get('/',                          verifyToken, collierController.getAllColliers);
router.get('/troupeau/:id_troupeau',     verifyToken, collierController.getCollierByTroupeau);
router.get('/:id',                       verifyToken, collierController.getCollierById);
router.post('/',                         verifyToken, collierController.createCollier);
router.put('/:id/batterie',              verifyToken, collierController.updateBatterie);
router.delete('/:id',                    verifyToken, collierController.deleteCollier);

module.exports = router;
