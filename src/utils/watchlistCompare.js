/** Shared Favorites → side-by-side compare selection. No account required. */

export const MAX_COMPARE_FACILITIES = 3;
export const WATCHLIST_COMPARE_SESSION_KEY = 'oversight_compare_ccns';

/**
 * Parse a comma/space-separated CCN list. Dedupes and caps at 3.
 */
export function parseCcnList(value) {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  const seen = new Set();
  const out = [];
  for (const part of raw.split(/[,\s]+/)) {
    const ccn = part.trim();
    if (!ccn || seen.has(ccn)) continue;
    seen.add(ccn);
    out.push(ccn);
    if (out.length >= MAX_COMPARE_FACILITIES) break;
  }
  return out;
}

export function watchlistComparePath({ ccns } = {}) {
  const params = new URLSearchParams();
  params.set('compare', '1');
  const list = parseCcnList(ccns);
  if (list.length) params.set('ccns', list.join(','));
  return `/watchlist?${params.toString()}`;
}

/**
 * Decide which favorited CCNs to preselect and whether to open the compare view.
 *
 * Priority:
 * 1. Explicit ?ccns= that are in the favorites list
 * 2. Session compare picks that are in favorites (when compare=1)
 * 3. All favorites when there are 2–3
 * 4. Most recently added 3 when compare=1 and the list is longer
 */
export function resolveCompareSelection({
  favoriteCcns = [],
  queryCompare,
  queryCcns,
  sessionCcns,
} = {}) {
  const favorites = (Array.isArray(favoriteCcns) ? favoriteCcns : []).filter(Boolean);
  const favoriteSet = new Set(favorites);
  const inFavorites = (ccns) => parseCcnList(ccns).filter((ccn) => favoriteSet.has(ccn));

  const autoOpen = queryCompare === '1' || queryCompare === 'true';
  const fromQueryAll = parseCcnList(queryCcns);
  const fromQuery = inFavorites(queryCcns);
  const fromSessionAll = parseCcnList(sessionCcns);
  const fromSession = inFavorites(sessionCcns);
  const favoritesHydrated = favorites.length > 0;

  let selected = [];
  if (fromQuery.length >= 2) {
    selected = fromQuery;
  } else if (!favoritesHydrated && fromQueryAll.length >= 2) {
    // First paint can land before localStorage favorites hydrate — honor explicit CCNs.
    selected = fromQueryAll;
  } else if (autoOpen && fromSession.length >= 2) {
    selected = fromSession;
  } else if (autoOpen && !favoritesHydrated && fromSessionAll.length >= 2) {
    selected = fromSessionAll;
  } else if (favorites.length >= 2 && favorites.length <= MAX_COMPARE_FACILITIES) {
    selected = [...favorites];
  } else if (autoOpen && favorites.length > MAX_COMPARE_FACILITIES) {
    selected = favorites.slice(-MAX_COMPARE_FACILITIES);
  }

  return {
    selected,
    openCompare: autoOpen && selected.length >= 2,
    preselect: selected.length >= 2,
  };
}

export function readSessionCompareCcns() {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(WATCHLIST_COMPARE_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parseCcnList(parsed) : [];
  } catch {
    return [];
  }
}
