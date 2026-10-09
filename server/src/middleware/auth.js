import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { cachedUser, cacheUser } from '../utils/userCache.js';

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days persistent login

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  path: '/',
  maxAge: MAX_AGE_MS,
});

export function issueAuthCookie(res, user, tokenVersion) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role, v: tokenVersion }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn || '30d',
  });
  res.cookie(env.jwt.cookieName, token, {
    ...cookieOptions(),
    maxAge: MAX_AGE_MS,
    expires: new Date(Date.now() + MAX_AGE_MS),
  });
  return token;
}

export function clearAuthCookie(res) {
  res.clearCookie(env.jwt.cookieName, cookieOptions());
}

async function resolveUser(req) {
  const header = req.headers.authorization;
  const token = req.cookies?.[env.jwt.cookieName] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    return null;
  }
  const user = await loadUser(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.v) return null;
  return user;
}

async function loadUser(id) {
  let raw = cachedUser(id);
  if (!raw) {
    raw = await User.findById(id).select('+tokenVersion').lean();
    if (!raw) return null;
    cacheUser(id, raw);
  }
  return User.hydrate(raw);
}

export async function protect(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) throw ApiError.unauthorized();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Attaches req.user when a valid session exists, but never rejects.
export async function optionalAuth(req, res, next) {
  try {
    req.user = await resolveUser(req);
  } catch {
    req.user = null;
  }
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

export const adminOnly = [protect, requireRole('admin')];
