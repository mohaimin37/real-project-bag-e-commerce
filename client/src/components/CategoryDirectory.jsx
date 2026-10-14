import { Link } from 'react-router-dom';
import { cn, imgUrl } from '../lib/format';
import { categoryTone } from '../lib/categoryTone';
import { useDirectory } from '../lib/directory';
import { useCategories } from '../hooks/useStore';
import { Icon, Skeleton } from './ui';

/** One round tile, in the same style as the shop's category rail. */
function Tile({ item, tone }) {
  return (
    <Link to={item.to} className="group flex flex-col items-center gap-1.5 shrink-0 w-[72px] md:w-20" title={`${item.label} (${item.count})`}>
      <span className={cn('w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden flex items-center justify-center ring-2 ring-outline-variant/30 transition-all group-hover:scale-105 group-hover:ring-secondary/50 group-focus-visible:ring-secondary', item.img ? 'bg-surface-container-low' : cn(tone.tint, tone.text))}>
        {item.img ? (
          <img src={imgUrl(item.img, 128)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        ) : (
          <Icon name={tone.icon || 'category'} className="text-[24px]" />
        )}
      </span>
      <span className="text-[11px] md:text-[12px] leading-tight text-center w-full line-clamp-2 font-medium text-on-surface-variant group-hover:text-on-surface">{item.label}</span>
      <span className="text-[10px] text-outline -mt-1">{item.count}</span>
    </Link>
  );
}

/**
 * Homepage category tiles: categories an admin marked "Feature on homepage" that have products.
 * Renders nothing until at least one is marked, so the homepage is unchanged by default.
 */
export function HomeCategoryTiles({ className }) {
  const { data: tree } = useCategories();
  const featured = [];
  const walk = (nodes) => (nodes || []).forEach((n) => {
    if (n.showOnHome && n.isActive !== false && n.productCount > 0) featured.push(n);
    walk(n.children);
  });
  walk(tree);
  if (!featured.length) return null;
  featured.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return (
    <section aria-label="Shop by category" className={cn('container-x', className)}>
      <div className="flex gap-3 md:gap-5 overflow-x-auto scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 py-1">
        {featured.map((c) => (
          <Tile key={c._id} item={{ label: c.name, to: `/shop/${c.slug}`, count: c.productCount, img: c.image?.url || c.children?.find((x) => x.image?.url)?.image?.url }} tone={categoryTone(c)} />
        ))}
      </div>
    </section>
  );
}

/**
 * "Shop by category" for a landing page (Women, Men, Bags, Accessories, Travel & Utility).
 * Built from the live category tree; groups and tiles without products are hidden.
 * `only` limits it to one group (a group page such as /women/handbags).
 */
export default function CategoryDirectory({ dirKey, only, className }) {
  const { sections, bySlug, isLoading } = useDirectory(dirKey);
  if (isLoading) {
    return (
      <div className={cn('flex gap-3 overflow-hidden', className)}>
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="w-16 h-20 rounded-2xl shrink-0" />)}
      </div>
    );
  }
  const shown = (sections || [])
    .map((s) => ({ ...s, groups: s.groups.filter((g) => !only || g.key === only) }))
    .filter((s) => s.groups.length);
  if (!shown.length) return null;
  return (
    <section aria-label="Shop by category" className={cn('flex flex-col gap-6', className)}>
      {shown.map((s) => (
        <div key={s.title} className="flex flex-col gap-5">
          {!only && shown.length > 1 && (
            <h2 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              {s.title} <span aria-hidden="true" className="flex-1 h-px bg-surface-container-high" />
            </h2>
          )}
          {s.groups.map((g) => (
            <div key={g.key} className="flex flex-col gap-2.5">
              {!only && (
                <h3 className="flex items-center gap-2.5 font-display text-[17px] md:text-[19px] leading-tight text-on-surface">
                  {/* Same colour accent as the product section headers for this kind of product. */}
                  <span aria-hidden="true" className={cn('w-1 h-5 rounded-full', categoryTone(bySlug.get(g.parent) || { name: g.label }).dot)} />
                  <Link to={g.to} className="hover:underline underline-offset-4">{g.label}</Link>
                  <span className="font-sans text-[11px] text-outline tabular-nums">{g.count}</span>
                </h3>
              )}
              {/* All tiles shown — they wrap onto more lines rather than hiding off-screen. */}
              <div className="flex flex-wrap gap-x-3 gap-y-3 md:gap-x-4">
                {g.items.map((i) => <Tile key={i.slug} item={i} tone={categoryTone(bySlug.get(i.slug) || { slug: i.slug, name: i.label })} />)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
