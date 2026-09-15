import { STATE_NAME } from '../data/postAcuteCatalog.js';
import { getCareSetting } from '../data/careSettings.js';

const NAME_TO_CODE = Object.fromEntries(
  Object.entries(STATE_NAME).map(([code, name]) => [name.toLowerCase(), code])
);

/**
 * Parse a family "where" field: ZIP, state name/abbr, or "City, ST".
 */
export function parseWhere(raw) {
  const s = String(raw || '').trim();
  if (!s) return { zip: null, state: null, city: null, raw: '' };

  const zipMatch = s.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : null;

  const cityState = s.match(/^(.+?),\s*([A-Za-z]{2})\s*$/);
  if (cityState) {
    const st = cityState[2].toUpperCase();
    if (STATE_NAME[st]) {
      return { zip, state: st, city: cityState[1].trim(), raw: s };
    }
  }

  if (/^[A-Za-z]{2}$/.test(s) && STATE_NAME[s.toUpperCase()]) {
    return { zip, state: s.toUpperCase(), city: null, raw: s };
  }

  const asName = NAME_TO_CODE[s.toLowerCase()];
  if (asName) {
    return { zip, state: asName, city: null, raw: s };
  }

  // "Overton TX" without comma
  const trailingAbbr = s.match(/^(.*?)\s+([A-Za-z]{2})$/);
  if (trailingAbbr && STATE_NAME[trailingAbbr[2].toUpperCase()]) {
    return {
      zip,
      state: trailingAbbr[2].toUpperCase(),
      city: trailingAbbr[1].trim() || null,
      raw: s,
    };
  }

  return { zip, state: null, city: zip ? null : s, raw: s };
}

export function lookupStateFromIndex(index, parsed) {
  if (!index || parsed.state) return parsed.state;
  if (parsed.zip && Array.isArray(index.facilities)) {
    const hit = index.facilities.find((f) => f.zip === parsed.zip);
    if (hit?.state) return hit.state;
  }
  if (parsed.city && Array.isArray(index.cities)) {
    const q = parsed.city.toLowerCase();
    const hit = index.cities.find((c) => (c.name || '').toLowerCase() === q);
    if (hit?.state) return hit.state;
  }
  return null;
}

/**
 * Build the family search destination for a care setting + where + optional name.
 */
export function buildSettingSearchPath(settingOrId, { where = '', name = '' } = {}, index = null) {
  const setting = typeof settingOrId === 'string' ? getCareSetting(settingOrId) : settingOrId;
  if (!setting) return '/';

  const parsed = parseWhere(where);
  const state = parsed.state || lookupStateFromIndex(index, parsed);
  const q = (name || parsed.city || parsed.zip || '').trim();

  if (state) {
    const base = setting.statePath(state);
    return q ? `${base}?q=${encodeURIComponent(q)}` : base;
  }

  const fallback = (name || where || '').trim();
  if (fallback) {
    return `${setting.route}?q=${encodeURIComponent(fallback)}`;
  }
  return setting.route;
}
