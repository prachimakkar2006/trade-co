import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required.');

  try {
    const claims = jwt.verify(token, env.jwtAccessSecret);
    if (claims.type !== 'access' || !claims.sub) throw new Error('Invalid token type');
    req.auth = { id: claims.sub, role: claims.role };
    return next();
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }
});
