import Joi from 'joi';

export const checkoutSchema = Joi.object({ addressId: Joi.string().hex().length(24).required() });
export const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().pattern(/^order_[A-Za-z0-9]+$/).required(),
  razorpay_payment_id: Joi.string().pattern(/^pay_[A-Za-z0-9]+$/).required(),
  razorpay_signature: Joi.string().hex().length(64).required()
});
export const orderIdSchema = Joi.string().hex().length(24).required();
export const idempotencyKeySchema = Joi.string().guid({ version: ['uuidv4'] }).required();
