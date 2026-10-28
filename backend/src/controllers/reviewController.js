import * as reviewService from '../services/reviewService.js';

export async function list(req, res) {
  res.json({ success: true, data: await reviewService.listProductReviews(req.params.slug) });
}

export async function create(req, res) {
  res.status(201).json({ success: true, data: await reviewService.createProductReview(req.auth.id, req.params.productId, req.body), message: 'Review submitted for moderation.' });
}
