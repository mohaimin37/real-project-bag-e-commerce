import crypto from 'crypto';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { hashToken } from '../utils/helpers.js';
import { issueAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { sendEmail, emailServiceReady } from '../services/email.service.js';
import { moveCoins, bonusRules } from '../services/coin.service.js';
import { uniqueReferralCode, recordReferral } from '../services/referral.service.js';

async function signIn(res, user) {
  const withVersion = await User.findById(user._id).select('+tokenVersion');
  return issueAuthCookie(res, user, withVersion.tokenVersion);
}

export const register = asyncHandler(async (req, res) => {
  const exists = await User.exists({ email: req.body.email });
  if (exists) throw ApiError.conflict('An account with this email already exists', [{ field: 'email', message: 'Already registered' }]);

  const { referralCode: usedCode, ...profile } = req.body;
  const user = await User.create({
    ...profile,
    referralCode: await uniqueReferralCode(),
    referredBy: null,
    role: 'customer',
  });

  // Signup bonus: paid once per account (the ledger key blocks a second payment), amount from Settings.
  let signupBonus = 0;
  try {
    const { signupBonus: amount } = bonusRules(await Setting.get());
    const tx = amount > 0 ? await moveCoins(user._id, amount, { type: 'bonus', key: `signup:${user._id}`, note: 'Welcome bonus for creating your account' }) : null;
    if (tx) {
      signupBonus = amount;
      user.coins = tx.balanceAfter;
    }
  } catch (err) {
    console.error('[coins] Failed to credit signup bonus:', err.message);
  }

  // Referral: recorded now; the referrer is paid when it qualifies (see referral.service.js).
  const referral = await recordReferral(user, usedCode);

  const token = await signIn(res, user);
  res.status(201).json({
    success: true,
    user,
    token,
    rewards: { signupBonus, referral: referral ? referral.status : usedCode ? 'invalid' : null },
  });
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

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

// The same answer whether or not the email has an account, so the form can't be used to find accounts.
const OTP_REQUESTED = {
  success: true,
  message: 'If an account exists for this email, a 6-digit verification code is on its way. Check your inbox and spam folder.',
  expiresInSeconds: OTP_TTL_MS / 1000,
  resendAfterSeconds: OTP_RESEND_MS / 1000,
};

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  // Checked before looking the account up, so an outage is reported the same way for every email.
  if (!(await emailServiceReady())) {
    throw new ApiError(503, 'We can’t send verification emails right now. Please try again in a few minutes or contact support.');
  }

  const user = await User.findOne({ email }).select('+passwordResetOtpSentAt');
  if (!user || !user.isActive) return res.json(OTP_REQUESTED);

  // Server-side resend cooldown (the page shows the same timer).
  if (user.passwordResetOtpSentAt && Date.now() - user.passwordResetOtpSentAt.getTime() < OTP_RESEND_MS) {
    return res.json(OTP_REQUESTED);
  }

  // Cryptographically random 6-digit code; only its hash is stored, and a new code replaces the old one.
  const otp = String(crypto.randomInt(100000, 1000000));
  user.passwordResetOtp = hashToken(otp);
  user.passwordResetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.passwordResetOtpAttempts = 0;
  user.passwordResetOtpSentAt = new Date();
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
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
          <p style="font-size: 13px; color: #2e7d32; font-weight: 600; text-align: center; margin: 0 0 16px;">This code is valid for 10 minutes and works once.</p>
          <p style="font-size: 12px; color: #777; text-align: center;">Never share this code with anyone. WILDTANE staff will never ask for your code.</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="font-size: 11px; color: #999; text-align: center; margin: 0;">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    // Don't pretend it was sent: clear the code so the customer can try again straight away.
    console.error(`[email] Verification code email failed (user ${user._id}): ${err.code || ''} ${err.message}`);
    await User.updateOne({ _id: user._id }, { $unset: { passwordResetOtp: 1, passwordResetOtpExpires: 1, passwordResetOtpSentAt: 1 } });
    throw new ApiError(503, 'We couldn’t send the verification email just now. Please try again in a few minutes.');
  }

  res.json(OTP_REQUESTED);
});

const OTP_FIELDS = '+passwordResetOtp +passwordResetOtpExpires +passwordResetOtpAttempts +tokenVersion';
const NO_CODE = 'This code is invalid or has expired. Please request a new code.';

/**
 * Checks a verification code. Wrong guesses are counted atomically; after 5 the code is destroyed.
 * With `consume`, the code is cleared in the same atomic update, so it can never be used twice.
 */
async function checkOtp(email, otp, { consume = false } = {}) {
  const user = await User.findOne({ email: (email || '').trim().toLowerCase() }).select(OTP_FIELDS);
  if (!user?.passwordResetOtp || !user.passwordResetOtpExpires || user.passwordResetOtpExpires < new Date()) {
    throw ApiError.badRequest(NO_CODE);
  }
  if ((user.passwordResetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) throw ApiError.badRequest(NO_CODE);

  const hash = hashToken(String(otp));
  if (user.passwordResetOtp !== hash) {
    const after = await User.findOneAndUpdate(
      { _id: user._id, passwordResetOtp: user.passwordResetOtp },
      { $inc: { passwordResetOtpAttempts: 1 } },
      { returnDocument: 'after' }
    ).select('+passwordResetOtpAttempts');
    const left = OTP_MAX_ATTEMPTS - (after?.passwordResetOtpAttempts || OTP_MAX_ATTEMPTS);
    if (left <= 0) {
      await User.updateOne({ _id: user._id }, { $unset: { passwordResetOtp: 1, passwordResetOtpExpires: 1 } });
      throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.');
    }
    throw ApiError.badRequest(`Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`);
  }

  if (consume) {
    // Only one request can win this update; a replay of the same code finds nothing to clear.
    const won = await User.updateOne(
      { _id: user._id, passwordResetOtp: hash },
      { $unset: { passwordResetOtp: 1, passwordResetOtpExpires: 1, passwordResetOtpAttempts: 1, passwordResetToken: 1, passwordResetExpires: 1 } }
    );
    if (!won.modifiedCount) throw ApiError.badRequest(NO_CODE);
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated. Contact support.');
  return user;
}

export const verifyResetOtp = asyncHandler(async (req, res) => {
  await checkOtp(req.body.email, req.body.otp);
  res.json({ success: true, message: 'Code verified. You can now set your new password.' });
});

export const loginWithOtp = asyncHandler(async (req, res) => {
  const user = await checkOtp(req.body.email, req.body.otp, { consume: true });
  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpires = undefined;
  await completeLogin(res, user);
});

export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const user = await checkOtp(req.body.email, req.body.otp, { consume: true });
  user.password = req.body.password;
  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpires = undefined;
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.tokenVersion += 1; // signs out every other device
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
