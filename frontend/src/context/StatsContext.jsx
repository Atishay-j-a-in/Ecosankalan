import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getWasteStats } from '../services/api';

const StatsContext = createContext(null);

const RANGES = ['week', 'month', 'all'];

/**
 * Cached waste-stats provider.
 * Shape: { statsData: { week, month, all }, loading, refresh }
 * Each range entry may be null until loaded. Only fetches when logged in.
 */
export function StatsProvider({ children }) {
  const { user } = useAuth();
  const [statsData, setStatsData] = useState({ week: null, month: null, all: null });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    // Appwrite sessions live in the SDK's storage — gate on the cached
    // MongoDB profile instead of a legacy localStorage token.
    if (!localStorage.getItem('user')) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(RANGES.map((r) => getWasteStats(r)));
      setStatsData((prev) => {
        const next = { ...prev };
        results.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value?.data) next[RANGES[i]] = res.value.data;
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setStatsData({ week: null, month: null, all: null });
  }, [user, refresh]);

  return (
    <StatsContext.Provider value={{ statsData, loading, refresh }}>
      {children}
    </StatsContext.Provider>
  );
}

export const useStats = () => {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used inside <StatsProvider>');
  return ctx;
};
