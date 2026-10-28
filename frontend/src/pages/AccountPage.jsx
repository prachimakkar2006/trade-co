import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout.jsx';
import { formatRupees } from '../components/ProductCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export default function AccountPage() {
  const { user, setProfile, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ name: user?.name || '', phone: user?.phone || '' });
  }, [user]);
  useEffect(() => {
    api.get('/orders').then(({ data }) => setOrders(data.data)).catch((requestError) => setError(requestError.response?.data?.message || 'Could not load your orders.'));
  }, []);

  async function saveProfile(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const { data } = await api.patch('/auth/profile', form);
      setProfile(data.data.user); setNotice('Your details have been updated.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save your details.'); }
    finally { setSaving(false); }
  }

  return (
    <StoreLayout>
      <main className="account-page account-dashboard">
        <header className="account-header"><Link className="wordmark" to="/">tread<span>&amp;</span>co</Link><button className="text-button" onClick={logout}>Sign out</button></header>
        <section className="account-welcome"><p className="eyebrow">YOUR ACCOUNT</p><h1>Good to have you here, {user?.name?.split(' ')[0]}.</h1><p>Manage your details and keep up with every step of your order.</p></section>
        {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
        <div className="account-columns">
          <section className="account-panel"><div className="account-panel-heading"><p className="eyebrow">ORDER HISTORY</p><span>{orders.length} orders</span></div>
            {!orders.length ? <div className="account-empty"><p>Your first pair is waiting.</p><Link className="text-link" to="/products">Explore the collection →</Link></div> : <div className="account-order-list">{orders.map((order) => <article className="account-order" key={order._id}>
              <div className="account-order-main"><div><span className="account-order-number">{order.orderNumber}</span><span className={`order-status status-${order.status}`}>{order.status.replaceAll('_', ' ')}</span></div><p>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p></div>
              <strong>{formatRupees(order.total)}</strong><Link className="text-link" to={`/account/orders/${order._id}`}>View order →</Link>
            </article>)}</div>}
          </section>
          <section className="account-panel"><div className="account-panel-heading"><p className="eyebrow">PERSONAL DETAILS</p></div><form className="profile-form" onSubmit={saveProfile}>
            <label>Full name<input required minLength="2" maxLength="100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Email address<input value={user?.email || ''} readOnly /></label>
            <label>Phone number<input inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength="10" placeholder="10-digit mobile number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save details'} <span>↗</span></button>
          </form></section>
        </div>
      </main>
    </StoreLayout>
  );
}
