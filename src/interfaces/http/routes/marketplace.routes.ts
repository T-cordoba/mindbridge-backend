import { Router } from 'express';
import { MarketplaceController } from '../controllers/MarketplaceController';

export default (controller: MarketplaceController): Router => {
  const router = Router();

  /**
   * @swagger
   * /v1/marketplace/psychologists:
   *   get:
   *     tags: [Marketplace]
   *     summary: List all psychologists
   *     responses:
   *       200:
   *         description: Array of psychologist profiles
   */
  router.get('/psychologists', controller.list);

  /**
   * @swagger
   * /v1/marketplace/psychologists/{id}:
   *   get:
   *     tags: [Marketplace]
   *     summary: Get a single psychologist profile
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Psychologist profile
   *       404:
   *         description: Not found
   */
  router.get('/psychologists/:id', controller.get);

  return router;
};
