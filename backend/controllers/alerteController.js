const pool = require('../config/database');

const alerteController = {
  // Récupérer toutes les alertes
  async getAllAlertes(req, res) {
    try {
      let result;
      if (req.user.role === 'eleveur') {
        result = await pool.query(`
          SELECT a.*, t.nom_troupeau, z.nom_zone, z.type_zone, e.nom_eleveur, e.telephone
          FROM alerte a
          LEFT JOIN troupeau t ON a.id_troupeau = t.id_troupeau
          LEFT JOIN zones z ON a.id_zone = z.id_zone
          LEFT JOIN eleveur e ON t.id_eleveur = e.id_eleveur
          WHERE t.id_eleveur = $1
          ORDER BY a.created_at DESC
        `, [req.user.id]);
      } else {
        result = await pool.query(`
          SELECT a.*, t.nom_troupeau, z.nom_zone, z.type_zone, e.nom_eleveur, e.telephone
          FROM alerte a
          LEFT JOIN troupeau t ON a.id_troupeau = t.id_troupeau
          LEFT JOIN zones z ON a.id_zone = z.id_zone
          LEFT JOIN eleveur e ON t.id_eleveur = e.id_eleveur
          ORDER BY a.created_at DESC
        `);
      }
      res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
      console.error('Erreur getAllAlertes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer les alertes pour une zone spécifique
  async getAlertesByZone(req, res) {
    try {
      const { id_zone } = req.params;
      
      // Vérifier si la zone existe
      const zoneExist = await pool.query(
        'SELECT id_zone, nom_zone, type_zone FROM zones WHERE id_zone = $1',
        [id_zone]
      );
      
      if (zoneExist.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Zone non trouvée' });
      }
      
      const result = await pool.query(`
        SELECT a.*, 
               t.nom_troupeau, 
               t.taille,
               e.nom_eleveur, 
               e.telephone,
               e.localite
        FROM alerte a
        JOIN troupeau t ON a.id_troupeau = t.id_troupeau
        JOIN eleveur e ON t.id_eleveur = e.id_eleveur
        WHERE a.id_zone = $1
        ORDER BY a.created_at DESC
      `, [id_zone]);
      
      res.json({ 
        success: true, 
        zone: zoneExist.rows[0],
        count: result.rows.length, 
        data: result.rows 
      });
    } catch (error) {
      console.error('Erreur getAlertesByZone:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer les alertes récentes d'une zone (dernières X heures)
  async getRecentAlertesByZone(req, res) {
    try {
      const { id_zone } = req.params;
      const heures = parseInt(req.query.heures) || 24;
      
      // Vérifier si la zone existe
      const zoneExist = await pool.query(
        'SELECT id_zone, nom_zone FROM zones WHERE id_zone = $1',
        [id_zone]
      );
      
      if (zoneExist.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Zone non trouvée' });
      }
      
      const result = await pool.query(
        `SELECT a.*,
                t.nom_troupeau,
                e.nom_eleveur,
                EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 60 as minutes_ecoulees
         FROM alerte a
         JOIN troupeau t ON a.id_troupeau = t.id_troupeau
         JOIN eleveur e ON t.id_eleveur = e.id_eleveur
         WHERE a.id_zone = $1
         AND a.created_at > NOW() - ($2 * INTERVAL '1 hour')
         ORDER BY a.created_at DESC`,
        [id_zone, heures]
      );
      
      res.json({ 
        success: true, 
        zone: zoneExist.rows[0],
        periode_heures: heures,
        count: result.rows.length, 
        data: result.rows 
      });
    } catch (error) {
      console.error('Erreur getRecentAlertesByZone:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Export CSV de toutes les alertes
  async exportCSV(req, res) {
    try {
      let rows;
      if (req.user.role === 'eleveur') {
        const r = await pool.query(`
          SELECT a.id_alerte, a.type_alerte, a.message, a.distance_metres,
                 a.status, a.created_at, a.resolved_at,
                 t.nom_troupeau, z.nom_zone, z.type_zone, e.nom_eleveur, e.telephone
          FROM alerte a
          LEFT JOIN troupeau t ON a.id_troupeau = t.id_troupeau
          LEFT JOIN zones z    ON a.id_zone     = z.id_zone
          LEFT JOIN eleveur e  ON t.id_eleveur  = e.id_eleveur
          WHERE t.id_eleveur = $1
          ORDER BY a.created_at DESC
        `, [req.user.id]);
        rows = r.rows;
      } else {
        const r = await pool.query(`
          SELECT a.id_alerte, a.type_alerte, a.message, a.distance_metres,
                 a.status, a.created_at, a.resolved_at,
                 t.nom_troupeau, z.nom_zone, z.type_zone, e.nom_eleveur, e.telephone
          FROM alerte a
          LEFT JOIN troupeau t ON a.id_troupeau = t.id_troupeau
          LEFT JOIN zones z    ON a.id_zone     = z.id_zone
          LEFT JOIN eleveur e  ON t.id_eleveur  = e.id_eleveur
          ORDER BY a.created_at DESC
        `);
        rows = r.rows;
      }

      const escape = v => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      };

      const headers = ['ID','Type','Message','Distance (m)','Statut','Date création','Date résolution',
                       'Troupeau','Zone','Type zone','Éleveur','Téléphone'];
      const lines = [headers.join(',')];
      for (const row of rows) {
        lines.push([
          row.id_alerte, row.type_alerte, row.message, row.distance_metres,
          row.status, row.created_at, row.resolved_at,
          row.nom_troupeau, row.nom_zone, row.type_zone, row.nom_eleveur, row.telephone
        ].map(escape).join(','));
      }

      const csv = '﻿' + lines.join('\r\n'); // BOM UTF-8 pour Excel
      const filename = `alertes_${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Erreur exportCSV:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Récupérer les statistiques des alertes pour une zone
  async getZoneAlertStats(req, res) {
    try {
      const { id_zone } = req.params;
      
      // Vérifier si la zone existe
      const zoneExist = await pool.query(
        'SELECT id_zone, nom_zone, type_zone FROM zones WHERE id_zone = $1',
        [id_zone]
      );
      
      if (zoneExist.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Zone non trouvée' });
      }
      
      const result = await pool.query(
        `SELECT 
           z.id_zone,
           z.nom_zone,
           z.type_zone,
           COUNT(a.id_alerte) as total_alertes,
           COUNT(CASE WHEN a.type_alerte = 'ENTREE_ZONE' THEN 1 END) as entrees_zone,
           COUNT(CASE WHEN a.type_alerte = 'APPROCHE_ZONE' THEN 1 END) as approches_zone,
           COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as alertes_non_resolues,
           COUNT(CASE WHEN a.status = 'resolved' THEN 1 END) as alertes_resolues,
           MIN(a.created_at) as premiere_alerte,
           MAX(a.created_at) as derniere_alerte
         FROM zones z
         LEFT JOIN alerte a ON z.id_zone = a.id_zone
         WHERE z.id_zone = $1
         GROUP BY z.id_zone, z.nom_zone, z.type_zone`,
        [id_zone]
      );
      
      res.json({ 
        success: true, 
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Erreur getZoneAlertStats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = alerteController;