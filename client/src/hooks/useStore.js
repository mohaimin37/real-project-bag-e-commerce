import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { api } from '../lib/api';
import { formatMoney } from '../lib/format';

export const useUser = () => useSelector((s) => s.auth.user);
export const useAuthReady = () => useSelector((s) => s.auth.status === 'ready');

export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: 5 * 60 * 1000, select: (d) => d.config });
}

/** Returns a formatter bound to the shopper's selected display currency. */
export function useMoney() {
  const code = useSelector((s) => s.ui.currency);
  const { data: config } = useConfig();
  const currency = config?.currencies?.find((c) => c.code === code);
  const fmt = (amount) => formatMoney(amount, currency);
  fmt.currency = currency || { code: 'INR', symbol: '₹', rate: 1 };
  fmt.isConverted = Boolean(currency && currency.code !== 'INR');
  fmt.inr = (amount) => formatMoney(amount);
  return fmt;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
    staleTime: 5 * 60 * 1000,
    select: (d) => {
      const cats = Array.isArray(d?.categories) ? [...d.categories] : [];
      cats.departments = d?.departments || { men: [], women: [], universal: [] };
      return cats;
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
    staleTime: 5 * 60 * 1000,
    select: (d) => d?.departments || { men: [], women: [], universal: [] },
  });
}

