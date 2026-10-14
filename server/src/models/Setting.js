import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true },
    storeName: { type: String, default: 'WILDTANE' },
    companyName: { type: String, default: 'WILDTANE PRIVATE LIMITED' },
    supportEmail: { type: String, default: 'info@wildtane.com' },
    supportPhone: { type: String, default: '8920550465' },
    // Registered office: printed on customer bills and shown on the Contact page, footer and policies.
    businessAddress: { type: String, default: 'Paharganj , New Delhi , 110055' },
    supportHours: { type: String, default: 'Monday to Saturday, 10:00 am – 6:00 pm (except public holidays)' },
    // Grievance Officer required by the Consumer Protection (E-Commerce) Rules, 2020 and the DPDP Act, 2023.
    grievanceOfficer: {
      name: { type: String, default: '' },
      designation: { type: String, default: 'Grievance Officer' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    gstin: { type: String, default: '07AAECW3767F1Z4' },
    announcement: {
      type: String,
      default: 'Free standard shipping on orders over ₹10,000',
    },
    baseCurrency: { type: String, default: 'INR' },
    taxRate: { type: Number, default: 18, min: 0, max: 100 }, // GST %
    taxLabel: { type: String, default: 'GST' },
    // true: catalog prices already include tax (tax line shows the included portion).
    pricesIncludeTax: { type: Boolean, default: true },
    freeShippingThreshold: { type: Number, default: 10000, min: 0 },
    shippingMethods: {
      type: [
        {
          _id: false,
          code: String,
          label: String,
          description: String,
          eta: String,
          price: Number,
          freeEligible: Boolean, // becomes free above freeShippingThreshold
        },
      ],
      default: [
        {
          code: 'standard',
          label: 'Standard Delivery',
          description: 'Tracked delivery to your door',
          eta: '3–7 working days',
          price: 199,
          freeEligible: true,
        },
      ],
    },
    // Loyalty coins: earned on every order, spent as a discount on the next one.
    loyalty: {
      enabled: { type: Boolean, default: true },
      coinsPer100: { type: Number, default: 5, min: 0, max: 100 }, // coins earned per full ₹100 paid for items
      rupeesPerCoin: { type: Number, default: 1, min: 0.01, max: 100 }, // value of one coin at checkout
      minRedeemCoins: { type: Number, default: 100, min: 1 }, // min coins required to redeem
      maxRedeemPercent: { type: Number, default: 50, min: 1, max: 100 }, // max share of the item total payable with coins
      signupBonus: { type: Number, default: 50, min: 0 }, // coins for a completed registration (once per account)
      birthdayBonus: { type: Number, default: 100 },
      reviewBonus: { type: Number, default: 20 },
      referralBonus: { type: Number, default: 100, min: 0 }, // coins to the referrer when a referral qualifies
      // 'signup': pays when the friend registers. 'first_delivery': pays when the friend's first order is delivered (harder to abuse).
      referralQualifyOn: { type: String, enum: ['signup', 'first_delivery'], default: 'first_delivery' },
      maxReferralsPerUser: { type: Number, default: 50, min: 0 },
      referredFriendDiscount: { type: Number, default: 100 },
      vipTiers: {
        silver: { minSpend: { type: Number, default: 0 }, coinsPer100: { type: Number, default: 5 }, label: { type: String, default: 'Silver' } },
        gold: { minSpend: { type: Number, default: 25000 }, coinsPer100: { type: Number, default: 7 }, label: { type: String, default: 'Gold' }, freeShipping: { type: Boolean, default: true } },
        platinum: { minSpend: { type: Number, default: 60000 }, coinsPer100: { type: Number, default: 10 }, label: { type: String, default: 'Platinum' }, freeShipping: { type: Boolean, default: true } },
      },
    },
    // Cancelled prepaid orders: refund at once (default), or wait for the team to press "Refund now".
    cancellationRefunds: {
      automatic: { type: Boolean, default: true },
    },
    spinToWin: {
      enabled: { type: Boolean, default: true },
      cooldownHours: { type: Number, default: 24 },
      // Prizes on the wheel, clockwise from the top. Admin → Settings → Spin wheel.
      slices: {
        type: [
          {
            _id: false,
            label: { type: String, trim: true, maxlength: 60 }, // shown on the prize card
            short: { type: String, trim: true, maxlength: 12 }, // printed on the wheel
            type: { type: String, enum: ['fixed', 'percentage', 'free_shipping'] },
            value: { type: Number, min: 0, default: 0 },
            minOrder: { type: Number, min: 0, default: 0 },
            weight: { type: Number, min: 0, default: 10 }, // chance relative to the other prizes
            color: { type: String, trim: true, default: '#0284c7' },
            isActive: { type: Boolean, default: true },
          },
        ],
        default: [
          { label: '₹50 Off', short: '₹50 Off', type: 'fixed', value: 50, minOrder: 0, weight: 35, color: '#0284c7', isActive: true },
          { label: '10% Extra Off', short: '10% Off', type: 'percentage', value: 10, minOrder: 0, weight: 30, color: '#7c3aed', isActive: true },
          { label: '₹150 Off (orders over ₹1,499)', short: '₹150 Off', type: 'fixed', value: 150, minOrder: 1499, weight: 20, color: '#059669', isActive: true },
          { label: 'Free Shipping', short: 'Free Ship', type: 'free_shipping', value: 0, minOrder: 0, weight: 15, color: '#e11d48', isActive: true },
        ],
      },
    },
    // Ways a customer may choose to get money back for an approved return (refund page).
    returnRefundMethods: {
      type: [String],
      default: ['Original Payment Method', 'UPI', 'Bank Transfer', 'Store Coins Wallet'],
    },
    // Content of the full-screen "Shop" menu. Empty / not customised = the built-in content
    // (client/src/components/layout/ShopMenuWidget.jsx). Admin → Settings → Shop menu.
    shopShowcase: { type: mongoose.Schema.Types.Mixed, default: null },
    // Homepage text, images, links and section order (desktop + phone) and footer link columns.
    // null / missing keys = built-in content (client/src/content/homepage.js). Admin → Settings → Homepage / Footer.
    homepage: { type: mongoose.Schema.Types.Mixed, default: null },
    footer: { type: mongoose.Schema.Types.Mixed, default: null },
    exitIntent: {
      enabled: { type: Boolean, default: true },
      couponCode: { type: String, default: 'WILD10' },
      discountText: { type: String, default: 'Flat 10% Extra Off' },
    },
    // Offer links in the strip above the search bar. Only active entries inside their dates are shown.
    promoRibbon: {
      type: [
        {
          _id: false,
          label: { type: String, trim: true, maxlength: 40 },
          to: { type: String, trim: true, maxlength: 200 }, // storefront path, e.g. /offers
          icon: { type: String, trim: true, default: '' },
          isActive: { type: Boolean, default: true },
          startsAt: { type: Date, default: null },
          endsAt: { type: Date, default: null },
        },
      ],
      default: [
        { label: 'Sale', to: '/offers', icon: 'sell', isActive: true },
        { label: 'New Arrivals', to: '/shop?newArrival=true&sort=newest', icon: 'new_releases', isActive: true },
        { label: 'Best Sellers', to: '/shop?bestseller=true&sort=bestseller', icon: 'local_fire_department', isActive: true },
      ],
    },
    // WILDTANE Wallet (₹ credit from refunds, promotions and admin adjustments).
    wallet: {
      enabled: { type: Boolean, default: true },
      maxRedeemPercent: { type: Number, default: 100, min: 1, max: 100 }, // share of an order payable from the wallet
    },
    giftCardsEnabled: { type: Boolean, default: true },
    // Refund timeframe shown to customers once a gateway refund is initiated. Must match the published
    // Return, Refund & Exchange Policy (client/src/content/policies.js → "Refund Timeline").
    refundEta: { type: String, default: '7–10 working days' },
    // Parcel defaults sent to the shipping provider when a product has no size of its own.
    shippingPackage: {
      pickupLocation: { type: String, default: 'Primary' }, // name of the pickup address saved in Shiprocket
      lengthCm: { type: Number, default: 40 },
      breadthCm: { type: Number, default: 30 },
      heightCm: { type: Number, default: 15 },
      weightKg: { type: Number, default: 1 },
      autoCreateOnConfirm: { type: Boolean, default: true },
    },
    razorpayEnabled: { type: Boolean, default: true },
    // Razorpay webhook: the signing secret saved by the admin (used when RAZORPAY_WEBHOOK_SECRET is not
    // set on the server) and what the last webhook call looked like. The secret never leaves the server.
    razorpayWebhook: {
      secret: { type: String, default: '' },
      lastReceivedAt: { type: Date, default: null },
      lastEvent: { type: String, default: '' },
      lastStatus: { type: String, enum: ['', 'ok', 'bad_signature', 'error'], default: '' },
      lastError: { type: String, default: '' },
    },
    codEnabled: { type: Boolean, default: true },
    codMaxOrder: { type: Number, default: 50000 },
    // Display-only conversion: 1 INR = rate units of the currency.
    currencies: {
      type: [{ _id: false, code: String, symbol: String, label: String, rate: Number }],
      default: [
        { code: 'INR', symbol: '₹', label: 'India (INR ₹)', rate: 1 },
        { code: 'USD', symbol: '$', label: 'United States (USD $)', rate: 0.012 },
        { code: 'EUR', symbol: '€', label: 'European Union (EUR €)', rate: 0.011 },
        { code: 'GBP', symbol: '£', label: 'United Kingdom (GBP £)', rate: 0.0094 },
        { code: 'AED', symbol: 'AED ', label: 'United Arab Emirates (AED)', rate: 0.044 },
        { code: 'SAR', symbol: 'SAR ', label: 'Saudi Arabia (SAR)', rate: 0.045 },
        { code: 'QAR', symbol: 'QAR ', label: 'Qatar (QAR)', rate: 0.044 },
        { code: 'BHD', symbol: 'BHD ', label: 'Bahrain (BHD)', rate: 0.0045 },
      ],
    },
    // Storefront look (themes are defined in client/src/theme/themes.js). Shoppers can still
    // pick their own appearance/theme; these are the defaults and the allowed choices.
    appearance: {
      defaultTheme: { type: String, default: 'default' },
      defaultMode: { type: String, enum: ['light', 'dark'], default: 'dark' },
      enabledThemes: { type: [String], default: ['default', 'luxury', 'modern', 'ocean', 'rose', 'emerald', 'mono', 'reference', 'clear', 'custom'] },
    },
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      linkedin: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Read on almost every cart/checkout call, so kept for 30s (the same as the public /config cache).
// Each caller gets its own copy; any save clears it.
const TTL_MS = 30 * 1000;
let cached = null;
const forget = () => {
  cached = null;
};

settingSchema.statics.get = async function getSettings() {
  if (cached && cached.exp > Date.now()) return this.hydrate(mongoose.mongo.BSON.deserialize(cached.bson));
  let doc = await this.findOne({ key: 'store' }).lean();
  if (!doc) {
    doc = (await this.create({ key: 'store' })).toObject();
  } else {
    const updates = {};
    if (!doc.companyName) updates.companyName = 'WILDTANE PRIVATE LIMITED';
    if (!doc.businessAddress || doc.businessAddress.includes('Amar Puri')) updates.businessAddress = 'Paharganj , New Delhi , 110055';
    if (!doc.gstin) updates.gstin = '07AAECW3767F1Z4';
    if (!doc.supportPhone || doc.supportPhone.includes('98765')) updates.supportPhone = '8920550465';
    if (Object.keys(updates).length > 0) {
      await this.updateOne({ key: 'store' }, { $set: updates });
      doc = { ...doc, ...updates };
    }
  }
  cached = { bson: mongoose.mongo.BSON.serialize(doc), exp: Date.now() + TTL_MS };
  return this.hydrate(doc);
};

settingSchema.post('save', forget);
settingSchema.post(['findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'], { document: false, query: true }, forget);

export default mongoose.model('Setting', settingSchema);
