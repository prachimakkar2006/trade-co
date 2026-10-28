import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 120 },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  isVerifiedPurchase: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
export default mongoose.model('Review', reviewSchema);
