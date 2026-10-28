import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['percentage', 'fixed', 'free_shipping'], required: true },
  value: { type: Number, min: 0, default: 0 },
  maxDiscount: { type: Number, min: 0, default: null },
  minOrder: { type: Number, min: 0, default: 0 },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  usageLimit: { type: Number, min: 0, default: null },
  usageCount: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
