import axios from 'axios';

const baseURL = `${import.meta.env.VITE_API_URL || ''}/api`;

export const http = axios.create({ baseURL, withCredentials: true, timeout: 30000 });

// Automatically attach stored session token as Bearer header for cross-browser session persistence
http.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('wt-token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

// Normalise errors to { message, status, details } so UI code can show them directly.
http.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const status = error.response?.status || 0;
    const data = error.response?.data || {};
    // No response, a gateway error, or an empty 500 from the dev proxy all mean the API isn't reachable.
    const unreachable = status === 0 || status === 502 || status === 503 || status === 504 || (status === 500 && !data.message);
    const message =
      data.message ||
      (unreachable
        ? "Can't reach the store server right now. Please try again in a moment."
        : 'Something went wrong. Please try again.');
    return Promise.reject({ message, status, details: data.details || [] });
  }
);

/** Converts a params object to a query string, dropping empty values. */
export function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // auth
  me: () => http.get('/auth/me'),
  login: (body) => http.post('/auth/login', body),
  adminLogin: (body) => http.post('/auth/admin/login', body),
  register: (body) => http.post('/auth/register', body),
  logout: () => http.post('/auth/logout'),
  logoutAll: () => http.post('/auth/logout-all'),
  forgotPassword: (body) => http.post('/auth/forgot-password', body),
  verifyResetOtp: (body) => http.post('/auth/verify-otp', body),
  loginWithOtp: (body) => http.post('/auth/login-otp', body),
  resetPasswordOtp: (body) => http.post('/auth/reset-password-otp', body),
  resetPassword: (body) => http.post('/auth/reset-password', body),

  // account
  updateProfile: (body) => http.patch('/users/me', body),
  // onProgress(0–1) drives the upload progress bar.
  uploadAvatar: (file, onProgress) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return http.post('/users/me/avatar', fd, { onUploadProgress: (e) => e.total && onProgress?.(e.loaded / e.total) });
  },
  changePassword: (body) => http.patch('/users/me/password', body),
  addresses: () => http.get('/users/me/addresses'),
  addAddress: (body) => http.post('/users/me/addresses', body),
  updateAddress: (id, body) => http.put(`/users/me/addresses/${id}`, body),
  deleteAddress: (id) => http.delete(`/users/me/addresses/${id}`),
  setDefaultAddress: (id) => http.patch(`/users/me/addresses/${id}/default`),
  recentlyViewed: () => http.get('/users/me/recently-viewed'),
  trackView: (productId) => http.post(`/users/me/recently-viewed/${productId}`),
  myReviews: () => http.get('/users/me/reviews'),
  myOverview: () => http.get('/users/me/overview'),

  // catalogue
  config: () => http.get('/config'),
  banners: () => http.get('/banners'),
  categories: (params) => http.get(`/categories${qs(params)}`),
  category: (slug) => http.get(`/categories/${slug}`),
  products: (params) => http.get(`/products${qs(params)}`),
  facets: (params) => http.get(`/products/facets${qs(params)}`),
  suggest: (q) => http.get(`/products/suggest${qs({ q })}`),
  collections: () => http.get('/products/collections'),
  productsByIds: (ids) => http.get(`/products/by-ids${qs({ ids })}`),
  product: (slug) => http.get(`/products/${slug}`),

  // cart
  cart: () => http.get('/cart'),
  quoteCart: (items, shippingMethod) => http.post('/cart/quote', { items, shippingMethod }),
  addToCart: (body) => http.post('/cart/items', body),
  updateCartItem: (id, quantity) => http.patch(`/cart/items/${id}`, { quantity }),
  changeCartVariant: (id, variantId) => http.patch(`/cart/items/${id}/variant`, { variantId }),
  removeCartItem: (id) => http.delete(`/cart/items/${id}`),
  clearCart: () => http.delete('/cart'),
  mergeCart: (items) => http.post('/cart/merge', { items }),
  applyCoupon: (code) => http.post('/cart/coupon', { code }),
  removeCoupon: () => http.delete('/cart/coupon'),
  setShipping: (code) => http.put('/cart/shipping', { code }),
  paymentMethods: () => http.get('/cart/payment-methods'),
  setUseCoins: (use) => http.put('/cart/coins', { use }),
  myCoins: () => http.get('/users/me/coins'),
  publicCoupons: () => http.get('/coupons'),

  // wishlist
  wishlist: () => http.get('/wishlist'),
  addWishlist: (id) => http.post(`/wishlist/${id}`),
  removeWishlist: (id) => http.delete(`/wishlist/${id}`),
  mergeWishlist: (productIds) => http.post('/wishlist/merge', { productIds }),

  // orders
  placeOrder: (body) => http.post('/orders', body),
  myOrders: (params) => http.get(`/orders${qs(params)}`),
  myOrder: (id) => http.get(`/orders/${id}`),
  cancelOrder: (id, reason) => http.post(`/orders/${id}/cancel`, { reason }),

  // returns & exchanges
  returnPolicy: () => http.get('/returns/policy'),
  myReturnOrders: () => http.get('/returns/orders'),
  orderReturnEligibility: (id, email) => http.get(`/returns/order/${encodeURIComponent(id)}${qs({ email })}`),
  submitReturnExchange: (body) => http.post('/returns/request', body),

  // reviews
  reviews: (productId, params) => http.get(`/reviews/product/${productId}${qs(params)}`),
  featuredReviews: (limit) => http.get(`/reviews/featured${qs({ limit })}`),
  reviewEligibility: (productId) => http.get(`/reviews/product/${productId}/eligibility`),
  createReview: (productId, body) => http.post(`/reviews/product/${productId}`, body),
  updateReview: (id, body) => http.patch(`/reviews/${id}`, body),
  deleteReview: (id) => http.delete(`/reviews/${id}`),
  helpful: (id) => http.post(`/reviews/${id}/helpful`),

  // content & forms
  blogs: (params) => http.get(`/blogs${qs(params)}`),
  blog: (slug) => http.get(`/blogs/${slug}`),
  liveUpdates: (limit) => http.get(`/updates${qs({ limit })}`),
  contact: (body) => http.post('/contact', body),
  corporate: (formData, onProgress) => http.post('/corporate', formData, { onUploadProgress: (e) => e.total && onProgress?.(e.loaded / e.total) }),
  subscribe: (email) => http.post('/newsletter', { email }),
  comments: (limit) => http.get(`/comments${qs({ limit })}`),
  submitComment: (body) => http.post('/comments', body),
};

export const adminApi = {
  dashboard: (days) => http.get(`/admin/dashboard${qs({ days })}`),
  analytics: (days) => http.get(`/admin/analytics${qs({ days })}`),
  reports: (period) => http.get(`/admin/reports${qs({ period })}`),

  products: (params) => http.get(`/admin/products${qs(params)}`),
  product: (id) => http.get(`/admin/products/${id}`),
  createProduct: (body) => http.post('/admin/products', body),
  suggestProduct: (name) => http.get(`/admin/products/suggest${qs({ name })}`),
  aiStatus: () => http.get('/admin/products/ai-status'),
  aiWriteProduct: (body) => http.post('/admin/products/ai-write', body, { timeout: 60000 }), // looking at photos takes a while
  updateProduct: (id, body) => http.put(`/admin/products/${id}`, body),
  deleteProduct: (id) => http.delete(`/admin/products/${id}`),
  quickUpdateProduct: (id, body) => http.patch(`/admin/products/${id}/quick`, body),
  bulkUpdateProducts: (body) => http.post('/admin/products/bulk', body),
  productFlag: (id, flag, value) => http.patch(`/admin/products/${id}/flags`, { flag, value }),
  updateStock: (id, variants) => http.patch(`/admin/products/${id}/stock`, { variants }),
  uploadProductImages: (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    return http.post('/admin/products/images', fd);
  },
  inventorySummary: () => http.get('/admin/inventory/summary'),

  categories: () => http.get('/categories?all=true'),
  createCategory: (body) => http.post('/admin/categories', body),
  updateCategory: (id, body) => http.put(`/admin/categories/${id}`, body),
  deleteCategory: (id) => http.delete(`/admin/categories/${id}`),

  orders: (params) => http.get(`/admin/orders${qs(params)}`),
  order: (id) => http.get(`/admin/orders/${id}`),
  approveOrder: (id) => http.post(`/admin/orders/${id}/approve`),
  approveAndSendInvoice: (id, body) => http.post(`/admin/orders/${id}/approve-and-send`, body),
  sendEmailInvoice: (id, body) => http.post(`/admin/orders/${id}/send-email-invoice`, body),
  sendWhatsAppInvoice: (id, body) => http.post(`/admin/orders/${id}/send-whatsapp-invoice`, body),
  invoicePreview: (id) => http.get(`/admin/orders/${id}/invoice-preview`),
  invoicePdf: (id) => http.get(`/admin/orders/${id}/invoice.pdf`, { responseType: 'blob', timeout: 60000 }),
  orderStatus: (id, body) => http.patch(`/admin/orders/${id}/status`, body),
  orderPayment: (id, paymentStatus) => http.patch(`/admin/orders/${id}/payment`, { paymentStatus }),
  resendNotification: (id) => http.post(`/admin/notifications/${id}/resend`),
  notifications: (params) => http.get(`/admin/notifications${qs(params)}`),

  returns: (params) => http.get(`/admin/returns${qs(params)}`),
  returnRequest: (id) => http.get(`/admin/returns/${id}`),
  updateReturnStatus: (id, body) => http.patch(`/admin/returns/${id}`, body),

  customers: (params) => http.get(`/admin/customers${qs(params)}`),
  customerBoard: (params) => http.get(`/admin/customers/board${qs(params)}`),
  adjustCoins: (id, body) => http.post(`/admin/customers/${id}/coins`, body),
  customer: (id) => http.get(`/admin/customers/${id}`),
  updateCustomer: (id, body) => http.patch(`/admin/customers/${id}`, body),

  coupons: (params) => http.get(`/admin/coupons${qs(params)}`),
  coupon: (id) => http.get(`/admin/coupons/${id}`),
  createCoupon: (body) => http.post('/admin/coupons', body),
  updateCoupon: (id, body) => http.put(`/admin/coupons/${id}`, body),
  deleteCoupon: (id) => http.delete(`/admin/coupons/${id}`),

  reviews: (params) => http.get(`/admin/reviews${qs(params)}`),
  reviewStatus: (id, status) => http.patch(`/admin/reviews/${id}`, { status }),
  // body: { status?, showOnHome? }
  updateReview: (id, body) => http.patch(`/admin/reviews/${id}`, body),
  deleteReview: (id) => http.delete(`/admin/reviews/${id}`),

  comments: (params) => http.get(`/admin/comments${qs(params)}`),
  createComment: (body) => http.post('/admin/comments', body),
  commentStatus: (id, status) => http.patch(`/admin/comments/${id}`, { status }),
  deleteComment: (id) => http.delete(`/admin/comments/${id}`),

  enquiries: (kind, params) => http.get(`/admin/enquiries/${kind}${qs(params)}`),
  updateEnquiry: (kind, id, body) => http.patch(`/admin/enquiries/${kind}/${id}`, body),
  deleteEnquiry: (kind, id) => http.delete(`/admin/enquiries/${kind}/${id}`),
  subscribers: (params) => http.get(`/admin/subscribers${qs(params)}`),

  blogs: (params) => http.get(`/admin/blogs${qs(params)}`),
  blog: (id) => http.get(`/admin/blogs/${id}`),
  createBlog: (body) => http.post('/admin/blogs', body),
  updateBlog: (id, body) => http.put(`/admin/blogs/${id}`, body),
  deleteBlog: (id) => http.delete(`/admin/blogs/${id}`),

  liveUpdates: () => http.get('/admin/updates'),
  createLiveUpdate: (body) => http.post('/admin/updates', body),
  updateLiveUpdate: (id, body) => http.put(`/admin/updates/${id}`, body),
  deleteLiveUpdate: (id) => http.delete(`/admin/updates/${id}`),

  banners: () => http.get('/admin/banners'),
  createBanner: (body) => http.post('/admin/banners', body),
  updateBanner: (id, body) => http.put(`/admin/banners/${id}`, body),
  deleteBanner: (id) => http.delete(`/admin/banners/${id}`),

  upload: (file, folder) => {
    const fd = new FormData();
    fd.append('image', file);
    return http.post(`/admin/uploads${qs({ folder })}`, fd);
  },
  settings: () => http.get('/admin/settings'),
  updateSettings: (body) => http.put('/admin/settings', body),
};
