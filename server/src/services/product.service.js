import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { escapeRegex, toList, slugify } from '../utils/helpers.js';

// Fields needed for product cards (excludes long text blocks).
export const PUBLIC_PRODUCT_FIELDS =
  'name slug sku tagline badge shortDescription category subcategory gender price salePrice finalPrice images variants materials features purposes capacity stock isFeatured isBestseller isNewArrival ratingAverage ratingCount soldCount createdAt';

export const SORTS = {
  featured: { isFeatured: -1, soldCount: -1, createdAt: -1 },
  bestseller: { soldCount: -1, ratingAverage: -1 },
  'price-low': { finalPrice: 1 },
  'price-high': { finalPrice: -1 },
  'highest-rated': { ratingAverage: -1, ratingCount: -1 },
  newest: { createdAt: -1 },
  name: { name: 1 },
  'stock-low': { stock: 1 },
};

async function resolveCategoryIds(slugOrId) {
  const values = toList(slugOrId);
  if (!values.length) return [];
  const ids = values.filter((v) => mongoose.isValidObjectId(v));
  const slugs = values.filter((v) => !mongoose.isValidObjectId(v));
  const cats = await Category.find({ $or: [{ _id: { $in: ids } }, { slug: { $in: slugs } }] }).select('_id');
  return cats.map((c) => c._id);
}

/** Builds a Mongo filter from catalog query params. */
export async function buildProductFilter(query, { admin = false } = {}) {
  const filter = {};
  const and = [];

  if (!admin) filter.isVisible = true;
  else if (query.visibility === 'hidden') filter.isVisible = false;
  else if (query.visibility === 'visible') filter.isVisible = true;

  if (query.q) {
    const rx = new RegExp(escapeRegex(String(query.q).slice(0, 80)), 'i');
    and.push({ $or: [{ name: rx }, { sku: rx }, { 'variants.sku': rx }, { tags: rx }, { materials: rx }, { tagline: rx }] });
  }

  if (query.category) {
    const ids = await resolveCategoryIds(query.category);
    and.push({ $or: [{ category: { $in: ids } }, { subcategory: { $in: ids } }] });
  }
  if (query.subcategory) {
    filter.subcategory = { $in: await resolveCategoryIds(query.subcategory) };
  }

  const genders = toList(query.gender);
  if (genders.length) filter.gender = { $in: genders.includes('women') ? [...genders, 'unisex'] : genders };

  const purposes = toList(query.purpose).map((p) => p.toLowerCase());
  if (purposes.length) filter.purposes = { $in: purposes };

  const materials = toList(query.materials);
  if (materials.length) filter.materials = { $in: materials };

  const features = toList(query.features);
  if (features.length) filter.features = { $all: features };

  const sizes = toList(query.size).filter((s) => ['small', 'medium', 'large'].includes(s));
  if (sizes.length) filter.sizeGroup = { $in: sizes };

  const colors = toList(query.colors).map((c) => c.toLowerCase());
  if (colors.length) filter['variants.colorFamily'] = { $in: colors };

  const min = Number(query.minPrice);
  const max = Number(query.maxPrice);
  if (Number.isFinite(min) && query.minPrice !== undefined && query.minPrice !== '') filter.finalPrice = { ...filter.finalPrice, $gte: min };
  if (Number.isFinite(max) && query.maxPrice !== undefined && query.maxPrice !== '') filter.finalPrice = { ...filter.finalPrice, $lte: max };

  const rating = Number(query.rating);
  if (Number.isFinite(rating) && rating > 0) filter.ratingAverage = { $gte: rating };

  if (query.inStock === 'true') filter.stock = { $gt: 0 };
  if (query.onSale === 'true') and.push({ $expr: { $lt: ['$finalPrice', '$price'] } });
  if (query.featured === 'true') filter.isFeatured = true;
  if (query.bestseller === 'true') filter.isBestseller = true;
  if (query.newArrival === 'true') filter.isNewArrival = true;

  if (admin && query.stockStatus === 'out') filter.stock = 0;
  if (admin && query.stockStatus === 'low') and.push({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] } });

  if (and.length) filter.$and = and;
  return filter;
}

/** Aggregated filter options and counts for the shop sidebar. */
export async function getFacets(baseFilter) {
  const [result] = await Product.aggregate([
    { $match: baseFilter },
    {
      $facet: {
        materials: [{ $unwind: '$materials' }, { $group: { _id: '$materials', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        features: [{ $unwind: '$features' }, { $group: { _id: '$features', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        purposes: [{ $unwind: '$purposes' }, { $group: { _id: '$purposes', count: { $sum: 1 } } }],
        colors: [
          { $unwind: '$variants' },
          { $match: { 'variants.colorFamily': { $ne: '' } } },
          { $group: { _id: { p: '$_id', c: '$variants.colorFamily' }, hex: { $first: '$variants.colorHex' } } },
          { $group: { _id: '$_id.c', hex: { $first: '$hex' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        price: [{ $group: { _id: null, min: { $min: '$finalPrice' }, max: { $max: '$finalPrice' } } }],
        sizes: [{ $group: { _id: '$sizeGroup', count: { $sum: 1 } } }],
        genders: [{ $group: { _id: '$gender', count: { $sum: 1 } } }],
        onSale: [{ $match: { $expr: { $lt: ['$finalPrice', '$price'] } } }, { $count: 'n' }],
        priceBands: [
          {
            $bucket: {
              groupBy: '$finalPrice',
              boundaries: [0, 5000, 10000, 20000, Number.MAX_SAFE_INTEGER],
              output: { count: { $sum: 1 } },
            },
          },
        ],
      },
    },
  ]);
  return {
    materials: result.materials.map((m) => ({ value: m._id, count: m.count })),
    features: result.features.map((f) => ({ value: f._id, count: f.count })),
    purposes: Object.fromEntries(result.purposes.map((p) => [p._id, p.count])),
    colors: result.colors.map((c) => ({ value: c._id, hex: c.hex, count: c.count })),
    price: result.price[0] ? { min: result.price[0].min, max: result.price[0].max } : { min: 0, max: 0 },
    sizes: Object.fromEntries(result.sizes.map((s) => [s._id || 'small', s.count])),
    genders: Object.fromEntries(result.genders.map((g) => [g._id || 'unisex', g.count])),
    onSale: result.onSale[0]?.n || 0,
    // Keyed by the band's lower bound: 0, 5000, 10000, 20000.
    priceBands: Object.fromEntries(result.priceBands.map((b) => [b._id, b.count])),
  };
}

export async function uniqueSlug(Model, base, excludeId) {
  const root = slugify(base) || 'item';
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    n += 1;
    slug = `${root}-${n}`;
  }
  return slug;
}

export function findVariant(product, variantId) {
  return product.variants.find((v) => v._id.toString() === String(variantId));
}

export function variantImage(product, variant) {
  return variant?.images?.[0]?.url || product.images?.[0]?.url || '';
}
