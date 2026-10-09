import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { hashToken, randomToken } from '../utils/helpers.js';
import { issueAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { sendEmail } from '../services/email.service.js';

const RESET_TTL_MS = 30 * 60 * 1000;

// Local development without email: hand the reset link to the page so it can be tested.
// Never in production, and never once SMTP is set up (then it only goes by email).
const DEV_PREVIEW = () => !env.isProd && !env.smtp.enabled;

async function signIn(res, user) {
  const withVersion = await User.findById(user._id).select('+tokenVersion');
  return issueAuthCookie(res, user, withVersion.tokenVersion);
}

export const register = asyncHandler(async (req, res) => {
  const exists = await User.exists({ email: req.body.email });
  if (exists) throw ApiError.conflict('An account with this email already exists', [{ field: 'email', message: 'Already registered' }]);
  const user = await User.create({ ...req.body, role: 'customer' });
  const token = await signIn(res, user);
  res.status(201).json({ success: true, user, token });
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
  const token = await signIn(res, user);
  res.json({ success: true, user, token });
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
  const email = (req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    throw ApiError.badRequest('This email is not real and OTP cannot be sent. No account was found with this email address.');
  }

  // Generate 6-digit numeric OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOtp = hashToken(otp);
  user.passwordResetOtpExpires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiration

  // Also support legacy reset link
  const token = randomToken();
  user.passwordResetToken = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save({ validateBeforeSave: false });

  const link = `${env.siteUrl}/reset-password/${token}`;

  sendEmail({
    to: user.email,
    subject: `Your WILDTANE verification code: ${otp}`,
    text: `Hi ${user.name},\n\nYour 6-digit verification code to reset your WILDTANE password is:\n\n${otp}\n\nThis code expires in 2 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.\n\n— The WILDTANE Team`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fafafa;">
        <h2 style="margin-top: 0; color: #111;">WILDTANE</h2>
        <p style="font-size: 15px; color: #333;">Hi ${user.name},</p>
        <p style="font-size: 15px; color: #333;">Use the verification code below to verify your identity and reset your password:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 12px 24px; background: #111; color: #fff; border-radius: 8px; display: inline-block;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #d32f2f; font-weight: 600;">⏱️ This code expires in 2 minutes. Enter it before time runs out.</p>
        <p style="font-size: 12px; color: #666;">Never share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888;">If you did not ask to reset your password, please ignore this email.</p>
      </div>
    `,
  }).catch((err) => console.error(`[email] password reset OTP to ${user.email} failed: ${err.message}`));

  res.json({
    success: true,
    message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox or spam folder.`,
  });
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({
    email: (email || '').trim().toLowerCase(),
  }).select('+passwordResetOtp +passwordResetOtpExpires');

  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpires) {
    throw ApiError.badRequest('No active verification code found. Please request a new code.');
  }

  if (new Date() > user.passwordResetOtpExpires) {
    throw ApiError.badRequest('Verification code has expired (valid for 2 minutes). Please request a new code.');
  }

  if (user.passwordResetOtp !== hashToken(otp)) {
    throw ApiError.badRequest('Invalid 6-digit verification code. Please check your code or request a new one.');
  }

  res.json({ success: true, message: 'Code verified successfully. You can now set your new password.' });
});

export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  const user = await User.findOne({
    email: (email || '').trim().toLowerCase(),
  }).select('+passwordResetOtp +passwordResetOtpExpires +tokenVersion');

  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpires) {
    throw ApiError.badRequest('No active verification request found. Please request a code first.');
  }

  if (new Date() > user.passwordResetOtpExpires) {
    throw ApiError.badRequest('Verification code has expired (valid for 2 minutes). Please request a new code.');
  }

  if (user.passwordResetOtp !== hashToken(otp)) {
    throw ApiError.badRequest('Invalid verification code.');
  }

  user.password = req.body.password;
  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpires = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.tokenVersion += 1;
  await user.save();

  const token = await signIn(res, user);
  res.json({ success: true, message: 'Password reset successfully. You are now signed in.', user, token });
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
  const token = await signIn(res, user);
  res.json({ success: true, user, token });
});
