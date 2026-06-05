const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

const authController = {
  // Créer un éleveur AVEC mot de passe
  async registerEleveur(req, res) {
    try {
      const { nom_eleveur, telephone, mot_de_passe, localite } = req.body;
      
      // Vérifier si l'éleveur existe déjà
      const existing = await pool.query(
        'SELECT id_eleveur FROM ELEVEUR WHERE telephone = $1',
        [telephone]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ce numéro de téléphone est déjà utilisé.' 
        });
      }
      
      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      
      // Créer l'éleveur
      const result = await pool.query(
        `INSERT INTO ELEVEUR (nom_eleveur, telephone, mot_de_passe, localite, date_inscription)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id_eleveur, nom_eleveur, telephone, localite`,
        [nom_eleveur, telephone, hashedPassword, localite]
      );
      
      const eleveur = result.rows[0];
      
      // Générer le token
      const token = generateToken({
        id: eleveur.id_eleveur,
        role: 'eleveur',
        telephone: eleveur.telephone,
        nom: eleveur.nom_eleveur
      });
      
      res.status(201).json({
        success: true,
        token,
        user: {
          id: eleveur.id_eleveur,
          nom: eleveur.nom_eleveur,
          telephone: eleveur.telephone,
          localite: eleveur.localite,
          role: 'eleveur'
        }
      });
      
    } catch (error) {
      console.error('Erreur inscription éleveur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Connexion éleveur AVEC mot de passe
  async loginEleveur(req, res) {
    try {
      const { telephone, mot_de_passe } = req.body;
      
      if (!telephone || !mot_de_passe) {
        return res.status(400).json({ 
          success: false, 
          error: 'Téléphone et mot de passe requis.' 
        });
      }
      
      // Récupérer l'éleveur
      const result = await pool.query(
        'SELECT id_eleveur, nom_eleveur, telephone, localite, mot_de_passe FROM ELEVEUR WHERE telephone = $1',
        [telephone]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Téléphone ou mot de passe incorrect.' 
        });
      }
      
      const eleveur = result.rows[0];
      
      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(mot_de_passe, eleveur.mot_de_passe);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Téléphone ou mot de passe incorrect.' 
        });
      }
      
      // Générer le token
      const token = generateToken({
        id: eleveur.id_eleveur,
        role: 'eleveur',
        telephone: eleveur.telephone,
        nom: eleveur.nom_eleveur
      });
      
      res.json({
        success: true,
        token,
        user: {
          id: eleveur.id_eleveur,
          nom: eleveur.nom_eleveur,
          telephone: eleveur.telephone,
          localite: eleveur.localite,
          role: 'eleveur'
        }
      });
      
    } catch (error) {
      console.error('Erreur login éleveur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Connexion administrateur AVEC mot de passe
  async loginAdmin(req, res) {
    try {
      const { telephone, mot_de_passe } = req.body;
      
      if (!telephone || !mot_de_passe) {
        return res.status(400).json({ 
          success: false, 
          error: 'Téléphone et mot de passe requis.' 
        });
      }
      
      const result = await pool.query(
        `SELECT id_administrateur, nom_administrateur, telephone, mot_de_passe 
         FROM ADMINISTRATEUR WHERE telephone = $1`,
        [telephone]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Téléphone ou mot de passe incorrect.' 
        });
      }
      
      const admin = result.rows[0];
      
      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(mot_de_passe, admin.mot_de_passe);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Téléphone ou mot de passe incorrect.' 
        });
      }
      
      const token = generateToken({
        id: admin.id_administrateur,
        role: 'administrateur',
        telephone: admin.telephone,
        nom: admin.nom_administrateur
      });
      
      res.json({
        success: true,
        token,
        user: {
          id: admin.id_administrateur,
          nom: admin.nom_administrateur,
          telephone: admin.telephone,
          role: 'administrateur'
        }
      });
      
    } catch (error) {
      console.error('Erreur login admin:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Vérifier le token
  async verifyToken(req, res) {
    res.json({ 
      success: true, 
      user: req.user 
    });
  },
  
  // Déconnexion
  async logout(req, res) {
    res.json({ 
      success: true, 
      message: 'Déconnexion réussie' 
    });
  },
  
  // Changer le mot de passe
  async changePassword(req, res) {
    try {
      const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
      const userId = req.user.id;
      const role = req.user.role;
      
      // Récupérer l'utilisateur
      const table = role === 'eleveur' ? 'ELEVEUR' : 'ADMINISTRATEUR';
      const idField = role === 'eleveur' ? 'id_eleveur' : 'id_administrateur';
      
      const result = await pool.query(
        `SELECT mot_de_passe FROM ${table} WHERE ${idField} = $1`,
        [userId]
      );
      
      const user = result.rows[0];
      
      // Vérifier l'ancien mot de passe
      const isValid = await bcrypt.compare(ancien_mot_de_passe, user.mot_de_passe);
      
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          error: 'Ancien mot de passe incorrect.' 
        });
      }
      
      // Hacher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);
      
      // Mettre à jour
      await pool.query(
        `UPDATE ${table} SET mot_de_passe = $1 WHERE ${idField} = $2`,
        [hashedPassword, userId]
      );
      
      res.json({ 
        success: true, 
        message: 'Mot de passe changé avec succès.' 
      });
      
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = authController;