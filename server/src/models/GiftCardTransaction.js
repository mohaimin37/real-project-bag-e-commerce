import mongoose from 'mongoose';

/** Ledger of gift card balance movements (issue, redeem, restore after a cancelled order, admin changes). */
const giftCardTransactionSchema = new mongoose.Schema(
  {
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftCard', required: true },
    code: { type: String, required: true },
    type: { type: String, enum: ['issue', 'redeem', 'restore', 'adjust', 'deactivate'], required: true },
    amount: { type: Number, required: true }, // + added to the card, − spent
    balanceAfter: { type: Number, required: true, min: 0 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    orderId: { type: String, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '', maxlength: 200 },
    key: { type: String, required: true }, // idempotency key
  },
  { timestamps: true }
);

giftCardTransactionSchema.index({ card: 1, createdAt: -1 });
giftCardTransactionSchema.index({ key: 1 }, { unique: true });

export default mongoose.model('GiftCardTransaction', giftCardTransactionSchema);
