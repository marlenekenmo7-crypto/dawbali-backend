const collierModel = require('../models/collier');
const pool = require('../config/database');

const collierController = {
  // Créer un collier (sans id_collier)
  async createCollier(req, res) {
    try {
      const { niveau_batterie, statut, id_troupeau } = req.body;
      
      // Ne vérifier que id_troupeau (id_collier est auto-généré)
      if (!id_troupeau) {
        return res.status(400).json({ 
          success: false, 
          error: 'id_troupeau est requis' 
        });
      }
      
      // Vérifier si le troupeau existe
      const troupeauExist = await pool.query(
        'SELECT id_troupeau, nom_troupeau FROM troupeau WHERE id_troupeau = $1',
        [id_troupeau]
      );
      
      if (troupeauExist.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Troupeau non trouvé' 
        });
      }
      
      // Créer le collier (id_collier est auto-généré)
      const result = await pool.query(
        `INSERT INTO collier (niveau_batterie, statut, id_troupeau, dernier_envoie)
         VALUES ($1, $2, $3, NULL)
         RETURNING id_collier, niveau_batterie, statut, id_troupeau`,
        [niveau_batterie || 100, statut || 'actif', id_troupeau]
      );
      
      const collier = result.rows[0];
      
      res.status(201).json({ 
        success: true, 
        message: 'Collier créé avec succès',
        data: {
          ...collier,
          troupeau: troupeauExist.rows[0].nom_troupeau
        }
      });
      
    } catch (error) {
      console.error('Erreur création collier:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer tous les colliers
  async getAllColliers(req, res) {
    try {
      const result = await pool.query(
        `SELECT c.*, t.nom_troupeau, e.nom_eleveur
         FROM collier c
         LEFT JOIN troupeau t ON c.id_troupeau = t.id_troupeau
         LEFT JOIN eleveur e ON t.id_eleveur = e.id_eleveur
         ORDER BY c.id_collier`
      );
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      console.error('Erreur récupération colliers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer un collier par ID
  async getCollierById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT c.*, t.nom_troupeau, e.nom_eleveur, e.telephone
         FROM collier c
         LEFT JOIN troupeau t ON c.id_troupeau = t.id_troupeau
         LEFT JOIN eleveur e ON t.id_eleveur = e.id_eleveur
         WHERE c.id_collier = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Collier non trouvé' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur récupération collier:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer collier par troupeau
  async getCollierByTroupeau(req, res) {
    try {
      const { id_troupeau } = req.params;
      const result = await pool.query(
        `SELECT * FROM collier WHERE id_troupeau = $1`,
        [id_troupeau]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Aucun collier associé à ce troupeau' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur récupération collier par troupeau:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Mettre à jour la batterie
  async updateBatterie(req, res) {
    try {
      const { id } = req.params;
      const { niveau_batterie } = req.body;
      
      if (niveau_batterie === undefined) {
        return res.status(400).json({ success: false, error: 'niveau_batterie requis' });
      }
      
      const result = await pool.query(
        `UPDATE collier 
         SET niveau_batterie = $1, dernier_envoie = NOW()
         WHERE id_collier = $2
         RETURNING *`,
        [niveau_batterie, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Collier non trouvé' });
      }
      
      res.json({ success: true, message: 'Batterie mise à jour', data: result.rows[0] });
    } catch (error) {
      console.error('Erreur mise à jour batterie:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Supprimer un collier
  async deleteCollier(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM collier WHERE id_collier = $1 RETURNING id_collier',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Collier non trouvé' });
      }
      
      res.json({ success: true, message: 'Collier supprimé avec succès' });
    } catch (error) {
      console.error('Erreur suppression collier:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = collierController;