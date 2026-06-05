const pool = require('../config/database');

class PositionTroup {
  // Enregistrer une nouvelle position (donnée IoT)
  static async create(data) {
    const { id_troupeau, longitude, latitude, precision_pos, direction } = data;
    
    // Conversion en géométrie PostGIS
    const query = `
      INSERT INTO POSITION_TROUP (id_troupeau, position, dateh, precision_pos, direction, created_at)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), NOW(), $4, $5, NOW())
      RETURNING id_troupeau, ST_X(position::geometry) as longitude, 
                ST_Y(position::geometry) as latitude, dateh, precision_pos, direction
    `;
    
    const values = [id_troupeau, longitude, latitude, precision_pos, direction];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Récupérer l'historique des positions d'un troupeau
  static async getHistory(id_troupeau, limit = 100, startDate = null, endDate = null) {
    let query = `
      SELECT pt.*, 
             ST_X(pt.position::geometry) as longitude,
             ST_Y(pt.position::geometry) as latitude
      FROM POSITION_TROUP pt
      WHERE pt.id_troupeau = $1
    `;
    const values = [id_troupeau];
    let paramCount = 2;

    if (startDate) {
      query += ` AND pt.dateh >= $${paramCount++}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND pt.dateh <= $${paramCount++}`;
      values.push(endDate);
    }

    query += ` ORDER BY pt.dateh DESC LIMIT $${paramCount}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Obtenir la trajectoire d'un troupeau sur une période
  static async getTrajectory(id_troupeau, startDate, endDate) {
    const query = `
      SELECT ST_AsGeoJSON(ST_MakeLine(pt.position ORDER BY pt.dateh)) as trajectory,
             MIN(pt.dateh) as start_time,
             MAX(pt.dateh) as end_time,
             ST_Length(ST_MakeLine(pt.position::geography ORDER BY pt.dateh)) as total_distance_meters
      FROM POSITION_TROUP pt
      WHERE pt.id_troupeau = $1 
        AND pt.dateh BETWEEN $2 AND $3
    `;
    const result = await pool.query(query, [id_troupeau, startDate, endDate]);
    return result.rows[0];
  }

  // Trouver les troupeaux à proximité d'une position
  static async findNearby(longitude, latitude, radiusMeters = 1000) {
    const query = `
      SELECT DISTINCT ON (pt.id_troupeau) 
             pt.id_troupeau,
             t.nom_troupeau,
             t.taille,
             e.nom_eleveur,
             e.telephone,
             ST_X(pt.position::geometry) as longitude,
             ST_Y(pt.position::geometry) as latitude,
             ST_Distance(pt.position, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
      FROM POSITION_TROUP pt
      JOIN TROUPEAU t ON pt.id_troupeau = t.id_troupeau
      JOIN ELEVEUR e ON t.id_eleveur = e.id_eleveur
      WHERE ST_DWithin(pt.position, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        AND pt.dateh >= NOW() - INTERVAL '1 hour'
      ORDER BY pt.id_troupeau, pt.dateh DESC
    `;
    const result = await pool.query(query, [longitude, latitude, radiusMeters]);
    return result.rows;
  }

  // Mettre à jour le statut du collier (dernier envoi)
  static async updateCollierLastSend(id_troupeau) {
    const query = `
      UPDATE COLLIER 
      SET dernier_envoie = NOW()
      WHERE id_troupeau = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id_troupeau]);
    return result.rows[0];
  }
}

module.exports = PositionTroup;