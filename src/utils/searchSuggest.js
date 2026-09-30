import { STATE_NAME } from '../data/postAcuteCatalog.js';
import { toTitleCase } from './postAcute.js';
import { parseWhere } from './parseWhere.js';

const POST_ACUTE = new Set(['hospice', 'home-health', 'irf', 'ltach']);
const bundleCache = new WeakMap();

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[.’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function placeLabel(raw) {
  if (!raw) return '';
  if (/[a-z]/.test(raw)) return raw;
  return toTitleCase(raw);
}

function displayFacilityName(name) {
  if (!name) return '';
  const letters = name.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) return toTitleCase(name);
  return name;
}

function recordsFor(index, settingId) {
  if (POST_ACUTE.has(settingId)) {
    return (index.postacute || []).filter((row) => row.setting === settingId);
  }
  return index.facilities || [];
}

function buildBundle(index, settingId) {
  const records = recordsFor(index, settingId);
  const cityMap = new Map();
  const zipMap = new Map();
  const stateCounts = new Map();
  const facilities = [];

  for (const row of records) {
    const state = row.state || '';
    if (state) stateCounts.set(state, (stateCounts.get(state) || 0) + 1);

    if (row.city && state) {
      const key = `${norm(row.city)}|${state}`;
      const prev = cityMap.get(key);
      if (!prev) {
        cityMap.set(key, {
          name: row.city,
          state,
          count: 1,
          norm: norm(row.city),
        });
      } else {
        prev.count += 1;
        if (/[a-z]/.test(row.city) && !/[a-z]/.test(prev.name)) prev.name = row.city;
      }
    }

    const zip = String(row.zip || '').trim();
    if (/^\d{5}$/.test(zip)) {
      let bucket = zipMap.get(zip);
      if (!bucket) {
        bucket = new Map();
        zipMap.set(zip, bucket);
      }
      const cityKey = `${norm(row.city)}|${state}`;
      const prev = bucket.get(cityKey) || { count: 0, city: row.city || '', state };
      prev.count += 1;
      if (/[a-z]/.test(row.city || '') && !/[a-z]/.test(prev.city || '')) prev.city = row.city;
      bucket.set(cityKey, prev);
    }

    if (row.name && row.ccn) {
      facilities.push({
        ccn: String(row.ccn),
        name: row.name,
        label: displayFacilityName(row.name),
        norm: norm(row.name),
        aliasNorm: norm(row.aliases),
        city: row.city || '',
        state,
        zip: /^\d{5}$/.test(zip) ? zip : '',
      });
    }
  }

  const cities = [...cityMap.values()].sort(
    (a, b) => b.count - a.count || a.norm.localeCompare(b.norm)
  );

  const zips = [...zipMap.entries()]
    .map(([zip, citiesForZip]) => {
      let best = null;
      let total = 0;
      for (const city of citiesForZip.values()) {
        total += city.count;
        if (!best || city.count > best.count) best = city;
      }
      return {
        zip,
        city: best?.city || '',
        state: best?.state || '',
        count: total,
      };
    })
    .sort((a, b) => b.count - a.count || a.zip.localeCompare(b.zip));

  const states = [...stateCounts.entries()]
    .map(([code, count]) => ({
      code,
      name: STATE_NAME[code] || code,
      norm: norm(STATE_NAME[code] || code),
      count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { cities, zips, states, facilities };
}

function bundleFor(index, settingId) {
  if (!index || typeof index !== 'object') return null;
  const id = settingId || 'snf';
  let bySetting = bundleCache.get(index);
  if (!bySetting) {
    bySetting = new Map();
    bundleCache.set(index, bySetting);
  }
  if (!bySetting.has(id)) bySetting.set(id, buildBundle(index, id));
  return bySetting.get(id);
}

function splitCityState(raw) {
  const match = String(raw || '').match(/^(.*?)(?:[,\s]+)([A-Za-z]{1,2})$/);
  if (!match || !match[1].trim()) {
    return { city: raw, statePrefix: '', explicitState: false };
  }
  const statePrefix = match[2].toUpperCase();
  const comma = raw.includes(',');
  if (statePrefix.length === 1 && !comma) {
    return { city: raw, statePrefix: '', explicitState: false };
  }
  return { city: match[1].trim(), statePrefix, explicitState: true };
}

function citySuggestion(city) {
  const label = placeLabel(city.name);
  return {
    id: `city-${city.state}-${city.norm}`,
    kind: 'city',
    label: `${label}, ${city.state}`,
    meta: 'City',
    value: `${label}, ${city.state}`,
  };
}

function zipSuggestion(zip) {
  const where = zip.city && zip.state ? `${placeLabel(zip.city)}, ${zip.state}` : 'ZIP';
  return {
    id: `zip-${zip.zip}`,
    kind: 'zip',
    label: zip.zip,
    meta: where,
    value: zip.zip,
  };
}

function stateSuggestion(state) {
  return {
    id: `state-${state.code}`,
    kind: 'state',
    label: state.name,
    meta: 'State',
    value: state.name,
  };
}

/**
 * Location suggestions from the public search index: cities, ZIP codes, and states
 * present for the active care type.
 */
export function suggestLocations(index, query, { settingId = 'snf', limit = 8 } = {}) {
  const raw = String(query || '').trim();
  if (!index || raw.length < 2) return [];
  const bundle = bundleFor(index, settingId);
  if (!bundle) return [];

  const zipLike = raw.match(/^(\d{2,5})(?:-\d{0,4})?$/);
  if (zipLike) {
    const prefix = zipLike[1];
    const hits = [];
    for (const zip of bundle.zips) {
      if (zip.zip.startsWith(prefix)) hits.push(zip);
    }
    return hits.slice(0, limit).map(zipSuggestion);
  }

  const parsed = splitCityState(raw);
  const cityQuery = norm(parsed.city);
  const statePrefix = parsed.statePrefix;
  const bareState = !parsed.explicitState;

  const stateHits = [];
  if (bareState || !cityQuery) {
    const qNorm = norm(raw);
    for (const state of bundle.states) {
      let rank = 0;
      if (state.code.toLowerCase() === raw.toLowerCase()) rank = 3;
      else if (qNorm && state.norm.startsWith(qNorm)) rank = 2;
      else if (qNorm.length >= 3 && state.norm.includes(qNorm)) rank = 1;
      if (rank) stateHits.push({ state, rank });
    }
  }

  stateHits.sort((a, b) => b.rank - a.rank || a.state.name.localeCompare(b.state.name));

  const cityHits = [];
  const contains = [];
  if (cityQuery) {
    for (const city of bundle.cities) {
      if (statePrefix && !city.state.startsWith(statePrefix)) continue;
      if (city.norm.startsWith(cityQuery)) {
        cityHits.push(city);
        if (cityHits.length >= limit) break;
      }
    }
    if (cityHits.length < 3 && cityQuery.length >= 3) {
      for (const city of bundle.cities) {
        if (statePrefix && !city.state.startsWith(statePrefix)) continue;
        if (city.norm.startsWith(cityQuery) || !city.norm.includes(cityQuery)) continue;
        contains.push(city);
        if (contains.length >= limit) break;
      }
    }
  }

  const out = [];
  const stateCap = cityHits.length || contains.length ? 4 : limit;
  for (const hit of stateHits.slice(0, stateCap)) {
    out.push(stateSuggestion(hit.state));
  }
  for (const city of cityHits) {
    if (out.length >= limit) break;
    out.push(citySuggestion(city));
  }
  for (const city of contains) {
    if (out.length >= limit) break;
    out.push(citySuggestion(city));
  }
  return out;
}

/**
 * Facility-name suggestions for the active care-type tab.
 * A filled location field boosts matches in that city, ZIP, or state.
 */
export function suggestFacilities(index, query, { settingId = 'snf', where = '', limit = 8 } = {}) {
  const q = norm(query);
  if (!index || q.length < 2) return [];
  const bundle = bundleFor(index, settingId);
  if (!bundle) return [];

  const parsed = where ? parseWhere(where) : null;
  const cityQ = parsed?.city ? norm(parsed.city) : '';
  const hits = [];

  for (const facility of bundle.facilities) {
    let score = 0;
    if (facility.norm.startsWith(q)) score = 300;
    else if (facility.norm.split(' ').some((word) => word.startsWith(q))) score = 200;
    else if (facility.norm.includes(q)) score = 100;
    else if (facility.aliasNorm && facility.aliasNorm.includes(q)) score = 50;
    else continue;

    if (parsed?.state && facility.state === parsed.state) score += 40;
    if (cityQ && norm(facility.city) === cityQ) score += 30;
    if (parsed?.zip && facility.zip === parsed.zip) score += 30;
    hits.push({ facility, score });
  }

  hits.sort(
    (a, b) => b.score - a.score || a.facility.label.localeCompare(b.facility.label)
  );

  return hits.slice(0, limit).map(({ facility }) => {
    const city = placeLabel(facility.city);
    const whereLabel = city && facility.state ? `${city}, ${facility.state}` : facility.state || facility.zip;
    return {
      id: `facility-${settingId}-${facility.ccn}`,
      kind: 'facility',
      label: facility.label,
      meta: whereLabel,
      value: facility.label,
      ccn: facility.ccn,
      city,
      state: facility.state,
    };
  });
}
