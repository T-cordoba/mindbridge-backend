const CreateSession = require('../../../application/use-cases/journal/CreateSession');
const GetSessions = require('../../../application/use-cases/journal/GetSessions');
const GetSession = require('../../../application/use-cases/journal/GetSession');
const SendMessage = require('../../../application/use-cases/journal/SendMessage');
const DeleteSession = require('../../../application/use-cases/journal/DeleteSession');
const UpdateSessionTitle = require('../../../application/use-cases/journal/UpdateSessionTitle');

class JournalController {
  constructor(sessionRepository, messageRepository, aiService) {
    this._createSession = new CreateSession(sessionRepository);
    this._getSessions = new GetSessions(sessionRepository);
    this._getSession = new GetSession(sessionRepository, messageRepository);
    this._sendMessage = new SendMessage(sessionRepository, messageRepository, aiService);
    this._deleteSession = new DeleteSession(sessionRepository);
    this._updateSessionTitle = new UpdateSessionTitle(sessionRepository);
  }

  create = async (req, res, next) => {
    try {
      const session = await this._createSession.execute({ userId: req.user.id, title: req.body.title });
      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  };

  list = async (req, res, next) => {
    try {
      const sessions = await this._getSessions.execute({ userId: req.user.id });
      res.json({ sessions });
    } catch (err) {
      next(err);
    }
  };

  get = async (req, res, next) => {
    try {
      const data = await this._getSession.execute({ sessionId: req.params.id, userId: req.user.id });
      res.json(data);
    } catch (err) {
      next(err);
    }
  };

  send = async (req, res, next) => {
    try {
      const { userMessage, assistantMessage, alertLevel, isBlocked, generatedTitle } = await this._sendMessage.execute({
        sessionId: req.params.id,
        userId: req.user.id,
        content: req.body.content,
      });
      res.json({
        userMessage,
        assistantMessage,
        alertLevel,
        isBlocked,
        ...(generatedTitle ? { generatedTitle } : {}),
      });
    } catch (err) {
      next(err);
    }
  };

  remove = async (req, res, next) => {
    try {
      await this._deleteSession.execute({ sessionId: req.params.id, userId: req.user.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  updateTitle = async (req, res, next) => {
    try {
      const session = await this._updateSessionTitle.execute({
        sessionId: req.params.id,
        userId: req.user.id,
        title: req.body.title,
      });
      res.json({ session });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = JournalController;
