import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { StoreLayout } from '../components/StoreLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCommerce } from '../context/CommerceContext.jsx';

export default function WishlistPage() {
  const { wishlist, commerceLoading } = useCommerce();
  const { user } = useAuth();
  return (
    <StoreLayout>
      <main className="commerce-page wishlist-page">
        <div className="commerce-heading"><p className="eyebrow">KEEP THE ONES YOU LOVE CLOSE</p><h1>Your wishlist<span>{wishlist.length ? ` · ${wishlist.length}` : ''}</span></h1><p>Good pairs are worth coming back to.</p></div>
        {commerceLoading ? <div className="catalog-message">Loading your wishlist…</div> : wishlist.length ? <>
          {!user && <p className="wishlist-sync-note">Your saved pairs are stored on this device. Sign in to sync your wishlist across devices.</p>}
          <div className="product-grid">{wishlist.map((product) => <ProductCard key={product._id} product={product} />)}</div>
        </> : <section className="empty-commerce"><span className="empty-icon">♡</span><h2>No favorites just yet.</h2><p>Tap the heart on any pair to save it here.</p><Link className="shop-button" to="/products">Find your favorites <span>↗</span></Link></section>}
      </main>
    </StoreLayout>
  );
}
