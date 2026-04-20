const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MindBridge API',
      version: '1.0.0',
      description: 'Emotional wellness platform API — reflective AI journal with active safety protocols',
    },
    servers: [{ url: '/api', description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/interfaces/http/routes/*.js'],
};

const spec = swaggerJsdoc(options);

const setup = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/docs.json', (req, res) => res.json(spec));
};

module.exports = { setup };
