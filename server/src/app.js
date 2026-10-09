import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import env from './config/env.js';
import sanitize from './middleware/sanitize.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';
import { UPLOAD_DIR, readBlob } from './services/upload.service.js';
import * as routes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import seoRoutes from './routes/seo.routes.js';
import { publicCache } from './middleware/cache.js';
import { resizedImages } from './middleware/imageResize.js';

const app = express();

// How many proxies sit in front of the app, so req.ip (used by rate limits) is the visitor's
// real address. Railway alone = 1; Netlify forwarding to Railway (see netlify.toml) = 2.
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // Uploaded images are embedded by the React app on another origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Applies when this server also serves the built React app.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(
  cors({
    origin(origin, cb) {
      // Same-origin requests (production, when this server hosts the React app) are allowed too.
      if (!origin || env.clientUrls.includes(origin) || origin === env.serverUrl) return cb(null, true);
      // Development only: allow phones/tablets on the same Wi-Fi (http://192.168.x.x:3000 etc.).
      if (!env.isProd && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitize);
if (!env.isProd) app.use(morgan('dev'));

// /uploads/x.jpg?w=480 → resized (WebP when supported), generated once and kept on disk.
// Photos uploaded on the live site (Netlify Blobs). File names are unique, so they never change.
app.get('/uploads/blob/:folder/:file', async (req, res, next) => {
  try {
    const file = await readBlob(`${req.params.folder}/${req.params.file}`);
    if (!file) return res.status(404).end();
    res.set({ 'Content-Type': file.type, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.send(Buffer.from(file.data));
  } catch (err) {
    next(err);
  }
});
app.use('/uploads', resizedImages(UPLOAD_DIR));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));

app.use(seoRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

const api = express.Router();
api.use(apiLimiter);
api.use(publicCache);
api.use('/auth', routes.authRoutes);
api.use('/users', routes.userRoutes);
api.use('/products', routes.productRoutes);
api.use('/categories', routes.categoryRoutes);
api.use('/cart', routes.cartRoutes);
api.use('/wishlist', routes.wishlistRoutes);
api.use('/orders', routes.orderRoutes);
api.use('/reviews', routes.reviewRoutes);
api.use('/coupons', routes.couponRoutes);
api.use('/blogs', routes.blogRoutes);
api.use('/updates', routes.updateRoutes);
api.use('/track', routes.trackRoutes);
api.use('/contact', routes.contactRoutes);
api.use('/corporate', routes.corporateRoutes);
api.use('/newsletter', routes.newsletterRoutes);
api.use('/comments', routes.commentRoutes);
api.use('/config', routes.configRoutes);
api.use('/banners', routes.bannerRoutes);
api.use('/admin', adminRoutes);
app.use('/api', api);

// Production: serve the built React app from client/dist with SPA fallback.
// (Not used on Netlify, where the CDN serves the storefront and import.meta.url is undefined.)
const CLIENT_DIST = typeof import.meta.url === 'string' ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist') : '';
if (env.isProd && fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { maxAge: '7d', index: false }));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
