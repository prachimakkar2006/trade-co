import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCommerce } from '../context/CommerceContext.jsx';

export function StoreHeader() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const { cartCount, wishlistCount } = useCommerce();
  const navigate = useNavigate();
  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/products${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`);
    setOpen(false);
  };
  return (
    <>
      <div className="store-topline">Complimentary delivery on orders over ₹2,999 <span>Thoughtfully made, made to move</span></div>
      <header className="store-header">
        <Link className="store-logo" to="/">tread<span>&amp;</span>co</Link>
        <button className="menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
        <nav className={`store-nav${open ? ' is-open' : ''}`} aria-label="Main navigation">
          <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/products" onClick={() => setOpen(false)}>Shop all</NavLink>
          <Link to="/story" onClick={() => setOpen(false)}>Our story</Link>
          <a href="mailto:care@treadandco.in">Contact</a>
        </nav>
        <div className="store-actions">
          <form className="store-search" onSubmit={submitSearch} role="search">
            <input aria-label="Search footwear" placeholder="Search footwear" value={search} onChange={(event) => setSearch(event.target.value)} />
            <button aria-label="Submit search" type="submit">⌕</button>
          </form>
          {user ? <Link className="store-action-link account-link" to="/account"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.3" /><path d="M5.5 20c.5-3.3 2.8-5.1 6.5-5.1s6 1.8 6.5 5.1" /></svg><span className="store-action-label">My account</span></Link> : <Link className="store-action-link account-link" to="/login"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.3" /><path d="M5.5 20c.5-3.3 2.8-5.1 6.5-5.1s6 1.8 6.5 5.1" /></svg><span className="store-action-label">Sign in</span></Link>}
          <Link className="store-action-link store-wishlist-link" to="/wishlist" aria-label={`Wishlist, ${wishlistCount} items`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 8.7c0 4-8.4 10-8.4 10s-8.4-6-8.4-10a4.3 4.3 0 0 1 8.4-1.4 4.3 4.3 0 0 1 8.4 1.4Z" /></svg><span className="store-action-label">Wishlist</span><b>{wishlistCount}</b></Link>
          <Link className="store-bag-button" to="/cart" aria-label={`Shopping bag, ${cartCount} items`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg><span>Bag</span><b>{cartCount}</b></Link>
        </div>
      </header>
    </>
  );
}

export function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="footer-main">
        <div><Link className="store-logo footer-logo" to="/">tread<span>&amp;</span>co</Link><p>Thoughtful footwear for wherever the day takes you.</p></div>
        <div><p className="footer-heading">Explore</p><Link to="/products">Shop all</Link><Link to="/story">Our story</Link></div>
        <div><p className="footer-heading">We're here to help</p><a href="mailto:care@treadandco.in">Contact customer care</a><p>Monday–Saturday, 10 am–6 pm IST</p></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} tread&amp;co</span><span>Made with care in India</span></div>
    </footer>
  );
}

export function StoreLayout({ children }) {
  return <div className="store-shell"><StoreHeader />{children}<StoreFooter /></div>;
}
