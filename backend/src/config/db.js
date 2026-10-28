import mongoose from 'mongoose';
import { env } from './env.js';
import logger from './logger.js';

export async function connectDatabase() {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (error) => logger.error(`MongoDB connection error: ${error.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  await mongoose.connect(env.mongoUri, { dbName: 'shoestore', serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

export function getDatabaseStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return { state: states[mongoose.connection.readyState] ?? 'unknown', connected: mongoose.connection.readyState === 1 };
}

export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
