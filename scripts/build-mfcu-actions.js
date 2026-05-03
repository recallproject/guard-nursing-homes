#!/usr/bin/env node
/**
 * build-mfcu-actions.js
 *
 * Pipeline that scrapes State Attorney General press release pages for the
 * 6 highest-volume Medicaid Fraud Control Unit (MFCU) states and matches
 * hospice-related actions against the Medicare-certified hospice index.
 *
 * Sources (per-state HTML listing pages — RSS feeds don't exist or are dead):
 *   - California:    https://oag.ca.gov/news                (Drupal views)
 *   - Texas:         https://www.texasattorneygeneral.gov/news/releases
 *   - New York:      https://ag.ny.gov/press-releases       (Drupal views)
 *   - Florida:       https://www.myfloridalegal.com/newsreleases (Drupal table)
 *   - Illinois:      https://illinoisattorneygeneral.gov/News-Room/ (sidebar)
 *   - Pennsylvania:  https://www.attorneygeneral.gov/taking-action/ (WP table)
 *
 * COVERAGE NOTE: Each state AG runs a different CMS / DOM. We scrape the
 * first listing page only (no pagination — ~10–30 items per state) and use
 * stdlib regex. If a state's HTML structure changes, that state logs a
 * warning + is skipped; the pipeline does not fail.
 *
 * Output: public/data/hospice/mfcu-actions.json
 *
 * Stdlib only. No npm dependencies (no cheerio, no jsdom).
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { URL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const HOSPICE_INDEX = path.join(ROOT, 'public/data/hospice/index.json');
const OUTPUT_FILE = path.join(ROOT, 'public/data/hospice/mfcu-actions.json');
const CACHE_DIR = path.join(__dirname, '.cache');

const USER_AGENT =
  'Mozilla/5.0 (compatible; OversightReports/1.0; +https://oversightreports.com)';
const REQUEST_TIMEOUT_MS = 10000;

const STATE_FEEDS = [
  // CA: Drupal "views-row" rows. Listed page /news/press-releases 404s; /news works.
  {
    state: 'CA',
    name: 'California',
    url: 'https://oag.ca.gov/news',
    base: 'https://oag.ca.gov',
    parser: 'ca',
  },
  // TX: <div class="m-b-3"> blocks with <h4> + <p> excerpt + <p class="meta">.
  {
    state: 'TX',
    name: 'Texas',
    url: 'https://www.texasattorneygeneral.gov/news/releases',
    base: 'https://www.texasattorneygeneral.gov',
    parser: 'tx',
  },
  // NY: Drupal "views-row" with <time datetime> + anchor.
  {
    state: 'NY',
    name: 'New York',
    url: 'https://ag.ny.gov/press-releases',
    base: 'https://ag.ny.gov',
    parser: 'ny',
  },
  // FL: Drupal table /newsreleases (the documented /newsroom 404s).
  {
    state: 'FL',
    name: 'Florida',
    url: 'https://www.myfloridalegal.com/newsreleases',
    base: 'https://www.myfloridalegal.com',
    parser: 'fl',
  },
  // IL: News-Room sidebar list (about 10 most recent items).
  {
    state: 'IL',
    name: 'Illinois',
    url: 'https://illinoisattorneygeneral.gov/News-Room/',
    base: 'https://illinoisattorneygeneral.gov',
    parser: 'il',
  },
  // PA: WordPress /taking-action/ table with <td class="date"> + <td class="title">.
  {
    state: 'PA',
    name: 'Pennsylvania',
    url: 'https://www.attorneygeneral.gov/taking-action/',
    base: 'https://www.attorneygeneral.gov',
    parser: 'pa',
  },
];

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const HOSPICE_KEYWORDS = [/\bhospice\b/i, /\bpalliative\b/i, /end[-\s]of[-\s]life\b/i];

const ENFORCEMENT_KEYWORDS = [
  /\bmedicaid\b/i,
  /\bmedicare\b/i,
  /\bfraud\b/i,
  /\bsettle(d|ment|s)?\b/i,
  /\bindict(ed|ment|ments)?\b/i,
  /\bconvict(ed|ion|ions)?\b/i,
  /\bsentenced?\b/i,
  /\bplead(ed|s)?\s+guilty\b/i,
  /patient\s+(neglect|abuse)/i,
  /\bbilling\b/i,
  /\bkickback/i,
  /false\s+claims/i,
  /civil\s+action/i,
  /\bcharged\b/i,
];

// Corporate suffixes to strip when normalizing names for matching.
const CORP_SUFFIX_RE = new RegExp(
  '\\b(' +
    'inc|incorporated|llc|l\\.l\\.c\\.|llp|l\\.l\\.p\\.|lp|l\\.p\\.|' +
    'ltd|limited|co|corp|corporation|company|the|of|and|&|' +
    'pllc|p\\.c\\.|pc|p\\.a\\.|pa|holdings|services|service|' +
    'group|enterprises|systems|partners' +
  ')\\b', 'gi');

const HOSPICE_INDUSTRY_WORDS = /\b(hospice|palliative|care|health|healthcare|medical|home)\b/gi;

// Generic single-word names too noisy to match on alone.
const TOO_GENERIC = new Set([
  'community', 'compassionate', 'caring', 'gentle', 'serenity', 'angels',
  'family', 'home', 'comfort', 'peace', 'mercy', 'grace', 'hope',
  'first', 'best', 'good', 'new', 'st', 'saint', 'holy',
]);

// ---------------------------------------------------------------------------
// HTTP fetch (https + http) with timeout, single 5xx retry, 4xx skip
// ---------------------------------------------------------------------------

function fetchOnce(urlStr) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); }
    catch (e) { return reject(new Error(`bad URL: ${urlStr}`)); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'http:' ? 80 : 443),
        path: u.pathname + u.search,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          // Follow up to one redirect by issuing a fresh fetch.
          return fetchOnce(new URL(res.headers.location, urlStr).toString())
            .then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          const err = new Error(`HTTP ${res.statusCode} for ${urlStr}`);
          err.statusCode = res.statusCode;
          return reject(err);
        }
        const ct = res.headers['content-type'] || '';
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({
          body: Buffer.concat(chunks).toString('utf8'),
          contentType: ct,
        }));
        res.on('error', reject);
      }
    );
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout (${REQUEST_TIMEOUT_MS}ms) fetching ${urlStr}`));
    });
    req.on('error', reject);
  });
}

async function fetchWithRetry(urlStr) {
  try {
    return await fetchOnce(urlStr);
  } catch (err) {
    // 4xx => no retry, surface immediately.
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) throw err;
    // 5xx or network/timeout => single retry.
    return await fetchOnce(urlStr);
  }
}

async function getCachedFeed(state, url) {
  const cacheFile = path.join(CACHE_DIR, `mfcu_${state.toLowerCase()}.html`);
  // Use cache if < 6h old.
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      console.log(`  [cache] ${state} using cached page (age ${Math.round((Date.now() - stat.mtimeMs) / 60000)} min)`);
      return { body: fs.readFileSync(cacheFile, 'utf8'), contentType: 'cached', fromCache: true };
    }
  }
  const res = await fetchWithRetry(url);
  fs.writeFileSync(cacheFile, res.body);
  return { ...res, fromCache: false };
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (stdlib only)
// ---------------------------------------------------------------------------

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

// Soft hyphen (U+00AD) appears inside Texas AG titles for line-break hints.
// Strip it everywhere — never display these to users and never use them in
// keyword matches.
function stripSoftHyphens(s) {
  return s ? s.replace(/­/g, '') : '';
}

function stripHtml(s) {
  if (!s) return '';
  return stripSoftHyphens(
    decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  );
}

function absUrl(href, base) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function looksLikeListingPage(body, parser) {
  if (!body) return false;
  // Each parser checks for its characteristic marker. If a state's CMS
  // changes layout we get a clean skip rather than an empty result.
  const head = body.slice(0, body.length); // can be large; we just substring search
  switch (parser) {
    case 'ca':
      return head.includes('views-field-title') && head.includes('press-releases');
    case 'tx':
      return head.includes('class="m-b-3"') && head.includes('h4-sans');
    case 'ny':
      return head.includes('views-field-field-press-date') || head.includes('/press-release/');
    case 'fl':
      return head.includes('newsrelease') && head.includes('views-field-title');
    case 'il':
      return head.includes('class="news-item') && head.includes('/news/story/');
    case 'pa':
      return head.includes('/taking-action/') && head.includes('class="date"');
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Per-state HTML parsers. Each returns an array of:
//   { title, link, pubDate, description, contentEncoded, guid }
// matching the schema the rest of this file already assumes (carried over
// from the prior RSS parser so the matching/output code stays unchanged).
// ---------------------------------------------------------------------------

// CA — oag.ca.gov/news
//   <div class="views-row ...">
//     <div class="views-field views-field-title">
//       <span class="field-content"><a href="/news/press-releases/...">TITLE</a></span>
//     </div>
//     <div class="views-field views-field-field-release-date">
//       <span ... content="2026-05-01T00:00:00-07:00" ...>May 1, 2026</span>
//     </div>
//   </div>
function parseCA(html, base) {
  const items = [];
  // Walk row-by-row by anchoring on the views-row class. Use a greedy split
  // rather than balancing braces (we only need the title anchor + the date
  // span that immediately follows it — the next views-row is a hard boundary).
  const segments = html.split(/<div[^>]*class="[^"]*views-row[^"]*"[^>]*>/i);
  // First segment is the header before any row; skip it.
  for (let i = 1; i < segments.length; i++) {
    const block = segments[i];
    // Stop the segment at the next views-row marker (already split) — but
    // also clip at the closing of the view-content panel to avoid leaking
    // pager/footer markup into the last item.
    const cutAt = block.search(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i);
    const scope = cutAt > 0 ? block.slice(0, cutAt) : block;
    const titleM = scope.match(/views-field-title[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleM) continue;
    const link = absUrl(titleM[1], base);
    const title = stripHtml(titleM[2]);
    const dateM = scope.match(/property="dc:date"[^>]*content="([^"]+)"/i)
      || scope.match(/<span[^>]*class="[^"]*date-display-single[^"]*"[^>]*>([^<]+)<\/span>/i);
    const pubDate = dateM ? dateM[1] : '';
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description: '', contentEncoded: '', guid: link });
  }
  return items;
}

// TX — texasattorneygeneral.gov/news/releases
//   <div class="m-b-3">
//     <h4 class="m-b-1 h4-sans"><a href="/news/releases/...">TITLE (with soft-hyphens + caps spans)</a></h4>
//     <p class="m-b-0">EXCERPT (sometimes empty)</p>
//     <p class="meta m-b-0">May 01, 2026  | Press Release</p>
//   </div>
function parseTX(html, base) {
  const items = [];
  const blockRe = /<div class="m-b-3">([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[1];
    const titleM = block.match(/<h4[^>]*h4-sans[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleM) continue;
    const link = absUrl(titleM[1], base);
    const title = stripHtml(titleM[2]);
    // First <p class="m-b-0"> after the h4 is the excerpt; <p class="meta m-b-0"> is the date.
    const excerptM = block.match(/<p class="m-b-0">([\s\S]*?)<\/p>/i);
    const description = excerptM ? stripHtml(excerptM[1]) : '';
    const metaM = block.match(/<p class="meta m-b-0">([\s\S]*?)<\/p>/i);
    let pubDate = '';
    if (metaM) {
      // "May 01, 2026  | Press Release" -> first chunk before the pipe.
      const meta = stripHtml(metaM[1]);
      pubDate = meta.split('|')[0].trim();
    }
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description, contentEncoded: '', guid: link });
  }
  return items;
}

// NY — ag.ny.gov/press-releases
//   <div class="views-row">
//     <div class="views-field views-field-field-press-date">
//       <span class="field-content"><time datetime="2026-05-01T12:00:00Z">May 1, 2026</time></span>
//     </div>
//     <div class="views-field views-field-title">
//       <span class="field-content"><a href="/press-release/...">TITLE</a></span>
//     </div>
//   </div>
function parseNY(html, base) {
  const items = [];
  // Each row begins with <div class="views-row"> — split on that and read
  // the title anchor + datetime within each segment.
  const segments = html.split(/<div class="views-row">/);
  for (let i = 1; i < segments.length; i++) {
    const block = segments[i];
    const titleM = block.match(/views-field-title[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleM) continue;
    const href = titleM[1];
    if (!/\/press-release\//i.test(href)) continue; // skip nav/template anchors
    const link = absUrl(href, base);
    const title = stripHtml(titleM[2]);
    const dateM = block.match(/<time[^>]*datetime="([^"]+)"/i);
    const pubDate = dateM ? dateM[1] : '';
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description: '', contentEncoded: '', guid: link });
  }
  return items;
}

// FL — myfloridalegal.com/newsreleases
//   <tr>
//     <td class="... views-field-field-released"><time datetime="...">DATE</time></td>
//     <td class="... views-field-title"><a href="/newsrelease/...">TITLE</a></td>
//   </tr>
function parseFL(html, base) {
  const items = [];
  const trRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const block = m[1];
    const titleM = block.match(/views-field-title[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleM) continue;
    const href = titleM[1];
    if (!/\/newsrelease\//i.test(href)) continue;
    const link = absUrl(href, base);
    const title = stripHtml(titleM[2]);
    const dateM = block.match(/<time[^>]*datetime="([^"]+)"/i);
    const pubDate = dateM ? dateM[1] : '';
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description: '', contentEncoded: '', guid: link });
  }
  return items;
}

// IL — illinoisattorneygeneral.gov/News-Room/
//   The page renders a sidebar "Recent Press Releases" (~10 most recent items)
//   followed by a year-by-year accordion archive containing every release ever
//   issued. We only want the sidebar — the accordion contains stale items
//   from many years prior and would dominate the keyword filter.
//
//   Sidebar shape:
//     <aside aria-label="Recent Press Releases">
//       <a class="news-item" href="/news/story/...">
//         <time datetime="2026-05-01 2:00 PM">May 01, 2026</time>
//         <p>TITLE IN ALL CAPS</p>
//       </a>
//       ...
//     </aside>
function parseIL(html, base) {
  const items = [];
  // Scope to the Recent Press Releases <aside>. If we can't find it, fall
  // back to the whole page but cap at the first 30 anchors so we don't
  // ingest the entire historical archive.
  const asideStart = html.search(/<aside[^>]*aria-label="Recent Press Releases"/i);
  let scope;
  if (asideStart >= 0) {
    const tail = html.slice(asideStart);
    const asideEnd = tail.search(/<\/aside>/i);
    scope = asideEnd > 0 ? tail.slice(0, asideEnd) : tail;
  } else {
    console.warn('  ! IL: "Recent Press Releases" aside not found; falling back to first 30 anchors');
    scope = html;
  }
  const aRe = /<a class="news-item[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(scope)) !== null) {
    const href = m[1];
    if (!/\/news\/story\//i.test(href)) continue;
    const inner = m[2];
    const dateM = inner.match(/<time[^>]*datetime="([^"]+)"/i);
    const titleM = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!titleM) continue;
    const link = absUrl(href, base);
    const title = stripHtml(titleM[1]);
    const pubDate = dateM ? dateM[1] : '';
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description: '', contentEncoded: '', guid: link });
    if (items.length >= 30) break;
  }
  return items;
}

// PA — attorneygeneral.gov/taking-action/
//   <tr>
//     <td class="date"><a href="..."><strong class="date">05/01/2026</strong></a></td>
//     <td class="title"><a href="...">TITLE</a></td>
//   </tr>
function parsePA(html, base) {
  const items = [];
  const trRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const block = m[1];
    const titleM = block.match(/<td class="title">\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleM) continue;
    const link = absUrl(titleM[1], base);
    const title = stripHtml(titleM[2]);
    const dateM = block.match(/<strong class="date">([\s\S]*?)<\/strong>/i);
    let pubDate = '';
    if (dateM) {
      const raw = stripHtml(dateM[1]); // e.g. "05/01/2026"
      const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      pubDate = parts ? `${parts[3]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}` : raw;
    }
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description: '', contentEncoded: '', guid: link });
  }
  return items;
}

const PARSERS = { ca: parseCA, tx: parseTX, ny: parseNY, fl: parseFL, il: parseIL, pa: parsePA };

function parseStatePage(parser, html, base) {
  const fn = PARSERS[parser];
  if (!fn) return [];
  try {
    return fn(html, base);
  } catch (err) {
    console.warn(`  ! parser ${parser} threw: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Name normalization + matching
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

/**
 * Extract candidate org/defendant phrases from a press-release headline + body.
 * Looks for runs of capitalized words (proper nouns) that include "Hospice" or
 * "Palliative" — these are likely entity names we can match against the index.
 */
function extractCandidatePhrases(text) {
  if (!text) return [];
  const phrases = [];
  const re = /\b([A-Z][A-Za-z0-9&'.\-]+(?:\s+(?:of|the|and|&|at|in|de|for)\s+[A-Z][A-Za-z0-9&'.\-]+|\s+[A-Z][A-Za-z0-9&'.\-]+){0,5})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1].length >= 6) phrases.push(m[1]);
  }
  return phrases.filter((p) => /\b(Hospice|Palliative)\b/.test(p));
}

/**
 * Match candidate phrases against the hospice index, scoped to the AG's state
 * (state context is REQUIRED — no cross-state matching). Conservative rules
 * because false positives accusing a hospice of fraud are a defamation risk.
 *
 *   - "high"  : exact normalized equality AND state match.
 *   - "medium": (jaccard >= 0.7 OR levenshtein-similarity >= 0.92) AND state match.
 *   - dropped : everything below 0.70 normalized similarity.
 */
function matchHospiceInState(phrases, agState, byState) {
  if (!phrases.length || !byState[agState]) return [];
  const pool = byState[agState];

  const candidates = new Map(); // ccn -> match record

  for (const phrase of phrases) {
    const norm = normalizeName(phrase);
    if (!norm || norm.length < 5) continue;
    const tokens = nameTokens(phrase);
    if (tokens.size === 0) continue;

    // Skip phrases that boil down to a single generic token.
    const meaningfulTokens = [...tokens].filter((t) => !TOO_GENERIC.has(t));
    if (meaningfulTokens.length === 0) continue;

    for (const h of pool) {
      const hNorm = normalizeName(h.name);
      if (!hNorm || hNorm.length < 5) continue;

      let confidence = null;
      let basis = null;
      let score = 0;

      if (hNorm === norm) {
        confidence = 'high';
        basis = 'exact-normalized';
        score = 1;
      } else {
        const hTokens = nameTokens(h.name);
        const j = jaccard(tokens, hTokens);
        const sim = similarity(hNorm, norm);
        score = Math.max(j, sim);
        if (j >= 0.85 || sim >= 0.95) {
          confidence = 'high';
          basis = 'fuzzy-strong';
        } else if (j >= 0.7 || sim >= 0.92) {
          confidence = 'medium';
          basis = 'fuzzy';
        } else if (sim < 0.70) {
          // Below floor — drop.
          continue;
        } else {
          continue;
        }
      }

      if (!confidence) continue;
      const prev = candidates.get(h.ccn);
      if (!prev || prev.score < score) {
        candidates.set(h.ccn, {
          ccn: h.ccn,
          hospice_name: h.name,
          state: h.state,
          city: h.city,
          confidence,
          basis,
          matched_phrase: phrase,
          score,
        });
      }
    }
  }

  return Array.from(candidates.values()).sort((a, b) => {
    const order = { high: 2, medium: 1 };
    return (order[b.confidence] - order[a.confidence]) || (b.score - a.score);
  });
}

// ---------------------------------------------------------------------------
// Action classification + factual extract
// ---------------------------------------------------------------------------

function classifyActionType(text) {
  const t = text || '';
  if (/\bindict(ed|ment|ments)?\b/i.test(t)) return 'indictment';
  if (/\bconvict(ed|ion|ions)?\b/i.test(t) || /pleaded?\s+guilty/i.test(t) || /\bsentenced?\b/i.test(t))
    return 'conviction';
  if (/\bsettle(d|ment|s)?\b/i.test(t) || /agreed?\s+to\s+pay/i.test(t)) return 'settlement';
  if (/civil\s+action/i.test(t) || /\bcivil\s+complaint/i.test(t)) return 'civil action';
  if (/\bcharged\b/i.test(t)) return 'criminal charge';
  return 'enforcement action';
}

function isHospiceEnforcement(item) {
  const haystack = [item.title, stripHtml(item.description || ''), stripHtml(item.contentEncoded || '')].join(' \n ');
  if (!HOSPICE_KEYWORDS.some((re) => re.test(haystack))) return false;
  if (!ENFORCEMENT_KEYWORDS.some((re) => re.test(haystack))) return false;
  return true;
}

function buildSummary(item) {
  const text = stripHtml(item.description || item.contentEncoded || '').trim();
  if (!text) return '';
  // First 1-2 sentences.
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let summary = sentences.slice(0, 2).join(' ').trim();
  if (!summary) summary = text.slice(0, 400);
  return summary.slice(0, 600);
}

function isoDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('build-mfcu-actions: starting');
  console.log('  hospice index:', HOSPICE_INDEX);
  console.log('  output:       ', OUTPUT_FILE);

  const hospiceIndex = JSON.parse(fs.readFileSync(HOSPICE_INDEX, 'utf8'));
  console.log(`Loaded ${hospiceIndex.length} hospices from index.json`);

  const byState = {};
  for (const h of hospiceIndex) {
    if (!h.state) continue;
    (byState[h.state] = byState[h.state] || []).push(h);
  }

  const statesAttempted = [];
  const statesSucceeded = [];
  const statesFailed = [];
  let totalScrapedItems = 0;
  let hospiceFiltered = 0;
  let matchedCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  const actions = [];
  const itemsByCcn = {};
  const perStateCounts = {};

  for (const feed of STATE_FEEDS) {
    statesAttempted.push(feed.state);
    console.log(`\n[${feed.state}] ${feed.name} -> ${feed.url}`);
    let res;
    try {
      res = await getCachedFeed(feed.state, feed.url);
    } catch (err) {
      console.warn(`  ! ${feed.state} fetch failed: ${err.message}`);
      statesFailed.push({ state: feed.state, reason: err.message });
      continue;
    }

    if (!looksLikeListingPage(res.body, feed.parser)) {
      console.warn(`  ! ${feed.state} response is not a recognizable listing page (parser=${feed.parser}); HTML structure may have changed. Skipping.`);
      statesFailed.push({ state: feed.state, reason: `not a listing page (parser=${feed.parser}, content-type=${res.contentType})` });
      continue;
    }

    const items = parseStatePage(feed.parser, res.body, feed.base);
    if (!items.length) {
      console.warn(`  ! ${feed.state} parsed 0 items from page; HTML structure may have changed. Skipping.`);
      statesFailed.push({ state: feed.state, reason: 'parsed 0 items' });
      continue;
    }
    console.log(`  pulled ${items.length} items from page`);
    totalScrapedItems += items.length;
    perStateCounts[feed.state] = items.length;
    statesSucceeded.push(feed.state);

    const stateHospiceItems = items.filter(isHospiceEnforcement);
    if (stateHospiceItems.length) {
      console.log(`  ${stateHospiceItems.length} item(s) match hospice + enforcement keywords`);
    }
    hospiceFiltered += stateHospiceItems.length;

    for (const it of stateHospiceItems) {
      const fullText = [it.title, stripHtml(it.description || ''), stripHtml(it.contentEncoded || '')].join('. ');
      const phrases = extractCandidatePhrases(fullText);
      const matches = matchHospiceInState(phrases, feed.state, byState);

      if (matches.length) {
        matchedCount += matches.length;
        for (const m of matches) {
          if (m.confidence === 'high') highCount++;
          else if (m.confidence === 'medium') mediumCount++;
        }
      }

      const summary = buildSummary(it);
      const actionType = classifyActionType(it.title + ' ' + (it.description || '') + ' ' + (it.contentEncoded || ''));
      const dateIso = isoDate(it.pubDate);

      // Only emit per-CCN entries when we have at least one matched hospice in
      // the AG's own state (defamation guardrail). Items with no match are
      // logged in totals but do NOT appear in actions[] — we only publish
      // accusations against named, identified hospices.
      if (matches.length === 0) continue;

      for (const m of matches) {
        const action = {
          ccn: m.ccn,
          hospice_name: m.hospice_name,
          state: m.state,
          ag_state: feed.state,
          headline: it.title,
          date: dateIso,
          source_url: it.link,
          summary,
          confidence: m.confidence,
          basis: m.basis,
          action_type: actionType,
          matched_phrase: m.matched_phrase,
          disclaimer: 'Inclusion does not constitute a finding by The Oversight Report.',
        };
        actions.push(action);
        const arr = (itemsByCcn[m.ccn] = itemsByCcn[m.ccn] || []);
        arr.push(action);
      }
    }
  }

  // Sort actions by date descending where possible.
  actions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  for (const ccn of Object.keys(itemsByCcn)) {
    itemsByCcn[ccn].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: 'State AG MFCU',
    coverage_note:
      'Best-effort HTML scrape of state AG press-release listing pages for the 6 highest-volume Medicaid fraud states (CA, TX, NY, FL, IL, PA). No unified MFCU feed exists and per-state RSS feeds are dead. We scrape the first listing page only (no pagination). State-specific HTML may change format; failures are logged and skipped, not fatal. Defamation guardrail: only items with a high- or medium-confidence match to a hospice in the AG\'s own state are emitted; every action links to the source URL with the disclaimer "Inclusion does not constitute a finding by The Oversight Report."',
    states_attempted: statesAttempted,
    states_succeeded: statesSucceeded,
    states_failed: statesFailed,
    // Field name kept as total_rss_items_pulled for downstream-schema
    // compatibility (the React UI / GitHub Action read this key).
    total_rss_items_pulled: totalScrapedItems,
    per_state_items_scraped: perStateCounts,
    hospice_filtered: hospiceFiltered,
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
  console.log(`  states attempted:     ${statesAttempted.join(', ')}`);
  console.log(`  states succeeded:     ${statesSucceeded.join(', ') || '(none)'}`);
  console.log(`  states failed:        ${statesFailed.map((s) => s.state).join(', ') || '(none)'}`);
  console.log(`  items scraped:        ${totalScrapedItems}`);
  console.log(`  hospice-filtered:     ${hospiceFiltered}`);
  console.log(`  matched to CCN:       ${matchedCount} (high=${highCount}, medium=${mediumCount})`);
  console.log(`  unique CCNs touched:  ${Object.keys(itemsByCcn).length}`);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
