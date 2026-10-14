import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 30 },
    description: { type: String, trim: true, default: '', maxlength: 200 },
    type: { type: String, enum: ['percentage', 'fixed', 'free_shipping'], required: true },
    // Personal codes (spin-wheel prizes) work only for this customer and stay out of public/admin lists.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, default: '' },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 }, // cap for percentage coupons
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null, min: 0 }, // total redemptions, null = unlimited
    perUserLimit: { type: Number, default: 1, min: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    usages: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Coupon', couponSchema);
