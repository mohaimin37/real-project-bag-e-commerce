// Netlify Function wrapping the Express API in server/ (all routes under /api, plus the sitemap and robots.txt).
if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = '/var/task/client/netlify/functions/api.js';
}
export { handler } from '../../../server/src/netlify.js';
