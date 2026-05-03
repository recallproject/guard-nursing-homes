import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospice-news.css';

// --- Sample feed (Phase 1). Phase 2 will replace this with the real data feed.
const SAMPLE_FEED = [
  {
    id: 'hn-001',
    date: 'May 1, 2026',
    time: '2:14 PM',
    bucket: 'today',
    source: 'doj',
    sourceTag: 'DOJ · Settled',
    headline: 'Florida hospice chain settles $14.2M False Claims Act case with DOJ',
    summary:
      "According to the Department of Justice, Sunlight Hospice Group of Tampa agreed to pay $14.2M to resolve allegations of billing Medicare for hospice care provided to patients who did not meet the program's terminal-illness eligibility criteria between 2019 and 2023. The settlement contains no admission of wrongdoing.",
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'DOJ press release',
    extraLinkText: 'Read the complaint',
    hospiceCcn: '101501',
  },
  {
    id: 'hn-002',
    date: 'May 1, 2026',
    time: '11:42 AM',
    bucket: 'today',
    source: 'news',
    sourceTag: 'News · Industry',
    headline: 'Hospice News: PE consolidation in 2025 hit highest level since 2018',
    summary:
      'As reported by Hospice News, private-equity-backed acquisitions of hospice agencies in 2025 reached the highest annual level since 2018, with 47 transactions totaling roughly $2.1B. Three Texas-based platforms accounted for nearly 40% of the volume.',
    hospiceLinkText: 'Affected hospices (47)',
    sourceLinkText: 'Hospice News article',
  },
  {
    id: 'hn-003',
    date: 'May 1, 2026',
    time: '9:18 AM',
    bucket: 'today',
    source: 'oig',
    sourceTag: 'OIG · Exclusion',
    headline: 'OIG excludes former medical director of Texas hospice from federal programs',
    summary:
      "The HHS Office of Inspector General excluded a physician who served as medical director at Comfort Rest Hospice of Houston from federal program participation. The exclusion was based on the physician's separate state license action; the hospice itself was not excluded.",
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'OIG Exclusions Database',
    hospiceCcn: '451502',
  },
  {
    id: 'hn-004',
    date: 'Apr 30, 2026',
    time: '3:55 PM',
    bucket: 'week',
    source: 'news',
    sourceTag: 'News · Investigation',
    headline: 'KFF Health News: Three California hospices flagged in CMS audit findings',
    summary:
      'KFF Health News reported on a CMS audit identifying three Los Angeles-area hospices with billing patterns warranting further review. The audit findings were obtained through a FOIA request. CMS has not announced enforcement actions related to the audit.',
    hospiceLinkText: 'Affected hospices (3)',
    sourceLinkText: 'KFF Health News article',
  },
  {
    id: 'hn-005',
    date: 'Apr 29, 2026',
    time: '10:30 AM',
    bucket: 'week',
    source: 'cms',
    sourceTag: 'CMS · Termination',
    headline: 'CMS issues termination notice to Kentucky hospice for survey deficiencies',
    summary:
      'CMS notified Bluegrass End-of-Life Care of Lexington of intent to terminate its Medicare provider agreement effective June 15, 2026, citing condition-level deficiencies under §418.106 (Drugs and biologicals). The hospice has 60 days to submit a plan of correction.',
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'CMS QCOR survey report',
    hospiceCcn: '181503',
  },
  {
    id: 'hn-006',
    date: 'Apr 28, 2026',
    time: '4:12 PM',
    bucket: 'week',
    source: 'ag',
    sourceTag: 'State AG · TX',
    headline: 'Texas AG announces $8.7M Medicaid fraud settlement with Houston hospice',
    summary:
      "Per a press release from the Texas Attorney General's Civil Medicaid Fraud Division, Houston-based Lone Star Hospice agreed to pay $8.7M to resolve Medicaid fraud allegations related to hospice eligibility certifications between 2020 and 2024. The hospice did not admit liability.",
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'TX AG press release',
    hospiceCcn: '451504',
  },
  {
    id: 'hn-007',
    date: 'Apr 27, 2026',
    time: '8:45 AM',
    bucket: 'week',
    source: 'news',
    sourceTag: 'News · Investigation',
    headline: 'ProPublica investigation: Live discharge patterns at high-volume hospice chains',
    summary:
      'ProPublica published a multi-month investigation examining hospices with high early-live-discharge rates concentrated in Florida, Nevada, and Arizona. The piece names 12 hospices across three corporate parents. Cites CMS Hospice Care Index data.',
    hospiceLinkText: 'Affected hospices (12)',
    sourceLinkText: 'ProPublica article',
  },
  {
    id: 'hn-008',
    date: 'Apr 26, 2026',
    time: '2:01 PM',
    bucket: 'week',
    source: 'court',
    sourceTag: 'Court · FCA',
    headline: 'Federal civil docket opened: qui tam suit alleges hospice billing fraud',
    summary:
      'A False Claims Act qui tam complaint filed by a former employee of an Arizona hospice was unsealed in the District of Arizona. Allegations involve hospice eligibility certification practices between 2021 and 2024. The complaint is unverified at this stage; defendants have not yet responded.',
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'CourtListener docket',
    hospiceCcn: '031505',
  },
  {
    id: 'hn-009',
    date: 'Apr 22, 2026',
    time: '11:08 AM',
    bucket: 'earlier',
    source: 'ag',
    sourceTag: 'State AG · CA',
    headline: 'California AG announces $267M Medi-Cal hospice fraud settlement',
    summary:
      'California Attorney General announced a settlement covering 23 hospices identified through a multi-year Medi-Cal Fraud Control Unit investigation. The case is the largest hospice-related Medi-Cal recovery on record.',
    hospiceLinkText: 'Affected hospices (23)',
    sourceLinkText: 'CA AG press release',
  },
  {
    id: 'hn-010',
    date: 'Apr 18, 2026',
    time: '9:24 AM',
    bucket: 'earlier',
    source: 'oig',
    sourceTag: 'OIG · Report',
    headline: 'OIG report: hospice general inpatient utilization patterns vary 12x by state',
    summary:
      'The HHS Office of Inspector General published a national analysis of hospice General Inpatient (GIP) utilization showing 12-fold variation across states. The report identifies seven states where outlier providers warrant closer scrutiny.',
    sourceLinkText: 'OIG report',
  },
  {
    id: 'hn-011',
    date: 'Apr 14, 2026',
    time: '3:40 PM',
    bucket: 'earlier',
    source: 'doj',
    sourceTag: 'DOJ · Settled',
    headline: '$3.2M False Claims settlement with Georgia hospice',
    summary:
      'Per the DOJ, an Atlanta-area hospice agreed to pay $3.2M to resolve allegations of billing Medicare for hospice care for patients later determined ineligible. Settlement includes a five-year corporate integrity agreement.',
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'DOJ press release',
    hospiceCcn: '111506',
  },
  {
    id: 'hn-012',
    date: 'Apr 9, 2026',
    time: '12:50 PM',
    bucket: 'earlier',
    source: 'news',
    sourceTag: 'News · Industry',
    headline: 'Hospice News: New York AG opens inquiry into upstate hospice acquisitions',
    summary:
      "As reported by Hospice News, the New York AG's Medicaid Fraud Control Unit has opened a preliminary inquiry into a series of hospice acquisitions in the Buffalo and Rochester regions over the past 18 months.",
    sourceLinkText: 'Hospice News article',
  },
  {
    id: 'hn-013',
    date: 'Apr 4, 2026',
    time: '5:18 PM',
    bucket: 'earlier',
    source: 'oig',
    sourceTag: 'OIG · Exclusion',
    headline: 'OIG excludes hospice administrator following state license revocation',
    summary:
      "The HHS Office of Inspector General excluded a hospice administrator from federal program participation following revocation of the individual's state nursing-home administrator license. The hospice's federal certification is unaffected.",
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'OIG Exclusions Database',
    hospiceCcn: '361507',
  },
  {
    id: 'hn-014',
    date: 'Apr 2, 2026',
    time: '10:15 AM',
    bucket: 'earlier',
    source: 'ag',
    sourceTag: 'State AG · PA',
    headline: 'Pennsylvania AG: $1.4M settlement with Pittsburgh hospice over Medicaid billing',
    summary:
      "Per the Pennsylvania AG's Medicaid Fraud Control Section, a Pittsburgh-area hospice agreed to a $1.4M settlement to resolve Medicaid billing allegations related to general inpatient care levels between 2022 and 2024.",
    hospiceLinkText: 'Hospice profile',
    sourceLinkText: 'PA AG press release',
    hospiceCcn: '391508',
  },
];

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

const BUCKET_LABELS = [
  { key: 'today',   label: 'Today · May 1, 2026' },
  { key: 'week',    label: 'This week · April 26 – April 30' },
  { key: 'earlier', label: 'Earlier in April' },
];

function FeedLinks({ item }) {
  const parts = [];
  if (item.hospiceLinkText) {
    parts.push(
      item.hospiceCcn ? (
        <Link key="hospice" to={'/hospice/' + item.hospiceCcn}>
          {item.hospiceLinkText} →
        </Link>
      ) : (
        <span key="hospice" className="plain">{item.hospiceLinkText} →</span>
      )
    );
  }
  if (item.sourceLinkText) {
    parts.push(
      <a key="source" href="#" onClick={(e) => e.preventDefault()}>
        {item.sourceLinkText} →
      </a>
    );
  }
  if (item.extraLinkText) {
    parts.push(
      <a key="extra" href="#" onClick={(e) => e.preventDefault()}>
        {item.extraLinkText} →
      </a>
    );
  }

  // Interleave separators
  const out = [];
  parts.forEach((node, i) => {
    if (i > 0) out.push(<span key={'sep-' + i} className="sep">·</span>);
    out.push(node);
  });
  return <div className="links">{out}</div>;
}

export default function HospiceNewsPage() {
  const [activeSource, setActiveSource] = useState('all');

  // Per-source counts (computed from the sample feed).
  const sourceCounts = useMemo(() => {
    const counts = { all: SAMPLE_FEED.length };
    for (const f of SOURCE_FILTERS) {
      if (f.key === 'all') continue;
      counts[f.key] = SAMPLE_FEED.filter((item) => item.source === f.key).length;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    if (activeSource === 'all') return SAMPLE_FEED;
    return SAMPLE_FEED.filter((item) => item.source === activeSource);
  }, [activeSource]);

  const grouped = useMemo(() => {
    const map = { today: [], week: [], earlier: [] };
    for (const item of filtered) {
      if (map[item.bucket]) map[item.bucket].push(item);
    }
    return map;
  }, [filtered]);

  return (
    <>
      <Helmet>
        <title>Hospice Public Record · Live Feed | The Oversight Report</title>
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
          <div className="hn-hero-tagline">// hospice public record · national feed</div>
          <h1 className="hn-hero-title">
            Every public-record event involving a hospice, <em>as it happens.</em>
          </h1>
          <p className="hn-hero-sub">
            DOJ settlements, state AG actions, OIG exclusions, CMS deficiency citations, federal court filings, and reputable news coverage —{' '}
            <strong>aggregated from 8 government and journalism sources, sourced and dated, refreshed throughout the day</strong>.
          </p>

          <div className="hn-ticker">
            <div className="hn-ticker-row">
              <span className="hn-ticker-pulse"></span>
              <span className="hn-ticker-live">Live</span>
              <span className="hn-ticker-sep">·</span>
              <span className="hn-ticker-muted">last update</span>
              &nbsp;<span className="hn-ticker-strong">38 min ago</span>
              <span className="hn-ticker-sep">·</span>
              <span className="hn-ticker-muted">next refresh</span>
              &nbsp;<span className="hn-ticker-strong">22 min</span>
            </div>
            <span className="hn-ticker-note">sample feed · 14 items · phase 2 will replace with live data</span>
          </div>
        </section>

        {/* STAT STRIP */}
        <div className="hn-stat-strip">
          <div className="hn-stat-cell">
            <div className="lbl">Items in feed (all-time)</div>
            <div className="val">2,847</div>
            <div className="sub">since launch · 6,943 hospices monitored</div>
          </div>
          <div className="hn-stat-cell">
            <div className="lbl">Past 7 days</div>
            <div className="val">14</div>
            <div className="sub">8 news · 3 enforcement · 3 OIG/CMS</div>
          </div>
          <div className="hn-stat-cell">
            <div className="lbl">Past 30 days</div>
            <div className="val">47</div>
            <div className="sub">spike vs. 30-day rolling avg</div>
          </div>
          <div className="hn-stat-cell">
            <div className="lbl">DOJ FCA dollars (12mo)</div>
            <div className="val">$118.4M</div>
            <div className="sub">across 8 settlements involving hospice providers</div>
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
          {filtered.length === 0 ? (
            <>
              <div className="hn-feed-day-label">No items match this filter</div>
              <div className="hn-feed-empty">
                Try a different source category or reset the filters to see the full feed.
              </div>
            </>
          ) : (
            BUCKET_LABELS.map((bucket) => {
              const items = grouped[bucket.key];
              if (!items || items.length === 0) return null;
              return (
                <div key={bucket.key}>
                  <div className="hn-feed-day-label">
                    {bucket.label}
                    <span className="badge">{items.length} item{items.length === 1 ? '' : 's'}</span>
                  </div>
                  {items.map((item) => (
                    <article key={item.id} className="hn-feed-item">
                      <div className="hn-feed-meta">
                        <span className="date">{item.date}</span>
                        <span className="time">{item.time}</span>
                      </div>
                      <div className="hn-feed-content">
                        <h3>{item.headline}</h3>
                        <p>{item.summary}</p>
                        <FeedLinks item={item} />
                      </div>
                      <span className={'hn-feed-tag ' + (TAG_CLASS[item.source] || 'hn-tag-news')}>
                        {item.sourceTag}
                      </span>
                    </article>
                  ))}
                </div>
              );
            })
          )}

          <div className="hn-feed-load-more">
            <button type="button" className="hn-btn">Load older items (26 more in April)</button>
          </div>
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
