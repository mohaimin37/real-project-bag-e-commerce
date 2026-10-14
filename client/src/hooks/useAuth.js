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

  async function afterAuth(res) {
    const user = res?.user || res;
    const token = res?.token;
    dispatch(setUser({ user, token }));
    await mergeGuestData();
    qc.invalidateQueries({ queryKey: ['cart'] });
    qc.invalidateQueries({ queryKey: ['wishlist'] });
    return user;
  }

  return {
    login: async (values) => afterAuth(await api.login(values)),
    // Admin sessions skip the guest bag/wishlist merge.
    adminLogin: async (values) => {
      const res = await api.adminLogin(values);
      dispatch(setUser({ user: res.user, token: res.token }));
      qc.removeQueries({ queryKey: ['cart'] });
      qc.removeQueries({ queryKey: ['wishlist'] });
      return res.user;
    },
    // Returns { user, rewards } so the page can confirm exactly what the server awarded.
    register: async (values) => {
      const res = await api.register(values);
      const user = await afterAuth(res);
      qc.invalidateQueries({ queryKey: ['my-coins'] });
      return { user, rewards: res.rewards || {} };
    },
    resetPasswordOtp: async (values) => afterAuth(await api.resetPasswordOtp(values)),
    resetPassword: async (values) => afterAuth(await api.resetPassword(values)),
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
