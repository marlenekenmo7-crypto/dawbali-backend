const pool = require('../config/database');

const troupeauController = {
  createTroupeau: async (req, res) => {
    try {
      const { nom_troupeau, taille, id_eleveur } = req.body;
      
      if (!nom_troupeau || !id_eleveur) {
        return res.status(400).json({ success: false, error: 'nom_troupeau et id_eleveur sont requis' });
      }
      
      const result = await pool.query(
        `INSERT INTO TROUPEAU (nom_troupeau, taille, id_eleveur, date_creation)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [nom_troupeau, taille, id_eleveur]
      );
      
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur création troupeau:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getAllTroupeaux: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT t.*, e.nom_eleveur, e.telephone
        FROM TROUPEAU t
        LEFT JOIN ELEVEUR e ON t.id_eleveur = e.id_eleveur
        ORDER BY t.date_creation DESC
      `);
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getTroupeauById: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        SELECT t.*, e.nom_eleveur, e.telephone
        FROM TROUPEAU t
        LEFT JOIN ELEVEUR e ON t.id_eleveur = e.id_eleveur
        WHERE t.id_troupeau = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Troupeau non trouvé' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getTroupeauxByEleveur: async (req, res) => {
    try {
      const { id_eleveur } = req.params;
      const result = await pool.query(
        'SELECT * FROM TROUPEAU WHERE id_eleveur = $1 ORDER BY date_creation DESC',
        [id_eleveur]
      );
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updateTroupeau: async (req, res) => {
    try {
      const { id } = req.params;
      const { nom_troupeau, taille } = req.body;
      
      const result = await pool.query(
        `UPDATE TROUPEAU 
         SET nom_troupeau = COALESCE($1, nom_troupeau),
             taille = COALESCE($2, taille)
         WHERE id_troupeau = $3
         RETURNING *`,
        [nom_troupeau, taille, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Troupeau non trouvé' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteTroupeau: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM TROUPEAU WHERE id_troupeau = $1 RETURNING id_troupeau', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Troupeau non trouvé' });
      }
      res.json({ success: true, message: 'Troupeau supprimé' });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = troupeauController;