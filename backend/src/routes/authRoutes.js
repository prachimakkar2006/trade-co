import { Router } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';
import * as authController from '../controllers/authController.js';
import {
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from '../validators/authValidators.js';
import { verifyCsrf } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();
const profileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().pattern(/^$|^[6-9]\d{9}$/).required()
});
const csrfGuard = (req, _res, next) => {
  if (!verifyCsrf(req)) return next(new ApiError(403, 'Request security check failed. Refresh the page and try again.'));
  return next();
};

router.use(authRateLimiter);
router.get('/csrf', asyncHandler(authController.getCsrf));
router.post('/register', validate(registerSchema), asyncHandler(authController.register));
router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/google', validate(googleSchema), asyncHandler(authController.loginWithGoogle));
router.post('/refresh', csrfGuard, asyncHandler(authController.refresh));
router.post('/logout', csrfGuard, asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.patch('/profile', requireAuth, validate(profileSchema), asyncHandler(authController.updateProfile));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

export default router;
