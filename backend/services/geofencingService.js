const pool = require('../config/database');

class GeofencingService {
  
  // Vérifier la position d'un troupeau par rapport à TOUTES les zones
  async checkTroupeauPosition(id_troupeau, longitude, latitude) {
    try {
      // Récupérer toutes les zones actives
      const zonesResult = await pool.query(
        `SELECT id_zone, nom_zone, type_zone, rayon_alerte_approche 
         FROM zones 
         WHERE actif = true`
      );
      
      const zones = zonesResult.rows;
      const alertesGenerees = [];
      
      console.log(`🔍 Vérification troupeau ${id_troupeau} dans ${zones.length} zones...`);
      
      for (const zone of zones) {
        // Vérifier la relation entre le point et la zone
        const verif = await pool.query(
          `SELECT 
            ST_Contains(forme_geographique, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as est_dedans,
            ST_Distance(
              forme_geographique::geography, 
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) as distance_metres
           FROM zones 
           WHERE id_zone = $3`,
          [longitude, latitude, zone.id_zone]
        );
        
        const estDedans = verif.rows[0].est_dedans;
        const distance = parseFloat(verif.rows[0].distance_metres);
        
        // Cas 1: Le troupeau est DANS la zone
        if (estDedans) {
          console.log(`⚠️ Troupeau ${id_troupeau} DANS la zone ${zone.nom_zone}`);
          
          // Vérifier si une alerte récente existe (moins de 1 heure)
          const alerteExistante = await pool.query(
            `SELECT id_alerte FROM alerte 
             WHERE id_troupeau = $1 AND id_zone = $2 
             AND type_alerte = 'ENTREE_ZONE'
             AND created_at > NOW() - INTERVAL '1 hour'`,
            [id_troupeau, zone.id_zone]
          );
          
          if (alerteExistante.rows.length === 0) {
            const alerte = await this.creerAlerte({
              id_troupeau,
              id_zone: zone.id_zone,
              type_alerte: 'ENTREE_ZONE',
              distance_metres: 0,
              message: `🚨 ALERTE ROUGE: Le troupeau est entré dans la zone ${zone.nom_zone} (${zone.type_zone})!`,
              longitude,
              latitude
            });
            alertesGenerees.push(alerte);
            
            // Notifier l'éleveur immédiatement
            await this.notifierEleveur(id_troupeau, alerte.message, 'ENTREE_ZONE');
          }
        }
        
        // Cas 2: Le troupeau s'APPROCHE de la zone (dans le rayon d'alerte)
        else if (zone.rayon_alerte_approche && distance <= zone.rayon_alerte_approche) {
          console.log(`⚠️ Troupeau ${id_troupeau} à ${Math.round(distance)}m de la zone ${zone.nom_zone}`);
          
          // Vérifier si une alerte récente existe (moins de 30 minutes)
          const alerteExistante = await pool.query(
            `SELECT id_alerte FROM alerte 
             WHERE id_troupeau = $1 AND id_zone = $2 
             AND type_alerte = 'APPROCHE_ZONE'
             AND created_at > NOW() - INTERVAL '30 minutes'`,
            [id_troupeau, zone.id_zone]
          );
          
          if (alerteExistante.rows.length === 0) {
            const alerte = await this.creerAlerte({
              id_troupeau,
              id_zone: zone.id_zone,
              type_alerte: 'APPROCHE_ZONE',
              distance_metres: Math.round(distance),
              message: `⚠️ ALERTE ORANGE: Un troupeau s'approche de la zone ${zone.nom_zone} (${zone.type_zone}). Distance: ${Math.round(distance)} mètres`,
              longitude,
              latitude
            });
            alertesGenerees.push(alerte);
            
            // Notifier l'éleveur
            await this.notifierEleveur(id_troupeau, alerte.message, 'APPROCHE_ZONE');
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
  
  // Notifier l'éleveur par SMS
  async notifierEleveur(id_troupeau, message, typeAlerte) {
    try {
      // Récupérer les infos de l'éleveur
      const result = await pool.query(
        `SELECT e.id_eleveur, e.nom_eleveur, e.telephone, t.nom_troupeau
         FROM troupeau t
         JOIN eleveur e ON t.id_eleveur = e.id_eleveur
         WHERE t.id_troupeau = $1`,
        [id_troupeau]
      );
      
      if (result.rows.length === 0) {
        console.log('❌ Éleveur non trouvé');
        return;
      }
      
      const eleveur = result.rows[0];
      const telephone = eleveur.telephone;
      
      if (!telephone) {
        console.log(`⚠️ Pas de téléphone pour l'éleveur ${eleveur.nom_eleveur}`);
        return;
      }
      
      const messageComplet = `${message} - Troupeau: ${eleveur.nom_troupeau}`;
      
      // Simulation d'envoi SMS (à remplacer par Twilio plus tard)
      console.log(`📱 [SMS] À ${telephone} (${eleveur.nom_eleveur}): ${messageComplet}`);
      
      // Enregistrer la notification
      await pool.query(
        `INSERT INTO notification_eleveur (id_alerte, id_eleveur, canal, contenu_message, date_envoi, statut_envoi, nb_tentatives)
         VALUES ($1, $2, 'sms', $3, NOW(), 'envoye', 1)`,
        [null, eleveur.id_eleveur, messageComplet]
      );
      
      console.log(`✅ Notification enregistrée pour ${eleveur.nom_eleveur}`);
      
    } catch (error) {
      console.error('Erreur envoi notification:', error);
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