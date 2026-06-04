import { Request, Response, NextFunction } from 'express';

const knownErrors: Record<string, number> = {
  'Email already registered': 409,
  'Invalid credentials': 401,
  'Session not found': 404,
  'Psychologist not found': 404,
  'User not found': 404,
  'Session is locked due to crisis detection': 403,
  'Disclaimer must be accepted to use the journal': 400,
  'Session title cannot be empty': 400,
  'Session title exceeds maximum length of 200 characters': 400,
  'Email already in use': 409,
  'No fields to update': 400,
};

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[Error]', err.message);

  const status = knownErrors[err.message] || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
};
