import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from './config/env.js';
import logger from './config/logger.js';
import { getDatabaseStatus } from './config/db.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { generalRateLimiter } from './middlewares/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import commerceRoutes from './routes/commerceRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import paymentWebhookRoutes from './routes/paymentWebhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

const app = express();
const allowedOrigins = env.clientUrl.split(',').map((origin) => origin.trim());

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", ...allowedOrigins],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: env.nodeEnv === 'production' ? [] : null
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(compression());
app.use(cookieParser());
app.use(morgan('tiny', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(generalRateLimiter);
app.use('/api/v1/payments', paymentWebhookRoutes);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());
app.use(hpp());

app.get('/api/v1/health', (_req, res) => {
  const database = getDatabaseStatus();
  res.status(database.connected ? 200 : 503).json({ success: database.connected, data: { status: 'ok', database } });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', catalogRoutes);
app.use('/api/v1', commerceRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', reviewRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
