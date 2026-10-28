import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';
import * as orderController from '../controllers/orderController.js';
import { checkoutSchema, idempotencyKeySchema, orderIdSchema } from '../validators/orderValidators.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);
router.get('/', asyncHandler(orderController.listOrders));
router.post('/', validate(checkoutSchema), (req, _res, next) => {
  const { error, value } = idempotencyKeySchema.validate(req.get('Idempotency-Key'));
  if (error) return next(new ApiError(400, 'A valid Idempotency-Key header is required.'));
  req.idempotencyKey = value;
  return next();
}, asyncHandler(orderController.createCheckout));
router.get('/:orderId', (req, _res, next) => {
  const { error } = orderIdSchema.validate(req.params.orderId);
  if (error) return next(new ApiError(400, 'Invalid order.'));
  return next();
}, asyncHandler(orderController.getOrder));
const requestSchema = Joi.object({ reason: Joi.string().trim().min(5).max(500).required() });
router.post('/:orderId/cancel', validate(requestSchema), (req, _res, next) => {
  const { error } = orderIdSchema.validate(req.params.orderId);
  if (error) return next(new ApiError(400, 'Invalid order.'));
  return next();
}, asyncHandler(orderController.requestCancellation));
router.post('/:orderId/return', validate(requestSchema), (req, _res, next) => {
  const { error } = orderIdSchema.validate(req.params.orderId);
  if (error) return next(new ApiError(400, 'Invalid order.'));
  return next();
}, asyncHandler(orderController.requestReturn));

export default router;
