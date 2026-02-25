/**
 * useSubscription hook
 *
 * Returns the current user's subscription tier. For now it always returns 'free' since we have no auth.
 * Later this will connect to Stripe for real subscription status.
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
 * Main hook - returns subscription status
 */
export function useSubscription() {
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(false);

  // For now, always return 'free'
  // When auth is added, this will check Stripe status
  useEffect(() => {
    // Placeholder for future Stripe integration
    setLoading(false);
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
