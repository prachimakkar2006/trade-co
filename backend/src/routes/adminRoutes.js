import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();
const objectId = Joi.string().hex().length(24).required();
const sizeSchema = Joi.object({ size: Joi.number().integer().min(6).max(11).required(), stock: Joi.number().integer().min(0).required() });
const productFields = {
  title: Joi.string().trim().min(2).max(160),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  brand: Joi.string().trim().min(1).max(100), category: objectId,
  description: Joi.string().trim().min(10).max(5000),
  specifications: Joi.object().pattern(Joi.string().max(60), Joi.string().max(300)),
  price: Joi.number().positive(), mrp: Joi.number().positive(),
  images: Joi.array().items(Joi.string().uri({ scheme: ['http', 'https'] })).min(2).max(4),
  color: Joi.string().trim().min(1).max(50),
  sizes: Joi.array().items(sizeSchema).min(5).max(6).unique('size'),
  isExclusive: Joi.boolean(), isActive: Joi.boolean()
};
const productCreate = Joi.object(productFields).fork(Object.keys(productFields), (field) => field.required());
const productUpdate = Joi.object(productFields).min(1);
const orderUpdate = Joi.object({
  status: Joi.string().valid(...Object.values(ORDER_STATUS).filter((status) => !['created', 'cancelled', 'returned', 'refunded', 'return_requested'].includes(status))),
  courier: Joi.string().trim().max(100).allow(''),
  trackingNumber: Joi.string().trim().max(150).allow(''),
  estimatedDelivery: Joi.date().iso().allow(null),
  note: Joi.string().trim().max(500).allow('')
}).min(1);
const refundSchema = Joi.object({ reason: Joi.string().trim().min(5).max(500).required() });
const reviewSchema = Joi.object({ isPublished: Joi.boolean().required() });

function validateId(name) {
  return (req, _res, next) => {
    const { error } = objectId.validate(req.params[name]);
    if (error) return next(new ApiError(400, `Invalid ${name}.`));
    return next();
  };
}

router.use(requireAuth, requireAdmin);
router.get('/dashboard', asyncHandler(adminController.dashboard));
router.get('/products', asyncHandler(adminController.listProducts));
router.post('/products', validate(productCreate), asyncHandler(adminController.createProduct));
router.patch('/products/:productId', validateId('productId'), validate(productUpdate), asyncHandler(adminController.updateProduct));
router.get('/orders', asyncHandler(adminController.listOrders));
router.patch('/orders/:orderId', validateId('orderId'), validate(orderUpdate), asyncHandler(adminController.updateOrder));
router.post('/orders/:orderId/refund', validateId('orderId'), validate(refundSchema), asyncHandler(adminController.refund));
router.get('/reviews', asyncHandler(adminController.listReviews));
router.patch('/reviews/:reviewId', validateId('reviewId'), validate(reviewSchema), asyncHandler(adminController.updateReview));

export default router;
