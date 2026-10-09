import { Router } from 'express';
import { adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { imageUpload } from '../middleware/upload.js';

import * as admin from '../controllers/admin.controller.js';
import * as analytics from '../controllers/analytics.controller.js';
import * as products from '../controllers/product.controller.js';
import * as categories from '../controllers/category.controller.js';
import * as orders from '../controllers/order.controller.js';
import * as reviews from '../controllers/review.controller.js';
import * as coupons from '../controllers/coupon.controller.js';
import * as content from '../controllers/content.controller.js';
import * as enquiries from '../controllers/enquiry.controller.js';
import * as comments from '../controllers/comment.controller.js';

import { productSchema, categorySchema, stockUpdateSchema, quickProductSchema, bulkProductSchema } from '../validators/catalog.validators.js';
import { orderStatusSchema, paymentStatusSchema, couponSchema, coinAdjustSchema } from '../validators/commerce.validators.js';
import { blogSchema, liveUpdateSchema, bannerSchema, settingsSchema, enquiryUpdateSchema, adminCommentSchema } from '../validators/content.validators.js';

const r = Router();
r.use(adminOnly);

// Dashboard & analytics
r.get('/dashboard', admin.dashboard);
r.get('/analytics', admin.analytics);
r.get('/reports', analytics.reports);

// Products & inventory
r.get('/products', products.adminListProducts);
r.post('/products', validate(productSchema), products.createProduct);
r.post('/products/images', imageUpload.array('images', 10), products.uploadProductImages);
r.get('/products/suggest', products.suggestProductDetails);
r.get('/products/ai-status', products.aiStatus);
r.post('/products/ai-write', products.aiWriteProduct);
r.get('/products/:id', products.adminGetProduct);
r.put('/products/:id', validate(productSchema), products.updateProduct);
r.patch('/products/:id/flags', products.toggleProductFlag);
r.patch('/products/:id/quick', validate(quickProductSchema), products.quickUpdateProduct);
r.post('/products/bulk', validate(bulkProductSchema), products.bulkUpdateProducts);
r.patch('/products/:id/stock', validate(stockUpdateSchema), products.updateStock);
r.delete('/products/:id', products.deleteProduct);
r.get('/inventory/summary', admin.inventorySummary);

// Categories & subcategories
r.post('/categories', validate(categorySchema), categories.createCategory);
r.put('/categories/:id', validate(categorySchema), categories.updateCategory);
r.delete('/categories/:id', categories.deleteCategory);

// Orders
r.get('/orders', orders.adminListOrders);
r.get('/orders/:id', orders.adminGetOrder);
r.patch('/orders/:id/status', validate(orderStatusSchema), orders.adminUpdateStatus);
r.patch('/orders/:id/payment', validate(paymentStatusSchema), orders.adminUpdatePayment);
r.post('/notifications/:notificationId/resend', orders.adminResendNotification);
r.get('/notifications', admin.listNotifications);

// Customers
r.get('/customers', admin.listCustomers);
r.get('/customers/board', admin.customerBoard);
r.get('/customers/:id', admin.getCustomer);
r.patch('/customers/:id', admin.updateCustomer);
r.post('/customers/:id/coins', validate(coinAdjustSchema), admin.adjustCustomerCoins);

// Coupons
r.get('/coupons', coupons.listCoupons);
r.post('/coupons', validate(couponSchema), coupons.createCoupon);
r.get('/coupons/:id', coupons.getCoupon);
r.put('/coupons/:id', validate(couponSchema), coupons.updateCoupon);
r.delete('/coupons/:id', coupons.deleteCoupon);

// Reviews
r.get('/reviews', reviews.adminListReviews);
r.patch('/reviews/:id', reviews.adminSetReviewStatus);
r.delete('/reviews/:id', reviews.adminDeleteReview);

// Homepage customer comments
r.get('/comments', comments.adminListComments);
r.post('/comments', validate(adminCommentSchema), comments.adminCreateComment);
r.patch('/comments/:id', comments.adminSetCommentStatus);
r.delete('/comments/:id', comments.adminDeleteComment);

// Enquiries & newsletter
for (const kind of ['corporate', 'contact']) {
  r.get(`/enquiries/${kind}`, enquiries.adminList(kind));
  r.patch(`/enquiries/${kind}/:id`, validate(enquiryUpdateSchema), enquiries.adminUpdate(kind));
  r.delete(`/enquiries/${kind}/:id`, enquiries.adminDelete(kind));
}
r.get('/subscribers', enquiries.adminSubscribers);

// Blog
r.get('/blogs', content.adminListPosts);
r.post('/blogs', validate(blogSchema), content.createPost);
r.get('/blogs/:id', content.adminGetPost);
r.put('/blogs/:id', validate(blogSchema), content.updatePost);
r.delete('/blogs/:id', content.deletePost);

// Live updates
r.get('/updates', content.adminListUpdates);
r.post('/updates', validate(liveUpdateSchema), content.createUpdate);
r.put('/updates/:id', validate(liveUpdateSchema), content.updateUpdate);
r.delete('/updates/:id', content.deleteUpdate);

// Banners
r.get('/banners', content.adminListBanners);
r.post('/banners', validate(bannerSchema), content.createBanner);
r.put('/banners/:id', validate(bannerSchema), content.updateBanner);
r.delete('/banners/:id', content.deleteBanner);

// Uploads & settings
r.post('/uploads', imageUpload.single('image'), content.uploadImage);
r.get('/settings', content.getSettings);
r.put('/settings', validate(settingsSchema), content.updateSettings);

export default r;
