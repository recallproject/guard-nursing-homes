/**
 * useSubscription hook
 *
 * SECURITY MODEL:
 * - The signed httpOnly cookie (set by /api/verify-subscription) is the
 *   SOURCE OF TRUTH for subscription status. It cannot be read or modified
 *   by client-side JavaScript.
 * - localStorage('subscription_tier') is a UI CACHE ONLY. It controls what
 *   the user sees (e.g., badge, tier name) but does NOT grant access to
 *   paid features.
 * - On mount, this hook calls GET /api/check-subscription to validate the
 *   cookie server-side. If the cookie is expired or invalid, the hook
 *   clears the localStorage cache and reports tier as 'free'.
 * - Any server-side feature gate (PDF generation, data exports, etc.)
 *   must check the cookie via /api/check-subscription — never trust
 *   a tier value sent from the client.
 *
 * Tier hierarchy: free < pro < professional < institutional
 */

import { useState, useEffect, useCallback } from 'react';

const TIER_HIERARCHY = {
  free: 0,
  pro: 1,
  professional: 2,
  institutional: 3,
};

const VALID_TIERS = new Set(Object.keys(TIER_HIERARCHY));

/**
 * Main hook - returns subscription status
 *
 * Returns:
 * - tier: current tier string ('free', 'pro', 'professional', 'institutional')
 * - loading: true while verifying with server
 * - serverVerified: true if the tier was confirmed by the server cookie
 */
export function useSubscription() {
  // Initialize from localStorage cache for instant UI render
  const [tier, setTier] = useState(() => {
    const stored = localStorage.getItem('subscription_tier');
    return (stored && VALID_TIERS.has(stored)) ? stored : 'free';
  });
  const [loading, setLoading] = useState(true);
  const [serverVerified, setServerVerified] = useState(false);

  const checkServer = useCallback(async () => {
    try {
      const res = await fetch('/api/check-subscription', {
        method: 'GET',
        credentials: 'same-origin', // include cookies
      });

      if (!res.ok) {
        // Server error — don't downgrade the user, just mark unverified
        setServerVerified(false);
        return;
      }

      const data = await res.json();

      if (data.active && data.tier && VALID_TIERS.has(data.tier)) {
        // Server confirms active subscription — update localStorage cache
        setTier(data.tier);
        localStorage.setItem('subscription_tier', data.tier);
        setServerVerified(true);
      } else {
        // No valid server-side subscription.
        // Clear the localStorage cache so the UI doesn't show a fake tier.
        setTier('free');
        localStorage.removeItem('subscription_tier');
        setServerVerified(false);
      }
    } catch {
      // Network error — keep the localStorage cache for offline/flaky connections,
      // but mark as unverified so feature gates know not to trust it.
      setServerVerified(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  // Also listen for localStorage changes from other tabs (e.g., after payment in another tab)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'subscription_tier') {
        const val = e.newValue;
        setTier((val && VALID_TIERS.has(val)) ? val : 'free');
        // Re-verify with server when localStorage changes
        checkServer();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [checkServer]);

  return {
    tier,
    loading,
    serverVerified,
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
