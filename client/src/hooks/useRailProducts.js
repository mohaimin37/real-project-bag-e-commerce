import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Products for one admin-defined homepage row (Admin → Settings → Homepage): a ready-made
 * collection (featured / new arrivals / best sellers) or a category. Used on desktop and phone.
 */
export function useRailProducts(rail, limit = 8) {
  const collections = useQuery({ queryKey: ['collections'], queryFn: api.collections, staleTime: 5 * 60 * 1000, enabled: rail.source !== 'category' });
  const category = useQuery({
    queryKey: ['products', 'home-rail', rail.category, limit],
    queryFn: () => api.products({ category: rail.category, limit }),
    staleTime: 5 * 60 * 1000,
    enabled: rail.source === 'category' && Boolean(rail.category),
  });
  if (rail.source === 'category') return { products: category.data?.items, loading: Boolean(rail.category) && category.isLoading };
  return { products: collections.data?.[rail.source]?.slice(0, limit), loading: collections.isLoading };
}
