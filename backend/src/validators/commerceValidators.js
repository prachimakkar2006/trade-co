import Joi from 'joi';

const objectId = Joi.string().hex().length(24).required();
const addressFields = {
  fullName: Joi.string().trim().min(2).max(100),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number.' }),
  pincode: Joi.string().pattern(/^\d{6}$/).messages({ 'string.pattern.base': 'Enter a valid 6-digit PIN code.' }),
  addressLine1: Joi.string().trim().min(5).max(180),
  addressLine2: Joi.string().trim().allow('').max(180),
  landmark: Joi.string().trim().allow('').max(120),
  city: Joi.string().trim().min(2).max(100),
  state: Joi.string().trim().min(2).max(100),
  type: Joi.string().valid('home', 'work'),
  isDefault: Joi.boolean()
};

export const addCartItemSchema = Joi.object({ productId: objectId, size: Joi.number().integer().min(6).max(11).required(), quantity: Joi.number().integer().min(1).max(20).default(1) });
export const updateCartItemSchema = Joi.object({ quantity: Joi.number().integer().min(1).max(20).required() });
export const mergeCartSchema = Joi.object({
  items: Joi.array().max(100).items(Joi.object({ productId: objectId, size: Joi.number().integer().min(6).max(11).required(), quantity: Joi.number().integer().min(1).max(20).required() })).required()
});
export const couponSchema = Joi.object({ code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]{3,40}$/).required() });
export const addWishlistSchema = Joi.object({ productId: objectId });
export const addressSchema = Joi.object({
  fullName: addressFields.fullName.required(), phone: addressFields.phone.required(), pincode: addressFields.pincode.required(),
  addressLine1: addressFields.addressLine1.required(), addressLine2: addressFields.addressLine2.default(''),
  landmark: addressFields.landmark.default(''), city: addressFields.city.required(), state: addressFields.state.required(),
  type: addressFields.type.default('home'), isDefault: addressFields.isDefault.default(false)
});
export const addressUpdateSchema = Joi.object(addressFields).min(1);
