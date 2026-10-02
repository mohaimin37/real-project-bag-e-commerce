import { useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { api } from '../lib/api';
import { setUser, clearUser, clearGuestCart, clearGuestWishlist } from '../store';

export function useAuthActions() {
  const dispatch = useDispatch();
  const store = useStore();
  const qc = useQueryClient();

  // Moves the guest bag and wishlist into the account after sign-in / sign-up.
  async function mergeGuestData() {
    const { guestCart, guestLists } = store.getState();
    try {
      if (guestCart.items.length) {
        const res = await api.mergeCart(guestCart.items);
        qc.setQueryData(['cart'], res);
        dispatch(clearGuestCart());
      }
      if (guestLists.wishlist.length) {
        const res = await api.mergeWishlist(guestLists.wishlist);
        qc.setQueryData(['wishlist'], res);
        dispatch(clearGuestWishlist());
      }
    } catch {
      /* merge is best-effort; the guest data stays in localStorage */
    }
  }

  async function afterAuth(user) {
    dispatch(setUser(user));
    await mergeGuestData();
    qc.invalidateQueries({ queryKey: ['cart'] });
    qc.invalidateQueries({ queryKey: ['wishlist'] });
    return user;
  }

  return {
    login: async (values) => afterAuth((await api.login(values)).user),
    // Admin sessions skip the guest bag/wishlist merge.
    adminLogin: async (values) => {
      const { user } = await api.adminLogin(values);
      dispatch(setUser(user));
      qc.removeQueries({ queryKey: ['cart'] });
      qc.removeQueries({ queryKey: ['wishlist'] });
      return user;
    },
    register: async (values) => afterAuth((await api.register(values)).user),
    resetPassword: async (values) => afterAuth((await api.resetPassword(values)).user),
    logout: async () => {
      await api.logout().catch(() => {});
      dispatch(clearUser());
      qc.removeQueries({ queryKey: ['cart'] });
      qc.removeQueries({ queryKey: ['wishlist'] });
      qc.removeQueries({ queryKey: ['orders'] });
      qc.removeQueries({ queryKey: ['admin'] });
    },
    refreshUser: (user) => dispatch(setUser(user)),
  };
}

export const useIsAdmin = () => useSelector((s) => s.auth.user?.role === 'admin');
