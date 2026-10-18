import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        quantity: { type: Number, required: true, min: 1, max: 99 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    couponCode: { type: String, uppercase: true, trim: true, default: null },
    couponCodes: [{ type: String, uppercase: true, trim: true }],
    shippingMethod: { type: String, default: 'standard' },
    useCoins: { type: Boolean, default: false }, // shopper ticked "use my coins" at checkout
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
