import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: string) => (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== role) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }
  next();
};
