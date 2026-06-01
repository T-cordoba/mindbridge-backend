const express = require('express');
const cors = require('cors');
const pool = require('./infrastructure/database/connection');
const NvidiaAIService = require('./infrastructure/ai/NvidiaAIService');
const PostgresUserRepository = require('./infrastructure/database/repositories/PostgresUserRepository');
const PostgresSessionRepository = require('./infrastructure/database/repositories/PostgresSessionRepository');
const PostgresMessageRepository = require('./infrastructure/database/repositories/PostgresMessageRepository');
const PostgresPsychologistRepository = require('./infrastructure/database/repositories/PostgresPsychologistRepository');
const AuthController = require('./interfaces/http/controllers/AuthController');
const JournalController = require('./interfaces/http/controllers/JournalController');
const DashboardController = require('./interfaces/http/controllers/DashboardController');
const MarketplaceController = require('./interfaces/http/controllers/MarketplaceController');
const authRoutes = require('./interfaces/http/routes/auth.routes');
const journalRoutes = require('./interfaces/http/routes/journal.routes');
const dashboardRoutes = require('./interfaces/http/routes/dashboard.routes');
const marketplaceRoutes = require('./interfaces/http/routes/marketplace.routes');
const { errorHandler } = require('./interfaces/http/middleware/errorHandler.middleware');
const { setup: setupSwagger } = require('./interfaces/docs/swagger');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

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

// Routes
app.use('/api/auth', authRoutes(authController));
app.use('/api/journal', journalRoutes(journalController));
app.use('/api/dashboard', dashboardRoutes(dashboardController));
app.use('/api/marketplace', marketplaceRoutes(marketplaceController));

// Swagger
setupSwagger(app);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
