import { useState, useEffect } from 'react';

const WATCHLIST_KEY = 'oversight_report_watchlist';

/**
 * Custom hook for managing the user's facility watchlist
 * Data stored in localStorage as array of { ccn, addedAt }
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWatchlist(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.error('Error loading watchlist:', err);
      setWatchlist([]);
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch (err) {
      console.error('Error saving watchlist:', err);
    }
  }, [watchlist]);

  // Add facility to watchlist
  const addFacility = (ccn) => {
    if (!ccn) return;

    // Check if already in watchlist
    if (watchlist.some(item => item.ccn === ccn)) {
      return;
    }

    const newItem = {
      ccn,
      addedAt: new Date().toISOString()
    };

    setWatchlist(prev => [...prev, newItem]);
  };

  // Remove facility from watchlist
  const removeFacility = (ccn) => {
    setWatchlist(prev => prev.filter(item => item.ccn !== ccn));
  };

  // Check if facility is in watchlist
  const isWatched = (ccn) => {
    return watchlist.some(item => item.ccn === ccn);
  };

  // Clear entire watchlist
  const clearWatchlist = () => {
    setWatchlist([]);
  };

  return {
    watchlist,
    addFacility,
    removeFacility,
    isWatched,
    clearWatchlist
  };
}
