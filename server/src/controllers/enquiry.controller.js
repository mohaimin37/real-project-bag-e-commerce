import { CorporateEnquiry, ContactEnquiry, Subscriber } from '../models/Enquiry.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';
import { uploadFile } from '../services/upload.service.js';
import { sendEmail } from '../services/email.service.js';

const STATUSES = {
  corporate: ['new', 'contacted', 'quoted', 'won', 'closed'],
  contact: ['new', 'read', 'replied', 'closed'],
};

export const submitContact = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.create({ ...req.body, user: req.user?._id || null });

  // 1. Alert store admin mailbox info@wildtane.com
  sendEmail({
    to: 'info@wildtane.com',
    subject: `New Customer Message: ${req.body.subject || 'Store Enquiry'} - from ${req.body.name}`,
    text: [
      `You have received a new customer message on WILDTANE:`,
      ``,
      `From: ${req.body.name}`,
      `Email: ${req.body.email}`,
      `Phone: ${req.body.phone || 'Not provided'}`,
      `Subject: ${req.body.subject || 'General Enquiry'}`,
      ``,
      `Message:`,
      req.body.message,
      ``,
      `---`,
      `You can reply directly to the customer at ${req.body.email}.`,
    ].join('\n'),
  }).catch((err) => console.error('[email:contact] Failed to alert admin:', err.message));

  // 2. Acknowledge customer
  if (req.body.email) {
    sendEmail({
      to: req.body.email,
      subject: `We've received your message — WILDTANE Support`,
      text: [
        `Hello ${req.body.name || 'Valued Customer'},`,
        ``,
        `Thank you for reaching out to WILDTANE Support. We have received your message regarding "${req.body.subject || 'your enquiry'}".`,
        ``,
        `Our care team will review your message and reply back to you as soon as possible (usually within 24 hours).`,
        ``,
        `If you need urgent assistance, you can reach us directly:`,
        `• Email: info@wildtane.com`,
        `• Phone: 8920550465`,
        ``,
        `Warm regards,`,
        `The WILDTANE Team`,
        `www.wildtane.com`,
      ].join('\n'),
    }).catch((err) => console.error('[email:contact-ack] Failed to send customer ack:', err.message));
  }

  res.status(201).json({ success: true, id: enquiry._id, message: 'Thanks — our care team will reply within one business day.' });
});

export const submitCorporate = asyncHandler(async (req, res) => {
  let logo;
  if (req.file) logo = { ...(await uploadFile(req.file, 'corporate-logos')), originalName: req.file.originalname };
  const enquiry = await CorporateEnquiry.create({ ...req.body, logo, user: req.user?._id || null });

  sendEmail({
    to: 'info@wildtane.com',
    subject: `New Corporate Enquiry: ${req.body.company} (Contact: ${req.body.contactPerson})`,
    text: [
      `New B2B Corporate Gifting / Bulk Order enquiry received:`,
      ``,
      `Company: ${req.body.company}`,
      `Contact Person: ${req.body.contactPerson}`,
      `Email: ${req.body.email}`,
      `Phone: ${req.body.phone}`,
      `Expected Quantity: ${req.body.quantity || 'N/A'} units`,
      `Budget per Unit: ${req.body.budgetPerUnit || 'N/A'}`,
      `Required By: ${req.body.timeline || 'Flexible'}`,
      ``,
      `Message:`,
      req.body.message || 'No additional note',
    ].join('\n'),
  }).catch((err) => console.error('[email:corporate] Failed to alert admin:', err.message));

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

export const adminReplyEmail = (kind) =>
  asyncHandler(async (req, res) => {
    const Model = modelFor(kind);
    const item = await Model.findById(req.params.id);
    if (!item) throw ApiError.notFound('Enquiry not found');
    const to = (req.body.to || item.email || '').trim();
    if (!to) throw ApiError.badRequest('Recipient email is required');
    const subject = String(req.body.subject || `Re: ${item.subject || (kind === 'corporate' ? `Corporate quote for ${item.company}` : 'Your inquiry')}`).trim();
    const replyText = String(req.body.message || req.body.text || '').trim();
    if (!replyText) throw ApiError.badRequest('Reply message is required');

    const outcome = await sendEmail({
      to,
      subject,
      text: [
        `Hi ${item.contactPerson || item.name || 'there'},`,
        '',
        replyText,
        '',
        '---',
        'Original Message:',
        item.message || '',
        '',
        'Warm regards,',
        'WILDTANE Support Team',
        'info@wildtane.com · 8920550465',
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="margin:0 0 16px;color:#111827;">WILDTANE Support</h2>
          <p style="font-size:15px;color:#374151;">Hi ${item.contactPerson || item.name || 'there'},</p>
          <div style="font-size:15px;color:#1f2937;line-height:1.6;white-space:pre-line;margin:16px 0;">
            ${replyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
          <div style="background:#f9fafb;border-left:3px solid #d1d5db;padding:12px 14px;border-radius:4px;margin:16px 0;font-size:13px;color:#6b7280;">
            <b>Original message:</b><br />
            ${(item.message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="font-size:12px;color:#9ca3af;margin:0;">WILDTANE Customer Care · info@wildtane.com · +91 8920550465</p>
        </div>
      `,
    });

    item.status = kind === 'corporate' ? 'contacted' : 'replied';
    await item.save();

    res.json({ success: true, message: `Reply emailed to ${to}`, item, details: outcome });
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
