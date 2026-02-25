/**
 * useSubscription hook
 *
 * Returns the current user's subscription tier from localStorage.
 * Set by the success page after Stripe payment.
 *
 * Tier hierarchy: free < pro < professional < institutional
 */

import { useState, useEffect } from 'react';

const TIER_HIERARCHY = {
  free: 0,
  pro: 1,
  professional: 2,
  institutional: 3,
};

/**
 * Main hook - returns subscription status from localStorage
 */
export function useSubscription() {
  const [tier, setTier] = useState(() => {
    return localStorage.getItem('subscription_tier') || 'free';
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for storage changes (e.g. if user subscribes in another tab)
    const handleStorage = (e) => {
      if (e.key === 'subscription_tier') {
        setTier(e.newValue || 'free');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    tier,
    loading,
  };
}

/**
 * Check if current tier meets or exceeds required tier
 * @param {string} currentTier - User's current tier
 * @param {string} requiredTier - Minimum tier needed
 * @returns {boolean}
 */
export function canAccess(currentTier, requiredTier) {
  const currentLevel = TIER_HIERARCHY[currentTier] ?? 0;
  const requiredLevel = TIER_HIERARCHY[requiredTier] ?? 0;
  return currentLevel >= requiredLevel;
}

/**
 * Get tier name for display
 */
export function getTierName(tier) {
  const names = {
    free: 'Free',
    pro: 'Pro',
    professional: 'Professional',
    institutional: 'Institutional',
  };
  return names[tier] || 'Free';
}

/**
 * Get tier info for upgrade prompts
 */
export function getTierInfo(tier) {
  const info = {
    pro: {
      name: 'Pro',
      price: '$14/mo',
      description: 'Unlock trend analysis, watchlist alerts, and unlimited PDFs',
    },
    professional: {
      name: 'Professional',
      price: '$59/mo',
      description: 'Unlock evidence packages, cost report data, and bulk exports',
    },
    institutional: {
      name: 'Institutional',
      price: '$299/mo',
      description: 'Unlock referral scorecard, API access, and custom reports',
    },
  };
  return info[tier] || info.pro;
}
