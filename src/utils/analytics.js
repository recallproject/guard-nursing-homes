/**
 * PostHog custom event tracking helper.
 *
 * PostHog is initialized in index.html via the global snippet (auto-capture).
 * This module provides a thin wrapper for custom events so we get:
 *   - a single import instead of window.posthog checks everywhere
 *   - consistent property naming
 *   - easy grep-ability for every event we fire
 *
 * Usage:
 *   import { track } from '../utils/analytics';
 *   track('facility_viewed', { ccn, name: facility.name });
 */

export function track(event, properties = {}) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, properties);
  }
}

/**
 * Fire once per browser session.  Uses sessionStorage so it re-fires
 * if the user opens a new tab or comes back after the session expires.
 */
export function trackOnce(event, properties = {}) {
  if (typeof window === 'undefined') return;
  const key = `__ph_once_${event}`;
  if (sessionStorage.getItem(key)) return;
  track(event, properties);
  sessionStorage.setItem(key, '1');
}

/**
 * Extract UTM parameters + referrer from the current URL / document.
 * Useful for the session_started event.
 */
export function getEntryContext() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    entry_page: window.location.pathname,
    referrer: document.referrer || '(direct)',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || '',
    utm_content: params.get('utm_content') || '',
  };
}
