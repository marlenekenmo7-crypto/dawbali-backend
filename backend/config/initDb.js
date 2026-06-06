const pool = require('./database');

async function initDb() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS administrateur (
        id_administrateur SERIAL PRIMARY KEY,
        nom_administrateur VARCHAR(100) NOT NULL,
        telephone          VARCHAR(20)  NOT NULL UNIQUE,
        mot_de_passe       VARCHAR(255) NOT NULL,
        created_at         TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS eleveur (
        id_eleveur        SERIAL PRIMARY KEY,
        nom_eleveur       VARCHAR(100) NOT NULL,
        telephone         VARCHAR(20)  NOT NULL UNIQUE,
        mot_de_passe      VARCHAR(255),
        couleur_troupeaux VARCHAR(20)  DEFAULT '#F0A030',
        localite          VARCHAR(100),
        date_inscription  TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS zones (
        id_zone               SERIAL PRIMARY KEY,
        nom_zone              VARCHAR(100) NOT NULL,
        type_zone             VARCHAR(50)  NOT NULL,
        forme_geographique    GEOMETRY(GEOMETRY, 4326),
        zone_tampon           GEOMETRY(GEOMETRY, 4326),
        description_zone      TEXT,
        rayon_alerte_approche INTEGER DEFAULT 500,
        rayon_alerte          INTEGER DEFAULT 100,
        rayon_alerte_entree   INTEGER DEFAULT 50,
        actif                 BOOLEAN DEFAULT TRUE,
        created_at            TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS troupeau (
        id_troupeau   SERIAL PRIMARY KEY,
        nom_troupeau  VARCHAR(100) NOT NULL,
        taille        INTEGER DEFAULT 0,
        id_eleveur    INTEGER REFERENCES eleveur(id_eleveur) ON DELETE CASCADE,
        date_creation TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collier (
        id_collier      SERIAL PRIMARY KEY,
        niveau_batterie INTEGER DEFAULT 100,
        statut          VARCHAR(20) DEFAULT 'actif',
        id_troupeau     INTEGER REFERENCES troupeau(id_troupeau) ON DELETE SET NULL,
        dernier_envoie  TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS position_troup (
        id_pos        SERIAL,
        id_troupeau   INTEGER NOT NULL REFERENCES troupeau(id_troupeau) ON DELETE CASCADE,
        position      GEOMETRY(POINT, 4326) NOT NULL,
        dateh         TIMESTAMP DEFAULT NOW(),
        precision_pos FLOAT,
        direction     FLOAT,
        created_at    TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (id_pos, dateh)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerte (
        id_alerte       SERIAL PRIMARY KEY,
        id_pos          INTEGER,
        horodatage_pos  TIMESTAMP,
        id_troupeau     INTEGER REFERENCES troupeau(id_troupeau) ON DELETE CASCADE,
        id_zone         INTEGER REFERENCES zones(id_zone) ON DELETE SET NULL,
        type_alerte     VARCHAR(50),
        distance_metres FLOAT,
        message         TEXT,
        status          VARCHAR(20) DEFAULT 'pending',
        resolved_at     TIMESTAMP,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_eleveur (
        id_notif_elev SERIAL PRIMARY KEY,
        id_alerte     INTEGER REFERENCES alerte(id_alerte) ON DELETE CASCADE,
        id_eleveur    INTEGER REFERENCES eleveur(id_eleveur) ON DELETE CASCADE,
        canal         VARCHAR(20) DEFAULT 'sms',
        statut_envoi  VARCHAR(20) DEFAULT 'envoye',
        envoye_a      TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index géospatiaux
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_zones_geom        ON zones          USING GIST (forme_geographique)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_position_geom     ON position_troup USING GIST (position)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_position_troupeau ON position_troup (id_troupeau)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerte_troupeau   ON alerte         (id_troupeau)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerte_status     ON alerte         (status)`);

    // Premier administrateur (mot de passe en clair, accepté par authRoutes)
    await pool.query(`
      INSERT INTO administrateur (nom_administrateur, telephone, mot_de_passe)
      VALUES ('Admin Dawbali', '690000001', 'admin123')
      ON CONFLICT (telephone) DO NOTHING
    `);

    console.log('✓ Base de données initialisée');
  } catch (err) {
    console.error('Erreur initialisation DB:', err.message);
  }
}

module.exports = initDb;
