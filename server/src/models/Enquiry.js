import mongoose from 'mongoose';

const corporateEnquirySchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true, maxlength: 160 },
    contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    country: { type: String, required: true, trim: true, maxlength: 2, uppercase: true },
    address: { type: String, trim: true, default: '', maxlength: 400 },
    productType: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 1 },
    customization: { type: String, trim: true, default: '', maxlength: 1000 },
    logo: { url: String, publicId: String, originalName: String },
    message: { type: String, trim: true, default: '', maxlength: 2000 },
    status: { type: String, enum: ['new', 'contacted', 'quoted', 'won', 'closed'], default: 'new', index: true },
    adminNotes: { type: String, default: '', maxlength: 2000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const contactEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '', maxlength: 30 },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    orderId: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new', index: true },
    adminNotes: { type: String, default: '', maxlength: 2000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'footer' },
  },
  { timestamps: true }
);

export const CorporateEnquiry = mongoose.model('CorporateEnquiry', corporateEnquirySchema);
export const ContactEnquiry = mongoose.model('ContactEnquiry', contactEnquirySchema);
export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
