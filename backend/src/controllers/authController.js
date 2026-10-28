import * as authService from '../services/authService.js';
import { ApiResponse } from '../utils/ApiResponse.js';

function setSessionCookies(res, result) {
  res.cookie(authService.AUTH_COOKIES.refresh, result.refreshToken, authService.refreshCookieOptions());
  result.csrfToken = authService.setCsrfCookie(res);
  delete result.refreshToken;
}

export async function getCsrf(_req, res) {
  const csrfToken = authService.setCsrfCookie(res);
  res.json(new ApiResponse(200, { csrfToken }, 'CSRF token issued'));
}

export async function register(req, res) {
  const result = await authService.register(req.body);
  setSessionCookies(res, result);
  res.status(201).json(new ApiResponse(201, result, 'Account created'));
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  setSessionCookies(res, result);
  res.json(new ApiResponse(200, result, 'Signed in'));
}

export async function loginWithGoogle(req, res) {
  const result = await authService.loginWithGoogle(req.body.idToken);
  setSessionCookies(res, result);
  res.json(new ApiResponse(200, result, 'Signed in with Google'));
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.rotateRefreshToken(req.cookies[authService.AUTH_COOKIES.refresh]);
    setSessionCookies(res, result);
    res.json(new ApiResponse(200, result, 'Session refreshed'));
  } catch (error) {
    if (error.statusCode === 401) authService.clearAuthCookies(res);
    next(error);
  }
}

export async function logout(req, res) {
  await authService.logout(req.cookies[authService.AUTH_COOKIES.refresh]);
  authService.clearAuthCookies(res);
  res.json(new ApiResponse(200, null, 'Signed out'));
}

export async function me(req, res) {
  const user = await authService.getCurrentUser(req.auth.id);
  res.json(new ApiResponse(200, { user }));
}

export async function updateProfile(req, res) {
  const user = await authService.updateProfile(req.auth.id, req.body);
  res.json(new ApiResponse(200, { user }, 'Profile updated'));
}

export async function forgotPassword(req, res) {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(new ApiResponse(200, result, result.message));
}

export async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  authService.clearAuthCookies(res);
  res.json(new ApiResponse(200, result, result.message));
}
