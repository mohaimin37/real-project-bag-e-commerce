import mongoose from 'mongoose';

// Short, timely posts (drops, restocks, events, store news) shown as a live feed on the storefront.
const liveUpdateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, trim: true, default: '', maxlength: 1000 },
    kind: { type: String, enum: ['news', 'drop', 'restock', 'event', 'offer'], default: 'news' },
    link: { type: String, trim: true, default: '', maxlength: 300 },
    linkLabel: { type: String, trim: true, default: '', maxlength: 40 },
    image: { url: String, publicId: String },
    pinned: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'WILDTANE' },
  },
  { timestamps: true }
);

liveUpdateSchema.index({ pinned: -1, createdAt: -1 });

export default mongoose.model('LiveUpdate', liveUpdateSchema);
