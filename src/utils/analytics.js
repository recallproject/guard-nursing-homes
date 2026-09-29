/**
 * PostHog custom event tracking helper.
 *
 * PostHog is initialized once in index.html via the global snippet.
 * Do not call posthog.init anywhere else. This module is the only
 * capture wrapper so custom events stay grep-able and consistent.
 *
 * Usage:
 *   import { track } from '../utils/analytics';
 *   track('facility_viewed', { ccn, name: facility.name });
 */

/** Capture options that survive a navigation (Stripe redirect, outbound link). */
export const REDIRECT_CAPTURE = Object.freeze({
  transport: 'sendBeacon',
  send_instantly: true,
});

const DEFAULT_REDIRECT_TIMEOUT_MS = 400;
const PURCHASE_DEDUPE_PREFIX = 'ph_purchase_completed:';

function pageWindow() {
  try {
    return globalThis.window;
  } catch {
    return undefined;
  }
}

function pageStorage() {
  try {
    const store = globalThis.localStorage;
    if (!store || typeof store.getItem !== 'function') return null;
    return store;
  } catch {
    return null;
  }
}

export function track(event, properties = {}, options) {
  const win = pageWindow();
  if (!win || typeof win.posthog?.capture !== 'function') return undefined;
  try {
    return win.posthog.capture(event, properties, options);
  } catch {
    return undefined;
  }
}

/**
 * Fire once per browser session. Uses sessionStorage so it re-fires
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

export function currentPagePath() {
  const win = pageWindow();
  if (!win?.location) return '';
  return win.location.pathname || '';
}

function posthogReady() {
  const posthog = pageWindow()?.posthog;
  return posthog?.__loaded === true && typeof posthog.capture === 'function';
}

/**
 * Deliver a capture before navigation.
 * Uses sendBeacon + send_instantly when the snippet has finished loading.
 * If the library is still the stub, wait briefly for __loaded, then continue.
 * Always resolves. Never waits longer than timeoutMs. Never throws.
 */
export function trackBeforeRedirect(event, properties = {}, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_REDIRECT_TIMEOUT_MS;
  const now = options.now || (() => Date.now());
  const schedule = options.schedule || ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.cancel || ((id) => clearTimeout(id));
  const started = now();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const send = () => {
      let result;
      try {
        result = track(event, properties, REDIRECT_CAPTURE);
      } catch {
        result = undefined;
      }
      if (result && typeof result.then === 'function') {
        const remaining = Math.max(0, timeoutMs - (now() - started));
        const timer = schedule(() => finish(), remaining);
        result.then(
          () => {
            cancel(timer);
            finish();
          },
          () => {
            cancel(timer);
            finish();
          },
        );
        return;
      }
      finish();
    };

    const attempt = () => {
      if (settled) return;
      if (posthogReady() || now() - started >= timeoutMs) {
        send();
        return;
      }
      schedule(attempt, 25);
    };

    attempt();
  });
}

export function checkoutStartedProperties({
  product,
  price,
  ccn,
  placement,
  pagePath,
} = {}) {
  const properties = {
    product: product || '',
    page_path: pagePath ?? currentPagePath(),
    placement: placement || '',
  };
  if (typeof price === 'number' && Number.isFinite(price)) properties.price = price;
  const facilityId = ccn == null ? '' : String(ccn).trim();
  if (facilityId) {
    properties.facility_id = facilityId;
    properties.ccn = facilityId;
  }
  return properties;
}

/** checkout_started, flushed before the Stripe redirect. */
export function trackCheckoutStarted(details) {
  return trackBeforeRedirect('checkout_started', checkoutStartedProperties(details));
}

export function purchaseDedupeKey(product, sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) return '';
  return `${PURCHASE_DEDUPE_PREFIX}${product || ''}:${id}`;
}

/**
 * purchase_completed once per session_id (localStorage).
 * Visits with no session_id still emit has_session_id: false and are not deduped,
 * so scanners that omit the query param stay visible.
 * @returns {boolean} true when the event was sent
 */
export function trackPurchaseCompleted({ product, sessionId } = {}) {
  const id = String(sessionId || '').trim();
  const properties = {
    product: product || '',
    session_id: id,
    has_session_id: Boolean(id),
  };
  const key = purchaseDedupeKey(product, id);
  const store = pageStorage();
  if (key && store) {
    try {
      if (store.getItem(key)) return false;
      store.setItem(key, '1');
    } catch {
      // Storage blocked — still send. A later hit may duplicate.
    }
  }
  track('purchase_completed', properties, REDIRECT_CAPTURE);
  return true;
}

/**
 * Classify an outbound affiliate URL.
 * Vive counts only with aff=745. Medicare.gov is never an affiliate.
 * Target and CareX hostnames are recognized for links that are not on main yet.
 * @returns {null | { partner: string, product_name: string, destination_url: string, page_path: string }}
 */
export function affiliateClickProperties(href, { productName = '', pagePath = '' } = {}) {
  let url;
  try {
    url = new URL(href, 'https://www.oversightreports.com');
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let partner = '';
  if (host === 'vivehealth.com' && url.searchParams.get('aff') === '745') partner = 'vive';
  else if (host === 'target.com' || host === 'goto.target.com') partner = 'target';
  else if (host === 'carex.com') partner = 'carex';
  else return null;

  const explicitName = String(productName || '').replace(/\s+/g, ' ').trim();
  let product_name = explicitName;
  if (!product_name && partner === 'vive') {
    const parts = url.pathname.split('/').filter(Boolean);
    product_name = parts[parts.length - 1] || '';
  }
  return {
    partner,
    product_name,
    destination_url: url.toString(),
    page_path: pagePath,
  };
}

/**
 * Document click handler. Tracks affiliate anchors only.
 * @param {Event} event
 * @param {{ pagePath?: string, trackFn?: typeof track }} [options]
 */
export function onAffiliateLinkClick(event, options = {}) {
  if (!event || event.defaultPrevented) return;
  if (typeof event.button === 'number' && event.button !== 0) return;
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor) return;
  const productName = anchor.getAttribute?.('data-product-name') || '';
  const pagePath = options.pagePath ?? currentPagePath();
  const properties = affiliateClickProperties(anchor.href, { productName, pagePath });
  if (!properties) return;
  const trackFn = options.trackFn || track;
  trackFn('affiliate_click', properties, REDIRECT_CAPTURE);
}

export function installAffiliateClickTracking() {
  const win = pageWindow();
  if (!win || typeof document === 'undefined') return;
  if (win.__orAffiliateClickTracking) return;
  win.__orAffiliateClickTracking = true;
  document.addEventListener('click', (event) => {
    onAffiliateLinkClick(event);
  });
}
