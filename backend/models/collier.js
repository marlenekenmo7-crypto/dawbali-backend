const pool = require('../config/database');

const collierModel = {
  // Créer un nouveau collier
  async create(data) {
    const { id_collier, niveau_batterie, statut, id_troupeau } = data;
    const result = await pool.query(
      `INSERT INTO collier (id_collier, niveau_batterie, statut, id_troupeau, dernier_envoie)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING id_collier, niveau_batterie, statut, id_troupeau`,
      [id_collier, niveau_batterie || 100, statut || 'actif', id_troupeau]
    );
    return result.rows[0];
  },

  // Récupérer tous les colliers
  async getAll() {
    const result = await pool.query(
      `SELECT c.*, t.nom_troupeau, e.nom_eleveur
       FROM collier c
       LEFT JOIN troupeau t ON c.id_troupeau = t.id_troupeau
       LEFT JOIN eleveur e ON t.id_eleveur = e.id_eleveur
       ORDER BY c.id_collier`
    );
    return result.rows;
  },

  // Récupérer un collier par ID
  async getById(id_collier) {
    const result = await pool.query(
      `SELECT c.*, t.nom_troupeau, e.nom_eleveur, e.telephone
       FROM collier c
       LEFT JOIN troupeau t ON c.id_troupeau = t.id_troupeau
       LEFT JOIN eleveur e ON t.id_eleveur = e.id_eleveur
       WHERE c.id_collier = $1`,
      [id_collier]
    );
    return result.rows[0];
  },

  // Récupérer collier par troupeau
  async getByTroupeau(id_troupeau) {
    const result = await pool.query(
      `SELECT * FROM collier WHERE id_troupeau = $1`,
      [id_troupeau]
    );
    return result.rows[0];
  },

  // Mettre à jour un collier
  async update(id_collier, data) {
    const { niveau_batterie, statut, id_troupeau } = data;
    const result = await pool.query(
      `UPDATE collier 
       SET niveau_batterie = COALESCE($1, niveau_batterie),
           statut = COALESCE($2, statut),
           id_troupeau = COALESCE($3, id_troupeau)
       WHERE id_collier = $4
       RETURNING *`,
      [niveau_batterie, statut, id_troupeau, id_collier]
    );
    return result.rows[0];
  },

  // Mettre à jour la batterie
  async updateBatterie(id_collier, niveau_batterie) {
    const result = await pool.query(
      `UPDATE collier 
       SET niveau_batterie = $1, dernier_envoie = NOW()
       WHERE id_collier = $2
       RETURNING *`,
      [niveau_batterie, id_collier]
    );
    return result.rows[0];
  },

  // Supprimer un collier
  async delete(id_collier) {
    const result = await pool.query(
      `DELETE FROM collier WHERE id_collier = $1 RETURNING id_collier`,
      [id_collier]
    );
    return result.rows[0];
  }
};

module.exports = collierModel;