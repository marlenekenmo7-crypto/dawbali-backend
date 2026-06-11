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
        id_notif_elev   SERIAL PRIMARY KEY,
        id_alerte       INTEGER REFERENCES alerte(id_alerte) ON DELETE CASCADE,
        id_eleveur      INTEGER REFERENCES eleveur(id_eleveur) ON DELETE CASCADE,
        canal           VARCHAR(20)  DEFAULT 'sms',
        contenu_message TEXT,
        statut_envoi    VARCHAR(20)  DEFAULT 'envoye',
        nb_tentatives   INTEGER      DEFAULT 1,
        date_envoi      TIMESTAMP    DEFAULT NOW(),
        envoye_a        TIMESTAMP    DEFAULT NOW()
      )
    `);
    // Migration douce : ajouter les colonnes si la table existait déjà sans elles
    await pool.query(`ALTER TABLE notification_eleveur ADD COLUMN IF NOT EXISTS contenu_message TEXT`);
    await pool.query(`ALTER TABLE notification_eleveur ADD COLUMN IF NOT EXISTS nb_tentatives INTEGER DEFAULT 1`);
    await pool.query(`ALTER TABLE notification_eleveur ADD COLUMN IF NOT EXISTS date_envoi TIMESTAMP DEFAULT NOW()`);

    // Index géospatiaux
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_zones_geom        ON zones          USING GIST (forme_geographique)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_position_geom     ON position_troup USING GIST (position)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_position_troupeau ON position_troup (id_troupeau)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerte_troupeau   ON alerte         (id_troupeau)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerte_status     ON alerte         (status)`);

    // Administrateur
    await pool.query(`
      INSERT INTO administrateur (nom_administrateur, telephone, mot_de_passe)
      VALUES ('Admin GeoAlerte-CM', '690000001', 'admin123')
      ON CONFLICT (telephone) DO NOTHING
    `);

    // ── DONNÉES DE DÉMONSTRATION ──────────────────────────────
    // Éleveur démo
    await pool.query(`
      INSERT INTO eleveur (nom_eleveur, telephone, mot_de_passe, localite)
      VALUES ('Ibrahim Moussa', '699001001', 'demo123', 'Ngaoundéré')
      ON CONFLICT (telephone) DO NOTHING
    `);

    // Troupeaux démo (liés à l'éleveur démo)
    await pool.query(`
      INSERT INTO troupeau (nom_troupeau, taille, id_eleveur, date_creation)
      SELECT nom, taille, e.id_eleveur, NOW()
      FROM (VALUES
        ('Troupeau Vina Nord', 52),
        ('Troupeau Bénoué Est', 38),
        ('Troupeau Adamaoua Centre', 67)
      ) AS v(nom, taille)
      JOIN eleveur e ON e.telephone = '699001001'
      WHERE NOT EXISTS (
        SELECT 1 FROM troupeau t WHERE t.nom_troupeau = v.nom
      )
    `);

    // Colliers démo
    await pool.query(`
      INSERT INTO collier (niveau_batterie, statut, id_troupeau, dernier_envoie)
      SELECT 87, 'actif', t.id_troupeau, NOW()
      FROM troupeau t WHERE t.nom_troupeau = 'Troupeau Vina Nord'
        AND NOT EXISTS (SELECT 1 FROM collier c WHERE c.id_troupeau = t.id_troupeau)
    `);
    await pool.query(`
      INSERT INTO collier (niveau_batterie, statut, id_troupeau, dernier_envoie)
      SELECT 42, 'actif', t.id_troupeau, NOW()
      FROM troupeau t WHERE t.nom_troupeau = 'Troupeau Bénoué Est'
        AND NOT EXISTS (SELECT 1 FROM collier c WHERE c.id_troupeau = t.id_troupeau)
    `);
    await pool.query(`
      INSERT INTO collier (niveau_batterie, statut, id_troupeau, dernier_envoie)
      SELECT 15, 'actif', t.id_troupeau, NOW()
      FROM troupeau t WHERE t.nom_troupeau = 'Troupeau Adamaoua Centre'
        AND NOT EXISTS (SELECT 1 FROM collier c WHERE c.id_troupeau = t.id_troupeau)
    `);

    // Positions GPS démo (Adamaoua, Cameroun — lon, lat)
    await pool.query(`
      INSERT INTO position_troup (id_troupeau, position, dateh, precision_pos, direction)
      SELECT t.id_troupeau, ST_SetSRID(ST_MakePoint(13.602, 7.418), 4326), NOW(), 5, 45
      FROM troupeau t WHERE t.nom_troupeau = 'Troupeau Vina Nord'
        AND NOT EXISTS (SELECT 1 FROM position_troup p WHERE p.id_troupeau = t.id_troupeau)
    `);
    await pool.query(`
      INSERT INTO position_troup (id_troupeau, position, dateh, precision_pos, direction)
      SELECT t.id_troupeau, ST_SetSRID(ST_MakePoint(13.725, 7.248), 4326), NOW(), 5, 120
      FROM troupeau t WHERE t.nom_troupeau = 'Troupeau Bénoué Est'
        AND NOT EXISTS (SELECT 1 FROM position_troup p WHERE p.id_troupeau = t.id_troupeau)
    `);
    await pool.query(`
      INSERT INTO position_troup (id_troupeau, position, dateh, precision_pos, direction)
      SELECT t.id_troupeau, ST_SetSRID(ST_MakePoint(13.481, 7.352), 4326), NOW(), 5, 200
      FROM troupeau t WHERE t.nom_troupeau = 'Troupeau Adamaoua Centre'
        AND NOT EXISTS (SELECT 1 FROM position_troup p WHERE p.id_troupeau = t.id_troupeau)
    `);

    // Zones démo (Adamaoua)
    await pool.query(`
      INSERT INTO zones (nom_zone, type_zone, forme_geographique, description_zone, rayon_alerte_approche, rayon_alerte, actif)
      SELECT 'Plaine agricole Wack', 'agricole',
             ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.54,7.28],[13.62,7.28],[13.62,7.34],[13.54,7.34],[13.54,7.28]]]}'),
             'Zone agricole protégée — Wack Ngoumba', 600, 150, true
      WHERE NOT EXISTS (SELECT 1 FROM zones WHERE nom_zone = 'Plaine agricole Wack')
    `);
    await pool.query(`
      INSERT INTO zones (nom_zone, type_zone, forme_geographique, description_zone, rayon_alerte_approche, rayon_alerte, actif)
      SELECT 'Couloir de transhumance Vina', 'transhumance',
             ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.58,7.35],[13.66,7.35],[13.66,7.48],[13.58,7.48],[13.58,7.35]]]}'),
             'Couloir officiel de passage — axe nord Adamaoua', 400, 100, true
      WHERE NOT EXISTS (SELECT 1 FROM zones WHERE nom_zone = 'Couloir de transhumance Vina')
    `);

    console.log('✓ Base de données initialisée');
  } catch (err) {
    console.error('Erreur initialisation DB:', err.message);
  }
}

module.exports = initDb;
