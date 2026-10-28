import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { sendPasswordResetEmail } from './emailService.js';
import { ApiError } from '../utils/ApiError.js';

const googleClient = new OAuth2Client(env.googleClientId || undefined);
const genericCredentialsMessage = 'Email or password is incorrect.';

export const AUTH_COOKIES = Object.freeze({ refresh: 'treadco_refresh', csrf: 'treadco_csrf' });

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/'
  };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

export function clearAuthCookies(res) {
  const refreshOptions = { ...refreshCookieOptions() };
  delete refreshOptions.maxAge;
  res.clearCookie(AUTH_COOKIES.refresh, refreshOptions);
  res.clearCookie(AUTH_COOKIES.csrf, csrfCookieOptions());
}

export function setCsrfCookie(res) {
  const csrfToken = randomBytes(32).toString('hex');
  res.cookie(AUTH_COOKIES.csrf, csrfToken, csrfCookieOptions());
  return csrfToken;
}

export function verifyCsrf(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIES.csrf] || '';
  const headerToken = req.get('x-csrf-token') || '';
  const cookieBytes = Buffer.from(cookieToken);
  const headerBytes = Buffer.from(headerToken);
  return cookieBytes.length > 0 && cookieBytes.length === headerBytes.length && timingSafeEqual(cookieBytes, headerBytes);
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createRefreshToken(userId) {
  return jwt.sign({ sub: String(userId), type: 'refresh', jti: randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTtl
  });
}

function createAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: env.accessTtl
  });
}

function safeUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, phone: user.phone || '', role: user.role, avatar: user.avatar || '' };
}

async function issueSession(user) {
  const refreshToken = createRefreshToken(user._id);
  await User.updateOne(
    { _id: user._id },
    { $push: { refreshTokenHashes: { $each: [hashToken(refreshToken)], $slice: -5 } } }
  );
  return { refreshToken, accessToken: createAccessToken(user), csrfToken: null };
}

async function authenticatedResult(user) {
  return { user: safeUser(user), ...(await issueSession(user)) };
}

export async function register({ name, email, password }) {
  const existing = await User.exists({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  let user;
  try {
    user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: ROLES.CUSTOMER
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'An account with this email already exists.');
    throw error;
  }
  return authenticatedResult(user);
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockedUntil');
  if (!user || !user.isActive || !user.passwordHash) throw new ApiError(401, genericCredentialsMessage);
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(401, genericCredentialsMessage);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash || '');
  if (!passwordMatches) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    await User.updateOne(
      { _id: user._id },
      {
        $inc: { failedLoginAttempts: 1 },
        ...(attempts >= 5 ? { $set: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } } : {})
      }
    );
    throw new ApiError(401, genericCredentialsMessage);
  }

  await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 } });
  return authenticatedResult(user);
}

export async function loginWithGoogle(idToken) {
  if (!env.googleClientId) throw new ApiError(503, 'Google sign-in is not configured.');
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Google sign-in could not be verified. Please try again.');
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new ApiError(401, 'Google sign-in could not be verified. Please try again.');
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ googleId: payload.sub }).select('+googleId');
  if (!user) {
    user = await User.findOne({ email }).select('+googleId');
    if (user && user.googleId && user.googleId !== payload.sub) {
      throw new ApiError(409, 'This email is linked to a different Google account.');
    }
    if (user) {
      user.googleId = payload.sub;
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      await user.save();
    } else {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        avatar: payload.picture || '',
        role: ROLES.CUSTOMER
      });
    }
  }
  if (!user.isActive) throw new ApiError(403, 'This account is unavailable.');
  return authenticatedResult(user);
}

export async function rotateRefreshToken(refreshToken) {
  if (!refreshToken) throw new ApiError(401, 'Your session has expired. Please sign in again.');
  let claims;
  try {
    claims = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }
  if (claims.type !== 'refresh' || !claims.sub) throw new ApiError(401, 'Your session has expired. Please sign in again.');

  const oldHash = hashToken(refreshToken);
  const newRefreshToken = createRefreshToken(claims.sub);
  const newHash = hashToken(newRefreshToken);
  const user = await User.findOneAndUpdate(
    { _id: claims.sub, refreshTokenHashes: oldHash, isActive: true },
    [{ $set: {
      refreshTokenHashes: {
        $concatArrays: [
          { $filter: { input: { $ifNull: ['$refreshTokenHashes', []] }, as: 'storedHash', cond: { $ne: ['$$storedHash', oldHash] } } },
          [newHash]
        ]
      }
    } }],
    { new: true }
  );
  if (!user) throw new ApiError(401, 'Your session has expired. Please sign in again.');
  return {
    user: safeUser(user),
    accessToken: createAccessToken(user),
    refreshToken: newRefreshToken
  };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const claims = jwt.verify(refreshToken, env.jwtRefreshSecret);
    if (claims.type === 'refresh' && claims.sub) {
      await User.updateOne({ _id: claims.sub }, { $pull: { refreshTokenHashes: hashToken(refreshToken) } });
    }
  } catch {
    // An expired or invalid cookie is already unusable; clear it at the controller.
  }
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new ApiError(401, 'Authentication required.');
  return safeUser(user);
}

export async function updateProfile(userId, { name, phone }) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new ApiError(404, 'Account not found.');
  user.name = name.trim();
  user.phone = phone.trim();
  await user.save();
  return safeUser(user);
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  const genericResponse = { message: 'If an account exists for that email, a reset link will be sent.' };
  if (!user) return genericResponse;

  const rawToken = randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await User.updateOne({ _id: user._id }, {
    $set: { passwordResetTokenHash: hashToken(rawToken), passwordResetExpiresAt: expiresAt }
  });
  const resetUrl = new URL('/reset-password', env.clientUrl);
  resetUrl.searchParams.set('email', user.email);
  resetUrl.searchParams.set('token', rawToken);

  try {
    await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl: resetUrl.toString() });
  } catch (error) {
    logger.error(`Password reset email could not be sent: ${error.message}`);
  }
  return genericResponse;
}

export async function resetPassword({ email, token, password }) {
  const user = await User.findOne({
    email,
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() }
  }).select('+passwordResetTokenHash +passwordResetExpiresAt +refreshTokenHashes');
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired. Request a new one.');

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHashes = [];
  await user.save();
  return { message: 'Password updated. Please sign in with your new password.' };
}
