import crypto from 'crypto';
import GiftCard from '../models/GiftCard.js';
import GiftCardTransaction from '../models/GiftCardTransaction.js';
import ApiError from '../utils/ApiError.js';
import { hashToken } from '../utils/helpers.js';

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** WT-XXXX-XXXX-XXXX: 12 random characters (≈60 bits), hard to guess. */
export async function generateGiftCardCode() {
  for (let i = 0; i < 8; i += 1) {
    const groups = [0, 1, 2].map(() => Array.from({ length: 4 }, () => CHARS[crypto.randomInt(CHARS.length)]).join(''));
    const code = `WT-${groups.join('-')}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await GiftCard.exists({ code }))) return code;
  }
  throw new Error('Could not generate a gift card code');
}

/** New PINs are stored hashed; cards issued before that may hold the plain PIN. */
const pinMatches = (card, pin) => !card.pin || card.pin === hashToken(String(pin || '').trim()) || card.pin === String(pin || '').trim();

/**
 * Loads a card a customer typed in and checks it can pay. Messages are deliberately the same
 * for "no such card" and "wrong PIN" so codes can't be probed one by one.
 */
export async function findUsableCard(code, pin) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) throw ApiError.badRequest('Enter a gift card code.');
  const card = await GiftCard.findOne({ code: clean });
  if (!card || !card.isActive || !pinMatches(card, pin)) throw ApiError.badRequest('This gift card code or PIN is not valid.');
  if (card.expiryDate && card.expiryDate <= new Date()) throw ApiError.badRequest('This gift card has expired.');
  if (card.currentBalance <= 0) throw ApiError.badRequest('This gift card has no balance left.');
  return card;
}

async function ledger(card, { type, amount, balanceAfter, order, user, by, note, key, session }) {
  await GiftCardTransaction.create(
    [{ card: card._id, code: card.code, type, amount, balanceAfter, order: order?._id || null, orderId: order?.orderId || '', user, by, note, key }],
    { session }
  );
}

/**
 * Spends `amount` from a card inside the order transaction. The conditional $inc means two
 * checkouts using the same card at the same moment can't both spend the same balance.
 */
export async function redeemGiftCard(card, amount, { order, userId, session }) {
  const spend = round2(amount);
  if (spend <= 0) return null;
  const updated = await GiftCard.findOneAndUpdate(
    { _id: card._id, isActive: true, currentBalance: { $gte: spend } },
    { $inc: { currentBalance: -spend }, $push: { redeemedBy: { user: userId, order: order._id, amount: spend, redeemedAt: new Date() } } },
    { returnDocument: 'after', session }
  );
  if (!updated) throw ApiError.conflict('Your gift card balance changed. Please check it again and retry.');
  await ledger(updated, { type: 'redeem', amount: -spend, balanceAfter: updated.currentBalance, order, user: userId, note: `Used on order ${order.orderId}`, key: `giftcard_redeem:${order.orderId}`, session });
  return updated;
}

/** Puts a cancelled/refunded order's gift card amount back on the card. Runs once per order. */
export async function restoreGiftCard(order, { session } = {}) {
  const amount = round2(order.giftCard?.amount || 0);
  if (!order.giftCard?.code || amount <= 0) return null;
  const key = `giftcard_restore:${order.orderId}`;
  if (await GiftCardTransaction.exists({ key })) return null;
  const card = await GiftCard.findOneAndUpdate({ code: order.giftCard.code }, { $inc: { currentBalance: amount } }, { returnDocument: 'after', session });
  if (!card) throw new Error(`Gift card ${order.giftCard.code} not found`);
  try {
    await ledger(card, { type: 'restore', amount, balanceAfter: card.currentBalance, order, user: order.user, note: `Order ${order.orderId} cancelled — balance restored`, key, session });
  } catch (err) {
    if (err?.code === 11000 && !session) {
      await GiftCard.updateOne({ _id: card._id }, { $inc: { currentBalance: -amount } });
      return null;
    }
    throw err;
  }
  return card;
}

/** Admin: issue a new card. Returns the card and the plain PIN (shown once). */
export async function issueGiftCard({ amount, expiryDate, withPin = false, note = '' }, adminId) {
  const value = round2(amount);
  if (!(value > 0)) throw ApiError.badRequest('Enter an amount above ₹0.');
  const code = await generateGiftCardCode();
  const pin = withPin ? String(crypto.randomInt(1000, 10000)) : '';
  const card = await GiftCard.create({
    code,
    pin: pin ? hashToken(pin) : '',
    initialBalance: value,
    currentBalance: value,
    ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
    isActive: true,
  });
  await ledger(card, { type: 'issue', amount: value, balanceAfter: value, by: adminId, note, key: `giftcard_issue:${card._id}` });
  return { card, pin };
}

/** Admin: change a card's balance (+/−) or switch it off, with an audit row. */
export async function adjustGiftCard(cardId, { amount = 0, isActive, note = '' }, adminId) {
  const card = await GiftCard.findById(cardId);
  if (!card) throw ApiError.notFound('Gift card not found');
  const delta = round2(amount);
  let updated = card;
  if (delta) {
    updated = await GiftCard.findOneAndUpdate(
      { _id: card._id, ...(delta < 0 ? { currentBalance: { $gte: -delta } } : {}) },
      { $inc: { currentBalance: delta } },
      { returnDocument: 'after' }
    );
    if (!updated) throw ApiError.badRequest('The card does not have that much balance to remove.');
    await ledger(updated, { type: 'adjust', amount: delta, balanceAfter: updated.currentBalance, by: adminId, note, key: `giftcard_adjust:${card._id}:${Date.now()}:${crypto.randomUUID()}` });
  }
  if (typeof isActive === 'boolean' && isActive !== updated.isActive) {
    updated.isActive = isActive;
    await updated.save();
    if (!isActive) await ledger(updated, { type: 'deactivate', amount: 0, balanceAfter: updated.currentBalance, by: adminId, note, key: `giftcard_deactivate:${card._id}:${Date.now()}` });
  }
  return updated;
}
