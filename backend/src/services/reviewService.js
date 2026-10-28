import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { ApiError } from '../utils/ApiError.js';

export async function listProductReviews(slug) {
  const product = await Product.findOne({ slug, isActive: true }).select('_id').lean();
  if (!product) throw new ApiError(404, 'Product not found.');
  const reviews = await Review.find({ product: product._id, isPublished: true }).sort({ createdAt: -1 }).populate('user', 'name').lean();
  return reviews.map(({ _id, rating, title, body, isVerifiedPurchase, createdAt, user }) => ({
    _id, rating, title, body, isVerifiedPurchase, createdAt,
    customerName: user?.name?.trim().split(/\s+/)[0] || 'Customer'
  }));
}

export async function createProductReview(userId, productId, { rating, title, body }) {
  if (!mongoose.isValidObjectId(productId)) throw new ApiError(400, 'Invalid product.');
  const product = await Product.findOne({ _id: productId, isActive: true }).select('_id').lean();
  if (!product) throw new ApiError(404, 'Product not found.');
  const order = await Order.findOne({ user: userId, status: ORDER_STATUS.DELIVERED, 'items.product': product._id }).select('_id').sort({ createdAt: -1 }).lean();
  if (!order) throw new ApiError(403, 'A delivered tread&co order is required to review this pair.');
  try {
    return await Review.create({ product: product._id, user: userId, order: order._id, rating, title, body, isVerifiedPurchase: true, isPublished: false });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You have already reviewed this product.');
    throw error;
  }
}
