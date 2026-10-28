import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatRupees } from '../components/ProductCard.jsx';
import { StoreLayout } from '../components/StoreLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCommerce } from '../context/CommerceContext.jsx';
import { api } from '../services/api.js';
import { loadRazorpayCheckout } from '../services/razorpay.js';

const blankAddress = { fullName: '', phone: '', pincode: '', addressLine1: '', addressLine2: '', landmark: '', city: '', state: '', type: 'home', isDefault: false };

function createIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, commerceLoading } = useCommerce();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ ...blankAddress, fullName: user?.name || '' });
  const [addingNew, setAddingNew] = useState(false);
  const [lookup, setLookup] = useState({ busy: false, message: '', localities: [] });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/users/addresses').then(({ data }) => {
      if (!active) return;
      setAddresses(data.data);
      const preferred = data.data.find((address) => address.isDefault) || data.data[0];
      if (preferred) setSelectedId(preferred._id);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'We could not load saved addresses.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const pincode = form.pincode.trim();
    if (!/^\d{6}$/.test(pincode)) { setLookup({ busy: false, message: '', localities: [] }); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookup({ busy: true, message: '', localities: [] });
      try {
        const { data } = await api.get(`/pincode/${pincode}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setForm((current) => ({ ...current, city: data.data.city || current.city, state: data.data.state || current.state }));
        setLookup({ busy: false, message: `Found ${data.data.city}, ${data.data.state}.`, localities: data.data.localities || [] });
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setLookup({ busy: false, message: requestError.response?.data?.message || 'PIN lookup unavailable. Enter city and state manually.', localities: [] });
      }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [form.pincode]);

  function selectAddress(address) {
    setSelectedId(address._id);
    setAddingNew(false);
    setSaved(false);
    setError('');
  }

  async function saveAddress(event) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      const payload = { ...form, isDefault: addresses.length === 0 || form.isDefault };
      const { data } = await api.post('/users/addresses', payload);
      setAddresses((current) => [...current, data.data]);
      setSelectedId(data.data._id);
      setAddingNew(false);
      setSaved(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not save this address. Check the details and try again.');
    } finally { setBusy(false); }
  }

  async function payNow() {
    if (!selectedAddress || !items.length) return;
    setPaymentError('');
    setPaymentBusy(true);
    try {
      if (!await loadRazorpayCheckout()) throw new Error('Razorpay Checkout could not load. Check your internet connection and try again.');
      const idempotencyKey = createIdempotencyKey();
      const { data } = await api.post('/orders', { addressId: selectedAddress._id }, { headers: { 'Idempotency-Key': idempotencyKey } });
      const checkoutData = data.data;
      let verificationStarted = false;
      const checkout = new window.Razorpay({
        key: checkoutData.keyId,
        amount: checkoutData.razorpayOrder.amount,
        currency: checkoutData.razorpayOrder.currency,
        name: 'tread&co',
        description: `Order ${checkoutData.order.orderNumber}`,
        order_id: checkoutData.razorpayOrder.id,
        prefill: { name: user?.name || selectedAddress.fullName, email: user?.email || '', contact: selectedAddress.phone },
        theme: { color: '#C9A24B' },
        handler: async (response) => {
          verificationStarted = true;
          try {
            await api.post('/payments/verify', response);
          } catch (verificationError) {
            setPaymentError(verificationError.response?.data?.message || 'Payment was submitted. We are waiting for Razorpay to confirm it.');
          }
          navigate(`/payment-result/${checkoutData.order._id}`);
        },
        modal: { ondismiss: () => { if (!verificationStarted) setPaymentBusy(false); } }
      });
      checkout.on('payment.failed', (event) => {
        setPaymentError(event.error?.description || 'Payment did not complete. You can try again.');
        setPaymentBusy(false);
      });
      checkout.open();
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || requestError.message || 'We could not start checkout. Please try again.');
      setPaymentBusy(false);
    }
  }

  const selectedAddress = addresses.find((address) => address._id === selectedId);
  const items = cart?.items || [];
  return (
    <StoreLayout>
      <main className="checkout-page">
        <div className="commerce-heading"><p className="eyebrow">ALMOST THERE</p><h1>Delivery details</h1><p>Choose where you would like your order to arrive.</p></div>
        <div className="checkout-layout">
          <section className="delivery-card">
            <div className="checkout-step"><span>01</span><div><h2>Delivery address</h2><p>Saved securely to your tread&amp;co account.</p></div></div>
            {addresses.length > 0 && <div className="saved-addresses">{addresses.map((address) => <button key={address._id} type="button" className={`saved-address${selectedId === address._id && !addingNew ? ' is-selected' : ''}`} onClick={() => selectAddress(address)}>
              <span className="address-radio" /> <span><strong>{address.fullName} · {address.type}</strong><small>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city}, {address.state} {address.pincode}</small><small>{address.phone}</small></span>{address.isDefault && <em>Default</em>}
            </button>)}</div>}
            {addresses.length > 0 && !addingNew && <button className="add-address-button" type="button" onClick={() => { setAddingNew(true); setSelectedId(''); setSaved(false); }}>+ Add a new address</button>}
            {(addingNew || !addresses.length) && <form className="address-form" onSubmit={saveAddress}>
              <div className="address-form-grid">
                <label>Full name<input autoComplete="name" required minLength={2} maxLength={100} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
                <label>Mobile number<input autoComplete="tel" inputMode="numeric" required pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit Indian number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
                <label className="address-wide">Address line 1<input autoComplete="address-line1" required minLength={5} maxLength={180} value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} /></label>
                <label className="address-wide">Address line 2 <span className="optional-label">Optional</span><input autoComplete="address-line2" maxLength={180} value={form.addressLine2} onChange={(event) => setForm({ ...form, addressLine2: event.target.value })} /></label>
                <label>Landmark <span className="optional-label">Optional</span><input maxLength={120} value={form.landmark} onChange={(event) => setForm({ ...form, landmark: event.target.value })} /></label>
                <label>PIN code<input autoComplete="postal-code" inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} value={form.pincode} onChange={(event) => setForm({ ...form, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })} /></label>
                <label>City / district<input autoComplete="address-level2" required minLength={2} maxLength={100} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
                <label>State<input autoComplete="address-level1" required minLength={2} maxLength={100} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></label>
                <label>Address type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="home">Home</option><option value="work">Work</option></select></label>
              </div>
              {lookup.message && <p className={lookup.busy ? 'lookup-note' : lookup.message.startsWith('Found') ? 'form-success' : 'lookup-note'} role="status">{lookup.busy ? 'Looking up PIN code…' : lookup.message}</p>}
              {lookup.localities.length > 1 && <p className="lookup-note">Nearby post offices: {lookup.localities.slice(0, 4).join(', ')}</p>}
              <label className="default-address-check"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} /> Set as my default address</label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="shop-button address-submit" type="submit" disabled={busy}>{busy ? 'Saving address…' : 'Save delivery address'} <span>↗</span></button>
            </form>}
            {!addingNew && selectedAddress && <div className="selected-address-confirm"><strong>Delivering to {selectedAddress.fullName}</strong><p>{selectedAddress.addressLine1}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}</p></div>}
            {saved && <p className="form-success" role="status">Delivery address saved to your account.</p>}
          </section>
          <aside className="cart-summary checkout-summary">
            <h2>Your order</h2>
            {commerceLoading ? <p className="lookup-note">Loading your bag…</p> : items.length ? items.map((item) => <div className="checkout-item" key={item.sku}><span>{item.product.title} · UK {item.size} × {item.quantity}</span><strong>{formatRupees(item.lineTotal ?? item.product.price * item.quantity)}</strong></div>) : <p>Your bag is empty. <Link to="/products">Browse footwear</Link></p>}
            <div className="summary-divider" />
            <div className="summary-row"><span>Subtotal</span><span>{formatRupees(cart.pricing.subtotal)}</span></div>
            {cart.pricing.discount > 0 && <div className="summary-row discount-row"><span>Discount</span><span>− {formatRupees(cart.pricing.discount)}</span></div>}
            <div className="summary-row"><span>Delivery</span><span>{cart.pricing.shipping ? formatRupees(cart.pricing.shipping) : 'Complimentary'}</span></div>
            <div className="summary-divider" /><div className="summary-row summary-total"><strong>Total</strong><strong>{formatRupees(cart.pricing.total)}</strong></div>
            <p className="inclusive-note">Inclusive of all taxes. Test-mode payments do not charge real money.</p>
            {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
            <button className="shop-button checkout-button" type="button" disabled={paymentBusy || commerceLoading || !selectedAddress || !items.length} onClick={payNow}>
              {paymentBusy ? 'Opening secure checkout…' : 'Pay securely with Razorpay'} <span>↗</span>
            </button>
            <Link className="text-link" to="/cart">← Return to your bag</Link>
          </aside>
        </div>
      </main>
    </StoreLayout>
  );
}
