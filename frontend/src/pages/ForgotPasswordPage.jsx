import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not send the reset email. Try again later.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="simple-auth-page">
      <Link className="wordmark" to="/login">tread<span>&amp;</span>co</Link>
      <section className="simple-auth-card">
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Reset your password</h1>
        <p>Enter your account email and we’ll send a reset link if it matches an account.</p>
        {message ? <p className="form-success" role="status">{message}</p> : (
          <form className="auth-form" onSubmit={submit}>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength="254" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'} <span aria-hidden="true">↗</span></button>
          </form>
        )}
        <Link className="back-link" to="/login">← Back to sign in</Link>
      </section>
    </main>
  );
}
