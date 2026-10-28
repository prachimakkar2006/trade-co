import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout.jsx';
import { formatRupees } from '../components/ProductCard.jsx';
import { api } from '../services/api.js';
import { useCommerce } from '../context/CommerceContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getProductImages } from '../productImages.js';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [commerceError, setCommerceError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewError, setReviewError] = useState('');
  const { addToCart } = useCommerce();
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true); setProduct(null); setSize(null); setImageIndex(0); setError('');
    api.get(`/products/${encodeURIComponent(slug)}`).then(({ data }) => { if (active) setProduct(data.data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'This pair could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    api.get(`/products/${encodeURIComponent(slug)}/reviews`).then(({ data }) => setReviews(data.data)).catch(() => setReviews([]));
  }, [slug]);

  if (loading) return <StoreLayout><main className="product-state">Loading this pair…</main></StoreLayout>;
  if (error || !product) return <StoreLayout><main className="product-state"><p className="eyebrow">A SMALL DETOUR</p><h1>{error || 'Product not found.'}</h1><Link className="text-link" to="/products">Back to the collection ↗</Link></main></StoreLayout>;

  const available = product.sizes?.filter((item) => item.stock > 0) || [];
  const images = getProductImages(product);
  const discount = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  const specifications = product.specifications instanceof Object ? Object.entries(product.specifications) : [];

  async function handleAddToBag() {
    setCommerceError(''); setAdded(false);
    try {
      await addToCart(product, size);
      setAdded(true);
    } catch (requestError) {
      setCommerceError(requestError.response?.data?.message || 'We could not add this pair. Please try again.');
    }
  }

  async function submitReview(event) {
    event.preventDefault(); setReviewError(''); setReviewMessage('');
    try {
      await api.post(`/products/${product._id}/reviews`, reviewForm);
      setReviewMessage('Thanks. Your verified review is waiting for moderation.');
      setReviewForm({ rating: 5, title: '', body: '' });
    } catch (requestError) { setReviewError(requestError.response?.data?.message || 'Review could not be submitted.'); }
  }

  return (
    <StoreLayout>
      <main className="product-detail-page">
        <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to={`/products?category=${product.category?.slug || ''}`}>{product.category?.name || 'Footwear'}</Link><span>/</span><span>{product.title}</span></div>
        <div className="product-detail-grid">
          <section className="product-gallery" aria-label="Product images">
            <div className="product-main-image">{images.length ? <img src={images[imageIndex]} alt={`${product.title} view ${imageIndex + 1}`} /> : <div className="product-image-empty">tread&amp;co</div>}{product.isExclusive && <span className="product-badge">Exclusive</span>}</div>
            {images.length > 1 && <div className="product-thumbnails">{images.map((image, index) => <button className={index === imageIndex ? 'is-selected' : ''} key={image} onClick={() => setImageIndex(index)} aria-label={`Show product image ${index + 1}`}><img src={image} alt="" /></button>)}</div>}
          </section>
          <section className="product-detail-copy">
            <p className="eyebrow">{product.brand} · {product.category?.name}</p>
            <h1>{product.title}</h1>
            {product.rating > 0 && <p className="detail-rating">★ {product.rating.toFixed(1)} <span>({product.reviewCount || 0} reviews)</span></p>}
            <div className="detail-price"><strong>{formatRupees(product.price)}</strong>{product.mrp > product.price && <><del>{formatRupees(product.mrp)}</del><span>{discount}% off</span></>}</div>
            <p className="tax-note">Inclusive of all taxes. Complimentary delivery over ₹2,999.</p>
            <div className="detail-divider" />
            <div className="size-heading"><strong>Select UK size</strong><span>UK sizing</span></div>
            <div className="size-options">{product.sizes?.map((item) => <button key={item.size} type="button" disabled={!item.stock} className={size === item.size ? 'is-selected' : ''} onClick={() => setSize(item.size)} aria-pressed={size === item.size}>{item.size}{!item.stock && <span className="sr-only">, out of stock</span>}</button>)}</div>
            {!available.length && <p className="stock-note">Currently out of stock in every size.</p>}
            <button className="shop-button detail-cta" type="button" disabled={!size || !available.length} onClick={handleAddToBag}>Add to bag <span>↗</span></button>
            {commerceError && <p className="form-error" role="alert">{commerceError}</p>}
            {added && <p className="form-success" role="status">Added to your bag. <Link to="/cart">View bag</Link></p>}
            <div className="detail-divider" />
            <h2>Made for everyday wear</h2><p className="product-description">{product.description}</p>
            <div className="detail-promises"><span>Easy 7-day returns</span><span>Secure payments</span><span>Made with care</span></div>
          </section>
        </div>
        {specifications.length > 0 && <section className="specification-section"><p className="eyebrow">THE DETAILS</p><h2>Considered down to the last step.</h2><dl>{specifications.map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{value}</dd></div>)}</dl></section>}
        <section className="review-section"><div className="review-section-heading"><div><p className="eyebrow">WORN & REVIEWED</p><h2>Notes from our customers</h2></div><span>{product.rating ? `${product.rating.toFixed(1)} ★ · ${product.reviewCount} reviews` : 'No reviews yet'}</span></div>
          {reviews.length ? <div className="customer-reviews">{reviews.map((review) => <article key={review._id}><div><strong>{review.title || `${review.rating} out of 5`}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p>{review.body}</p><small>{review.customerName} · {new Date(review.createdAt).toLocaleDateString('en-IN')} {review.isVerifiedPurchase && '· Verified purchase'}</small></article>)}</div> : <p className="review-empty">Be the first to share how this pair feels.</p>}
          {user ? <form className="review-form" onSubmit={submitReview}><h3>Share your experience</h3><p className="review-form-hint">Reviews are available to customers with a delivered order for this pair.</p><label>Rating<select value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}</select></label><label>Title (optional)<input maxLength="120" value={reviewForm.title} onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })} /></label><label>Your review<textarea minLength="10" maxLength="2000" required rows="4" value={reviewForm.body} onChange={(event) => setReviewForm({ ...reviewForm, body: event.target.value })} /></label><button className="primary-button">Submit review <span>↗</span></button>{reviewError && <p className="form-error" role="alert">{reviewError}</p>}{reviewMessage && <p className="form-success" role="status">{reviewMessage}</p>}</form> : <p className="review-signin"><Link to="/login">Sign in</Link> to leave a verified review after delivery.</p>}
        </section>
      </main>
    </StoreLayout>
  );
}
