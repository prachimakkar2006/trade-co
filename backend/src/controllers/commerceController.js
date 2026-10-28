import * as addressService from '../services/addressService.js';
import * as cartService from '../services/cartService.js';
import * as wishlistService from '../services/wishlistService.js';

export async function getCart(req, res) {
  res.json({ success: true, data: await cartService.getCart(req.auth.id) });
}

export async function addCartItem(req, res) {
  res.status(200).json({ success: true, data: await cartService.addItem(req.auth.id, req.body), message: 'Added to your bag.' });
}

export async function updateCartItem(req, res) {
  res.json({ success: true, data: await cartService.updateItem(req.auth.id, req.params.sku, req.body.quantity) });
}

export async function removeCartItem(req, res) {
  res.json({ success: true, data: await cartService.removeItem(req.auth.id, req.params.sku) });
}

export async function mergeCart(req, res) {
  res.json({ success: true, data: await cartService.mergeItems(req.auth.id, req.body.items) });
}

export async function applyCoupon(req, res) {
  res.json({ success: true, data: await cartService.applyCoupon(req.auth.id, req.body.code), message: 'Coupon applied.' });
}

export async function removeCoupon(req, res) {
  res.json({ success: true, data: await cartService.removeCoupon(req.auth.id) });
}

export async function getWishlist(req, res) {
  res.json({ success: true, data: await wishlistService.getWishlist(req.auth.id) });
}

export async function addWishlistItem(req, res) {
  res.status(200).json({ success: true, data: await wishlistService.addProduct(req.auth.id, req.params.productId) });
}

export async function removeWishlistItem(req, res) {
  res.json({ success: true, data: await wishlistService.removeProduct(req.auth.id, req.params.productId) });
}

export async function getAddresses(req, res) {
  res.json({ success: true, data: await addressService.getAddresses(req.auth.id) });
}

export async function createAddress(req, res) {
  res.status(201).json({ success: true, data: await addressService.createAddress(req.auth.id, req.body), message: 'Address saved.' });
}

export async function updateAddress(req, res) {
  res.json({ success: true, data: await addressService.updateAddress(req.auth.id, req.params.addressId, req.body), message: 'Address updated.' });
}

export async function deleteAddress(req, res) {
  res.json({ success: true, data: await addressService.deleteAddress(req.auth.id, req.params.addressId) });
}

export async function lookupPincode(req, res) {
  res.json({ success: true, data: await addressService.lookupPincode(req.params.pincode) });
}
