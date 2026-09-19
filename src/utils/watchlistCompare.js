/** Shared Favorites + Compare tray. Two jobs: save is unlimited; compare is capped. */

export const MAX_COMPARE_FACILITIES = 3;
export const WATCHLIST_COMPARE_SESSION_KEY = 'oversight_compare_ccns';

function asCcn(value) {
  if (value == null) return '';
  if (typeof value === 'object') return String(value.ccn || '').trim();
  return String(value).trim();
}

function asItem(value) {
  if (value && typeof value === 'object') {
    const ccn = asCcn(value);
    if (!ccn) return null;
    return {
      ccn,
      name: value.name || ccn,
      city: value.city || '',
      state: value.state || '',
    };
  }
  const ccn = asCcn(value);
  if (!ccn) return null;
  return { ccn, name: ccn, city: '', state: '' };
}

/**
 * Parse a comma/space-separated CCN list or an array of CCNs / tray items.
 * Dedupes and caps at 3.
 */
export function parseCcnList(value) {
  return parseCompareItems(value).map((item) => item.ccn);
}

export function parseCompareItems(value) {
  if (value == null || value === '') return [];
  const parts = Array.isArray(value)
    ? value
    : String(value).split(/[,\s]+/);
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const item = asItem(part);
    if (!item || seen.has(item.ccn)) continue;
    seen.add(item.ccn);
    out.push(item);
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
 * Decide which CCNs to show in the compare view.
 *
 * Compare is an explicit commitment — never auto-select every favorite.
 * Priority:
 * 1. Explicit ?ccns=
 * 2. Session compare tray (when compare=1)
 */
export function resolveCompareSelection({
  queryCompare,
  queryCcns,
  sessionCcns,
} = {}) {
  const autoOpen = queryCompare === '1' || queryCompare === 'true';
  const fromQuery = parseCcnList(queryCcns);
  const fromSession = parseCcnList(sessionCcns);

  let selected = [];
  if (fromQuery.length) {
    selected = fromQuery;
  } else if (autoOpen && fromSession.length) {
    selected = fromSession;
  }

  return {
    selected,
    openCompare: autoOpen && selected.length >= 2,
    preselect: selected.length >= 1,
  };
}

export function addCompareItem(items, facility) {
  const current = parseCompareItems(items);
  const incoming = asItem(facility);
  if (!incoming) {
    return {
      items: current,
      added: false,
      already: false,
      atCap: current.length >= MAX_COMPARE_FACILITIES,
    };
  }
  if (current.some((item) => item.ccn === incoming.ccn)) {
    return {
      items: current,
      added: false,
      already: true,
      atCap: current.length >= MAX_COMPARE_FACILITIES,
    };
  }
  if (current.length >= MAX_COMPARE_FACILITIES) {
    return {
      items: current,
      added: false,
      already: false,
      atCap: true,
    };
  }
  const next = [...current, incoming];
  return {
    items: next,
    added: true,
    already: false,
    atCap: next.length >= MAX_COMPARE_FACILITIES,
  };
}

export function removeCompareItem(items, ccn) {
  const target = asCcn(ccn);
  return parseCompareItems(items).filter((item) => item.ccn !== target);
}

export function toggleCompareItem(items, facility) {
  const current = parseCompareItems(items);
  const incoming = asItem(facility);
  if (!incoming) {
    return {
      items: current,
      added: false,
      removed: false,
      already: false,
      atCap: current.length >= MAX_COMPARE_FACILITIES,
    };
  }
  if (current.some((item) => item.ccn === incoming.ccn)) {
    return {
      items: removeCompareItem(current, incoming.ccn),
      added: false,
      removed: true,
      already: true,
      atCap: false,
    };
  }
  const added = addCompareItem(current, incoming);
  return { ...added, removed: false };
}

export function readSessionCompareCcns() {
  return parseCcnList(readSessionCompareItems());
}

export function readSessionCompareItems() {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(WATCHLIST_COMPARE_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parseCompareItems(parsed) : [];
  } catch {
    return [];
  }
}

export function writeSessionCompareItems(items) {
  if (typeof sessionStorage === 'undefined') return parseCompareItems(items);
  const next = parseCompareItems(items);
  try {
    sessionStorage.setItem(WATCHLIST_COMPARE_SESSION_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export function writeSessionCompareCcns(ccns) {
  return writeSessionCompareItems(ccns);
}
