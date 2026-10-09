// Turns a theme's seed colours into the site's CSS colour tokens and applies them.
// Applying a theme only rewrites one <style> tag of CSS variables, so it is instant: nothing
// re-renders, reloads or refetches. The generated CSS is cached in localStorage so the boot
// script (public/theme.js) can apply it before the first paint.

import { CUSTOM_DEFAULTS, CUSTOM_THEME, DEFAULT_THEME, READABLE_FONT_HREF, THEMES, VISION_DEFAULTS } from './themes';

// ── Colour maths ─────────────────────────────────────────────

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const NEAR_BLACK = [17, 17, 17];

export function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = Number.parseInt(h, 16);
  return Number.isNaN(n) || h.length !== 6 ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function luminance(c) {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio (1–21). */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** Nudges `fg` towards black or white until it reaches `min` contrast against every background. */
function ensureContrast(fg, bgs, min) {
  const list = Array.isArray(bgs[0]) ? bgs : [bgs];
  const ok = (c) => list.every((bg) => contrast(c, bg) >= min);
  if (ok(fg)) return fg;
  const target = luminance(list[0]) > 0.18 ? BLACK : WHITE;
  for (let t = 0.05; t < 1; t += 0.05) {
    const c = mix(fg, target, t);
    if (ok(c)) return c;
  }
  return target;
}
/** Black-ish or white text, whichever reads better on `bg`. */
const readableOn = (bg) => {
  if (contrast(WHITE, bg) >= contrast(NEAR_BLACK, bg)) return WHITE;
  return contrast(NEAR_BLACK, bg) >= 4.5 ? NEAR_BLACK : BLACK;
};

function toHsl([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h / 6, s, l];
}
function fromHsl([h, s, l]) {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const withLightness = (c, l, maxS = 1) => {
  const [h, s] = toHsl(c);
  return fromHsl([h, Math.min(s, maxS), l]);
};

// ── Seeds → tokens ───────────────────────────────────────────

/**
 * Expands seed colours into every token in tailwind.config.js. Text colours are corrected for
 * contrast here, so no theme (including a shopper's Custom one) can make text unreadable.
 */
export function expandSeeds(seedHex, mode, notes) {
  const dark = mode === 'dark';
  const S = Object.fromEntries(Object.entries(seedHex).map(([k, v]) => [k, hexToRgb(v)]));
  const { background: bg, card, band } = S;
  const note = (msg) => notes && !notes.includes(msg) && notes.push(msg);

  const step = dark ? [0.03, 0.06, 0.1, 0.16] : [0.025, 0.055, 0.09, 0.14];
  const text = ensureContrast(S.text, [card, bg], 7);
  if (contrast(S.text, card) < 7) note('Text colour was adjusted so it stays easy to read.');
  // Secondary text must also read on the tinted panels (inputs, chips).
  const muted = ensureContrast(S.mutedText, [card, bg, mix(card, text, step[1])], 4.5);
  const brand = ensureContrast(S.primary, [card, bg], 4.5);
  if (contrast(S.primary, card) < 4.5) note('Primary colour was adjusted so links stay readable.');
  // Buttons must stand out from the page (3:1 for UI parts) and carry readable labels (4.5:1).
  const btn = ensureContrast(S.buttonBackground, card, 3);
  if (contrast(S.buttonBackground, card) < 3) note('Button colour was adjusted so buttons stand out from the page.');
  const btnText = contrast(S.buttonText, btn) >= 4.5 ? S.buttonText : readableOn(btn);
  const bandText = ensureContrast(S.bandText, band, 7);
  const accent = ensureContrast(S.accent, band, 4.5);
  const error = ensureContrast(S.error, card, 4.5);
  const success = ensureContrast(S.success, card, 4.5);
  const warning = ensureContrast(S.warning, card, 4.5);

  const container = (t) => mix(card, text, t);
  const inverseSurface = dark ? text : mix(text, card, 0.08);
  const secondaryContainer = mix(card, brand, dark ? 0.25 : 0.12);
  const secondaryFixed = mix(WHITE, brand, 0.18);

  return {
    background: bg,
    'on-background': text,
    surface: bg,
    'surface-bright': dark ? mix(card, text, 0.12) : mix(bg, WHITE, 0.5),
    'surface-dim': dark ? bg : mix(bg, text, 0.1),
    'surface-tint': brand,
    'surface-variant': mix(card, text, dark ? 0.1 : 0.07),
    'surface-container-lowest': card,
    'surface-container-low': container(step[0]),
    'surface-container': container(step[1]),
    'surface-container-high': container(step[2]),
    'surface-container-highest': container(step[3]),
    'on-surface': text,
    'on-surface-variant': muted,
    'inverse-surface': inverseSurface,
    'inverse-on-surface': dark ? card : bg,
    // Brand colour on the inverse surface (light in light mode, dark in dark mode).
    'inverse-primary': ensureContrast(dark ? mix(brand, BLACK, 0.45) : mix(brand, WHITE, 0.5), inverseSurface, 4.5),
    outline: ensureContrast(mix(muted, bg, 0.3), card, 3),
    'outline-variant': S.border,
    primary: btn,
    'on-primary': btnText,
    'primary-container': mix(btn, bg, 0.08),
    'on-primary-container': mix(btnText, btn, 0.25),
    'primary-fixed': container(step[1]),
    'primary-fixed-dim': container(step[3]),
    secondary: brand,
    'on-secondary': readableOn(brand),
    'secondary-container': secondaryContainer,
    'on-secondary-container': ensureContrast(dark ? mix(brand, WHITE, 0.6) : mix(brand, BLACK, 0.35), secondaryContainer, 4.5),
    'secondary-fixed': secondaryFixed,
    'secondary-fixed-dim': mix(WHITE, brand, 0.4),
    'on-secondary-fixed': ensureContrast(mix(brand, BLACK, 0.6), [secondaryFixed, secondaryContainer], 4.5),
    tertiary: text,
    'on-tertiary': card,
    'tertiary-container': mix(accent, BLACK, 0.75),
    'on-tertiary-container': dark ? accent : ensureContrast(mix(accent, BLACK, 0.3), card, 3),
    'tertiary-fixed': mix(WHITE, accent, 0.25),
    'tertiary-fixed-dim': mix(WHITE, accent, 0.55),
    error,
    'on-error': readableOn(error),
    'error-container': mix(card, error, dark ? 0.3 : 0.15),
    'on-error-container': dark ? mix(error, WHITE, 0.7) : mix(error, BLACK, 0.4),
    ink: band,
    'on-ink': bandText,
    band,
    'on-band': bandText,
    accent,
    'on-accent': readableOn(accent),
    success,
    'on-success': readableOn(success),
    warning,
    'on-warning': readableOn(warning),
  };
}

/**
 * Seeds for the shopper's Custom theme. The chosen background/text are used as picked in the
 * matching mode; in the other mode they are flipped to a light or dark version of the same hue
 * so Light and Dark stay genuinely light and dark.
 */
export function customSeeds(custom, mode, notes) {
  const c = { ...CUSTOM_DEFAULTS, ...custom };
  const dark = mode === 'dark';
  const note = (msg) => notes && notes.push(msg);
  let bg = hexToRgb(c.background);
  let text = hexToRgb(c.text);
  const [, , bgL] = toHsl(bg);
  if (dark && bgL > 0.35) {
    bg = withLightness(bg, 0.07, 0.35);
    note('Dark mode uses a dark version of your background.');
  } else if (!dark && bgL < 0.65) {
    bg = withLightness(bg, 0.97);
    note('Light mode uses a light version of your background.');
  }
  const [, , textL] = toHsl(text);
  if (dark && textL < 0.6) text = withLightness(text, 0.93);
  else if (!dark && textL > 0.4) text = withLightness(text, 0.12);

  // Brand and button colours keep their hue but flip lightness when they would vanish in this mode.
  const fit = (hex) => {
    const rgb = hexToRgb(hex);
    const [, , l] = toHsl(rgb);
    if (dark && l < 0.45) return withLightness(rgb, 0.72);
    if (!dark && l > 0.6) return withLightness(rgb, 0.4);
    return rgb;
  };
  const primary = fit(c.primary);
  const accent = hexToRgb(c.accent);
  const button = fit(c.buttonBackground);
  const card = dark ? mix(bg, WHITE, 0.05) : mix(bg, WHITE, 0.75);
  const band = withLightness(primary, dark ? 0.13 : 0.12, 0.6);
  const base = THEMES.default[mode];
  return {
    background: rgbToHex(bg),
    card: rgbToHex(card),
    text: rgbToHex(text),
    mutedText: rgbToHex(mix(text, bg, 0.4)),
    border: rgbToHex(mix(bg, text, dark ? 0.16 : 0.12)),
    primary: rgbToHex(primary),
    accent: rgbToHex(accent),
    buttonBackground: rgbToHex(button),
    buttonText: rgbToHex(readableOn(button)),
    band: rgbToHex(band),
    bandText: '#fdfbf7',
    success: base.success,
    warning: base.warning,
    error: base.error,
  };
}

// ── Theme → CSS ──────────────────────────────────────────────

const resolve = (themeId) => (themeId === CUSTOM_THEME ? THEMES.default : THEMES[themeId] || THEMES[DEFAULT_THEME]);

/** The theme's design (themes.js DESIGNS), applied as data-design. */
export const designOf = (themeId) => resolve(themeId).design || 'classic';
/** Token map (name → "r g b") for a theme in one mode. */
export function themeTokens(themeId, mode, custom, notes) {
  const seeds = themeId === CUSTOM_THEME ? customSeeds(custom, mode, notes) : resolve(themeId)[mode];
  const tokens = expandSeeds(seeds, mode, notes);
  return Object.fromEntries(Object.entries(tokens).map(([k, c]) => [k, c.map((v) => Math.round(Math.min(255, Math.max(0, v)))).join(' ')]));
}

/** Non-colour variables a theme may change (fonts, shadow tint, band gradient). */
// Defaults mirror :root in src/index.css. Every theme sets all of them, so a scoped preview never
// inherits the page's current theme (e.g. a gradient or font from another theme).
const EXTRA_DEFAULTS = {
  '--font-sans': "'Plus Jakarta Sans', system-ui, sans-serif",
  '--font-display': "'DM Serif Display', Georgia, serif",
  '--display-weight': '400',
  '--display-tracking': '-0.005em',
  '--c-shadow': '0 0 0',
  '--band-image': 'none',
  '--radius-scale': '1',
};
function extras(themeId) {
  const t = resolve(themeId);
  const out = { ...EXTRA_DEFAULTS };
  if (t.fonts?.display) out['--font-display'] = t.fonts.display;
  if (t.fonts?.sans) out['--font-sans'] = t.fonts.sans;
  if (t.displayWeight) out['--display-weight'] = String(t.displayWeight);
  if (t.displayTracking) out['--display-tracking'] = t.displayTracking;
  if (t.shadow) out['--c-shadow'] = t.shadow;
  if (t.bandImage) out['--band-image'] = t.bandImage;
  if (t.radius) out['--radius-scale'] = String(t.radius);
  return out;
}

/** Inline style for a scoped preview: the same classes render in that theme's colours. */
export function previewStyle(themeId, mode, custom) {
  const vars = Object.fromEntries(Object.entries(themeTokens(themeId, mode, custom)).map(([k, v]) => [`--c-${k}`, v]));
  return { ...vars, ...extras(themeId) };
}

function cssFor(themeId, mode, custom) {
  // Default (and Custom's untouched base) live in src/index.css; nothing to override.
  if (themeId !== CUSTOM_THEME && resolve(themeId).base) return '';
  const vars = { ...previewStyle(themeId, mode, custom) };
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('');
  // html:root outranks both :root and [data-theme='dark'] in index.css.
  return `html:root{${body}}`;
}

// ── Applying ─────────────────────────────────────────────────

export const STORAGE = {
  mode: 'wt-theme', // 'light' | 'dark' | 'system' (only once the shopper picks one)
  theme: 'wt-palette', // chosen theme id (only once the shopper picks one)
  custom: 'wt-custom-theme', // Custom theme colours
  css: 'wt-theme-css', // generated CSS for the boot script
  site: 'wt-site-appearance', // store defaults from Admin → Settings, cached for the boot script
  vision: 'wt-vision', // vision settings (text size, readable font, link underlines, motion)
};

const loadedFonts = new Set();
function loadFont(href) {
  if (!href || loadedFonts.has(href) || document.querySelector(`link[href="${href}"]`)) return;
  loadedFonts.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/** Applies the shopper's vision settings (text size, readable font, link underlines, motion). */
export function applyVision(vision) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const v = { ...VISION_DEFAULTS, ...vision };
  const set = (key, value) => (value ? (root.dataset[key] = value) : delete root.dataset[key]);
  set('textSize', v.textSize !== 'standard' && v.textSize);
  set('corners', v.corners !== 'theme' && v.corners);
  set('readableFont', v.readableFont && 'on');
  set('underlineLinks', v.underlineLinks && 'on');
  set('reduceMotion', v.reduceMotion && 'on');
  if (v.readableFont) loadFont(READABLE_FONT_HREF);
}

/** True when the shopper (browser or vision settings) asked for less motion. */
export const prefersReducedMotion = () =>
  document.documentElement.dataset.reduceMotion === 'on' || matchMedia('(prefers-reduced-motion: reduce)').matches;

let transitionTimer;
/**
 * Applies a theme + appearance to the page. Cheap enough to call on every change.
 * `animate` cross-fades colours for ~250ms (skipped when the shopper prefers reduced motion).
 */
export function applyTheme({ themeId, mode, custom, animate = false }) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const id = (THEMES[themeId] || themeId === CUSTOM_THEME) ? themeId : DEFAULT_THEME;
  const css = { id, design: designOf(id), light: cssFor(id, 'light', custom), dark: cssFor(id, 'dark', custom), font: resolve(id).fonts?.href || null };

  if (animate && !prefersReducedMotion()) {
    root.classList.add('theme-transition');
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => root.classList.remove('theme-transition'), 300);
  }

  let style = document.getElementById('wt-theme-vars');
  if (!style) {
    style = document.createElement('style');
    style.id = 'wt-theme-vars';
    document.head.appendChild(style);
  }
  style.textContent = css[mode] || '';
  if (mode === 'dark') root.dataset.theme = 'dark';
  else root.dataset.theme = 'light';
  root.dataset.palette = id;
  root.dataset.design = css.design;
  loadFont(css.font);

  // Browser chrome (mobile address bar) follows the page background.
  const bg = getComputedStyle(root).getPropertyValue('--c-surface').trim().split(/\s+/).map(Number);
  if (bg.length === 3) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', rgbToHex(bg)));

  try {
    localStorage.setItem(STORAGE.css, JSON.stringify(css));
  } catch {
    /* storage unavailable — the theme still applies for this visit */
  }
}
