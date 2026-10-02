import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true },
    storeName: { type: String, default: 'WILDTANE' },
    supportEmail: { type: String, default: 'care@wildtane.com' },
    supportPhone: { type: String, default: '+91 98765 43210' },
    // Printed on customer bills.
    businessAddress: { type: String, default: '' },
    gstin: { type: String, default: '' },
    announcement: {
      type: String,
      default: 'Complimentary carbon-neutral express shipping on orders over ₹10,000',
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
          label: 'Carbon-Neutral Standard',
          description: 'Tracked ground & sea freight, offset at source',
          eta: '5–7 business days',
          price: 199,
          freeEligible: true,
        },
        {
          code: 'express',
          label: 'Priority Express',
          description: 'Air express with live tracking and signature',
          eta: '1–3 business days',
          price: 599,
          freeEligible: false,
        },
      ],
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
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      linkedin: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

settingSchema.statics.get = async function getSettings() {
  let doc = await this.findOne({ key: 'store' });
  if (!doc) doc = await this.create({ key: 'store' });
  return doc;
};

export default mongoose.model('Setting', settingSchema);
