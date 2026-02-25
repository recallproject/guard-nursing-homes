import { useState, useEffect, useContext, createContext, useCallback } from 'react';

const WATCHLIST_KEY = 'oversight_report_watchlist';

const WatchlistContext = createContext(null);

/**
 * Provider that holds watchlist state in a single place.
 * Wrap your app with <WatchlistProvider> so all components share one list.
 */
export function WatchlistProvider({ children }) {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error('Error loading watchlist:', err);
    }
    return [];
  });

  // Save to localStorage whenever watchlist changes
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch (err) {
      console.error('Error saving watchlist:', err);
    }
  }, [watchlist]);

  const addFacility = useCallback((ccn) => {
    if (!ccn) return;
    setWatchlist(prev => {
      if (prev.some(item => item.ccn === ccn)) return prev;
      return [...prev, { ccn, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFacility = useCallback((ccn) => {
    setWatchlist(prev => prev.filter(item => item.ccn !== ccn));
  }, []);

  const isWatched = useCallback((ccn) => {
    return watchlist.some(item => item.ccn === ccn);
  }, [watchlist]);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return (
    <WatchlistContext.Provider value={{ watchlist, addFacility, removeFacility, isWatched, clearWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

/**
 * Hook to access the shared watchlist.
 * Must be used inside <WatchlistProvider>.
 */
export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
