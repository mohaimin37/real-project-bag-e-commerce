import { Navigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useCategories } from '../hooks/useStore';
import { findInDirectory, flattenTree, groupSlugs, itemSlugs, nestedBase, shortSlug } from '../lib/directory';
import { PageLoader } from '../components/ui';
import Shop from './Shop';

/**
 * Nested category URLs from the category architecture:
 *   /women/handbags            → the Handbags group (all its categories together)
 *   /women/handbags/tote-bags  → one tile (its category plus any `also` categories)
 * Works the same for /men, /bags, /accessories and /travel-utility. A single-category page
 * points its canonical URL at the existing /shop/<slug> address, so no duplicate pages get indexed.
 */
export default function DirectoryPage({ dirKey }) {
  const { group: groupKey, item: itemKey } = useParams();
  const { data: tree, isLoading } = useCategories();
  const bySlug = useMemo(() => flattenTree(tree), [tree]);
  const { dir, group, item } = findInDirectory(dirKey, groupKey, itemKey);
  const base = dir ? nestedBase(dir) : '/shop';

  if (!dir || !group || (itemKey && !item)) return <Navigate to={dir?.path || '/shop'} replace />;
  if (isLoading) return <PageLoader />;

  const slugs = item ? itemSlugs(item, bySlug) : groupSlugs(group, bySlug);
  const label = item ? item.label : group.label;
  const audience = dirKey === 'women' ? 'Women' : dirKey === 'men' ? 'Men' : null;
  const title = audience && !label.toLowerCase().includes(audience.toLowerCase().slice(0, 3)) ? `${audience}’s ${label}` : label;
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: dir.label, to: dir.path },
    ...(item ? [{ label: group.label, to: `${base}/${group.key}` }, { label: item.label }] : [{ label: group.label }]),
  ];
  const single = slugs.length === 1 ? bySlug.get(slugs[0]) : null;
  const canonical = single ? `/shop/${single.slug}` : `${base}/${group.key}${item ? `/${shortSlug(item.slug, dirKey)}` : ''}`;

  return (
    <Shop
      key={`${dirKey}/${groupKey}/${itemKey || ''}`}
      // No audience filter on top: the Men/Women categories already scope the audience, so the
      // listing shows exactly the products in these categories (and matches the menu counts).
      // A category that doesn't exist yet lists nothing (empty state), never unrelated products.
      categoryList={slugs.length ? slugs : ['__none__']}
      pageTitle={title}
      pageDescription={single?.tagline || `Shop ${title.toLowerCase()} at WILDTANE.`}
      crumbsOverride={crumbs}
      canonicalPath={canonical}
      directoryKey={item ? undefined : dirKey}
    />
  );
}
