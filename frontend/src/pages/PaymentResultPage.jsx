import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout.jsx';
import { formatRupees } from '../components/ProductCard.jsx';
import { api } from '../services/api.js';

export default function PaymentResultPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let attempts = 0;
    let timer;
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`);
        if (!active) return;
        setOrder(data.data);
        if (data.data.payment.status === 'pending' && attempts < 20) {
          attempts += 1;
          timer = window.setTimeout(fetchOrder, 2500);
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'We could not load this order.');
      }
    };
    fetchOrder();
    return () => { active = false; window.clearTimeout(timer); };
  }, [orderId]);

  const paid = order?.payment.status === 'paid';
  const refunded = order?.payment.status === 'refunded';
  const failed = order?.payment.status === 'failed';
  return (
    <StoreLayout>
      <main className="payment-result-page">
        <section className={`payment-result-card${paid ? ' is-paid' : refunded ? ' is-refunded' : ''}`}>
          <p className="eyebrow">{paid ? 'PAYMENT CONFIRMED' : refunded ? 'PAYMENT REFUNDED' : failed ? 'PAYMENT NOT COMPLETED' : 'CONFIRMING PAYMENT'}</p>
          <h1>{paid ? 'Your next step is on its way.' : refunded ? 'Your payment has been returned.' : failed ? 'That payment did not go through.' : 'We’re confirming your payment.'}</h1>
          {error ? <p className="form-error" role="alert">{error}</p> : !order ? <p className="lookup-note">Loading your order…</p> : <>
            <p>{paid ? `Order ${order.orderNumber} is confirmed.` : refunded ? `Order ${order.orderNumber} could not be fulfilled and the captured payment was refunded.` : failed ? `Order ${order.orderNumber} is unpaid. You can return to checkout and try again.` : 'Razorpay is confirming the payment. This page will update automatically.'}</p>
            <div className="payment-result-total"><span>Order total</span><strong>{formatRupees(order.total)}</strong></div>
            <p className="payment-result-status">Order status: <strong>{order.status.replaceAll('_', ' ')}</strong> · Payment: <strong>{order.payment.status}</strong></p>
          </>}
          <div className="payment-result-actions">
            {paid && <Link className="shop-button" to="/products">Continue exploring <span>↗</span></Link>}
            {!paid && <Link className="shop-button" to="/checkout">Return to checkout <span>↗</span></Link>}
            <Link className="text-link" to="/account">Go to your account</Link>
          </div>
        </section>
      </main>
    </StoreLayout>
  );
}
