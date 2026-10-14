import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uniqueSlug } from '../services/product.service.js';
import { slugify } from '../utils/helpers.js';

/**
 * Visible products per category, counting each product once per category even when it is
 * assigned several ways (category, subcategory, product type, extra categories), and rolling
 * up into every ancestor — the same rule the shop listing uses, so counts match the grid.
 */
async function productCounts(cats) {
  const rows = await Product.aggregate([
    { $match: { isVisible: true } },
    {
      $project: {
        cats: {
          $setUnion: [
            { $filter: { input: ['$category', '$subcategory', '$productType'], cond: { $ne: ['$$this', null] } } },
            { $ifNull: ['$categories', []] },
          ],
        },
      },
    },
  ]);
  const parentOf = new Map(cats.map((c) => [String(c._id), c.parent ? String(c.parent) : null]));
  const counts = new Map();
  for (const row of rows) {
    const seen = new Set();
    for (const id of row.cats) {
      let cur = String(id);
      // Walk up to the root, guarding against cycles.
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        cur = parentOf.get(cur) || null;
      }
    }
    seen.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  }
  return counts;
}

/**
 * Distinct product counts for sets of categories (each set = slugs joined by ","; sets joined by ";").
 * A product counts once per set even if it sits in several of the set's categories or their children,
 * so a menu tile combining categories shows exactly what its listing will show.
 */
export const setCounts = asyncHandler(async (req, res) => {
  const sets = String(req.query.sets || '')
    .split(';')
    .slice(0, 120)
    .map((s) => s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 20));
  const cats = await Category.find({ isActive: true }).select('slug parent').lean();
  const idBySlug = new Map(cats.map((c) => [c.slug, String(c._id)]));
  const parentOf = new Map(cats.map((c) => [String(c._id), c.parent ? String(c.parent) : null]));
  const rows = await Product.aggregate([
    { $match: { isVisible: true } },
    { $project: { cats: { $setUnion: [{ $filter: { input: ['$category', '$subcategory', '$productType'], cond: { $ne: ['$$this', null] } } }, { $ifNull: ['$categories', []] }] } } },
  ]);
  // Each product's categories plus all their ancestors.
  const closures = rows.map((row) => {
    const seen = new Set();
    for (const id of row.cats) for (let cur = String(id); cur && !seen.has(cur); cur = parentOf.get(cur) || null) seen.add(cur);
    return seen;
  });
  const counts = sets.map((slugs) => {
    const ids = slugs.map((s) => idBySlug.get(s)).filter(Boolean);
    if (!ids.length) return 0;
    return closures.reduce((n, closure) => n + (ids.some((id) => closure.has(id)) ? 1 : 0), 0);
  });
  res.set('Cache-Control', 'public, max-age=120');
  res.json({ success: true, counts });
});

/** Nested tree: top-level categories with their subcategories (and 3rd-level product types) and product counts. */
export const getCategoryTree = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' && req.user?.role === 'admin' ? {} : { isActive: true };
  if (req.query.department) {
    filter.$or = [{ department: req.query.department }, { department: 'all' }];
  }

  const cats = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await productCounts(cats);

  const withCount = cats.map((c) => ({
    ...c,
    productCount: counts.get(c._id.toString()) || 0,
  }));

  // Build recursive children
  const buildSubtree = (parentId) =>
    withCount
      .filter((c) => c.parent && String(c.parent) === String(parentId))
      .map((child) => ({
        ...child,
        children: buildSubtree(child._id),
      }));

  const tree = withCount
    .filter((c) => !c.parent)
    .map((parent) => ({
      ...parent,
      children: buildSubtree(parent._id),
    }));

  // Group by department for easy mega-menu rendering
  const departments = {
    men: tree.filter((c) => c.department === 'men'),
    women: tree.filter((c) => c.department === 'women'),
    universal: tree.filter((c) => c.department === 'universal' || c.department === 'all' || !c.department),
  };

  res.json({ success: true, categories: tree, departments });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true })
    .populate('parent', 'name slug department level')
    .lean();
  if (!category) throw ApiError.notFound('Category not found');

  const children = await Category.find({ parent: category._id, isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  // Find ancestors for breadcrumbs (e.g. Home > Men > Bags > Laptop Bags)
  const breadcrumbs = [];
  let curr = category.parent;
  while (curr) {
    breadcrumbs.unshift({ name: curr.name, slug: curr.slug, _id: curr._id });
    if (curr.parent) {
      curr = await Category.findById(curr.parent).select('name slug parent department level').lean();
    } else {
      curr = null;
    }
  }

  res.json({ success: true, category: { ...category, children, breadcrumbs } });
});

/** A slug the admin typed must be free: changing a URL onto another category's address is refused, not renamed. */
async function assertSlugFree(raw, exceptId) {
  if (!raw) return;
  const slug = slugify(raw);
  if (await Category.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) {
    throw ApiError.conflict(`The address /${slug} is already used by another category`, [{ field: 'slug', message: 'Already in use' }]);
  }
}

export const createCategory = asyncHandler(async (req, res) => {
  let level = 1;
  if (req.body.parent) {
    const parent = await Category.findById(req.body.parent);
    if (!parent) throw ApiError.badRequest('Parent category not found');
    level = (parent.level || 1) + 1;
    if (level > 3) throw ApiError.badRequest('Categories can be at most 3 levels deep');
  }
  await assertSlugFree(req.body.slug);
  const slug = await uniqueSlug(Category, req.body.slug || req.body.name);
  const category = await Category.create({ ...req.body, slug, level, parent: req.body.parent || null });
  res.status(201).json({ success: true, category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  let level = 1;
  if (req.body.parent) {
    if (String(req.body.parent) === String(category._id)) throw ApiError.badRequest('A category cannot be its own parent');
    const parent = await Category.findById(req.body.parent);
    if (!parent) throw ApiError.badRequest('Parent category not found');
    // The new parent must not sit underneath this category (that would make a loop).
    for (let cur = parent; cur?.parent; cur = await Category.findById(cur.parent).select('parent')) {
      if (String(cur.parent) === String(category._id)) throw ApiError.badRequest('A category cannot be moved under its own subcategory');
    }
    level = (parent.level || 1) + 1;
    if (level > 3) throw ApiError.badRequest('Categories can be at most 3 levels deep');
    const hasGrandChildren = await Category.exists({ parent: { $in: await Category.find({ parent: category._id }).distinct('_id') } });
    if (hasGrandChildren || (level === 3 && (await Category.exists({ parent: category._id })))) {
      throw ApiError.badRequest('Moving this category here would make the tree deeper than 3 levels');
    }
  }
  if (req.body.slug && req.body.slug !== category.slug) await assertSlugFree(req.body.slug, category._id);
  const slug = req.body.slug && req.body.slug !== category.slug ? await uniqueSlug(Category, req.body.slug, category._id) : category.slug;
  category.set({ ...req.body, slug, level, parent: req.body.parent || null });
  await category.save();
  res.json({ success: true, category });
});

/**
 * Moves every product out of one category into another (same product records, nothing copied),
 * so the old category can then be switched off or deleted.
 */
export const reassignProducts = asyncHandler(async (req, res) => {
  const [from, to] = await Promise.all([Category.findById(req.params.id), Category.findById(req.body?.to)]);
  if (!from) throw ApiError.notFound('Category not found');
  if (!to) throw ApiError.badRequest('Choose the category to move the products to', [{ field: 'to', message: 'Not found' }]);
  if (String(from._id) === String(to._id)) throw ApiError.badRequest('Choose a different category');

  const products = await Product.find({ $or: [{ category: from._id }, { subcategory: from._id }, { productType: from._id }, { categories: from._id }] }).select('category subcategory productType categories');
  const subParents = new Map((await Category.find({ _id: { $in: products.map((p) => p.subcategory).filter(Boolean) } }).select('parent')).map((c) => [String(c._id), String(c.parent)]));
  let moved = 0;
  for (const p of products) {
    const extra = new Set((p.categories || []).map(String).filter((id) => id !== String(from._id)));
    const set = {};
    if (String(p.category) === String(from._id)) {
      set.category = to._id;
      if (p.subcategory && subParents.get(String(p.subcategory)) !== String(to._id)) {
        extra.add(String(p.subcategory)); // keep the old subcategory link as an extra listing
        set.subcategory = null;
      }
    }
    if (p.subcategory && String(p.subcategory) === String(from._id)) {
      if (String(to.parent) === String(set.category || p.category)) set.subcategory = to._id;
      else {
        set.subcategory = null;
        extra.add(String(to._id));
      }
    }
    if (p.productType && String(p.productType) === String(from._id)) {
      set.productType = null;
      extra.add(String(to._id));
    }
    if ((p.categories || []).some((id) => String(id) === String(from._id))) extra.add(String(to._id));
    set.categories = [...extra].filter((id) => id !== String(set.category || p.category));
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ _id: p._id }, { $set: set });
    moved += 1;
  }
  res.json({ success: true, moved });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const [children, products] = await Promise.all([
    Category.countDocuments({ parent: category._id }),
    Product.countDocuments({ $or: [{ category: category._id }, { subcategory: category._id }, { productType: category._id }, { categories: category._id }] }),
  ]);
  if (children) throw ApiError.conflict(`Remove or move its ${children} subcategories first`);
  if (products) throw ApiError.conflict(`${products} products still use this category. Reassign them first.`);
  await category.deleteOne();
  res.json({ success: true });
});
