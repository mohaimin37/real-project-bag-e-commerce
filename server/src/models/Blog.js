import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, trim: true, default: '', maxlength: 400 },
    content: { type: String, required: true }, // sanitized HTML
    coverImage: { url: String, publicId: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'WILDTANE Editorial' },
    category: { type: String, trim: true, default: 'Journal' },
    tags: [{ type: String, trim: true, lowercase: true }],
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    readingMinutes: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

blogSchema.pre('save', function computeMeta() {
  const words = String(this.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  this.readingMinutes = Math.max(1, Math.round(words / 220));
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
});

export default mongoose.model('Blog', blogSchema);
