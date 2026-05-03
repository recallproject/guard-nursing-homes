import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospice-news.css';

// --- Source files (real aggregated data) ---
const NEWS_FEED_URL = '/data/hospice/news-feed.json';
const DOJ_ACTIONS_URL = '/data/hospice/doj-actions.json';
const OIG_EXCLUSIONS_URL = '/data/hospice/oig-exclusions.json';
const COURTLISTENER_URL = '/data/hospice/courtlistener-actions.json';
const MFCU_URL = '/data/hospice/mfcu-actions.json';

const SOURCE_FILTERS = [
  { key: 'all',   label: 'All' },
  { key: 'doj',   label: 'DOJ' },
  { key: 'ag',    label: 'State AG' },
  { key: 'oig',   label: 'OIG' },
  { key: 'cms',   label: 'CMS' },
  { key: 'court', label: 'Court' },
  { key: 'news',  label: 'News' },
];

const TAG_CLASS = {
  doj: 'hn-tag-doj',
  ag: 'hn-tag-ag',
  oig: 'hn-tag-oig',
  cms: 'hn-tag-cms',
  news: 'hn-tag-news',
  court: 'hn-tag-court',
};

const NEWS_SOURCE_LABELS = new Set(['Hospice News', 'KFF Health News', 'ProPublica']);

// ---------- helpers ----------

function parseDateSafe(s) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatMonthYear(d) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatBucketKey(d) {
  if (!d) return 'unknown';
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const today = startOfDay(now);
  const dayOf = startOfDay(d);
  const diffDays = Math.round((today - dayOf) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays > 1 && diffDays <= 7) return 'thisweek';

  // Earlier in same month as today
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
    return 'earlierMonth:' + now.getFullYear() + '-' + now.getMonth();
  }
  // Group by year-month
  return 'month:' + d.getFullYear() + '-' + d.getMonth();
}

function formatBucketLabel(key, sampleDate) {
  if (key === 'today') return 'Today';
  if (key === 'yesterday') return 'Yesterday';
  if (key === 'thisweek') return 'This week';
  if (key === 'unknown') return 'Date unknown';
  if (key.startsWith('earlierMonth:')) {
    const now = new Date();
    return 'Earlier in ' + now.toLocaleDateString('en-US', { month: 'long' });
  }
  if (key.startsWith('month:') && sampleDate) {
    return formatMonthYear(sampleDate);
  }
  return '';
}

function formatRelativeAgo(then, now) {
  if (!then) return null;
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + ' min ago';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + ' hr ago';
  const diffDay = Math.floor(diffHr / 24);
  return diffDay + ' day' + (diffDay === 1 ? '' : 's') + ' ago';
}

function formatDollarsCompact(n) {
  if (!n || n <= 0) return '$0';
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

// ---------- normalization ----------

function normalizeNewsItems(newsFeed) {
  if (!newsFeed || !Array.isArray(newsFeed.feed_items)) return [];
  return newsFeed.feed_items.map((it) => {
    const isNews = NEWS_SOURCE_LABELS.has(it.source);
    return {
      id: 'news-' + it.id,
      source: isNews ? 'news' : 'news',
      source_label: it.source ? 'News . ' + it.source : 'News',
      date: it.date,
      headline: it.headline,
      summary: it.summary,
      url: it.url,
      matched_ccns: Array.isArray(it.matched_ccns) ? it.matched_ccns : [],
    };
  });
}

function normalizeDojItems(dojActions) {
  if (!dojActions || !Array.isArray(dojActions.actions)) return [];
  return dojActions.actions.map((it) => ({
    id: 'doj-' + it.id,
    source: 'doj',
    source_label: it.type ? 'DOJ . ' + it.type : 'DOJ . Settled',
    date: it.date,
    headline: it.headline,
    summary: it.summary,
    url: it.url,
    matched_ccns: Array.isArray(it.matched_ccns) ? it.matched_ccns : [],
    settlement_amount: typeof it.settlement_amount_dollars === 'number' ? it.settlement_amount_dollars : 0,
  }));
}

function normalizeCourtItems(courtActions) {
  if (!courtActions || !Array.isArray(courtActions.actions)) return [];
  return courtActions.actions.map((it, idx) => ({
    id: 'court-' + (it.docket_url || it.ccn || idx),
    source: 'court',
    source_label: it.court ? 'Court . ' + it.court : 'Court . Federal',
    date: it.date_filed,
    headline: it.case_caption,
    summary: it.summary,
    url: it.docket_url,
    matched_ccns: it.ccn ? [String(it.ccn)] : [],
  }));
}

function normalizeMfcuItems(mfcuActions) {
  if (!mfcuActions || !Array.isArray(mfcuActions.actions)) return [];
  return mfcuActions.actions.map((it, idx) => ({
    id: 'ag-' + (it.source_url || it.ccn || idx),
    source: 'ag',
    source_label: it.ag_state ? 'State AG . ' + it.ag_state : 'State AG',
    date: it.date,
    headline: it.headline,
    summary: it.summary,
    url: it.source_url,
    matched_ccns: it.ccn ? [String(it.ccn)] : [],
  }));
}

function normalizeOigItems(oigData) {
  if (!oigData || !Array.isArray(oigData.unmatched_hospice_relevant_items)) return [];
  return oigData.unmatched_hospice_relevant_items.map((it) => {
    const who = it.individual_name || it.entity_name || 'Excluded party';
    const where = it.address && it.address.state ? ' (' + (it.address.city || '') + (it.address.city ? ', ' : '') + it.address.state + ')' : '';
    const partyType = it.excluded_party_type === 'entity' ? 'entity' : 'individual';
    const headline = 'OIG exclusion: ' + who + where;
    const specialty = [it.provider_general, it.provider_specialty].filter(Boolean).join(' / ');
    const summary = 'The HHS Office of Inspector General excluded this ' + partyType +
      (specialty ? ' (' + specialty + ')' : '') +
      ' from federal program participation under section ' + (it.exclusion_type || 'unspecified') +
      '. NPI: ' + (it.npi && it.npi !== '0000000000' ? it.npi : 'not on file') + '.';
    return {
      id: 'oig-' + it.leie_record_id,
      source: 'oig',
      source_label: 'OIG . Exclusion',
      date: it.exclusion_date,
      headline,
      summary,
      url: 'https://exclusions.oig.hhs.gov/',
      matched_ccns: [],
    };
  });
}

// ---------- component ----------

export default function HospiceNewsPage() {
  const [activeSource, setActiveSource] = useState('all');
  const [items, setItems] = useState([]);
  const [generatedAtMax, setGeneratedAtMax] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const tickRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const cacheBust = '?t=' + Date.now();
      const [newsRes, dojRes, oigRes, courtRes, mfcuRes] = await Promise.all([
        fetch(NEWS_FEED_URL + cacheBust).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(DOJ_ACTIONS_URL + cacheBust).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(OIG_EXCLUSIONS_URL + cacheBust).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(COURTLISTENER_URL + cacheBust).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(MFCU_URL + cacheBust).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const merged = [
        ...normalizeNewsItems(newsRes),
        ...normalizeDojItems(dojRes),
        ...normalizeOigItems(oigRes),
        ...normalizeCourtItems(courtRes),
        ...normalizeMfcuItems(mfcuRes),
      ];

      // Sort by date desc; items missing dates go last
      merged.sort((a, b) => {
        const da = parseDateSafe(a.date);
        const db = parseDateSafe(b.date);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });

      const stamps = [newsRes, dojRes, oigRes, courtRes, mfcuRes]
        .map((x) => (x && x.generated_at ? parseDateSafe(x.generated_at) : null))
        .filter(Boolean);
      const maxStamp = stamps.length ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : null;

      setItems(merged);
      setGeneratedAtMax(maxStamp);
      setErrored(false);
    } catch (e) {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount + on tab refocus. Backend pipelines run daily, so polling
  // mid-session is wasted bandwidth.
  useEffect(() => {
    fetchAll();

    const onVis = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchAll();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    // Update "ago" text every 60s so the freshness label doesn't go stale visually.
    tickRef.current = setInterval(() => setNow(new Date()), 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [fetchAll]);

  // ---------- derived ----------

  const sourceCounts = useMemo(() => {
    const counts = { all: items.length, doj: 0, ag: 0, oig: 0, cms: 0, court: 0, news: 0 };
    for (const it of items) {
      if (counts[it.source] !== undefined) counts[it.source] += 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    if (activeSource === 'all') return items;
    return items.filter((it) => it.source === activeSource);
  }, [items, activeSource]);

  const stats = useMemo(() => {
    const ms7 = 7 * 24 * 60 * 60 * 1000;
    const ms30 = 30 * 24 * 60 * 60 * 1000;
    const ms365 = 365 * 24 * 60 * 60 * 1000;
    const nowTs = Date.now();
    let count7 = 0;
    let count30 = 0;
    let dojSum12 = 0;
    for (const it of items) {
      const d = parseDateSafe(it.date);
      if (!d) continue;
      const age = nowTs - d.getTime();
      if (age <= ms7) count7 += 1;
      if (age <= ms30) count30 += 1;
      if (it.source === 'doj' && age <= ms365 && it.settlement_amount) {
        dojSum12 += it.settlement_amount;
      }
    }
    return { total: items.length, count7, count30, dojSum12 };
  }, [items]);

  // Group filtered items into ordered buckets
  const grouped = useMemo(() => {
    const buckets = new Map(); // key -> { label, items: [] }
    const order = ['today', 'yesterday', 'thisweek'];
    const earlierMonthKeys = [];
    const monthKeys = [];

    for (const it of filtered) {
      const d = parseDateSafe(it.date);
      const key = formatBucketKey(d);
      if (!buckets.has(key)) {
        buckets.set(key, { key, label: formatBucketLabel(key, d), items: [] });
        if (key.startsWith('earlierMonth:') && !earlierMonthKeys.includes(key)) earlierMonthKeys.push(key);
        else if (key.startsWith('month:') && !monthKeys.includes(key)) monthKeys.push(key);
      }
      buckets.get(key).items.push(it);
    }

    // Sort month: keys descending by year-month
    monthKeys.sort((a, b) => {
      const [, ay, am] = a.match(/month:(\d+)-(\d+)/) || [];
      const [, by, bm] = b.match(/month:(\d+)-(\d+)/) || [];
      const av = parseInt(ay, 10) * 12 + parseInt(am, 10);
      const bv = parseInt(by, 10) * 12 + parseInt(bm, 10);
      return bv - av;
    });

    const ordered = [];
    for (const k of order) if (buckets.has(k)) ordered.push(buckets.get(k));
    for (const k of earlierMonthKeys) ordered.push(buckets.get(k));
    for (const k of monthKeys) ordered.push(buckets.get(k));
    if (buckets.has('unknown')) ordered.push(buckets.get('unknown'));
    return ordered;
  }, [filtered]);

  const lastUpdateAgo = formatRelativeAgo(generatedAtMax, now);

  return (
    <>
      <Helmet>
        <title>Hospice Public Record . Live Feed | The Oversight Report</title>
        <meta
          name="description"
          content="Every public-record event involving a U.S. hospice — DOJ settlements, state AG actions, OIG exclusions, CMS deficiencies, federal court filings, and reputable news, dated and sourced."
        />
      </Helmet>

      <div className="hospice-news">
        <div className="crumb">
          <Link to="/">Home</Link>
          <span className="sep">›</span>
          <Link to="/hospice">Hospice</Link>
          <span className="sep">›</span>
          National public-record feed
        </div>

        {/* HERO */}
        <section className="hn-hero">
          <div className="hn-hero-tagline">// hospice public record . national feed</div>
          <h1 className="hn-hero-title">
            Every public-record event involving a hospice, <em>as it happens.</em>
          </h1>
          <p className="hn-hero-sub">
            DOJ settlements, state AG actions, OIG exclusions, CMS deficiency citations, federal court filings, and reputable news coverage —{' '}
            <strong>aggregated from government and journalism sources, sourced and dated, refreshed throughout the day</strong>.
          </p>

          <div className="hn-ticker">
            <div className="hn-ticker-row">
              <span className="hn-ticker-pulse"></span>
              <span className="hn-ticker-live">Live</span>
              <span className="hn-ticker-sep">·</span>
              <span className="hn-ticker-muted">last update</span>
              &nbsp;<span className="hn-ticker-strong">{lastUpdateAgo || (loading ? 'loading...' : 'n/a')}</span>
              <span className="hn-ticker-sep">·</span>
              <span className="hn-ticker-muted">refresh</span>
              &nbsp;<span className="hn-ticker-strong">on tab focus</span>
            </div>
            <span className="hn-ticker-note">
              {errored
                ? 'feed temporarily unavailable . retrying'
                : 'rebuilt daily . ' + items.length + ' item' + (items.length === 1 ? '' : 's')}
            </span>
          </div>
        </section>

        {/* STAT STRIP */}
        <div className="hn-stat-strip">
          <div className="hn-stat-cell">
            <div className="lbl">Items in feed (all-time)</div>
            <div className="val">{stats.total.toLocaleString()}</div>
            <div className="sub">across DOJ, OIG, and reputable news sources</div>
          </div>
          <div className="hn-stat-cell">
            <div className="lbl">Past 7 days</div>
            <div className="val">{stats.count7}</div>
            <div className="sub">new items in the last week</div>
          </div>
          <div className="hn-stat-cell">
            <div className="lbl">Past 30 days</div>
            <div className="val">{stats.count30}</div>
            <div className="sub">rolling 30-day count</div>
          </div>
          <div className="hn-stat-cell">
            <div className="lbl">DOJ FCA dollars (12mo)</div>
            <div className="val">{formatDollarsCompact(stats.dojSum12)}</div>
            <div className="sub">summed across DOJ items in past 12 months</div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="hn-filter-wrap">
          <div className="hn-filter-bar">
            <div className="hn-filter-row">
              <span className="hn-filter-label">Source</span>
              {SOURCE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={'hn-filter-chip' + (activeSource === f.key ? ' active' : '')}
                  onClick={() => setActiveSource(f.key)}
                >
                  {f.label} <span className="count">{sourceCounts[f.key] ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="hn-filter-row">
              <span className="hn-filter-label">Search</span>
              <input
                className="hn-filter-input"
                placeholder="Hospice name, parent operator, or keyword"
              />
              <span className="hn-filter-label" style={{ marginLeft: 12 }}>State</span>
              <select className="hn-filter-select" defaultValue="all">
                <option value="all">All states</option>
                <option>California</option>
                <option>Texas</option>
                <option>Florida</option>
                <option>New York</option>
              </select>
              <span className="hn-filter-label" style={{ marginLeft: 12 }}>When</span>
              <select className="hn-filter-select" defaultValue="all">
                <option value="all">All time</option>
                <option>Past 7 days</option>
                <option>Past 30 days</option>
                <option>Past 90 days</option>
                <option>Past year</option>
              </select>
              <div className="hn-filter-actions">
                <button type="button" className="hn-btn" onClick={() => setActiveSource('all')}>Reset</button>
                <button type="button" className="hn-btn">Subscribe (RSS)</button>
                <button type="button" className="hn-btn hn-btn-primary">Email digest</button>
              </div>
            </div>
          </div>
        </div>

        {/* FEED */}
        <div className="hn-feed-wrap">
          {loading && items.length === 0 ? (
            <>
              <div className="hn-feed-day-label">Loading feed</div>
              <div className="hn-feed-empty">
                Fetching the latest items from DOJ, OIG, and news sources.
              </div>
            </>
          ) : items.length === 0 ? (
            <>
              <div className="hn-feed-day-label">No items in the feed yet</div>
              <div className="hn-feed-empty">
                No public-record items in the feed yet. New items appear within an hour of publication.
                Subscribe via RSS to get notified.
              </div>
            </>
          ) : filtered.length === 0 ? (
            <>
              <div className="hn-feed-day-label">No items match this filter</div>
              <div className="hn-feed-empty">
                Try a different source category or reset the filters to see the full feed.
              </div>
            </>
          ) : (
            grouped.map((bucket) => (
              <div key={bucket.key}>
                <div className="hn-feed-day-label">
                  {bucket.label}
                  <span className="badge">{bucket.items.length} item{bucket.items.length === 1 ? '' : 's'}</span>
                </div>
                {bucket.items.map((item) => {
                  const d = parseDateSafe(item.date);
                  return (
                    <article key={item.id} className="hn-feed-item">
                      <div className="hn-feed-meta">
                        <span className="date">{formatDate(d)}</span>
                        <span className="time">{formatTime(d)}</span>
                      </div>
                      <div className="hn-feed-content">
                        <h3>{item.headline}</h3>
                        <p>{item.summary}</p>
                        <FeedLinks item={item} />
                      </div>
                      <span className={'hn-feed-tag ' + (TAG_CLASS[item.source] || 'hn-tag-news')}>
                        {item.source_label}
                      </span>
                    </article>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* SUBSCRIBE / RSS */}
        <div className="hn-feed-foot">
          <div>
            <h4>Get the feed in your inbox.</h4>
            <p>
              Daily or weekly digest. New items only — no marketing, no upsell. Free, no account required.
              RSS feed available for journalists and oversight staff who'd rather pull than push.
            </p>
          </div>
          <div className="actions">
            <button type="button" className="hn-btn hn-btn-primary">Subscribe by email</button>
            <button type="button" className="hn-btn">RSS feed →</button>
          </div>
        </div>
      </div>
    </>
  );
}

function FeedLinks({ item }) {
  const ccns = Array.isArray(item.matched_ccns) ? item.matched_ccns : [];
  const parts = [];

  if (ccns.length === 1) {
    parts.push(
      <Link key="hospice" to={'/hospice/' + ccns[0]}>
        View hospice profile →
      </Link>
    );
  } else if (ccns.length > 1) {
    parts.push(
      <Link key="hospice" to={'/hospice/' + ccns[0]}>
        View {ccns.length} affected hospices →
      </Link>
    );
  }

  if (item.url) {
    parts.push(
      <a key="source" href={item.url} target="_blank" rel="noopener noreferrer">
        Source →
      </a>
    );
  }

  const out = [];
  parts.forEach((node, i) => {
    if (i > 0) out.push(<span key={'sep-' + i} className="sep">·</span>);
    out.push(node);
  });
  return <div className="links">{out}</div>;
}
