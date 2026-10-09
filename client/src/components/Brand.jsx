import { cn } from '../lib/format';

// Official WILDTANE logo files, generated from brandlogo.jpeg by scripts/brand-assets.mjs.
// Artwork floats seamlessly without any awkward background boxes or tiles.
const HORIZONTAL_DARK = { webp: '/brand/logo-horizontal-dark.webp', png: '/brand/logo-horizontal-dark.png', w: 455, h: 120 };
const HORIZONTAL_GOLD = { webp: '/brand/logo-horizontal-gold.webp', png: '/brand/logo-horizontal-gold.png', w: 455, h: 120 };
const HORIZONTAL_TILE = { webp: '/brand/logo-horizontal.webp', png: '/brand/logo-horizontal.png', w: 455, h: 120 };

const MARK_DARK = { webp: '/brand/logo-mark-dark.webp', png: '/brand/logo-mark-dark.png' };
const MARK_GOLD = { webp: '/brand/logo-mark-gold.webp', png: '/brand/logo-mark-gold.png' };
const MARK_TILE = { png: '/brand/logo-mark.png' };

const FULL = { webp: '/brand/logo-full.webp', jpg: '/brand/logo-full.jpg', w: 800, h: 800 };

const display = (className) => !/(^|\s)(hidden|block|flex|inline-flex|inline-block)(\s|$)/.test(className || '') && 'inline-block';

/**
 * The "W" mark alone, square (compact mobile navigation, avatar spots and small screens).
 * tone: 'auto' = transparent dark on light backgrounds, luminous transparent gold in dark mode.
 *       'gold' = always transparent gold (for dark bands / footer).
 *       'dark' = always transparent dark.
 *       'tile' = enclosed in the solid black tile.
 */
export function LogoMark({ className, alt = 'W', tone = 'auto' }) {
  if (tone === 'tile') {
    return (
      <span className={cn('relative inline-block shrink-0', className)}>
        <img src={MARK_TILE.png} alt={alt} width={256} height={256} decoding="async" className="w-full h-full rounded-xl object-contain shadow-sm" />
      </span>
    );
  }

  if (tone === 'gold') {
    return (
      <span className={cn('relative inline-block shrink-0 transition-opacity hover:opacity-90', className)}>
        <picture className="block w-full h-full">
          <source srcSet={MARK_GOLD.webp} type="image/webp" />
          <img src={MARK_GOLD.png} alt={alt} width={256} height={256} decoding="async" className="w-full h-full object-contain" />
        </picture>
      </span>
    );
  }

  if (tone === 'dark') {
    return (
      <span className={cn('relative inline-block shrink-0 transition-opacity hover:opacity-90', className)}>
        <picture className="block w-full h-full">
          <source srcSet={MARK_DARK.webp} type="image/webp" />
          <img src={MARK_DARK.png} alt={alt} width={256} height={256} decoding="async" className="w-full h-full object-contain" />
        </picture>
      </span>
    );
  }

  // tone === 'auto' (Default): Clean, floating transparent logo that adapts automatically to theme
  return (
    <span className={cn('relative inline-block shrink-0 transition-opacity hover:opacity-90', className)}>
      <picture className="dark:hidden block w-full h-full">
        <source srcSet={MARK_DARK.webp} type="image/webp" />
        <img src={MARK_DARK.png} alt={alt} width={256} height={256} decoding="async" className="w-full h-full object-contain" />
      </picture>
      <picture className="hidden dark:block w-full h-full">
        <source srcSet={MARK_GOLD.webp} type="image/webp" />
        <img src={MARK_GOLD.png} alt={alt} width={256} height={256} decoding="async" className="w-full h-full object-contain" />
      </picture>
    </span>
  );
}

/**
 * Mark + WILDTANE wordmark side by side for headers, footers, checkout and admin.
 * Floats cleanly on light surfaces without an enclosed black box.
 */
export function BrandLogo({ className, alt = 'WILDTANE', eager = false, tone = 'auto' }) {
  const loading = eager ? 'eager' : 'lazy';

  if (tone === 'tile') {
    return (
      <span className={cn(display(className), 'relative shrink-0', className)} style={{ aspectRatio: `${HORIZONTAL_TILE.w} / ${HORIZONTAL_TILE.h}` }}>
        <picture className="block h-full w-full overflow-hidden rounded-lg shadow-sm">
          <source srcSet={HORIZONTAL_TILE.webp} type="image/webp" />
          <img src={HORIZONTAL_TILE.png} alt={alt} width={HORIZONTAL_TILE.w} height={HORIZONTAL_TILE.h} loading={loading} decoding="async" className="block h-full w-full object-contain" />
        </picture>
      </span>
    );
  }

  if (tone === 'gold') {
    return (
      <span className={cn(display(className), 'relative shrink-0 transition-opacity hover:opacity-90', className)} style={{ aspectRatio: `${HORIZONTAL_GOLD.w} / ${HORIZONTAL_GOLD.h}` }}>
        <picture className="block h-full w-full">
          <source srcSet={HORIZONTAL_GOLD.webp} type="image/webp" />
          <img src={HORIZONTAL_GOLD.png} alt={alt} width={HORIZONTAL_GOLD.w} height={HORIZONTAL_GOLD.h} loading={loading} decoding="async" className="block h-full w-full object-contain" />
        </picture>
      </span>
    );
  }

  if (tone === 'dark') {
    return (
      <span className={cn(display(className), 'relative shrink-0 transition-opacity hover:opacity-90', className)} style={{ aspectRatio: `${HORIZONTAL_DARK.w} / ${HORIZONTAL_DARK.h}` }}>
        <picture className="block h-full w-full">
          <source srcSet={HORIZONTAL_DARK.webp} type="image/webp" />
          <img src={HORIZONTAL_DARK.png} alt={alt} width={HORIZONTAL_DARK.w} height={HORIZONTAL_DARK.h} loading={loading} decoding="async" className="block h-full w-full object-contain" />
        </picture>
      </span>
    );
  }

  // tone === 'auto' (Default):
  // Light mode -> transparent dark luxury logo (NO BLACK TILE!).
  // Dark mode -> transparent luminous gold logo.
  return (
    <span className={cn(display(className), 'relative shrink-0 transition-opacity hover:opacity-90', className)} style={{ aspectRatio: `${HORIZONTAL_DARK.w} / ${HORIZONTAL_DARK.h}` }}>
      <picture className="dark:hidden block h-full w-full">
        <source srcSet={HORIZONTAL_DARK.webp} type="image/webp" />
        <img src={HORIZONTAL_DARK.png} alt={alt} width={HORIZONTAL_DARK.w} height={HORIZONTAL_DARK.h} loading={loading} decoding="async" className="block h-full w-full object-contain" />
      </picture>
      <picture className="hidden dark:block h-full w-full">
        <source srcSet={HORIZONTAL_GOLD.webp} type="image/webp" />
        <img src={HORIZONTAL_GOLD.png} alt={alt} width={HORIZONTAL_GOLD.w} height={HORIZONTAL_GOLD.h} loading={loading} decoding="async" className="block h-full w-full object-contain" />
      </picture>
    </span>
  );
}

/** Complete square badge with subtle luxury gold glint and elevation. */
export function BrandLogoFull({ className, alt = 'WILDTANE', eager = false }) {
  return (
    <picture className={cn(display(className), 'shrink-0 overflow-hidden aspect-square rounded-2xl shadow-lift border border-white/10', className)}>
      <source srcSet={FULL.webp} type="image/webp" />
      <img src={FULL.jpg} alt={alt} width={FULL.w} height={FULL.h} loading={eager ? 'eager' : 'lazy'} decoding="async" className="block h-full w-full object-cover" />
    </picture>
  );
}

/**
 * Semantic Brand Name Heading: renders "WILDTANE" as text in an h-tag instead of an image.
 */
export function BrandHeading({ as: Tag = 'h1', className, children = 'WILDTANE' }) {
  return (
    <Tag className={cn('font-serif tracking-widest font-black uppercase select-none', className)}>
      {children}
    </Tag>
  );
}

