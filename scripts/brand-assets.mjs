// Builds every logo file the site uses from the master logo (brandlogo.jpeg in the repo root).
// Run after replacing the master: node scripts/brand-assets.mjs
// Crops only ever add the logo's own background colour, so the artwork is never stretched or recoloured.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(path.join(root, 'server/package.json'))('sharp');

const SRC = path.join(root, 'brandlogo.jpeg');
const PUBLIC = path.join(root, 'client/public');
const BRAND = path.join(PUBLIC, 'brand');
fs.mkdirSync(BRAND, { recursive: true });

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const px = (x, y) => (y * width + x) * channels;
const isInk = (x, y) => data[px(x, y)] + data[px(x, y) + 1] > 200; // gold artwork vs near-black background
const bg = { r: data[0], g: data[1], b: data[2] };

/** Bounding box of the artwork, optionally limited to rows y0..y1. */
function bbox(y0 = 0, y1 = height) {
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = y0; y < y1; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isInk(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** The empty row between the "W" mark and the WILDTANE lettering. */
function gapRow(box) {
  let run = 0;
  for (let y = box.top; y < box.top + box.height; y += 1) {
    let ink = false;
    for (let x = box.left; x < box.left + box.width && !ink; x += 1) ink = isInk(x, y);
    run = ink ? 0 : run + 1;
    if (run >= 8) return y;
  }
  return box.top + box.height;
}

/** Crop a box tightly, then pad it with fresh background (never with neighbouring artwork). */
async function framed(box, pad, square = false) {
  const w = square ? Math.max(box.width, box.height) : box.width;
  const h = square ? w : box.height;
  const x = Math.floor((w - box.width) / 2);
  const y = Math.floor((h - box.height) / 2);
  const tight = await sharp(SRC).extract(box).png().toBuffer();
  return sharp(tight).extend({ top: pad + y, bottom: pad + h - box.height - y, left: pad + x, right: pad + w - box.width - x, background: bg });
}

const all = bbox();
const split = gapRow(all);
const mark = bbox(all.top, split);
const name = bbox(split, all.top + all.height);
const save = async (img, file) => {
  await img.toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`${path.relative(root, file)}  ${meta.width}x${meta.height}`);
};
const asBuffer = (img) => img.png().toBuffer();

// Full square logo (About page, auth screens, link previews).
await save(sharp(SRC).resize(800).jpeg({ quality: 88, mozjpeg: true }), path.join(BRAND, 'logo-full.jpg'));
await save(sharp(SRC).resize(800).webp({ quality: 88 }), path.join(BRAND, 'logo-full.webp'));

// Stacked lockup exactly as designed (mark over name), tightly framed.
const stacked = await asBuffer(await framed(all, Math.round(all.height * 0.12)));
await save(sharp(stacked).resize({ height: 240 }).png({ compressionLevel: 9 }), path.join(BRAND, 'logo-stacked.png'));

// Horizontal lockup for slim bars (header, footer, checkout): the same mark and lettering at the
// same scale, side by side, so the name stays readable at 40px tall.
const gap = Math.round(mark.height * 0.16);
const pad = Math.round(mark.height * 0.14);
const markPng = await sharp(SRC).extract(mark).png().toBuffer();
const namePng = await sharp(SRC).extract(name).png().toBuffer();
const lockW = mark.width + gap + name.width + pad * 2;
const lockH = mark.height + pad * 2;
const horizontal = await sharp({ create: { width: lockW, height: lockH, channels: 3, background: bg } })
  .composite([
    { input: markPng, left: pad, top: pad },
    { input: namePng, left: pad + mark.width + gap, top: pad + Math.round((mark.height - name.height) / 2) },
  ])
  .png()
  .toBuffer();
await save(sharp(horizontal).resize({ height: 120 }).png({ compressionLevel: 9 }), path.join(BRAND, 'logo-horizontal.png'));
await save(sharp(horizontal).resize({ height: 120 }).webp({ quality: 90 }), path.join(BRAND, 'logo-horizontal.webp'));

// "W" mark alone, square (compact spots and the favicon).
const markSq = await asBuffer(await framed(mark, Math.round(mark.height * 0.18), true));
await save(sharp(markSq).resize(256).png({ compressionLevel: 9 }), path.join(BRAND, 'logo-mark.png'));
await save(sharp(markSq).resize(64).png({ compressionLevel: 9 }), path.join(PUBLIC, 'favicon.png'));

// Gold-on-transparent versions for dark themes: the black background is un-mixed into alpha,
// so the gold artwork itself is unchanged when shown on any dark surface.
async function onTransparent(png) {
  const { data: px, info: i } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(i.width * i.height * 4);
  for (let p = 0, q = 0; p < px.length; p += 3, q += 4) {
    const a = Math.min(1, Math.max(0, Math.max(px[p] - bg.r, px[p + 1] - bg.g, px[p + 2] - bg.b) / 110));
    for (let c = 0; c < 3; c += 1) out[q + c] = a ? Math.min(255, Math.round((px[p + c] - [bg.r, bg.g, bg.b][c] * (1 - a)) / a)) : 0;
    out[q + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: i.width, height: i.height, channels: 4 } });
}

// Dark-on-transparent versions for light themes (pure luxury obsidian/cognac ink, floating with no black tile).
async function toDark(png, [r, g, b] = [18, 18, 18]) {
  const { data: px, info: i } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(i.width * i.height * 4);
  for (let p = 0; p < px.length; p += 4) {
    out[p] = r;
    out[p + 1] = g;
    out[p + 2] = b;
    out[p + 3] = px[p + 3];
  }
  return sharp(out, { raw: { width: i.width, height: i.height, channels: 4 } });
}

const horizontalGold = await (await onTransparent(horizontal)).png().toBuffer();
await save(sharp(horizontalGold).resize({ height: 120 }).png({ compressionLevel: 9 }), path.join(BRAND, 'logo-horizontal-gold.png'));
await save(sharp(horizontalGold).resize({ height: 120 }).webp({ quality: 90, alphaQuality: 100 }), path.join(BRAND, 'logo-horizontal-gold.webp'));

const horizontalDark = await (await toDark(horizontalGold)).png().toBuffer();
await save(sharp(horizontalDark).resize({ height: 120 }).png({ compressionLevel: 9 }), path.join(BRAND, 'logo-horizontal-dark.png'));
await save(sharp(horizontalDark).resize({ height: 120 }).webp({ quality: 90, alphaQuality: 100 }), path.join(BRAND, 'logo-horizontal-dark.webp'));

const markGold = await (await onTransparent(markSq)).png().toBuffer();
await save(sharp(markGold).resize(256).png({ compressionLevel: 9 }), path.join(BRAND, 'logo-mark-gold.png'));
await save(sharp(markGold).resize(256).webp({ quality: 90, alphaQuality: 100 }), path.join(BRAND, 'logo-mark-gold.webp'));

const markDark = await (await toDark(markGold)).png().toBuffer();
await save(sharp(markDark).resize(256).png({ compressionLevel: 9 }), path.join(BRAND, 'logo-mark-dark.png'));
await save(sharp(markDark).resize(256).webp({ quality: 90, alphaQuality: 100 }), path.join(BRAND, 'logo-mark-dark.webp'));

// Branded SVG favicon with gold mark
const goldBase64 = (await sharp(markGold).resize(192).png().toBuffer()).toString('base64');
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" rx="52" fill="#141414"/>
  <image href="data:image/png;base64,${goldBase64}" x="32" y="32" width="192" height="192"/>
</svg>\n`;
fs.writeFileSync(path.join(PUBLIC, 'favicon.svg'), faviconSvg);
console.log('client/public/favicon.svg 256x256');

// App icons: the full logo already leaves the maskable safe zone clear.
await save(sharp(SRC).resize(512).png({ compressionLevel: 9 }), path.join(PUBLIC, 'logo.png'));
await save(sharp(SRC).resize(512).png({ compressionLevel: 9 }), path.join(PUBLIC, 'logo-512.png'));
await save(sharp(SRC).resize(192).png({ compressionLevel: 9 }), path.join(PUBLIC, 'logo-192.png'));
await save(sharp(SRC).resize(180).png({ compressionLevel: 9 }), path.join(PUBLIC, 'apple-touch-icon.png'));
