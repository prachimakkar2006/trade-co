import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { ApiError } from '../utils/ApiError.js';

const FREE_SHIPPING_THRESHOLD = 2999;
const STANDARD_SHIPPING = 199;

function requireRazorpayConfig() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new ApiError(503, 'Razorpay is not configured. Add test API keys to the backend environment.');
  }
}

function authHeader() {
  const token = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
  return `Basic ${token}`;
}

async function razorpayRequest(path, { method = 'GET', body } = {}) {
  requireRazorpayConfig();
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw new ApiError(502, 'Could not reach Razorpay. Please try again.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.warn(`Razorpay API request failed (${response.status}): ${result.error?.code || 'unknown error'}`);
    throw new ApiError(response.status === 401 ? 503 : 502, response.status === 401
      ? 'Razorpay rejected the configured keys. Confirm both keys are from the same test-mode account.'
      : result.error?.description || 'Razorpay could not process the request.');
  }
  return result;
}

function couponIsUsable(coupon, subtotal, now = new Date()) {
  return Boolean(coupon && coupon.isActive && coupon.startsAt <= now
    && (!coupon.expiresAt || coupon.expiresAt >= now)
    && (coupon.usageLimit === null || coupon.usageLimit === undefined || coupon.usageCount < coupon.usageLimit)
    && subtotal >= coupon.minOrder);
}

function calculateQuote(cart) {
  const items = cart.items.filter((item) => item.product?.isActive).map((item) => {
    const product = item.product;
    const sizeEntry = product.sizes.find((size) => size.size === item.size);
    if (!sizeEntry || sizeEntry.stock < item.quantity) {
      throw new ApiError(409, `${product.title} in UK size ${item.size} is no longer available in that quantity.`);
    }
    return {
      product: product._id,
      title: product.title,
      image: product.images?.[0] || '',
      sku: item.sku,
      size: item.size,
      quantity: item.quantity,
      unitPrice: product.price
    };
  });
  if (!items.length) throw new ApiError(400, 'Your bag is empty. Add an item before checkout.');
  if (items.length !== cart.items.length) throw new ApiError(409, 'A product in your bag is no longer available. Refresh your bag and try again.');

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const coupon = couponIsUsable(cart.coupon, subtotal) ? cart.coupon : null;
  const discount = coupon?.type === 'percentage'
    ? Math.min(Math.floor(subtotal * coupon.value / 100), coupon.maxDiscount ?? Infinity, subtotal)
    : coupon?.type === 'fixed' ? Math.min(coupon.value, subtotal) : 0;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || coupon?.type === 'free_shipping' ? 0 : STANDARD_SHIPPING;
  return { items, subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping), couponCode: coupon?.code || '' };
}

function exposeOrder(order) {
  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    items: order.items,
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    shipping: order.shipping,
    total: order.total,
    status: order.status,
    payment: { provider: order.payment.provider, status: order.payment.status, refundId: order.payment.refundId || '' },
    couponCode: order.couponCode,
    tracking: order.tracking || {},
    cancellationRequest: order.cancellationRequest || {},
    returnRequest: order.returnRequest || {},
    timeline: order.timeline,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export async function createCheckout(userId, { addressId, idempotencyKey }) {
  requireRazorpayConfig();
  const existing = await Order.findOne({ user: userId, idempotencyKey });
  if (existing?.payment?.razorpayOrderId) {
    return {
      order: exposeOrder(existing),
      razorpayOrder: { id: existing.payment.razorpayOrderId, amount: Math.round(existing.total * 100), currency: 'INR' },
      keyId: env.razorpayKeyId
    };
  }

  const [user, cart] = await Promise.all([
    User.findById(userId),
    Cart.findOne({ user: userId }).populate('items.product').populate('coupon')
  ]);
  if (!user) throw new ApiError(404, 'Account not found.');
  const address = user.addresses.id(addressId);
  if (!address) throw new ApiError(400, 'Select a saved delivery address before continuing.');
  if (!cart) throw new ApiError(400, 'Your bag is empty. Add an item before checkout.');

  const totals = calculateQuote(cart);
  const amount = Math.round(totals.total * 100);
  if (!Number.isSafeInteger(amount) || amount < 100) throw new ApiError(400, 'The order total must be at least ₹1.');
  const orderNumber = `TCO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const gatewayOrder = await razorpayRequest('/orders', {
    method: 'POST',
    body: { amount, currency: 'INR', receipt: orderNumber, notes: { treadcoOrderNumber: orderNumber } }
  });

  let order;
  try {
    order = await Order.create({
      orderNumber,
      user: userId,
      items: totals.items,
      shippingAddress: address.toObject(),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: 0,
      shipping: totals.shipping,
      total: totals.total,
      status: ORDER_STATUS.CREATED,
      payment: { provider: 'razorpay', razorpayOrderId: gatewayOrder.id, status: 'pending' },
      idempotencyKey,
      couponCode: totals.couponCode,
      timeline: [{ status: ORDER_STATUS.CREATED, note: 'Order created; payment pending.' }]
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = await Order.findOne({ user: userId, idempotencyKey });
      if (duplicate?.payment?.razorpayOrderId) {
        return {
          order: exposeOrder(duplicate),
          razorpayOrder: { id: duplicate.payment.razorpayOrderId, amount: Math.round(duplicate.total * 100), currency: 'INR' },
          keyId: env.razorpayKeyId
        };
      }
    }
    throw error;
  }

  return {
    order: exposeOrder(order),
    razorpayOrder: { id: gatewayOrder.id, amount: gatewayOrder.amount, currency: gatewayOrder.currency },
    keyId: env.razorpayKeyId
  };
}

function matchesHexSignature(expected, received) {
  if (typeof received !== 'string' || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(received, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function issueRefund(paymentId) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: 'POST', body: {} });
}

async function markOrderPaid(orderId, payment) {
  if (!payment || payment.status !== 'captured' || payment.captured !== true) {
    throw new ApiError(409, 'Razorpay has not confirmed a captured payment yet.');
  }
  const existing = await Order.findOne({ 'payment.razorpayOrderId': payment.order_id });
  if (!existing || String(existing._id) !== String(orderId)) throw new ApiError(404, 'Order not found for this payment.');
  if (payment.amount !== Math.round(existing.total * 100) || payment.currency !== 'INR') {
    throw new ApiError(409, 'The captured payment amount does not match this order.');
  }
  if (existing.payment.status === 'paid') return exposeOrder(existing);
  if (existing.payment.status === 'refunded') throw new ApiError(409, 'This payment has already been refunded.');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(existing._id).session(session);
      if (order.payment.status === 'paid') return;

      for (const item of order.items) {
        const update = await Product.updateOne(
          { _id: item.product, isActive: true, sizes: { $elemMatch: { size: item.size, stock: { $gte: item.quantity } } } },
          { $inc: { 'sizes.$.stock': -item.quantity } },
          { session }
        );
        if (!update.modifiedCount) throw new ApiError(409, `Inventory changed for ${item.title} in UK size ${item.size}.`);
      }

      order.payment.razorpayPaymentId = payment.id;
      order.payment.signatureVerifiedAt = new Date();
      order.payment.status = 'paid';
      order.status = ORDER_STATUS.PAID;
      order.timeline.push({ status: ORDER_STATUS.PAID, note: 'Razorpay payment captured and verified.' });
      await order.save({ session });

      const cart = await Cart.findOne({ user: order.user }).session(session);
      if (cart) {
        for (const purchased of order.items) {
          const line = cart.items.find((item) => item.sku === purchased.sku);
          if (!line) continue;
          line.quantity -= purchased.quantity;
          if (line.quantity <= 0) cart.items = cart.items.filter((item) => item.sku !== purchased.sku);
        }
        if (!cart.items.length) cart.coupon = null;
        await cart.save({ session });
      }

      if (order.couponCode) {
        const coupon = await Coupon.findOne({ code: order.couponCode }).session(session);
        if (coupon) {
          coupon.usageCount += 1;
          await coupon.save({ session });
        }
      }
    });
  } catch (error) {
    if (error.statusCode === 409) {
      try {
        await issueRefund(payment.id);
        const refundUpdate = await Order.updateOne({ _id: existing._id, 'payment.status': { $in: ['pending', 'failed'] } }, {
          $set: { 'payment.status': 'refunded', 'payment.razorpayPaymentId': payment.id, status: ORDER_STATUS.REFUNDED },
          $push: { timeline: { status: ORDER_STATUS.REFUNDED, note: 'Payment refunded because stock changed before confirmation.' } }
        });
        if (refundUpdate.modifiedCount) return exposeOrder(await Order.findById(existing._id));
        const latest = await Order.findById(existing._id);
        if (latest?.payment.status === 'paid' || latest?.payment.status === 'refunded') return exposeOrder(latest);
      } catch (refundError) {
        logger.error(`Refund could not be initiated for order ${existing.orderNumber}: ${refundError.message}`);
        throw new ApiError(502, `Payment was captured but the order needs support review. Reference ${existing.orderNumber}.`);
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return exposeOrder(await Order.findById(existing._id));
}

export async function verifyCheckoutPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const order = await Order.findOne({ user: userId, 'payment.razorpayOrderId': razorpay_order_id });
  if (!order) throw new ApiError(404, 'Order not found for this payment.');
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret)
    .update(`${order.payment.razorpayOrderId}|${razorpay_payment_id}`)
    .digest('hex');
  if (!matchesHexSignature(expected, razorpay_signature)) throw new ApiError(400, 'Payment verification failed.');

  const payment = await razorpayRequest(`/payments/${encodeURIComponent(razorpay_payment_id)}`);
  if (payment.order_id !== order.payment.razorpayOrderId) throw new ApiError(400, 'Payment does not belong to this order.');
  return markOrderPaid(order._id, payment);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret) throw new ApiError(503, 'Razorpay webhook secret is not configured.');
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function processWebhook(eventId, eventType, payload) {
  let event = await WebhookEvent.findOne({ provider: 'razorpay', eventId });
  if (event?.processedAt) return { duplicate: true };
  if (!event) {
    try {
      event = await WebhookEvent.create({
        provider: 'razorpay', eventId, eventType,
        payload: {
          paymentId: payload.payment?.entity?.id || '',
          orderId: payload.payment?.entity?.order_id || payload.order?.entity?.id || '',
          paymentStatus: payload.payment?.entity?.status || ''
        }
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      event = await WebhookEvent.findOne({ provider: 'razorpay', eventId });
      if (event?.processedAt) return { duplicate: true };
    }
  }

  try {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = payload.payment?.entity;
      if (payment?.id && payment.order_id) {
        const order = await Order.findOne({ 'payment.razorpayOrderId': payment.order_id });
        if (order) await markOrderPaid(order._id, payment);
      }
    } else if (eventType === 'payment.failed') {
      const payment = payload.payment?.entity;
      if (payment?.order_id) {
        await Order.updateOne(
          { 'payment.razorpayOrderId': payment.order_id, 'payment.status': 'pending' },
          { $set: { 'payment.status': 'failed', 'payment.razorpayPaymentId': payment.id },
            $push: { timeline: { status: ORDER_STATUS.CREATED, note: 'Payment attempt failed. You can try again.' } } }
        );
      }
    } else if (eventType === 'refund.processed') {
      const refund = payload.refund?.entity;
      if (refund?.payment_id) {
        const order = await Order.findOne({ 'payment.razorpayPaymentId': refund.payment_id, 'payment.refundId': refund.id });
        if (order && order.payment.status === 'refund_pending') await completeRefund(order._id, refund.id);
      }
    }
    event.processedAt = new Date();
    event.processingError = undefined;
    await event.save();
    return { duplicate: false };
  } catch (error) {
    event.processingError = error.message;
    await event.save();
    throw error;
  }
}

async function completeRefund(orderId, refundId) {
  const session = await mongoose.startSession();
  let completed;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order || order.payment.status === 'refunded') { completed = order; return; }
      if (order.payment.status !== 'refund_pending' || order.payment.refundId !== refundId) return;
      if (!order.payment.inventoryRestockedAt && order.cancellationRequest?.requestedAt
        && [ORDER_STATUS.PAID, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED].includes(order.status)) {
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product, sizes: { $elemMatch: { size: item.size } } },
            { $inc: { 'sizes.$.stock': item.quantity } },
            { session }
          );
        }
        order.payment.inventoryRestockedAt = new Date();
      }
      order.payment.status = 'refunded';
      order.status = ORDER_STATUS.REFUNDED;
      order.timeline.push({ status: ORDER_STATUS.REFUNDED, note: `Refund processed (${refundId}).` });
      await order.save({ session });
      completed = order;
    });
  } finally {
    await session.endSession();
  }
  return completed ? exposeOrder(completed) : null;
}

export async function listOrders(userId) {
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
  return orders.map(exposeOrder);
}

export async function getOrder(userId, orderId) {
  if (!mongoose.isValidObjectId(orderId)) throw new ApiError(400, 'Invalid order.');
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new ApiError(404, 'Order not found.');
  return exposeOrder(order);
}

export async function requestCancellation(userId, orderId, reason) {
  if (!mongoose.isValidObjectId(orderId)) throw new ApiError(400, 'Invalid order.');
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new ApiError(404, 'Order not found.');
  if (!['created', 'paid', 'confirmed', 'packed'].includes(order.status)) {
    throw new ApiError(409, 'This order can no longer be cancelled online. Contact support for help.');
  }
  if (order.status === 'created' && order.payment.status !== 'paid') {
    order.status = ORDER_STATUS.CANCELLED;
    order.timeline.push({ status: ORDER_STATUS.CANCELLED, note: 'Order cancelled before payment.' });
  } else if (order.cancellationRequest?.requestedAt) {
    throw new ApiError(409, 'A cancellation request is already in progress.');
  }
  order.cancellationRequest = { reason, requestedAt: new Date() };
  if (order.status !== ORDER_STATUS.CANCELLED) {
    order.timeline.push({ status: order.status, note: 'Cancellation requested. Our team will review it.' });
  }
  await order.save();
  return exposeOrder(order);
}

export async function requestReturn(userId, orderId, reason) {
  if (!mongoose.isValidObjectId(orderId)) throw new ApiError(400, 'Invalid order.');
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new ApiError(404, 'Order not found.');
  const deliveredAt = [...order.timeline].reverse().find((entry) => entry.status === ORDER_STATUS.DELIVERED)?.at;
  if (order.status !== ORDER_STATUS.DELIVERED || !deliveredAt || Date.now() - deliveredAt.getTime() > 7 * 86400000) {
    throw new ApiError(409, 'Returns can be requested within 7 days of delivery.');
  }
  if (order.returnRequest?.requestedAt) throw new ApiError(409, 'A return request has already been submitted.');
  order.status = ORDER_STATUS.RETURN_REQUESTED;
  order.returnRequest = { reason, requestedAt: new Date() };
  order.timeline.push({ status: ORDER_STATUS.RETURN_REQUESTED, note: 'Return requested. Our team will review it.' });
  await order.save();
  return exposeOrder(order);
}

export async function refundOrder(orderId, reason) {
  if (!mongoose.isValidObjectId(orderId)) throw new ApiError(400, 'Invalid order.');
  const order = await Order.findOneAndUpdate(
    { _id: orderId, 'payment.status': 'paid', 'payment.razorpayPaymentId': { $exists: true, $ne: '' } },
    { $set: { 'payment.status': 'refund_pending' } },
    { new: true }
  );
  if (!order) throw new ApiError(409, 'Order is not eligible for refund, or a refund is already being processed.');
  let refund;
  try {
    refund = await issueRefund(order.payment.razorpayPaymentId);
  } catch (error) {
    await Order.updateOne({ _id: orderId, 'payment.status': 'refund_pending', 'payment.refundId': { $exists: false } }, { $set: { 'payment.status': 'paid' } });
    throw error;
  }
  order.payment.refundId = refund.id;
  order.payment.status = 'refund_pending';
  order.timeline.push({
    status: order.status,
    note: `${reason} Refund ${refund.status === 'processed' ? 'completed' : 'initiated'}${refund.id ? ` (${refund.id})` : ''}.`
  });
  await order.save();
  if (refund.status === 'processed') return completeRefund(order._id, refund.id);
  return exposeOrder(order);
}
