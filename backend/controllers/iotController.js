const pool = require('../config/database');
const geofencingService = require('../services/geofencingService');

const API_KEY_IOT = process.env.API_KEY_IOT || 'dawbali_iot_key_2024';

const iotController = {
  // Ingestion GPS
  async ingestGPS(req, res) {
    try {
      const { api_key, id_troupeau, longitude, latitude, precision_pos, direction, niveau_batterie } = req.body;

      if (api_key !== API_KEY_IOT) {
        return res.status(401).json({ success: false, error: 'Clé API invalide' });
      }
      if (!id_troupeau || longitude === undefined || latitude === undefined) {
        return res.status(400).json({ success: false, error: 'id_troupeau, longitude et latitude requis' });
      }

      // Valider les coordonnées
      const lon = parseFloat(longitude);
      const lat = parseFloat(latitude);
      if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        return res.status(400).json({ success: false, error: 'Coordonnées GPS invalides' });
      }

      // Vérifier existence du troupeau
      const troupeauCheck = await pool.query('SELECT id_troupeau FROM troupeau WHERE id_troupeau = $1', [id_troupeau]);
      if (troupeauCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Troupeau non trouvé' });
      }

      // Insertion position
      const result = await pool.query(
        `INSERT INTO position_troup (id_troupeau, position, dateh, precision_pos, direction, created_at)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), NOW(), $4, $5, NOW())
         RETURNING id_troupeau, ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude, dateh`,
        [id_troupeau, lon, lat, precision_pos || 10, direction || 0]
      );

      // Mise à jour batterie
      if (niveau_batterie !== undefined) {
        await pool.query(
          'UPDATE collier SET niveau_batterie = $1, dernier_envoie = NOW(), updated_at = NOW() WHERE id_troupeau = $2',
          [niveau_batterie, id_troupeau]
        );
      }

      // ── GÉOREPÉRAGE : vérification asynchrone (ne bloque pas la réponse) ──
      geofencingService.checkTroupeauPosition(id_troupeau, lon, lat)
        .then(alertes => {
          if (alertes.length > 0) {
            console.log(`🚨 ${alertes.length} alerte(s) générée(s) pour troupeau ${id_troupeau}`);
          }
        })
        .catch(err => console.error('Erreur géofencing (non bloquant):', err.message));

      res.json({
        success: true,
        message: 'Position enregistrée',
        data: result.rows[0]
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Dernière position
  async getLastPosition(req, res) {
    try {
      const { id_troupeau } = req.params;
      const result = await pool.query(
        `SELECT id_troupeau, ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude, dateh
         FROM position_troup WHERE id_troupeau = $1 ORDER BY dateh DESC LIMIT 1`,
        [id_troupeau]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Aucune position' });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Historique
  async getHistory(req, res) {
    try {
      const { id_troupeau } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 50, 500);
      const result = await pool.query(
        `SELECT id_troupeau, ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude, dateh, direction
         FROM position_troup WHERE id_troupeau = $1 ORDER BY dateh DESC LIMIT $2`,
        [id_troupeau, limit]
      );
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Simulation : génère un déplacement GPS vers la zone la plus proche
  async simulateMovement(req, res) {
    try {
      const id_troupeau = parseInt(req.params.id_troupeau);
      if (isNaN(id_troupeau)) return res.status(400).json({ success: false, error: 'id_troupeau invalide' });

      // Vérifier existence + droits
      const troupeauRes = await pool.query(
        'SELECT id_troupeau, nom_troupeau, id_eleveur FROM troupeau WHERE id_troupeau = $1',
        [id_troupeau]
      );
      if (troupeauRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Troupeau non trouvé' });
      const troupeau = troupeauRes.rows[0];

      // Éleveur : vérifier appartenance
      if (req.user.role === 'eleveur' && troupeau.id_eleveur !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Ce troupeau ne vous appartient pas' });
      }

      // Dernière position connue ou coordonnées passées en query
      let startLon = parseFloat(req.query.lon);
      let startLat = parseFloat(req.query.lat);

      if (isNaN(startLon) || isNaN(startLat)) {
        const lastPos = await pool.query(
          `SELECT ST_X(position::geometry) as lon, ST_Y(position::geometry) as lat
           FROM position_troup WHERE id_troupeau = $1 ORDER BY dateh DESC LIMIT 1`,
          [id_troupeau]
        );
        if (lastPos.rows.length > 0) {
          startLon = lastPos.rows[0].lon;
          startLat = lastPos.rows[0].lat;
        } else {
          // Position par défaut : Ngaoundéré
          startLon = 13.5796; startLat = 7.3267;
        }
      }

      // Zone cible : zone active la plus proche du point de départ
      const zoneRes = await pool.query(`
        SELECT id_zone, nom_zone,
               ST_X(ST_Centroid(forme_geographique)::geometry) as clon,
               ST_Y(ST_Centroid(forme_geographique)::geometry) as clat
        FROM zones
        WHERE actif = true AND forme_geographique IS NOT NULL
        ORDER BY ST_Distance(
          forme_geographique,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) ASC
        LIMIT 1
      `, [startLon, startLat]);

      let targetLon, targetLat, targetName;
      if (zoneRes.rows.length > 0) {
        targetLon  = zoneRes.rows[0].clon;
        targetLat  = zoneRes.rows[0].clat;
        targetName = zoneRes.rows[0].nom_zone;
      } else {
        // Direction générique si aucune zone
        targetLon = startLon + 0.05;
        targetLat = startLat + 0.05;
        targetName = 'cible générique';
      }

      // Générer 10 points interpolés (80 % du chemin vers la cible)
      const STEPS = 10;
      const RATIO = 0.80;
      const waypoints = [];
      const baseTime = Date.now();

      for (let i = 1; i <= STEPS; i++) {
        const t = (i / STEPS) * RATIO;
        const lon = startLon + t * (targetLon - startLon);
        const lat = startLat + t * (targetLat - startLat);
        const dateh = new Date(baseTime - (STEPS - i) * 5 * 60 * 1000); // espacés de 5 min
        const direction = Math.atan2(targetLon - startLon, targetLat - startLat) * 180 / Math.PI;

        await pool.query(
          `INSERT INTO position_troup (id_troupeau, position, dateh, precision_pos, direction, created_at)
           VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, 5, $5, NOW())`,
          [id_troupeau, lon, lat, dateh, Math.round(direction)]
        );
        waypoints.push({ lon: parseFloat(lon.toFixed(6)), lat: parseFloat(lat.toFixed(6)), dateh });
      }

      // Géofencing sur la position finale (non bloquant)
      const lastWp = waypoints[waypoints.length - 1];
      geofencingService.checkTroupeauPosition(id_troupeau, lastWp.lon, lastWp.lat)
        .then(alertes => {
          if (alertes.length > 0) console.log(`🚨 Simulation : ${alertes.length} alerte(s) pour troupeau ${id_troupeau}`);
        })
        .catch(err => console.error('Géofencing simulation:', err.message));

      res.json({
        success: true,
        message: `${STEPS} positions simulées vers « ${targetName} »`,
        troupeau: troupeau.nom_troupeau,
        target: { nom: targetName, lon: targetLon, lat: targetLat },
        waypoints
      });
    } catch (error) {
      console.error('Erreur simulateMovement:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = iotController;
