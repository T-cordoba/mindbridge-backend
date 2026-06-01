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
      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const result = await this._getSessions.execute({ userId: req.user.id, page, limit });
      res.json(result);
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

  sendStream = async (req, res, next) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    const emit = (event, data) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await this._sendMessage.executeStream({
        sessionId: req.params.id,
        userId: req.user.id,
        content: req.body.content,
        onReasoning: (chunk) => emit('reasoning', { chunk }),
        onText: (chunk) => emit('text', { chunk }),
        signal: abort.signal,
      });
      emit('done', result);
    } catch (err) {
      emit('error', { message: err.message });
    } finally {
      if (!res.writableEnded) res.end();
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
