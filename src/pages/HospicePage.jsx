import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import HospiceSearchDropdown from '../components/HospiceSearchDropdown';
import '../styles/hospice-landing.css';

// State abbreviation → display name (covers all 50 + DC + territories used in data).
const STATE_NAME = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
  GU: 'Guam', MP: 'Northern Mariana Is.',
};

const formatNumber = (n) => Number(n || 0).toLocaleString('en-US');

function formatAgo(iso) {
  if (!iso) return 'recently';
  const last = new Date(iso);
  if (Number.isNaN(last.getTime())) return 'recently';
  const diffMs = Date.now() - last.getTime();
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24) return `${hrs} hr ago`;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// CCN heuristic — hospice CCNs are ~6 digits, often with letters. Treat any
// purely-numeric 4–10 char input as a CCN attempt.
function looksLikeCcn(value) {
  return /^[0-9]{4,10}$/.test(value.trim());
}

function looksLikeZip(value) {
  return /^[0-9]{5}(-[0-9]{4})?$/.test(value.trim());
}

const TEN_QUESTIONS = [
  "Are you Medicare-certified, and what's your CMS overall star rating?",
  'How is pain managed at home — and who do I call at 2 a.m.?',
  'How often will the nurse, social worker, and chaplain visit?',
  'If symptoms get worse, can my loved one come into a hospice facility, and what does that cost?',
  'What happens if my loved one stabilizes — would they be discharged from hospice?',
  'Will the same nurse and team visit consistently, or does it rotate?',
  'How do you train family members to give medications and provide care?',
  "What's your average length of stay, and how often do patients leave hospice alive?",
  'What bereavement support is available for family after the death?',
  'Who owns this hospice — is it a non-profit, for-profit chain, or PE-backed?',
];

const HELP_CHANNELS = [
  {
    n: '1',
    title: 'State survey agency',
    desc: 'The body that conducts hospice surveys under CMS contract. Generates the official paper trail.',
  },
  {
    n: '2',
    title: 'CMS hospice complaint',
    desc: 'The federal channel. Goes to your CMS regional office for review.',
  },
  {
    n: '3',
    title: 'State AG · Medicaid Fraud',
    desc: "For suspected billing fraud or abuse. State Attorney General's MFCU.",
  },
  {
    n: '4',
    title: 'LTC ombudsman',
    desc: 'For facility-based hospice. Many state ombudsman programs only cover facility-based patients — not home hospice.',
  },
];

const SAMPLE_FEED = [
  {
    date: 'May 1, 2026',
    tag: 'DOJ · Settled',
    tagClass: 'hl-feed-tag-doj',
    title: 'Florida hospice chain settles $14.2M False Claims Act case',
    body: 'Sunlight Hospice Group of Tampa agreed to pay $14.2M to resolve allegations of billing Medicare for ineligible patients between 2019 and 2023.',
  },
  {
    date: 'Apr 30, 2026',
    tag: 'News · KFF',
    tagClass: 'hl-feed-tag-news',
    title: 'Three California hospices flagged in CMS audit findings',
    body: 'KFF Health News reported on a CMS audit identifying three Los Angeles-area hospices with billing patterns warranting further review.',
  },
  {
    date: 'Apr 28, 2026',
    tag: 'State AG · TX',
    tagClass: 'hl-feed-tag-ag',
    title: 'Texas AG announces $8.7M Medicaid fraud settlement',
    body: 'Houston-based Lone Star Hospice agreed to pay $8.7M to resolve Medicaid fraud allegations related to hospice eligibility certifications.',
  },
];

export default function HospicePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [verifyQuery, setVerifyQuery] = useState('');
  const [compareQuery, setCompareQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/data/hospice/national-summary.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSummary(data);
      })
      .catch(() => {});
    return () => { cancelled = false; };
  }, []);

  const totalProviders = summary?.total_providers ?? 6943;
  const totalStatesLabel = '50 states + DC';
  const lastRefresh = formatAgo(summary?.generated_at);
  const totalFlagged = summary?.total_flagged ?? 1013;
  const top5 = (summary?.top_flagged_states || []).slice(0, 5);

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    const q = verifyQuery.trim();
    if (!q) return;
    if (looksLikeCcn(q)) {
      navigate(`/hospice/${encodeURIComponent(q)}`);
    } else {
      navigate(`/hospice?q=${encodeURIComponent(q)}`);
    }
  };

  const handleCompareSubmit = (e) => {
    e.preventDefault();
    const q = compareQuery.trim();
    if (!q) return;
    if (looksLikeZip(q)) {
      navigate(`/hospice/compare?zip=${encodeURIComponent(q)}`);
    } else {
      navigate(`/hospice/compare?city=${encodeURIComponent(q)}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Hospice Safety Data | The Oversight Report</title>
        <meta
          name="description"
          content="Verify a hospice referral or compare hospices in your area. Free CMS-sourced quality scores, family-experience ratings, and patterns flagged for review for every Medicare-certified hospice in America."
        />
      </Helmet>

      <div className="hospice-landing">

        {/* HERO */}
        <section className="hl-hero">
          <div className="hl-hero-tagline">Free · Clinician-built · Sourced from CMS</div>
          <h1 className="hl-masthead">
            The <span className="hl-masthead-accent">Oversight</span> Report
          </h1>
          <div className="hl-masthead-sub">Hospice safety data.</div>
          <hr className="hl-masthead-rule" />
          <p className="hl-hero-sub">
            Most hospice referrals come from a hospital case manager — and the family signs the form within hours.{' '}
            <strong>This page is for the hours you have.</strong>
          </p>
          <div className="hl-ticker">
            <div className="hl-ticker-row">
              <span className="hl-ticker-pulse" />
              <span className="hl-ticker-live">Live</span>
              <span className="hl-ticker-sep">·</span>
              <span className="hl-ticker-muted">data refreshed</span>&nbsp;
              <span className="hl-ticker-strong">{lastRefresh}</span>
              <span className="hl-ticker-sep">·</span>
              <span className="hl-ticker-strong">{formatNumber(totalProviders)}</span>&nbsp;
              <span className="hl-ticker-muted">hospice providers</span>
              <span className="hl-ticker-sep">·</span>
              <span className="hl-ticker-strong">{totalStatesLabel}</span>
            </div>
          </div>
        </section>

        {/* TWO-LANE PRIMARY ACTION */}
        <section className="hl-two-lane">
          <div className="hl-two-lane-inner">

            <div className="hl-lane-card hl-lane-verify">
              <div className="hl-lane-eyebrow">// for families · just got a referral</div>
              <h2 className="hl-lane-title">
                Did the hospital recommend a hospice? <em>Verify it.</em>
              </h2>
              <p className="hl-lane-sub">
                Type the hospice name your discharge planner gave you. We'll show you their CMS quality score,
                family-experience ratings, and any patterns worth asking about — before you sign the admission form.
              </p>

              <HospiceSearchDropdown />
              <div className="hl-lane-helper">
                // {formatNumber(totalProviders)} hospices · all 50 states + DC · fuzzy match handles spelling · ZIP routes to compare
              </div>

              <ul className="hl-lane-bullets">
                <li>CMS overall star rating + 8 family-experience scores</li>
                <li>Two CMS-published patterns flagged when this hospice's rates are higher than 9 out of 10 nationally</li>
                <li>Free printable summary you can take to the admission meeting</li>
              </ul>

              <div className="hl-lane-foot">// no signup · no account · no referral fees</div>
            </div>

            <div className="hl-lane-card hl-lane-compare">
              <div className="hl-lane-eyebrow">// for case managers + discharge planners</div>
              <h2 className="hl-lane-title">
                Comparing hospices in your area? <em>Side by side.</em>
              </h2>
              <p className="hl-lane-sub">
                Pick a ZIP or city. We'll show every Medicare-certified hospice serving that area — quality,
                family experience, ownership, and patterns flagged for review — in a printable, side-by-side comparison sheet.
              </p>

              <form className="hl-lane-search" onSubmit={handleCompareSubmit}>
                <input
                  type="text"
                  value={compareQuery}
                  onChange={(e) => setCompareQuery(e.target.value)}
                  placeholder='ZIP or city — like "94608" or "Sacramento"'
                  aria-label="Compare hospices by ZIP or city"
                />
                <button type="submit">Compare</button>
              </form>
              <div className="hl-lane-helper">// pick up to 5 · sortable by 12 metrics · CSV export</div>

              <ul className="hl-lane-bullets">
                <li>Print 2–3 options to hand to the family at the bedside</li>
                <li>Same CMS data your hospital case-management system already uses</li>
                <li>For ACMA case managers, palliative leads, and SNF discharge planners</li>
              </ul>

              <div className="hl-lane-foot">// no commissions · no operator funding · sourced to CMS</div>
            </div>

          </div>
        </section>

        {/* NATIONAL FEED PREVIEW */}
        <section className="hl-feed-section">
          <div className="hl-feed-inner">
            <div className="hl-feed-head">
              <div>
                <div className="hl-feed-eyebrow">// public record · live national feed</div>
                <h2>What's been happening across hospice this week.</h2>
              </div>
              <div className="hl-feed-meta">
                <span className="hl-pulse" />2,847 items in feed · 14 this week · last update 38 min ago
              </div>
            </div>

            <div className="hl-feed-list">
              {SAMPLE_FEED.map((item, idx) => (
                <Link
                  key={idx}
                  to="/hospice/news"
                  className="hl-feed-card"
                >
                  <div className="hl-feed-card-head">
                    <span className="hl-feed-card-date">{item.date}</span>
                    <span className={`hl-feed-card-tag ${item.tagClass}`}>{item.tag}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </Link>
              ))}
            </div>

            <Link className="hl-feed-cta" to="/hospice/news">
              View the full national feed · 2,847 items →
            </Link>
          </div>
        </section>

        {/* WHAT WE TELL YOU */}
        <section className="hl-section">
          <div className="hl-section-inner">
            <div className="hl-section-eyebrow">// what's on every hospice report</div>
            <h2 className="hl-section-title">Every page has the same three things.</h2>
            <p className="hl-section-desc">Sourced from CMS. Plain English. Free.</p>

            <div className="hl-why-cards">
              <div className="hl-why-card">
                <h3>Quality scores</h3>
                <p>How CMS rates this hospice on care quality, including overall star rating and how often the hospice provides recommended care during the last days of life.</p>
              </div>
              <div className="hl-why-card">
                <h3>Family experience</h3>
                <p>Real scores from families who lost a loved one in this hospice's care. CMS surveys family caregivers 1–3 months after the patient passed away.</p>
              </div>
              <div className="hl-why-card">
                <h3>Patterns to ask about</h3>
                <p>When a hospice's numbers are higher than 9 out of 10 hospices nationally, we flag them for closer review. It's not an accusation — it's a starting point for a question.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 10 QUESTIONS */}
        <section className="hl-section hl-section-light">
          <div className="hl-section-inner">
            <div className="hl-section-eyebrow">// before you sign</div>
            <h2 className="hl-section-title">10 questions to ask any hospice.</h2>
            <p className="hl-section-desc">
              Print this. Bring it to the admission meeting. Ask every hospice you're considering — even the one your hospital recommended.
            </p>

            <div className="hl-ask-block">
              <h3>The 10 questions.</h3>
              <p className="hl-ask-sub">From clinical and patient-advocate guidance — not specific to any single hospice.</p>
              <ol className="hl-ask-list">
                {TEN_QUESTIONS.map((q, i) => (
                  <li key={i} className="hl-ask-item">
                    <span className="hl-ask-num">{i + 1}</span>
                    <span className="hl-ask-q">{q}</span>
                  </li>
                ))}
              </ol>
              <div className="hl-ask-print">
                <button type="button" className="hl-btn" onClick={() => window.print()}>Print this checklist</button>
                <Link to="/hospice/news" className="hl-btn">Email it to me</Link>
              </div>
            </div>
          </div>
        </section>

        {/* HELP — complaint routing */}
        <section className="hl-help-block">
          <div className="hl-help-inner">
            <div className="hl-help-eyebrow">// if something's wrong</div>
            <h2 className="hl-help-title">Where to file a complaint.</h2>
            <p className="hl-help-sub">
              If your loved one received care that concerns you — pain that wasn't managed, a missed visit,
              billing that doesn't add up — these are the channels that can act on it.
            </p>

            <div className="hl-help-channels">
              {HELP_CHANNELS.map((c) => (
                <div key={c.n} className="hl-help-card">
                  <div className="hl-help-lbl">// {c.n}</div>
                  <div className="hl-help-ttl">{c.title}</div>
                  <div className="hl-help-desc">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NATIONAL OVERVIEW */}
        <section className="hl-national">
          <div className="hl-section-inner">
            <div className="hl-section-eyebrow">// national overview</div>
            <h2 className="hl-section-title" style={{ fontSize: 22 }}>Hospices across America.</h2>
            <p className="hl-section-desc" style={{ marginBottom: 18 }}>
              For journalists, AGs, and anyone studying the national landscape. Click your state for the full provider list.
            </p>
            <div className="hl-national-inner">
              <div className="hl-map-canvas">
                <div className="hl-ph">
                  <span className="hl-big">USA map · pick a state</span>
                  [interactive D3 map · color-scaled to share of providers flagged for review]
                </div>
              </div>
              <div className="hl-national-side">
                <h4>Top 5 states · share flagged</h4>
                <div className="hl-helper">
                  % of in-state hospices with at least one CMS Hospice Care Index measure above the national 90th percentile · states with ≥20 providers
                </div>
                {top5.length > 0 ? (
                  top5.map((row) => (
                    <div className="hl-ts-row" key={row.state}>
                      <span className="hl-st">{STATE_NAME[row.state] || row.state}</span>
                      <span className="hl-pct">
                        {Number(row.flagged_pct).toFixed(1)}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="hl-ts-row"><span className="hl-st">Loading…</span><span className="hl-pct">—</span></div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ANALYST LINK */}
        <section className="hl-section" style={{ paddingTop: 16 }}>
          <div className="hl-section-inner">
            <div className="hl-analyst-link">
              <div>
                <div className="hl-section-eyebrow" style={{ marginBottom: 6 }}>
                  // for investigators, journalists, and oversight staff
                </div>
                <h4>Looking for the full national feed?</h4>
                <p>
                  Outlier list with all {formatNumber(totalFlagged)} flagged providers, methodology details,
                  screening thresholds, ownership lineage, and CSV/JSON downloads.
                </p>
              </div>
              <Link to="/hospice/news" className="hl-btn hl-btn-primary">
                Open the national feed →
              </Link>
            </div>
          </div>
        </section>

        {/* METHODOLOGY */}
        <section className="hl-method">
          <div className="hl-method-inner">
            <h3>How this is built.</h3>
            <p>
              Every number on this site comes from publicly available federal data — CMS Hospice Care Compare,
              the Hospice Item Set, and Medicare claims-based outcomes. The "patterns to ask about" framework is
              adapted from the <strong>2022 California State Auditor's report on hospice oversight</strong>{' '}
              (Report 2021-123), applied nationally. Outlier status reflects national distribution — not
              state-specific compliance. A flag is a starting point for closer review, not a regulatory finding.
            </p>
            <p className="hl-src">
              Refresh cadence: monthly · Last refreshed: {summary?.generated_at ? new Date(summary.generated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'recently'} · CMS data through Q4 2025
            </p>
            <div className="hl-method-sig">
              <div className="hl-name">Robert Benard, NP</div>
              <div className="hl-creds">AGACNP-BC · PMHNP-BC · DataLink Clinical LLC</div>
            </div>
          </div>
        </section>

        <footer className="hl-footer">
          <div className="hl-footer-inner">
            <span>© 2026 DataLink Clinical LLC · oversightreports.com</span>
            <span>Sources: CMS Care Compare · HIS · HCRIS · CA State Auditor</span>
            <span>
              <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> · <Link to="/methodology">Methodology</Link>
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
