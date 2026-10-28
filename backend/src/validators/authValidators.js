import Joi from 'joi';

const email = Joi.string().trim().lowercase().email().max(254).required();
const password = Joi.string().min(12).max(128).required();

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email,
  password
});

export const loginSchema = Joi.object({ email, password: Joi.string().min(1).max(128).required() });
export const googleSchema = Joi.object({ idToken: Joi.string().min(20).required() });
export const forgotPasswordSchema = Joi.object({ email });
export const resetPasswordSchema = Joi.object({
  email,
  token: Joi.string().hex().length(96).required(),
  password
});
