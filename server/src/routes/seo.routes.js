import { Router } from 'express';
import env from '../config/env.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Blog from '../models/Blog.js';
import asyncHandler from '../utils/asyncHandler.js';

const STATIC_PAGES = [
  ['/', 'daily', '1.0'],
  ['/shop', 'daily', '0.9'],
  ['/men', 'daily', '0.9'],
  ['/women', 'daily', '0.9'],
  ['/unisex', 'daily', '0.9'],
  ['/offers', 'daily', '0.8'],
  ['/blog', 'weekly', '0.7'],
  ['/about', 'monthly', '0.6'],
  ['/corporate', 'monthly', '0.6'],
  ['/contact', 'monthly', '0.5'],
  ['/help', 'monthly', '0.5'],
  ['/faq', 'monthly', '0.5'],
  ['/policies', 'yearly', '0.3'],
  ['/csr-policy', 'yearly', '0.3'],
  ['/return-policy', 'yearly', '0.3'],
  ['/shipping-policy', 'yearly', '0.3'],
  ['/privacy-policy', 'yearly', '0.2'],
  ['/terms-and-conditions', 'yearly', '0.2'],
];

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
const abs = (url) => (url && url.startsWith('/') ? `${env.siteUrl}${url}` : url);

function urlEntry(loc, { lastmod, changefreq, priority, images = [] } = {}) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(env.siteUrl + loc)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    ...images.slice(0, 5).map((i) => `    <image:image><image:loc>${xmlEscape(abs(i.url))}</image:loc>${i.alt ? `<image:title>${xmlEscape(i.alt)}</image:title>` : ''}</image:image>`),
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

const router = Router();

router.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const [products, categories, posts] = await Promise.all([
      Product.find({ isVisible: true }).select('slug updatedAt images name').lean(),
      Category.find({ isActive: true }).select('slug updatedAt').lean(),
      Blog.find({ status: 'published' }).select('slug updatedAt coverImage title').lean(),
    ]);
    const entries = [
      ...STATIC_PAGES.map(([loc, changefreq, priority]) => urlEntry(loc, { changefreq, priority })),
      ...categories.map((c) => urlEntry(`/shop/${c.slug}`, { lastmod: c.updatedAt, changefreq: 'weekly', priority: '0.8' })),
      ...products.map((p) => urlEntry(`/product/${p.slug}`, { lastmod: p.updatedAt, changefreq: 'weekly', priority: '0.9', images: p.images.map((i) => ({ url: i.url, alt: i.alt || p.name })) })),
      ...posts.map((b) => urlEntry(`/blog/${b.slug}`, { lastmod: b.updatedAt, changefreq: 'monthly', priority: '0.6', images: b.coverImage?.url ? [{ url: b.coverImage.url, alt: b.title }] : [] })),
    ];
    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`);
  })
);

router.get('/robots.txt', (req, res) => {
  res
    .type('text/plain')
    .set('Cache-Control', 'public, max-age=86400')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /account',
        'Disallow: /checkout',
        'Disallow: /cart',
        'Disallow: /order/',
        'Disallow: /reset-password/',
        'Disallow: /api/',
        '',
        `Sitemap: ${env.siteUrl}/sitemap.xml`,
        '',
      ].join('\n')
    );
});

export default router;
