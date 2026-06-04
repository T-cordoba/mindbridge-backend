import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { AuthController } from '../controllers/AuthController';

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('disclaimerAccepted').equals('true').withMessage('Disclaimer must be accepted'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export default (controller: AuthController): Router => {
  const router = Router();

  /**
   * @swagger
   * /v1/auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, disclaimerAccepted]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               name: { type: string }
   *               disclaimerAccepted: { type: string, enum: ['true'] }
   *     responses:
   *       201:
   *         description: User created
   *       400:
   *         description: Validation error
   *       409:
   *         description: Email already registered
   */
  router.post('/register', registerValidation, validate, controller.register);

  /**
   * @swagger
   * /v1/auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login and receive JWT
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string }
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Token and user data
   *       401:
   *         description: Invalid credentials
   */
  router.post('/login', loginValidation, validate, controller.login);

  /**
   * @swagger
   * /v1/auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user info
   */
  router.get('/me', authenticate, controller.me);

  /**
   * @swagger
   * /v1/auth/account:
   *   delete:
   *     tags: [Auth]
   *     summary: Delete account and all data
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       204:
   *         description: Account deleted
   */
  router.delete('/account', authenticate, controller.deleteAccount);

  return router;
};
