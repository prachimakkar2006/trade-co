import crypto from 'node:crypto';
import * as orderService from '../services/orderService.js';

export async function createCheckout(req, res) {
  const data = await orderService.createCheckout(req.auth.id, {
    addressId: req.body.addressId,
    idempotencyKey: req.idempotencyKey
  });
  res.status(201).json({ success: true, data, message: 'Razorpay checkout is ready.' });
}

export async function verifyPayment(req, res) {
  const order = await orderService.verifyCheckoutPayment(req.auth.id, req.body);
  res.json({ success: true, data: order, message: 'Payment verified and order confirmed.' });
}

export async function listOrders(req, res) {
  res.json({ success: true, data: await orderService.listOrders(req.auth.id) });
}

export async function getOrder(req, res) {
  res.json({ success: true, data: await orderService.getOrder(req.auth.id, req.params.orderId) });
}

export async function requestCancellation(req, res) {
  res.json({ success: true, data: await orderService.requestCancellation(req.auth.id, req.params.orderId, req.body.reason), message: 'Cancellation request submitted.' });
}

export async function requestReturn(req, res) {
  res.json({ success: true, data: await orderService.requestReturn(req.auth.id, req.params.orderId, req.body.reason), message: 'Return request submitted.' });
}

export async function receiveRazorpayWebhook(req, res) {
  const rawBody = req.body;
  const signature = req.get('X-Razorpay-Signature');
  if (!Buffer.isBuffer(rawBody) || !orderService.verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
  }
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid webhook payload.' });
  }
  const eventId = req.get('x-razorpay-event-id') || `sha256:${crypto.createHash('sha256').update(rawBody).digest('hex')}`;
  await orderService.processWebhook(eventId, payload.event, payload);
  return res.json({ success: true, message: 'Webhook received.' });
}
