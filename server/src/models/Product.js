import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    alt: { type: String, default: '' },
  },
  { _id: false }
);

// Every product has at least one variant; stock lives on the variant.
const variantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 }, // e.g. "Midnight Navy"
  colorHex: { type: String, trim: true, default: '#111111' },
  colorFamily: { type: String, trim: true, lowercase: true, default: '' }, // filter bucket: navy, teal, tan, onyx…
  size: { type: String, trim: true, default: '' },
  sku: { type: String, required: true, trim: true, uppercase: true },
  stock: { type: Number, required: true, min: 0, default: 0 },
  images: [imageSchema],
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    tagline: { type: String, trim: true, default: '', maxlength: 80 }, // "24L Technical Pack"
    badge: { type: String, trim: true, default: '', maxlength: 30 }, // "Bestseller", "Cabin Approved"
    shortDescription: { type: String, trim: true, default: '', maxlength: 300 },
    description: { type: String, trim: true, default: '', maxlength: 5000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }],
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    gender: { type: String, enum: ['unisex', 'women', 'men'], default: 'unisex', index: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0, default: null },
    // The price a customer pays (sale price when valid). Stored for sorting and range filters.
    finalPrice: { type: Number, min: 0, index: true },
    images: { type: [imageSchema], default: [] },
    variants: {
      type: [variantSchema],
      validate: { validator: (v) => v.length > 0, message: 'Add at least one variant' },
    },
    materials: [{ type: String, trim: true }],
    features: [{ type: String, trim: true }],
    purposes: [{ type: String, trim: true, lowercase: true }],
    tags: [{ type: String, trim: true, lowercase: true }],
    capacity: { type: String, trim: true, default: '' },
    // Shopper-facing size group, derived from `capacity` on save (see sizeFromCapacity).
    sizeGroup: { type: String, enum: ['small', 'medium', 'large'], default: 'small', index: true },
    specifications: [{ _id: false, label: String, value: String }],
    faqs: [{ _id: false, question: String, answer: String }],
    brand: { type: String, trim: true, default: 'WILDTANE' },
    warranty: { type: String, trim: true, default: '1 Year Comprehensive Manufacturer Warranty' },
    careInstructions: { type: String, trim: true, default: 'Wipe clean with a damp microfiber cloth. Store in dust bag away from direct heat and damp environments.' },
    viewsCount: { type: Number, default: 0, min: 0 },
    // Optional shopping attributes (filters only appear once real products carry them).
    laptopSize: { type: Number, default: null, min: 10, max: 20 }, // largest laptop that fits, in inches
    compartments: { type: Number, default: null, min: 1 },
    closureType: { type: String, trim: true, default: '' },
    waterResistant: { type: Boolean, default: false },
    occasions: [{ type: String, trim: true, lowercase: true }], // party, wedding, office, casual…
    dimensions: { type: String, trim: true, default: '' }, // e.g. "40 × 30 × 15 cm"
    weight: { type: String, trim: true, default: '' }, // e.g. "1.2 kg"
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    // Sum of variant stock, kept in sync for fast "in stock" filtering and inventory views.
    stock: { type: Number, default: 0, min: 0, index: true },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isBestseller: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const hasSale = (p) => p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;

productSchema.virtual('discountPercent').get(function discountPercent() {
  return hasSale(this) ? Math.round(((this.price - this.salePrice) / this.price) * 100) : 0;
});

/** "24L" → medium. Under 12 L (or no capacity: wallets, pouches) is small, over 30 L is large. */
export function sizeFromCapacity(capacity) {
  const litres = Number(String(capacity || '').match(/(\d+(?:\.\d+)?)\s*l/i)?.[1]);
  if (!Number.isFinite(litres) || litres < 12) return 'small';
  return litres <= 30 ? 'medium' : 'large';
}

productSchema.pre('save', function syncDerived() {
  this.stock = (this.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
  this.finalPrice = hasSale(this) ? this.salePrice : this.price;
  this.sizeGroup = sizeFromCapacity(this.capacity);
});

productSchema.index({ name: 'text', description: 'text', tags: 'text', materials: 'text' });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ soldCount: -1 });
// Storefront lists: visible products, default "featured" sort.
productSchema.index({ isVisible: 1, isFeatured: -1, soldCount: -1, createdAt: -1 });
productSchema.index({ isVisible: 1, subcategory: 1, finalPrice: 1 });
productSchema.index({ isVisible: 1, gender: 1, category: 1, finalPrice: 1 });
productSchema.index({ isVisible: 1, category: 1, finalPrice: 1 });
productSchema.index({ isVisible: 1, gender: 1, soldCount: -1 });
productSchema.index({ isVisible: 1, gender: 1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
