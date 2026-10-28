import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { ApiError } from '../utils/ApiError.js';

export async function dashboard() {
  const [products, customers, orders, paid, pending, lowStock, recentOrders] = await Promise.all([
    Product.countDocuments({ isActive: true }), User.countDocuments({ role: 'customer', isActive: true }),
    Order.countDocuments(), Order.aggregate([{ $match: { 'payment.status': 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments({ $or: [{ 'cancellationRequest.requestedAt': { $exists: true } }, { 'returnRequest.requestedAt': { $exists: true } }] }),
    Product.countDocuments({ isActive: true, sizes: { $elemMatch: { stock: { $lte: 3 } } } }),
    Order.find().sort({ createdAt: -1 }).limit(8).select('orderNumber total status payment.status createdAt').populate('user', 'name email').lean()
  ]);
  return { products, customers, orders, revenue: paid[0]?.total || 0, pendingRequests: pending, lowStock, recentOrders };
}

export async function listProducts() {
  return Product.find().sort({ updatedAt: -1 }).populate('category', 'name').lean();
}

export async function createProduct(data) {
  const category = await Category.findById(data.category);
  if (!category) throw new ApiError(400, 'Choose a valid category.');
  try { return await Product.create(data); }
  catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'That product slug is already in use.');
    throw error;
  }
}

export async function updateProduct(productId, changes) {
  if (!mongoose.isValidObjectId(productId)) throw new ApiError(400, 'Invalid product.');
  if (changes.category && !await Category.exists({ _id: changes.category })) throw new ApiError(400, 'Choose a valid category.');
  const product = await Product.findByIdAndUpdate(productId, { $set: changes }, { new: true, runValidators: true }).populate('category', 'name');
  if (!product) throw new ApiError(404, 'Product not found.');
  return product;
}

export async function listOrders() {
  return Order.find().sort({ createdAt: -1 }).limit(100).populate('user', 'name email').lean();
}

export async function updateOrder(orderId, { status, courier, trackingNumber, estimatedDelivery, note }) {
  if (!mongoose.isValidObjectId(orderId)) throw new ApiError(400, 'Invalid order.');
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED || status === ORDER_STATUS.RETURNED) {
    throw new ApiError(400, 'Use the refund action for refunds, and keep cancellation and returns in their request states until processed.');
  }
  if (status && order.payment.status !== 'paid') throw new ApiError(409, 'Only paid orders can move through fulfilment.');
  if (status) {
    const nextStatus = {
      [ORDER_STATUS.PAID]: ORDER_STATUS.CONFIRMED,
      [ORDER_STATUS.CONFIRMED]: ORDER_STATUS.PACKED,
      [ORDER_STATUS.PACKED]: ORDER_STATUS.SHIPPED,
      [ORDER_STATUS.SHIPPED]: ORDER_STATUS.OUT_FOR_DELIVERY,
      [ORDER_STATUS.OUT_FOR_DELIVERY]: ORDER_STATUS.DELIVERED
    }[order.status];
    if (nextStatus !== status) throw new ApiError(409, `Order must move from ${order.status.replaceAll('_', ' ')} to ${nextStatus?.replaceAll('_', ' ') || 'a support reviewed resolution'}.`);
    order.status = status;
    order.timeline.push({ status, note: note || `Order status updated to ${status.replaceAll('_', ' ')}.` });
  }
  if (courier !== undefined || trackingNumber !== undefined || estimatedDelivery !== undefined) {
    order.tracking = { ...(order.tracking || {}), ...(courier !== undefined ? { courier } : {}), ...(trackingNumber !== undefined ? { trackingNumber } : {}), ...(estimatedDelivery !== undefined ? { estimatedDelivery } : {}) };
  }
  await order.save();
  return order;
}

export async function listReviews() {
  return Review.find().sort({ createdAt: -1 }).limit(200).populate('product', 'title slug').populate('user', 'name email').lean();
}

export async function setReviewPublished(reviewId, isPublished) {
  if (!mongoose.isValidObjectId(reviewId)) throw new ApiError(400, 'Invalid review.');
  const review = await Review.findByIdAndUpdate(reviewId, { $set: { isPublished } }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found.');
  const [summary] = await Review.aggregate([
    { $match: { product: review.product, isPublished: true } },
    { $group: { _id: '$product', rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
  ]);
  await Product.updateOne({ _id: review.product }, { $set: { rating: summary ? Math.round(summary.rating * 10) / 10 : 0, reviewCount: summary?.reviewCount || 0 } });
  return review;
}
