const pool = require('../config/database');

const zoneController = {
  // Créer une zone
  async createZone(req, res) {
    try {
      const { nom_zone, type_zone, forme_geographique, description_zone, rayon_alerte_approche } = req.body;
      
      if (!nom_zone || !type_zone || !forme_geographique) {
        return res.status(400).json({ 
          success: false, 
          error: 'nom_zone, type_zone et forme_geographique sont requis' 
        });
      }
      
      const result = await pool.query(
        `INSERT INTO zones (nom_zone, type_zone, forme_geographique, description_zone, rayon_alerte_approche, actif, created_at)
         VALUES ($1, $2, ST_GeomFromGeoJSON($3), $4, $5, true, NOW())
         RETURNING id_zone, nom_zone, type_zone`,
        [nom_zone, type_zone, JSON.stringify(forme_geographique), description_zone, rayon_alerte_approche || 500]
      );
      
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Récupérer toutes les zones
  async getAllZones(req, res) {
    try {
      const result = await pool.query(
        `SELECT id_zone, nom_zone, type_zone, description_zone, rayon_alerte_approche, actif,
                ST_AsGeoJSON(forme_geographique)::json as geometrie
         FROM zones ORDER BY id_zone`
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Récupérer une zone par ID
  async getZoneById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT id_zone, nom_zone, type_zone FROM zones WHERE id_zone = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Zone non trouvée' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Mettre à jour une zone
  async updateZone(req, res) {
    try {
      const { id } = req.params;
      const { nom_zone, type_zone, rayon_alerte_approche, actif } = req.body;
      
      const result = await pool.query(
        `UPDATE zones SET 
          nom_zone = COALESCE($1, nom_zone),
          type_zone = COALESCE($2, type_zone),
          rayon_alerte_approche = COALESCE($3, rayon_alerte_approche),
          actif = COALESCE($4, actif)
         WHERE id_zone = $5
         RETURNING id_zone, nom_zone, type_zone`,
        [nom_zone, type_zone, rayon_alerte_approche, actif, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Zone non trouvée' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Supprimer une zone
  async deleteZone(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM zones WHERE id_zone = $1 RETURNING id_zone', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Zone non trouvée' });
      }
      
      res.json({ success: true, message: 'Zone supprimée' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = zoneController;