const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dawbali_secret_key_2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, telephone: user.telephone, nom: user.nom },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Connexion éleveur
router.post('/login/eleveur', async (req, res) => {
  try {
    const { telephone, mot_de_passe } = req.body;
    
    if (!telephone || !mot_de_passe) {
      return res.status(400).json({ success: false, error: 'Téléphone et mot de passe requis' });
    }
    
    const result = await pool.query(
      'SELECT id_eleveur, nom_eleveur, telephone, mot_de_passe FROM eleveur WHERE telephone = $1',
      [telephone]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    }
    
    const eleveur = result.rows[0];
    
    // Vérifier le mot de passe (en clair temporairement si pas encore hashé)
    let isValid = false;
    if (eleveur.mot_de_passe && eleveur.mot_de_passe.startsWith('$2b$')) {
      isValid = await bcrypt.compare(mot_de_passe, eleveur.mot_de_passe);
    } else {
      isValid = (mot_de_passe === eleveur.mot_de_passe);
    }
    
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    }
    
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
        role: 'eleveur'
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Connexion administrateur
router.post('/login/admin', async (req, res) => {
  try {
    const { telephone, mot_de_passe } = req.body;
    
    if (!telephone || !mot_de_passe) {
      return res.status(400).json({ success: false, error: 'Téléphone et mot de passe requis' });
    }
    
    const result = await pool.query(
      'SELECT id_administrateur, nom_administrateur, telephone, mot_de_passe FROM administrateur WHERE telephone = $1',
      [telephone]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    }
    
    const admin = result.rows[0];
    
    let isValid = false;
    if (admin.mot_de_passe && admin.mot_de_passe.startsWith('$2b$')) {
      isValid = await bcrypt.compare(mot_de_passe, admin.mot_de_passe);
    } else {
      isValid = (mot_de_passe === admin.mot_de_passe);
    }
    
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
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
    console.error('Login admin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inscription éleveur
router.post('/register', async (req, res) => {
  try {
    const { nom_eleveur, telephone, mot_de_passe, localite } = req.body;

    if (!nom_eleveur || !telephone || !mot_de_passe) {
      return res.status(400).json({ success: false, error: 'Nom, téléphone et mot de passe requis' });
    }

    const exists = await pool.query('SELECT id_eleveur FROM eleveur WHERE telephone = $1', [telephone]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const result = await pool.query(
      `INSERT INTO eleveur (nom_eleveur, telephone, mot_de_passe, localite, date_inscription)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id_eleveur, nom_eleveur, telephone, localite`,
      [nom_eleveur, telephone, hash, localite]
    );

    const eleveur = result.rows[0];
    const token = generateToken({ id: eleveur.id_eleveur, role: 'eleveur', telephone: eleveur.telephone, nom: eleveur.nom_eleveur });

    res.status(201).json({
      success: true,
      token,
      user: { id: eleveur.id_eleveur, nom: eleveur.nom_eleveur, telephone: eleveur.telephone, role: 'eleveur' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;