import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true },
    storeName: { type: String, default: 'WILDTANE' },
    companyName: { type: String, default: 'WILDTANE PRIVATE LIMITED' },
    supportEmail: { type: String, default: 'info@wildtane.com' },
    supportPhone: { type: String, default: '8920550465' },
    // Registered office: printed on customer bills and shown on the Contact page, footer and policies.
    businessAddress: { type: String, default: 'A 370 Amar Puri Nabi Karim, Paharganj, New Delhi-110055' },
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
    // Loyalty coins (like Flipkart SuperCoins): earned on every order, spent as a discount on the next one.
    loyalty: {
      enabled: { type: Boolean, default: true },
      coinsPer100: { type: Number, default: 5, min: 0, max: 100 }, // coins earned per full ₹100 paid for items
      rupeesPerCoin: { type: Number, default: 1, min: 0.01, max: 100 }, // value of one coin at checkout
      maxRedeemPercent: { type: Number, default: 50, min: 1, max: 100 }, // max share of the item total payable with coins
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
    if (!doc.businessAddress) updates.businessAddress = 'A 370 Amar Puri Nabi Karim, Paharganj, New Delhi-110055';
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
