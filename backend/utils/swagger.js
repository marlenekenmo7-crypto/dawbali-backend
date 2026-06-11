const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API GeoAlerte-CM — Système d\'Alerte Agro-Pastoral',
      version: '1.0.0',
      description: 'Documentation interactive de l\'API pour la gestion des alertes précoces.',
      contact: {
        name: 'Support Technique GeoAlerte-CM',
        email: 'support@geoalerte-cm.cm',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement local',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'api_key',
          description: "Clé API pour l'ingestion IoT (lot 1 & 5)",
        },
      },
    },
    schemas: {
        Eleveur: {
          type: 'object',
          properties: {
            id_eleveur: { type: 'integer', example: 1 },
            nom_eleveur: { type: 'string', example: 'Jean Mbarga' },
            telephone: { type: 'string', example: '699887766' },
            localite: { type: 'string', example: 'Bandjoun' },
            date_inscription: { type: 'string', format: 'date-time' },
          },
        },
        Troupeau: {
            type: 'object',
            properties: {
                id_troupeau: { type: 'integer', example: 1 },
                nom_troupeau: { type: 'string', example: 'Troupeau Nord' },
                taille: { type: 'integer', example: 50 },
                id_eleveur: { type: 'integer', example: 1 },
                date_creation: { type: 'string', format: 'date-time' },
            },
        },
        Zone: {
            type: 'object',
            properties: {
                id_zone: { type: 'integer', example: 1 },
                nom_zone: { type: 'string', example: 'Zone Agricole Bandjoun' },
                type_zone: { type: 'string', enum: ['agricole', 'pastorale', 'interdite', 'tampon'], example: 'agricole' },
                forme_geographique: { type: 'object', description: 'GeoJSON Polygon' },
                description_zone: { type: 'string', nullable: true },
                rayon_alerte_approche: { type: 'integer', example: 500 },
                actif: { type: 'boolean', default: true },
                created_at: { type: 'string', format: 'date-time' },
            },
        },
        Alerte: {
            type: 'object',
            properties: {
            id_alerte: { type: 'integer' },
            id_troupeau: { type: 'integer' },
            id_zone: { type: 'integer' },
            type_alerte: { type: 'string', enum: ['ENTREE_ZONE', 'APPROCHE_ZONE'] },
            distance_metres: { type: 'integer' },
            message: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'resolved'] },
            created_at: { type: 'string', format: 'date-time' },
        },
    },
        Collier: {
            type: 'object',
            properties: {
            id_collier: { type: 'integer' },
            niveau_batterie: { type: 'integer', example: 85 },
            statut: { type: 'string', enum: ['actif', 'inactif'], example: 'actif' },
            id_troupeau: { type: 'integer' },
            dernier_envoie: { type: 'string', format: 'date-time', nullable: true },
        },
    },
        PositionGPS: {
            type: 'object',
            properties: {
                id_troupeau: { type: 'integer' },
                longitude: { type: 'number', format: 'float', example: 10.36 },
                latitude: { type: 'number', format: 'float', example: 5.73 },
                dateh: { type: 'string', format: 'date-time' },
                precision_pos: { type: 'integer' },
                direction: { type: 'number', nullable: true },
            },
        },
      },
  },
  apis: ['./routes/*.js', './controllers/*.js'], // chemins vers vos fichiers de routes
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;