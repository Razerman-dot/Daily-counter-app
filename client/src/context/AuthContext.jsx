import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

/**
 * Holds the logged-in user. On boot it asks the API "who am I?" using the
 * httpOnly cookie (JS never sees the token itself).
 *
 * status: 'loading' | 'ready' | 'error'  ('error' = server unreachable at boot)
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    try {
      setUser(await authApi.me());
      setStatus('ready');
    } catch (err) {
      setUser(null);
      // 401 just means "not logged in"; anything else is a real problem.
      setStatus(err.status === 401 ? 'ready' : 'error');
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // The API client fires this when any request comes back 401.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      // A fixed id means several failing requests produce a single toast.
      toast.error('Your session expired. Please log in again.', { id: 'session-expired' });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const u = await authApi.login(credentials);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (details) => {
    const u = await authApi.register(details);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (changes) => {
    const u = await authApi.updateMe(changes);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, updateProfile, retry: bootstrap }),
    [user, status, login, register, logout, updateProfile, bootstrap]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
