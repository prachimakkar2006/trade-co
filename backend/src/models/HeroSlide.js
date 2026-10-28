import mongoose from 'mongoose';

const heroSlideSchema = new mongoose.Schema({
  image: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  quote: { type: String, required: true, trim: true, maxlength: 500 },
  productRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

heroSlideSchema.index({ isActive: 1, order: 1 });
heroSlideSchema.index({ order: 1 }, { unique: true });
export default mongoose.model('HeroSlide', heroSlideSchema);
