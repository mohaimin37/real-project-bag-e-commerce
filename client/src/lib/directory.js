import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useCategories } from '../hooks/useStore';
import { DIRECTORIES } from '../content/taxonomy';

/** Flat slug → category map from the nested tree (each node keeps a parentRef). */
export function flattenTree(tree) {
  const map = new Map();
  const walk = (nodes, parentRef = null) => {
    for (const n of nodes || []) {
      const node = { ...n, parentRef };
      map.set(n.slug, node);
      walk(n.children, node);
    }
  };
  walk(tree);
  return map;
}

/** "women-tote-bags" → "tote-bags" for URLs under /women. */
export const shortSlug = (slug, dirKey) => (slug.startsWith(`${dirKey}-`) ? slug.slice(dirKey.length + 1) : slug);

/** Base path for nested directory URLs (/women/handbags/tote-bags, /accessories/wallets…). */
export const nestedBase = (dir) => (dir.key === 'travel' ? '/travel-utility' : `/${dir.key}`);

/** All category slugs a tile or group lists (itself plus `also`), limited to ones that exist. */
export const itemSlugs = (item, bySlug) => [item.slug, ...(item.also || [])].filter((s) => bySlug.has(s));
export const groupSlugs = (group, bySlug) =>
  [...new Set([group.parent, ...(group.also || []), ...group.items.flatMap((i) => [i.slug, ...(i.also || [])])])].filter((s) => bySlug.has(s));

/** Image for a tile: the category's own photo, else one from a child category. */
function imageFor(slugs, bySlug) {
  for (const s of slugs) {
    const c = bySlug.get(s);
    if (c?.image?.url) return c.image.url;
    const child = c?.children?.find((x) => x.image?.url);
    if (child) return child.image.url;
  }
  return '';
}

/**
 * Resolves one directory (women, men, bags, accessories, travel) against the live category tree.
 * Tiles without products are dropped; existing child categories with products that the brief
 * doesn't name are appended, so nothing on sale disappears from navigation.
 */
export function useDirectory(key, enabled = true) {
  const { data: tree, isLoading: treeLoading } = useCategories();
  const dir = DIRECTORIES[key];
  const bySlug = useMemo(() => flattenTree(tree), [tree]);

  const raw = useMemo(() => {
    if (!dir || !tree) return null;
    // Everything the brief names anywhere in this directory (so an existing category is shown once).
    const named = new Set(dir.sections.flatMap((s) => s.groups.flatMap((g) => [g.parent, ...(g.also || []), ...g.items.flatMap((i) => [i.slug, ...(i.also || [])])])));
    return dir.sections.map((section) => ({
      title: section.title,
      groups: section.groups.map((g) => {
        const parentNode = bySlug.get(g.parent);
        // Existing subcategories with products that the brief doesn't name: kept visible, linked to their own /shop page.
        const extras = (parentNode?.children || [])
          .filter((c) => !named.has(c.slug) && c.productCount > 0)
          .map((c) => ({ label: c.name, slug: c.slug, extra: true }));
        const seen = new Set();
        const items = [...g.items, ...extras].filter((i) => {
          // The same tile can be named twice (e.g. Card Holders in two groups); show it once per group.
          const k = i.slug;
          if (seen.has(k)) return false;
          seen.add(k);
          return itemSlugs(i, bySlug).length > 0;
        });
        return { ...g, items };
      }),
    }));
  }, [dir, tree, bySlug]);

  // One request for every tile/group count (distinct products per set).
  const sets = useMemo(() => {
    if (!raw) return [];
    const out = [];
    raw.forEach((s) => s.groups.forEach((g) => {
      out.push(groupSlugs(g, bySlug).join(','));
      g.items.forEach((i) => out.push(itemSlugs(i, bySlug).join(',')));
    }));
    return out;
  }, [raw, bySlug]);
  const counts = useQuery({
    queryKey: ['set-counts', key, sets],
    queryFn: () => api.categorySetCounts(sets),
    enabled: enabled && sets.length > 0,
    staleTime: 2 * 60 * 1000,
    select: (d) => d.counts,
  });

  const sections = useMemo(() => {
    if (!raw || !counts.data) return null;
    let n = 0;
    const base = nestedBase(dir);
    return raw
      .map((s) => ({
        title: s.title,
        groups: s.groups
          .map((g) => {
            const groupCount = counts.data[n++];
            const items = g.items
              .map((i) => {
                const slugs = itemSlugs(i, bySlug);
                const count = counts.data[n++];
                const to = i.extra ? `/shop/${i.slug}` : `${base}/${g.key}/${shortSlug(i.slug, dir.key)}`;
                return { ...i, slugs, count, img: imageFor(slugs, bySlug), to };
              })
              .filter((i) => i.count > 0);
            return { ...g, count: groupCount, items, to: `${base}/${g.key}`, slugs: groupSlugs(g, bySlug) };
          })
          .filter((g) => g.count > 0 && g.items.length > 0),
      }))
      .filter((s) => s.groups.length > 0);
  }, [raw, counts.data, bySlug, dir]);

  return { dir, sections, bySlug, isLoading: treeLoading || (enabled && sets.length > 0 && counts.isLoading) };
}

/** Finds the group / item for a nested URL like /women/handbags/tote-bags (static: works before counts load). */
export function findInDirectory(key, groupKey, itemKey) {
  const dir = DIRECTORIES[key];
  if (!dir) return {};
  const group = dir.sections.flatMap((s) => s.groups).find((g) => g.key === groupKey) || null;
  const item = group && itemKey ? group.items.find((i) => shortSlug(i.slug, key) === itemKey || i.slug === itemKey) || null : null;
  return { dir, group, item };
}
