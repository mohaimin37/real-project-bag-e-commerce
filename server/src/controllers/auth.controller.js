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
  if (!email || !email.includes('@')) {
    throw ApiError.badRequest('Please provide a valid email address');
  }

  let user = await User.findOne({ email });
  if (!user) {
    // If no existing user, auto-create a customer account so they can receive their code and sign in!
    const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    user = await User.create({
      email,
      name: formattedName || 'Valued Customer',
      password: randomToken(16),
      role: 'customer',
      isActive: true,
    });
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Please contact customer support.');
  }

  // Generate 6-digit numeric OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOtp = hashToken(otp);
  user.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

  // Also support legacy reset link
  const token = randomToken();
  user.passwordResetToken = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save({ validateBeforeSave: false });

  // Log prominently to console for instant developer feedback
  console.log(`\n=============================================================`);
  console.log(`[WILDTANE OTP] Fast Verification Code for: ${user.email}`);
  console.log(`OTP Code: ${otp}`);
  console.log(`Expires: ${user.passwordResetOtpExpires.toLocaleTimeString()} (Valid for 10 minutes)`);
  console.log(`=============================================================\n`);

  // Send high-priority email via SMTP
  sendEmail({
    to: user.email,
    subject: `Your WILDTANE verification code: ${otp}`,
    priority: 'high',
    text: `Hi ${user.name},\n\nYour 6-digit verification code to access your WILDTANE account is:\n\n${otp}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, you can safely ignore this email.\n\n— The WILDTANE Team`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: auto; padding: 28px; border: 1px solid #e5e5e5; border-radius: 16px; background: #fafafa;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #111; font-size: 24px; letter-spacing: 2px;">WILDTANE</h2>
          <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #666;">Security Verification</p>
        </div>
        <p style="font-size: 15px; color: #333; margin-bottom: 8px;">Hi <b>${user.name}</b>,</p>
        <p style="font-size: 14px; color: #555; line-height: 1.5;">Use the one-time verification code below to verify your identity and access your account:</p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; background: #111; color: #fff; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">${otp}</div>
        </div>
        <p style="font-size: 13px; color: #2e7d32; font-weight: 600; text-align: center; margin: 0 0 16px;">⏱️ Code is valid for 10 minutes. Delivered fast to your inbox.</p>
        <p style="font-size: 12px; color: #777; text-align: center;">Never share this code with anyone. WILDTANE staff will never ask for your code.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999; text-align: center; margin: 0;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  }).catch((err) => console.error(`[email] OTP send to ${user.email} failed: ${err.message}`));

  res.json({
    success: true,
    message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox or spam folder.`,
    devOtp: !env.isProd ? otp : undefined,
    expiresInSeconds: 600,
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
    throw ApiError.badRequest('Verification code has expired (valid for 10 minutes). Please request a new code.');
  }

  if (user.passwordResetOtp !== hashToken(otp)) {
    throw ApiError.badRequest('Invalid 6-digit verification code. Please check your code or request a new one.');
  }

  res.json({ success: true, message: 'Code verified successfully. You can now set your new password.' });
});

export const loginWithOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({
    email: (email || '').trim().toLowerCase(),
  }).select('+passwordResetOtp +passwordResetOtpExpires +tokenVersion');

  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpires) {
    throw ApiError.badRequest('No active verification code found. Please request a new code.');
  }

  if (new Date() > user.passwordResetOtpExpires) {
    throw ApiError.badRequest('Verification code has expired (valid for 10 minutes). Please request a new code.');
  }

  if (user.passwordResetOtp !== hashToken(otp)) {
    throw ApiError.badRequest('Invalid 6-digit verification code. Please check your code or request a new one.');
  }

  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpires = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  await user.save();

  await completeLogin(res, user);
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
    throw ApiError.badRequest('Verification code has expired (valid for 10 minutes). Please request a new code.');
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
