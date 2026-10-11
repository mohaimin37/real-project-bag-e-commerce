import mongoose from 'mongoose';

const giftCardSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    pin: {
      type: String,
      trim: true,
      default: '',
    },
    initialBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    redeemedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        amount: { type: Number, required: true },
        redeemedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

giftCardSchema.index({ code: 1, isActive: 1 });

export default mongoose.model('GiftCard', giftCardSchema);
