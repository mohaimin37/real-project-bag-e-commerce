import { CorporateEnquiry, ContactEnquiry, Subscriber } from '../models/Enquiry.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';
import { uploadFile } from '../services/upload.service.js';

const STATUSES = {
  corporate: ['new', 'contacted', 'quoted', 'won', 'closed'],
  contact: ['new', 'read', 'replied', 'closed'],
};

export const submitContact = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.create({ ...req.body, user: req.user?._id || null });
  res.status(201).json({ success: true, id: enquiry._id, message: 'Thanks — our care team will reply within one business day.' });
});

export const submitCorporate = asyncHandler(async (req, res) => {
  let logo;
  if (req.file) logo = { ...(await uploadFile(req.file, 'corporate-logos')), originalName: req.file.originalname };
  const enquiry = await CorporateEnquiry.create({ ...req.body, logo, user: req.user?._id || null });
  res.status(201).json({ success: true, id: enquiry._id, message: 'Enquiry received. A corporate specialist will send a quote within 48 hours.' });
});

export const subscribe = asyncHandler(async (req, res) => {
  await Subscriber.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email } }, { upsert: true });
  res.status(201).json({ success: true, message: 'You are on the list. Welcome to WILDTANE.' });
});

// ── Admin ────────────────────────────────────────────────────

const modelFor = (kind) => (kind === 'corporate' ? CorporateEnquiry : ContactEnquiry);

export const adminList = (kind) =>
  asyncHandler(async (req, res) => {
    const Model = modelFor(kind);
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
      filter.$or = kind === 'corporate' ? [{ company: rx }, { contactPerson: rx }, { email: rx }] : [{ name: rx }, { email: rx }, { subject: rx }];
    }
    const [items, total, counts] = await Promise.all([
      Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(filter),
      Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, ...paginated(items, total, page, limit), statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
  });

export const adminUpdate = (kind) =>
  asyncHandler(async (req, res) => {
    if (req.body.status && !STATUSES[kind].includes(req.body.status)) throw ApiError.badRequest('Invalid status');
    const item = await modelFor(kind).findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    if (!item) throw ApiError.notFound('Enquiry not found');
    res.json({ success: true, item });
  });

export const adminDelete = (kind) =>
  asyncHandler(async (req, res) => {
    const item = await modelFor(kind).findByIdAndDelete(req.params.id);
    if (!item) throw ApiError.notFound('Enquiry not found');
    res.json({ success: true });
  });

export const adminSubscribers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [items, total] = await Promise.all([
    Subscriber.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Subscriber.countDocuments(),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});
