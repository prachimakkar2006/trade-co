import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';
import * as orderController from '../controllers/orderController.js';
import { verifyPaymentSchema } from '../validators/orderValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);
router.post('/verify', validate(verifyPaymentSchema), asyncHandler(orderController.verifyPayment));

export default router;
