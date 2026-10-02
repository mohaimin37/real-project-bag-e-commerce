import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

// import.meta.url is undefined when bundled for Netlify Functions (CommonJS); uploads are
// read-only there anyway, so a temp folder is a safe fallback.
export const UPLOAD_DIR =
  typeof import.meta.url === 'string' ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads') : path.resolve(process.env.UPLOAD_DIR || '/tmp/uploads');

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

/**
 * Stores an in-memory multer file. Uses Cloudinary when configured, otherwise
 * writes to server/uploads and serves it from /uploads.
 * @returns {{url: string, publicId: string}}
 */
export async function uploadFile(file, subfolder = 'misc') {
  if (env.cloudinary.enabled) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `${env.cloudinary.folder}/${subfolder}`, resource_type: 'auto' },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  // Serverless hosts (Netlify Functions) have no lasting disk, so local files would vanish.
  if (process.env.UPLOADS_READONLY) {
    throw ApiError.badRequest('Photo uploads on the live site need Cloudinary. Add the CLOUDINARY_* keys in your hosting settings.');
  }
  const dir = path.join(UPLOAD_DIR, subfolder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype] || ''}`;
  await fs.writeFile(path.join(dir, name), file.buffer);
  // Relative URL: the client serves /uploads through the same origin (Vite proxy in dev).
  return { url: `/uploads/${subfolder}/${name}`, publicId: `local:${subfolder}/${name}` };
}

export async function uploadMany(files = [], subfolder) {
  return Promise.all(files.map((f) => uploadFile(f, subfolder)));
}

export async function deleteFile(publicId) {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) {
      const rel = publicId.slice(6);
      const target = path.resolve(UPLOAD_DIR, rel);
      if (target.startsWith(UPLOAD_DIR)) await fs.unlink(target);
    } else if (env.cloudinary.enabled) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.warn(`Could not delete file ${publicId}: ${err.message}`);
  }
}
