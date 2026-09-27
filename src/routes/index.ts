import { Router } from 'express';
import { checkDatabaseConnection } from '../db/pool.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { productsRouter } from '../modules/products/products.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Readiness: reports whether the process can actually reach PostgreSQL.
apiRouter.get('/health/db', async (_req, res) => {
  try {
    await checkDatabaseConnection();
    res.json({ status: 'ok', database: 'reachable' });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

apiRouter.use('/users', usersRouter);
apiRouter.use('/products', productsRouter);
