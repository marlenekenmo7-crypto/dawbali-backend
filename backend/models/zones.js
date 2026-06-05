const pool = require('../config/database');

class Zones {
  // Créer une nouvelle zone (agricole, interdite, pâturage)
  static async create(data) {
    const { nom_zone, type_zone, forme_geographique_geojson, description_zone, rayon_alerte_approche, zone_tampon_geojson } = data;
    
    const query = `
      INSERT INTO ZONES (nom_zone, type_zone, forme_geographique, description_zone, 
                         actif, rayon_alerte_approche, zone_tampon, created_at)
      VALUES ($1, $2, ST_GeomFromGeoJSON($3), $4, true, $5, ST_GeomFromGeoJSON($6), NOW())
      RETURNING id_zone, nom_zone, type_zone, ST_AsGeoJSON(forme_geographique) as forme_geographique,
                rayon_alerte_approche, ST_AsGeoJSON(zone_tampon) as zone_tampon
    `;
    
    const values = [nom_zone, type_zone, forme_geographique_geojson, description_zone, 
                    rayon_alerte_approche, zone_tampon_geojson];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Récupérer toutes les zones actives
  static async getAllActive() {
    const query = `
      SELECT z.*, 
             ST_AsGeoJSON(z.forme_geographique) as forme_geographique_geojson,
             ST_AsGeoJSON(z.zone_tampon) as zone_tampon_geojson,
             ST_Area(z.forme_geographique::geography) as superficie_m2
      FROM ZONES z
      WHERE z.actif = true
      ORDER BY z.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Vérifier si un point est dans une zone
  static async checkPointInZone(longitude, latitude, zoneId = null) {
    let query = `
      SELECT z.id_zone, z.nom_zone, z.type_zone, z.rayon_alerte_approche,
             ST_Contains(z.forme_geographique, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as is_inside,
             ST_Distance(z.forme_geographique, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_to_boundary
      FROM ZONES z
      WHERE z.actif = true
    `;
    
    const values = [longitude, latitude];
    
    if (zoneId) {
      query += ` AND z.id_zone = $3`;
      values.push(zoneId);
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  // Vérifier si un troupeau est en approche d'une zone
  static async checkApproachZone(longitude, latitude, zoneId = null) {
    const query = `
      SELECT z.id_zone, z.nom_zone, z.type_zone, z.rayon_alerte_approche,
             ST_Distance(z.forme_geographique, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
      FROM ZONES z
      WHERE z.actif = true
        AND z.rayon_alerte_approche IS NOT NULL
        AND ST_DWithin(z.forme_geographique, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, z.rayon_alerte_approche)
    `;
    
    const values = [longitude, latitude];
    if (zoneId) {
      query += ` AND z.id_zone = $3`;
      values.push(zoneId);
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  // Mettre à jour une zone
  static async update(id_zone, data) {
    const { nom_zone, type_zone, forme_geographique_geojson, description_zone, 
            actif, rayon_alerte_approche, zone_tampon_geojson } = data;
    
    let query = `UPDATE ZONES SET `;
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (nom_zone !== undefined) {
      updates.push(`nom_zone = $${paramCount++}`);
      values.push(nom_zone);
    }
    if (type_zone !== undefined) {
      updates.push(`type_zone = $${paramCount++}`);
      values.push(type_zone);
    }
    if (forme_geographique_geojson !== undefined) {
      updates.push(`forme_geographique = ST_GeomFromGeoJSON($${paramCount++})`);
      values.push(forme_geographique_geojson);
    }
    if (description_zone !== undefined) {
      updates.push(`description_zone = $${paramCount++}`);
      values.push(description_zone);
    }
    if (actif !== undefined) {
      updates.push(`actif = $${paramCount++}`);
      values.push(actif);
    }
    if (rayon_alerte_approche !== undefined) {
      updates.push(`rayon_alerte_approche = $${paramCount++}`);
      values.push(rayon_alerte_approche);
    }
    if (zone_tampon_geojson !== undefined) {
      updates.push(`zone_tampon = ST_GeomFromGeoJSON($${paramCount++})`);
      values.push(zone_tampon_geojson);
    }
    
    if (updates.length === 0) return null;
    
    query += updates.join(', ');
    query += ` WHERE id_zone = $${paramCount} RETURNING *`;
    values.push(id_zone);
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Supprimer une zone
  static async delete(id_zone) {
    const query = 'UPDATE ZONES SET actif = false WHERE id_zone = $1 RETURNING id_zone';
    const result = await pool.query(query, [id_zone]);
    return result.rows[0];
  }
}

module.exports = Zones;