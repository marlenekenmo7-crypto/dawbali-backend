const pool = require('../config/database');

class GeofencingService {
  
  // Vérifier la position d'un troupeau par rapport à TOUTES les zones (1 seule requête)
  async checkTroupeauPosition(id_troupeau, longitude, latitude) {
    try {
      const point = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;

      // Une seule requête : géométrie + distance pour toutes les zones actives
      const zonesResult = await pool.query(
        `SELECT
           id_zone, nom_zone, type_zone, rayon_alerte_approche,
           ST_Contains(forme_geographique, $1::geometry)           AS est_dedans,
           ST_Distance(forme_geographique::geography, $1::geography) AS distance_metres
         FROM zones
         WHERE actif = true AND forme_geographique IS NOT NULL`,
        [`SRID=4326;POINT(${longitude} ${latitude})`]
      );

      const alertesGenerees = [];
      console.log(`🔍 Troupeau ${id_troupeau} — ${zonesResult.rows.length} zone(s) vérifiée(s)`);

      for (const zone of zonesResult.rows) {
        const estDedans = zone.est_dedans;
        const distance  = parseFloat(zone.distance_metres);

        if (estDedans) {
          console.log(`⚠️ Troupeau ${id_troupeau} DANS ${zone.nom_zone}`);
          const doublon = await pool.query(
            `SELECT id_alerte FROM alerte
             WHERE id_troupeau=$1 AND id_zone=$2 AND type_alerte='ENTREE_ZONE'
               AND created_at > NOW() - INTERVAL '1 hour'`,
            [id_troupeau, zone.id_zone]
          );
          if (doublon.rows.length === 0) {
            const alerte = await this.creerAlerte({
              id_troupeau, id_zone: zone.id_zone,
              type_alerte: 'ENTREE_ZONE', distance_metres: 0,
              message: `🚨 Le troupeau est entré dans la zone ${zone.nom_zone} (${zone.type_zone})`
            });
            if (alerte) {
              alertesGenerees.push(alerte);
              await this.notifierEleveur(id_troupeau, alerte);
            }
          }
        } else if (zone.rayon_alerte_approche && distance <= zone.rayon_alerte_approche) {
          console.log(`⚠️ Troupeau ${id_troupeau} à ${Math.round(distance)}m de ${zone.nom_zone}`);
          const doublon = await pool.query(
            `SELECT id_alerte FROM alerte
             WHERE id_troupeau=$1 AND id_zone=$2 AND type_alerte='APPROCHE_ZONE'
               AND created_at > NOW() - INTERVAL '30 minutes'`,
            [id_troupeau, zone.id_zone]
          );
          if (doublon.rows.length === 0) {
            const alerte = await this.creerAlerte({
              id_troupeau, id_zone: zone.id_zone,
              type_alerte: 'APPROCHE_ZONE', distance_metres: Math.round(distance),
              message: `⚠️ Troupeau à ${Math.round(distance)} m de la zone ${zone.nom_zone} (${zone.type_zone})`
            });
            if (alerte) {
              alertesGenerees.push(alerte);
              await this.notifierEleveur(id_troupeau, alerte);
            }
          }
        }
      }

      console.log(`✅ ${alertesGenerees.length} alerte(s) générée(s)`);
      return alertesGenerees;

    } catch (error) {
      console.error('Erreur géofencing:', error);
      return [];
    }
  }
  
  // Créer une alerte dans la base
  async creerAlerte(data) {
    try {
      const result = await pool.query(
        `INSERT INTO alerte (id_troupeau, id_zone, type_alerte, distance_metres, message, horodatage_pos, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id_alerte, type_alerte, message, created_at`,
        [data.id_troupeau, data.id_zone, data.type_alerte, data.distance_metres, data.message]
      );
      
      console.log(`📝 Alerte crée: [${result.rows[0].type_alerte}] ${data.message.substring(0, 50)}...`);
      return result.rows[0];
      
    } catch (error) {
      console.error('Erreur création alerte:', error);
      return null;
    }
  }
  
  // Notifier l'éleveur (enregistrement notification + log SMS)
  async notifierEleveur(id_troupeau, alerte) {
    try {
      const result = await pool.query(
        `SELECT e.id_eleveur, e.nom_eleveur, e.telephone, t.nom_troupeau
         FROM troupeau t
         JOIN eleveur e ON t.id_eleveur = e.id_eleveur
         WHERE t.id_troupeau = $1`,
        [id_troupeau]
      );

      if (result.rows.length === 0) { console.log('❌ Éleveur non trouvé'); return; }

      const eleveur = result.rows[0];
      if (!eleveur.telephone) {
        console.log(`⚠️ Pas de téléphone pour ${eleveur.nom_eleveur}`);
        return;
      }

      const contenu = `${alerte.message} — Troupeau: ${eleveur.nom_troupeau}`;
      console.log(`📱 [SMS] → ${eleveur.telephone} (${eleveur.nom_eleveur}): ${contenu}`);

      await pool.query(
        `INSERT INTO notification_eleveur
           (id_alerte, id_eleveur, canal, contenu_message, date_envoi, statut_envoi, nb_tentatives)
         VALUES ($1, $2, 'sms', $3, NOW(), 'envoye', 1)`,
        [alerte.id_alerte, eleveur.id_eleveur, contenu]
      );

      console.log(`✅ Notification liée à alerte #${alerte.id_alerte} enregistrée`);
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  }
  
  // Récupérer toutes les alertes non résolues
  async getActiveAlertes() {
    try {
      const result = await pool.query(
        `SELECT a.*, t.nom_troupeau, z.nom_zone, z.type_zone
         FROM alerte a
         JOIN troupeau t ON a.id_troupeau = t.id_troupeau
         JOIN zones z ON a.id_zone = z.id_zone
         WHERE a.status = 'pending'
         ORDER BY a.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur récupération alertes:', error);
      return [];
    }
  }
  
  // Résoudre une alerte
  async resolverAlerte(id_alerte) {
    try {
      const result = await pool.query(
        `UPDATE alerte 
         SET status = 'resolved', resolved_at = NOW()
         WHERE id_alerte = $1
         RETURNING id_alerte`,
        [id_alerte]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur résolution alerte:', error);
      return null;
    }
  }
}

module.exports = new GeofencingService();