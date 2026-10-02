// Netlify Function wrapping the Express API in server/ (all routes under /api, plus the sitemap and robots.txt).
export { handler } from '../../../server/src/netlify.js';
