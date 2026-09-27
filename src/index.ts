import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection, closePool } from './db/pool.js';

async function main(): Promise<void> {
  try {
    await checkDatabaseConnection();
    console.log('Connected to PostgreSQL');
  } catch (error) {
    console.error('Could not reach PostgreSQL — check DATABASE_URL in .env');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const server = createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);

    // Force-exit if connections refuse to drain.
    const timer = setTimeout(() => process.exit(1), 10_000);
    timer.unref();

    server.close(async (closeError) => {
      if (closeError) console.error('Error closing HTTP server', closeError);
      await closePool().catch((error) => console.error('Error closing pool', error));
      process.exit(closeError ? 1 : 0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal startup error', error);
  process.exit(1);
});
