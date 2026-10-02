import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: '', maxlength: 120 },
    comment: { type: String, trim: true, required: true, maxlength: 2000 },
    isVerifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: ['approved', 'pending', 'hidden'], default: 'approved', index: true },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
