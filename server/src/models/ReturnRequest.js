import mongoose from 'mongoose';

export const RETURN_STATUSES = [
  'Requested',
  'Approved',
  'Pickup Scheduled',
  'In Inspection',
  'Completed',
  'Rejected',
];

export const RETURN_REASONS = [
  'Manufacturing defect or flaw',
  'Damaged product upon delivery',
  'Wrong product or incorrect size delivered',
  'Significant deviation from website description',
  'Fit or comfort not as expected',
  'Changed mind or style preference',
];

const returnItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    variantId: mongoose.Schema.Types.ObjectId,
    variantName: String,
    SKU: String,
    image: String,
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0 },
    totalPrice: { type: Number, min: 0 },
  },
  { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderId: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['return', 'exchange'], required: true, index: true },
    status: { type: String, enum: RETURN_STATUSES, default: 'Requested', index: true },
    reason: { type: String, required: true },
    detailedReason: { type: String, default: '', maxlength: 1000 },
    items: { type: [returnItemSchema], validate: (v) => v.length > 0 },
    exchangePreference: {
      exchangeType: { type: String, enum: ['variant', 'product', 'replacement'], default: 'variant' },
      desiredSizeOrColor: { type: String, default: '' },
      desiredItemName: { type: String, default: '' },
      replacementProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      notes: { type: String, default: '' },
      coinCalculation: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    refundMethod: {
      type: String,
      enum: ['Original Payment Method', 'UPI', 'Bank Transfer', 'Store Coins Wallet'],
      default: 'Original Payment Method',
    },
    refundDetails: {
      upiId: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
    },
    pickupAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
    },
    conditionConfirmed: { type: Boolean, default: true },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: RETURN_STATUSES },
        note: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    adminNotes: { type: String, default: '' },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
  },
  { timestamps: true }
);

returnRequestSchema.index({ user: 1, createdAt: -1 });
returnRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ReturnRequest', returnRequestSchema);
