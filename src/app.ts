import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOrigins } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { userPasswordRouter } from './modules/user-password/user-password.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (_req, res) => {
    res.json({ message: 'API:OK' });
  });

  app.use('/api', apiRouter);
  app.use('/', authRouter);
  app.use('/', userPasswordRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
