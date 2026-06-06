const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const { verifyToken } = require('../middleware/auth');

router.get('/',      verifyToken, zoneController.getAllZones);
router.get('/:id',   verifyToken, zoneController.getZoneById);
router.post('/',     verifyToken, zoneController.createZone);
router.put('/:id',   verifyToken, zoneController.updateZone);
router.delete('/:id',verifyToken, zoneController.deleteZone);

module.exports = router;
