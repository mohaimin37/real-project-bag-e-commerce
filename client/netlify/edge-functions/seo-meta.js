/**
 * Netlify Edge Function: puts real page titles, descriptions, preview images and
 * structured data into the HTML for product, category and blog pages.
 *
 * The storefront is a React app that sets these in the browser. Link-preview bots
 * (WhatsApp, Facebook, X, LinkedIn) and some search engines don't run JavaScript, so
 * without this every shared link would show the generic store preview.
 * If anything fails, the page is served unchanged.
 */
const SITE = 'WILDTANE';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s = '', n = 158) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

async function getJson(url) {
  // x-seo-preview: tells the API this isn't a real visit (e.g. don't count a blog view).
  const res = await fetch(url, { headers: { accept: 'application/json', 'x-seo-preview': '1' }, signal: AbortSignal.timeout(2000) });
  return res.ok ? res.json() : null;
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

/** Plain list of product links + prices, so crawlers can follow every product from a listing page. */
function productList(items = []) {
  if (!items.length) return '';
  return `<ul>${items.map((p) => `<li><a href="/product/${esc(p.slug)}">${esc(p.name)}</a> — ${inr(p.finalPrice ?? p.price)}</li>`).join('')}</ul>`;
}

function categoryLinks(tree = []) {
  if (!tree.length) return '';
  const all = tree.flatMap((c) => [c, ...(c.children || [])]);
  return `<nav aria-label="Categories"><ul>${all.map((c) => `<li><a href="/shop/${esc(c.slug)}">${esc(c.name)}</a></li>`).join('')}</ul></nav>`;
}

// Fixed pages: title + description for link previews (keep in step with the React pages' <Seo> tags).
const STATIC_PAGES = {
  '/men': ["Men's Bags — Backpacks, Laptop Bags, Wallets & Travel Gear", "Shop men's bags at WILDTANE: laptop backpacks, messengers, duffles, wallets and travel gear.", '/uploads/seed/briefcase-black.jpg'],
  '/women': ["Women's Bags — Handbags, Totes, Crossbody & Travel Bags", "Shop women's bags at WILDTANE: handbags, totes, crossbody and shoulder bags, backpacks and travel bags.", '/uploads/seed/handbag-teal.jpg'],
  '/unisex': ['Unisex Bags — Backpacks, Luggage & Travel Gear for Everyone', 'Shop unisex bags at WILDTANE: backpacks, cabin luggage, duffles, slings and travel accessories designed for everyone.', '/uploads/seed/apex-navy.jpg'],
  '/about': ['About Us — Our Story & Mission', 'Meet WILDTANE: modern, well-made bags, backpacks and travel gear designed for everyday life.', '/brand/logo-full.jpg'],
  '/contact': ['Contact Us', 'Questions about a bag, an order or a return? Get in touch with the WILDTANE care team.'],
  '/help': ['Help Centre — Payments, Delivery, Returns & Account', 'Fix common issues with payments, delivery, damaged or wrong products, returns, refunds and account sign-in at WILDTANE.'],
  '/faq': ['Frequently Asked Questions', 'Answers about ordering, payments, delivery times, returns, exchanges, refunds and your WILDTANE account.'],
  '/csr-policy': ['Corporate Social Responsibility (CSR) Policy', "WILDTANE Private Limited's commitment to education, the environment, community development and women empowerment."],
  '/policies': ['Store Policies', 'Returns, replacements, shipping, cancellations, refunds, privacy and terms at WILDTANE.'],
  '/return-policy': ['Return, Refund & Exchange Policy', 'When WILDTANE accepts returns, exchanges and refunds, the 7-day return window, refund timelines and order cancellation.'],
  '/shipping-policy': ['Shipping & Delivery Policy', 'Where WILDTANE delivers, processing and delivery times, shipping charges and order tracking.'],
  '/privacy-policy': ['Privacy Policy', 'How WILDTANE collects, uses and protects personal data under the Digital Personal Data Protection Act, 2023.'],
  '/terms-and-conditions': ['Terms & Conditions', 'The terms that govern purchases from WILDTANE Private Limited, including liability, arbitration and jurisdiction.'],
};

async function describe(pathname, api, origin) {
  const abs = (u) => (!u ? `${origin}/uploads/seed/hero-traveler.jpg` : /^https?:/.test(u) ? u : `${origin}${u}${u.startsWith('/uploads/') ? '?w=1280' : ''}`);
  const fixed = STATIC_PAGES[pathname.replace(/\/$/, '') || '/'];
  if (fixed) {
    const [title, desc, image] = fixed;
    const gender = pathname.match(/^\/(men|women|unisex)\/?$/)?.[1];
    const list = gender ? await getJson(`${api}/api/products?gender=${gender}&limit=48&sort=featured`) : null;
    return { title: `${title} | ${SITE}`, desc: clip(desc), image: abs(image), type: 'website', body: `<h1>${esc(title)}</h1><p>${esc(desc)}</p>${productList(list?.items)}` };
  }
  // Home and the all-products page: no meta changes, but real content for crawlers.
  if (pathname === '/' || pathname === '/shop' || pathname === '/shop/') {
    const [list, cats] = await Promise.all([getJson(`${api}/api/products?limit=48&sort=featured`), getJson(`${api}/api/categories`)]);
    return {
      body: `<h1>WILDTANE — Bags, Backpacks & Travel Gear</h1><p>Laptop backpacks, leather handbags, cabin luggage, duffles and wallets for men, women and everyone, with tracked delivery across India and 7-day returns.</p>${categoryLinks(cats?.categories)}${productList(list?.items)}`,
    };
  }
  let m = pathname.match(/^\/product\/([a-z0-9-]+)\/?$/);
  if (m) {
    const d = await getJson(`${api}/api/products/${m[1]}`);
    const p = d?.product;
    if (!p) return null;
    const price = p.finalPrice ?? p.price;
    const desc = clip(`${p.shortDescription || p.description || ''} ₹${Number(price).toLocaleString('en-IN')}.`);
    const image = abs(p.images?.[0]?.url);
    const crumbs = [p.category, p.subcategory].filter(Boolean).map((c) => `<a href="/shop/${esc(c.slug)}">${esc(c.name)}</a>`).join(' › ');
    return {
      body: `<nav aria-label="Breadcrumbs"><a href="/">Home</a>${crumbs ? ` › ${crumbs}` : ''}</nav><h1>${esc(p.name)}</h1><img src="${esc(image)}" alt="${esc(p.name)}"><p>${inr(price)}${p.finalPrice < p.price ? ` (was ${inr(p.price)})` : ''}</p><p>${esc(p.description || p.shortDescription || '')}</p>${(d.related || []).length ? `<h2>You may also like</h2>${productList(d.related)}` : ''}`,
      title: `${p.name} | ${SITE}`,
      desc,
      image,
      type: 'product',
      extra: `<meta property="product:price:amount" content="${price}"><meta property="product:price:currency" content="INR">`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.shortDescription || p.description,
        image: (p.images || []).map((i) => abs(i.url)),
        sku: p.sku,
        brand: { '@type': 'Brand', name: SITE },
        ...(p.ratingCount ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.ratingAverage, reviewCount: p.ratingCount } } : {}),
        offers: { '@type': 'Offer', priceCurrency: 'INR', price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${origin}${pathname}` },
      },
    };
  }
  m = pathname.match(/^\/blog\/([a-z0-9-]+)\/?$/);
  if (m) {
    const d = await getJson(`${api}/api/blogs/${m[1]}`);
    const b = d?.post;
    if (!b) return null;
    return {
      title: `${b.title} | ${SITE} Journal`,
      desc: clip(b.excerpt || ''),
      image: abs(b.coverImage?.url),
      type: 'article',
      jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: b.title, image: abs(b.coverImage?.url), datePublished: b.publishedAt, author: { '@type': 'Organization', name: b.authorName || SITE } },
    };
  }
  m = pathname.match(/^\/shop\/([a-z0-9-]+)\/?$/);
  if (m) {
    const [d, list] = await Promise.all([getJson(`${api}/api/categories/${m[1]}`), getJson(`${api}/api/products?category=${m[1]}&limit=48&sort=featured`)]);
    const c = d?.category;
    if (!c) return null;
    const desc = clip(c.tagline || c.description || `Shop ${c.name} at ${SITE}.`);
    return {
      title: `Buy ${c.name} Online | ${SITE}`,
      desc,
      image: abs(c.image?.url),
      type: 'website',
      body: `<nav aria-label="Breadcrumbs"><a href="/">Home</a> › <a href="/shop">Shop</a></nav><h1>${esc(c.name)}</h1><p>${esc(desc)}</p>${productList(list?.items)}`,
    };
  }
  return null;
}

export default async (request, context) => {
  const res = await context.next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  const url = new URL(request.url);
  const origin = url.origin;
  const api = Netlify.env.get('API_ORIGIN') || origin; // same site works because netlify.toml forwards /api
  let html = await res.text();

  // Preview images and canonical links must be absolute URLs.
  html = html.replace('content="/uploads/seed/hero-traveler.jpg"', `content="${origin}/uploads/seed/hero-traveler.jpg?w=1280"`);
  const canonical = `${origin}${url.pathname.replace(/\/$/, '') || '/'}`;
  let head = `<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">`;

  try {
    const meta = await describe(url.pathname, api, origin);
    if (meta?.body) {
      // Visually hidden (no flash, no layout shift) but in the HTML for crawlers that don't run JavaScript.
      // React replaces the contents of #root as soon as the app starts.
      const hidden = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
      html = html.replace('<div id="root"></div>', `<div id="root"><div id="prerender" style="${hidden}">${meta.body}</div></div>`);
    }
    if (meta?.title) {
      html = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
        .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.desc)}" />`)
        .replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="${meta.type}" />`)
        .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
        .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(meta.desc)}" />`)
        .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(meta.image)}" />`);
      head += `<meta name="twitter:title" content="${esc(meta.title)}"><meta name="twitter:description" content="${esc(meta.desc)}"><meta name="twitter:image" content="${esc(meta.image)}">${meta.extra || ''}`;
      if (meta.jsonLd) head += `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`;
    }
  } catch {
    // Serve the page with default tags rather than fail.
  }

  html = html.replace('</head>', `${head}</head>`);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  return new Response(html, { status: res.status, headers });
};

export const config = {
  path: '/*',
  excludedPath: ['/api/*', '/uploads/*', '/assets/*', '/admin/*', '/account/*', '/checkout', '/cart', '/*.js', '/*.css', '/*.png', '/*.svg', '/*.webmanifest', '/sitemap.xml', '/robots.txt'],
};
