import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Fuse from 'fuse.js';
import { getPostAcuteSetting, STATE_NAME } from '../data/postAcuteCatalog';
import { POST_ACUTE_CMS_COUNTS } from '../data/postAcuteCounts';
import PostAcuteSearchDropdown from '../components/PostAcuteSearchDropdown';
import { looksLikeCcn, toTitleCase } from '../utils/postAcute';
import '../styles/post-acute-setting.css';

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

export default function PostAcuteHubPage({ settingId }) {
  const setting = getPostAcuteSetting(settingId);
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim();
  const [summary, setSummary] = useState(null);
  const [index, setIndex] = useState(null);
  const [indexError, setIndexError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/data/${setting.dataDir}/national-summary.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setSummary(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [setting.dataDir]);

  useEffect(() => {
    if (!q) {
      return undefined;
    }
    let cancelled = false;
    fetch(`/data/${setting.dataDir}/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setIndex(data);
        setIndexError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setIndex(null);
        setIndexError(err.message || 'Could not load search index.');
      });
    return () => { cancelled = true; };
  }, [q, setting.dataDir]);

  const fuse = useMemo(() => {
    if (!index) return null;
    return new Fuse(index, {
      keys: ['name', 'city', 'state', 'zip', 'ccn'],
      threshold: 0.32,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [index]);

  let matches = [];
  if (q && index) {
    const zip5 = q.replace(/\D/g, '').slice(0, 5);
    if (/^\d{5}$/.test(zip5) && /^\d{5}(-\d{4})?$/.test(q)) {
      matches = index.filter((p) => p.zip && p.zip.startsWith(zip5));
    } else {
      const stateHit = q.length === 2 ? q.toUpperCase() : null;
      if (stateHit && STATE_NAME[stateHit]) {
        matches = index.filter((p) => p.state === stateHit);
      } else if (fuse) {
        matches = fuse.search(q).slice(0, 75).map((r) => r.item);
      }
    }
  }

  const total = summary?.total_providers ?? POST_ACUTE_CMS_COUNTS[setting.id] ?? 0;
  const lastRefresh = formatAgo(summary?.generated_at);
  const states = (summary?.by_state || [])
    .slice()
    .sort((a, b) => (STATE_NAME[a.state] || a.state).localeCompare(STATE_NAME[b.state] || b.state));

  if (!setting) return null;

  return (
    <>
      <Helmet>
        <title>{`${setting.label} ${setting.countUnit[0].toUpperCase()}${setting.countUnit.slice(1)} | The Oversight Report`}</title>
        <meta
          name="description"
          content={`Search ${total.toLocaleString('en-US')} Medicare-certified ${setting.plural}. Free CMS-sourced quality data from ${setting.cmsTitle}.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com${setting.route}`} />
      </Helmet>

      <div className="pas">
        <section className="pas-hero">
          <div className="pas-hero-tagline">Free · Clinician-built · Sourced from CMS</div>
          <h1 className="pas-masthead">
            The <span className="pas-masthead-accent">Oversight</span> Report
          </h1>
          <div className="pas-masthead-sub">{setting.heroSub}</div>
          <hr className="pas-rule" />
          <p className="pas-hero-sub">{setting.heroBody}</p>
          <div className="pas-ticker">
            <span className="pas-pulse" aria-hidden="true" />
            <span className="pas-live">Live</span>
            <span className="pas-sep">·</span>
            <span className="pas-muted">data refreshed</span>{' '}
            <strong>{lastRefresh}</strong>
            <span className="pas-sep">·</span>
            <strong>{total.toLocaleString('en-US')}</strong>{' '}
            <span className="pas-muted">{setting.countUnit}</span>
          </div>
        </section>

        <section className="pas-search-section">
          <div className="pas-search-card">
            <div className="pas-eyebrow">// search the directory</div>
            <h2>Find a {setting.singular}.</h2>
            <p>Search by name, city, state, ZIP, or CMS Certification Number (CCN).</p>
            <PostAcuteSearchDropdown setting={setting} initialQuery={q} />
            <div className="pas-helper">
              {total.toLocaleString('en-US')} {setting.plural} · all published states · no account required
            </div>
          </div>
        </section>

        {q && (
          <section className="pas-results">
            <div className="pas-section-inner">
              <div className="pas-eyebrow">// search results</div>
              <h2>
                {index && !indexError
                  ? `${matches.length.toLocaleString('en-US')} match${matches.length === 1 ? '' : 'es'} for “${q}”`
                  : `Searching for “${q}”`}
              </h2>
              {looksLikeCcn(q) && (
                <p className="pas-hint">
                  That looks like a CCN.{' '}
                  <Link to={`${setting.route}/${encodeURIComponent(q.toUpperCase())}`}>
                    Open {q.toUpperCase()} directly →
                  </Link>
                </p>
              )}
              {indexError && <p className="pas-error">Could not load the search index. Refresh and try again.</p>}
              {!indexError && index && matches.length === 0 && (
                <p>No {setting.plural} matched that search. Try a city, ZIP, or a shorter name.</p>
              )}
              {matches.length > 0 && (
                <ul className="pas-result-list">
                  {matches.map((p) => (
                    <li key={p.ccn}>
                      <Link to={`${setting.route}/${encodeURIComponent(p.ccn)}`} className="pas-result-row">
                        <span className="pas-result-name">{toTitleCase(p.name)}</span>
                        <span className="pas-result-meta">
                          {toTitleCase(p.city)}, {p.state} {p.zip}
                          {p.star != null ? ` · ${p.star}★` : ''}
                          <span className="pas-ccn"> · CCN {p.ccn}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <section className="pas-section">
          <div className="pas-section-inner">
            <div className="pas-eyebrow">// what&apos;s on every report</div>
            <h2>CMS fields, in plain English.</h2>
            <div className="pas-cards">
              {setting.whatWeShow.map((item) => (
                <div key={item.title} className="pas-card">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pas-section pas-section-alt">
          <div className="pas-section-inner">
            <div className="pas-eyebrow">// browse the full directory</div>
            <h2>{setting.label} by state.</h2>
            <p className="pas-lead">
              Every Medicare-certified {setting.singular} in the CMS file, grouped by state.
            </p>
            <div className="pas-state-grid">
              {states.map((row) => (
                <Link
                  key={row.state}
                  to={`${setting.route}/state/${row.state}`}
                  className="pas-state-link"
                >
                  <span>{STATE_NAME[row.state] || row.state}</span>
                  <span className="pas-state-count">{Number(row.count || 0).toLocaleString('en-US')}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="pas-method">
          <div className="pas-section-inner">
            <h3>How this is built.</h3>
            <p>
              Numbers on these pages come from{' '}
              <a href={setting.catalogUrl} target="_blank" rel="noopener noreferrer">{setting.cmsTitle}</a>
              {' '}on the CMS Provider Data Catalog. This first-pass directory is searchable and sourced — it is not a full SNF-style inspection/staffing report card.
            </p>
            <p className="pas-src">
              Last rebuilt: {summary?.generated_at
                ? new Date(summary.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'recently'}
              {' '}· Rebuild locally with <code>node scripts/build-postacute-data.js</code>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
