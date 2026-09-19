/**
 * Compare Brief product — one paid PDF for the 2–3 homes in the compare tray.
 *
 * Single-home $29 Facility Brief stays on facility pages.
 * Compare Brief is priced by selection count only (hardcoded).
 */

export const COMPARE_BRIEF_PRODUCT = 'compare_brief';
export const COMPARE_BRIEF_MIN_HOMES = 2;
export const COMPARE_BRIEF_MAX_HOMES = 3;

/** Dollars the family pays. Stripe Price IDs live in env, not here. */
export const COMPARE_BRIEF_PRICE_USD = Object.freeze({
  2: 49,
  3: 69,
});

export const COMPARE_BRIEF_PRICE_ENV = Object.freeze({
  2: ['STRIPE_PRICE_COMPARE_2', 'VITE_STRIPE_PRICE_COMPARE_2'],
  3: ['STRIPE_PRICE_COMPARE_3', 'VITE_STRIPE_PRICE_COMPARE_3'],
});

export const FACILITY_CCN_RE = /^\d{6}$/;

export function normalizeFacilityCcn(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function isValidFacilityCcn(value) {
  return FACILITY_CCN_RE.test(normalizeFacilityCcn(value));
}

/**
 * Unique valid 6-digit CCNs, original order, capped at 3.
 */
export function normalizeCompareCcns(ccns) {
  const list = Array.isArray(ccns)
    ? ccns
    : String(ccns || '').split(/[,\s]+/);
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const ccn = normalizeFacilityCcn(raw);
    if (!isValidFacilityCcn(ccn) || seen.has(ccn)) continue;
    seen.add(ccn);
    out.push(ccn);
    if (out.length >= COMPARE_BRIEF_MAX_HOMES) break;
  }
  return out;
}

export function serializeCompareCcns(ccns) {
  return normalizeCompareCcns(ccns).join(',');
}

export function parseCompareCcns(value) {
  return normalizeCompareCcns(value);
}

export function compareBriefPriceUsd(count) {
  return COMPARE_BRIEF_PRICE_USD[count] || null;
}

export function selectCompareBriefOffer(count) {
  const priceUsd = compareBriefPriceUsd(count);
  if (!priceUsd) return null;
  return {
    product: COMPARE_BRIEF_PRODUCT,
    count,
    priceUsd,
    priceLabel: `$${priceUsd}`,
    ctaLabel: count === 2
      ? 'Get the $49 Compare Brief (2 homes)'
      : 'Get the $69 Compare Brief (3 homes)',
    shortLabel: `$${priceUsd} Compare Brief (${count} homes)`,
    envKeys: COMPARE_BRIEF_PRICE_ENV[count],
  };
}

export function selectCompareBriefPriceId(count, env = {}) {
  const keys = COMPARE_BRIEF_PRICE_ENV[count] || [];
  for (const key of keys) {
    const value = env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

export function comparingTitle(homes) {
  const names = (Array.isArray(homes) ? homes : [])
    .filter(Boolean)
    .slice(0, COMPARE_BRIEF_MAX_HOMES)
    .map((h) => String(h.name || h.ccn || 'Home').trim())
    .filter(Boolean);
  if (names.length === 0) return 'Compare Brief';
  if (names.length === 1) return `Comparing ${names[0]}`;
  if (names.length === 2) return `Comparing ${names[0]} vs ${names[1]}`;
  return `Comparing ${names[0]} vs ${names[1]} vs ${names[2]}`;
}

export function shortHomeLabel(home, index) {
  const name = String(home?.name || '').trim();
  if (!name) return `Home ${index + 1}`;
  const first = name.split(/\s+/)[0];
  return first.length >= 3 ? first : name.slice(0, 18);
}
