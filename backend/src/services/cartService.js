import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

const FREE_SHIPPING_THRESHOLD = 2999;
const STANDARD_SHIPPING = 199;
const productFields = 'title slug brand price mrp images color sizes isActive';

function skuFor(product, size) {
  return `${product.slug}-uk-${size}`;
}

async function getOrCreateCart(userId) {
  return Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function checkedProduct(productId, size, quantity = 1) {
  if (!mongoose.isValidObjectId(productId)) throw new ApiError(400, 'Invalid product.');
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new ApiError(404, 'Product is unavailable.');
  const sizeEntry = product.sizes.find((item) => item.size === Number(size));
  if (!sizeEntry || sizeEntry.stock < quantity) throw new ApiError(409, `UK size ${size} is unavailable in the requested quantity.`);
  return product;
}

function calculateDiscount(coupon, subtotal) {
  if (!coupon || subtotal < coupon.minOrder) return 0;
  if (coupon.type === 'percentage') {
    const amount = Math.floor((subtotal * coupon.value) / 100);
    return Math.min(amount, coupon.maxDiscount ?? amount, subtotal);
  }
  if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal);
  return 0;
}

function couponIsUsable(coupon, subtotal, now = new Date()) {
  return Boolean(coupon && coupon.isActive && coupon.startsAt <= now
    && (!coupon.expiresAt || coupon.expiresAt >= now)
    && (coupon.usageLimit === null || coupon.usageLimit === undefined || coupon.usageCount < coupon.usageLimit)
    && subtotal >= coupon.minOrder);
}

async function populatedCart(userId) {
  let cart = await getOrCreateCart(userId);
  cart = await cart.populate([
    { path: 'items.product', select: productFields },
    { path: 'coupon' }
  ]);
  return cart;
}

function summarize(cart) {
  const items = cart.items.filter((item) => item.product).map((item) => {
    const product = item.product?.toObject ? item.product.toObject() : item.product;
    const sizeEntry = product?.sizes?.find((size) => size.size === item.size);
    return {
      sku: item.sku,
      product: product && { _id: product._id, title: product.title, slug: product.slug, brand: product.brand, price: product.price, mrp: product.mrp, images: product.images, color: product.color },
      size: item.size,
      quantity: item.quantity,
      availableStock: sizeEntry?.stock ?? 0,
      lineTotal: product?.price ? product.price * item.quantity : 0
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const coupon = couponIsUsable(cart.coupon, subtotal) ? cart.coupon : null;
  const discount = calculateDiscount(coupon, subtotal);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD || coupon?.type === 'free_shipping' ? 0 : STANDARD_SHIPPING;
  return {
    items,
    coupon: coupon ? { code: coupon.code, description: coupon.description, type: coupon.type, value: coupon.value } : null,
    couponError: cart.coupon && !coupon ? 'This coupon is no longer valid for your cart.' : null,
    pricing: { subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping) }
  };
}

export async function getCart(userId) {
  const cart = await populatedCart(userId);
  return summarize(cart);
}

export async function addItem(userId, { productId, size, quantity }) {
  const cart = await getOrCreateCart(userId);
  const skuProduct = await checkedProduct(productId, size, 1);
  const sku = skuFor(skuProduct, Number(size));
  const existing = cart.items.find((item) => item.sku === sku);
  const nextQuantity = (existing?.quantity || 0) + Number(quantity);
  const product = await checkedProduct(productId, size, nextQuantity);
  if (nextQuantity > 20) throw new ApiError(400, 'A maximum of 20 of the same size can be added.');
  if (existing) existing.quantity = nextQuantity;
  else cart.items.push({ product: product._id, sku, size: Number(size), quantity: Number(quantity) });
  await cart.save();
  return getCart(userId);
}

export async function updateItem(userId, sku, quantity) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((entry) => entry.sku === sku);
  if (!item) throw new ApiError(404, 'Cart item not found.');
  await checkedProduct(item.product, item.size, Number(quantity));
  item.quantity = Number(quantity);
  await cart.save();
  return getCart(userId);
}

export async function removeItem(userId, sku) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter((item) => item.sku !== sku);
  await cart.save();
  return getCart(userId);
}

export async function mergeItems(userId, guestItems) {
  const cart = await getOrCreateCart(userId);
  const combined = new Map(cart.items.map((item) => [item.sku, {
    productId: String(item.product), size: item.size, quantity: item.quantity
  }]));
  for (const input of guestItems) {
    const product = await checkedProduct(input.productId, input.size, 1);
    const sku = skuFor(product, Number(input.size));
    const current = combined.get(sku);
    const nextQuantity = (current?.quantity || 0) + Number(input.quantity);
    await checkedProduct(product._id, input.size, nextQuantity);
    if (nextQuantity > 20) throw new ApiError(400, `A maximum of 20 of ${product.title} in UK size ${input.size} can be added.`);
    combined.set(sku, { productId: String(product._id), size: Number(input.size), quantity: nextQuantity });
  }
  const productIds = [...new Set([...combined.values()].map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).select('_id slug').lean();
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  cart.items = [...combined.entries()].map(([sku, item]) => {
    const product = productsById.get(item.productId);
    if (!product) throw new ApiError(409, 'A product in your guest cart is no longer available.');
    return { product: product._id, sku, size: item.size, quantity: item.quantity };
  });
  await cart.save();
  return getCart(userId);
}

export async function applyCoupon(userId, code) {
  const cart = await getOrCreateCart(userId);
  const populated = await cart.populate('items.product', 'price');
  const subtotal = populated.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
  if (!coupon || !couponIsUsable(coupon, subtotal)) {
    throw new ApiError(400, 'This coupon is invalid, expired, used up, or does not meet the minimum order value.');
  }
  cart.coupon = coupon._id;
  await cart.save();
  return getCart(userId);
}

export async function removeCoupon(userId) {
  const cart = await getOrCreateCart(userId);
  cart.coupon = null;
  await cart.save();
  return getCart(userId);
}
