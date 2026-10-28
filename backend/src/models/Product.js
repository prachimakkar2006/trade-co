import mongoose from 'mongoose';

const sizeStockSchema = new mongoose.Schema({
  size: { type: Number, required: true, min: 6, max: 11 },
  stock: { type: Number, required: true, min: 0, default: 0 }
}, { _id: false });

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  brand: { type: String, required: true, trim: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  description: { type: String, required: true },
  specifications: { type: Map, of: String, default: {} },
  price: { type: Number, required: true, min: 1 },
  mrp: { type: Number, required: true, min: 1 },
  images: { type: [String], validate: [(images) => images.length >= 2 && images.length <= 4, 'Products need 2 to 4 images'] },
  color: { type: String, required: true, trim: true },
  sizes: { type: [sizeStockSchema], validate: [(sizes) => sizes.length >= 5 && sizes.length <= 6, 'Products need 5 or 6 sizes'] },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  isExclusive: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

productSchema.index({ title: 'text', brand: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1, price: 1 });
export default mongoose.model('Product', productSchema);
