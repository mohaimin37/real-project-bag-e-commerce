import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Allowed widths keep the cache small and stop arbitrary-size requests from burning CPU.
const WIDTHS = new Set([160, 320, 480, 640, 960, 1280]);
const inflight = new Map(); // output path -> Promise (so a burst of requests resizes once)

sharp.cache(false); // results are kept on disk instead

/**
 * Serves /uploads/<file>?w=<width> as a resized image: WebP for browsers that accept it,
 * JPEG otherwise. Each size is generated once and stored in uploads/.cache/.
 * Requests without a valid ?w fall through to the normal static file.
 */
export function resizedImages(uploadDir) {
  const root = path.resolve(uploadDir);
  return async (req, res, next) => {
    const width = Number(req.query.w);
    if (req.method !== 'GET' || !WIDTHS.has(width)) return next();
    let rel;
    try {
      rel = decodeURIComponent(req.path);
    } catch {
      return next();
    }
    if (!/\.(jpe?g|png|webp)$/i.test(rel)) return next();
    const src = path.resolve(root, `.${rel}`);
    if (!src.startsWith(root + path.sep) || src.includes(`${path.sep}.cache${path.sep}`)) return next(); // no path tricks

    const webp = /image\/webp/.test(req.headers.accept || '');
    const ext = webp ? 'webp' : 'jpg';
    const out = path.join(root, '.cache', String(width), rel.replace(/\.\w+$/, `.${ext}`));
    try {
      if (!fs.existsSync(out)) {
        if (!fs.existsSync(src)) return next();
        let job = inflight.get(out);
        if (!job) {
          job = (async () => {
            await fs.promises.mkdir(path.dirname(out), { recursive: true });
            const tmp = `${out}.${process.pid}.tmp`;
            const img = sharp(src).rotate().resize({ width, withoutEnlargement: true });
            await (webp ? img.webp({ quality: 76, effort: 4 }) : img.jpeg({ quality: 78, mozjpeg: true })).toFile(tmp);
            await fs.promises.rename(tmp, out);
          })().finally(() => inflight.delete(out));
          inflight.set(out, job);
        }
        await job;
      }
      res.set('Vary', 'Accept');
      res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      return res.type(ext).sendFile(out);
    } catch {
      return next(); // fall back to the original file
    }
  };
}
