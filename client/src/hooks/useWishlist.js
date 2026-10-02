import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { toggleGuestWishlist } from '../store';

export function useWishlist() {
  const user = useSelector((s) => s.auth.user);
  const authReady = useSelector((s) => s.auth.status === 'ready');
  const guestIds = useSelector((s) => s.guestLists.wishlist);
  const dispatch = useDispatch();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wishlist'],
    queryFn: api.wishlist,
    enabled: authReady && Boolean(user),
    select: (d) => d.wishlist,
  });

  const ids = user ? (query.data?.ids || []).map(String) : guestIds;
  const has = (id) => ids.includes(String(id));

  const toggle = useMutation({
    mutationFn: async (product) => {
      const id = String(product._id);
      const adding = !has(id);
      if (user) {
        const res = adding ? await api.addWishlist(id) : await api.removeWishlist(id);
        qc.setQueryData(['wishlist'], res);
      } else {
        dispatch(toggleGuestWishlist(id));
      }
      return adding;
    },
    onSuccess: (adding, product) => toast.success(adding ? `Saved ${product.name} to your wishlist` : 'Removed from wishlist'),
    onError: (err) => toast.error(err.message),
  });

  return { ids, has, toggle, count: ids.length, products: query.data?.products, isLoading: user ? query.isLoading : false };
}
