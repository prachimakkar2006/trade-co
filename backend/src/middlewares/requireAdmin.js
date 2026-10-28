import { ApiError } from '../utils/ApiError.js';

export function requireAdmin(req, _res, next) {
  if (req.auth?.role !== 'admin') return next(new ApiError(403, 'Administrator access required.'));
  return next();
}
