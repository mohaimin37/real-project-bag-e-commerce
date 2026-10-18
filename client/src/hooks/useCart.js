import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import {
  addGuestItem,
  setGuestQty,
  changeGuestVariant,
  removeGuestItem,
  setGuestShipping,
  clearGuestCart,
  setCartOpen,
} from '../store';

const EMPTY = { items: [], summary: null, couponCode: null };

/**
 * One cart API for both guests and signed-in shoppers.
 * Guests keep line items in localStorage and get live prices/stock from /cart/quote.
 * Signed-in shoppers use the persistent server cart.
 */
export function useCart() {
  const user = useSelector((s) => s.auth.user);
  const authReady = useSelector((s) => s.auth.status === 'ready');
  const guest = useSelector((s) => s.guestCart);
  const dispatch = useDispatch();
  const qc = useQueryClient();

  const serverQuery = useQuery({
    queryKey: ['cart'],
    queryFn: api.cart,
    enabled: authReady && Boolean(user),
    select: (d) => d.cart,
  });

  const guestQuery = useQuery({
    queryKey: ['cart-quote', guest.items, guest.shippingMethod],
    queryFn: () => api.quoteCart(guest.items, guest.shippingMethod),
    enabled: authReady && !user && guest.items.length > 0,
    placeholderData: (prev) => prev,
    select: (d) => ({
      ...d.cart,
      items: d.cart.items.map((l) => ({ ...l, _id: `${l.productId}:${l.variantId}` })),
    }),
  });

  const cart = user ? serverQuery.data || EMPTY : guest.items.length ? guestQuery.data || EMPTY : EMPTY;
  const isLoading = !authReady || (user ? serverQuery.isLoading : guest.items.length > 0 && guestQuery.isLoading);

  const setServerCart = (res) => qc.setQueryData(['cart'], res);
  const onError = (err) => toast.error(err.message);

  const add = useMutation({
    mutationFn: async ({ productId, variantId, quantity = 1 }) => {
      if (user) return setServerCart(await api.addToCart({ productId, variantId, quantity }));
      dispatch(addGuestItem({ productId, variantId, quantity }));
      return null;
    },
    onSuccess: (_, vars) => {
      if (vars.silent) return;
      toast.success('Added to your bag');
      if (vars.openDrawer !== false) dispatch(setCartOpen(true));
    },
    onError,
  });

  const updateQty = useMutation({
    mutationFn: async ({ id, quantity }) => {
      if (user) return setServerCart(await api.updateCartItem(id, quantity));
      dispatch(setGuestQty({ key: id, quantity }));
      return null;
    },
    onError,
  });

  const changeVariant = useMutation({
    mutationFn: async ({ id, variantId }) => {
      if (user) return setServerCart(await api.changeCartVariant(id, variantId));
      dispatch(changeGuestVariant({ key: id, variantId }));
      return null;
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      if (user) return setServerCart(await api.removeCartItem(id));
      dispatch(removeGuestItem(id));
      return null;
    },
    onSuccess: () => toast.success('Removed from your bag'),
    onError,
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (user) return setServerCart(await api.clearCart());
      dispatch(clearGuestCart());
      return null;
    },
    onError,
  });

  const applyCoupon = useMutation({
    mutationFn: async (code) => {
      if (!user) throw { message: 'Sign in to apply a coupon code' };
      return setServerCart(await api.applyCoupon(code));
    },
    onSuccess: () => toast.success('Coupon applied'),
  });

  const removeCoupon = useMutation({
    mutationFn: async (code) => setServerCart(await api.removeCoupon(code)),
    onError,
  });

  const setShipping = useMutation({
    mutationFn: async (code) => {
      if (user) return setServerCart(await api.setShipping(code));
      dispatch(setGuestShipping(code));
      return null;
    },
    onError,
  });

  // Loyalty coins: spend them on this order (signed-in shoppers only).
  const setUseCoins = useMutation({
    mutationFn: async (use) => setServerCart(await api.setUseCoins(use)),
    onError,
  });

  const count = cart.items.reduce((n, l) => n + (l.available ? l.quantity : 0), 0);
  const hasIssues = cart.items.some((l) => !l.available || l.issue);

  return { cart, items: cart.items, summary: cart.summary, count, hasIssues, isLoading, add, updateQty, changeVariant, remove, clear, applyCoupon, removeCoupon, setShipping, setUseCoins };
}
