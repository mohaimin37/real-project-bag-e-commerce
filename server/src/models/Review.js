import mongoose from 'mongoose';

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'hidden'];

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The delivered order that proves the purchase; set by the server, never by the reviewer.
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: '', maxlength: 120 },
    comment: { type: String, trim: true, required: true, maxlength: 2000 },
    isVerifiedPurchase: { type: Boolean, default: false },
    // New and edited reviews wait for an admin; only approved ones are public and count towards ratings.
    status: { type: String, enum: REVIEW_STATUSES, default: 'pending', index: true },
    // Picked by an admin for the homepage "What our customers say" section (approved + verified only).
    showOnHome: { type: Boolean, default: false, index: true },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
