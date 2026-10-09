import mongoose from 'mongoose';
import Comment, { COMMENT_STATUSES } from '../models/Comment.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination, round2 } from '../utils/helpers.js';

const publicShape = (c) => ({ _id: c._id, name: c.name, city: c.city, rating: c.rating, message: c.message, sourceNote: c.sourceNote, createdAt: c.createdAt });

/** Approved comments for the homepage carousel, with the average of every approved rating. */
export const listComments = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const [items, [stats]] = await Promise.all([
    Comment.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(limit).lean(),
    Comment.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, comments: items.map(publicShape), average: stats ? round2(stats.avg) : 0, count: stats?.count || 0 });
});

export const submitComment = asyncHandler(async (req, res) => {
  const { name, city, rating, message } = req.body;
  await Comment.create({ name, city, rating, message, user: req.user?._id || null });
  res.status(201).json({ success: true, message: 'Thank you! Your comment will appear once our team has approved it.' });
});

// ── Admin ────────────────────────────────────────────────────

export const adminListComments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (COMMENT_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q) filter.message = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
  const [items, total, counts] = await Promise.all([
    Comment.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Comment.countDocuments(filter),
    Comment.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
});

/** Real feedback the admin received elsewhere; approved straight away. */
export const adminCreateComment = asyncHandler(async (req, res) => {
  const { name, city, rating, message, sourceNote } = req.body;
  const comment = await Comment.create({ name, city, rating, message, sourceNote, source: 'admin', status: 'approved' });
  res.status(201).json({ success: true, comment });
});

export const adminSetCommentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!COMMENT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Comment not found');
  const comment = await Comment.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!comment) throw ApiError.notFound('Comment not found');
  res.json({ success: true, comment });
});

export const adminDeleteComment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Comment not found');
  const comment = await Comment.findByIdAndDelete(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found');
  res.json({ success: true });
});
