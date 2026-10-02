import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uniqueSlug } from '../services/product.service.js';

async function productCounts() {
  const rows = await Product.aggregate([
    { $match: { isVisible: true } },
    { $project: { cats: ['$category', '$subcategory'] } },
    { $unwind: '$cats' },
    { $match: { cats: { $ne: null } } },
    { $group: { _id: '$cats', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count]));
}

/** Nested tree: top-level categories with their subcategories and product counts. */
export const getCategoryTree = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' && req.user?.role === 'admin' ? {} : { isActive: true };
  const [cats, counts] = await Promise.all([Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean(), productCounts()]);
  const withCount = cats.map((c) => ({ ...c, productCount: counts.get(c._id.toString()) || 0 }));
  const tree = withCount
    .filter((c) => !c.parent)
    .map((parent) => ({
      ...parent,
      children: withCount.filter((c) => c.parent && c.parent.toString() === parent._id.toString()),
    }));
  res.json({ success: true, categories: tree });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true }).populate('parent', 'name slug').lean();
  if (!category) throw ApiError.notFound('Category not found');
  const children = await Category.find({ parent: category._id, isActive: true }).sort({ sortOrder: 1 }).lean();
  res.json({ success: true, category: { ...category, children } });
});

export const createCategory = asyncHandler(async (req, res) => {
  if (req.body.parent) {
    const parent = await Category.findById(req.body.parent);
    if (!parent) throw ApiError.badRequest('Parent category not found');
    if (parent.parent) throw ApiError.badRequest('Subcategories can only be one level deep');
  }
  const slug = await uniqueSlug(Category, req.body.slug || req.body.name);
  const category = await Category.create({ ...req.body, slug, parent: req.body.parent || null });
  res.status(201).json({ success: true, category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  if (req.body.parent) {
    if (String(req.body.parent) === String(category._id)) throw ApiError.badRequest('A category cannot be its own parent');
    const hasChildren = await Category.exists({ parent: category._id });
    if (hasChildren) throw ApiError.badRequest('This category has subcategories, so it must stay top-level');
    const parent = await Category.findById(req.body.parent);
    if (!parent || parent.parent) throw ApiError.badRequest('Choose a top-level parent category');
  }
  const slug = req.body.slug && req.body.slug !== category.slug ? await uniqueSlug(Category, req.body.slug, category._id) : category.slug;
  category.set({ ...req.body, slug, parent: req.body.parent || null });
  await category.save();
  res.json({ success: true, category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const [children, products] = await Promise.all([
    Category.countDocuments({ parent: category._id }),
    Product.countDocuments({ $or: [{ category: category._id }, { subcategory: category._id }] }),
  ]);
  if (children) throw ApiError.conflict(`Remove or move its ${children} subcategories first`);
  if (products) throw ApiError.conflict(`${products} products still use this category. Reassign them first.`);
  await category.deleteOne();
  res.json({ success: true });
});
