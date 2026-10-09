import mongoose from 'mongoose';

export const COMMENT_STATUSES = ['pending', 'approved', 'rejected'];

// Homepage "Customer comments": anyone can leave one from the home page; only comments an admin
// approves are shown. Admins can also add real feedback received elsewhere (WhatsApp, phone,
// in store) with a note saying where it came from.
const commentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    city: { type: String, trim: true, default: '', maxlength: 60 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true, trim: true, maxlength: 600 },
    status: { type: String, enum: COMMENT_STATUSES, default: 'pending', index: true },
    source: { type: String, enum: ['website', 'admin'], default: 'website' },
    sourceNote: { type: String, trim: true, default: '', maxlength: 120 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

commentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
