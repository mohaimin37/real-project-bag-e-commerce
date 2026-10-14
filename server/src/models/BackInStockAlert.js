import mongoose from 'mongoose';

const backInStockAlertSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    isNotified: { type: Boolean, default: false, index: true },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

backInStockAlertSchema.index({ product: 1, email: 1 });

export default mongoose.model('BackInStockAlert', backInStockAlertSchema);
