import mongoose from 'mongoose';

/**
 * Ledger of loyalty coin movements. User.coins is the running balance;
 * this keeps the "why" for the customer's history and for admins.
 */
export const COIN_TYPES = ['earned', 'redeemed', 'refunded', 'reversed', 'adjusted', 'bonus'];

const coinTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: COIN_TYPES, required: true },
    coins: { type: Number, required: true }, // + added, − removed
    balanceAfter: { type: Number, required: true, min: 0 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    orderId: { type: String, default: '' },
    note: { type: String, default: '', maxlength: 200 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // admin, for manual adjustments
    // One-time rewards carry a key (e.g. "signup:<userId>", "referral:<refereeId>") so they can never be paid twice.
    key: { type: String, default: undefined },
  },
  { timestamps: true }
);

coinTransactionSchema.index({ user: 1, createdAt: -1 });
coinTransactionSchema.index({ key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } });

export default mongoose.model('CoinTransaction', coinTransactionSchema);
