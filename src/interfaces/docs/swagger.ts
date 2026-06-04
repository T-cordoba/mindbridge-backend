import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
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
  apis: ['./src/interfaces/http/routes/*.ts'],
};

const spec = swaggerJsdoc(options);

export const setup = (app: Express): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/docs.json', (_req, res) => res.json(spec));
};
