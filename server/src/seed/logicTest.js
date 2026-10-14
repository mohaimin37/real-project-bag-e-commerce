/**
 * Database-free checks for the refund, wallet, shipping-status and validation rules.
 * Nothing here connects to MongoDB, so it is safe to run against any environment.
 *
 *   node src/seed/logicTest.js
 */
import assert from 'node:assert/strict';
import { overallRefundStatus } from '../services/refund.service.js';
import { walletApplicable, walletRules } from '../services/wallet.service.js';
import { orderStatusFromProvider } from '../services/shipping.service.js';
import { bonusRules, loyaltyRules } from '../services/coin.service.js';
import { registerSchema, verifyOtpSchema } from '../validators/auth.validators.js';
import { checkoutSchema, walletAdjustSchema, giftCardIssueSchema } from '../validators/commerce.validators.js';
import { settingsSchema } from '../validators/content.validators.js';
import crypto from 'node:crypto';
import { verifyRazorpaySignature, verifyRazorpayWebhookSignature } from '../services/payment.service.js';
import { productSchema, categorySchema } from '../validators/catalog.validators.js';
import { plannedCategories, BAGS, DIRECTORIES } from '../../../client/src/content/taxonomy.js';
import { COLLECTIONS } from '../config/collections.js';
import { computeOrderReturnEligibility, needsRefundDetails, allowedRefundMethods, missingRefundDestination } from '../services/return.service.js';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('Refund status');
t('no parts → Not required', () => assert.equal(overallRefundStatus([]), 'Not required'));
t('any failure wins', () => assert.equal(overallRefundStatus([{ status: 'Processed' }, { status: 'Failed' }]), 'Failed'));
t('pending while anything is moving', () => assert.equal(overallRefundStatus([{ status: 'Processed' }, { status: 'Pending' }]), 'Pending'));
t('all processed', () => assert.equal(overallRefundStatus([{ status: 'Processed' }, { status: 'Processed' }]), 'Processed'));

console.log('Wallet');
const s = (enabled, pct) => ({ wallet: { enabled, maxRedeemPercent: pct } });
t('never more than the balance', () => assert.equal(walletApplicable(300, 1000, s(true, 100)), 300));
t('never more than the amount due', () => assert.equal(walletApplicable(5000, 1000, s(true, 100)), 1000));
t('respects the % cap', () => assert.equal(walletApplicable(5000, 1000, s(true, 40)), 400));
t('disabled → 0', () => assert.equal(walletApplicable(5000, 1000, s(false, 100)), 0));
t('zero balance → 0', () => assert.equal(walletApplicable(0, 1000, s(true, 100)), 0));
t('defaults when settings are old', () => assert.deepEqual(walletRules({}), { enabled: true, maxRedeemPercent: 100 }));

console.log('Loyalty bonuses');
t('defaults: 50 signup, 100 referral, on first delivery', () => {
  const b = bonusRules({});
  assert.equal(b.signupBonus, 50);
  assert.equal(b.referralBonus, 100);
  assert.equal(b.referralQualifyOn, 'first_delivery');
});
t('configured values win', () => assert.equal(bonusRules({ loyalty: { signupBonus: 75 } }).signupBonus, 75));
t('public rules expose bonus amounts', () => assert.equal(loyaltyRules({}).referralBonus, 100));

console.log('Courier status mapping (forward only, known steps only)');
t('DELIVERED', () => assert.equal(orderStatusFromProvider('DELIVERED'), 'Delivered'));
t('OUT FOR DELIVERY', () => assert.equal(orderStatusFromProvider('Out For Delivery'), 'Out for Delivery'));
t('IN TRANSIT → Shipped', () => assert.equal(orderStatusFromProvider('IN TRANSIT'), 'Shipped'));
t('unknown text → no change', () => assert.equal(orderStatusFromProvider('PICKUP EXCEPTION'), null));
t('RTO/cancelled → no change', () => assert.equal(orderStatusFromProvider('CANCELED'), null));

console.log('Validation');
t('register keeps the referral code (was silently stripped)', () => {
  const r = registerSchema.parse({ name: 'Test User', email: 'a@b.co', password: 'abcd1234', referralCode: 'wtabc234' });
  assert.equal(r.referralCode, 'WTABC234');
});
t('register rejects junk referral codes', () => assert.equal(registerSchema.safeParse({ name: 'Test User', email: 'a@b.co', password: 'abcd1234', referralCode: '<script>' }).success, false));
t('checkout keeps gift card + wallet fields (gift card was stripped before)', () => {
  const c = checkoutSchema.parse({
    customer: { name: 'Test User', email: 'a@b.co', phone: { dialCode: '+91', number: '9876543210' }, country: 'IN', nationality: 'IN' },
    addressId: 'x',
    paymentMethod: 'razorpay',
    giftCardCode: 'WT-ABCD-EFGH-JKLM',
    useWallet: true,
  });
  assert.equal(c.giftCardCode, 'WT-ABCD-EFGH-JKLM');
  assert.equal(c.useWallet, true);
});
t('OTP must be 6 digits', () => assert.equal(verifyOtpSchema.safeParse({ email: 'a@b.co', otp: '12345' }).success, false));
t('wallet adjustment needs a reason', () => assert.equal(walletAdjustSchema.safeParse({ amount: 100, note: '' }).success, false));
t('wallet adjustment cannot be 0', () => assert.equal(walletAdjustSchema.safeParse({ amount: 0, note: 'goodwill' }).success, false));
t('gift card must be worth more than 0', () => assert.equal(giftCardIssueSchema.safeParse({ amount: 0 }).success, false));
t('ribbon links must be store paths', () => {
  assert.equal(settingsSchema.safeParse({ promoRibbon: [{ label: 'Sale', to: 'https://evil.example' }] }).success, false);
  assert.equal(settingsSchema.safeParse({ promoRibbon: [{ label: 'Sale', to: '//evil.example' }] }).success, false);
  assert.equal(settingsSchema.safeParse({ promoRibbon: [{ label: 'Sale', to: '/offers' }] }).success, true);
});
t('ribbon end date must be after start', () =>
  assert.equal(settingsSchema.safeParse({ promoRibbon: [{ label: 'Sale', to: '/offers', startsAt: '2026-10-10', endsAt: '2026-10-01' }] }).success, false));

console.log('Catalogue validation (edits must not wipe saved data)');
const productBase = { name: 'Test Bag', sku: 'TB-1', category: '64b7f0000000000000000001', price: 100, salePrice: '', variants: [{ name: 'Black', sku: 'TB-1-BLK', stock: 1 }] };
t('product edit without `categories` leaves them alone (no [] default)', () => assert.equal('categories' in productSchema.parse(productBase), false));
t('product edit without care instructions leaves them alone', () => assert.equal('careInstructions' in productSchema.parse(productBase), false));
t('product extra categories must be ids', () => assert.equal(productSchema.safeParse({ ...productBase, categories: ['nope'] }).success, false));
t('closure type is limited to known values', () => assert.equal(productSchema.safeParse({ ...productBase, closureType: 'velcro?' }).success, false));
t('category edit without department keeps it (no "all" default)', () => assert.equal('department' in categorySchema.parse({ name: 'Tote Bags' }), false));
t('category slug: lowercase-dash only via admin form; homepage flag accepted', () => assert.equal(categorySchema.parse({ name: 'Tote Bags', showOnHome: true }).showOnHome, true));

console.log('Taxonomy');
const planned = plannedCategories();
t('every planned slug is lowercase-dash', () => assert.ok(planned.every((p) => /^[a-z0-9-]+$/.test(p.slug)), planned.find((p) => !/^[a-z0-9-]+$/.test(p.slug))?.slug));
t('blueprint homepage categories are all in the Bags directory', () => {
  const bagSlugs = new Set(BAGS.sections.flatMap((s) => s.groups.flatMap((g) => g.items.filter((i) => i.blueprint).map((i) => i.label))));
  ['Handbags', 'Clutches', 'Wallets', 'Laptop Bags', 'Travel Bags', 'School Bags'].forEach((n) => assert.ok(bagSlugs.has(n), n));
});
t('no group lists the same tile twice', () => {
  for (const dir of Object.values(DIRECTORIES)) for (const s of dir.sections) for (const g of s.groups) {
    const slugs = g.items.map((i) => i.slug);
    assert.equal(new Set(slugs).size, slugs.length, `${dir.key}/${g.key}`);
  }
});
t('collections use only real query fields', () => assert.ok(COLLECTIONS.every((c) => Object.keys(c.query).every((k) => ['purpose', 'occasion', 'tag', 'newArrival', 'bestseller', 'onSale', 'sort'].includes(k)))));

console.log('Payment signature');
t('webhook signature checks against the given secret', () => {
  const body = '{"event":"refund.processed"}';
  const sig = crypto.createHmac('sha256', 'admin-saved-secret-123').update(body).digest('hex');
  assert.equal(verifyRazorpayWebhookSignature(body, sig, 'admin-saved-secret-123'), true);
  assert.equal(verifyRazorpayWebhookSignature(body, sig, 'some-other-secret-456'), false);
  assert.equal(verifyRazorpayWebhookSignature(body, sig, ''), false);
});
t('webhook secret: too short or with spaces is refused, empty clears it', () => {
  assert.equal(settingsSchema.safeParse({ razorpayWebhookSecret: 'short' }).success, false);
  assert.equal(settingsSchema.safeParse({ razorpayWebhookSecret: 'has spaces in it ok' }).success, false);
  assert.equal(settingsSchema.safeParse({ razorpayWebhookSecret: '' }).success, true);
  assert.equal(settingsSchema.safeParse({ razorpayWebhookSecret: 'Abc123XyZ789qwe' }).success, true);
});
t('a forged signature is rejected', () => assert.equal(verifyRazorpaySignature({ razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'f'.repeat(64) }), false));
t('missing pieces are rejected', () => assert.equal(verifyRazorpaySignature({ razorpayOrderId: 'order_x' }), false));

console.log('Returns');
const P1 = '64b000000000000000000001';
const delivered = { orderStatus: 'Delivered', deliveredAt: new Date(Date.now() - 2 * 864e5), paymentMethod: 'cod', items: [{ productId: P1, productName: 'Tote', quantity: 1, unitPrice: 1000 }] };
const reqOf = (status, ago = 1) => ({ requestId: `RET-${status}`, type: 'return', status, items: [{ productId: P1 }], createdAt: new Date(Date.now() - ago * 1000) });
const item = (reqs) => computeOrderReturnEligibility(delivered, reqs).itemsEligibility[0];
t('delivered item inside 7 days can be returned', () => assert.equal(item([]).canReturnOrExchange, true));
t('pending request holds the item', () => assert.equal(item([reqOf('Requested')]).canReturnOrExchange, false));
t('rejected item cannot be returned again', () => {
  const it = item([reqOf('Rejected')]);
  assert.equal(it.canReturnOrExchange, false);
  assert.equal(it.reasonNotEligible, 'This item cannot be returned or exchanged.');
});
t('a request the customer cancelled frees the item', () => assert.equal(item([reqOf('Cancelled')]).canReturnOrExchange, true));
t('newest request wins (cancelled, then requested again)', () => assert.equal(item([reqOf('Cancelled', 9), reqOf('Requested', 1)]).request.status, 'Requested'));
t('approved return asks for refund details', () => assert.equal(needsRefundDetails({ type: 'return', status: 'Approved', refund: { status: 'None' } }), true));
t('…but not once given', () => assert.equal(needsRefundDetails({ type: 'return', status: 'Approved', refundDetailsSubmittedAt: new Date() }), false));
t('pending return does not ask yet', () => assert.equal(needsRefundDetails({ type: 'return', status: 'Requested' }), false));
t('COD orders never offer "original payment"', () => assert.equal(allowedRefundMethods({}, { paymentMethod: 'cod' }).includes('Original Payment Method'), false));
t('admin can switch refund options off', () => assert.deepEqual(allowedRefundMethods({ returnRefundMethods: ['UPI'] }, { paymentMethod: 'razorpay' }), ['UPI']));
t('a COD return without UPI/bank details cannot complete', () => assert.equal(missingRefundDestination({ type: 'return', refundMethod: 'Original Payment Method' }, { paymentMethod: 'cod' }), true));

console.log('Spin wheel & shop menu settings');
const slice = (o) => ({ label: 'Prize', short: 'Prize', type: 'fixed', value: 50, weight: 10, color: '#0284c7', ...o });
t('wheel needs 2 live prizes', () => assert.equal(settingsSchema.safeParse({ spinToWin: { enabled: true, slices: [slice()] } }).success, false));
t('percentage prize capped at 90%', () => assert.equal(settingsSchema.safeParse({ spinToWin: { enabled: true, slices: [slice(), slice({ type: 'percentage', value: 95 })] } }).success, false));
t('valid wheel accepted', () => assert.equal(settingsSchema.safeParse({ spinToWin: { enabled: true, slices: [slice(), slice({ type: 'free_shipping', value: 0 })] } }).success, true));
t('shop menu links must be store paths', () => assert.equal(settingsSchema.safeParse({ shopShowcase: { customized: true, departments: [], budgets: [{ label: 'x', to: 'https://evil.example' }], trends: [], perks: [] } }).success, false));
t('shop menu can be reset to built-in', () => assert.equal(settingsSchema.safeParse({ shopShowcase: null }).success, true));
t('homepage text and store links accepted', () => assert.equal(settingsSchema.safeParse({ homepage: { desktop: { hero: { title: 'Hi', buttons: [{ label: 'Men', to: '/men' }] } } } }).success, true));
t('homepage links must be store paths', () => assert.equal(settingsSchema.safeParse({ homepage: { desktop: { hero: { buttons: [{ to: 'javascript:alert(1)' }] } } } }).success, false));
t('homepage images must be uploads or https', () => assert.equal(settingsSchema.safeParse({ homepage: { mobile: { heroSlides: [{ image: 'http://evil.example/x.jpg' }] } } }).success, false));
t('footer links must be store paths', () => assert.equal(settingsSchema.safeParse({ footer: { columns: [{ title: 'x', links: [{ label: 'a', to: '//evil.example' }] }] } }).success, false));

console.log(`\n${passed} checks passed`);
process.exit(0);
