import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole.middleware';
import { AdminController } from '../controllers/AdminController';

export default (controller: AdminController): Router => {
  const router = Router();
  router.use(authenticate);
  router.use(requireRole('admin'));

  /**
   * @swagger
   * /v1/admin/users:
   *   get:
   *     tags: [Admin]
   *     summary: List all users (admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10, maximum: 50 }
   *     responses:
   *       200:
   *         description: "Paginated users: { data: User[], meta: { total, page, limit, totalPages } }"
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Insufficient permissions
   */
  router.get('/users', controller.listUsers);

  return router;
};
