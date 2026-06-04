import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { DashboardController } from '../controllers/DashboardController';

export default (controller: DashboardController): Router => {
  const router = Router();
  router.use(authenticate);

  /**
   * @swagger
   * /v1/dashboard/metrics:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get emotion metrics for the current user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: days
   *         schema: { type: integer, default: 30 }
   *         description: Number of days to analyze (default 30)
   *     responses:
   *       200:
   *         description: Emotion frequencies, alert trend, session count
   */
  router.get('/metrics', controller.metrics);

  return router;
};
