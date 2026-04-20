const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const messageValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Message cannot be empty')
    .isLength({ max: 600 }).withMessage('Message exceeds 600 characters'),
];

const sessionTitleValidation = [
  body('title')
    .isString().withMessage('Session title cannot be empty')
    .trim()
    .notEmpty().withMessage('Session title cannot be empty')
    .isLength({ max: 200 }).withMessage('Session title exceeds maximum length of 200 characters'),
];

module.exports = (controller) => {
  const router = Router();
  router.use(authenticate);

  /**
   * @swagger
   * /journal/sessions:
   *   post:
   *     tags: [Journal]
   *     summary: Create a new journal session
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title: { type: string }
   *     responses:
   *       201:
   *         description: Session created
   */
  router.post('/sessions', controller.create);

  /**
   * @swagger
   * /journal/sessions:
   *   get:
   *     tags: [Journal]
   *     summary: List all user sessions (paginated)
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
   *         description: Paginated sessions with total and totalPages
   */
  router.get('/sessions', controller.list);

  /**
   * @swagger
   * /journal/sessions/{id}:
   *   get:
   *     tags: [Journal]
   *     summary: Get session with full message history
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Session and messages
   *       404:
   *         description: Session not found
   */
  router.get('/sessions/:id', controller.get);

  /**
   * @swagger
   * /journal/sessions/{id}/messages:
   *   post:
   *     tags: [Journal]
   *     summary: Send a message — triggers AI response
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [content]
   *             properties:
   *               content: { type: string, maxLength: 600 }
   *     responses:
   *       200:
   *         description: User and assistant messages + alertLevel
   *       403:
   *         description: Session locked (crisis)
   */
  router.post('/sessions/:id/messages', messageValidation, validate, controller.send);

  /**
   * @swagger
   * /journal/sessions/{id}/title:
   *   patch:
   *     tags: [Journal]
   *     summary: Update a session title
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title]
   *             properties:
   *               title: { type: string, maxLength: 200 }
   *     responses:
   *       200:
   *         description: Updated session
   */
  router.patch('/sessions/:id/title', sessionTitleValidation, validate, controller.updateTitle);

  /**
   * @swagger
   * /journal/sessions/{id}:
   *   delete:
   *     tags: [Journal]
   *     summary: Delete a session and all its messages
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Session deleted
   */
  router.delete('/sessions/:id', controller.remove);

  return router;
};
