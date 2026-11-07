/**
 * Express application factory (no network listening here, so tests can
 * import it and drive it with supertest).
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import counterRoutes from './routes/counter.routes.js';
import { apiLimiter, requireAjaxHeader } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp() {
  const app = express();

  // Render/Railway/Heroku sit behind one proxy hop; needed for correct client
  // IPs (rate limiting) and for Secure cookies over the proxied HTTPS.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow non-browser clients (curl, health checks) which send no Origin.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true, // allow the auth cookie
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Health check (used by Render/Railway). Reports DB connectivity.
  app.get('/api/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ ok: dbUp, uptime: process.uptime() });
  });

  app.use('/api', apiLimiter, requireAjaxHeader);
  app.use('/api/auth', authRoutes);
  app.use('/api/counters', counterRoutes);

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
