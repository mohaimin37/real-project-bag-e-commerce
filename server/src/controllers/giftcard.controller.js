import GiftCard from '../models/GiftCard.js';
import GiftCardTransaction from '../models/GiftCardTransaction.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';
import { findUsableCard, issueGiftCard, adjustGiftCard } from '../services/giftcard.service.js';

/** Verify a gift card code (and PIN, if it has one) and return its available balance. */
export const verifyGiftCard = asyncHandler(async (req, res) => {
  const card = await findUsableCard(req.body.code || req.query.code, req.body.pin);
  res.json({
    success: true,
    giftCard: { code: card.code, balance: card.currentBalance, expiryDate: card.expiryDate },
    message: `Gift card verified. Available balance: ₹${card.currentBalance.toLocaleString('en-IN')}`,
  });
});

// ── Admin ────────────────────────────────────────────────────

export const adminListGiftCards = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.q) filter.code = new RegExp(escapeRegex(String(req.query.q).trim().toUpperCase().slice(0, 30)));
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  const [items, total] = await Promise.all([
    GiftCard.find(filter).select('-redeemedBy').sort({ createdAt: -1 }).skip(skip).limit(limit),
    GiftCard.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const adminGetGiftCard = asyncHandler(async (req, res) => {
  const card = await GiftCard.findById(req.params.id);
  if (!card) return res.status(404).json({ success: false, message: 'Gift card not found' });
  const ledger = await GiftCardTransaction.find({ card: card._id }).sort({ createdAt: -1 }).limit(200).populate('by', 'name').lean();
  res.json({ success: true, card, ledger });
});

export const adminIssueGiftCard = asyncHandler(async (req, res) => {
  const { card, pin } = await issueGiftCard(req.body, req.user._id);
  // The PIN is shown this one time; only its hash is stored.
  res.status(201).json({ success: true, card, pin });
});

export const adminAdjustGiftCard = asyncHandler(async (req, res) => {
  const card = await adjustGiftCard(req.params.id, req.body, req.user._id);
  res.json({ success: true, card });
});
