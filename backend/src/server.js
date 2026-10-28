import http from 'node:http';
import app from './app.js';
import { closeDatabase, connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import logger from './config/logger.js';

const server = http.createServer(app);

async function start() {
  await connectDatabase();
  server.listen(env.port, () => logger.info(`Server running on port ${env.port}`));
}

async function shutdown(signal) {
  logger.info(`${signal} received; shutting down`);
  server.close(async (error) => {
    if (error) logger.error(error.message);
    try {
      await closeDatabase();
      process.exit(error ? 1 : 0);
    } catch (closeError) {
      logger.error(closeError.message);
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start().catch((error) => {
  logger.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
