// Build a news aggregation feed for hospice mentions across major health-news RSS sources.
//
// Pipeline:
//   1. Fetch RSS XML from Hospice News, KFF Health News, ProPublica (Node stdlib https).
//   2. Parse <item> elements with regex (title, link, pubDate, description, content:encoded).
//   3. Keyword-filter to hospice-relevant items.
//   4. For each filtered item, scan title + body for matches against the 6,943 Medicare-certified
//      hospice provider list (public/data/hospice/index.json) using exact + fuzzy name matching.
//   5. Require state context for confidence; score (high/medium/low). Drop low.
//   6. Write structured JSON to public/data/hospice/news-feed.json.
//
// Defamation guard: summaries are factual extracts (RSS description / first paragraph), never
// allegations or editorial. All items link back to the original article.
//
// Run:
//   node scripts/build-hospice-news-feed.js
//
// No new npm dependencies — uses only Node stdlib.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { URL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOSPICE_INDEX = join(__dirname, '..', 'public', 'data', 'hospice', 'index.json');
const OUT_FILE = join(__dirname, '..', 'public', 'data', 'hospice', 'news-feed.json');

const SOURCES = [
  { name: 'Hospice News', url: 'https://hospicenews.com/feed/' },
  { name: 'KFF Health News', url: 'https://kffhealthnews.org/feed/' },
  { name: 'ProPublica', url: 'https://www.propublica.org/feeds/propublica/main' },
];

// Broad keyword filter — better to over-include and let downstream matching trim.
const HOSPICE_KEYWORDS = [
  'hospice',
  'palliative care',
  'end-of-life care',
  'end of life care',
  'terminally ill',
];
// Companion keyword (e.g., "False Claims" alone is too noisy, but with hospice context — match).
const FRAUD_KEYWORDS = [
  'false claims',
  'medicare fraud',
  'qui tam',
  'whistleblower',
  'medicaid fraud',
];

// Two-letter US state codes + full names for state-context detection in article body.
const US_STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico',
};

// Corporate suffixes / generic words to strip when normalizing names.
// Note: tokens are matched after splitting on whitespace, so multi-word entries are no-ops here.
const STRIP_TOKENS = [
  'llc', 'inc', 'inc.', 'l.l.c.', 'l.p.', 'lp', 'corp', 'corporation', 'co', 'co.',
  'hospice', 'palliative', 'health', 'healthcare', 'services', 'service',
  'and', 'care', 'group',
  'of', 'the', 'a', 'an',
];

// Generic name fragments that are too common to match alone — drop unless paired with state.
const TOO_GENERIC = new Set([
  'community', 'compassionate', 'caring', 'gentle', 'serenity', 'angels',
  'family', 'home', 'comfort', 'peace', 'mercy', 'grace', 'hope',
  'first', 'best', 'good', 'new', 'st', 'saint', 'holy',
  // Geographic/qualifier words common in articles but generic for matching
  'california', 'texas', 'florida', 'arizona', 'nevada', 'oregon', 'washington',
  'national', 'federal', 'american', 'united', 'west', 'east', 'north', 'south',
  'west coast', 'east coast', 'midwest', 'southwest', 'northwest', 'northeast', 'southeast',
  'integrity', 'alliance', 'devoted', 'statewide', 'effort', 'angel', 'angel hands',
  'pathways', 'lumina', 'hollywood', 'direct', 'ability', 'elevate', 'generations',
]);

// =====================================================================================
// HTTP fetch (with redirect handling, simple)
// =====================================================================================
function fetchUrl(urlStr, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'OversightReports-NewsFeed/1.0 (contact: oversightreports.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      timeout: 30000,
    };
    const req = https.request(opts, (res) => {
      // follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        const next = new URL(res.headers.location, urlStr).toString();
        res.resume();
        return resolve(fetchUrl(next, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error(`timeout ${urlStr}`)); });
    req.end();
  });
}

// =====================================================================================
// RSS parsing — regex extraction of <item>...</item> blocks; CDATA aware.
// =====================================================================================
function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function stripHtml(s) {
  if (!s) return '';
  return decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractTag(block, tag) {
  // handle <tag>...</tag> or <tag><![CDATA[...]]></tag>
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  let val = m[1];
  const cd = val.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cd) val = cd[1];
  return val.trim();
}

function parseRSS(xml) {
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = stripHtml(extractTag(block, 'title'));
    const link = stripHtml(extractTag(block, 'link'));
    const pubDate = stripHtml(extractTag(block, 'pubDate'));
    const description = extractTag(block, 'description');
    const contentEncoded = extractTag(block, 'content:encoded');
    const guid = stripHtml(extractTag(block, 'guid'));
    items.push({
      title,
      link,
      pubDate,
      description,
      contentEncoded,
      guid,
      // pre-computed plain-text body for matching
      bodyText: stripHtml(contentEncoded || description || ''),
      descriptionText: stripHtml(description || ''),
    });
  }
  return items;
}

function parseDateSafe(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// =====================================================================================
// Hospice keyword filter
// =====================================================================================
function isHospiceRelevant(item) {
  const hay = (item.title + ' ' + item.bodyText).toLowerCase();
  if (HOSPICE_KEYWORDS.some((k) => hay.includes(k))) return true;
  // fraud keyword + hospice context (in case the article mentions "hospice" elsewhere weakly)
  // Already covered by hospice match above; only matters if "hospice" appears in body.
  // Treat ANY hospice mention as in-scope.
  return false;
}

// =====================================================================================
// Provider name normalization + matching
// =====================================================================================
function normalize(name) {
  if (!name) return '';
  let n = name.toLowerCase();
  // Strip punctuation except internal letters/digits/spaces
  n = n.replace(/[‘’'`]/g, '');
  n = n.replace(/[^a-z0-9\s\-]/g, ' ');
  n = n.replace(/-/g, ' ');
  // Tokenize, drop suffix tokens
  const tokens = n.split(/\s+/).filter(Boolean);
  const kept = tokens.filter((t) => !STRIP_TOKENS.includes(t));
  return kept.join(' ').trim();
}

// Levenshtein distance (iterative DP, classic)
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Check if normalized provider name is "too generic" (single very common word)
function isTooGeneric(normName) {
  const tokens = normName.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  if (tokens.length === 1 && (tokens[0].length < 4 || TOO_GENERIC.has(tokens[0]))) return true;
  return false;
}

// =====================================================================================
// Match an article to providers
// =====================================================================================
function detectStatesInBody(text) {
  const found = new Set();
  const hay = ' ' + text + ' ';
  const hayLower = hay.toLowerCase();
  for (const [code, name] of Object.entries(US_STATES)) {
    // Full state name (case-insensitive, word-bounded)
    const re = new RegExp(`\\b${name.replace(/ /g, '\\s+')}\\b`, 'i');
    if (re.test(hay)) { found.add(code); continue; }
    // Two-letter code with comma context (", TX " or ", TX.") — case-sensitive uppercase
    const codeRe = new RegExp(`,\\s*${code}[\\s.,]`);
    if (codeRe.test(hay)) found.add(code);
  }
  return found;
}

function matchProviders(item, providers, providersByNorm) {
  const fullText = item.title + '. ' + item.bodyText;
  const states = detectStatesInBody(fullText);

  // Strategy: candidate provider names must appear as PROPER-NOUN PHRASES in the original text
  // (capitalized as they would be when an org is named). This eliminates generic phrase noise like
  // "California hospice corporation" being matched to "California Hospice Corp."
  //
  // Step 1: extract all capitalized phrases from the article (potential org names).
  // Step 2: normalize each phrase, keep only ones that contain the word "hospice" or "palliative".
  // Step 3: match these normalized capitalized phrases against normalized provider names.
  // Step 4: require state context for any match (high confidence) — otherwise drop.

  const candidates = new Map(); // ccn -> { ccn, confidence, score, method }

  const phrases = extractCapitalizedPhrases(fullText);
  // Keep only phrases that look like a hospice org name (mention "Hospice" or "Palliative" with capital).
  const orgPhrases = phrases.filter((ph) => /\b(Hospice|Palliative)\b/.test(ph));
  if (orgPhrases.length === 0) return [];

  const normPhrases = orgPhrases
    .map((ph) => ({ raw: ph, norm: normalize(ph) }))
    .filter((p) => p.norm.length >= 5 && !isTooGeneric(p.norm));

  if (normPhrases.length === 0) return [];

  // Build a quick lookup: normalized provider name -> [providers]
  // Already in providersByNorm.

  // === Pass 1: exact normalized match between article phrase and provider normalized name ===
  // Require state context — exact normalized matches without geographic confirmation are too noisy
  // for generic brand names that recur across states (e.g., "Guiding Light Hospice" exists in
  // multiple states). State context is the disambiguator.
  for (const ph of normPhrases) {
    const exact = providersByNorm.get(ph.norm);
    if (!exact) continue;
    for (const p of exact) {
      if (isTooGeneric(p._normName)) continue;
      const inState = states.has(p.state);
      // Allow no-state-context match only for distinctive 3+ token names
      const tokenCount = p._normName.split(/\s+/).length;
      if (!inState && tokenCount < 3) continue;
      const score = inState ? 100 : 70;
      const conf = inState ? 'high' : 'medium';
      const prev = candidates.get(p.ccn);
      if (!prev || prev.score < score) {
        candidates.set(p.ccn, { ccn: p.ccn, confidence: conf, score, method: 'exact-norm' });
      }
    }
  }

  // === Pass 2: phrase contains the full normalized provider name as a substring ===
  // (e.g., article says "Compassus of Charleston Hospice and Palliative Care" — the normalized
  // provider name "compassus charleston" should appear within the normalized phrase.)
  const phraseHay = ' ' + normPhrases.map((p) => p.norm).join(' | ') + ' ';
  for (const p of providers) {
    if (candidates.has(p.ccn)) continue;
    if (!p._normName || p._normName.length < 8) continue; // require longer names for substring
    if (isTooGeneric(p._normName)) continue;
    if (p._normName.split(/\s+/).length < 2) continue;
    const needle = ' ' + p._normName + ' ';
    if (phraseHay.includes(needle)) {
      const inState = states.has(p.state);
      if (!inState) continue; // substring matches require state context
      candidates.set(p.ccn, { ccn: p.ccn, confidence: 'high', score: 90, method: 'substring-norm' });
    }
  }

  // === Pass 3: fuzzy match — only within states detected in the article ===
  if (states.size > 0 && states.size <= 5) {
    const stateProviders = providers.filter((p) => states.has(p.state));
    for (const p of stateProviders) {
      if (candidates.has(p.ccn)) continue;
      if (!p._normName || p._normName.length < 8) continue;
      if (isTooGeneric(p._normName)) continue;
      const pTokens = p._normName.split(/\s+/);
      if (pTokens.length < 2) continue;
      const brand = pTokens[0];
      if (brand.length < 5 || TOO_GENERIC.has(brand)) continue;
      for (const ph of normPhrases) {
        // require shared distinctive brand token
        if (!ph.norm.split(/\s+/).includes(brand)) continue;
        const dist = levenshtein(ph.norm, p._normName);
        const maxLen = Math.max(ph.norm.length, p._normName.length);
        const ratio = 1 - dist / maxLen;
        if (ratio >= 0.85) {
          candidates.set(p.ccn, { ccn: p.ccn, confidence: 'medium', score: 75, method: 'fuzzy' });
          break;
        }
      }
    }
  }

  return Array.from(candidates.values());
}

// Extract sequences of capitalized words (potential proper nouns / org names).
function extractCapitalizedPhrases(text) {
  if (!text) return [];
  const phrases = [];
  // Match runs of Capitalized tokens, possibly with hyphens / lowercase connectors (of, the, and, &)
  const re = /\b([A-Z][A-Za-z0-9&'.-]+(?:\s+(?:of|the|and|&|at|in|de|for)\s+[A-Z][A-Za-z0-9&'.-]+|\s+[A-Z][A-Za-z0-9&'.-]+){0,5})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1].length >= 6) phrases.push(m[1]);
  }
  return phrases;
}

// =====================================================================================
// Main
// =====================================================================================
async function main() {
  console.log('Loading hospice provider index...');
  const providers = JSON.parse(readFileSync(HOSPICE_INDEX, 'utf8'));
  console.log(`Loaded ${providers.length} providers.`);

  // Pre-compute normalized + lowercase forms once.
  for (const p of providers) {
    p._lcName = (p.name || '').toLowerCase().trim();
    p._normName = normalize(p.name || '');
  }
  const providersByNorm = new Map();
  for (const p of providers) {
    if (p._normName) {
      if (!providersByNorm.has(p._normName)) providersByNorm.set(p._normName, []);
      providersByNorm.get(p._normName).push(p);
    }
  }

  const sources = [];
  const allItems = []; // { source, sourceUrl, title, link, pubDate, bodyText, ... }

  for (const src of SOURCES) {
    console.log(`\nFetching ${src.name} — ${src.url}`);
    let items = [];
    let err = null;
    try {
      const xml = await fetchUrl(src.url);
      items = parseRSS(xml);
      console.log(`  Got ${items.length} items.`);
    } catch (e) {
      err = e.message;
      console.error(`  ERROR: ${e.message}`);
    }
    let lastPub = null;
    for (const it of items) {
      const iso = parseDateSafe(it.pubDate);
      if (iso && (!lastPub || iso > lastPub)) lastPub = iso;
      allItems.push({ ...it, _source: src.name, _sourceUrl: src.url, _isoDate: iso });
    }
    sources.push({
      name: src.name,
      url: src.url,
      items_pulled: items.length,
      last_pubdate: lastPub,
      error: err,
    });
  }

  console.log(`\nTotal items pulled: ${allItems.length}`);

  // Hospice keyword filter
  const filtered = allItems.filter(isHospiceRelevant);
  console.log(`Hospice-filtered: ${filtered.length}`);

  // Provider matching
  const feedItems = [];
  const itemsByCcn = {};
  let highCount = 0, mediumCount = 0;

  for (const it of filtered) {
    const matches = matchProviders(it, providers, providersByNorm);
    if (matches.length === 0) {
      // Still include unmatched hospice-relevant items in the national feed (no CCN tags).
      feedItems.push(buildFeedItem(it, [], 'none'));
      continue;
    }
    // Pick best confidence label (high beats medium)
    const conf = matches.some((m) => m.confidence === 'high') ? 'high' : 'medium';
    if (conf === 'high') highCount++;
    else mediumCount++;
    const ccns = matches.map((m) => m.ccn);
    if (process.env.DEBUG_MATCH) {
      console.log('  >>', it.title);
      for (const mm of matches) console.log('      ', mm.ccn, mm.method, mm.confidence, mm.score);
    }
    const fi = buildFeedItem(it, ccns, conf);
    // Persist match method only when DEBUG_MATCH is on; keep production output clean.
    if (process.env.DEBUG_MATCH) fi.match_methods = matches.map((m) => ({ ccn: m.ccn, method: m.method }));
    feedItems.push(fi);
    for (const ccn of ccns) {
      if (!itemsByCcn[ccn]) itemsByCcn[ccn] = [];
      itemsByCcn[ccn].push({
        id: fi.id,
        date: fi.date,
        headline: fi.headline,
        source: fi.source,
        url: fi.url,
        summary: fi.summary,
      });
    }
  }

  // Sort: feedItems by date desc; itemsByCcn lists by date desc.
  feedItems.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  for (const ccn of Object.keys(itemsByCcn)) {
    itemsByCcn[ccn].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  const matchedCcnCount = Object.keys(itemsByCcn).length;
  const matchedItemCount = feedItems.filter((fi) => fi.matched_ccns.length > 0).length;

  const out = {
    generated_at: new Date().toISOString(),
    sources,
    total_items_pulled: allItems.length,
    hospice_filtered: filtered.length,
    matched_to_ccn: matchedItemCount,
    matched_unique_ccns: matchedCcnCount,
    confidence_breakdown: {
      high: highCount,
      medium: mediumCount,
    },
    feed_items: feedItems,
    items_by_ccn: itemsByCcn,
  };

  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`  feed_items: ${feedItems.length}`);
  console.log(`  matched_items: ${matchedItemCount} (high: ${highCount}, medium: ${mediumCount})`);
  console.log(`  unique CCNs touched: ${matchedCcnCount}`);
}

function buildFeedItem(it, ccns, conf) {
  const idHash = hashCode(it.link || it.guid || it.title);
  const slugSource = (it._source || 'src').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const summary = buildSummary(it);
  return {
    id: `${slugSource}-${idHash}`,
    source: it._source,
    source_url: it._sourceUrl,
    date: it._isoDate,
    headline: it.title,
    summary,
    url: it.link,
    matched_ccns: ccns,
    match_confidence: conf,
  };
}

// Factual extract for summary — RSS description (first 280 chars), or first paragraph of body.
function buildSummary(it) {
  let s = (it.descriptionText || '').trim();
  if (!s) s = (it.bodyText || '').trim();
  if (!s) return '';
  // Take the first sentence or two, capped at ~280 chars.
  if (s.length > 280) {
    s = s.slice(0, 280);
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > 200) s = s.slice(0, lastSpace) + '...';
    else s = s + '...';
  }
  return s;
}

function hashCode(s) {
  if (!s) return '0';
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
