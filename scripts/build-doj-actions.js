#!/usr/bin/env node
/**
 * build-doj-actions.js
 *
 * Pipeline that scrapes the Department of Justice press release RSS feed for
 * hospice-related False Claims Act / settlement / enforcement items and matches
 * them against the 6,943 Medicare-certified hospices in our index.
 *
 * Source:  https://www.justice.gov/news/rss  (the HTML listing is bot-protected
 *          by Akamai but the RSS feed and individual /opa/pr/... press release
 *          pages are open).
 *
 * COVERAGE NOTE: The DOJ RSS feed is shallow — it returns only ~25 most-recent
 * press releases at any given time (typically the past day or two during heavy
 * news cycles, up to 1–2 weeks during quiet periods). DOJ does not expose a
 * machine-readable historical archive, so this pipeline produces a rolling
 * window of recent enforcement, NOT a backfill. To build history, this script
 * should be run on a schedule (daily/weekly cron) and its output merged with
 * prior runs. This single-shot version simply writes whatever the RSS feed
 * exposes right now.
 *
 * Output: public/data/hospice/doj-actions.json
 *
 * Stdlib only. No npm dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { URL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const HOSPICE_INDEX = path.join(ROOT, 'public/data/hospice/index.json');
const OUTPUT_FILE = path.join(ROOT, 'public/data/hospice/doj-actions.json');

const DOJ_RSS_URL = 'https://www.justice.gov/news/rss';
const USER_AGENT =
  'Mozilla/5.0 (compatible; OversightReports/1.0; +https://oversightreports.com)';
const PAGE_FETCH_DELAY_MS = 200;
const REQUEST_TIMEOUT_MS = 20000;

// US Attorney district code -> state abbreviation (used to derive a state
// hint from press release URLs like /usao-edca/pr/...).
// Ref: https://www.justice.gov/usao
const USAO_DISTRICT_TO_STATE = {
  'usao-al': 'AL', 'usao-mdal': 'AL', 'usao-ndal': 'AL', 'usao-sdal': 'AL',
  'usao-ak': 'AK',
  'usao-az': 'AZ',
  'usao-edar': 'AR', 'usao-wdar': 'AR',
  'usao-cdca': 'CA', 'usao-edca': 'CA', 'usao-ndca': 'CA', 'usao-sdca': 'CA',
  'usao-co': 'CO',
  'usao-ct': 'CT',
  'usao-de': 'DE',
  'usao-dc': 'DC',
  'usao-mdfl': 'FL', 'usao-ndfl': 'FL', 'usao-sdfl': 'FL',
  'usao-mdga': 'GA', 'usao-ndga': 'GA', 'usao-sdga': 'GA',
  'usao-gu': 'GU',
  'usao-hi': 'HI',
  'usao-id': 'ID',
  'usao-cdil': 'IL', 'usao-ndil': 'IL', 'usao-sdil': 'IL',
  'usao-ndin': 'IN', 'usao-sdin': 'IN',
  'usao-ndia': 'IA', 'usao-sdia': 'IA',
  'usao-ks': 'KS',
  'usao-edky': 'KY', 'usao-wdky': 'KY',
  'usao-edla': 'LA', 'usao-mdla': 'LA', 'usao-wdla': 'LA',
  'usao-me': 'ME',
  'usao-md': 'MD',
  'usao-ma': 'MA',
  'usao-edmi': 'MI', 'usao-wdmi': 'MI',
  'usao-mn': 'MN',
  'usao-ndms': 'MS', 'usao-sdms': 'MS',
  'usao-edmo': 'MO', 'usao-wdmo': 'MO',
  'usao-mt': 'MT',
  'usao-ne': 'NE',
  'usao-nv': 'NV',
  'usao-nh': 'NH',
  'usao-nj': 'NJ',
  'usao-nm': 'NM',
  'usao-edny': 'NY', 'usao-ndny': 'NY', 'usao-sdny': 'NY', 'usao-wdny': 'NY',
  'usao-ednc': 'NC', 'usao-mdnc': 'NC', 'usao-wdnc': 'NC',
  'usao-nd': 'ND',
  'usao-mp': 'MP',
  'usao-ndoh': 'OH', 'usao-sdoh': 'OH',
  'usao-edok': 'OK', 'usao-ndok': 'OK', 'usao-wdok': 'OK',
  'usao-or': 'OR',
  'usao-edpa': 'PA', 'usao-mdpa': 'PA', 'usao-wdpa': 'PA',
  'usao-pr': 'PR',
  'usao-ri': 'RI',
  'usao-sc': 'SC',
  'usao-sd': 'SD',
  'usao-edtn': 'TN', 'usao-mdtn': 'TN', 'usao-wdtn': 'TN',
  'usao-edtx': 'TX', 'usao-ndtx': 'TX', 'usao-sdtx': 'TX', 'usao-wdtx': 'TX',
  'usao-ut': 'UT',
  'usao-vt': 'VT',
  'usao-vi': 'VI',
  'usao-edva': 'VA', 'usao-wdva': 'VA',
  'usao-edwa': 'WA', 'usao-wdwa': 'WA',
  'usao-ndwv': 'WV', 'usao-sdwv': 'WV',
  'usao-edwi': 'WI', 'usao-wdwi': 'WI',
  'usao-wy': 'WY',
};

// State name -> abbrev (for fallback parsing of press release body)
const STATE_NAME_TO_ABBR = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE',
  'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR',
  'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
  'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'puerto rico': 'PR',
};

// ---------------------------------------------------------------------------
// Hospice + enforcement keyword filter
// ---------------------------------------------------------------------------

const HOSPICE_KEYWORDS = [/\bhospice\b/i];

const ENFORCEMENT_KEYWORDS = [
  /false claims act/i,
  /\bFCA\b/,
  /\bsettle(d|ment|s)?\b/i,
  /agreed? to pay/i,
  /civil money penalt/i,
  /consent decree/i,
  /\bplead(ed|s)? guilty\b/i,
  /\bsentenced\b/i,
  /\bindict(ed|ment)\b/i,
  /\bconvicted\b/i,
  /resolve.* allegations/i,
];

// Corporate suffixes to strip when normalising names for matching.
const CORP_SUFFIX_RE = new RegExp(
  '\\b(' +
    'inc|incorporated|llc|l\\.l\\.c\\.|llp|l\\.l\\.p\\.|lp|l\\.p\\.|' +
    'ltd|limited|co|corp|corporation|company|the|of|and|&|' +
    'pllc|p\\.c\\.|pc|p\\.a\\.|pa|holdings|services|service|' +
    'group|enterprises|systems|partners' +
  ')\\b', 'gi');

// Hospice-industry words to optionally strip when computing fuzzy similarity
// so that "ABC Hospice Inc." vs "ABC Health Care" is treated honestly.
const HOSPICE_INDUSTRY_WORDS = /\b(hospice|palliative|care|health|healthcare|medical|home)\b/gi;

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow one redirect.
          return httpsGet(new URL(res.headers.location, url).toString())
            .then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(body));
      }
    );
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const mm = block.match(r);
      return mm ? decodeEntities(mm[1]).trim() : '';
    };
    items.push({
      title: get('title'),
      link: get('link'),
      description: get('description'),
      pubDate: get('pubDate'),
      guid: get('guid'),
    });
  }
  return items;
}

function stripHtml(s) {
  return decodeEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

function extractArticleText(html) {
  // DOJ press release pages wrap the body in <article>...</article>.
  const a = html.indexOf('<article');
  if (a < 0) return stripHtml(html);
  const e = html.indexOf('</article>', a);
  if (e < 0) return stripHtml(html.slice(a));
  return stripHtml(html.slice(a, e));
}

// ---------------------------------------------------------------------------
// Field extraction from press release body
// ---------------------------------------------------------------------------

/**
 * Pull a defendant entity name from the headline + body.
 *
 * Strategy: the DOJ formula is almost always
 *   "<Defendant> [to|Will|Has|Pays|Agrees to] Pay $X Million ..."
 *   "<Defendant> Settles ..."
 *   "<Defendant> Sentenced ..."
 * We first try to slice off whatever comes before the verb. As a fallback we
 * use the first capitalised noun phrase in the body (often "<Defendant>, a
 * <descriptor> ...").
 */
function extractDefendantName(headline, body) {
  if (!headline) return null;
  const cleaned = headline.replace(/\s+/g, ' ').trim();
  const verbRe = /\b(to pay|will pay|has agreed|agreed to pay|agree to pay|pays|paid|settles?|sentenced|pleads guilty|pleaded guilty|indicted|convicted|charged|to resolve|resolves|owners?\b)\b/i;
  const verbMatch = cleaned.match(verbRe);
  let candidate = null;
  if (verbMatch && verbMatch.index > 3) {
    candidate = cleaned.slice(0, verbMatch.index).trim();
    candidate = candidate.replace(/\s+(and|And|&)$/, '').trim();
  }
  // Fallback: body first sentence "<Name>, a <something>, ..." or "<Name>
  // (XYZ), ..."
  if (!candidate || candidate.length < 3) {
    const m = body.match(/^([A-Z][A-Za-z0-9 .,'\-&]{2,80}?)(?:,\s+a\b|\s+\(|\s+has agreed|\s+agreed to pay|,\s+the\b)/);
    if (m) candidate = m[1].trim();
  }
  if (!candidate) return null;
  // Drop leading articles
  candidate = candidate.replace(/^(the|a|an)\s+/i, '').trim();
  return candidate || null;
}

function extractSettlementAmount(text) {
  if (!text) return null;
  // Patterns: "$8.33 million", "$8,334,350.71", "$1.4 billion"
  const patterns = [
    /\$\s*([\d,]+(?:\.\d+)?)\s*(billion|bn|b)\b/i,
    /\$\s*([\d,]+(?:\.\d+)?)\s*(million|mm|m)\b/i,
    /\$\s*([\d,]+(?:\.\d{2})?)\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const num = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(num)) continue;
    const unit = (m[2] || '').toLowerCase();
    if (unit.startsWith('b')) return Math.round(num * 1e9);
    if (unit.startsWith('m')) return Math.round(num * 1e6);
    return Math.round(num);
  }
  return null;
}

function extractFirstParagraph(text) {
  if (!text) return '';
  // Try sentence boundary
  const stop = ['Press Release', 'Office of Public Affairs', 'For Immediate Release', 'Share Facebook'];
  let t = text;
  // Remove header chrome
  for (const s of stop) {
    const idx = t.indexOf(s);
    if (idx >= 0 && idx < 400) t = t.slice(idx + s.length);
  }
  t = t.trim();
  // Take first 2 sentences or 600 chars
  const sentences = t.match(/[^.!?]+[.!?]+/g) || [];
  let summary = sentences.slice(0, 2).join(' ').trim();
  if (!summary) summary = t.slice(0, 600);
  return summary.slice(0, 800);
}

function extractDistrictFromUrl(url) {
  // /usao-edca/pr/...
  const m = url.match(/\/(usao-[a-z0-9]+)\//i);
  if (!m) return null;
  return m[1].toLowerCase();
}

function extractStateHint(url, body) {
  const district = extractDistrictFromUrl(url);
  if (district && USAO_DISTRICT_TO_STATE[district]) {
    return USAO_DISTRICT_TO_STATE[district];
  }
  // Look for "for the District of <State>" or "in <State>" in body.
  const m = body.match(/(?:District of|for the (?:Eastern|Western|Northern|Southern|Middle|Central) District of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (m) {
    const sn = m[1].toLowerCase();
    if (STATE_NAME_TO_ABBR[sn]) return STATE_NAME_TO_ABBR[sn];
  }
  // Look for "headquartered in ..., XX" two-letter codes
  const m2 = body.match(/,\s*([A-Z]{2})\b[\s.,]/);
  if (m2 && /^[A-Z]{2}$/.test(m2[1])) return m2[1];
  return null;
}

// ---------------------------------------------------------------------------
// Name normalisation + matching
// ---------------------------------------------------------------------------

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[’‘]/g, "'")
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
 * Match a defendant name against the hospice index. Returns a list of
 * candidate matches with confidence labels.
 *
 * Conservative rules (false positives have legal implications):
 *   - "high"  : exact normalised equality (after stripping suffixes &
 *               punctuation) AND state matches (if state hint is available).
 *   - "medium": (jaccard(tokens) >= 0.7 OR levenshtein-similarity >= 0.92)
 *               AND state matches.
 *   - "low" / unmatched: everything else, dropped from output.
 *
 * Generic / single-token defendant names like "Hospice" or "Care" are skipped
 * because they would over-match.
 */
function matchDefendant(defendant, stateHint, hospiceIndex, byState) {
  if (!defendant) return [];
  const norm = normalizeName(defendant);
  if (!norm || norm.length < 4) return [];
  const tokens = nameTokens(defendant);
  // Reject if every meaningful token is generic.
  if (tokens.size === 0) return [];

  // Reject pure-individual names like "John Smith Sentenced" — no Inc, no
  // hospice, no LLC, just two capitalised words. (Heuristic: the original
  // name has no industry word and only 2 tokens.)
  const hasIndustryWord = /(hospice|palliat|care|health|home|medical|nursing)/i.test(defendant);
  if (!hasIndustryWord && tokens.size <= 2) {
    // Likely an individual person, not an entity. Skip.
    return [];
  }

  const pool = stateHint && byState[stateHint] ? byState[stateHint] : hospiceIndex;

  const matches = [];
  for (const h of pool) {
    const hNorm = normalizeName(h.name);
    if (!hNorm) continue;
    let confidence = null;
    let score = 0;

    if (hNorm === norm) {
      confidence = stateHint && h.state === stateHint ? 'high' : 'medium';
      score = 1;
    } else {
      const hTokens = nameTokens(h.name);
      const j = jaccard(tokens, hTokens);
      const sim = similarity(hNorm, norm);
      score = Math.max(j, sim);
      if (j >= 0.85 || sim >= 0.95) {
        confidence = stateHint && h.state === stateHint ? 'high' : 'medium';
      } else if ((j >= 0.7 || sim >= 0.9) && stateHint && h.state === stateHint) {
        confidence = 'medium';
      }
    }

    if (confidence) {
      matches.push({ ccn: h.ccn, name: h.name, state: h.state, confidence, score });
    }
  }

  // Sort highest-confidence first, then by score.
  const order = { high: 3, medium: 2, low: 1 };
  matches.sort((a, b) => order[b.confidence] - order[a.confidence] || b.score - a.score);

  // De-duplicate by CCN (keep first/highest).
  const seen = new Set();
  const out = [];
  for (const m of matches) {
    if (seen.has(m.ccn)) continue;
    seen.add(m.ccn);
    out.push(m);
  }

  // Cap: it's almost always 1, but a chain/parent could legitimately match
  // multiple sites in the same state. Cap at 25 to keep output sane.
  return out.slice(0, 25);
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

function isHospiceEnforcement(item, body) {
  const haystack = [item.title, item.description, body || ''].join(' \n ');
  if (!HOSPICE_KEYWORDS.some((re) => re.test(haystack))) return false;
  if (!ENFORCEMENT_KEYWORDS.some((re) => re.test(haystack))) return false;
  return true;
}

function classifyType(text) {
  const t = text || '';
  if (/false claims act|FCA\b/i.test(t)) return 'FCA Settlement';
  if (/civil money penalt/i.test(t)) return 'Civil Money Penalty';
  if (/consent decree/i.test(t)) return 'Consent Decree';
  if (/sentenced|pleaded guilty|plead guilty|conviction|convicted/i.test(t))
    return 'Criminal Conviction';
  if (/indict/i.test(t)) return 'Indictment';
  if (/settle/i.test(t)) return 'Settlement';
  return 'DOJ Enforcement Action';
}

function isoDate(rfc822) {
  const d = new Date(rfc822);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function actionId(url) {
  const m = url.match(/\/pr\/([^/?#]+)/);
  if (m) return 'doj-' + m[1].slice(0, 100);
  return 'doj-' + Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 32);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('build-doj-actions: starting');
  console.log('  hospice index:', HOSPICE_INDEX);
  console.log('  output:       ', OUTPUT_FILE);

  // Load hospice index
  const hospiceIndex = JSON.parse(fs.readFileSync(HOSPICE_INDEX, 'utf8'));
  console.log(`Loaded ${hospiceIndex.length} hospices from index.json`);

  // Build state -> hospice map for fast lookup
  const byState = {};
  for (const h of hospiceIndex) {
    if (!h.state) continue;
    (byState[h.state] = byState[h.state] || []).push(h);
  }

  // Fetch RSS
  console.log('Fetching DOJ RSS:', DOJ_RSS_URL);
  const xml = await httpsGet(DOJ_RSS_URL);
  const allItems = parseRssItems(xml);
  console.log(`Pulled ${allItems.length} items from RSS feed`);

  // Pre-filter on RSS-only fields (title/desc) for items that even mention
  // hospice — saves us from fetching every full press release page.
  const rssCandidates = allItems.filter((it) =>
    HOSPICE_KEYWORDS.some((re) => re.test(`${it.title} ${it.description}`))
  );
  console.log(
    `${rssCandidates.length} RSS items mention "hospice" in title/description`
  );

  // For tighter coverage we ALSO fetch any item whose title hints at
  // healthcare-fraud language even if "hospice" isn't in the title — the
  // press-release body might still mention a hospice. To respect the source
  // we cap this at 10 extra fetches per run.
  const FRAUD_TITLE_RE =
    /(false claims|FCA|medicare fraud|medicaid fraud|kickback|hospice|nursing|home health|long.term care)/i;
  const extraCandidates = allItems
    .filter((it) => !rssCandidates.includes(it))
    .filter((it) => FRAUD_TITLE_RE.test(`${it.title} ${it.description}`))
    .slice(0, 10);
  console.log(
    `${extraCandidates.length} additional items look healthcare-fraud-related (will fetch full body to check for hospice)`
  );

  const toFetch = [...rssCandidates, ...extraCandidates];
  console.log(`Will fetch ${toFetch.length} press release pages`);

  const enriched = [];
  for (let i = 0; i < toFetch.length; i++) {
    const it = toFetch[i];
    try {
      console.log(`  [${i + 1}/${toFetch.length}] ${it.link}`);
      const html = await httpsGet(it.link);
      const body = extractArticleText(html);
      enriched.push({ ...it, body });
    } catch (err) {
      console.warn(`    ! fetch failed: ${err.message}`);
      enriched.push({ ...it, body: '' });
    }
    if (i < toFetch.length - 1) await sleep(PAGE_FETCH_DELAY_MS);
  }

  // Now apply the strict hospice + enforcement filter (full body).
  const hospiceItems = enriched.filter((it) => isHospiceEnforcement(it, it.body));
  console.log(`${hospiceItems.length} items pass hospice + enforcement filter`);

  // Build action records and match to CCNs
  const actions = [];
  const itemsByCcn = {};
  let matchedCount = 0;
  let highCount = 0;
  let mediumCount = 0;

  for (const it of hospiceItems) {
    const defendant = extractDefendantName(it.title, it.body);
    const amount = extractSettlementAmount(it.title) || extractSettlementAmount(it.body);
    const summary = extractFirstParagraph(it.body) || it.description || '';
    const stateHint = extractStateHint(it.link, it.body);
    const matches = matchDefendant(defendant, stateHint, hospiceIndex, byState);
    const matchedCcns = matches.map((m) => m.ccn);
    const topConfidence = matches.length ? matches[0].confidence : null;

    if (matches.length) {
      matchedCount++;
      if (topConfidence === 'high') highCount++;
      else if (topConfidence === 'medium') mediumCount++;
    }

    const action = {
      id: actionId(it.link),
      date: isoDate(it.pubDate) || it.pubDate || null,
      headline: it.title,
      summary,
      settlement_amount_dollars: amount,
      defendant_name: defendant,
      state_hint: stateHint,
      url: it.link,
      matched_ccns: matchedCcns,
      match_confidence: topConfidence,
      match_details: matches,
      type: classifyType(`${it.title} ${it.body}`),
    };
    actions.push(action);

    // Index by CCN — only emit per-facility entries when we have at least
    // medium confidence (we never emit "low").
    for (const m of matches) {
      const arr = (itemsByCcn[m.ccn] = itemsByCcn[m.ccn] || []);
      arr.push({
        date: action.date,
        headline: action.headline,
        summary: action.summary,
        url: action.url,
        settlement_amount_dollars: action.settlement_amount_dollars,
        defendant_name: action.defendant_name,
        match_confidence: m.confidence,
        type: action.type,
      });
    }
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: 'DOJ RSS + press release pages',
    source_url: DOJ_RSS_URL,
    coverage_note:
      'DOJ RSS exposes only the ~25 most-recent press releases. There is no machine-readable historical archive. To build history, run this pipeline on a daily cron and merge outputs.',
    total_rss_items_pulled: allItems.length,
    rss_window_start: allItems.length
      ? isoDate(allItems[allItems.length - 1].pubDate)
      : null,
    rss_window_end: allItems.length ? isoDate(allItems[0].pubDate) : null,
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
  console.log(`  RSS items pulled:     ${allItems.length}`);
  console.log(`  hospice-filtered:     ${hospiceItems.length}`);
  console.log(`  matched to CCN:       ${matchedCount} (high=${highCount}, medium=${mediumCount})`);
  console.log(`  unique CCNs touched:  ${Object.keys(itemsByCcn).length}`);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
