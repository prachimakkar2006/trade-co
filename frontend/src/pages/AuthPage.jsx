import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleSignIn from '../components/GoogleSignIn.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const goToAccount = () => navigate(location.state?.from || '/account', { replace: true });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      goToAccount();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="tread&co brand">
        <Link className="wordmark" to="/login">tread<span>&amp;</span>co</Link>
        <div className="story-copy">
          <p className="eyebrow">MADE TO MOVE WITH YOU</p>
          <h1>Good things<br />start with a<br /><em>first step.</em></h1>
          <p>Thoughtful footwear. Considered details. A little more comfort in every day.</p>
        </div>
        <p className="story-foot">A better fit for the way you move.</p>
      </section>

      <section className="auth-panel">
        <div className="mobile-brand"><Link className="wordmark" to="/login">tread<span>&amp;</span>co</Link></div>
        <div className="auth-card">
          <p className="eyebrow">YOUR NEXT STEP</p>
          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-subtitle">{isRegister ? 'Join tread&co for a more considered everyday.' : 'Sign in to pick up where you left off.'}</p>

          <GoogleSignIn onError={setError} onSuccess={goToAccount} />
          {import.meta.env.VITE_GOOGLE_CLIENT_ID && <div className="form-divider"><span>or use email</span></div>}

          <form onSubmit={submit} className="auth-form">
            {isRegister && <label>Full name<input name="name" value={form.name} onChange={update} autoComplete="name" required minLength="2" maxLength="100" /></label>}
            <label>Email address<input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required maxLength="254" /></label>
            <label>Password<input type="password" name="password" value={form.password} onChange={update} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 12 : 1} maxLength="128" /></label>
            {!isRegister && <div className="form-link-row"><span>Secure sign-in</span><Link to="/forgot-password">Forgot password?</Link></div>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <span aria-hidden="true">↗</span></button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to tread&co?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
          </p>
          <p className="auth-legal">By continuing, you agree to our terms and privacy policy.</p>
        </div>
      </section>
    </main>
  );
}
