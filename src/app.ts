import express from 'express';
import cors from 'cors';
import pool from './infrastructure/database/connection';
import { NvidiaAIService } from './infrastructure/ai/NvidiaAIService';
import { PostgresUserRepository } from './infrastructure/database/repositories/PostgresUserRepository';
import { PostgresSessionRepository } from './infrastructure/database/repositories/PostgresSessionRepository';
import { PostgresMessageRepository } from './infrastructure/database/repositories/PostgresMessageRepository';
import { PostgresPsychologistRepository } from './infrastructure/database/repositories/PostgresPsychologistRepository';
import { AuthController } from './interfaces/http/controllers/AuthController';
import { JournalController } from './interfaces/http/controllers/JournalController';
import { DashboardController } from './interfaces/http/controllers/DashboardController';
import { MarketplaceController } from './interfaces/http/controllers/MarketplaceController';
import { AdminController } from './interfaces/http/controllers/AdminController';
import authRoutes from './interfaces/http/routes/auth.routes';
import journalRoutes from './interfaces/http/routes/journal.routes';
import dashboardRoutes from './interfaces/http/routes/dashboard.routes';
import marketplaceRoutes from './interfaces/http/routes/marketplace.routes';
import adminRoutes from './interfaces/http/routes/admin.routes';
import { errorHandler } from './interfaces/http/middleware/errorHandler.middleware';
import { setup as setupSwagger } from './interfaces/docs/swagger';
import { metricsMiddleware, register } from './interfaces/http/middleware/metrics.middleware';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(metricsMiddleware);

// Repositories
const userRepo = new PostgresUserRepository(pool);
const sessionRepo = new PostgresSessionRepository(pool);
const messageRepo = new PostgresMessageRepository(pool);
const psychologistRepo = new PostgresPsychologistRepository(pool);

// Services
const aiService = new NvidiaAIService();

// Controllers
const authController = new AuthController(userRepo);
const journalController = new JournalController(sessionRepo, messageRepo, aiService);
const dashboardController = new DashboardController(messageRepo, sessionRepo);
const marketplaceController = new MarketplaceController(psychologistRepo);
const adminController = new AdminController(userRepo);

// Routes — all versioned under /api/v1/
app.use('/api/v1/auth', authRoutes(authController));
app.use('/api/v1/journal', journalRoutes(journalController));
app.use('/api/v1/dashboard', dashboardRoutes(dashboardController));
app.use('/api/v1/marketplace', marketplaceRoutes(marketplaceController));
app.use('/api/v1/admin', adminRoutes(adminController));

// Swagger
setupSwagger(app);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Prometheus metrics
app.get('/api/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
