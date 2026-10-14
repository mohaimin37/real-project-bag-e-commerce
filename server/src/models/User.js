import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { forgetUser, forgetAllUsers } from '../utils/userCache.js';

const phoneSchema = new mongoose.Schema(
  {
    dialCode: { type: String, trim: true, default: '+91' },
    number: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

export const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: 'Home', maxlength: 40 },
    fullName: { type: String, trim: true, required: true, maxlength: 120 },
    phone: { type: phoneSchema, default: () => ({}) },
    addressLine1: { type: String, trim: true, required: true, maxlength: 200 },
    addressLine2: { type: String, trim: true, default: '', maxlength: 200 },
    landmark: { type: String, trim: true, default: '', maxlength: 120 },
    city: { type: String, trim: true, required: true, maxlength: 80 },
    state: { type: String, trim: true, required: true, maxlength: 80 },
    postalCode: { type: String, trim: true, required: true, maxlength: 20 },
    country: { type: String, trim: true, required: true, maxlength: 2, uppercase: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: phoneSchema, default: () => ({}) },
    country: { type: String, uppercase: true, trim: true, default: 'IN' },
    nationality: { type: String, uppercase: true, trim: true, default: 'IN' },
    avatar: { url: String, publicId: String },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    coins: { type: Number, default: 0, min: 0 }, // loyalty coin balance (history in CoinTransaction)
    wallet: { type: Number, default: 0, min: 0 }, // store wallet cash balance
    vipTier: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'silver', index: true },
    birthday: { type: Date, default: null },
    lastSpinAt: { type: Date, default: null },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
    },
    addresses: [addressSchema],
    recentlyViewed: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    // Bumped on logout-everywhere / password change to invalidate existing JWTs.
    tokenVersion: { type: Number, default: 0, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetOtp: { type: String, select: false },
    passwordResetOtpExpires: { type: Date, select: false },
    passwordResetOtpAttempts: { type: Number, default: 0, select: false },
    passwordResetOtpSentAt: { type: Date, select: false },
    // Brute-force protection: consecutive failed sign-ins and the lock they trigger.
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  delete obj.password;
  delete obj.tokenVersion;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.passwordResetOtp;
  delete obj.passwordResetOtpExpires;
  delete obj.passwordResetOtpAttempts;
  delete obj.passwordResetOtpSentAt;
  delete obj.failedLoginCount;
  delete obj.lockUntil;
  return obj;
};

// A changed user must not be served from the sign-in cache.
userSchema.post('save', (doc) => forgetUser(doc._id));
userSchema.post(['findOneAndUpdate', 'updateOne', 'findOneAndDelete', 'deleteOne'], { document: false, query: true }, function forget() {
  const id = this.getQuery()?._id;
  if (mongoose.isValidObjectId(id)) forgetUser(id);
  else forgetAllUsers();
});
userSchema.post(['updateMany', 'deleteMany', 'bulkWrite'], () => forgetAllUsers());

export default mongoose.model('User', userSchema);
