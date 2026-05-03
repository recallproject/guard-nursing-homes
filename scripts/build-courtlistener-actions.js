#!/usr/bin/env node
/**
 * build-courtlistener-actions.js
 *
 * Pipeline that queries the free, public CourtListener REST API (v4) for
 * hospice-related federal court filings — False Claims Act / qui tam /
 * fraud / settlement / forfeiture — and matches them against the 6,943
 * Medicare-certified hospices in our index.
 *
 * Source:  https://www.courtlistener.com/api/rest/v4/
 *          (free, public; no API key required for low-volume read-only use.
 *          If we get rate-limited the script logs and continues with what
 *          it has.)
 *
 * COVERAGE NOTE: We pull the most-recent ~100 results across three queries
 * (FCA, qui tam, generic hospice fraud). CourtListener is a rolling RECAP
 * archive of federal court dockets — coverage depends on what RECAP users
 * have uploaded. This pipeline produces a snapshot, not a backfill.
 *
 * Output: public/data/hospice/courtlistener-actions.json
 *
 * Stdlib only. No npm dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { URL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const HOSPICE_INDEX = path.join(ROOT, 'public/data/hospice/index.json');
const OUTPUT_FILE = path.join(ROOT, 'public/data/hospice/courtlistener-actions.json');
const CACHE_DIR = path.join(__dirname, '.cache');

const CL_BASE = 'https://www.courtlistener.com';
const CL_API = 'https://www.courtlistener.com/api/rest/v4/search/';
const USER_AGENT =
  'Mozilla/5.0 (compatible; OversightReports/1.0; +https://oversightreports.com)';
const REQUEST_TIMEOUT_MS = 10000;
const REQUEST_DELAY_MS = 350;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

// Three complementary queries — RECAP federal docket type=r — capped at the
// recent window. We dedupe by docket_id later.
const QUERIES = [
  { q: 'hospice "False Claims Act"', label: 'fca' },
  { q: 'hospice qui tam', label: 'qui-tam' },
  { q: 'hospice fraud settlement', label: 'fraud-settlement' },
];
const PAGE_SIZE = 50; // API default-ish; CL accepts up to 100.
const MAX_PAGES_PER_QUERY = 1; // first page only; we want most-relevant ~50/query

// CourtListener `court_id` values map cleanly to a US state for state context.
// Reference: https://www.courtlistener.com/help/coverage/#federal-trial-courts
const COURT_ID_TO_STATE = {
  // District courts (federal trial courts) — primary use case
  almd: 'AL', alnd: 'AL', alsd: 'AL',
  akd: 'AK',
  azd: 'AZ',
  ared: 'AR', arwd: 'AR',
  cacd: 'CA', caed: 'CA', cand: 'CA', casd: 'CA',
  cod: 'CO',
  ctd: 'CT',
  ded: 'DE',
  dcd: 'DC',
  flmd: 'FL', flnd: 'FL', flsd: 'FL',
  gamd: 'GA', gand: 'GA', gasd: 'GA',
  gud: 'GU',
  hid: 'HI',
  idd: 'ID',
  ilcd: 'IL', ilnd: 'IL', ilsd: 'IL',
  innd: 'IN', insd: 'IN',
  iand: 'IA', iasd: 'IA',
  ksd: 'KS',
  kyed: 'KY', kywd: 'KY',
  laed: 'LA', lamd: 'LA', lawd: 'LA',
  med: 'ME',
  mdd: 'MD',
  mad: 'MA',
  mied: 'MI', miwd: 'MI',
  mnd: 'MN',
  msnd: 'MS', mssd: 'MS',
  moed: 'MO', mowd: 'MO',
  mtd: 'MT',
  ned: 'NE',
  nvd: 'NV',
  nhd: 'NH',
  njd: 'NJ',
  nmd: 'NM',
  nyed: 'NY', nynd: 'NY', nysd: 'NY', nywd: 'NY',
  nced: 'NC', ncmd: 'NC', ncwd: 'NC',
  ndd: 'ND',
  nmid: 'MP',
  ohnd: 'OH', ohsd: 'OH',
  oked: 'OK', oknd: 'OK', okwd: 'OK',
  ord: 'OR',
  paed: 'PA', pamd: 'PA', pawd: 'PA',
  prd: 'PR',
  rid: 'RI',
  scd: 'SC',
  sdd: 'SD',
  tned: 'TN', tnmd: 'TN', tnwd: 'TN',
  txed: 'TX', txnd: 'TX', txsd: 'TX', txwd: 'TX',
  utd: 'UT',
  vtd: 'VT',
  vid: 'VI',
  vaed: 'VA', vawd: 'VA',
  waed: 'WA', wawd: 'WA',
  wvnd: 'WV', wvsd: 'WV',
  wied: 'WI', wiwd: 'WI',
  wyd: 'WY',
};

// Court_citation_string parsing fallback — when court_id is unknown, the
// "E.D. Cal." style string is reliable.
const CITATION_TO_STATE = {
  'al': 'AL', 'ak': 'AK', 'az': 'AZ', 'ark': 'AR', 'cal': 'CA', 'colo': 'CO',
  'conn': 'CT', 'del': 'DE', 'd.c': 'DC', 'fla': 'FL', 'ga': 'GA', 'haw': 'HI',
  'idaho': 'ID', 'ill': 'IL', 'ind': 'IN', 'iowa': 'IA', 'kan': 'KS', 'ky': 'KY',
  'la': 'LA', 'me': 'ME', 'md': 'MD', 'mass': 'MA', 'mich': 'MI', 'minn': 'MN',
  'miss': 'MS', 'mo': 'MO', 'mont': 'MT', 'neb': 'NE', 'nev': 'NV', 'n.h': 'NH',
  'n.j': 'NJ', 'n.m': 'NM', 'n.y': 'NY', 'n.c': 'NC', 'n.d': 'ND', 'ohio': 'OH',
  'okla': 'OK', 'or': 'OR', 'pa': 'PA', 'p.r': 'PR', 'r.i': 'RI', 's.c': 'SC',
  's.d': 'SD', 'tenn': 'TN', 'tex': 'TX', 'utah': 'UT', 'vt': 'VT', 'va': 'VA',
  'wash': 'WA', 'w.va': 'WV', 'wis': 'WI', 'wyo': 'WY',
};

// ---------------------------------------------------------------------------
// Hospice + enforcement keyword filter (post-fetch)
// ---------------------------------------------------------------------------

const HOSPICE_KEYWORDS = [/\bhospice\b/i, /\bpalliative\b/i];

const ENFORCEMENT_KEYWORDS = [
  /false claims act/i,
  /\bFCA\b/,
  /qui tam/i,
  /\bfraud(ulent)?\b/i,
  /\bsettle(d|ment|s)?\b/i,
  /\bforfeit(ure|ed)?\b/i,
  /\bkickback/i,
  /civil money penalt/i,
  /\bjudgment\b/i,
];

const CORP_SUFFIX_RE = new RegExp(
  '\\b(' +
    'inc|incorporated|llc|l\\.l\\.c\\.|llp|l\\.l\\.p\\.|lp|l\\.p\\.|' +
    'ltd|limited|co|corp|corporation|company|the|of|and|&|' +
    'pllc|p\\.c\\.|pc|p\\.a\\.|pa|holdings|services|service|' +
    'group|enterprises|systems|partners' +
  ')\\b', 'gi');

const HOSPICE_INDUSTRY_WORDS = /\b(hospice|palliative|care|health|healthcare|medical|home)\b/gi;

// ---------------------------------------------------------------------------
// HTTP helper — 10s timeout, single 5xx retry with backoff, bail on 4xx
// ---------------------------------------------------------------------------

function httpsGetRaw(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpsGetRaw(new URL(res.headers.location, url).toString())
            .then(resolve, reject);
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', reject);
  });
}

async function httpsGet(url) {
  let res;
  try {
    res = await httpsGetRaw(url);
  } catch (err) {
    // Network-level error — one retry with 1.5s backoff.
    await sleep(1500);
    res = await httpsGetRaw(url);
  }
  if (res.status >= 500 && res.status < 600) {
    // 5xx — one retry with backoff.
    await sleep(1500);
    res = await httpsGetRaw(url);
  }
  if (res.status >= 400 && res.status < 500) {
    throw new Error(`HTTP ${res.status} (4xx, bailing) for ${url}`);
  }
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.body;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Disk cache — keyed by SHA1(url)
// ---------------------------------------------------------------------------

function cachePathFor(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  return path.join(CACHE_DIR, `courtlistener_${hash}.json`);
}

async function fetchJsonCached(url) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cp = cachePathFor(url);
  if (fs.existsSync(cp)) {
    const stat = fs.statSync(cp);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      try {
        const cached = JSON.parse(fs.readFileSync(cp, 'utf8'));
        return { data: cached, fromCache: true };
      } catch { /* fall through to refetch */ }
    }
  }
  const body = await httpsGet(url);
  let data;
  try {
    data = JSON.parse(body);
  } catch (err) {
    throw new Error(`Non-JSON response from ${url}: ${body.slice(0, 200)}`);
  }
  fs.writeFileSync(cp, JSON.stringify(data));
  return { data, fromCache: false };
}

// ---------------------------------------------------------------------------
// Name normalization + fuzzy matching (mirrors build-doj-actions.js)
// ---------------------------------------------------------------------------

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\w\s&]/g, ' ')
    .replace(CORP_SUFFIX_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(name) {
  return new Set(
    normalizeName(name)
      .replace(HOSPICE_INDUSTRY_WORDS, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

// ---------------------------------------------------------------------------
// CourtListener result helpers
// ---------------------------------------------------------------------------

function stateFromCourtId(courtId, citationString) {
  if (courtId && COURT_ID_TO_STATE[courtId]) return COURT_ID_TO_STATE[courtId];
  if (citationString) {
    const lc = citationString.toLowerCase();
    for (const [needle, st] of Object.entries(CITATION_TO_STATE)) {
      const re = new RegExp(`\\b${needle.replace(/\./g, '\\.')}\\.?`);
      if (re.test(lc)) return st;
    }
  }
  return null;
}

/**
 * Extract a defendant entity name from a "Plaintiff v. Defendant" caption.
 * If the caption uses the federal qui-tam form "United States ex rel. X v. Y",
 * we still return Y. If it's "United States v. Y" we return Y. Otherwise
 * we return the post-"v." chunk.
 */
function extractDefendantFromCaption(caption) {
  if (!caption) return null;
  // Handle "X et al. v. Y" / "X v. Y, et al." — strip the "et al" parts.
  const lower = caption.toLowerCase();
  // Find " v. " or " vs. " or " v " (case-insensitive)
  const m = caption.match(/\bv\.?\s+(.+)$/i);
  if (!m) return null;
  let after = m[1].trim();
  after = after.replace(/,?\s+et\s+al\.?$/i, '').trim();
  // Drop trailing punctuation
  after = after.replace(/[.,;:\s]+$/, '').trim();
  return after || null;
}

function classifyStatus(result, party) {
  // CourtListener does not give a single "status" field. We infer a coarse
  // status from `cause`, `suitNature`, dateTerminated, and party text.
  // Conservative: if uncertain, return "filing".
  const dateTerminated = result.dateTerminated || null;
  const text = `${result.cause || ''} ${result.suitNature || ''} ${(party || []).join(' ')}`;
  if (dateTerminated) return 'judgment';
  if (/settle/i.test(text)) return 'settlement';
  if (/forfeiture/i.test(text)) return 'forfeiture';
  return 'filing';
}

function buildDocketUrl(result) {
  if (result.docket_absolute_url) {
    return CL_BASE + result.docket_absolute_url;
  }
  if (result.docket_id) {
    return `${CL_BASE}/docket/${result.docket_id}/`;
  }
  return null;
}

function buildSummary(result) {
  // Factual extract only — case caption, court, and the most recent docket
  // entry description if present. No editorializing.
  const parts = [];
  if (result.court) parts.push(result.court);
  if (result.docketNumber) parts.push(`No. ${result.docketNumber}`);
  if (result.cause) parts.push(`Cause: ${result.cause}`);
  if (result.suitNature) parts.push(`Nature: ${result.suitNature}`);
  let summary = parts.join('. ');
  // Optionally append the most recent recap_documents description (truncated).
  const docs = result.recap_documents || [];
  if (docs.length) {
    const sorted = [...docs].sort((a, b) =>
      (b.entry_date_filed || '').localeCompare(a.entry_date_filed || '')
    );
    const top = sorted[0];
    if (top && top.description) {
      const desc = top.description.replace(/\s+/g, ' ').trim();
      if (desc) summary += `. Latest entry: ${desc.slice(0, 240)}`;
    }
  }
  return summary.slice(0, 800);
}

// ---------------------------------------------------------------------------
// Filter + match
// ---------------------------------------------------------------------------

function isHospiceEnforcement(result) {
  const haystack = [
    result.caseName,
    result.case_name_full,
    result.cause,
    result.suitNature,
    (result.party || []).join(' '),
    (result.recap_documents || []).map((d) => d.description || '').join(' '),
  ].join(' \n ');
  if (!HOSPICE_KEYWORDS.some((re) => re.test(haystack))) return false;
  if (!ENFORCEMENT_KEYWORDS.some((re) => re.test(haystack))) return false;
  return true;
}

function matchDefendant(defendant, parties, stateHint, hospiceIndex, byState) {
  // Build a candidate name pool. Try the extracted defendant first; if that
  // fails, also try every party that mentions "hospice".
  const candidates = new Set();
  if (defendant) candidates.add(defendant);
  for (const p of parties || []) {
    if (/hospice|palliative/i.test(p)) candidates.add(p);
  }
  if (candidates.size === 0) return [];

  const pool = stateHint && byState[stateHint] ? byState[stateHint] : hospiceIndex;
  const allMatches = [];

  for (const cand of candidates) {
    const norm = normalizeName(cand);
    if (!norm || norm.length < 4) continue;
    const tokens = nameTokens(cand);
    if (tokens.size === 0) continue;

    const hasIndustryWord = /(hospice|palliat|care|health|home|medical|nursing)/i.test(cand);
    if (!hasIndustryWord && tokens.size <= 2) continue; // skip pure-individual names

    for (const h of pool) {
      const hNorm = normalizeName(h.name);
      if (!hNorm) continue;
      let confidence = null;
      let score = 0;
      let basis = '';

      if (hNorm === norm) {
        confidence = stateHint && h.state === stateHint ? 'high' : 'medium';
        score = 1;
        basis = 'exact-name';
      } else {
        const hTokens = nameTokens(h.name);
        const j = jaccard(tokens, hTokens);
        const sim = similarity(hNorm, norm);
        score = Math.max(j, sim);
        if (j >= 0.85 || sim >= 0.95) {
          confidence = stateHint && h.state === stateHint ? 'high' : 'medium';
          basis = 'fuzzy-strong';
        } else if ((j >= 0.7 || sim >= 0.9) && stateHint && h.state === stateHint) {
          confidence = 'medium';
          basis = 'fuzzy-state';
        }
      }

      // Drop anything below 0.70 normalized similarity (per task spec).
      if (!confidence || score < 0.70) continue;

      allMatches.push({ ccn: h.ccn, name: h.name, state: h.state, confidence, score, basis });
    }
  }

  const order = { high: 3, medium: 2, low: 1 };
  allMatches.sort((a, b) => order[b.confidence] - order[a.confidence] || b.score - a.score);

  // Dedupe by CCN
  const seen = new Set();
  const out = [];
  for (const m of allMatches) {
    if (seen.has(m.ccn)) continue;
    seen.add(m.ccn);
    out.push(m);
  }
  return out.slice(0, 10);
}

function actionId(docketId, label) {
  if (docketId) return `cl-${label}-${docketId}`;
  return `cl-${label}-${crypto.randomBytes(4).toString('hex')}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('build-courtlistener-actions: starting');
  console.log('  hospice index:', HOSPICE_INDEX);
  console.log('  output:       ', OUTPUT_FILE);

  // Load hospice index
  const hospiceIndex = JSON.parse(fs.readFileSync(HOSPICE_INDEX, 'utf8'));
  console.log(`Loaded ${hospiceIndex.length} hospices from index.json`);

  const byState = {};
  for (const h of hospiceIndex) {
    if (!h.state) continue;
    (byState[h.state] = byState[h.state] || []).push(h);
  }

  // Pull results across the configured queries.
  const allResults = [];
  const seenDocketIds = new Set();
  const queryStats = [];
  let apiSoftFailures = 0;

  for (const q of QUERIES) {
    let pulled = 0;
    let cursor = null;
    for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
      const params = new URLSearchParams({
        q: q.q,
        type: 'r',
        order_by: 'dateFiled desc',
        page_size: String(PAGE_SIZE),
      });
      if (cursor) params.set('cursor', cursor);
      const url = `${CL_API}?${params.toString()}`;
      console.log(`  [${q.label}] page ${page + 1}: ${url}`);
      let data;
      try {
        const resp = await fetchJsonCached(url);
        data = resp.data;
        if (!resp.fromCache) await sleep(REQUEST_DELAY_MS);
      } catch (err) {
        console.warn(`    ! fetch failed: ${err.message}`);
        apiSoftFailures++;
        break;
      }
      const results = Array.isArray(data.results) ? data.results : [];
      for (const r of results) {
        if (r.docket_id && seenDocketIds.has(r.docket_id)) continue;
        if (r.docket_id) seenDocketIds.add(r.docket_id);
        allResults.push({ ...r, _query: q.label });
        pulled++;
      }
      // CourtListener v4 uses cursor pagination (`next` URL contains it).
      // We're only doing one page per query, so this is mostly informational.
      if (data.next) {
        try {
          const nextUrl = new URL(data.next);
          cursor = nextUrl.searchParams.get('cursor');
        } catch { cursor = null; }
      } else {
        cursor = null;
      }
    }
    queryStats.push({ query: q.q, label: q.label, pulled });
  }

  console.log(`Total CourtListener results pulled (deduped): ${allResults.length}`);

  // Filter to hospice + enforcement.
  const hospiceItems = allResults.filter(isHospiceEnforcement);
  console.log(`${hospiceItems.length} items pass hospice + enforcement filter`);

  // Build action records and match to CCNs.
  const actions = [];
  const itemsByCcn = {};
  let matchedCount = 0;
  let highCount = 0;
  let mediumCount = 0;

  for (const r of hospiceItems) {
    const caption = r.caseName || r.case_name_full || '';
    const defendant = extractDefendantFromCaption(caption);
    const stateHint = stateFromCourtId(r.court_id, r.court_citation_string);
    const matches = matchDefendant(defendant, r.party || [], stateHint, hospiceIndex, byState);
    const matchedCcns = matches.map((m) => m.ccn);
    const topConfidence = matches.length ? matches[0].confidence : null;

    if (matches.length) {
      matchedCount++;
      if (topConfidence === 'high') highCount++;
      else if (topConfidence === 'medium') mediumCount++;
    }

    const docketUrl = buildDocketUrl(r);
    const status = classifyStatus(r, r.party);

    const action = {
      id: actionId(r.docket_id, r._query),
      ccn: matchedCcns[0] || null,
      hospice_name: matches.length ? matches[0].name : null,
      state: matches.length ? matches[0].state : (stateHint || null),
      case_caption: caption,
      court: r.court || null,
      court_id: r.court_id || null,
      docket_number: r.docketNumber || null,
      date_filed: r.dateFiled || null,
      date_terminated: r.dateTerminated || null,
      docket_url: docketUrl,
      summary: buildSummary(r),
      status,
      confidence: topConfidence,
      basis: matches.length ? matches[0].basis : null,
      defendant_extracted: defendant,
      query: r._query,
      matched_ccns: matchedCcns,
      match_details: matches,
    };

    // Drop any item with no CCN match (defamation discipline — we only
    // surface filings we can attach to a specific facility).
    if (!matchedCcns.length) continue;
    actions.push(action);

    for (const m of matches) {
      const arr = (itemsByCcn[m.ccn] = itemsByCcn[m.ccn] || []);
      arr.push({
        date: action.date_filed,
        case_caption: action.case_caption,
        court: action.court,
        docket_number: action.docket_number,
        docket_url: action.docket_url,
        summary: action.summary,
        status: action.status,
        confidence: m.confidence,
        basis: m.basis,
      });
    }
  }

  // Sort actions: most recent first
  actions.sort((a, b) => (b.date_filed || '').localeCompare(a.date_filed || ''));
  for (const ccn of Object.keys(itemsByCcn)) {
    itemsByCcn[ccn].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: 'CourtListener',
    source_url: CL_BASE,
    coverage_note:
      'CourtListener RECAP archive coverage depends on RECAP user uploads. Snapshot, not a backfill.',
    queries: queryStats,
    api_soft_failures: apiSoftFailures,
    total_search_results: allResults.length,
    hospice_filtered: hospiceItems.length,
    matched_to_ccn: matchedCount,
    matched_high_confidence: highCount,
    matched_medium_confidence: mediumCount,
    actions,
    items_by_ccn: itemsByCcn,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2));
  const stat = fs.statSync(OUTPUT_FILE);
  console.log(`\nWrote ${OUTPUT_FILE} (${stat.size} bytes)`);
  console.log(
    `summary: pulled=${allResults.length} hospice_filtered=${hospiceItems.length} matched=${matchedCount} (high=${highCount}, medium=${mediumCount}) unique_ccns=${Object.keys(itemsByCcn).length}`
  );
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
