// Production builds load only the Material Symbols icons the store actually uses (Google Fonts
// `icon_names`), instead of the whole ~450 KB font. Every quoted word or JSX text in the client and
// server source that is a real icon name is kept, so icons named in data (categories, payment methods,
// ribbon, help pages…) are included too. New icons are picked up automatically on the next build.
// material-symbols.txt is Google's list of icon names (material-design-icons/variablefont/*.codepoints).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOTS = [path.resolve(here, '../src'), path.resolve(here, '../../server/src'), path.resolve(here, '../index.html')];
const EXT = /\.(jsx?|mjs|html)$/;
// Icons that must always be available (fallbacks used by components when data has no icon).
const ALWAYS = ['category', 'payments', 'help', 'warning', 'check', 'close'];

function files(p) {
  if (!fs.existsSync(p)) return [];
  const st = fs.statSync(p);
  if (st.isFile()) return EXT.test(p) ? [p] : [];
  return fs.readdirSync(p).flatMap((f) => (f === 'node_modules' || f.startsWith('.') ? [] : files(path.join(p, f))));
}

export function usedIcons() {
  const all = new Set(fs.readFileSync(path.join(here, 'material-symbols.txt'), 'utf8').split(/\r?\n/).filter(Boolean));
  const used = new Set(ALWAYS);
  // A whole string literal ('shopping_bag') or a whole JSX text node (>search<) — not words inside prose.
  const patterns = [/'([a-z][a-z0-9_]{1,40})'/g, /"([a-z][a-z0-9_]{1,40})"/g, /`([a-z][a-z0-9_]{1,40})`/g, />\s*([a-z][a-z0-9_]{1,40})\s*</g];
  for (const f of ROOTS.flatMap(files)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const re of patterns) for (const m of src.matchAll(re)) if (all.has(m[1])) used.add(m[1]);
  }
  return [...used].sort();
}

/** Vite plugin: adds `icon_names=` to the Material Symbols stylesheet link in production builds. */
export default function iconSubset() {
  return {
    name: 'wt-icon-subset',
    apply: 'build',
    transformIndexHtml(html) {
      const names = usedIcons();
      return html.replace(
        /(https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined:[^"&]+)/,
        `$1&icon_names=${names.join(',')}`
      );
    },
  };
}
