import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import ApiError from '../utils/ApiError.js';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Store wallet rules with safe defaults (older settings documents have no wallet block). */
export function walletRules(settings) {
  const w = settings?.wallet || {};
  return { enabled: w.enabled !== false, maxRedeemPercent: w.maxRedeemPercent ?? 100 };
}

/**
 * Moves money in or out of a customer's wallet and writes the ledger row.
 * - Debits only succeed if the balance covers them (conditional update), so two checkouts can't
 *   spend the same rupee.
 * - `key` is unique in the ledger: replaying the same movement (a retried refund, a webhook sent
 *   twice) is a no-op that returns the existing row.
 * Pass `session` to run inside a MongoDB transaction.
 */
export async function moveWallet(userId, amount, { type, key, description = '', order = null, by = null, expiresAt = null, session }) {
  const delta = round2(amount);
  if (!delta) return null;
  if (!key) throw new Error('moveWallet needs an idempotency key');

  const existing = await WalletTransaction.findOne({ key }).session(session || null);
  if (existing) return existing;

  const filter = delta < 0 ? { _id: userId, wallet: { $gte: -delta } } : { _id: userId };
  const user = await User.findOneAndUpdate(filter, { $inc: { wallet: delta } }, { returnDocument: 'after', session });
  if (!user) {
    if (delta < 0) throw ApiError.conflict('Your wallet balance changed. Please review your order and try again.');
    throw ApiError.notFound('Customer not found');
  }
  try {
    const [tx] = await WalletTransaction.create(
      [
        {
          user: userId,
          type,
          amount: delta,
          balanceAfter: round2(user.wallet),
          description,
          order: order?._id || null,
          orderId: order?.orderId || '',
          key,
          expiresAt,
          by,
        },
      ],
      { session }
    );
    return tx;
  } catch (err) {
    // A concurrent call with the same key won the race. Inside a transaction the abort undoes our
    // $inc; outside one, undo it here so the balance always matches the ledger.
    if (err?.code === 11000 && !session) {
      await User.updateOne({ _id: userId }, { $inc: { wallet: -delta } });
      return WalletTransaction.findOne({ key });
    }
    throw err;
  }
}

/** How much of `payable` the wallet may cover under the store rules. */
export function walletApplicable(balance, payable, settings) {
  const rules = walletRules(settings);
  if (!rules.enabled || balance <= 0 || payable <= 0) return 0;
  const cap = round2((payable * rules.maxRedeemPercent) / 100);
  return round2(Math.min(balance, cap, payable));
}
