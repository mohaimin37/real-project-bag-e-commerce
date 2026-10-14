import crypto from 'crypto';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Referral from '../models/Referral.js';
import Setting from '../models/Setting.js';
import { moveCoins, bonusRules } from './coin.service.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I, easy to read aloud

function randomCode() {
  let s = '';
  for (let i = 0; i < 6; i += 1) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return `WT${s}`;
}

/** A referral code nobody else has. */
export async function uniqueReferralCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = randomCode();
    // eslint-disable-next-line no-await-in-loop
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  throw new Error('Could not generate a referral code');
}

/** Gives an existing customer a code if they were created before codes existed. */
export async function ensureReferralCode(userId) {
  const user = await User.findById(userId).select('referralCode');
  if (!user) return null;
  if (user.referralCode) return user.referralCode;
  const code = await uniqueReferralCode();
  await User.updateOne({ _id: userId, referralCode: { $in: [null, ''] } }, { $set: { referralCode: code } });
  return (await User.findById(userId).select('referralCode')).referralCode;
}

const digits = (p) => String(p?.number || '').replace(/\D/g, '').slice(-10);

/**
 * Called right after a new account is created with a referral code.
 * Records the relationship, rejects obvious abuse, and pays at once when the store rule is "signup".
 * Never throws: a bad code must not block a registration.
 */
export async function recordReferral(newUser, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;
  try {
    const referrer = await User.findOne({ referralCode: code }).select('_id email phone isActive role');
    if (!referrer || !referrer.isActive || referrer.role !== 'customer') return null;

    let rejectReason = '';
    if (String(referrer._id) === String(newUser._id) || referrer.email === newUser.email) rejectReason = 'Self-referral';
    else if (digits(newUser.phone) && digits(newUser.phone) === digits(referrer.phone)) rejectReason = 'Same mobile number as the referrer';

    const settings = await Setting.get();
    const rules = bonusRules(settings);
    if (!rejectReason && rules.maxReferralsPerUser > 0) {
      const rewarded = await Referral.countDocuments({ referrer: referrer._id, status: 'rewarded' });
      if (rewarded >= rules.maxReferralsPerUser) rejectReason = 'Referral limit reached';
    }

    const referral = await Referral.create({
      referrer: referrer._id,
      referee: newUser._id,
      code,
      status: rejectReason ? 'rejected' : 'pending',
      rejectReason,
    });
    if (!rejectReason) await User.updateOne({ _id: newUser._id }, { $set: { referredBy: referrer._id } });
    if (!rejectReason && rules.referralQualifyOn === 'signup') await rewardReferral(referral, '');
    return referral;
  } catch (err) {
    if (err?.code !== 11000) console.error('[referral] could not record referral:', err.message);
    return null;
  }
}

/** Pays the referrer once. The coin ledger key makes a second payment impossible. */
async function rewardReferral(referral, orderId) {
  const settings = await Setting.get();
  const { referralBonus } = bonusRules(settings);
  // Claim the referral first so two deliveries arriving together can't both pay it.
  const claimed = await Referral.findOneAndUpdate(
    { _id: referral._id, status: 'pending' },
    { $set: { status: 'rewarded', rewardedAt: new Date(), coins: referralBonus, qualifyingOrder: orderId } },
    { returnDocument: 'after' }
  );
  if (!claimed || referralBonus <= 0) return claimed;
  const referee = await User.findById(referral.referee).select('name');
  await moveCoins(referral.referrer, referralBonus, {
    type: 'bonus',
    key: `referral:${referral.referee}`,
    note: `Referral bonus: ${referee?.name?.split(' ')[0] || 'your friend'} ${orderId ? 'received their first order' : 'joined WILDTANE'}`,
  });
  return claimed;
}

/** Called when an order is delivered: the referee's first delivered order qualifies the referral. */
export async function qualifyReferralOnDelivery(order) {
  try {
    const referral = await Referral.findOne({ referee: order.user, status: 'pending' });
    if (!referral) return;
    const settings = await Setting.get();
    if (bonusRules(settings).referralQualifyOn !== 'first_delivery') return;
    const delivered = await Order.countDocuments({ user: order.user, orderStatus: 'Delivered' });
    if (delivered < 1) return;
    await rewardReferral(referral, order.orderId);
  } catch (err) {
    console.error('[referral] qualification failed:', err.message);
  }
}

/** The account page's "Refer & earn" data. */
export async function referralSummary(userId) {
  const [code, settings, referrals] = await Promise.all([
    ensureReferralCode(userId),
    Setting.get(),
    Referral.find({ referrer: userId }).sort({ createdAt: -1 }).limit(100).populate('referee', 'name createdAt').lean(),
  ]);
  const rules = bonusRules(settings);
  return {
    code,
    rules: { referralBonus: rules.referralBonus, qualifyOn: rules.referralQualifyOn },
    referrals: referrals.map((r) => ({
      _id: r._id,
      // First name only: the referrer must not see other customers' details.
      name: r.referee?.name?.split(' ')[0] || 'Customer',
      joinedAt: r.referee?.createdAt || r.createdAt,
      status: r.status,
      rejectReason: r.status === 'rejected' ? r.rejectReason : '',
      coins: r.coins,
      rewardedAt: r.rewardedAt,
    })),
    totals: {
      rewarded: referrals.filter((r) => r.status === 'rewarded').length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      coins: referrals.reduce((n, r) => n + (r.status === 'rewarded' ? r.coins || 0 : 0), 0),
    },
  };
}
