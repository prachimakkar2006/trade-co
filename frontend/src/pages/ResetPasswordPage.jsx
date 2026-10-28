import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      const response = await api.post('/auth/reset-password', { email, token, password });
      setMessage(response.data.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'This reset link could not be used.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="simple-auth-page">
      <Link className="wordmark" to="/login">tread<span>&amp;</span>co</Link>
      <section className="simple-auth-card">
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Choose a new password</h1>
        {message ? <><p className="form-success" role="status">{message}</p><Link className="primary-button button-link" to="/login">Go to sign in <span>↗</span></Link></> : (
          <form className="auth-form" onSubmit={submit}>
            <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength="12" maxLength="128" /></label>
            <label>Confirm password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required minLength="12" maxLength="128" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy || !email || !token}>{busy ? 'Updating…' : 'Update password'} <span aria-hidden="true">↗</span></button>
          </form>
        )}
        <Link className="back-link" to="/login">← Back to sign in</Link>
      </section>
    </main>
  );
}
