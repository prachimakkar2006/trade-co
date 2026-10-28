import { env } from '../config/env.js';
import logger from '../config/logger.js';

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) logger.error(error.stack || error.message);
  const body = { success: false, message: statusCode >= 500 && env.nodeEnv === 'production' ? 'Internal server error' : error.message };
  if (error.details && env.nodeEnv !== 'production') body.details = error.details;
  if (env.nodeEnv !== 'production' && error.stack) body.stack = error.stack;
  res.status(statusCode).json(body);
}
