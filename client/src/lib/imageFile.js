/**
 * Shrinks large photos in the browser before upload: faster on mobile data and
 * keeps phone camera photos (often 5–12 MB) under the server's 5 MB limit.
 * Vector files, PDFs and GIFs (animation) are passed through untouched.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const RESIZABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall back to <img> below (e.g. older Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Returns a smaller JPEG/WebP when the file is big; otherwise the original file. */
export async function prepareImage(file, { maxSide = 1600, quality = 0.85, keepUnder = 900 * 1024 } = {}) {
  if (!RESIZABLE.includes(file.type) && !/\.(heic|heif)$/i.test(file.name)) return file;
  let source;
  try {
    source = await decode(file);
  } catch {
    return file; // the server will give a clear error if it really can't be read
  }
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  if (scale === 1 && file.size <= keepUnder && file.type !== 'image/heic') return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  // PNGs with transparency (logos) stay PNG/WebP; photos become JPEG.
  const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
  if (!keepAlpha) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  const type = keepAlpha ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
  return new File([blob], name, { type, lastModified: Date.now() });
}

export const prettySize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
