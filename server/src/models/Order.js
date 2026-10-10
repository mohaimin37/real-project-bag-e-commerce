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

export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];

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
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'Pending', index: true },
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
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 }); // "My orders", newest first
orderSchema.index({ orderStatus: 1, createdAt: -1 }); // admin order list filtered by status

export default mongoose.model('Order', orderSchema);
