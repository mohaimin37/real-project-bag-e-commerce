import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { hashToken, randomToken } from '../utils/helpers.js';
import { issueAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { sendEmail } from '../services/email.service.js';

const RESET_TTL_MS = 30 * 60 * 1000;

async function signIn(res, user) {
  const withVersion = await User.findById(user._id).select('+tokenVersion');
  issueAuthCookie(res, user, withVersion.tokenVersion);
}

export const register = asyncHandler(async (req, res) => {
  const exists = await User.exists({ email: req.body.email });
  if (exists) throw ApiError.conflict('An account with this email already exists', [{ field: 'email', message: 'Already registered' }]);
  const user = await User.create({ ...req.body, role: 'customer' });
  await signIn(res, user);
  res.status(201).json({ success: true, user });
});

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

/** Checks email + password, locking the account for 15 minutes after 5 straight failures. */
async function verifyCredentials({ email, password }) {
  const user = await User.findOne({ email }).select('+password +failedLoginCount +lockUntil');
  if (user?.lockUntil && user.lockUntil > new Date()) {
    const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    throw new ApiError(429, `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }
  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      const failed = (user.failedLoginCount || 0) + 1;
      const locked = failed >= MAX_FAILED_LOGINS;
      await User.updateOne(
        { _id: user._id },
        locked ? { failedLoginCount: 0, lockUntil: new Date(Date.now() + LOCK_MS) } : { failedLoginCount: failed }
      );
    }
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated. Contact support.');
  return user;
}

async function completeLogin(res, user) {
  user.lastLoginAt = new Date();
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  await user.save();
  await signIn(res, user);
  res.json({ success: true, user });
}

export const login = asyncHandler(async (req, res) => {
  // One sign-in for everyone: admins land in the admin panel, customers in their account.
  // The admin area itself is still protected by role on every /api/admin route.
  const user = await verifyCredentials(req.body);
  await completeLogin(res, user);
});

export const adminLogin = asyncHandler(async (req, res) => {
  const user = await verifyCredentials(req.body);
  if (user.role !== 'admin') throw ApiError.forbidden('This sign-in is for store administrators only.');
  await completeLogin(res, user);
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearAuthCookie(res);
  res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user || null });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  // Same response whether or not the account exists, to avoid leaking registered emails.
  if (user && user.isActive) {
    const token = randomToken();
    user.passwordResetToken = hashToken(token);
    user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save({ validateBeforeSave: false });
    const link = `${env.siteUrl}/reset-password/${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your WILDTANE password',
      text: `Hi ${user.name},\n\nUse this link to set a new password. It expires in 30 minutes:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `<p>Hi ${user.name},</p><p>Use the button below to set a new password. It expires in 30 minutes.</p><p><a href="${link}" style="background:#000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px">Reset password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
    });
  }
  res.json({ success: true, message: 'If that email is registered, a reset link is on its way.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: hashToken(req.body.token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +tokenVersion');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion += 1;
  await user.save();
  issueAuthCookie(res, user, user.tokenVersion);
  res.json({ success: true, user });
});
