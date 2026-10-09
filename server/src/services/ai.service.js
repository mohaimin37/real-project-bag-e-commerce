import fs from 'fs/promises';
import path from 'path';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { UPLOAD_DIR, readBlob } from './upload.service.js';

/*
 * Free product writer on Google Gemini (free tier, key from aistudio.google.com).
 * It looks at the product photos and the name, and returns a ready listing as JSON.
 */

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
// The configured model first (lite by default: fast and rarely "high demand"), then the others as backups.
const MODELS = [...new Set([env.gemini.model, 'gemini-flash-lite-latest', 'gemini-flash-latest'])];
// The admin's browser gives up after 60s, so all attempts together must finish before that.
// Netlify Functions are stopped sooner, so the live site gets a shorter budget.
const TOTAL_MS = process.env.UPLOADS_READONLY ? 24000 : 50000;
const PER_MODEL_MS = process.env.UPLOADS_READONLY ? 16000 : 25000;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const MAX_IMAGE = 4 * 1024 * 1024;

/** Reads a stored product photo (local /uploads path or a CDN URL) as base64 for Gemini. */
async function loadImage(url) {
  try {
    if (url.startsWith('/uploads/blob/')) {
      const file = await readBlob(url.slice('/uploads/blob/'.length));
      return file && Object.values(MIME).includes(file.type) && file.data.byteLength <= MAX_IMAGE
        ? { mime_type: file.type, data: Buffer.from(file.data).toString('base64') }
        : null;
    }
    if (url.startsWith('/uploads/')) {
      const file = path.resolve(UPLOAD_DIR, url.slice('/uploads/'.length));
      const mime = MIME[path.extname(file).toLowerCase()];
      if (!file.startsWith(UPLOAD_DIR) || !mime) return null;
      const buf = await fs.readFile(file);
      return buf.length <= MAX_IMAGE ? { mime_type: mime, data: buf.toString('base64') } : null;
    }
    if (/^https:\/\//.test(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const mime = res.headers.get('content-type')?.split(';')[0];
      if (!res.ok || !Object.values(MIME).includes(mime)) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length <= MAX_IMAGE ? { mime_type: mime, data: buf.toString('base64') } : null;
    }
  } catch {
    /* a photo we can't read just isn't sent */
  }
  return null;
}

function buildPrompt({ name, price, priceRange, subcategories }) {
  return [
    'You write product listings for WILDTANE, an online bag and travel-accessories store in India (prices in INR).',
    name ? `The product is called: "${name}".` : 'The product has no name yet: suggest a short, clear one (max 6 words).',
    price ? `Planned price: ₹${price}.` : '',
    priceRange ? `Similar products in the store sell for ₹${priceRange.min}–₹${priceRange.max}.` : '',
    'Look carefully at the photo(s): colour, material, size, compartments, straps, zips.',
    `Pick the best "type" from this exact list: ${subcategories.join(' | ')}.`,
    'Write in simple, honest English for Indian shoppers. Do not invent brand names, certifications or warranties.',
    'Return JSON with these keys:',
    'name (string), type (string from the list), tagline (max 6 words), shortDescription (max 250 chars), description (2 short paragraphs),',
    'price (number, INR), capacity (e.g. "24L" or ""), gender ("unisex"|"women"|"men"), materials (max 3 strings), features (max 5 strings),',
    'purposes (any of: work, travel, transit, business, creative), tags (5-8 lowercase search words),',
    'colours (array of {name, hex} for the colour(s) you see), specifications (array of {label, value}, only facts visible or typical), faqs (3 short {question, answer}).',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function writeListing({ name, price, priceRange, subcategories, imageUrls = [] }) {
  if (!env.gemini.enabled) throw ApiError.badRequest('AI writer is not set up yet. Add a free GEMINI_API_KEY in server/.env.');
  const images = (await Promise.all(imageUrls.slice(0, 3).map(loadImage))).filter(Boolean);
  if (!name && !images.length) throw ApiError.badRequest('Add a product name or a photo first');

  const body = {
    contents: [{ role: 'user', parts: [{ text: buildPrompt({ name, price, priceRange, subcategories }) }, ...images.map((inline_data) => ({ inline_data }))] }],
    // Without "low" thinking the flash models can think for over a minute on a simple listing.
    generationConfig: { responseMimeType: 'application/json', temperature: 0.6, thinkingConfig: { thinkingLevel: 'low' } },
  };

  const deadline = Date.now() + TOTAL_MS;
  let lastError;
  for (const model of MODELS) {
    const timeLeft = Math.min(PER_MODEL_MS, deadline - Date.now());
    if (timeLeft < 3000) break;
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.gemini.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeLeft),
    }).catch((err) => ({ ok: false, status: 0, text: async () => err.message }));

    if (res.ok) {
      // eslint-disable-next-line no-await-in-loop
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      try {
        return { listing: JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim()), model, usedPhotos: images.length };
      } catch {
        throw ApiError.badRequest('The AI answer was incomplete. Please try again.');
      }
    }
    // eslint-disable-next-line no-await-in-loop
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429) throw ApiError.badRequest('Free AI limit reached for now. Wait a minute and try again.');
    if (res.status === 400 && /API key/i.test(detail)) throw ApiError.badRequest('The GEMINI_API_KEY in server/.env is not valid.');
    lastError = `${model}: ${res.status} ${detail}`;
    // A timeout (0), an unknown model (404) or a busy one (500/503) is worth trying the next model for.
    if (![0, 404, 500, 503].includes(res.status)) break;
  }
  console.warn('Gemini error', lastError);
  throw ApiError.badRequest('Google’s free AI is busy right now. Please try again in a minute.');
}
