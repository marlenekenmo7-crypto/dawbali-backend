const pool = require('../config/database');

const API_KEY_IOT = process.env.API_KEY_IOT || 'dawbali_iot_key_2024';

const iotController = {
  // Ingestion GPS
  async ingestGPS(req, res) {
    try {
      const { api_key, id_troupeau, longitude, latitude, precision_pos, direction, niveau_batterie } = req.body;

      if (api_key !== API_KEY_IOT) {
        return res.status(401).json({ success: false, error: 'Clé API invalide' });
      }
      if (!id_troupeau || longitude === undefined || latitude === undefined) {
        return res.status(400).json({ success: false, error: 'id_troupeau, longitude et latitude requis' });
      }

      // Vérifier existence du troupeau
      const troupeauCheck = await pool.query('SELECT id_troupeau FROM troupeau WHERE id_troupeau = $1', [id_troupeau]);
      if (troupeauCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Troupeau non trouvé' });
      }

      // Insertion position
      const result = await pool.query(
        `INSERT INTO position_troup (id_troupeau, position, dateh, precision_pos, direction, created_at)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), NOW(), $4, $5, NOW())
         RETURNING id_troupeau, ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude, dateh`,
        [id_troupeau, longitude, latitude, precision_pos || 10, direction || 0]
      );

      // Mise à jour batterie (optionnel)
      if (niveau_batterie) {
        await pool.query('UPDATE collier SET niveau_batterie = $1, dernier_envoie = NOW() WHERE id_troupeau = $2', [niveau_batterie, id_troupeau]);
      }

      res.json({ success: true, message: 'Position enregistrée', data: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Dernière position
  async getLastPosition(req, res) {
    try {
      const { id_troupeau } = req.params;
      const result = await pool.query(
        `SELECT id_troupeau, ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude, dateh
         FROM position_troup WHERE id_troupeau = $1 ORDER BY dateh DESC LIMIT 1`,
        [id_troupeau]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Aucune position' });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Historique
  async getHistory(req, res) {
    try {
      const { id_troupeau } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const result = await pool.query(
        `SELECT id_troupeau, ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude, dateh
         FROM position_troup WHERE id_troupeau = $1 ORDER BY dateh DESC LIMIT $2`,
        [id_troupeau, limit]
      );
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = iotController;