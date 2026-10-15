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
import * as returns from '../controllers/return.controller.js';
import * as payments from '../controllers/payments.controller.js';
import * as giftcards from '../controllers/giftcard.controller.js';

import { productSchema, categorySchema, stockUpdateSchema, quickProductSchema, bulkProductSchema } from '../validators/catalog.validators.js';
import {
  orderStatusSchema,
  orderMessageSchema,
  paymentStatusSchema,
  couponSchema,
  coinAdjustSchema,
  walletAdjustSchema,
  giftCardIssueSchema,
  giftCardAdjustSchema,
} from '../validators/commerce.validators.js';
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
r.post('/categories/:id/move-products', categories.reassignProducts);

// Orders
r.get('/orders', orders.adminListOrders);
r.get('/orders/:id', orders.adminGetOrder);
r.post('/orders/:id/approve', orders.adminApproveOrder);
r.get('/orders/:id/invoice-preview', orders.adminGetInvoicePreview);
r.get('/orders/:id/invoice.pdf', orders.adminDownloadInvoicePdf);
r.post('/orders/:id/approve-and-send', orders.adminApproveOrder);
r.post('/orders/:id/send-email-invoice', orders.adminSendInvoiceEmail);
r.post('/orders/:id/send-whatsapp-invoice', orders.adminSendInvoiceWhatsApp);
r.patch('/orders/:id/status', validate(orderStatusSchema), orders.adminUpdateStatus);
r.post('/orders/:id/message', validate(orderMessageSchema), orders.adminMessageCustomer);
r.post('/orders/:id/cancellation-decision', orders.adminCancellationDecision);
r.patch('/orders/:id/payment', validate(paymentStatusSchema), orders.adminUpdatePayment);
r.post('/orders/:id/refund/retry', orders.adminRetryRefund);
r.post('/orders/:id/shipment', orders.adminCreateShipment);
r.post('/orders/:id/shipment/sync', orders.adminSyncShipment);
r.get('/shipping/status', orders.shippingStatus);
r.post('/notifications/:notificationId/resend', orders.adminResendNotification);
r.get('/notifications', admin.listNotifications);

// Payments: who paid how much, refunds sent and still to send
r.get('/payments/summary', payments.summary);
r.get('/payments/transactions', payments.transactions);
r.get('/payments/customers', payments.byCustomer);
r.get('/payments/refunds', payments.refundQueue);

// Returns & Exchanges
r.get('/returns', returns.adminListReturns);
r.post('/returns', returns.adminCreateReturn);
r.get('/returns/order/:orderId', returns.adminReturnOrderLookup);
r.patch('/returns/:id/refund-destination', returns.adminUpdateRefundDestination);
r.get('/returns/:id', returns.adminGetReturn);
r.patch('/returns/:id', returns.adminUpdateReturnStatus);
r.post('/returns/:id/pickup', returns.adminSchedulePickup);
r.post('/returns/:id/refund-processed', returns.adminMarkReturnRefunded);

// Gift cards
r.get('/giftcards', giftcards.adminListGiftCards);
r.post('/giftcards', validate(giftCardIssueSchema), giftcards.adminIssueGiftCard);
r.get('/giftcards/:id', giftcards.adminGetGiftCard);
r.patch('/giftcards/:id', validate(giftCardAdjustSchema), giftcards.adminAdjustGiftCard);

// Customers
r.get('/customers', admin.listCustomers);
r.get('/customers/board', admin.customerBoard);
r.get('/customers/:id', admin.getCustomer);
r.patch('/customers/:id', admin.updateCustomer);
r.post('/customers/:id/coins', validate(coinAdjustSchema), admin.adjustCustomerCoins);
r.get('/customers/:id/wallet', admin.customerWalletLedger);
r.post('/customers/:id/wallet', validate(walletAdjustSchema), admin.adjustCustomerWallet);

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
