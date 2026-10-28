import { Link } from 'react-router-dom';
import { useCommerce } from '../context/CommerceContext.jsx';
import { getProductImages } from '../productImages.js';

export function formatRupees(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function ProductCard({ product }) {
  const { toggleWishlist, isWishlisted } = useCommerce();
  const images = getProductImages(product);
  const saved = isWishlisted(product._id);
  const discount = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  return (
    <article className="product-card">
      <Link className="product-image-link" to={`/products/${product.slug}`} aria-label={`View ${product.title}`}>
        {images[0] ? <img className="product-image" src={images[0]} alt={product.title} loading="lazy" /> : <div className="product-image product-image-empty">tread&amp;co</div>}
        {product.isExclusive && <span className="product-badge">Exclusive</span>}
        <span className="product-quickview">Choose your size <span aria-hidden="true">↗</span></span>
      </Link>
      <button className={`wishlist-toggle${saved ? ' is-saved' : ''}`} type="button" aria-label={saved ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`} aria-pressed={saved} onClick={() => toggleWishlist(product).catch(() => {})}>{saved ? '♥' : '♡'}</button>
      <div className="product-card-copy">
        <p className="product-brand">{product.brand}</p>
        <Link className="product-title" to={`/products/${product.slug}`}>{product.title}</Link>
        <div className="product-price"><strong>{formatRupees(product.price)}</strong>{product.mrp > product.price && <><del>{formatRupees(product.mrp)}</del><span>{discount}% off</span></>}</div>
        {product.rating > 0 && <p className="product-rating">★ {product.rating.toFixed(1)} <span>({product.reviewCount || 0})</span></p>}
      </div>
    </article>
  );
}
