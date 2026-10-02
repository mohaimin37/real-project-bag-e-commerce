import mongoose from 'mongoose';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PUBLIC_PRODUCT_FIELDS } from '../services/product.service.js';

async function load(userId) {
  return Wishlist.findOneAndUpdate({ user: userId }, { $setOnInsert: { products: [] } }, { upsert: true, returnDocument: 'after' }).populate({
    path: 'products',
    select: PUBLIC_PRODUCT_FIELDS,
    match: { isVisible: true },
  });
}

const shape = (wl) => ({ products: wl.products.filter(Boolean), ids: wl.products.filter(Boolean).map((p) => p._id) });

export const getWishlist = asyncHandler(async (req, res) => {
  res.json({ success: true, wishlist: shape(await load(req.user._id)) });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId) || !(await Product.exists({ _id: productId, isVisible: true }))) {
    throw ApiError.notFound('Product not found');
  }
  await Wishlist.updateOne({ user: req.user._id }, { $addToSet: { products: productId } }, { upsert: true });
  res.status(201).json({ success: true, wishlist: shape(await load(req.user._id)) });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: req.params.productId } });
  res.json({ success: true, wishlist: shape(await load(req.user._id)) });
});

export const mergeWishlist = asyncHandler(async (req, res) => {
  const ids = (Array.isArray(req.body.productIds) ? req.body.productIds : []).filter((id) => mongoose.isValidObjectId(id)).slice(0, 100);
  if (ids.length) await Wishlist.updateOne({ user: req.user._id }, { $addToSet: { products: { $each: ids } } }, { upsert: true });
  res.json({ success: true, wishlist: shape(await load(req.user._id)) });
});
