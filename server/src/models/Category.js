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
    department: {
      type: String,
      enum: ['men', 'women', 'universal', 'all'],
      default: 'all',
      index: true,
    },
    level: {
      type: Number,
      default: 1, // 0 = department, 1 = category, 2 = subcategory, 3 = product type
      index: true,
    },
    icon: { type: String, trim: true, default: '' },
    banner: {
      url: { type: String, default: '' },
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
    },
    metaTitle: { type: String, trim: true, default: '' },
    metaDescription: { type: String, trim: true, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    showInMenu: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: false }, // homepage category tiles
    isFeatured: { type: Boolean, default: false }, // highlighted in mega menus / landing pages
  },
  { timestamps: true }
);

categorySchema.index({ department: 1, level: 1, sortOrder: 1 });

export default mongoose.model('Category', categorySchema);
