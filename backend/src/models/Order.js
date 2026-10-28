import mongoose from 'mongoose';
import { ORDER_STATUS } from '../constants/orderStatus.js';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  image: { type: String, default: '' },
  sku: { type: String, required: true },
  size: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  fullName: String, phone: String, pincode: String, addressLine1: String,
  addressLine2: String, landmark: String, city: String, state: String, type: String
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
  note: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true },
  shippingAddress: { type: addressSchema, required: true },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  shipping: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.CREATED, index: true },
  payment: {
    provider: { type: String, default: 'razorpay' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    signatureVerifiedAt: Date,
    refundId: String,
    inventoryRestockedAt: Date,
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refund_pending', 'refunded'], default: 'pending' }
  },
  idempotencyKey: { type: String, required: true },
  couponCode: { type: String, default: '' },
  tracking: { courier: String, trackingNumber: String, estimatedDelivery: Date },
  cancellationRequest: { reason: { type: String, default: '' }, requestedAt: Date },
  returnRequest: { reason: { type: String, default: '' }, requestedAt: Date },
  timeline: { type: [timelineSchema], default: [] }
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
export default mongoose.model('Order', orderSchema);
