import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  MONGO_URI: Joi.string().trim().required(),
  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ACCESS_TTL: Joi.string().default('15m'),
  REFRESH_TTL: Joi.string().default('7d'),
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  RAZORPAY_KEY_ID: Joi.string().allow('').default(''),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').default(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').default(''),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().allow('').default(''),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().allow('').default(''),
  SENDGRID_API_KEY: Joi.string().allow('').default(''),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(12).required()
}).unknown(true);

const { value, error } = schema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  const details = error.details.map(({ message, context }) => `${context.key}: ${message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze({
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  mongoUri: value.MONGO_URI,
  clientUrl: value.CLIENT_URL,
  jwtAccessSecret: value.JWT_ACCESS_SECRET,
  jwtRefreshSecret: value.JWT_REFRESH_SECRET,
  accessTtl: value.ACCESS_TTL,
  refreshTtl: value.REFRESH_TTL,
  googleClientId: value.GOOGLE_CLIENT_ID,
  razorpayKeyId: value.RAZORPAY_KEY_ID,
  razorpayKeySecret: value.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: value.RAZORPAY_WEBHOOK_SECRET,
  cloudinaryCloudName: value.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: value.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: value.CLOUDINARY_API_SECRET,
  smtpHost: value.SMTP_HOST,
  smtpPort: value.SMTP_PORT,
  smtpUser: value.SMTP_USER,
  smtpPassword: value.SMTP_PASSWORD,
  smtpFrom: value.SMTP_FROM,
  sendgridApiKey: value.SENDGRID_API_KEY,
  adminEmail: value.ADMIN_EMAIL,
  adminPassword: value.ADMIN_PASSWORD
});
