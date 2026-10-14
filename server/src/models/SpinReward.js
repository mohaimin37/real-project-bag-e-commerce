import mongoose from 'mongoose';

const spinRewardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ip: { type: String, default: '' },
    // IST calendar day of the spin ("2026-10-13"): one spin per customer per day.
    day: { type: String },
    rewardType: {
      type: String,
      enum: ['coins', 'coupon', 'free_shipping', 'better_luck'],
      required: true,
    },
    rewardValue: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    label: { type: String, required: true },
    expiresAt: { type: Date, default: null }, // the prize code's expiry (midnight IST)
    claimed: { type: Boolean, default: true },
  },
  { timestamps: true }
);

spinRewardSchema.index({ user: 1, createdAt: -1 });
spinRewardSchema.index({ ip: 1, createdAt: -1 });
// Backs the "one spin a day" rule even if two requests race (older rows without `day` are ignored).
spinRewardSchema.index({ user: 1, day: 1 }, { unique: true, partialFilterExpression: { day: { $type: 'string' } } });

export default mongoose.model('SpinReward', spinRewardSchema);
