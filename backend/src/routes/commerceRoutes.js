import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';
import * as commerceController from '../controllers/commerceController.js';
import {
  addCartItemSchema, addressSchema, addressUpdateSchema, couponSchema, mergeCartSchema, updateCartItemSchema
} from '../validators/commerceValidators.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function validateRouteParam(parameter, schema) {
  return (req, _res, next) => {
    const { error } = schema.validate(req.params[parameter]);
    if (error) return next(new ApiError(400, `Invalid ${parameter}.`));
    return next();
  };
}

const skuSchema = Joi.string().pattern(/^[a-z0-9-]+-uk-(6|7|8|9|10|11)$/i).required();
const objectIdSchema = Joi.string().hex().length(24).required();
const pincodeSchema = Joi.string().pattern(/^\d{6}$/).required();

const cartRouter = Router();
cartRouter.param('sku', validateRouteParam('sku', skuSchema));
cartRouter.use(requireAuth);
cartRouter.get('/', asyncHandler(commerceController.getCart));
cartRouter.post('/items', validate(addCartItemSchema), asyncHandler(commerceController.addCartItem));
cartRouter.post('/merge', validate(mergeCartSchema), asyncHandler(commerceController.mergeCart));
cartRouter.patch('/items/:sku', validate(updateCartItemSchema), asyncHandler(commerceController.updateCartItem));
cartRouter.delete('/items/:sku', asyncHandler(commerceController.removeCartItem));
cartRouter.post('/coupon', validate(couponSchema), asyncHandler(commerceController.applyCoupon));
cartRouter.delete('/coupon', asyncHandler(commerceController.removeCoupon));

const wishlistRouter = Router();
wishlistRouter.param('productId', validateRouteParam('productId', objectIdSchema));
wishlistRouter.use(requireAuth);
wishlistRouter.get('/', asyncHandler(commerceController.getWishlist));
wishlistRouter.post('/:productId', asyncHandler(commerceController.addWishlistItem));
wishlistRouter.delete('/:productId', asyncHandler(commerceController.removeWishlistItem));

const addressesRouter = Router();
addressesRouter.param('addressId', validateRouteParam('addressId', objectIdSchema));
addressesRouter.use(requireAuth);
addressesRouter.get('/', asyncHandler(commerceController.getAddresses));
addressesRouter.post('/', validate(addressSchema), asyncHandler(commerceController.createAddress));
addressesRouter.patch('/:addressId', validate(addressUpdateSchema), asyncHandler(commerceController.updateAddress));
addressesRouter.delete('/:addressId', asyncHandler(commerceController.deleteAddress));

const router = Router();
router.use('/cart', cartRouter);
router.use('/wishlist', wishlistRouter);
router.use('/users/addresses', addressesRouter);
router.get('/pincode/:pincode', validateRouteParam('pincode', pincodeSchema), asyncHandler(commerceController.lookupPincode));

export default router;
