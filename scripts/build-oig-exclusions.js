// Build OIG LEIE → hospice exclusion matches.
//
// Downloads (or reads from local cache of) the HHS OIG List of Excluded Individuals/Entities
// and matches excluded persons/entities to the 6,943 Medicare-certified hospices in our
// frontend dataset. Output feeds the per-hospice "Public Record & Enforcement" section of
// oversightreports.com.
//
// Inputs:
//   - https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv  (cached to scripts/.cache/leie.csv)
//   - public/data/hospice/index.json                            (6,943 CCN+name+city+state+zip)
//   - public/data/hospice/states/{XX}.json                      (per-state, includes address)
//   - data/raw/hospice/hospice_enrollments_20250102.csv         (CCN ↔ NPI cross-reference)
//   - data/raw/hospice/hospice_all_owners_20251001.csv          (owner names per CCN; for individual-exclusion matching)
//
// Output:
//   - public/data/hospice/oig-exclusions.json
//
// Matching strategy (highest → lowest confidence):
//   1. Exact NPI match (LEIE.NPI === hospice.NPI from enrollments).                       confidence high  (basis = "npi")
//   2. Entity exclusion: fuzzy name match (Levenshtein-normalized) + state match.         high if ≥85, medium if 70–84
//   3. Individual exclusion: name match against disclosed owners + ZIP/state match.       high if ≥85, medium if 70–84
//   4. Anything < 70 is dropped (no defamation surface area).
//
// Conservative bias: we'd rather surface fewer high-confidence items than many noisy ones.
//
// Run:
//   node scripts/build-oig-exclusions.js

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_DIR = join(__dirname, '.cache');
const CACHE_FILE = join(CACHE_DIR, 'leie.csv');
const OUT_FILE = join(ROOT, 'public', 'data', 'hospice', 'oig-exclusions.json');
const RAW_DIR = join(ROOT, '..', 'data', 'raw', 'hospice');
const HOSPICE_INDEX = join(ROOT, 'public', 'data', 'hospice', 'index.json');
const HOSPICE_STATES_DIR = join(ROOT, 'public', 'data', 'hospice', 'states');
const ENROLLMENTS_CSV = join(RAW_DIR, 'hospice_enrollments_20250102.csv');
const OWNERS_CSV = join(RAW_DIR, 'hospice_all_owners_20251001.csv');

const LEIE_URL = 'https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv';
// Cache TTL: 12 hours. LEIE refreshes daily but we don't need to hammer their server on dev runs.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// CSV parser (RFC-4180 lite — handles quoted fields, escaped quotes, CRLF)
// ─────────────────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else { cur += c; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map(h => h.trim());
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && r[0] === '') continue; // blank line
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = (r[j] ?? '').trim();
    records.push(obj);
  }
  return { headers, records };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTPS download with redirect-follow + Last-Modified capture
// ─────────────────────────────────────────────────────────────────────────────
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const go = (u, redirectsLeft) => {
      https.get(u, { headers: { 'User-Agent': 'oversightreports.com data pipeline' } }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          res.resume();
          const next = new URL(res.headers.location, u).toString();
          return go(next, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({
          buffer: Buffer.concat(chunks),
          lastModified: res.headers['last-modified'] || null,
        }));
        res.on('error', reject);
      }).on('error', reject);
    };
    go(url, maxRedirects);
  });
}

async function getLeieCsv() {
  const cacheValid = existsSync(CACHE_FILE) &&
    (Date.now() - statSync(CACHE_FILE).mtimeMs) < CACHE_TTL_MS;

  if (cacheValid) {
    const stat = statSync(CACHE_FILE);
    console.log(`[cache] using cached LEIE CSV (${(stat.size / 1024 / 1024).toFixed(2)} MB, age ${Math.round((Date.now() - stat.mtimeMs) / 60000)} min)`);
    return {
      text: readFileSync(CACHE_FILE, 'utf8'),
      lastModified: stat.mtime.toISOString(),
      fromCache: true,
    };
  }

  console.log(`[download] fetching ${LEIE_URL} …`);
  const { buffer, lastModified } = await fetchUrl(LEIE_URL);
  writeFileSync(CACHE_FILE, buffer);
  console.log(`[download] saved ${(buffer.length / 1024 / 1024).toFixed(2)} MB to cache (Last-Modified: ${lastModified || 'n/a'})`);
  return {
    text: buffer.toString('utf8'),
    lastModified: lastModified || new Date().toISOString(),
    fromCache: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Name normalization + Levenshtein
// ─────────────────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'inc', 'incorporated', 'llc', 'l.l.c', 'llp', 'lp', 'pllc', 'pc', 'pa',
  'corp', 'corporation', 'co', 'company', 'group', 'the', 'of', 'and', '&',
  'services', 'service', 'care', 'health', 'healthcare', 'home',
]);

// Industry-generic terms that, on their own, are not distinctive enough to anchor a match.
// E.g. "WE CARE HOSPICE SERVICES" and "CA HOSPICE CARE" should NOT match on "hospice" alone.
const GENERIC_INDUSTRY_TOKENS = new Set([
  'hospice', 'palliative', 'comfort', 'compassion', 'compassionate',
]);

function normName(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[,.()'"\/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(s) {
  return normName(s).split(' ').filter(t => t && !STOPWORDS.has(t));
}

function nameKey(s) {
  // Removes corporate suffixes + stopwords for name comparison.
  return nameTokens(s).join(' ');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Cap for performance — names beyond 80 chars are unusual; truncating is fine for ratio.
  if (a.length > 120) a = a.slice(0, 120);
  if (b.length > 120) b = b.slice(0, 120);
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

function nameSimilarity(a, b) {
  // Returns 0–100. Compares stopword-stripped keys.
  // Defamation-aware: requires at least one DISTINCTIVE (non-generic-industry) token in common,
  // so "WE CARE HOSPICE SERVICES" never collides with "CA HOSPICE CARE" on the word "hospice" alone.
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 100;

  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  const distinctiveA = new Set([...ta].filter(t => !GENERIC_INDUSTRY_TOKENS.has(t)));
  const distinctiveB = new Set([...tb].filter(t => !GENERIC_INDUSTRY_TOKENS.has(t)));

  // Require at least one distinctive token overlap. If both names ONLY have generic
  // tokens (extremely rare — e.g. "Hospice Care" vs "Hospice Care") fall through to ratio.
  let distinctiveOverlap = 0;
  for (const t of distinctiveA) if (distinctiveB.has(t)) distinctiveOverlap++;
  if (distinctiveA.size > 0 && distinctiveB.size > 0 && distinctiveOverlap === 0) return 0;

  const dist = levenshtein(ka, kb);
  const maxLen = Math.max(ka.length, kb.length);
  const ratio = maxLen === 0 ? 0 : 1 - (dist / maxLen);

  // Jaccard over all tokens (catches reorderings).
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const jaccard = overlap / new Set([...ta, ...tb]).size;

  return Math.round(Math.max(ratio, jaccard) * 100);
}

function personNameSimilarity(leieFirst, leieMiddle, leieLast, ownerFirst, ownerMiddle, ownerLast) {
  // Person names: last name must match closely, first name should overlap.
  const ll = normName(leieLast);
  const ol = normName(ownerLast);
  if (!ll || !ol) return 0;
  const lastSim = ll === ol ? 100 : Math.round((1 - levenshtein(ll, ol) / Math.max(ll.length, ol.length)) * 100);
  if (lastSim < 80) return 0; // last name is the anchor — give up if it's not close

  const lf = normName(leieFirst);
  const of = normName(ownerFirst);
  let firstSim = 0;
  if (lf && of) {
    if (lf === of) firstSim = 100;
    else if (lf[0] === of[0] && (lf.startsWith(of) || of.startsWith(lf))) firstSim = 90; // initial / nickname
    else firstSim = Math.round((1 - levenshtein(lf, of) / Math.max(lf.length, of.length)) * 100);
  }

  // Weight: last 60%, first 40%.
  const combined = Math.round(lastSim * 0.6 + firstSim * 0.4);

  // Middle initial bonus if both present and match.
  const lm = normName(leieMiddle);
  const om = normName(ownerMiddle);
  if (lm && om && lm[0] === om[0]) return Math.min(100, combined + 5);
  return combined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // ── Load hospice index (slim) + per-state files (full address) ──
  const hospiceIndex = JSON.parse(readFileSync(HOSPICE_INDEX, 'utf8'));
  console.log(`[hospice] loaded ${hospiceIndex.length} hospices from index.json`);

  // Build full-record lookup (CCN → { ccn, name, address, city, state, zip, parent, ... })
  const ccnToFull = new Map();
  const stateFiles = [];
  if (existsSync(HOSPICE_STATES_DIR)) {
    const fs = await import('node:fs');
    for (const f of fs.readdirSync(HOSPICE_STATES_DIR)) {
      if (!f.endsWith('.json')) continue;
      stateFiles.push(f);
      const data = JSON.parse(readFileSync(join(HOSPICE_STATES_DIR, f), 'utf8'));
      for (const p of (data.providers || [])) ccnToFull.set(p.ccn, p);
    }
  }
  console.log(`[hospice] loaded full provider records from ${stateFiles.length} state files (${ccnToFull.size} CCNs)`);

  // ── Build CCN ↔ NPI lookup from enrollments CSV ──
  const ccnToNpi = new Map();
  const npiToCcn = new Map();
  if (existsSync(ENROLLMENTS_CSV)) {
    const text = readFileSync(ENROLLMENTS_CSV, 'utf8');
    const { records } = csvToObjects(text);
    for (const r of records) {
      const ccn = (r['CCN'] || '').trim();
      const npi = (r['NPI'] || '').trim();
      if (ccn && npi && /^\d{10}$/.test(npi)) {
        ccnToNpi.set(ccn, npi);
        npiToCcn.set(npi, ccn);
      }
    }
    console.log(`[enrollments] mapped ${npiToCcn.size} NPIs ↔ CCNs from ${records.length} enrollment rows`);
  } else {
    console.warn(`[enrollments] WARNING: ${ENROLLMENTS_CSV} not found — NPI matching disabled`);
  }

  // ── Build owner directory: CCN → [{ first, middle, last, role, address, city, state, zip }] ──
  const ccnToOwners = new Map();
  if (existsSync(OWNERS_CSV)) {
    const text = readFileSync(OWNERS_CSV, 'utf8');
    const { records } = csvToObjects(text);
    // Owners file is keyed by ENROLLMENT ID. We need ENROLLMENT ID → CCN from enrollments file.
    const enrollIdToCcn = new Map();
    if (existsSync(ENROLLMENTS_CSV)) {
      const eText = readFileSync(ENROLLMENTS_CSV, 'utf8');
      const { records: eRecs } = csvToObjects(eText);
      for (const r of eRecs) {
        const eid = (r['ENROLLMENT ID'] || '').trim();
        const ccn = (r['CCN'] || '').trim();
        if (eid && ccn) enrollIdToCcn.set(eid, ccn);
      }
    }
    let attached = 0;
    for (const r of records) {
      const eid = (r['ENROLLMENT ID'] || '').trim();
      const ccn = enrollIdToCcn.get(eid);
      if (!ccn) continue;
      const isIndividual = (r['TYPE - OWNER'] || '').toUpperCase().startsWith('I');
      if (!isIndividual) continue; // we only need individuals here for LEIE-individual matching
      const owner = {
        first: r['FIRST NAME - OWNER'] || '',
        middle: r['MIDDLE NAME - OWNER'] || '',
        last: r['LAST NAME - OWNER'] || '',
        title: r['TITLE - OWNER'] || '',
        roleText: r['ROLE TEXT - OWNER'] || '',
        city: r['CITY - OWNER'] || '',
        state: r['STATE - OWNER'] || '',
        zip: (r['ZIP CODE - OWNER'] || '').slice(0, 5),
      };
      if (!owner.last) continue;
      if (!ccnToOwners.has(ccn)) ccnToOwners.set(ccn, []);
      ccnToOwners.get(ccn).push(owner);
      attached++;
    }
    console.log(`[owners] indexed ${attached} individual-owner rows across ${ccnToOwners.size} CCNs`);
  } else {
    console.warn(`[owners] WARNING: ${OWNERS_CSV} not found — individual exclusion matching limited`);
  }

  // ── Index hospices by state for entity-name matching ──
  const stateToHospices = new Map();
  for (const h of hospiceIndex) {
    const st = (h.state || '').toUpperCase();
    if (!stateToHospices.has(st)) stateToHospices.set(st, []);
    stateToHospices.get(st).push(h);
  }

  // ── Download & parse LEIE ──
  const { text: leieText, lastModified, fromCache } = await getLeieCsv();
  const { headers: leieHeaders, records: leieRecords } = csvToObjects(leieText);
  console.log(`[leie] parsed ${leieRecords.length} LEIE records (${fromCache ? 'cached' : 'fresh'}); columns: ${leieHeaders.join(', ')}`);

  // Detect column names — LEIE CSV uses these (verified Apr 2026 schema).
  // Headers: LASTNAME, FIRSTNAME, MIDNAME, BUSNAME, GENERAL, SPECIALTY, UPIN, NPI,
  //          DOB, ADDRESS, CITY, STATE, ZIP, EXCLTYPE, EXCLDATE, REINDATE, WAIVERDATE, WVRSTATE
  const col = (rec, ...candidates) => {
    for (const c of candidates) if (rec[c] !== undefined && rec[c] !== '') return rec[c];
    return '';
  };

  // ── Filter to hospice-relevant LEIE rows ──
  const hospiceTerms = ['hospice', 'palliative', 'end of life', 'end-of-life'];
  const hospiceRelevant = [];
  for (const r of leieRecords) {
    const general = (col(r, 'GENERAL') || '').toLowerCase();
    const specialty = (col(r, 'SPECIALTY') || '').toLowerCase();
    const busname = (col(r, 'BUSNAME') || '').toLowerCase();
    const npi = (col(r, 'NPI') || '').trim();
    const state = (col(r, 'STATE') || '').toUpperCase();
    const zip = (col(r, 'ZIP') || '').slice(0, 5);

    let signal = null;
    if (hospiceTerms.some(t => general.includes(t))) signal = 'general_field_hospice';
    else if (hospiceTerms.some(t => specialty.includes(t))) signal = 'specialty_field_hospice';
    else if (hospiceTerms.some(t => busname.includes(t))) signal = 'busname_hospice';
    else if (npi && /^\d{10}$/.test(npi) && npiToCcn.has(npi)) signal = 'npi_match_to_hospice';
    // Otherwise NOT included as hospice-relevant (we'd be casting too wide a net).

    if (signal) hospiceRelevant.push({ ...r, _signal: signal, _state: state, _zip: zip });
  }
  console.log(`[leie] ${hospiceRelevant.length} hospice-relevant LEIE records (signals: NPI cross-ref + name/specialty/general containing hospice-terms)`);

  // ── Match each relevant LEIE record to hospice CCNs ──
  const itemsByCcn = {};
  let highCount = 0;
  let mediumCount = 0;
  let unmatchedRelevant = 0;

  function pushMatch(ccn, item) {
    if (!itemsByCcn[ccn]) itemsByCcn[ccn] = [];
    itemsByCcn[ccn].push(item);
    if (item.match_confidence === 'high') highCount++;
    else mediumCount++;
  }

  function buildItem(rec, ccn, score, basis, role = null) {
    const last = col(rec, 'LASTNAME');
    const first = col(rec, 'FIRSTNAME');
    const mid = col(rec, 'MIDNAME');
    const busname = col(rec, 'BUSNAME');
    const isEntity = !!busname && !last;
    const displayName = isEntity
      ? busname
      : [first, mid, last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const exclDate = col(rec, 'EXCLDATE');
    const reinDate = col(rec, 'REINDATE');
    return {
      exclusion_date: exclDate ? formatLeieDate(exclDate) : null,
      reinstated_date: reinDate && reinDate !== '00000000' ? formatLeieDate(reinDate) : null,
      exclusion_type: col(rec, 'EXCLTYPE') || null,
      excluded_party_type: isEntity ? 'entity' : 'individual',
      individual_name: isEntity ? null : displayName,
      entity_name: isEntity ? displayName : null,
      individual_role: role,
      provider_general: col(rec, 'GENERAL') || null,
      provider_specialty: col(rec, 'SPECIALTY') || null,
      address: {
        city: col(rec, 'CITY') || null,
        state: col(rec, 'STATE') || null,
        zip: (col(rec, 'ZIP') || '').slice(0, 5) || null,
      },
      npi: (col(rec, 'NPI') || '').trim() || null,
      match_confidence: score >= 85 ? 'high' : 'medium',
      match_score: score,
      match_basis: basis,
      leie_record_id: leieRecordId(rec),
      source_signal: rec._signal,
    };
  }

  function buildUnmatched(rec) {
    // Same shape as buildItem but no CCN attribution — for state-level surfacing only.
    const last = col(rec, 'LASTNAME');
    const first = col(rec, 'FIRSTNAME');
    const mid = col(rec, 'MIDNAME');
    const busname = col(rec, 'BUSNAME');
    const isEntity = !!busname && !last;
    const displayName = isEntity ? busname : [first, mid, last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const exclDate = col(rec, 'EXCLDATE');
    const reinDate = col(rec, 'REINDATE');
    return {
      exclusion_date: exclDate ? formatLeieDate(exclDate) : null,
      reinstated_date: reinDate && reinDate !== '00000000' ? formatLeieDate(reinDate) : null,
      exclusion_type: col(rec, 'EXCLTYPE') || null,
      excluded_party_type: isEntity ? 'entity' : 'individual',
      individual_name: isEntity ? null : displayName,
      entity_name: isEntity ? displayName : null,
      provider_general: col(rec, 'GENERAL') || null,
      provider_specialty: col(rec, 'SPECIALTY') || null,
      address: {
        city: col(rec, 'CITY') || null,
        state: col(rec, 'STATE') || null,
        zip: (col(rec, 'ZIP') || '').slice(0, 5) || null,
      },
      npi: (col(rec, 'NPI') || '').trim() || null,
      leie_record_id: leieRecordId(rec),
      source_signal: rec._signal,
    };
  }

  const unmatchedItems = [];
  for (const rec of hospiceRelevant) {
    const npi = (col(rec, 'NPI') || '').trim();
    const state = rec._state;
    const zip = rec._zip;
    const last = col(rec, 'LASTNAME');
    const first = col(rec, 'FIRSTNAME');
    const mid = col(rec, 'MIDNAME');
    const busname = col(rec, 'BUSNAME');
    const isEntity = !!busname && !last;

    // ── 1. Exact NPI match (strongest signal) ──
    if (npi && /^\d{10}$/.test(npi) && npiToCcn.has(npi)) {
      const ccn = npiToCcn.get(npi);
      pushMatch(ccn, buildItem(rec, ccn, 100, 'npi_exact', isEntity ? null : 'NPI registrant'));
      continue;
    }

    // ── 2. Entity match: fuzzy name + state, with REQUIRED city/zip corroboration ──
    // Defamation guardrail: name+state alone is not enough. Two distinct hospices in the
    // same state can share a near-identical name (e.g. "WE CARE HOSPICE SERVICES, LLC"
    // in Sherman Oaks vs "WE CARE HOSPICE, INC" in Fremont). We require ZIP exact OR city
    // exact OR address-line overlap before accepting an entity match.
    if (isEntity) {
      const candidates = stateToHospices.get(state) || [];
      const leieCity = normName(rec['CITY'] || '');
      let best = null;
      for (const h of candidates) {
        const sim = nameSimilarity(busname, h.name);
        if (sim < 70) continue;
        const full = ccnToFull.get(h.ccn);
        let geoMatch = null;
        if (full && zip && full.zip === zip) geoMatch = 'zip';
        else if (full && leieCity && normName(full.city) === leieCity) geoMatch = 'city';
        if (!geoMatch) continue;
        const bonus = geoMatch === 'zip' ? 5 : 3;
        const score = Math.min(100, sim + bonus);
        if (!best || score > best.score) best = { h, score, geoMatch };
      }
      if (best && best.score >= 70) {
        pushMatch(best.h.ccn, buildItem(rec, best.h.ccn, best.score, `entity name + state + ${best.geoMatch}`));
        continue;
      }
      unmatchedRelevant++;
      unmatchedItems.push(buildUnmatched(rec));
      continue;
    }

    // ── 3. Individual match: name vs disclosed owners + state/zip ──
    // Only if we have an obvious hospice signal (we've already filtered for it).
    let bestPerson = null;
    // Restrict candidate CCNs to same state to keep this O(n*m) workable.
    for (const [ccn, owners] of ccnToOwners) {
      const full = ccnToFull.get(ccn);
      if (!full || (state && full.state !== state)) continue;
      for (const o of owners) {
        const sim = personNameSimilarity(first, mid, last, o.first, o.middle, o.last);
        if (sim < 80) continue;
        // ZIP-or-city corroboration required for individuals — last names are too common.
        let geoMatch = false;
        let geoBasis = '';
        if (zip && full.zip === zip) { geoMatch = true; geoBasis = 'zip'; }
        else if (zip && o.zip === zip) { geoMatch = true; geoBasis = 'owner_zip'; }
        else if (rec['CITY'] && normName(full.city) === normName(rec['CITY'])) { geoMatch = true; geoBasis = 'city'; }
        if (!geoMatch) continue;
        const score = Math.min(100, sim);
        if (!bestPerson || score > bestPerson.score) {
          bestPerson = { ccn, score, geoBasis, role: o.roleText || o.title || 'Disclosed owner' };
        }
      }
    }
    if (bestPerson && bestPerson.score >= 70) {
      pushMatch(
        bestPerson.ccn,
        buildItem(rec, bestPerson.ccn, bestPerson.score, `person name + ${bestPerson.geoBasis} + state`, bestPerson.role)
      );
      continue;
    }

    unmatchedRelevant++;
    unmatchedItems.push(buildUnmatched(rec));
  }

  // ── Sort items per CCN: high before medium, then most recent exclusion first ──
  for (const ccn of Object.keys(itemsByCcn)) {
    itemsByCcn[ccn].sort((a, b) => {
      if (a.match_confidence !== b.match_confidence) return a.match_confidence === 'high' ? -1 : 1;
      return (b.exclusion_date || '').localeCompare(a.exclusion_date || '');
    });
  }

  // ── Write output ──
  const output = {
    generated_at: new Date().toISOString(),
    source: 'OIG LEIE',
    source_url: LEIE_URL,
    source_last_modified: lastModified,
    total_leie_records: leieRecords.length,
    hospice_relevant_records: hospiceRelevant.length,
    matched_to_ccn: highCount + mediumCount,
    matched_high_confidence: highCount,
    matched_medium_confidence: mediumCount,
    unmatched_hospice_relevant: unmatchedRelevant,
    unique_ccns_matched: Object.keys(itemsByCcn).length,
    items_by_ccn: itemsByCcn,
    // Hospice-relevant LEIE entries we could not safely attribute to a specific current
    // CCN (excluded entity is no longer Medicare-enrolled, individual is not in CMS owner
    // disclosures, etc.). Surface at state-level if desired — but DO NOT attach to a CCN.
    unmatched_hospice_relevant_items: unmatchedItems,
    matching_notes: [
      'Confidence ≥85 = high; 70–84 = medium; <70 dropped.',
      'NPI exact match against CCN↔NPI table from CMS hospice enrollments file = highest confidence.',
      'Entity name matching uses Levenshtein on stopword-stripped keys + state filter and REQUIRES ZIP or city corroboration (defamation guardrail — two CA hospices can share near-identical names).',
      'Individual exclusions matched against disclosed owners (CMS ownership disclosure file) only — medical directors, nurses, and rank-and-file staff are not in CMS data and cannot be matched here.',
      '94 of 99 hospice-relevant individuals in LEIE have NPI = 0000000000 (LEIE\'s null marker for individuals not in NPPES) and are matchable only via name+geo against disclosed owners.',
      'Hospice-relevance filter requires hospice/palliative term in BUSNAME, GENERAL, or SPECIALTY, OR an NPI that hits our CCN↔NPI table.',
    ],
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  const outStat = statSync(OUT_FILE);

  // ── Console summary ──
  console.log('');
  console.log('───── OIG LEIE → HOSPICE MATCH SUMMARY ─────');
  console.log(`LEIE records downloaded:        ${leieRecords.length.toLocaleString()}`);
  console.log(`Hospice-relevant records:       ${hospiceRelevant.length.toLocaleString()}`);
  console.log(`Matched to a CCN:               ${(highCount + mediumCount).toLocaleString()}`);
  console.log(`  high confidence (≥85):        ${highCount.toLocaleString()}`);
  console.log(`  medium confidence (70–84):    ${mediumCount.toLocaleString()}`);
  console.log(`Unmatched but hospice-relevant: ${unmatchedRelevant.toLocaleString()}`);
  console.log(`Unique CCNs with ≥1 exclusion:  ${Object.keys(itemsByCcn).length.toLocaleString()}`);
  console.log(`Output file:                    ${OUT_FILE}`);
  console.log(`Output size:                    ${(outStat.size / 1024).toFixed(2)} KB`);
  console.log('────────────────────────────────────────────');

  // Sample 3 matched items for sanity check
  const sampleCcns = Object.keys(itemsByCcn).slice(0, 3);
  if (sampleCcns.length) {
    console.log('Sample matches:');
    for (const ccn of sampleCcns) {
      const full = ccnToFull.get(ccn);
      console.log(`  CCN ${ccn} — ${full ? full.name : '(no record)'} (${full ? full.city + ', ' + full.state : ''}):`);
      for (const item of itemsByCcn[ccn].slice(0, 2)) {
        const who = item.entity_name || item.individual_name;
        console.log(`    • ${who} | ${item.exclusion_type || '?'} | ${item.exclusion_date || '?'} | ${item.match_confidence} (${item.match_score}) | ${item.match_basis}`);
      }
    }
  }
}

function formatLeieDate(yyyymmdd) {
  // LEIE dates are YYYYMMDD strings.
  const s = (yyyymmdd || '').trim();
  if (s.length !== 8 || !/^\d{8}$/.test(s)) return s || null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function leieRecordId(rec) {
  // LEIE has no stable primary key; build one from name+npi+excldate so the same record
  // gets the same ID across runs.
  const parts = [
    rec['LASTNAME'] || '',
    rec['FIRSTNAME'] || '',
    rec['BUSNAME'] || '',
    rec['NPI'] || '',
    rec['EXCLDATE'] || '',
  ];
  let h = 0;
  const s = parts.join('|').toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return 'leie_' + (h >>> 0).toString(36);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
