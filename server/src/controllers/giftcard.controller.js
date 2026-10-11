import GiftCard from '../models/GiftCard.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Verify a gift card code and return available balance. */
export const verifyGiftCard = asyncHandler(async (req, res) => {
  const code = (req.body.code || req.query.code || '').trim().toUpperCase();
  const pin = (req.body.pin || '').trim();

  if (!code) {
    throw ApiError.badRequest('Please enter a valid gift card code');
  }

  const card = await GiftCard.findOne({ code, isActive: true });
  if (!card) {
    throw ApiError.notFound('Invalid gift card code. Please check and try again.');
  }

  if (card.expiryDate && new Date(card.expiryDate) < new Date()) {
    throw ApiError.badRequest('This gift card has expired.');
  }

  if (card.currentBalance <= 0) {
    throw ApiError.badRequest('This gift card has a zero balance.');
  }

  if (card.pin && card.pin !== pin) {
    throw ApiError.badRequest('Incorrect gift card PIN.');
  }

  res.json({
    success: true,
    giftCard: {
      code: card.code,
      balance: card.currentBalance,
      expiryDate: card.expiryDate,
    },
    message: `Gift card verified! Available balance: ₹${card.currentBalance}`,
  });
});
