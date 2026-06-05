const pool = require('../config/database');

class Alerte {
  // Créer une nouvelle alerte
  static async create(data) {
    const { id_pos, horodatage_pos, id_troupeau, id_zone, type_alerte, distance_metres, message } = data;
    
    const query = `
      INSERT INTO ALERTE (id_pos, horodatage_pos, id_troupeau, id_zone, type_alerte, distance_metres, message, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    
    const values = [id_pos, horodatage_pos, id_troupeau, id_zone, type_alerte, distance_metres, message];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Récupérer les alertes non traitées
  static async getUnresolved(limit = 50) {
    const query = `
      SELECT a.*, 
             t.nom_troupeau,
             t.taille,
             e.nom_eleveur,
             e.telephone,
             z.nom_zone,
             z.type_zone,
             COUNT(ne.id_notif_elev) as notifications_envoyees
      FROM ALERTE a
      JOIN TROUPEAU t ON a.id_troupeau = t.id_troupeau
      JOIN ELEVEUR e ON t.id_eleveur = e.id_eleveur
      JOIN ZONES z ON a.id_zone = z.id_zone
      LEFT JOIN NOTIFICATION_ELEVEUR ne ON a.id_alerte = ne.id_alerte
      WHERE a.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY a.id_alerte, t.nom_troupeau, t.taille, e.nom_eleveur, e.telephone, z.nom_zone, z.type_zone
      ORDER BY a.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Récupérer les alertes par troupeau
  static async getByTroupeau(id_troupeau, limit = 50) {
    const query = `
      SELECT a.*, 
             z.nom_zone,
             z.type_zone,
             COUNT(ne.id_notif_elev) as notifications_envoyees
      FROM ALERTE a
      JOIN ZONES z ON a.id_zone = z.id_zone
      LEFT JOIN NOTIFICATION_ELEVEUR ne ON a.id_alerte = ne.id_alerte
      WHERE a.id_troupeau = $1
      GROUP BY a.id_alerte, z.nom_zone, z.type_zone
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [id_troupeau, limit]);
    return result.rows;
  }

  // Récupérer les alertes par zone
  static async getByZone(id_zone, limit = 50) {
    const query = `
      SELECT a.*, 
             t.nom_troupeau,
             t.taille,
             e.nom_eleveur,
             e.telephone
      FROM ALERTE a
      JOIN TROUPEAU t ON a.id_troupeau = t.id_troupeau
      JOIN ELEVEUR e ON t.id_eleveur = e.id_eleveur
      WHERE a.id_zone = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [id_zone, limit]);
    return result.rows;
  }

  // Statistiques des alertes
  static async getStatistics(startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(*) as total_alertes,
        COUNT(DISTINCT id_troupeau) as troupeaux_concernes,
        COUNT(DISTINCT id_zone) as zones_concernes,
        type_alerte,
        COUNT(*) as nb_par_type
      FROM ALERTE
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;
    
    if (startDate) {
      query += ` AND created_at >= $${paramCount++}`;
      values.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${paramCount++}`;
      values.push(endDate);
    }
    
    query += ` GROUP BY type_alerte`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = Alerte;