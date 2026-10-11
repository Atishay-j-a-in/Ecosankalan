import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persist = (nextUser, token) => {
    if (token) localStorage.setItem('token', token);
    if (nextUser) localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser || null);
  };

  const login = useCallback((nextUser, token) => {
    persist(nextUser, token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...(partial || {}) };
      try {
        localStorage.setItem('user', JSON.stringify(merged));
      } catch {
        // storage unavailable — state still updates
      }
      return merged;
    });
  }, []);

  // Refresh profile once on boot when a token exists (keeps points in sync).
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    getProfile()
      .then((res) => {
        if (res?.data) updateUser(res.data);
      })
      .catch(() => {
        // Invalid/expired token — stay logged out silently.
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
