import mongoose from 'mongoose';

/**
 * Ledger of WILDTANE Wallet money (₹). User.wallet is the running balance; every change to it
 * writes one row here. `key` makes a movement idempotent: the same refund or order debit can
 * never be applied twice, because a second insert with that key fails the unique index.
 */
export const WALLET_TYPES = ['refund', 'promo', 'referral', 'order_debit', 'order_restore', 'admin_credit', 'admin_debit'];

const walletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: WALLET_TYPES, required: true },
    amount: { type: Number, required: true }, // + credit, − debit (₹)
    balanceAfter: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['completed'], default: 'completed' },
    description: { type: String, default: '', maxlength: 200 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    orderId: { type: String, default: '' },
    key: { type: String, required: true }, // idempotency key, e.g. "order_debit:WT26-000123"
    expiresAt: { type: Date, default: null }, // promotional credits may expire
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // admin, for manual adjustments
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ key: 1 }, { unique: true });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
