import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();

  res.on('finish', () => {
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path;
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    const [seconds, nanoseconds] = process.hrtime(start);
    httpRequestDuration.observe(labels, seconds + nanoseconds / 1e9);
    httpRequestsTotal.inc(labels);
  });

  next();
};
