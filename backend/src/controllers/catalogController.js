import * as catalogService from '../services/catalogService.js';

export async function products(req, res) {
  const result = await catalogService.listProducts(req.query);
  res.json({ success: true, data: result.products, meta: result.pagination });
}

export async function exclusive(req, res) {
  const result = await catalogService.listProducts({ ...req.query, exclusive: 'true' });
  res.json({ success: true, data: result.products, meta: result.pagination });
}

export async function product(req, res) {
  const result = await catalogService.getProduct(req.params.slug);
  res.json({ success: true, data: result });
}

export async function categories(_req, res) {
  res.json({ success: true, data: await catalogService.listCategories() });
}

export async function heroSlides(_req, res) {
  res.json({ success: true, data: await catalogService.listHeroSlides() });
}
