import Category from '../models/Category.js';
import HeroSlide from '../models/HeroSlide.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

const allowedSorts = new Set(['newest', 'price-asc', 'price-desc', 'rating', 'popular']);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listProducts(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  const sort = query.sort || 'newest';
  if (!allowedSorts.has(sort)) throw new ApiError(400, 'Unsupported product sort option.');

  const filter = { isActive: true };
  if (query.category) {
    const category = await Category.findOne({ slug: query.category, isActive: true }).select('_id').lean();
    if (!category) return { products: [], pagination: { page, limit, total: 0, pages: 0 } };
    filter.category = category._id;
  }
  if (query.brand) filter.brand = new RegExp(`^${escapeRegex(query.brand)}$`, 'i');
  if (query.color) filter.color = new RegExp(escapeRegex(query.color), 'i');
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.size !== undefined) filter.sizes = { $elemMatch: { size: Number(query.size), stock: { $gt: 0 } } };
  if (query.rating !== undefined) filter.rating = { $gte: Number(query.rating) };
  if (query.exclusive === 'true') filter.isExclusive = true;
  if (query.q) filter.$text = { $search: query.q };

  const sortMap = {
    newest: { publishedAt: -1, _id: -1 },
    'price-asc': { price: 1, _id: 1 },
    'price-desc': { price: -1, _id: 1 },
    rating: { rating: -1, reviewCount: -1 },
    popular: { reviewCount: -1, rating: -1 }
  };
  let productsQuery = Product.find(filter)
    .select('title slug brand category description price mrp images color sizes rating reviewCount isExclusive publishedAt')
    .populate('category', 'name slug')
    .sort(sortMap[sort])
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  if (query.q) productsQuery = Product.find(filter, { score: { $meta: 'textScore' } })
    .select('title slug brand category description price mrp images color sizes rating reviewCount isExclusive publishedAt score')
    .populate('category', 'name slug')
    .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
    .skip((page - 1) * limit).limit(limit).lean();

  const [products, total] = await Promise.all([productsQuery, Product.countDocuments(filter)]);
  return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getProduct(slug) {
  const product = await Product.findOne({ slug, isActive: true })
    .select('title slug brand category description specifications price mrp images color sizes rating reviewCount isExclusive publishedAt')
    .populate('category', 'name slug')
    .lean();
  if (!product) throw new ApiError(404, 'Product not found.');
  return product;
}

export function listCategories() {
  return Category.find({ isActive: true }).select('name slug description image').sort({ sortOrder: 1, name: 1 }).lean();
}

export async function listHeroSlides() {
  const slides = await HeroSlide.find({ isActive: true })
    .select('image name city quote productRef order')
    .populate({ path: 'productRef', match: { isActive: true }, select: 'title slug price images' })
    .sort({ order: 1 }).lean();
  return slides;
}
