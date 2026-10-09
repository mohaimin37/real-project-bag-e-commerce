import User from '../models/User.js';
import CoinTransaction from '../models/CoinTransaction.js';
import ApiError from '../utils/ApiError.js';

/** Store loyalty rules with safe defaults (older settings documents have no loyalty block). */
export function loyaltyRules(settings) {
  const l = settings?.loyalty || {};
  return {
    enabled: l.enabled !== false,
    coinsPer100: l.coinsPer100 ?? 5,
    rupeesPerCoin: l.rupeesPerCoin ?? 1,
    maxRedeemPercent: l.maxRedeemPercent ?? 50,
  };
}

/** Coins earned for paying `amount` (₹) for items: N coins per full ₹100. */
export const coinsFor = (amount, rules) => (rules.enabled ? Math.floor(Math.max(0, amount) / 100) * rules.coinsPer100 : 0);

/**
 * Changes a balance and writes the ledger entry. Spending (delta < 0) only succeeds if the
 * balance covers it, so two checkouts can never spend the same coins. Pass `clamp` to take
 * back "up to" delta coins (used when reversing coins the shopper may already have spent).
 */
export async function moveCoins(userId, delta, { type, order, note = '', by = null, session, clamp = false }) {
  if (!delta) return null;
  let user;
  if (delta < 0 && clamp) {
    user = await User.findOneAndUpdate({ _id: userId }, [{ $set: { coins: { $max: [0, { $add: [{ $ifNull: ['$coins', 0] }, delta] }] } } }], { returnDocument: 'after', session, updatePipeline: true });
  } else {
    const filter = delta < 0 ? { _id: userId, coins: { $gte: -delta } } : { _id: userId };
    user = await User.findOneAndUpdate(filter, { $inc: { coins: delta } }, { returnDocument: 'after', session });
    if (!user && delta < 0) throw ApiError.conflict('Your coin balance changed. Please review your order and try again.');
  }
  if (!user) return null;
  const [tx] = await CoinTransaction.create(
    [{ user: userId, type, coins: delta, balanceAfter: user.coins, order: order?._id || null, orderId: order?.orderId || '', note, by }],
    { session }
  );
  return tx;
}

/** Cancelled/returned orders: give back coins spent on them and take back coins they earned. Runs once. */
export async function reverseOrderCoins(order) {
  if (order.coinsReversed) return;
  if (order.coinsRedeemed > 0) {
    await moveCoins(order.user, order.coinsRedeemed, { type: 'refunded', order, note: `Order ${order.orderId} ${order.orderStatus.toLowerCase()} — coins returned` });
  }
  if (order.coinsEarned > 0) {
    await moveCoins(order.user, -order.coinsEarned, { type: 'reversed', order, clamp: true, note: `Order ${order.orderId} ${order.orderStatus.toLowerCase()} — earned coins removed` });
  }
  order.coinsReversed = true;
}
