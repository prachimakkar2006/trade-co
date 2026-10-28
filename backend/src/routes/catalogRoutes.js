import { Router } from 'express';
import Joi from 'joi';
import * as catalogController from '../controllers/catalogController.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const querySchema = Joi.object({
  category: Joi.string().max(80),
  brand: Joi.string().max(80),
  color: Joi.string().max(80),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  size: Joi.number().integer().min(6).max(11),
  rating: Joi.number().min(0).max(5),
  exclusive: Joi.string().valid('true', 'false'),
  q: Joi.string().trim().max(100),
  sort: Joi.string().valid('newest', 'price-asc', 'price-desc', 'rating', 'popular'),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(48)
}).unknown(false);

function validateQuery(req, _res, next) {
  const { error } = querySchema.validate(req.query, { abortEarly: false, convert: true });
  if (error) return next(new ApiError(400, 'Invalid product filters.', error.details.map((item) => ({
    field: item.path.join('.'), message: item.message
  }))));
  if (req.query.minPrice !== undefined && req.query.maxPrice !== undefined && Number(req.query.minPrice) > Number(req.query.maxPrice)) {
    return next(new ApiError(400, 'Minimum price must not exceed maximum price.'));
  }
  return next();
}

router.get('/categories', asyncHandler(catalogController.categories));
router.get('/hero-slides', asyncHandler(catalogController.heroSlides));
router.get('/products/exclusive', validateQuery, asyncHandler(catalogController.exclusive));
router.get('/products', validateQuery, asyncHandler(catalogController.products));
router.get('/products/:slug', asyncHandler(catalogController.product));

export default router;
