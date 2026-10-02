import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    placement: { type: String, enum: ['hero', 'promo', 'announcement'], required: true, index: true },
    eyebrow: { type: String, trim: true, default: '', maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, default: '', maxlength: 400 },
    image: { url: String, publicId: String },
    ctaLabel: { type: String, trim: true, default: '', maxlength: 40 },
    ctaLink: { type: String, trim: true, default: '', maxlength: 300 },
    couponCode: { type: String, trim: true, uppercase: true, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null }, // promo banners show a countdown to this
  },
  { timestamps: true }
);

export default mongoose.model('Banner', bannerSchema);
