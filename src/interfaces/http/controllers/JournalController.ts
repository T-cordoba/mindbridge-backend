import { Request, Response, NextFunction } from 'express';
import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { IMessageRepository } from '../../../domain/repositories/IMessageRepository';
import { NvidiaAIService } from '../../../infrastructure/ai/NvidiaAIService';
import { CreateSession } from '../../../application/use-cases/journal/CreateSession';
import { GetSessions } from '../../../application/use-cases/journal/GetSessions';
import { GetSession } from '../../../application/use-cases/journal/GetSession';
import { SendMessage } from '../../../application/use-cases/journal/SendMessage';
import { DeleteSession } from '../../../application/use-cases/journal/DeleteSession';
import { UpdateSessionTitle } from '../../../application/use-cases/journal/UpdateSessionTitle';

export class JournalController {
  private _createSession: CreateSession;
  private _getSessions: GetSessions;
  private _getSession: GetSession;
  private _sendMessage: SendMessage;
  private _deleteSession: DeleteSession;
  private _updateSessionTitle: UpdateSessionTitle;

  constructor(sessionRepository: ISessionRepository, messageRepository: IMessageRepository, aiService: NvidiaAIService) {
    this._createSession = new CreateSession(sessionRepository);
    this._getSessions = new GetSessions(sessionRepository);
    this._getSession = new GetSession(sessionRepository, messageRepository);
    this._sendMessage = new SendMessage(sessionRepository, messageRepository, aiService);
    this._deleteSession = new DeleteSession(sessionRepository);
    this._updateSessionTitle = new UpdateSessionTitle(sessionRepository);
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await this._createSession.execute({ userId: req.user!.id, title: req.body.title });
      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page  = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
      const result = await this._getSessions.execute({ userId: req.user!.id, page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this._getSession.execute({ sessionId: req.params.id, userId: req.user!.id });
      res.json(data);
    } catch (err) {
      next(err);
    }
  };

  send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userMessage, assistantMessage, alertLevel, isBlocked, generatedTitle } = await this._sendMessage.execute({
        sessionId: req.params.id,
        userId: req.user!.id,
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

  sendStream = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    const emit = (event: string, data: unknown): void => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      console.log('[Stream] executeStream starting', { sessionId: req.params.id });
      const { summaryJob, ...result } = await this._sendMessage.executeStream({
        sessionId: req.params.id,
        userId: req.user!.id,
        content: req.body.content,
        onReasoning: (chunk) => emit('reasoning', { chunk }),
        onText: (chunk) => emit('text', { chunk }),
        signal: abort.signal,
      });
      console.log('[Stream] executeStream done', { alertLevel: result.alertLevel });
      emit('done', result);

      if (summaryJob) {
        const summaryResult = await summaryJob.catch(() => null);
        if (summaryResult?.title) emit('title-updated', { title: summaryResult.title });
      }
    } catch (err) {
      emit('error', { message: (err as Error).message });
    } finally {
      if (!res.writableEnded) res.end();
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this._deleteSession.execute({ sessionId: req.params.id, userId: req.user!.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  updateTitle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await this._updateSessionTitle.execute({
        sessionId: req.params.id,
        userId: req.user!.id,
        title: req.body.title,
      });
      res.json({ session });
    } catch (err) {
      next(err);
    }
  };
}

export default JournalController;
