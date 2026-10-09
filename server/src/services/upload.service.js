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

  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype] || ''}`;

  // Serverless hosts (Netlify Functions) have no lasting disk: keep the file in Netlify Blobs instead.
  if (process.env.UPLOADS_READONLY) {
    const key = `${subfolder}/${name}`;
    await (await blobStore()).set(key, file.buffer, { metadata: { type: file.mimetype } });
    return { url: `/uploads/blob/${key}`, publicId: `blob:${key}` };
  }
  const dir = path.join(UPLOAD_DIR, subfolder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), file.buffer);
  // Relative URL: the client serves /uploads through the same origin (Vite proxy in dev).
  return { url: `/uploads/${subfolder}/${name}`, publicId: `local:${subfolder}/${name}` };
}

/** Netlify Blobs store for uploads on the live site (loaded only there). */
async function blobStore() {
  const { getStore } = await import('@netlify/blobs');
  // Default (eventual) consistency: every upload gets a new unique key, so a stale read can't happen.
  return getStore('uploads');
}

/** Reads a file saved by uploadFile in Netlify Blobs: { data: ArrayBuffer, type } or null. */
export async function readBlob(key) {
  if (!/^[\w-]+\/[\w.-]+$/.test(key)) return null;
  const res = await (await blobStore()).getWithMetadata(key, { type: 'arrayBuffer' });
  return res ? { data: res.data, type: res.metadata?.type || 'application/octet-stream' } : null;
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
    } else if (publicId.startsWith('blob:')) {
      await (await blobStore()).delete(publicId.slice(5));
    } else if (env.cloudinary.enabled) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.warn(`Could not delete file ${publicId}: ${err.message}`);
  }
}
