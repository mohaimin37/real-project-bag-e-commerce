import { Link } from 'react-router-dom';
import { useUser } from '../hooks/useStore';
import { useWishlist } from '../hooks/useWishlist';
import { ProductGrid, useProductsByIds } from '../components/product';
import { EmptyState, Icon } from '../components/ui';
import Seo from '../components/Seo';

export default function Wishlist() {
  const user = useUser();
  const { ids, products, isLoading } = useWishlist();
  const guest = useProductsByIds(user ? [] : ids);
  const list = user ? products : guest.data;
  const loading = user ? isLoading : ids.length > 0 && guest.isLoading;

  return (
    <div className="container-x py-space-xl">
      <Seo title="Wishlist" noindex />
      <div className="flex flex-col gap-1 mb-space-lg">
        <span className="eyebrow">Saved for later</span>
        <h1 className="text-headline-xl-mobile md:text-headline-xl">Wishlist</h1>
        {!user && ids.length > 0 && (
          <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
            <Icon name="info" className="text-[16px]" /> <Link to="/login?next=/wishlist" className="text-secondary underline">Sign in</Link> to keep your wishlist across devices.
          </p>
        )}
      </div>
      {!loading && (!list || list.length === 0) ? (
        <EmptyState icon="favorite" title="Nothing saved yet" description="Tap the heart on any product to save it here." action={<Link to="/shop" className="btn-primary">Discover the collection</Link>} />
      ) : (
        <ProductGrid products={list || []} loading={loading} count={4} />
      )}
    </div>
  );
}
