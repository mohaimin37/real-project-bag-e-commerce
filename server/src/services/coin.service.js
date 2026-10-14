import User from '../models/User.js';
import Order from '../models/Order.js';
import CoinTransaction from '../models/CoinTransaction.js';
import ApiError from '../utils/ApiError.js';

export const RETURN_WINDOW_DAYS = 7;
export const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Store loyalty rules with safe defaults (older settings documents have no loyalty block). */
export function loyaltyRules(settings) {
  const l = settings?.loyalty || {};
  return {
    enabled: l.enabled !== false,
    coinsPer100: l.coinsPer100 ?? 5,
    rupeesPerCoin: l.rupeesPerCoin ?? 1,
    maxRedeemPercent: l.maxRedeemPercent ?? 50,
    signupBonus: l.signupBonus ?? 50,
    referralBonus: l.referralBonus ?? 100,
    referralQualifyOn: l.referralQualifyOn || 'first_delivery',
  };
}

/** Coins earned for paying `amount` (₹) for items: N coins per full ₹100. */
export const coinsFor = (amount, rules) => (rules.enabled ? Math.floor(Math.max(0, amount) / 100) * rules.coinsPer100 : 0);

/**
 * Changes a balance and writes the ledger entry. Spending (delta < 0) only succeeds if the
 * balance covers it, so two checkouts can never spend the same coins. Pass `clamp` to take
 * back "up to" delta coins (used when reversing coins the shopper may already have spent).
 */
export async function moveCoins(userId, delta, { type, order, note = '', by = null, session, clamp = false, key }) {
  if (!delta) return null;
  // One-time rewards pass a key; a second attempt with the same key changes nothing.
  if (key) {
    const done = await CoinTransaction.findOne({ key }).session(session || null);
    if (done) return null;
  }
  let user;
  if (delta < 0 && clamp) {
    user = await User.findOneAndUpdate(
      { _id: userId },
      [{ $set: { coins: { $max: [0, { $add: [{ $ifNull: ['$coins', 0] }, delta] }] } } }],
      { returnDocument: 'after', session, updatePipeline: true }
    );
  } else {
    const filter = delta < 0 ? { _id: userId, coins: { $gte: -delta } } : { _id: userId };
    user = await User.findOneAndUpdate(filter, { $inc: { coins: delta } }, { returnDocument: 'after', session });
    if (!user && delta < 0) throw ApiError.conflict('Your coin balance changed. Please review your order and try again.');
  }
  if (!user) return null;
  try {
    const [tx] = await CoinTransaction.create(
      [{ user: userId, type, coins: delta, balanceAfter: user.coins, order: order?._id || null, orderId: order?.orderId || '', note, by, key }],
      { session }
    );
    return tx;
  } catch (err) {
    // Lost a race on the same one-time key: undo our change (a transaction abort does it for us).
    if (err?.code === 11000 && key && !session) {
      await User.updateOne({ _id: userId }, { $inc: { coins: -delta } });
      return null;
    }
    throw err;
  }
}

/** Store loyalty bonus amounts (configurable in Admin → Settings → Loyalty). */
export function bonusRules(settings) {
  const l = settings?.loyalty || {};
  return {
    signupBonus: l.signupBonus ?? 50,
    referralBonus: l.referralBonus ?? 100,
    referralQualifyOn: l.referralQualifyOn || 'first_delivery',
    maxReferralsPerUser: l.maxReferralsPerUser ?? 50,
  };
}

/**
 * Resolves the delivery timestamp for an order.
 */
export function getOrderDeliveryTime(order) {
  if (order.deliveredAt) return new Date(order.deliveredAt).getTime();
  const histDelivered = order.statusHistory?.find((s) => s.status === 'Delivered');
  if (histDelivered?.at) return new Date(histDelivered.at).getTime();
  if (order.orderStatus === 'Delivered') return new Date(order.updatedAt || order.createdAt).getTime();
  return null;
}

/**
 * Cancelled/returned orders: give back coins spent on them and ensure coins will NOT come (zero out coinsEarned). Runs once.
 */
export async function reverseOrderCoins(order) {
  if (order.coinsReversed) return;
  if (order.coinsRedeemed > 0) {
    await moveCoins(order.user, order.coinsRedeemed, {
      type: 'refunded',
      order,
      note: `Order ${order.orderId} ${order.orderStatus.toLowerCase()} — coins returned to balance`,
    });
  }
  // If coins were already disbursed to wallet, take them back
  if (order.coinsDisbursed && order.coinsEarned > 0) {
    await moveCoins(order.user, -order.coinsEarned, {
      type: 'reversed',
      order,
      clamp: true,
      note: `Order ${order.orderId} ${order.orderStatus.toLowerCase()} — earned coins revoked`,
    });
  }
  // If order gets cancelled or returned, coins will not come
  order.coinsEarned = 0;
  order.coinsDisbursed = false;
  order.coinsReversed = true;
}

/**
 * Automatically disburses coins into the user's wallet after the 7-day return policy has expired.
 * Coins will come into the user's wallet 1 week after product delivery.
 * Cancelled or returned orders are strictly ineligible.
 */
export async function disburseEligibleOrderCoins(userId = null) {
  const now = Date.now();
  const filter = {
    orderStatus: 'Delivered',
    coinsEarned: { $gt: 0 },
    coinsDisbursed: { $ne: true },
    coinsReversed: { $ne: true },
    'returnExchange.status': { $nin: ['Approved', 'Completed'] },
  };
  if (userId) filter.user = userId;

  const orders = await Order.find(filter);
  const disbursed = [];

  for (const order of orders) {
    // If order was cancelled or returned, coins will not come
    if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Returned') {
      order.coinsEarned = 0;
      order.coinsDisbursed = false;
      order.coinsReversed = true;
      await order.save();
      continue;
    }

    const deliveryTime = getOrderDeliveryTime(order);
    if (!deliveryTime) continue;

    // Check if 7 days (1 week) have elapsed since delivery
    if (now >= deliveryTime + RETURN_WINDOW_MS) {
      await moveCoins(order.user, order.coinsEarned, {
        type: 'earned',
        order,
        note: `Disbursed for order ${order.orderId} (7-day return policy completed)`,
      });
      order.coinsDisbursed = true;
      order.coinsDisbursedAt = new Date();
      if (!order.deliveredAt) order.deliveredAt = new Date(deliveryTime);
      await order.save();
      disbursed.push(order);
    }
  }

  return disbursed;
}

/**
 * Returns pending coins information for a user (coins earned but locked in the 7-day return window).
 * Cancelled orders will NOT show coins.
 */
export async function getPendingCoinsForUser(userId) {
  const now = Date.now();
  const orders = await Order.find({
    user: userId,
    coinsEarned: { $gt: 0 },
    coinsDisbursed: { $ne: true },
    coinsReversed: { $ne: true },
    orderStatus: { $in: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'], $nin: ['Cancelled', 'Returned'] },
    'returnExchange.status': { $nin: ['Approved', 'Completed'] },
  })
    .select('orderId orderStatus deliveredAt statusHistory coinsEarned createdAt updatedAt items')
    .lean();

  let totalPending = 0;
  const pendingOrders = orders.map((o) => {
    totalPending += o.coinsEarned;
    const isDelivered = o.orderStatus === 'Delivered';
    const deliveryTime = isDelivered ? getOrderDeliveryTime(o) : null;
    const unlockTime = deliveryTime ? deliveryTime + RETURN_WINDOW_MS : null;
    const msRemaining = unlockTime ? Math.max(0, unlockTime - now) : null;
    const daysRemaining = msRemaining != null ? Math.ceil(msRemaining / (24 * 60 * 60 * 1000)) : null;

    return {
      orderId: o.orderId,
      orderStatus: o.orderStatus,
      coins: o.coinsEarned,
      isDelivered,
      deliveredAt: deliveryTime ? new Date(deliveryTime) : null,
      disburseAt: unlockTime ? new Date(unlockTime) : null,
      daysRemaining,
      msRemaining,
      itemsSummary: (o.items || []).map((it) => it.productName).join(', '),
    };
  });

  return { totalPending, pendingOrders };
}
