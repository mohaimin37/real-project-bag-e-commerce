import mongoose from 'mongoose';

/**
 * One row per referred customer. The referrer's coins are paid once, when the referral
 * qualifies under the store rule (Settings → loyalty.referralQualifyOn).
 */
const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    status: { type: String, enum: ['pending', 'rewarded', 'rejected'], default: 'pending', index: true },
    rejectReason: { type: String, default: '' },
    qualifyingOrder: { type: String, default: '' }, // orderId that qualified the referral
    coins: { type: Number, default: 0 },
    rewardedAt: Date,
  },
  { timestamps: true }
);

// A customer can only ever be referred once.
referralSchema.index({ referee: 1 }, { unique: true });

export default mongoose.model('Referral', referralSchema);
