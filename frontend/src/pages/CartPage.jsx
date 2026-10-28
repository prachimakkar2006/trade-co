import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout.jsx';
import { formatRupees } from '../components/ProductCard.jsx';
import { useCommerce } from '../context/CommerceContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getProductImages } from '../productImages.js';

export default function CartPage() {
  const { cart, cartCount, updateCartItem, removeCartItem, applyCoupon, removeCoupon, commerceError } = useCommerce();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitCoupon(event) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      await applyCoupon(couponCode);
      if (user) { setMessage('Coupon applied to your bag.'); setCouponCode(''); }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not apply that coupon.');
    } finally { setBusy(false); }
  }

  async function removeCouponCode() {
    try { await removeCoupon(); setMessage('Coupon removed.'); setError(''); }
    catch (requestError) { setError(requestError.response?.data?.message || 'We could not remove the coupon.'); }
  }

  const items = cart?.items || [];
  return (
    <StoreLayout>
      <main className="commerce-page">
        <div className="commerce-heading"><p className="eyebrow">YOUR SELECTION</p><h1>Your bag<span>{cartCount ? ` · ${cartCount}` : ''}</span></h1><Link to="/products" className="text-link">Continue shopping ↗</Link></div>
        {commerceError && <p className="form-error" role="alert">{commerceError}</p>}
        {items.length ? <div className="cart-layout">
          <section className="cart-items" aria-label="Shopping bag items">
            {items.map((item) => <article className="cart-line" key={item.sku}>
              <Link className="cart-line-image" to={`/products/${item.product.slug}`}><img src={getProductImages(item.product)[0]} alt={item.product.title} /></Link>
              <div className="cart-line-details"><p className="product-brand">{item.product.brand}</p><Link to={`/products/${item.product.slug}`} className="cart-line-title">{item.product.title}</Link><p className="cart-line-meta">{item.product.color || 'Everyday'} · UK {item.size}</p><div className="cart-line-controls"><label>Qty <select value={item.quantity} onChange={(event) => updateCartItem(item.sku, Number(event.target.value)).catch((requestError) => setError(requestError.response?.data?.message || requestError.message))}>{Array.from({ length: Math.min(item.availableStock || 20, 20) }, (_, index) => index + 1).map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select></label><button type="button" onClick={() => removeCartItem(item.sku).catch((requestError) => setError(requestError.response?.data?.message || 'Could not remove this item.'))}>Remove</button></div></div>
              <strong className="cart-line-price">{formatRupees(item.lineTotal ?? item.product.price * item.quantity)}</strong>
            </article>)}
            <p className="cart-reassurance">Free delivery on orders over {formatRupees(2999)}. Easy 7-day returns.</p>
          </section>
          <aside className="cart-summary">
            <h2>Order summary</h2>
            <form className="coupon-form" onSubmit={submitCoupon}><label htmlFor="coupon-code">Have a coupon?</label><div><input id="coupon-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter code" maxLength={40} /><button type="submit" disabled={!couponCode.trim() || busy}>{busy ? 'Applying…' : 'Apply'}</button></div></form>
            {cart.coupon && <div className="applied-coupon"><span><strong>{cart.coupon.code}</strong><small>{cart.coupon.description}</small></span><button type="button" onClick={removeCouponCode}>Remove</button></div>}
            {cart.couponError && <p className="form-error" role="alert">{cart.couponError}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
            {!user && <p className="coupon-login-note">Sign in to apply a coupon. Your bag will be waiting when you return.</p>}
            <div className="summary-divider" />
            <div className="summary-row"><span>Subtotal</span><span>{formatRupees(cart.pricing.subtotal)}</span></div>
            {cart.pricing.discount > 0 && <div className="summary-row discount-row"><span>Discount</span><span>− {formatRupees(cart.pricing.discount)}</span></div>}
            <div className="summary-row"><span>Delivery</span><span>{cart.pricing.shipping ? formatRupees(cart.pricing.shipping) : 'Complimentary'}</span></div>
            <div className="summary-divider" />
            <div className="summary-row summary-total"><strong>Total</strong><strong>{formatRupees(cart.pricing.total)}</strong></div>
            <p className="inclusive-note">Inclusive of all taxes.</p>
            <button className="shop-button checkout-button" type="button" disabled={!items.length} onClick={() => navigate('/checkout')}>Continue to delivery <span>↗</span></button>
            {!user && items.length > 0 && <p className="checkout-login-note">You’ll be asked to sign in before saving your delivery details.</p>}
          </aside>
        </div> : <section className="empty-commerce"><span className="empty-icon">⌑</span><h2>Your bag is taking a little breather.</h2><p>Find a pair that feels like you and it will be waiting here.</p><Link className="shop-button" to="/products">Explore footwear <span>↗</span></Link></section>}
      </main>
    </StoreLayout>
  );
}
