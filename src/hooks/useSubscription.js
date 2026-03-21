/**
 * useSubscription hook
 *
 * Returns the current user's subscription tier.
 *
 * SECURITY NOTE: This is localStorage-based and NOT secure against tampering.
 * Before accepting real payments, implement server-side verification:
 * 1. Stripe webhook confirms payment -> backend issues signed JWT
 * 2. This hook validates the JWT instead of trusting localStorage
 * 3. Feature gates check the JWT server-side for sensitive operations
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

const VALID_TIERS = new Set(Object.keys(TIER_HIERARCHY));

/**
 * Main hook - returns subscription status
 */
export function useSubscription() {
  const [tier, setTier] = useState(() => {
    const stored = localStorage.getItem('subscription_tier');
    return (stored && VALID_TIERS.has(stored)) ? stored : 'free';
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'subscription_tier') {
        const val = e.newValue;
        setTier((val && VALID_TIERS.has(val)) ? val : 'free');
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
