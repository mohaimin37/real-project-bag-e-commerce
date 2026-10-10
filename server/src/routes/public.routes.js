import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import sanitize from '../middleware/sanitize.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { adminAuthLimiter, authLimiter, formLimiter, trackLimiter } from '../middleware/rateLimit.js';
import * as analytics from '../controllers/analytics.controller.js';
import { imageUpload, logoUpload } from '../middleware/upload.js';

import * as auth from '../controllers/auth.controller.js';
import * as users from '../controllers/user.controller.js';
import * as products from '../controllers/product.controller.js';
import * as categories from '../controllers/category.controller.js';
import * as cart from '../controllers/cart.controller.js';
import * as wishlist from '../controllers/wishlist.controller.js';
import * as orders from '../controllers/order.controller.js';
import * as reviews from '../controllers/review.controller.js';
import * as coupons from '../controllers/coupon.controller.js';
import * as content from '../controllers/content.controller.js';
import * as enquiries from '../controllers/enquiry.controller.js';
import * as comments from '../controllers/comment.controller.js';
import * as returns from '../controllers/return.controller.js';

import * as av from '../validators/auth.validators.js';
import * as cv from '../validators/commerce.validators.js';
import { reviewSchema } from '../validators/catalog.validators.js';
import { commentSchema, contactSchema, corporateSchema, subscribeSchema } from '../validators/content.validators.js';

// ── /api/auth ────────────────────────────────────────────────
export const authRoutes = Router()
  .post('/register', authLimiter, validate(av.registerSchema), auth.register)
  .post('/login', authLimiter, validate(av.loginSchema), auth.login)
  .post('/admin/login', adminAuthLimiter, validate(av.loginSchema), auth.adminLogin)
  .post('/logout', auth.logout)
  .post('/logout-all', protect, auth.logoutAll)
  .get('/me', optionalAuth, auth.me)
  .post('/forgot-password', authLimiter, validate(av.forgotSchema), auth.forgotPassword)
  .post('/verify-otp', authLimiter, validate(av.verifyOtpSchema), auth.verifyResetOtp)
  .post('/login-otp', authLimiter, validate(av.verifyOtpSchema), auth.loginWithOtp)
  .post('/reset-password-otp', authLimiter, validate(av.resetPasswordOtpSchema), auth.resetPasswordWithOtp)
  .post('/reset-password', authLimiter, validate(av.resetSchema), auth.resetPassword);

// ── /api/users ───────────────────────────────────────────────
export const userRoutes = Router()
  .use(protect)
  .patch('/me', validate(av.profileSchema), users.updateProfile)
  .post('/me/avatar', imageUpload.single('avatar'), users.uploadAvatar)
  .patch('/me/password', validate(av.changePasswordSchema), users.changePassword)
  .get('/me/addresses', users.listAddresses)
  .post('/me/addresses', validate(av.addressSchema), users.addAddress)
  .put('/me/addresses/:id', validate(av.addressSchema), users.updateAddress)
  .delete('/me/addresses/:id', users.deleteAddress)
  .patch('/me/addresses/:id/default', users.setDefaultAddress)
  .get('/me/overview', users.overview)
  .get('/me/coins', users.myCoins)
  .get('/me/recently-viewed', users.getRecentlyViewed)
  .post('/me/recently-viewed/:productId', users.trackRecentlyViewed)
  .get('/me/reviews', reviews.myReviews);

// ── /api/products ────────────────────────────────────────────
export const productRoutes = Router()
  .get('/', products.listProducts)
  .get('/facets', products.productFacets)
  .get('/suggest', products.suggest)
  .get('/collections', products.getCollections)
  .get('/by-ids', products.getProductsByIds)
  .get('/:slug', products.getProduct);

// ── /api/categories ──────────────────────────────────────────
export const categoryRoutes = Router()
  .get('/', optionalAuth, categories.getCategoryTree)
  .get('/:slug', categories.getCategory);

// ── /api/cart ────────────────────────────────────────────────
export const cartRoutes = Router()
  .post('/quote', validate(cv.cartMergeSchema.extend({ shippingMethod: cv.shippingMethodSchema.shape.code.optional() })), cart.quoteGuestCart)
  .use(protect)
  .get('/', cart.getCart)
  .delete('/', cart.clearCart)
  .post('/items', validate(cv.cartItemSchema), cart.addItem)
  .patch('/items/:itemId', validate(cv.cartQtySchema), cart.updateItem)
  .patch('/items/:itemId/variant', cart.changeItemVariant)
  .delete('/items/:itemId', cart.removeItem)
  .post('/merge', validate(cv.cartMergeSchema), cart.mergeCart)
  .post('/coupon', validate(cv.couponApplySchema), cart.applyCoupon)
  .delete('/coupon', cart.removeCoupon)
  .put('/shipping', validate(cv.shippingMethodSchema), cart.setShippingMethod)
  .put('/coins', validate(cv.useCoinsSchema), cart.setUseCoins)
  .get('/payment-methods', cart.paymentMethods);

// ── /api/wishlist ────────────────────────────────────────────
export const wishlistRoutes = Router()
  .use(protect)
  .get('/', wishlist.getWishlist)
  .post('/merge', wishlist.mergeWishlist)
  .post('/:productId', wishlist.addToWishlist)
  .delete('/:productId', wishlist.removeFromWishlist);

// ── /api/orders ──────────────────────────────────────────────
export const orderRoutes = Router()
  .get('/:id/invoice.pdf', optionalAuth, orders.downloadInvoicePdf)
  .post('/razorpay/webhook', orders.razorpayWebhook)
  .use(protect)
  .post('/initiate-payment', orders.initiatePayment)
  .post('/', validate(cv.checkoutSchema), orders.createOrder)
  .get('/', orders.myOrders)
  .get('/:id', orders.myOrder)
  .post('/:id/verify-payment', orders.verifyPayment)
  .post('/:id/retry-payment', orders.retryPayment)
  .post('/:id/cancel', orders.cancelMyOrder);

// ── /api/reviews ─────────────────────────────────────────────
export const reviewRoutes = Router()
  .get('/featured', reviews.featuredReviews)
  .get('/product/:productId', reviews.productReviews)
  .get('/product/:productId/eligibility', protect, reviews.reviewEligibility)
  .post('/product/:productId', protect, validate(reviewSchema), reviews.createReview)
  .patch('/:id', protect, validate(reviewSchema), reviews.updateMyReview)
  .delete('/:id', protect, reviews.deleteMyReview)
  .post('/:id/helpful', formLimiter, reviews.markHelpful);

// ── /api/coupons ─────────────────────────────────────────────
export const couponRoutes = Router().get('/', coupons.publicCoupons);

// ── /api/blogs ───────────────────────────────────────────────
export const blogRoutes = Router().get('/', content.listPosts).get('/:slug', content.getPost);
export const updateRoutes = Router().get('/', content.listUpdates);

// ── /api/track (anonymous page views for admin reports) ──────
export const trackRoutes = Router().post('/', trackLimiter, optionalAuth, analytics.track);

// ── /api/contact, /api/corporate, /api/newsletter ────────────
export const contactRoutes = Router().post('/', formLimiter, optionalAuth, validate(contactSchema), enquiries.submitContact);

export const corporateRoutes = Router().post(
  '/',
  formLimiter,
  optionalAuth,
  logoUpload.single('logo'),
  sanitize, // multipart bodies are parsed by multer, after the global sanitizer ran
  validate(corporateSchema),
  enquiries.submitCorporate
);

// ── /api/comments (homepage customer comments; shown only once an admin approves them) ──
export const commentRoutes = Router()
  .get('/', comments.listComments)
  .post('/', formLimiter, optionalAuth, validate(commentSchema), comments.submitComment);

export const newsletterRoutes = Router().post('/', formLimiter, validate(subscribeSchema), enquiries.subscribe);

// ── /api/config, /api/banners ────────────────────────────────
export const configRoutes = Router().get('/', content.publicConfig);
export const bannerRoutes = Router().get('/', content.activeBanners);

// ── /api/returns (Return & Exchange Portal) ───────────────────
export const returnRoutes = Router()
  .get('/policy', returns.getPolicyInfo)
  .get('/orders', protect, returns.getMyReturnOrders)
  .get('/order/:id', formLimiter, optionalAuth, returns.getOrderEligibility)
  .post('/request', protect, formLimiter, returns.submitRequest);
