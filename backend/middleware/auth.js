const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Clé secrète pour signer les tokens
const JWT_SECRET = process.env.JWT_SECRET || 'dawbali_secret_key_2024';

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} user - Utilisateur (id, role, telephone, nom)
 * @returns {string} Token JWT
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    telephone: user.telephone,
    nom: user.nom,
    iat: Date.now()
  };
  
  // Token valable 7 jours
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Middleware pour vérifier le token JWT
 * À placer sur les routes protégées
 */
async function verifyToken(req, res, next) {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token manquant. Veuillez vous connecter.' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Vérifier que l'utilisateur existe encore dans la base
    let user = null;
    
    if (decoded.role === 'eleveur') {
      const result = await pool.query(
        `SELECT 
          id_eleveur as id, 
          nom_eleveur as nom, 
          telephone, 
          'eleveur' as role,
          localite
         FROM ELEVEUR 
         WHERE id_eleveur = $1`,
        [decoded.id]
      );
      user = result.rows[0];
    } 
    else if (decoded.role === 'administrateur') {
      const result = await pool.query(
        `SELECT 
          id_administrateur as id, 
          nom_administrateur as nom, 
          telephone, 
          'administrateur' as role,
          statut_admin as statut
         FROM ADMINISTRATEUR 
         WHERE id_administrateur = $1`,
        [decoded.id]
      );
      user = result.rows[0];
      
      // Vérifier si l'admin est actif
      if (user && user.statut !== 'actif') {
        return res.status(403).json({ 
          success: false, 
          error: 'Compte administrateur désactivé.' 
        });
      }
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Utilisateur non trouvé.' 
      });
    }
    
    // Ajouter l'utilisateur à la requête pour les prochains middlewares
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token invalide.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expiré. Veuillez vous reconnecter.' 
      });
    }
    
    console.error('Erreur dans verifyToken:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la vérification du token.' 
    });
  }
}

/**
 * Middleware pour vérifier que l'utilisateur est un administrateur
 * À utiliser après verifyToken sur les routes admin uniquement
 */
function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Non authentifié.' 
    });
  }
  
  if (req.user.role === 'administrateur') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      error: 'Accès refusé. Droits administrateur requis.' 
    });
  }
}

/**
 * Middleware pour vérifier que l'utilisateur est un éleveur
 */
function isEleveur(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Non authentifié.' 
    });
  }
  
  if (req.user.role === 'eleveur') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      error: 'Accès refusé. Cette ressource est réservée aux éleveurs.' 
    });
  }
}

/**
 * Middleware pour vérifier que l'utilisateur a accès à une ressource
 * @param {Function} getResourceOwnerId - Fonction qui retourne l'ID du propriétaire de la ressource
 * @returns {Function} Middleware Express
 */
function verifyOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      // Les administrateurs ont accès à tout
      if (req.user.role === 'administrateur') {
        return next();
      }
      
      // Récupérer l'ID du propriétaire de la ressource
      const ownerId = await getResourceOwnerId(req);
      
      // Vérifier si l'utilisateur est le propriétaire
      if (req.user.id === ownerId) {
        return next();
      }
      
      res.status(403).json({ 
        success: false, 
        error: 'Accès refusé. Cette ressource ne vous appartient pas.' 
      });
    } catch (error) {
      console.error('Erreur dans verifyOwnership:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur lors de la vérification des droits.' 
      });
    }
  };
}

/**
 * Rafraîchir le token (prolonger la session)
 */
async function refreshToken(req, res) {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh token requis.' 
      });
    }
    
    const decoded = jwt.verify(refresh_token, JWT_SECRET);
    
    // Générer un nouveau token
    const newToken = generateToken({
      id: decoded.id,
      role: decoded.role,
      telephone: decoded.telephone,
      nom: decoded.nom
    });
    
    res.json({
      success: true,
      token: newToken
    });
    
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Refresh token invalide ou expiré.' 
    });
  }
}

module.exports = {
  generateToken,
  verifyToken,
  isAdmin,
  isEleveur,
  verifyOwnership,
  refreshToken
};