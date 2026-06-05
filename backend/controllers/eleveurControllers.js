const pool = require('../config/database');

const eleveurController = {
  // Créer un éleveur
  async createEleveur(req, res) {
    try {
      const { nom_eleveur, telephone, couleur_troupeaux, localite } = req.body;
      
      // Vérifier si le téléphone existe déjà
      const existing = await pool.query(
        'SELECT id_eleveur FROM ELEVEUR WHERE telephone = $1',
        [telephone]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ce numéro de téléphone est déjà utilisé par un autre éleveur.' 
        });
      }
      
      // Insertion sans spécifier l'ID (auto-incrément)
      const result = await pool.query(
        `INSERT INTO ELEVEUR (nom_eleveur, telephone, couleur_troupeaux, localite, date_inscription)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id_eleveur, nom_eleveur, telephone, couleur_troupeaux, localite, date_inscription`,
        [nom_eleveur, telephone, couleur_troupeaux || null, localite || null]
      );
      
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur création éleveur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer tous les éleveurs
  async getAllEleveurs(req, res) {
    try {
      const result = await pool.query(`
        SELECT e.id_eleveur, e.nom_eleveur, e.telephone, e.couleur_troupeaux, 
               e.localite, e.date_inscription,
               COUNT(t.id_troupeau) as nb_troupeaux
        FROM ELEVEUR e
        LEFT JOIN TROUPEAU t ON e.id_eleveur = t.id_eleveur
        GROUP BY e.id_eleveur
        ORDER BY e.date_inscription DESC
      `);
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      console.error('Erreur récupération éleveurs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer un éleveur par ID
  async getEleveurById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        SELECT e.id_eleveur, e.nom_eleveur, e.telephone, e.couleur_troupeaux, 
               e.localite, e.date_inscription,
               json_agg(json_build_object(
                 'id_troupeau', t.id_troupeau, 
                 'nom_troupeau', t.nom_troupeau, 
                 'taille', t.taille
               )) as troupeaux
        FROM ELEVEUR e
        LEFT JOIN TROUPEAU t ON e.id_eleveur = t.id_eleveur
        WHERE e.id_eleveur = $1
        GROUP BY e.id_eleveur
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Éleveur non trouvé' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur récupération éleveur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Mettre à jour un éleveur
  async updateEleveur(req, res) {
    try {
      const { id } = req.params;
      const { nom_eleveur, telephone, couleur_troupeaux, localite } = req.body;
      
      const result = await pool.query(
        `UPDATE ELEVEUR 
         SET nom_eleveur = COALESCE($1, nom_eleveur),
             telephone = COALESCE($2, telephone),
             couleur_troupeaux = COALESCE($3, couleur_troupeaux),
             localite = COALESCE($4, localite)
         WHERE id_eleveur = $5
         RETURNING id_eleveur, nom_eleveur, telephone, couleur_troupeaux, localite`,
        [nom_eleveur, telephone, couleur_troupeaux, localite, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Éleveur non trouvé' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur mise à jour éleveur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Supprimer un éleveur
  async deleteEleveur(req, res) {
    try {
      const { id } = req.params;
      
      // Vérifier si l'éleveur a des troupeaux
      const troupeauxCheck = await pool.query(
        'SELECT COUNT(*) FROM TROUPEAU WHERE id_eleveur = $1',
        [id]
      );
      
      if (parseInt(troupeauxCheck.rows[0].count) > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Impossible de supprimer cet éleveur car il possède des troupeaux.' 
        });
      }
      
      const result = await pool.query(
        'DELETE FROM ELEVEUR WHERE id_eleveur = $1 RETURNING id_eleveur',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Éleveur non trouvé' });
      }
      
      res.json({ success: true, message: 'Éleveur supprimé avec succès' });
    } catch (error) {
      console.error('Erreur suppression éleveur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = eleveurController;