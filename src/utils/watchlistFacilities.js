/** Targeted favorites lookup — never requires the full national dataset. */

export function normalizeCcn(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function ccnLookupKeys(value) {
  const raw = normalizeCcn(value);
  if (!raw) return [];
  const keys = [raw];
  if (/^\d+$/.test(raw)) {
    const padded = raw.padStart(6, '0');
    const stripped = raw.replace(/^0+/, '') || '0';
    if (padded !== raw) keys.push(padded);
    if (stripped !== raw) keys.push(stripped);
  }
  return keys;
}

export function lookupStateForCcn(index, ccn) {
  if (!index || typeof index !== 'object') return null;
  for (const key of ccnLookupKeys(ccn)) {
    const state = index[key];
    if (state) return state;
  }
  return null;
}

export function extractFacilities(stateData) {
  if (!stateData) return [];
  if (Array.isArray(stateData)) return stateData.filter(Boolean);
  if (Array.isArray(stateData.facilities)) return stateData.facilities.filter(Boolean);
  return [];
}

export function findFacilityByCcn(facilities, ccn) {
  const keys = new Set(ccnLookupKeys(ccn));
  if (!keys.size || !Array.isArray(facilities)) return null;
  return facilities.find((facility) => keys.has(normalizeCcn(facility?.ccn))) || null;
}

/**
 * CCNs to hydrate for a favorites/compare visit.
 * Query and session picks are included even when the in-memory
 * favorites list is still empty so first navigation can wait instead of throwing.
 */
export function collectWatchlistCcns({
  favoriteCcns = [],
  queryCcns,
  sessionCcns,
} = {}) {
  const seen = new Set();
  const out = [];
  const push = (value) => {
    const ccn = normalizeCcn(value);
    if (!ccn || seen.has(ccn)) return;
    seen.add(ccn);
    out.push(ccn);
  };
  (Array.isArray(favoriteCcns) ? favoriteCcns : []).forEach(push);
  String(queryCcns || '').split(/[,\s]+/).forEach(push);
  (Array.isArray(sessionCcns) ? sessionCcns : []).forEach(push);
  return out;
}

export function formatMetricNumber(value, digits = 1) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}
