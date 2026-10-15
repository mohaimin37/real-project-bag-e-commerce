import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
];

export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'];

// Refund lifecycle shown to the customer. "Not required" = nothing was charged (COD before delivery).
export const REFUND_STATUSES = ['None', 'Not required', 'Pending', 'Processed', 'Failed'];

// One line per place money came from (gateway, gift card, wallet) and its own refund state.
const refundPartSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['razorpay', 'giftcard', 'wallet', 'cod'], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: REFUND_STATUSES, default: 'Pending' },
    providerRefundId: String, // Razorpay rfnd_… id
    providerStatus: String, // raw status from the provider (pending / processed / failed)
    failureReason: String,
    processedAt: Date,
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    provider: String, // 'shiprocket'
    providerOrderId: String,
    shipmentId: String,
    awb: String,
    courier: String,
    trackingUrl: String,
    status: String, // provider's own status text, e.g. "PICKUP SCHEDULED"
    lastEventAt: Date,
    lastSyncedAt: Date,
    error: String, // last provider error, shown to admins only
    createdAt: Date,
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    slug: String,
    SKU: { type: String, required: true },
    image: String,
    variant: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      colorHex: String,
      size: String,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    country: { type: String, required: true },
    nationality: { type: String, required: true },
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      landmark: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    coupon: {
      code: String,
      type: { type: String },
      value: Number,
    },
    // Loyalty coins: spent on this order (and the ₹ they took off) and earned by it.
    coinsRedeemed: { type: Number, default: 0, min: 0 },
    coinDiscount: { type: Number, default: 0, min: 0 },
    coinsEarned: { type: Number, default: 0, min: 0 },
    coinsDisbursed: { type: Boolean, default: false, index: true },
    coinsDisbursedAt: Date,
    coinsReversed: { type: Boolean, default: false },
    deliveredAt: { type: Date, index: true },
    returnExchange: { type: mongoose.Schema.Types.Mixed, default: null },
    shippingMethod: { code: String, label: String, eta: String },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Pending', index: true },
    paymentReference: String,
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'Pending', index: true },
    // Messages the team sent the customer about this order (shown on their order page; emailed when chosen).
    customerMessages: [
      {
        _id: false,
        text: { type: String, maxlength: 1000 },
        status: String, // the order status the message went with, if any
        emailed: { type: Boolean, default: false },
        sentAt: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: ORDER_STATUSES },
        note: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    trackingNumber: String,
    courier: String,
    customerNote: { type: String, maxlength: 500 },
    inventoryRestored: { type: Boolean, default: false },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invoiceSentAt: Date,
    // Cancellation: Requested while the server checks the rules, Confirmed once the order is cancelled.
    cancellation: {
      status: { type: String, enum: ['None', 'Requested', 'Confirmed', 'Rejected'], default: 'None' },
      reason: String,
      requestedAt: Date,
      confirmedAt: Date,
      by: { type: String, enum: ['customer', 'admin', 'system'] },
      adminMessage: { type: String, default: '' },
    },
    // Overall refund state (worst of the parts) plus one entry per payment source.
    refundDetails: {
      status: { type: String, default: 'None' },
      amount: { type: Number, default: 0 },
      eta: { type: String, default: '' },
      initiatedAt: Date,
      processedAt: Date,
      parts: { type: [refundPartSchema], default: [] },
      lockedAt: Date, // set while a refund is being sent, so two requests can't refund the same order
    },
    giftCard: {
      code: String,
      amount: { type: Number, default: 0 },
    },
    walletAmount: { type: Number, default: 0, min: 0 }, // paid from the WILDTANE Wallet
    shipment: { type: shipmentSchema, default: undefined },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 }); // "My orders", newest first
orderSchema.index({ orderStatus: 1, createdAt: -1 }); // admin order list filtered by status
// A gateway payment can pay for one order only (stops replaying a captured payment).
orderSchema.index(
  { 'paymentDetails.razorpayPaymentId': 1 },
  { unique: true, partialFilterExpression: { 'paymentDetails.razorpayPaymentId': { $type: 'string' } } }
);
orderSchema.index({ 'shipment.awb': 1 }, { sparse: true });
orderSchema.index({ 'refundDetails.parts.providerRefundId': 1 }, { sparse: true });

export default mongoose.model('Order', orderSchema);
