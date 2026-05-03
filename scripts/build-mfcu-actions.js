#!/usr/bin/env node
/**
 * build-mfcu-actions.js
 *
 * Pipeline that scrapes State Attorney General press release feeds for the
 * 6 highest-volume Medicaid Fraud Control Unit (MFCU) states and matches
 * hospice-related actions against the 6,943 Medicare-certified hospices in
 * our index.
 *
 * Sources (per-state RSS feeds, best-effort URLs):
 *   - California:    https://oag.ca.gov/news/press-releases/feed
 *   - Texas:         https://www.texasattorneygeneral.gov/news/rss.xml
 *   - New York:      https://ag.ny.gov/press-releases/feed
 *   - Florida:       http://myfloridalegal.com/__85257B7B0070E767.nsf/RSS/News?OpenAgent
 *   - Illinois:      https://illinoisattorneygeneral.gov/Press/news.rss
 *   - Pennsylvania:  https://www.attorneygeneral.gov/feed/
 *
 * COVERAGE NOTE: No unified federal MFCU RSS exists. Each state AG runs its
 * own feed with no consistent format. URLs above are best-effort — if any
 * return 404 or non-RSS content, this script logs a warning and skips that
 * state without failing the pipeline. Better to ship 4/6 states than 0/6.
 *
 * Output: public/data/hospice/mfcu-actions.json
 *
 * Stdlib only. No npm dependencies.
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
  { state: 'CA', name: 'California', url: 'https://oag.ca.gov/news/press-releases/feed' },
  { state: 'TX', name: 'Texas', url: 'https://www.texasattorneygeneral.gov/news/rss.xml' },
  { state: 'NY', name: 'New York', url: 'https://ag.ny.gov/press-releases/feed' },
  { state: 'FL', name: 'Florida', url: 'http://myfloridalegal.com/__85257B7B0070E767.nsf/RSS/News?OpenAgent' },
  { state: 'IL', name: 'Illinois', url: 'https://illinoisattorneygeneral.gov/Press/news.rss' },
  { state: 'PA', name: 'Pennsylvania', url: 'https://www.attorneygeneral.gov/feed/' },
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
          Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.5, */*;q=0.3',
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
  const cacheFile = path.join(CACHE_DIR, `mfcu_${state.toLowerCase()}.xml`);
  // Use cache if < 6h old.
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      console.log(`  [cache] ${state} using cached feed (age ${Math.round((Date.now() - stat.mtimeMs) / 60000)} min)`);
      return { body: fs.readFileSync(cacheFile, 'utf8'), contentType: 'cached', fromCache: true };
    }
  }
  const res = await fetchWithRetry(url);
  fs.writeFileSync(cacheFile, res.body);
  return { ...res, fromCache: false };
}

// ---------------------------------------------------------------------------
// XML / HTML parsing
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

function stripHtml(s) {
  if (!s) return '';
  return decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  let val = m[1];
  const cd = val.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cd) val = cd[1];
  return val.trim();
}

/**
 * Best-effort RSS / Atom parser. Returns [] if the body is clearly not a feed.
 */
function parseFeed(xml) {
  if (!xml) return [];
  // RSS 2.0 <item> blocks.
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      title: stripHtml(extractTag(block, 'title')),
      link: stripHtml(extractTag(block, 'link')),
      pubDate: stripHtml(extractTag(block, 'pubDate')) || stripHtml(extractTag(block, 'dc:date')),
      description: extractTag(block, 'description'),
      contentEncoded: extractTag(block, 'content:encoded'),
      guid: stripHtml(extractTag(block, 'guid')),
    });
  }
  if (items.length) return items;

  // Atom <entry> blocks fallback.
  const entryRe = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    // Atom <link href="..."/> is a self-closing tag.
    let link = '';
    const linkM = block.match(/<link[^>]*href="([^"]+)"/i);
    if (linkM) link = linkM[1];
    items.push({
      title: stripHtml(extractTag(block, 'title')),
      link,
      pubDate: stripHtml(extractTag(block, 'updated')) || stripHtml(extractTag(block, 'published')),
      description: extractTag(block, 'summary') || extractTag(block, 'content'),
      contentEncoded: '',
      guid: stripHtml(extractTag(block, 'id')),
    });
  }
  return items;
}

function looksLikeFeed(body) {
  if (!body) return false;
  const head = body.slice(0, 4000).toLowerCase();
  return head.includes('<rss') || head.includes('<feed') || head.includes('<channel') || /<item[\s>]/i.test(head);
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
  let totalRssItems = 0;
  let hospiceFiltered = 0;
  let matchedCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  const actions = [];
  const itemsByCcn = {};

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

    if (!looksLikeFeed(res.body)) {
      console.warn(`  ! ${feed.state} response is not RSS/Atom (content-type=${res.contentType}); skipping`);
      statesFailed.push({ state: feed.state, reason: `not RSS/Atom (content-type=${res.contentType})` });
      continue;
    }

    const items = parseFeed(res.body);
    if (!items.length) {
      console.warn(`  ! ${feed.state} parsed 0 items from feed; skipping`);
      statesFailed.push({ state: feed.state, reason: 'parsed 0 items' });
      continue;
    }
    console.log(`  pulled ${items.length} items from feed`);
    totalRssItems += items.length;
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
      'Best-effort scrape of state AG press-release RSS feeds for the 6 highest-volume Medicaid fraud states (CA, TX, NY, FL, IL, PA). No unified MFCU feed exists. State-specific feeds may break or change format; failures are logged and skipped, not fatal. Defamation guardrail: only items with a high- or medium-confidence match to a hospice in the AG\'s own state are emitted.',
    states_attempted: statesAttempted,
    states_succeeded: statesSucceeded,
    states_failed: statesFailed,
    total_rss_items_pulled: totalRssItems,
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
  console.log(`  RSS items pulled:     ${totalRssItems}`);
  console.log(`  hospice-filtered:     ${hospiceFiltered}`);
  console.log(`  matched to CCN:       ${matchedCount} (high=${highCount}, medium=${mediumCount})`);
  console.log(`  unique CCNs touched:  ${Object.keys(itemsByCcn).length}`);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
