import { Request, Response, NextFunction } from 'express';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export class AdminController {
  constructor(private userRepository: IUserRepository) {}

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page  = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
      const offset = (page - 1) * limit;
      const result = await this.userRepository.findAll({ limit, offset });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export default AdminController;
