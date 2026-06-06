const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const eleveurController = {
  async createEleveur(req, res) {
    try {
      const { nom_eleveur, telephone, mot_de_passe, couleur_troupeaux, localite } = req.body;
      if (!nom_eleveur) return res.status(400).json({ success: false, error: 'nom_eleveur requis' });

      const hash = mot_de_passe ? await bcrypt.hash(mot_de_passe, 10) : null;

      const result = await pool.query(
        `INSERT INTO ELEVEUR (nom_eleveur, telephone, mot_de_passe, couleur_troupeaux, localite, date_inscription)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id_eleveur, nom_eleveur, telephone, couleur_troupeaux, localite, date_inscription`,
        [nom_eleveur, telephone, hash, couleur_troupeaux, localite]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Erreur création éleveur:', error);
      if (error.code === '23505') return res.status(400).json({ success: false, error: 'Ce numéro de téléphone est déjà utilisé' });
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAllEleveurs(req, res) {
    try {
      const result = await pool.query(
        `SELECT e.id_eleveur, e.nom_eleveur, e.telephone, e.couleur_troupeaux, e.localite, e.date_inscription,
                COUNT(t.id_troupeau) as nb_troupeaux
         FROM ELEVEUR e
         LEFT JOIN TROUPEAU t ON e.id_eleveur = t.id_eleveur
         GROUP BY e.id_eleveur
         ORDER BY e.date_inscription DESC`
      );
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getEleveurById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT e.id_eleveur, e.nom_eleveur, e.telephone, e.couleur_troupeaux, e.localite, e.date_inscription,
                json_agg(json_build_object('id_troupeau', t.id_troupeau, 'nom_troupeau', t.nom_troupeau, 'taille', t.taille)) as troupeaux
         FROM ELEVEUR e
         LEFT JOIN TROUPEAU t ON e.id_eleveur = t.id_eleveur
         WHERE e.id_eleveur = $1
         GROUP BY e.id_eleveur`, [id]
      );
      if (!result.rows.length) return res.status(404).json({ success: false, error: 'Éleveur non trouvé' });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateEleveur(req, res) {
    try {
      const { id } = req.params;
      const { nom_eleveur, telephone, mot_de_passe, couleur_troupeaux, localite } = req.body;

      let hashClause = '';
      const values = [nom_eleveur, telephone, couleur_troupeaux, localite];

      if (mot_de_passe) {
        const hash = await bcrypt.hash(mot_de_passe, 10);
        hashClause = ', mot_de_passe = $5';
        values.push(hash);
        values.push(id);
      } else {
        values.push(id);
      }

      const idParam = mot_de_passe ? '$6' : '$5';
      const result = await pool.query(
        `UPDATE ELEVEUR
         SET nom_eleveur = COALESCE($1, nom_eleveur),
             telephone   = COALESCE($2, telephone),
             couleur_troupeaux = COALESCE($3, couleur_troupeaux),
             localite    = COALESCE($4, localite)
             ${hashClause}
         WHERE id_eleveur = ${idParam}
         RETURNING id_eleveur, nom_eleveur, telephone, couleur_troupeaux, localite`,
        values
      );
      if (!result.rows.length) return res.status(404).json({ success: false, error: 'Éleveur non trouvé' });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(400).json({ success: false, error: 'Ce numéro de téléphone est déjà utilisé' });
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteEleveur(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM ELEVEUR WHERE id_eleveur = $1 RETURNING id_eleveur', [id]);
      if (!result.rows.length) return res.status(404).json({ success: false, error: 'Éleveur non trouvé' });
      res.json({ success: true, message: 'Éleveur supprimé' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = eleveurController;
