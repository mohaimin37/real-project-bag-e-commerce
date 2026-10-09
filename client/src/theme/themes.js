// Every storefront theme in one place.
//
// A theme is a small set of *seed* colours per appearance mode (light and dark). The engine
// (./engine.js) expands the seeds into the full token set the site already uses (--c-surface,
// --c-secondary, … see src/index.css), checks contrast, and applies them as CSS variables.
// Appearance (light/dark) and theme are independent: every theme defines both modes.
//
// Seed keys
//   background  page background            card        product cards, panels, header
//   text        main text                  mutedText   secondary text
//   border      hairlines, dividers        primary     brand colour: links, active states, highlights
//   accent      decorative highlight (eyebrows on dark bands, quote marks, coin glints)
//   buttonBackground / buttonText          main call-to-action buttons
//   band / bandText   always-dark promo panels (offer banner, section heroes)
//   success / warning / error
//
// Optional per theme: fonts (display + sans body font, href loads them), displayWeight, radius
// (corner roundness, 1 = default), bandImage (gradient laid over the band colour), shadow (RGB tint
// of shadows), alwaysOn (accessibility themes the admin cannot switch off).
// What first-time visitors see when the store has no default saved (Admin → Settings → Appearance).
export const DEFAULT_THEME = 'default';
export const DEFAULT_MODE = 'dark';
export const CUSTOM_THEME = 'custom';

const FONT_URL = (...families) => `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;

export const THEMES = {
  default: {
    name: 'Default',
    tagline: 'Clean white & cognac, easy to read from afar',
    // The default theme is the stylesheet itself (src/index.css), so it is never overridden.
    // These seeds only describe it for previews and as the starting point of the Custom editor.
    base: true,
    light: {
      background: '#f6f6f4', card: '#ffffff', text: '#111111', mutedText: '#42403c', border: '#d6d4ce',
      primary: '#8a4b1f', accent: '#e2b53e', buttonBackground: '#111111', buttonText: '#ffffff',
      band: '#0e0e0e', bandText: '#ffffff', success: '#047857', warning: '#b45309', error: '#b42318',
    },
    dark: {
      background: '#0c0c0c', card: '#161616', text: '#f5f5f3', mutedText: '#cccac4', border: '#464644',
      primary: '#e2aa76', accent: '#e2b53e', buttonBackground: '#f5f5f3', buttonText: '#121212',
      band: '#0e0e0e', bandText: '#ffffff', success: '#34d399', warning: '#fbbf24', error: '#ffb0a4',
    },
  },

  luxury: {
    name: 'Luxury',
    tagline: 'Noir & gold, from the WILDTANE logo',
    fonts: { display: "'Cormorant Garamond', Georgia, serif", sans: "'Jost', system-ui, sans-serif", href: FONT_URL('Cormorant+Garamond:wght@600;700', 'Jost:wght@400;500;600;700') },
    displayWeight: 600,
    radius: 0.35,
    light: {
      background: '#f1e8d4', card: '#fffdf7', text: '#111111', mutedText: '#5c574d', border: '#e0d3b6',
      primary: '#8a6510', accent: '#d4a72c', buttonBackground: '#111111', buttonText: '#f1cf67',
      band: '#0b0b0b', bandText: '#f6f0e0', success: '#1f7a4a', warning: '#a86207', error: '#b42318',
    },
    dark: {
      background: '#0e0b05', card: '#18140c', text: '#f3eee2', mutedText: '#aaa392', border: '#2c2923',
      primary: '#e2b53e', accent: '#e2b53e', buttonBackground: '#e2b53e', buttonText: '#111111',
      band: '#16130d', bandText: '#f6f0e0', success: '#6fcf97', warning: '#f2c94c', error: '#ff8a80',
    },
    bandImage: 'linear-gradient(135deg, rgb(255 215 120 / 0.10), transparent 55%)',
  },

  modern: {
    name: 'Modern',
    tagline: 'Slate & electric blue, crisp and bold',
    fonts: { display: "'Plus Jakarta Sans', system-ui, sans-serif" },
    displayWeight: 800,
    displayTracking: '-0.025em',
    radius: 0.6,
    light: {
      background: '#e7eef8', card: '#ffffff', text: '#0f172a', mutedText: '#556074', border: '#d3ddeb',
      primary: '#2563eb', accent: '#38bdf8', buttonBackground: '#0f172a', buttonText: '#ffffff',
      band: '#0f172a', bandText: '#f8fafc', success: '#047857', warning: '#b45309', error: '#c81e1e',
    },
    dark: {
      background: '#0a1224', card: '#111b31', text: '#e6eaf2', mutedText: '#98a2b3', border: '#263042',
      primary: '#60a5fa', accent: '#38bdf8', buttonBackground: '#60a5fa', buttonText: '#0a0e16',
      band: '#131c30', bandText: '#f8fafc', success: '#34d399', warning: '#fbbf24', error: '#f87171',
    },
  },

  rose: {
    name: 'Rose',
    tagline: 'Blush & berry, soft and rounded',
    fonts: { sans: "'Nunito', system-ui, sans-serif", href: FONT_URL('Nunito:wght@400;600;700;800') },
    radius: 1.6,
    light: {
      background: '#fae6ec', card: '#fffafb', text: '#2a1a1f', mutedText: '#765a63', border: '#efd0da',
      primary: '#a8285a', accent: '#f2a7c0', buttonBackground: '#9d1d4f', buttonText: '#ffffff',
      band: '#3a1424', bandText: '#fde8ef', success: '#1f7a4a', warning: '#a86207', error: '#b42318',
    },
    dark: {
      background: '#1d0c14', card: '#29151f', text: '#f7e9ee', mutedText: '#c2a3ad', border: '#3a2830',
      primary: '#f48fb1', accent: '#f4a6c0', buttonBackground: '#f48fb1', buttonText: '#2a0e18',
      band: '#2a1420', bandText: '#fde8ef', success: '#6fcf97', warning: '#f2c94c', error: '#ff8a80',
    },
  },

  emerald: {
    name: 'Emerald',
    tagline: 'Forest green & brass, calm and natural',
    fonts: { sans: "'DM Sans', system-ui, sans-serif", href: FONT_URL('DM+Sans:wght@400;500;600;700') },
    radius: 1.15,
    light: {
      background: '#e2f1e7', card: '#fbfefc', text: '#10201a', mutedText: '#52665d', border: '#cbe2d3',
      primary: '#047857', accent: '#d2ad55', buttonBackground: '#064e3b', buttonText: '#ffffff',
      band: '#062e23', bandText: '#ecf5f0', success: '#047857', warning: '#a86207', error: '#b42318',
    },
    dark: {
      background: '#04180f', card: '#0b241a', text: '#e5f2ec', mutedText: '#9db5aa', border: '#22372d',
      primary: '#34d399', accent: '#d9b65f', buttonBackground: '#34d399', buttonText: '#04261b',
      band: '#0c271d', bandText: '#ecf5f0', success: '#34d399', warning: '#fbbf24', error: '#ff8a80',
    },
  },

  // From theme.jpeg: a deep aubergine card that fades to near-black, copper/apricot engraved
  // lettering, set on a warm stone surface. Engraved all-caps serif, soft plum-tinted shadows.
  reference: {
    name: 'Reference',
    tagline: 'Plum & copper, from your reference card',
    fonts: { display: "'Cinzel', Georgia, serif", href: FONT_URL('Cinzel:wght@500;600;700') },
    displayWeight: 600,
    displayTracking: '0.02em',
    radius: 0.25,
    shadow: '43 15 38',
    light: {
      background: '#eee3e7', card: '#fdfafb', text: '#2a1024', mutedText: '#6b5666', border: '#dfcdd4',
      primary: '#7a2e63', accent: '#ef9f63', buttonBackground: '#3b1534', buttonText: '#f4b27c',
      band: '#2b0f26', bandText: '#f8e9de', success: '#1f7a4a', warning: '#a86207', error: '#b42318',
    },
    dark: {
      background: '#1d0a17', card: '#2a1224', text: '#f6e9e1', mutedText: '#c4a9b6', border: '#3d2434',
      primary: '#f0a868', accent: '#f0a868', buttonBackground: '#f0a868', buttonText: '#2a0f24',
      band: '#2e1229', bandText: '#f8e9de', success: '#6fcf97', warning: '#f2c94c', error: '#ff8a80',
    },
    bandImage: 'linear-gradient(180deg, rgb(92 34 78 / 0.85), transparent 75%)',
  },

  ocean: {
    name: 'Ocean',
    tagline: 'Deep teal & coral, fresh and airy',
    fonts: { display: "'Outfit', system-ui, sans-serif", sans: "'Outfit', system-ui, sans-serif", href: FONT_URL('Outfit:wght@400;500;600;700;800') },
    displayWeight: 700,
    displayTracking: '-0.02em',
    radius: 1.3,
    shadow: '8 42 51',
    light: {
      background: '#e3f2f3', card: '#fbfefe', text: '#0b2329', mutedText: '#4b6469', border: '#c8e1e3',
      primary: '#0e7490', accent: '#fb7a5c', buttonBackground: '#0b3b46', buttonText: '#ffffff',
      band: '#082a33', bandText: '#eaf7f8', success: '#047857', warning: '#a86207', error: '#b42318',
    },
    dark: {
      background: '#061a1f', card: '#0c252c', text: '#e3f3f5', mutedText: '#9bb8bd', border: '#1f3a41',
      primary: '#5ad1e6', accent: '#ff9478', buttonBackground: '#5ad1e6', buttonText: '#04222a',
      band: '#0b2a32', bandText: '#eaf7f8', success: '#34d399', warning: '#fbbf24', error: '#ff8a80',
    },
    bandImage: 'radial-gradient(120% 90% at 100% 0%, rgb(90 209 230 / 0.18), transparent 60%)',
  },

  mono: {
    name: 'Monochrome',
    tagline: 'Pure greys, minimal and editorial',
    fonts: { display: "'Space Grotesk', system-ui, sans-serif", href: FONT_URL('Space+Grotesk:wght@500;600;700') },
    displayWeight: 700,
    displayTracking: '-0.03em',
    radius: 0.15,
    light: {
      background: '#f2f2f2', card: '#ffffff', text: '#0a0a0a', mutedText: '#525252', border: '#dcdcdc',
      primary: '#262626', accent: '#a3a3a3', buttonBackground: '#0a0a0a', buttonText: '#ffffff',
      band: '#0a0a0a', bandText: '#fafafa', success: '#166534', warning: '#92400e', error: '#b91c1c',
    },
    dark: {
      background: '#0a0a0a', card: '#141414', text: '#f5f5f5', mutedText: '#a3a3a3', border: '#2a2a2a',
      primary: '#e5e5e5', accent: '#d4d4d4', buttonBackground: '#f5f5f5', buttonText: '#0a0a0a',
      band: '#171717', bandText: '#fafafa', success: '#4ade80', warning: '#fbbf24', error: '#f87171',
    },
  },

  // For low vision: pure black and white, bold blue/yellow highlights, strong borders and the
  // Atkinson Hyperlegible typeface (designed by the Braille Institute for legibility).
  clear: {
    name: 'High visibility',
    tagline: 'Black, white & yellow, the easiest to read',
    alwaysOn: true,
    fonts: {
      display: "'Plus Jakarta Sans', system-ui, sans-serif",
      sans: "'Plus Jakarta Sans', system-ui, sans-serif",
      href: FONT_URL('Plus+Jakarta+Sans:wght@500;700;800'),
    },
    displayWeight: 700,
    displayTracking: '0',
    radius: 0.75,
    light: {
      background: '#ffffff', card: '#ffffff', text: '#000000', mutedText: '#1f1f1f', border: '#000000',
      primary: '#0037b3', accent: '#ffd400', buttonBackground: '#000000', buttonText: '#ffffff',
      band: '#000000', bandText: '#ffffff', success: '#00602b', warning: '#7a4000', error: '#b00000',
    },
    dark: {
      background: '#000000', card: '#0d0d0d', text: '#ffffff', mutedText: '#ececec', border: '#ffffff',
      primary: '#ffd400', accent: '#ffd400', buttonBackground: '#ffd400', buttonText: '#000000',
      band: '#000000', bandText: '#ffffff', success: '#5cff9d', warning: '#ffb84d', error: '#ff8a8a',
    },
  },
};

/**
 * Each theme's look beyond colour: button shape, card style, header and hover feel. A design sets
 * CSS variables (src/index.css, [data-design]) that buttons, cards and the header read, so it also
 * renders inside the scoped previews in the theme picker.
 */
export const DESIGNS = {
  classic: { name: 'Classic', hint: 'Clean rounded cards' },
  luxe: { name: 'Luxe', hint: 'Fine gold lines, tailored square buttons' },
  modern: { name: 'Modern', hint: 'Pill buttons, frosted header' },
  airy: { name: 'Airy', hint: 'Borderless cards on soft shadows' },
  soft: { name: 'Soft', hint: 'Tinted cards with a gentle glow' },
  natural: { name: 'Natural', hint: 'Outlined cards, calm and flat' },
  minimal: { name: 'Minimal', hint: 'Crisp outlines, sharp corners' },
};
const THEME_DESIGN = { default: 'classic', luxury: 'luxe', modern: 'modern', ocean: 'airy', rose: 'soft', emerald: 'natural', mono: 'minimal', reference: 'luxe', clear: 'classic' };
for (const [id, design] of Object.entries(THEME_DESIGN)) THEMES[id].design = design;

/** Order shown in the picker (Custom is always last and handled separately). */
export const THEME_ORDER = ['default', 'luxury', 'modern', 'ocean', 'rose', 'emerald', 'mono', 'reference', 'clear'];
export const ALL_THEME_IDS = [...THEME_ORDER, CUSTOM_THEME];

/** Themes shoppers may pick: those switched on in Admin → Settings, plus accessibility themes. */
export const enabledThemeIds = (site) => {
  const on = site?.enabledThemes?.length ? site.enabledThemes : ALL_THEME_IDS;
  return ALL_THEME_IDS.filter((id) => on.includes(id) || THEMES[id]?.alwaysOn);
};

/**
 * Vision settings: independent of theme and light/dark, saved per device ('wt-vision') and applied
 * as data attributes on <html> (see src/index.css; public/theme.js applies them before first paint).
 */
export const VISION_DEFAULTS = { textSize: 'standard', corners: 'theme', readableFont: false, underlineLinks: false, reduceMotion: false };
export const TEXT_SIZES = [
  ['small', 'Small', '90%'],
  ['standard', 'Standard', '100%'],
  ['large', 'Large', '115%'],
  ['xl', 'Extra large', '130%'],
];
/** Corner roundness: 'theme' keeps each theme's own radius, the others override it (src/index.css). */
export const CORNER_STYLES = [
  ['theme', 'Theme', 'auto_awesome'],
  ['sharp', 'Sharp', 'crop_square'],
  ['soft', 'Soft', 'rounded_corner'],
  ['round', 'Round', 'circle'],
];
export const READABLE_FONT_HREF = FONT_URL('Plus+Jakarta+Sans:wght@500;700;800');

/** The five colours a shopper can pick for the Custom theme (starts from the Default look). */
export const CUSTOM_FIELDS = [
  ['primary', 'Primary', 'Links, highlights, active states'],
  ['accent', 'Accent', 'Decorative highlights on dark panels'],
  ['background', 'Background', 'Page background'],
  ['text', 'Text', 'Main text colour'],
  ['buttonBackground', 'Button', 'Main buttons'],
];
export const CUSTOM_DEFAULTS = {
  primary: '#8a4b1f',
  accent: '#e2b53e',
  background: '#f6f6f4',
  text: '#111111',
  buttonBackground: '#111111',
};
