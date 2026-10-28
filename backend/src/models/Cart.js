import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  size: { type: Number, required: true, min: 6, max: 11 },
  quantity: { type: Number, required: true, min: 1, max: 20 }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: { type: [cartItemSchema], default: [] },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null }
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);
