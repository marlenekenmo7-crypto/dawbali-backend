const pool = require('../config/database');

class Troupeau {
  // Créer un nouveau troupeau
  static async create(data) {
    const { nom_troupeau, taille, id_eleveur } = data;
    const query = `
      INSERT INTO TROUPEAU (nom_troupeau, taille, id_eleveur, date_creation)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const values = [nom_troupeau, taille, id_eleveur];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Récupérer tous les troupeaux d'un éleveur
  static async getByEleveur(id_eleveur) {
    const query = `
      SELECT t.*, 
             c.id_collier, c.statut as collier_statut, c.niveau_batterie,
             COUNT(DISTINCT a.id_alerte) as nb_alertes
      FROM TROUPEAU t
      LEFT JOIN COLLIER c ON t.id_troupeau = c.id_troupeau
      LEFT JOIN ALERTE a ON t.id_troupeau = a.id_troupeau
      WHERE t.id_eleveur = $1
      GROUP BY t.id_troupeau, c.id_collier, c.statut, c.niveau_batterie
      ORDER BY t.date_creation DESC
    `;
    const result = await pool.query(query, [id_eleveur]);
    return result.rows;
  }

  // Récupérer la dernière position d'un troupeau
  static async getLastPosition(id_troupeau) {
    const query = `
      SELECT pt.*, 
             ST_X(pt.position::geometry) as longitude,
             ST_Y(pt.position::geometry) as latitude,
             ST_AsGeoJSON(pt.position) as position_geojson
      FROM POSITION_TROUP pt
      WHERE pt.id_troupeau = $1
      ORDER BY pt.dateh DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [id_troupeau]);
    return result.rows[0];
  }

  // Mettre à jour un troupeau
  static async update(id_troupeau, data) {
    const { nom_troupeau, taille } = data;
    const query = `
      UPDATE TROUPEAU 
      SET nom_troupeau = COALESCE($1, nom_troupeau),
          taille = COALESCE($2, taille)
      WHERE id_troupeau = $3
      RETURNING *
    `;
    const values = [nom_troupeau, taille, id_troupeau];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Supprimer un troupeau
  static async delete(id_troupeau) {
    const query = 'DELETE FROM TROUPEAU WHERE id_troupeau = $1 RETURNING id_troupeau';
    const result = await pool.query(query, [id_troupeau]);
    return result.rows[0];
  }
}

module.exports = Troupeau;