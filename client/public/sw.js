// WILDTANE service worker: makes repeat visits fast and keeps the app shell available offline.
// Bump VERSION when shell files change (v4: theme system + gold logo) so browsers drop the old copies.
const VERSION = 'wildtane-v4';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.png', '/logo-192.png', '/logo-512.png', '/favicon.png', '/brand/logo-horizontal.webp', '/brand/logo-mark.png', '/brand/logo-horizontal-gold.webp', '/brand/logo-mark-gold.png', '/theme.js'];
const MAX_IMAGES = 200;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (name, req, res) => caches.open(name).then((c) => c.put(req, res));

/** Keeps the image cache from growing without limit. */
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if ((!sameOrigin && !isFont) || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // Built JS/CSS have a content hash in the name, and font files never change: cache first.
  if (url.pathname.startsWith('/assets/') || isFont) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok || res.type === 'opaque') put(`${VERSION}-static`, request, res.clone());
            return res;
          })
      )
    );
    return;
  }

  // Product photos: show the cached copy instantly, refresh it in the background.
  if (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/.netlify/images')) {
    event.respondWith(
      caches.open(`${VERSION}-img`).then(async (cache) => {
        const hit = await cache.match(request);
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone()).then(() => trim(`${VERSION}-img`, MAX_IMAGES));
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })
    );
    return;
  }

  // Pages: always try the network (fresh prices and stock), fall back to the cached app shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
  }
});
