import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  path: '/',
});

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function issueAuthCookie(res, user, tokenVersion) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role, v: tokenVersion }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
  res.cookie(env.jwt.cookieName, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
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
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || !user.isActive || user.tokenVersion !== payload.v) return null;
  return user;
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
