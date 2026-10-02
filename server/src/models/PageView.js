import mongoose from 'mongoose';

// One storefront page view. Anonymous: visitorId is a random id kept in the shopper's browser,
// no IP address or personal data is stored. Rows expire after ~13 months.
const pageViewSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, maxlength: 64 },
    sessionId: { type: String, required: true, maxlength: 64 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    path: { type: String, required: true, maxlength: 200 },
    productSlug: { type: String, default: null, maxlength: 120 },
    source: { type: String, default: 'direct', maxlength: 80 }, // referrer host, or "direct"
    device: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
    newVisitor: { type: Boolean, default: false },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

pageViewSchema.index({ at: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });
pageViewSchema.index({ visitorId: 1, at: -1 });
pageViewSchema.index({ productSlug: 1, at: -1 });

export default mongoose.model('PageView', pageViewSchema);
