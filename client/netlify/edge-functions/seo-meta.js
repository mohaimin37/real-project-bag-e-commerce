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

async function describe(pathname, api, origin) {
  const abs = (u) => (!u ? `${origin}/uploads/seed/hero-traveler.jpg` : /^https?:/.test(u) ? u : `${origin}${u}${u.startsWith('/uploads/') ? '?w=1280' : ''}`);
  let m = pathname.match(/^\/product\/([a-z0-9-]+)\/?$/);
  if (m) {
    const d = await getJson(`${api}/api/products/${m[1]}`);
    const p = d?.product;
    if (!p) return null;
    const price = p.finalPrice ?? p.price;
    const desc = clip(`${p.shortDescription || p.description || ''} ₹${Number(price).toLocaleString('en-IN')}.`);
    const image = abs(p.images?.[0]?.url);
    return {
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
    const d = await getJson(`${api}/api/categories/${m[1]}`);
    const c = d?.category;
    if (!c) return null;
    return { title: `Buy ${c.name} Online | ${SITE}`, desc: clip(c.tagline || c.description || `Shop ${c.name} at ${SITE}.`), image: abs(c.image?.url), type: 'website' };
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
    if (meta) {
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
