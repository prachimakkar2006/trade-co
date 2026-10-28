import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, clearSessionTokens, setSessionTokens } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const restoreStarted = useRef(false);

  const applySession = useCallback((payload) => {
    setSessionTokens(payload.accessToken, payload.csrfToken);
    setUser(payload.user);
    return payload.user;
  }, []);

  const clearSession = useCallback(() => {
    clearSessionTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    const expire = () => clearSession();
    window.addEventListener('auth:expired', expire);
    if (restoreStarted.current) return () => window.removeEventListener('auth:expired', expire);
    restoreStarted.current = true;

    async function restoreSession() {
      try {
        const csrf = await api.get('/auth/csrf');
        setSessionTokens(null, csrf.data.data.csrfToken);
        const refreshed = await api.post('/auth/refresh');
        applySession(refreshed.data.data);
        const current = await api.get('/auth/me');
        setUser(current.data.data.user);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
    return () => window.removeEventListener('auth:expired', expire);
  }, [applySession, clearSession]);

  const finishSignIn = useCallback(async (path, body) => {
    const { data } = await api.post(path, body);
    return applySession(data.data);
  }, [applySession]);

  const login = useCallback((credentials) => finishSignIn('/auth/login', credentials), [finishSignIn]);
  const register = useCallback((details) => finishSignIn('/auth/register', details), [finishSignIn]);
  const loginWithGoogle = useCallback((idToken) => finishSignIn('/auth/google', { idToken }), [finishSignIn]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const setProfile = useCallback((nextUser) => setUser(nextUser), []);
  const value = useMemo(() => ({ user, loading, login, register, loginWithGoogle, logout, setProfile }), [
    user, loading, login, register, loginWithGoogle, logout, setProfile
  ]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
