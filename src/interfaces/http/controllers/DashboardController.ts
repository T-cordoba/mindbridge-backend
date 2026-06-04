import { Request, Response, NextFunction } from 'express';
import { IMessageRepository } from '../../../domain/repositories/IMessageRepository';
import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { GetEmotionMetrics } from '../../../application/use-cases/dashboard/GetEmotionMetrics';

export class DashboardController {
  private _getEmotionMetrics: GetEmotionMetrics;

  constructor(messageRepository: IMessageRepository, sessionRepository: ISessionRepository) {
    this._getEmotionMetrics = new GetEmotionMetrics(messageRepository, sessionRepository);
  }

  metrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = parseInt((req.query.days as string) || '30', 10);
      const data = await this._getEmotionMetrics.execute({ userId: req.user!.id, days });
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
}

export default DashboardController;
