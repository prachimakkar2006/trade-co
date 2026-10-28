import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as reviewController from '../controllers/reviewController.js';

const router = Router();
const idSchema = Joi.string().hex().length(24).required();
const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().max(120).allow('').default(''),
  body: Joi.string().trim().min(10).max(2000).required()
});
router.get('/products/:slug/reviews', asyncHandler(reviewController.list));
router.post('/products/:productId/reviews', requireAuth, (req, _res, next) => {
  if (idSchema.validate(req.params.productId).error) return next(new ApiError(400, 'Invalid product.'));
  return next();
}, validate(reviewSchema), asyncHandler(reviewController.create));

export default router;
