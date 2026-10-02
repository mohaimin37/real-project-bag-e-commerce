import mongoose from 'mongoose';

// A category with `parent` set is a subcategory of that parent.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true, default: '', maxlength: 160 },
    description: { type: String, trim: true, default: '', maxlength: 600 },
    image: { url: String, publicId: String },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    showInMenu: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
