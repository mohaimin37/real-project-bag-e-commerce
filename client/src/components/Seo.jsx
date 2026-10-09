import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { imgUrl } from '../lib/format';

export const SITE_NAME = 'WILDTANE';
export const SITE_URL = (import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
const DEFAULT_DESCRIPTION =
  'WILDTANE designs modern bags, laptop backpacks, leather handbags, totes and travel duffles for men, women and everyone. Tracked delivery across India and 7-day returns.';
const DEFAULT_IMAGE = '/uploads/seed/hero-traveler.jpg';

export const absUrl = (u) => {
  if (!u) return '';
  const resolved = imgUrl(u);
  return /^https?:\/\//.test(resolved) ? resolved : `${SITE_URL}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
};

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Per-page SEO: title, description, canonical, Open Graph / Twitter cards,
 * robots and JSON-LD structured data. Values are written straight to <head>.
 */
export default function Seo({ title, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, type = 'website', noindex = false, canonical, jsonLd }) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Architectural Bags, Backpacks & Travel Gear`;
  const url = `${SITE_URL}${canonical || pathname}`;
  const desc = description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description;
  const ld = jsonLd ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : '';

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertLink('canonical', url);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', absUrl(image));
    upsertMeta('property', 'og:locale', 'en_IN');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', absUrl(image));

    let script = document.getElementById('seo-jsonld');
    if (ld) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'seo-jsonld';
        document.head.appendChild(script);
      }
      // Escape "<" so content can never close the script tag.
      script.textContent = ld.replace(/</g, '\\u003c');
    } else script?.remove();
  }, [fullTitle, desc, url, image, type, noindex, ld]);

  return null;
}

// ── Structured data builders (schema.org) ────────────────────

export const organizationLd = (config) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: config?.supportEmail,
  telephone: config?.supportPhone,
  sameAs: Object.values(config?.social || {}).filter(Boolean),
});

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/shop?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.label,
    ...(it.to ? { item: `${SITE_URL}${it.to}` } : {}),
  })),
});

export function productLd(product, reviews = []) {
  const inStock = product.variants?.some((v) => v.stock > 0);
  const validUntil = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku,
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: [product.category?.name, product.subcategory?.name].filter(Boolean).join(' > '),
    image: (product.images || []).map((i) => absUrl(i.url)),
    material: product.materials?.join(', '),
    url: `${SITE_URL}/product/${product.slug}`,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: product.finalPrice ?? product.price,
      priceValidUntil: validUntil,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAverage, reviewCount: product.ratingCount, bestRating: 5, worstRating: 1 },
          review: reviews.slice(0, 5).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.user?.name || 'WILDTANE customer' },
            datePublished: r.createdAt?.slice(0, 10),
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            name: r.title || undefined,
            reviewBody: r.comment,
          })),
        }
      : {}),
  };
}

export const articleLd = (post) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt,
  image: post.coverImage?.url ? [absUrl(post.coverImage.url)] : undefined,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt,
  author: { '@type': 'Organization', name: post.authorName || SITE_NAME },
  publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
  mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  keywords: post.tags?.join(', '),
});

export const itemListLd = (products) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/product/${p.slug}`, name: p.name })),
});
