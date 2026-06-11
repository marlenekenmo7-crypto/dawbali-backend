-- ============================================================
--  GEOALERTE-CM — Schéma PostgreSQL + PostGIS
--  À exécuter dans la console PSQL de Render (une seule fois)
-- ============================================================

-- Extension géospatiale
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── ADMINISTRATEUR ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS administrateur (
  id_administrateur SERIAL PRIMARY KEY,
  nom_administrateur VARCHAR(100) NOT NULL,
  telephone          VARCHAR(20)  NOT NULL UNIQUE,
  mot_de_passe       VARCHAR(255) NOT NULL,
  created_at         TIMESTAMP DEFAULT NOW()
);

-- ── ELEVEUR ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eleveur (
  id_eleveur         SERIAL PRIMARY KEY,
  nom_eleveur        VARCHAR(100) NOT NULL,
  telephone          VARCHAR(20)  NOT NULL UNIQUE,
  mot_de_passe       VARCHAR(255),
  couleur_troupeaux  VARCHAR(20)  DEFAULT '#F0A030',
  localite           VARCHAR(100),
  date_inscription   TIMESTAMP DEFAULT NOW()
);

-- ── ZONES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id_zone               SERIAL PRIMARY KEY,
  nom_zone              VARCHAR(100) NOT NULL,
  type_zone             VARCHAR(50)  NOT NULL,   -- 'agricole' | 'transhumance' | 'interdite' | 'paturage'
  forme_geographique    GEOMETRY(GEOMETRY, 4326),
  zone_tampon           GEOMETRY(GEOMETRY, 4326),
  description_zone      TEXT,
  rayon_alerte_approche INTEGER DEFAULT 500,
  rayon_alerte          INTEGER DEFAULT 100,
  rayon_alerte_entree   INTEGER DEFAULT 50,
  actif                 BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMP DEFAULT NOW()
);

-- ── TROUPEAU ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS troupeau (
  id_troupeau    SERIAL PRIMARY KEY,
  nom_troupeau   VARCHAR(100) NOT NULL,
  taille         INTEGER DEFAULT 0,
  id_eleveur     INTEGER REFERENCES eleveur(id_eleveur) ON DELETE CASCADE,
  date_creation  TIMESTAMP DEFAULT NOW()
);

-- ── COLLIER ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collier (
  id_collier      SERIAL PRIMARY KEY,
  niveau_batterie INTEGER DEFAULT 100,
  statut          VARCHAR(20) DEFAULT 'actif',   -- 'actif' | 'inactif'
  id_troupeau     INTEGER REFERENCES troupeau(id_troupeau) ON DELETE SET NULL,
  dernier_envoie  TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ── POSITION_TROUP ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS position_troup (
  id_pos        SERIAL,
  id_troupeau   INTEGER NOT NULL REFERENCES troupeau(id_troupeau) ON DELETE CASCADE,
  position      GEOMETRY(POINT, 4326) NOT NULL,
  dateh         TIMESTAMP DEFAULT NOW(),
  precision_pos FLOAT,
  direction     FLOAT,
  created_at    TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id_pos, dateh)
);

-- ── ALERTE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerte (
  id_alerte        SERIAL PRIMARY KEY,
  id_pos           INTEGER,
  horodatage_pos   TIMESTAMP,
  id_troupeau      INTEGER REFERENCES troupeau(id_troupeau) ON DELETE CASCADE,
  id_zone          INTEGER REFERENCES zones(id_zone) ON DELETE SET NULL,
  type_alerte      VARCHAR(50),   -- 'ENTREE_ZONE' | 'APPROCHE_ZONE' | 'SORTIE_ZONE'
  distance_metres  FLOAT,
  message          TEXT,
  status           VARCHAR(20) DEFAULT 'pending',   -- 'pending' | 'resolved'
  resolved_at      TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ── NOTIFICATION_ELEVEUR ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_eleveur (
  id_notif_elev   SERIAL PRIMARY KEY,
  id_alerte       INTEGER REFERENCES alerte(id_alerte) ON DELETE CASCADE,
  id_eleveur      INTEGER REFERENCES eleveur(id_eleveur) ON DELETE CASCADE,
  canal           VARCHAR(20)  DEFAULT 'sms',     -- 'sms' | 'whatsapp'
  contenu_message TEXT,
  statut_envoi    VARCHAR(20)  DEFAULT 'envoye',
  nb_tentatives   INTEGER      DEFAULT 1,
  date_envoi      TIMESTAMP    DEFAULT NOW(),
  envoye_a        TIMESTAMP    DEFAULT NOW()
);

-- ── INDEX GÉOSPATIAUX ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_zones_geom          ON zones           USING GIST (forme_geographique);
CREATE INDEX IF NOT EXISTS idx_zones_tampon        ON zones           USING GIST (zone_tampon);
CREATE INDEX IF NOT EXISTS idx_position_geom       ON position_troup  USING GIST (position);
CREATE INDEX IF NOT EXISTS idx_position_troupeau   ON position_troup  (id_troupeau);
CREATE INDEX IF NOT EXISTS idx_position_dateh      ON position_troup  (dateh DESC);
CREATE INDEX IF NOT EXISTS idx_alerte_troupeau     ON alerte          (id_troupeau);
CREATE INDEX IF NOT EXISTS idx_alerte_zone         ON alerte          (id_zone);
CREATE INDEX IF NOT EXISTS idx_alerte_status       ON alerte          (status);
CREATE INDEX IF NOT EXISTS idx_collier_troupeau    ON collier         (id_troupeau);

-- ============================================================
--  DONNÉES INITIALES
--  Les mots de passe ci-dessous sont en clair.
--  Le backend accepte les deux formats (clair et bcrypt).
--  initDb.js les hash automatiquement au premier démarrage.
--
--  Compte admin  : 690000001 / admin123
--  Compte démo   : 699001001 / demo123
-- ============================================================

INSERT INTO administrateur (nom_administrateur, telephone, mot_de_passe)
VALUES ('Admin GeoAlerte-CM', '690000001', 'admin123')
ON CONFLICT (telephone) DO NOTHING;

-- Éleveur démo
INSERT INTO eleveur (nom_eleveur, telephone, mot_de_passe, localite)
VALUES ('Ibrahim Moussa', '699001001', 'demo123', 'Ngaoundéré')
ON CONFLICT (telephone) DO NOTHING;

-- Zones démo (Adamaoua, Cameroun)
INSERT INTO zones (nom_zone, type_zone, forme_geographique, description_zone, rayon_alerte_approche, actif)
SELECT 'Plaine agricole Wack', 'agricole',
       ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.54,7.28],[13.62,7.28],[13.62,7.34],[13.54,7.34],[13.54,7.28]]]}'),
       'Zone agricole protégée — Wack Ngoumba', 600, true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE nom_zone='Plaine agricole Wack');

INSERT INTO zones (nom_zone, type_zone, forme_geographique, description_zone, rayon_alerte_approche, actif)
SELECT 'Couloir de transhumance Vina', 'transhumance',
       ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.58,7.35],[13.66,7.35],[13.66,7.48],[13.58,7.48],[13.58,7.35]]]}'),
       'Couloir officiel de passage — axe nord Adamaoua', 400, true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE nom_zone='Couloir de transhumance Vina');
