import * as adminService from '../services/adminService.js';
import { refundOrder } from '../services/orderService.js';

export async function dashboard(_req, res) { res.json({ success: true, data: await adminService.dashboard() }); }
export async function listProducts(_req, res) { res.json({ success: true, data: await adminService.listProducts() }); }
export async function createProduct(req, res) { res.status(201).json({ success: true, data: await adminService.createProduct(req.body), message: 'Product created.' }); }
export async function updateProduct(req, res) { res.json({ success: true, data: await adminService.updateProduct(req.params.productId, req.body), message: 'Product updated.' }); }
export async function listOrders(_req, res) { res.json({ success: true, data: await adminService.listOrders() }); }
export async function updateOrder(req, res) { res.json({ success: true, data: await adminService.updateOrder(req.params.orderId, req.body), message: 'Order updated.' }); }
export async function refund(req, res) { res.json({ success: true, data: await refundOrder(req.params.orderId, req.body.reason), message: 'Refund request sent to Razorpay.' }); }
export async function listReviews(_req, res) { res.json({ success: true, data: await adminService.listReviews() }); }
export async function updateReview(req, res) { res.json({ success: true, data: await adminService.setReviewPublished(req.params.reviewId, req.body.isPublished), message: 'Review visibility updated.' }); }
