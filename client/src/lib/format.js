import clsx from 'clsx';

export const cn = clsx;

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

/** Resolves stored image paths (/uploads/…) against the API origin. */
// Widths the server will resize to (see server/src/middleware/imageResize.js).
const IMG_WIDTHS = [160, 320, 480, 640, 960, 1280];

/**
 * Full URL for an image. With a width, asks for a resized copy:
 * local uploads → "?w=480" (server makes a small WebP), Cloudinary → "w_480,f_auto,q_auto".
 */
export const FALLBACK_IMAGE = '/uploads/seed/backpack-terracotta.jpg';

export function imgUrl(url, width) {
  if (url && typeof url === 'object' && url.url) {
    url = url.url;
  }
  if (!url || typeof url !== 'string') return FALLBACK_IMAGE;
  const w = width ? IMG_WIDTHS.find((x) => x >= width) || 1280 : null;
  if (url.startsWith('/uploads/')) {
    // On Netlify, its image CDN resizes and picks WebP/AVIF; elsewhere the API resizes (?w=).
    if (w && import.meta.env.VITE_IMAGE_CDN === 'netlify') return `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}`;
    return `${API_ORIGIN}${url}${w ? `?w=${w}` : ''}`;
  }
  if (w && url.includes('res.cloudinary.com') && url.includes('/upload/')) return url.replace('/upload/', `/upload/w_${w},c_limit,f_auto,q_auto/`);
  return url;
}

/**
 * Formats an INR amount in the shopper's display currency.
 * Checkout always charges INR; other currencies are display-only conversions.
 */
export function formatMoney(amountInr, currency) {
  const value = Number(amountInr || 0);
  if (!currency || currency.code === 'INR') {
    const digits = value % 1 ? 2 : 0;
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  }
  const converted = value * currency.rate;
  const decimals = converted < 100 ? 2 : 0;
  return `${currency.symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export const formatINR = (n) => formatMoney(n);

export function formatDate(d, opts = { dateStyle: 'medium' }) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', opts);
}

export function formatDateTime(d) {
  return formatDate(d, { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const v = Math.floor(s / secs);
    if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export const compact = (n) => Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

export function productImage(product, variant) {
  const url =
    variant?.images?.[0]?.url ||
    (typeof variant?.images?.[0] === 'string' ? variant.images[0] : null) ||
    product?.images?.[0]?.url ||
    (typeof product?.images?.[0] === 'string' ? product.images[0] : null) ||
    product?.image ||
    FALLBACK_IMAGE;
  return imgUrl(url);
}

export function discountPercent(p) {
  return p.salePrice && p.salePrice < p.price ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];

export const STATUS_STYLE = {
  Pending: 'bg-tertiary-fixed text-tertiary-container',
  Confirmed: 'bg-primary-fixed text-primary-container',
  Processing: 'bg-primary-fixed text-primary-container',
  Packed: 'bg-surface-container-highest text-on-surface',
  Shipped: 'bg-secondary-container text-on-secondary-fixed',
  'Out for Delivery': 'bg-secondary-container text-on-secondary-fixed',
  Delivered: 'bg-secondary text-on-secondary',
  Cancelled: 'bg-error-container text-on-error-container',
  Returned: 'bg-error-container text-on-error-container',
  Paid: 'bg-secondary text-on-secondary',
  Failed: 'bg-error-container text-on-error-container',
  Refunded: 'bg-surface-container-highest text-on-surface',
};

export const PAYMENT_LABELS = { cod: 'Cash on Delivery', card: 'Card', upi: 'UPI / Net Banking', wallet: 'Wallet' };
