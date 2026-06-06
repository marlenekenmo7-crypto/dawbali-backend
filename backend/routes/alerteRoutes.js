const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const alerteController = require('../controllers/alerteController');
const { verifyToken } = require('../middleware/auth');

router.get('/',                        verifyToken, alerteController.getAllAlertes);
router.get('/zone/:id_zone',           verifyToken, alerteController.getAlertesByZone);
router.get('/zone/:id_zone/recentes',  verifyToken, alerteController.getRecentAlertesByZone);
router.get('/zone/:id_zone/stats',     verifyToken, alerteController.getZoneAlertStats);

// Résoudre une alerte
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE alerte SET status = 'resolved', resolved_at = NOW()
       WHERE id_alerte = $1 RETURNING *`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Alerte non trouvée' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
