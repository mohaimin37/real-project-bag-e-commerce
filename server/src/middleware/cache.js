import crypto from 'node:crypto';
import cluster from 'node:cluster';

/**
 * Short-lived in-memory cache for public catalogue reads (same answer for every visitor).
 *
 * - Hit: answered from memory, no database work.
 * - Miss while the same URL is already being computed: waits for that one result
 *   ("request coalescing"), so a traffic spike causes one DB query, not thousands.
 * - Any successful write that can change the catalogue (admin edits, orders → stock,
 *   reviews → ratings) clears the cache, across every worker process.
 * - ETag + Cache-Control let browsers and CDNs reuse responses too.
 */
const TTL_MS = Number(process.env.CACHE_TTL_MS) || 30_000;
const MAX_ENTRIES = 1000;
const store = new Map(); // key -> { body, etag, expires }
const inflight = new Map(); // key -> Promise<entry|null>

// Paths (under /api) whose GET responses are identical for every visitor.
const CACHEABLE = /^\/(products(\/(facets|collections|suggest|by-ids|[a-z0-9-]+))?|categories(\/[a-z0-9-]+)?|config|banners|blogs|updates|coupons|reviews\/featured)$/;
// Writes that change what those reads return.
const INVALIDATES = /^\/(admin\/|orders|reviews)/;

export function flushCache({ broadcast = true } = {}) {
  store.clear();
  if (broadcast && cluster.isWorker) process.send?.({ type: 'cache:flush' });
}

// Workers receive flushes relayed by the primary (see server.js).
if (cluster.isWorker) {
  process.on('message', (msg) => msg?.type === 'cache:flush' && flushCache({ broadcast: false }));
}

function send(res, entry, hit) {
  res.set('ETag', entry.etag);
  res.set('Cache-Control', `public, max-age=${Math.round(TTL_MS / 1000)}, stale-while-revalidate=300`);
  res.set('X-Cache', hit);
  if (res.req.headers['if-none-match'] === entry.etag) return res.status(304).end();
  return res.type('application/json').send(entry.body);
}

export function publicCache(req, res, next) {
  // Invalidate after successful catalogue-changing writes.
  if (req.method !== 'GET') {
    if (INVALIDATES.test(req.path)) res.on('finish', () => res.statusCode < 400 && flushCache());
    return next();
  }
  if (!CACHEABLE.test(req.path) || req.query.all) return next();

  const key = req.originalUrl;
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expires > now) return send(res, cached, 'HIT');

  const pending = inflight.get(key);
  if (pending) {
    return pending.then((entry) => (entry ? send(res, entry, 'COALESCED') : next())).catch(next);
  }

  // First request for this URL: let the handler run, capture its JSON, share it.
  let resolve;
  inflight.set(key, new Promise((r) => (resolve = r)));
  const json = res.json.bind(res);
  res.json = (data) => {
    let entry = null;
    if (res.statusCode === 200) {
      const body = JSON.stringify(data);
      entry = { body, etag: `"${crypto.createHash('sha1').update(body).digest('base64url')}"`, expires: Date.now() + TTL_MS };
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value); // drop oldest
      store.set(key, entry);
    }
    inflight.delete(key);
    resolve(entry);
    if (entry) return send(res, entry, 'MISS');
    return json(data);
  };
  // If the handler errors without calling res.json, release the waiters.
  res.on('close', () => {
    if (inflight.get(key)) {
      inflight.delete(key);
      resolve(null);
    }
  });
  return next();
}
