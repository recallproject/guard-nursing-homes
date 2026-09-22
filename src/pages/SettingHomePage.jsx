import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Fuse from 'fuse.js';
import { getCareSetting, POPULAR_SNF_STATES, CMS_SNF_AS_OF_ISO, CMS_SNF_COUNT } from '../data/careSettings';
import { formatDataAsOf } from '../utils/facilityBriefContent';
import { HubSearch } from '../components/HubSearch';
import { focusHubWhere } from '../utils/focusHubWhere';
import { PopularStatesGrid } from '../components/PopularStatesGrid';
import { HowToReadPanel } from '../components/HowToReadPanel';
import { StickyFamilyActions } from '../components/StickyFamilyActions';
import { buildSettingSearchPath, parseWhere } from '../utils/parseWhere';
import { toTitleCase } from '../utils/postAcute';
import '../styles/family-ia.css';

function scrollToBrowse() {
  const el = document.getElementById('browse-states');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function SettingHomePage({ settingId = 'snf' }) {
  const setting = getCareSetting(settingId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [snfIndex, setSnfIndex] = useState(null);
  const [nameIndex, setNameIndex] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  const q = (searchParams.get('q') || '').trim();
  const asOfLabel = formatDataAsOf(
    settingId === 'snf' ? CMS_SNF_AS_OF_ISO : (summary?.generated_at || '').slice(0, 10) || CMS_SNF_AS_OF_ISO
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [settingId]);

  useEffect(() => {
    if (location.hash === '#browse-states' || searchParams.get('view') === 'map') {
      requestAnimationFrame(() => scrollToBrowse());
    }
  }, [location.hash, searchParams]);

  useEffect(() => {
    function onScroll() {
      setShowSticky(window.scrollY > 280);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (settingId === 'snf') {
      fetch('/data/index.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data) setSnfIndex(data);
        })
        .catch(() => {});
    } else if (setting?.dataDir) {
      fetch(`/data/${setting.dataDir}/national-summary.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data) setSummary(data);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [settingId, setting?.dataDir]);

  useEffect(() => {
    if (!q || !setting) return;
    const parsed = parseWhere(q);
    if (parsed.state && !parsed.city && !parsed.zip) {
      navigate(setting.statePath(parsed.state), { replace: true });
    } else if (parsed.state) {
      navigate(buildSettingSearchPath(setting, { where: q }), { replace: true });
    }
  }, [q, setting, navigate]);

  useEffect(() => {
    if (!q || !setting) return undefined;
    const parsed = parseWhere(q);
    if (parsed.state) return undefined;
    let cancelled = false;
    const url = setting.dataDir
      ? `/data/${setting.dataDir}/index.json`
      : '/data/search-index.json';
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setNameIndex(setting.dataDir ? data : data.facilities || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [q, setting]);

  const snfRows = useMemo(() => {
    if (!snfIndex?.state_summary) return [];
    return Object.entries(snfIndex.state_summary).map(([state, row]) => ({
      state,
      count: row.count,
    }));
  }, [snfIndex]);

  const otherRows = summary?.by_state || [];
  const rows = settingId === 'snf' ? snfRows : otherRows;
  const popularAbbrs =
    settingId === 'snf'
      ? POPULAR_SNF_STATES
      : [...otherRows]
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 7)
          .map((r) => r.state);

  const nameMatches = useMemo(() => {
    if (!q || !nameIndex) return [];
    const fuse = new Fuse(nameIndex, {
      keys: ['name', 'aliases', 'city', 'state', 'zip', 'ccn'],
      threshold: 0.32,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    return fuse.search(q).slice(0, 25).map((r) => r.item);
  }, [q, nameIndex]);

  const total =
    settingId === 'snf'
      ? snfIndex?.national?.total_facilities || CMS_SNF_COUNT
      : summary?.total_providers || 0;

  if (!setting) return null;

  return (
    <div className="ia-page">
      <Helmet>
        <title>{`${setting.pageTitle} | The Oversight Report`}</title>
        <meta
          name="description"
          content={`${setting.pageSub} ${total ? `${total.toLocaleString('en-US')} ${setting.noun}.` : ''} Independent CMS public data.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com${setting.route}`} />
      </Helmet>

      <section className="ia-setting-hero">
        <nav className="ia-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true"> / </span>
          <b>{setting.familyLabel}</b>
        </nav>
        <h1>{setting.pageTitle}</h1>
        <p className="ia-sub">{setting.pageSub}</p>
        <HubSearch
          initialSettingId={setting.id}
          lockSetting
          compact
          defaultWhere={q && parseWhere(q).state ? q : q}
        />
      </section>

      <section className="ia-setting-body">
        <div>
          <h2 className="ia-section-label">Popular states</h2>
          <PopularStatesGrid
            setting={setting}
            rows={rows}
            popularAbbrs={popularAbbrs.length ? popularAbbrs : POPULAR_SNF_STATES}
            showWatchlist={settingId === 'snf'}
            expanded={expanded}
            onExpand={() => setExpanded(true)}
          />
        </div>
        <HowToReadPanel items={setting.howToRead(asOfLabel)} extraLinks={setting.extraLinks} />
      </section>

      {q && !parseWhere(q).state && nameMatches.length > 0 && (
        <section className="ia-state-results" aria-label="Search results">
          <h2 className="ia-section-label">Results for “{q}”</h2>
          <ul className="ia-name-results">
            {nameMatches.map((p) => (
              <li key={p.ccn} className="ia-fac">
                <div>
                  <h3 className="ia-fac-name">
                    <Link to={setting.providerPath(p.ccn)}>{toTitleCase(p.name)}</Link>
                  </h3>
                  <p className="ia-fac-bits">
                    {toTitleCase(p.city)}, {p.state} {p.zip} · CCN {p.ccn}
                  </p>
                </div>
                <Link to={setting.providerPath(p.ccn)} className="ia-btn ia-btn--primary">View</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q && !parseWhere(q).state && nameIndex && nameMatches.length === 0 && (
        <p className="ia-empty ia-empty--pad">
          No {setting.familyLabel.toLowerCase()} matches for “{q}”. Try a city, ZIP, or state — or{' '}
          <Link to={`${setting.route}#browse-states`}>browse {setting.familyLabel.toLowerCase()} by state</Link>.
        </p>
      )}

      <StickyFamilyActions
        visible={showSticky}
        primaryLabel="Search"
        secondaryLabel="Browse by state"
        onPrimary={focusHubWhere}
        onSecondary={scrollToBrowse}
      />
    </div>
  );
}
