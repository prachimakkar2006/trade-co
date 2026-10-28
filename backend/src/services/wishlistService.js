import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

const wishlistFields = 'title slug brand category price mrp images color rating reviewCount isExclusive sizes';

export async function getWishlist(userId) {
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: 'products', match: { isActive: true }, select: wishlistFields, populate: { path: 'category', select: 'name slug' }
  }).lean();
  return wishlist?.products || [];
}

export async function addProduct(userId, productId) {
  const product = await Product.findOne({ _id: productId, isActive: true }).select('_id');
  if (!product) throw new ApiError(404, 'Product is unavailable.');
  await Wishlist.findOneAndUpdate(
    { user: userId }, { $setOnInsert: { user: userId }, $addToSet: { products: product._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return getWishlist(userId);
}

export async function removeProduct(userId, productId) {
  await Wishlist.findOneAndUpdate({ user: userId }, { $pull: { products: productId } });
  return getWishlist(userId);
}
