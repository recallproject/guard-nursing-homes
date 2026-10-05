/**
 * Facility-page After Care impression.
 *
 * The dedicated /after-care page still fires after_care_view with
 * surface=page on mount. This module fires the same event with
 * surface=facility only after the inline module intersects the viewport.
 *
 * Dedupe is once per page path per browser session (sessionStorage),
 * plus an in-memory set so React Strict Mode remounts cannot double-count
 * before storage is read. A new tab or a new facility path can count again.
 *
 * Privacy: events go through track(), the same PostHog capture gate as
 * every other custom event. There is no separate consent check.
 */

import { currentPagePath, track } from './analytics.js';

export const AFTER_CARE_VIEW_EVENT = 'after_care_view';
export const FACILITY_AFTER_CARE_SURFACE = 'facility';

/** Fraction of the module that must be inside the viewport. */
export const FACILITY_AFTER_CARE_VISIBLE_THRESHOLD = 0.25;

const seenKeys = new Set();

export function facilityAfterCareImpressionKey(pagePath) {
  return `__ph_once_${AFTER_CARE_VIEW_EVENT}:${FACILITY_AFTER_CARE_SURFACE}:${pagePath || ''}`;
}

export function resetFacilityAfterCareImpressions() {
  seenKeys.clear();
}

function sessionStore() {
  try {
    const store = globalThis.sessionStorage;
    if (!store || typeof store.getItem !== 'function' || typeof store.setItem !== 'function') return null;
    return store;
  } catch {
    return null;
  }
}

/** Same availability gate as track(): no posthog.capture means no event. */
function captureAvailable(trackFn) {
  if (typeof trackFn === 'function') return true;
  try {
    return typeof globalThis.window?.posthog?.capture === 'function';
  } catch {
    return false;
  }
}

/**
 * @param {IntersectionObserverEntry} entry
 * @param {Element} element
 * @param {number} [threshold]
 */
export function entryShowsModule(entry, element, threshold = FACILITY_AFTER_CARE_VISIBLE_THRESHOLD) {
  if (!entry || !element || entry.target !== element) return false;
  if (!entry.isIntersecting) return false;
  const ratio = Number(entry.intersectionRatio);
  if (Number.isFinite(ratio) && ratio < threshold) return false;
  return true;
}

/**
 * Record one facility-module impression for this page path.
 * @returns {boolean} true when this call was the one that counted
 */
export function trackFacilityAfterCareView({
  pagePath,
  storage,
  trackFn,
  memory,
} = {}) {
  const path = pagePath ?? currentPagePath();
  const key = facilityAfterCareImpressionKey(path);
  const seen = memory || seenKeys;
  if (seen.has(key)) return false;

  const store = storage === undefined ? sessionStore() : storage;
  if (store) {
    try {
      if (store.getItem(key)) {
        seen.add(key);
        return false;
      }
    } catch {
      // Storage blocked. The in-memory set still dedupes this document.
    }
  }

  if (!captureAvailable(trackFn)) return false;

  const send = trackFn || track;
  try {
    send(AFTER_CARE_VIEW_EVENT, { surface: FACILITY_AFTER_CARE_SURFACE });
  } catch {
    return false;
  }
  seen.add(key);
  if (store) {
    try {
      store.setItem(key, '1');
    } catch {
      // Event already went out. A later mount may duplicate if storage stays blocked.
    }
  }
  return true;
}

/**
 * Watch an element and invoke onVisible once, when it actually intersects.
 * Returns a disconnect function. Does nothing when the element or
 * IntersectionObserver is missing, so a mount alone never counts.
 */
export function observeVisibleOnce(element, onVisible, {
  IntersectionObserverImpl = globalThis.IntersectionObserver,
  threshold = FACILITY_AFTER_CARE_VISIBLE_THRESHOLD,
} = {}) {
  if (!element || typeof onVisible !== 'function' || typeof IntersectionObserverImpl !== 'function') {
    return () => {};
  }

  let stopped = false;
  let observer;
  try {
    observer = new IntersectionObserverImpl((entries) => {
      if (stopped) return;
      const visible = entries.some((entry) => entryShowsModule(entry, element, threshold));
      if (!visible) return;
      stopped = true;
      try {
        observer.disconnect();
      } catch {
        // Ignore disconnect failures; stopped already blocks a second fire.
      }
      onVisible();
    }, { threshold });
    observer.observe(element);
  } catch {
    return () => {};
  }

  return () => {
    stopped = true;
    try {
      observer.disconnect();
    } catch {
      // Already disconnected.
    }
  };
}

/**
 * Bind facility impression tracking to the inline module element.
 * The event fires only from the observer callback, never from this call.
 */
export function bindFacilityAfterCareImpression(element, options = {}) {
  const {
    pagePath,
    storage,
    trackFn,
    memory,
    IntersectionObserverImpl,
    threshold,
  } = options;
  return observeVisibleOnce(element, () => {
    trackFacilityAfterCareView({ pagePath, storage, trackFn, memory });
  }, { IntersectionObserverImpl, threshold });
}
