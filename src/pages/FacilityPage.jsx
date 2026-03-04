import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useFacilityData, useSingleFacility } from '../hooks/useFacilityData';
import { computeBenchmarks } from '../utils/benchmarks';
import { haversineDistance } from '../utils/haversine';
import { checkoutSingleReport } from '../utils/stripe';
import { NearbyFacilities } from '../components/NearbyFacilities';
import { DownloadButton } from '../components/DownloadButton';
import { ActionPaths } from '../components/ActionPaths';
import StaffingSection from '../components/StaffingSection';
import { StaffingTrendChart } from '../components/StaffingTrendChart';
import { useWatchlist } from '../hooks/useWatchlist';

import ClinicianCTA from '../components/ClinicianCTA';
import ExplainerBanners from '../components/facility/ExplainerBanners';
import MetricTooltip from '../components/facility/MetricTooltip';
import WhatDoesThisMean, { KeyPoint } from '../components/facility/WhatDoesThisMean';
import '../styles/facility.css';
import '../styles/staffing.css';

// Quality measure categories — organized by clinical theme, matching mockup v2
const QM_CATEGORIES = [
  {
    key: 'memory',
    label: 'Memory Care',
    direction: '\u2193 Lower is better for all measures in this category',
    measures: [
      { code: '481', type: 'mds', stay: 'ls', name: 'Antipsychotic medication', lower: true,
        explain: 'Percentage of long-stay residents receiving antipsychotic medications \u2014 drugs designed for schizophrenia and bipolar disorder but frequently used off-label to sedate dementia patients. The FDA has a black-box warning against this use in elderly dementia patients due to increased risk of death.' },
      { code: '452', type: 'mds', stay: 'ls', name: 'Anti-anxiety & sedative medication', lower: true,
        explain: 'Percentage of residents receiving anti-anxiety or hypnotic medications. These include benzodiazepines (Xanax, Ativan, Valium) which increase fall risk in the elderly by 40\u201360%.' },
      { code: '409', type: 'mds', stay: 'ls', name: 'Physical restraints', lower: true,
        explain: 'Percentage of residents physically restrained. Physical restraints cause injury, pressure sores, and psychological trauma. Federal law requires facilities to be restraint-free except in documented emergencies.' },
      { code: '408', type: 'mds', stay: 'ls', name: 'Depressive symptoms', lower: true,
        explain: 'Percentage of residents showing signs of depression. Low numbers can sometimes reflect poor screening rather than good care.' },
      { code: '410', type: 'mds', stay: 'ls', name: 'Falls with major injury', lower: true,
        explain: 'Percentage of long-stay residents who experienced a fall resulting in major injury (fractures, head trauma, dislocations). High rates correlate with understaffing and sedative medication use.' },
    ]
  },
  {
    key: 'body',
    label: 'Body & Basic Care',
    direction: '\u2193 Lower is better for all measures in this category',
    measures: [
      { code: '479', type: 'mds', stay: 'ls', name: 'Pressure ulcers (bedsores)', lower: true,
        explain: 'Percentage of long-stay residents who developed new or worsening pressure ulcers (bedsores). This is a standard CMS quality indicator tracked for all long-stay residents.' },
      { code: '407', type: 'mds', stay: 'ls', name: 'Urinary tract infections', lower: true,
        explain: 'Percentage of residents with UTIs. For elderly residents, UTIs can cause delirium, falls, and hospitalization. Often caused by delayed incontinence care or poor hygiene.' },
      { code: '406', type: 'mds', stay: 'ls', name: 'Catheter left in', lower: true,
        explain: 'Percentage of residents with an indwelling urinary catheter. Catheters should be removed as soon as medically possible; each additional day increases infection risk by 3\u20137%.' },
      { code: '404', type: 'mds', stay: 'ls', name: 'Significant weight loss', lower: true,
        explain: 'Percentage of residents who experienced unintentional weight loss of 5%+ in 30 days (or 10% in 180 days). Can indicate inadequate feeding assistance, depression, or neglect.' },
      { code: '401', type: 'mds', stay: 'ls', name: 'Ability to do daily tasks declined', lower: true,
        explain: 'Percentage of residents who lost ability to perform basic ADLs (dressing, eating, bathing). Functional decline accelerates when staff do tasks for residents instead of helping them maintain independence.' },
      { code: '451', type: 'mds', stay: 'ls', name: 'Walking ability worsened', lower: true,
        explain: 'Percentage of residents who could walk but experienced a mobility decline. Once a resident stops walking, recovery is rare. Facilities should actively maintain mobility through walking programs.' },
      { code: '480', type: 'mds', stay: 'ls', name: 'New or worsened incontinence', lower: true,
        explain: 'Percentage who developed new or worsened bladder/bowel control. Incontinence management requires regular toileting schedules, a direct measure of staffing adequacy.' },
    ]
  },
  {
    key: 'rehab',
    label: 'Rehab & Short-Stay',
    direction: '\u2193 Lower is better for most measures \u00b7 "Discharged to community" = higher is better',
    measures: [
      { code: '521', type: 'claims', name: 'Re-hospitalized within 30 days', lower: true,
        explain: 'Percentage of patients admitted for short-term rehab who end up back in the hospital within 30 days. This is a Medicare claims-based measure \u2014 actual hospital readmissions, not self-reported.' },
      { code: '522', type: 'claims', name: 'Emergency room visits', lower: true,
        explain: 'Percentage of short-stay residents who visited the ER. ER visits during a skilled nursing stay often indicate deterioration the facility couldn\'t manage on-site.' },
      { code: '434', type: 'mds', stay: 'ss', name: 'Newly started on antipsychotics', lower: true,
        explain: 'Percentage of short-stay patients newly put on antipsychotics they weren\'t taking before admission. Starting antipsychotics during a rehab stay is a red flag for chemical sedation.' },
    ]
  },
  {
    key: 'vaccines',
    label: 'Vaccines',
    direction: '\u2191 Higher is better for all vaccine measures',
    subgroups: [
      { label: 'COVID-19 Vaccination', noBorder: true, measures: [
        { code: 'covid_res', type: 'qrp_num', name: 'Residents up to date on COVID-19', lower: false,
          explain: 'Percentage of residents who are up to date on COVID-19 vaccination. COVID remains a leading cause of infectious disease death in nursing homes. Source: SNF QRP (Measure S_045).' },
        { code: 'covid_staff', type: 'qrp_num', name: 'Staff up to date on COVID-19', lower: false,
          explain: 'Percentage of healthcare staff who are up to date on COVID-19 vaccination. Unvaccinated staff are more likely to introduce COVID into the facility and transmit it to vulnerable residents. Source: SNF QRP (Measure S_041).' },
      ]},
      { label: 'Flu & Pneumococcal \u2014 Long-Stay', measures: [
        { code: '454', type: 'mds', stay: 'ls', name: 'Flu vaccine', lower: false,
          explain: 'Percentage of long-stay residents who received the seasonal flu vaccine. Flu outbreaks in nursing homes can be fatal.' },
        { code: '415', type: 'mds', stay: 'ls', name: 'Pneumococcal vaccine', lower: false,
          explain: 'Percentage of long-stay residents who received the pneumococcal vaccine. Pneumonia is a leading cause of death in nursing home residents.' },
      ]},
      { label: 'Flu & Pneumococcal \u2014 Short-Stay', measures: [
        { code: '472', type: 'mds', stay: 'ss', name: 'Flu vaccine', lower: false,
          explain: 'Percentage of short-stay residents who received the flu vaccine during their stay. Short-stay patients are often post-surgical and immunocompromised.' },
        { code: '430', type: 'mds', stay: 'ss', name: 'Pneumococcal vaccine', lower: false,
          explain: 'Percentage of short-stay residents who received the pneumococcal vaccine. Many short-stay patients are elderly and at high risk for pneumonia.' },
      ]},
    ]
  },
  {
    key: 'workforce',
    label: 'Workforce',
    direction: '\u2193 Lower turnover is better \u00b7 Weekend staffing should match weekday staffing',
    custom: true,  // rendered with custom logic, not QM indicators
  },
];

// Get the facility's score for a measure definition
function getMeasureScore(qm, m) {
  if (!qm) return null;
  if (m.type === 'mds') return qm.mds?.[m.stay]?.[m.code]?.s ?? null;
  if (m.type === 'claims') { const v = qm.claims?.[m.code]; return v ? (v.adj ?? v.obs ?? null) : null; }
  if (m.type === 'qrp_num') return qm.qrp?.[m.code] ?? null;
  return null;
}

// Color coding: compare facility score to national average
function getQmColor(score, avg, lower) {
  if (score == null || avg == null || avg === 0) return 'green';
  if (lower) {
    if (score > avg * 1.5) return 'red';
    if (score > avg * 1.1) return 'orange';
    return 'green';
  } else {
    if (score < avg * 0.7) return 'red';
    if (score < avg * 0.9) return 'orange';
    return 'green';
  }
}

// Compute "worst" flag color for a category tab
function getCategoryFlag(qm, measures, avgs) {
  let worst = 'green';
  for (const m of measures) {
    const score = getMeasureScore(qm, m);
    const avg = avgs[m.stay ? `${m.type}_${m.stay}_${m.code}` : `${m.type}_${m.code}`];
    const c = getQmColor(score, avg, m.lower);
    if (c === 'red') return 'red';
    if (c === 'orange') worst = 'orange';
  }
  return worst;
}

export function FacilityPage() {
  const { ccn } = useParams();
  const location = useLocation();
  // Fast load: only fetches CCN index (201KB) + one state file (1-5MB)
  const { facility, allStateFacilities, loading: fastLoading, error: fastError } = useSingleFacility(ccn);
  // Background load: full dataset for benchmarks and ownership clusters
  const { data, loading: fullLoading, error: fullError } = useFacilityData();
  const { watchlist, addFacility, removeFacility, isWatched } = useWatchlist();
  const pageRef = useRef(null);
  const fromState = location.state?.fromState || null;
  const [showEvidencePreview, setShowEvidencePreview] = useState(false);
  const [ahcaData, setAhcaData] = useState(null);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [deficiencyDetails, setDeficiencyDetails] = useState(null);
  const [qmTab, setQmTab] = useState('memory');
  const [expandedQm, setExpandedQm] = useState(null);
  // Change #3: Deficiency filter state
  const [defSeverityFilter, setDefSeverityFilter] = useState('all');
  const [defYearFilter, setDefYearFilter] = useState('all');
  const [defPage, setDefPage] = useState(0);
  const DEF_PAGE_SIZE = 5;

  // Use fast-loaded facility, show page as soon as it's ready
  const loading = fastLoading;
  const error = fastError;

  // All facilities: use full data if loaded, otherwise fall back to same-state facilities
  const allFacilities = useMemo(() => {
    if (data?.states) return Object.values(data.states).flatMap(state => state.facilities || []);
    return allStateFacilities;
  }, [data, allStateFacilities]);

  // Compute benchmarks (available once full data loads in background)
  const benchmarks = useMemo(() => {
    if (!data) return { state: {}, national: {} };
    return computeBenchmarks(data);
  }, [data]);

  // Get benchmarks for this facility's state
  const stateBenchmarks = facility && benchmarks.state[facility.state]
    ? benchmarks.state[facility.state]
    : {};
  const nationalBenchmarks = benchmarks.national || {};

  // Nearby better-rated facilities (for PDF download)
  const nearbyForPDF = useMemo(() => {
    if (!facility || !data?.states || !facility.lat || !facility.lon) return [];
    const stateData = data.states[facility.state];
    if (!stateData?.facilities) return [];
    return stateData.facilities
      .filter(f => f.ccn !== facility.ccn && f.lat && f.lon)
      .map(f => ({ ...f, distance: haversineDistance(facility.lat, facility.lon, f.lat, f.lon) }))
      .filter(f => f.distance <= 15 && (f.composite || 100) <= (facility.composite || 0))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [facility, data]);

  // Compute national averages for quality measures across all facilities
  const nationalQmAvgs = useMemo(() => {
    if (!allFacilities.length) return {};
    const sums = {};
    const counts = {};
    const addVal = (key, val) => {
      if (val != null && !isNaN(val)) {
        sums[key] = (sums[key] || 0) + val;
        counts[key] = (counts[key] || 0) + 1;
      }
    };
    allFacilities.forEach(f => {
      const qm = f.quality_measures;
      if (!qm) return;
      Object.entries(qm.mds?.ls || {}).forEach(([code, v]) => addVal(`mds_ls_${code}`, v.s));
      Object.entries(qm.mds?.ss || {}).forEach(([code, v]) => addVal(`mds_ss_${code}`, v.s));
      Object.entries(qm.claims || {}).forEach(([code, v]) => addVal(`claims_${code}`, v.adj ?? v.obs));
      // COVID vaccination rates from QRP (numeric)
      if (qm.qrp?.covid_res != null) addVal('qrp_num_covid_res', qm.qrp.covid_res);
      if (qm.qrp?.covid_staff != null) addVal('qrp_num_covid_staff', qm.qrp.covid_staff);
    });
    const avgs = {};
    Object.keys(sums).forEach(k => { avgs[k] = sums[k] / counts[k]; });
    return avgs;
  }, [allFacilities]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ccn]);

  // Plausible: track facility page view
  useEffect(() => {
    if (facility) {
      window.plausible && window.plausible('Facility-Page-View', {props: {facility: facility.name, ccn: facility.ccn, state: facility.state, stars: String(facility.stars || '')}});
    }
  }, [facility?.ccn]);

  // Load AHCA data
  useEffect(() => {
    fetch('/data/ahca_board_chains.json')
      .then(r => r.json())
      .then(d => setAhcaData(d))
      .catch(() => {});
  }, []);

  // Load deficiency details for this facility's state
  useEffect(() => {
    if (!facility?.state) return;
    fetch(`${import.meta.env.BASE_URL}deficiency_details/${facility.state}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d[ccn]) {
          setDeficiencyDetails(d[ccn].deficiency_details || []);
        }
      })
      .catch(() => {});
  }, [facility?.state, ccn]);

  if (loading) {
    return (
      <div className="fp">
        <div className="fp-loading">Loading facility data...</div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="fp">
        <div className="fp-error">
          <h1>Facility Not Found</h1>
          <p>We couldn't find a facility with CCN: {ccn}</p>
          <Link to="/">← Return to Map</Link>
        </div>
      </div>
    );
  }

  // Helpers
  const fmt = (v) => (!v && v !== 0) ? 'N/A' : `$${Math.round(v).toLocaleString()}`;
  const pct = (v) => (v === null || v === undefined) ? 'N/A' : `${v.toFixed(0)}%`;
  const starCount = Math.max(0, Math.min(5, facility.stars || 0));
  const starsFilled = '★'.repeat(starCount);
  const starsEmpty = '☆'.repeat(5 - starCount);
  const safetyColor = starCount <= 1 ? '#DC2626' : starCount <= 2 ? '#EA580C' : starCount <= 3 ? '#D97706' : '#059669';
  const propublica = `https://projects.propublica.org/nursing-homes/homes/h-${ccn}`;
  const medicare = `https://www.medicare.gov/care-compare/details/nursing-home/${ccn}`;
  const hcris = `https://www.cms.gov/Research-Statistics-Data-and-Systems/Downloadable-Public-Use-Files/Cost-Reports/Cost-Reports-by-Fiscal-Year`;

  // Bottom line — dynamic based on data
  const getBottomLine = () => {
    const parts = [];
    if (facility.jeopardy_count > 0)
      parts.push(`Inspectors found <strong>serious danger to residents ${facility.jeopardy_count} time${facility.jeopardy_count !== 1 ? 's' : ''}</strong> — risk of serious injury or death.`);
    else if (facility.harm_count > 0)
      parts.push(`Residents were hurt <strong>${facility.harm_count} time${facility.harm_count !== 1 ? 's' : ''}</strong> according to inspection reports.`);
    if (facility.total_fines > 0)
      parts.push(`This facility has been fined <strong>${fmt(facility.total_fines)}</strong>.`);
    if (facility.zero_rn_pct > 25)
      parts.push(`On <strong>${pct(facility.zero_rn_pct)} of days</strong>, there was no registered nurse in the building.`);
    if (facility.owner_portfolio_count > 1)
      parts.push(`The same company runs <strong>${facility.owner_portfolio_count} other facilities</strong>${facility.owner_avg_fines ? ` with average fines of ${fmt(facility.owner_avg_fines)} among those penalized` : ''}.`);
    if (parts.length === 0)
      parts.push('This facility has no major issues recorded in recent CMS data.');
    return parts.join(' ');
  };

  // Minor deficiency count
  const minorCount = Math.max(0, (facility.total_deficiencies || 0) - (facility.harm_count || 0) - (facility.jeopardy_count || 0));

  return (
    <div className="fp" ref={pageRef}>
      <Helmet>
        <title>{facility.name} — Safety Report | The Oversight Report</title>
        <meta name="description" content={`${facility.name} in ${facility.city}, ${facility.state}. ${facility.stars}/5 stars, risk score ${facility.composite?.toFixed(0)}/100. Staffing: ${facility.total_hprd?.toFixed(1)} HPRD. ${facility.total_deficiencies || 0} deficiencies. Independent safety data.`} />
        <meta property="og:title" content={`${facility.name} — Safety Report`} />
        <meta property="og:description" content={`${facility.stars}/5 stars · Risk: ${facility.composite?.toFixed(0)}/100 · ${facility.total_deficiencies || 0} deficiencies · ${facility.city}, ${facility.state}`} />
        <meta property="og:url" content={`https://oversightreports.com/facility/${facility.ccn}`} />
        <link rel="canonical" href={`https://oversightreports.com/facility/${facility.ccn}`} />
      </Helmet>
      {/* Header */}
      <div className="fp-header">
        {fromState ? (
          <Link to={`/?state=${fromState}`} className="fp-back">← Back to {facility.state} facilities</Link>
        ) : (
          <Link to="/" className="fp-back">← Back to Map</Link>
        )}
        <h2 className="fp-badge">Facility Report Card</h2>
        <div className="fp-watchlist-group">
          <button
            className={`fp-watchlist-btn ${isWatched(ccn) ? 'fp-watchlist-btn--active' : ''}`}
            onClick={() => { if (!isWatched(ccn)) { addFacility(ccn, facility.name); window.plausible && window.plausible('Star-Favorite', {props: {facility: facility.name, ccn: facility.ccn}}); } else { removeFacility(ccn); } }}
            title={isWatched(ccn) ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isWatched(ccn) ? '★ Favorited' : '☆ Favorite'}
          </button>
          <span className="fp-compare-hint">
            {watchlist.length >= 2
              ? <Link to="/watchlist">You have {watchlist.length} favorites — compare them →</Link>
              : 'Star facilities to compare them in My Favorites'}
          </span>
        </div>
        <DownloadButton facility={facility} nearbyFacilities={nearbyForPDF} allFacilities={allFacilities} />
      </div>

      <div className="fp-body">
        <div className="fp-intro-card" style={{ borderTop: `4px solid ${safetyColor}` }}>
        {/* Facility Name + Star Badge */}
        <div className="fp-name-row">
          <h1 className="fp-name">{facility.name}</h1>
          <div className="fp-star-badge" style={{ '--safety-color': safetyColor }}>
            <div className="fp-star-badge-number">{starCount}</div>
            <div className="fp-star-badge-label">out of 5</div>
          </div>
        </div>
        <div className="fp-star-row">
          <span className="fp-stars-visual" style={{ '--safety-color': safetyColor }}>
            <span className="fp-stars-filled">{starsFilled}</span><span className="fp-stars-empty">{starsEmpty}</span>
          </span>
          <span className="fp-star-caption">CMS Overall Rating <MetricTooltip title="CMS Five-Star Rating">CMS rates every nursing home 1–5 stars based on inspections, staffing, and quality measures. But this rating has serious limitations — it combines very different data types into a single score, and the staffing component relies partly on self-reported data that facilities can inflate. Use it as a starting point, not the final word.</MetricTooltip></span>
        </div>
        <p className="fp-meta">
          {facility.city}, {facility.state} | {facility.beds || '—'} beds
          {' · '}
          <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica Report</a>
          {' · '}
          <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Compare</a>
        </p>
        <p className="fp-ccn">CMS CCN: {ccn}</p>

        {/* PE/REIT Ownership Badges */}
        {(facility.pe_owned || facility.reit_owned) && (
          <div className="ownership-badges">
            {facility.pe_owned && (
              <span className="ownership-badge ownership-badge--pe" title={facility.pe_owner_name || 'Private Equity Owned'}>
                Private Equity Owned
                {facility.pe_owner_name && <span className="ownership-badge-detail"> · {facility.pe_owner_name}</span>}
              </span>
            )}
            {facility.reit_owned && (
              <span className="ownership-badge ownership-badge--reit" title={facility.reit_owner_name || 'REIT Owned'}>
                REIT Owned
                {facility.reit_owner_name && <span className="ownership-badge-detail"> · {facility.reit_owner_name}</span>}
              </span>
            )}
          </div>
        )}

        {/* Ownership Change Alert */}
        {facility.ownership_changed_recently && (
          <div className="ownership-change-alert">
            <strong>Ownership Change:</strong> This facility was sold on {facility.ownership_change_date || 'recently'}.
            {facility.new_owner_name && <> New owner: {facility.new_owner_name}</>}
          </div>
        )}

        {/* AHCA Board Context */}
        {facility.chain_name && ahcaData?.[facility.chain_name.toUpperCase()] && (
          <div className="ahca-context-line">
            <span className="ahca-context-icon">🏛</span>
            This facility's parent chain ({facility.chain_name}) is led by an AHCA Board of Governors member. AHCA spent $17M+ since 2020 lobbying on nursing home policy, including against federal staffing requirements.
            {' '}
            <span className="ahca-context-source">
              Source: AHCA Board announcement (ahcancal.org) · OpenSecrets.org
            </span>
          </div>
        )}

        {/* Bottom Line Card */}
        <div className="bottom-line-card">
          <div className="bottom-line-label">⚠ Bottom Line</div>
          <div className="bottom-line-text" dangerouslySetInnerHTML={{ __html: getBottomLine() }} />
          <div className="bottom-line-source">
            Source: CMS Provider Data, Health Deficiencies, Penalties, Ownership · Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a>
          </div>
        </div>
        </div>{/* end fp-intro-card */}

        {/* Change #1: Sticky Section Nav */}
        <nav className="section-nav-sticky">
          <div className="section-nav-inner">
            {[
              { id: 's-safety', label: 'Safety' },
              { id: 's-inspections', label: 'Inspections' },
              { id: 's-complaints', label: 'Complaints' },
              { id: 's-staffing', label: 'Staffing' },
              { id: 's-quality', label: 'Quality' },
              { id: 's-fines', label: 'Fines' },
              { id: 's-fire', label: 'Fire Safety' },
              { id: 's-ownership', label: 'Ownership' },
              { id: 's-questions', label: 'Questions' },
            ].map(sec => (
              <a key={sec.id} href={`#${sec.id}`} className="section-nav-link" onClick={e => {
                e.preventDefault();
                document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>{sec.label}</a>
            ))}
          </div>
        </nav>

        {/* Section 01 — Safety Score */}
        <div className="section" id="s-safety">
          <div className="section-header-row">
            <div className="section-number">01</div>
            <div className="section-title">Safety Score</div>
            <span className="badge-updated">Updated</span>
            <span className="badge-source">6 METRICS</span>
          </div>
          <p className="section-subtitle">6 key safety metrics — all drawn from federal CMS data, not the facility's self-reported numbers</p>
          <div className="data-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {/* Row 1 */}
          {(() => {
            const val = facility.total_deficiencies || 0;
            const natlAvg = nationalBenchmarks.total_deficiencies || 28.4;
            const stateAvg = stateBenchmarks.total_deficiencies;
            const sevColor = val > natlAvg * 2 ? 'var(--accent-red, #DC2626)' : val > natlAvg ? 'var(--accent-orange, #EA580C)' : 'var(--accent-green, #059669)';
            const pctPos = Math.min(100, (val / (natlAvg * 3)) * 100);
            const avgPos = Math.min(100, (natlAvg / (natlAvg * 3)) * 100);
            return (
              <div className="data-cell" style={{ borderTop: `3px solid ${sevColor}` }}>
                <div className={`data-cell-value ${val > 20 ? 'val-red' : 'val-green'}`}>{val}</div>
                <div className="data-cell-label">Total Deficiencies <MetricTooltip title="What are deficiencies?" benchmark={`State avg: ${stateAvg?.toFixed(1) || 'N/A'} · National: ${natlAvg.toFixed(1)}`}>Every nursing home is inspected at least once a year by state surveyors. A "deficiency" is a specific problem they found — anything from a minor paperwork issue to a condition that put residents in serious danger. More deficiencies generally means more problems found during inspections.</MetricTooltip></div>
                <div className="data-cell-context">State avg: {stateAvg?.toFixed(1) || 'N/A'} · National: {natlAvg.toFixed(1)}</div>
                <div className="data-cell-position">
                  <div className="position-track">
                    <div className="position-avg" style={{ left: `${avgPos}%` }} title="National avg" />
                    <div className="position-dot" style={{ left: `${pctPos}%`, background: sevColor }} title="This facility" />
                  </div>
                  <div className="position-labels"><span>Better</span><span>Worse</span></div>
                </div>
              </div>
            );
          })()}
          {(() => {
            const val = facility.jeopardy_count || 0;
            const natlAvg = nationalBenchmarks.jeopardy_count || 0.7;
            const stateAvg = stateBenchmarks.jeopardy_count;
            const sevColor = val > 0 ? 'var(--accent-red, #DC2626)' : 'var(--accent-green, #059669)';
            const maxScale = Math.max(5, natlAvg * 5);
            const pctPos = Math.min(100, (val / maxScale) * 100);
            const avgPos = Math.min(100, (natlAvg / maxScale) * 100);
            return (
              <div className="data-cell" style={{ borderTop: `3px solid ${sevColor}` }}>
                <div className={`data-cell-value ${val > 0 ? 'val-red' : 'val-green'}`}>{val}</div>
                <div className="data-cell-label">Serious Danger <MetricTooltip title="'Immediate Jeopardy' — the worst finding" benchmark={`State avg: ${stateAvg?.toFixed(1) || 'N/A'} · National: ${natlAvg.toFixed(1)}`}>This is the most severe deficiency level. Inspectors concluded that conditions were so dangerous that residents faced risk of serious injury or death. Any number above zero is a red flag. Many facilities in the country have never received this citation.</MetricTooltip></div>
                <div className="data-cell-context">State avg: {stateAvg?.toFixed(1) || 'N/A'} · National: {natlAvg.toFixed(1)}</div>
                <div className="data-cell-position">
                  <div className="position-track">
                    <div className="position-avg" style={{ left: `${avgPos}%` }} title="National avg" />
                    <div className="position-dot" style={{ left: `${pctPos}%`, background: sevColor }} title="This facility" />
                  </div>
                  <div className="position-labels"><span>Better</span><span>Worse</span></div>
                </div>
              </div>
            );
          })()}
          {(() => {
            const val = facility.total_fines || 0;
            const natlAvg = nationalBenchmarks.total_fines || 47000;
            const stateAvg = stateBenchmarks.total_fines;
            const sevColor = val > natlAvg * 2 ? 'var(--accent-red, #DC2626)' : val > 0 ? 'var(--accent-orange, #EA580C)' : 'var(--accent-green, #059669)';
            const maxScale = Math.max(natlAvg * 4, val * 1.2);
            const pctPos = Math.min(100, (val / maxScale) * 100);
            const avgPos = Math.min(100, (natlAvg / maxScale) * 100);
            return (
              <div className="data-cell" style={{ borderTop: `3px solid ${sevColor}` }}>
                <div className={`data-cell-value ${val > 50000 ? 'val-red' : val > 0 ? 'val-orange' : 'val-green'}`}>{fmt(val)}</div>
                <div className="data-cell-label">Total Fines <MetricTooltip title="CMS monetary penalties" benchmark={`State avg: ${fmt(stateAvg)} · National: ${fmt(natlAvg)}`}>When CMS finds serious problems, they can fine a facility. Fines typically range from a few thousand dollars to hundreds of thousands. Some facilities treat fines as a cost of doing business. Compare this number to the state and national averages to see where this facility stands.</MetricTooltip></div>
                <div className="data-cell-context">State avg: {fmt(stateAvg)}</div>
                <div className="data-cell-position">
                  <div className="position-track">
                    <div className="position-avg" style={{ left: `${avgPos}%` }} title="National avg" />
                    <div className="position-dot" style={{ left: `${pctPos}%`, background: sevColor }} title="This facility" />
                  </div>
                  <div className="position-labels"><span>Better</span><span>Worse</span></div>
                </div>
              </div>
            );
          })()}
          {/* Row 2 */}
          {(() => {
            const val = facility.zero_rn_pct || 0;
            const sevColor = val > 5 ? 'var(--accent-red, #DC2626)' : val > 0 ? 'var(--accent-orange, #EA580C)' : 'var(--accent-green, #059669)';
            const pctPos = Math.min(100, val);
            return (
              <div className="data-cell" style={{ borderTop: `3px solid ${sevColor}` }}>
                <div className={`data-cell-value ${val > 5 ? 'val-red' : 'val-green'}`}>{pct(facility.zero_rn_pct)}</div>
                <div className="data-cell-label">Zero-RN Days <MetricTooltip title="Days with no Registered Nurse">The percentage of days last quarter when this facility had zero Registered Nurse hours. An RN is the most qualified clinical professional on a nursing home floor — they assess changes in condition, catch medication errors, and handle emergencies. Federal law requires an RN on site at least 8 hours a day.</MetricTooltip></div>
                <div className="data-cell-context">Days with no registered nurse on site</div>
                <div className="data-cell-position">
                  <div className="position-track">
                    <div className="position-avg" style={{ left: '0%' }} title="Ideal: 0%" />
                    <div className="position-dot" style={{ left: `${pctPos}%`, background: sevColor }} title="This facility" />
                  </div>
                  <div className="position-labels"><span>0%</span><span>100%</span></div>
                </div>
              </div>
            );
          })()}
          {(() => {
            const complaintDates = new Set((deficiencyDetails || []).filter(d => d.is_complaint === true).map(d => d.survey_date));
            const complaintInvestigations = complaintDates.size;
            const natlAvg = 7;
            const sevColor = complaintInvestigations > natlAvg ? 'var(--accent-red, #DC2626)' : complaintInvestigations > 3 ? 'var(--accent-orange, #EA580C)' : 'var(--accent-green, #059669)';
            const maxScale = Math.max(natlAvg * 3, complaintInvestigations * 1.2);
            const pctPos = Math.min(100, (complaintInvestigations / maxScale) * 100);
            const avgPos = Math.min(100, (natlAvg / maxScale) * 100);
            return (
              <div className="data-cell" style={{ borderTop: `3px solid ${sevColor}` }}>
                <div className={`data-cell-value ${complaintInvestigations > 7 ? 'val-red' : complaintInvestigations > 3 ? 'val-orange' : 'val-green'}`}>{complaintInvestigations}</div>
                <div className="data-cell-label">Complaint Investigations <MetricTooltip title="Complaint-triggered inspections" benchmark="National avg: 7 (last 3 years)">When someone files a complaint about a nursing home, CMS may send surveyors for an unannounced investigation. Each date represents a separate complaint survey visit. A high number may indicate recurring problems reported by residents, families, or staff.</MetricTooltip></div>
                <div className="data-cell-context">Last 3 years · avg: {natlAvg}</div>
                <div className="data-cell-position">
                  <div className="position-track">
                    <div className="position-avg" style={{ left: `${avgPos}%` }} title="National avg" />
                    <div className="position-dot" style={{ left: `${pctPos}%`, background: sevColor }} title="This facility" />
                  </div>
                  <div className="position-labels"><span>Better</span><span>Worse</span></div>
                </div>
                <div className="stat-card-callout">
                  <strong>CMS removed</strong> this from Care Compare on 2/25/26. We rebuilt it from inspection records.
                </div>
              </div>
            );
          })()}
          {(() => {
            const fireDefs = facility.fire_deficiency_count || 0;
            const natlAvg = 14.3;
            const sevColor = fireDefs > natlAvg ? 'var(--accent-red, #DC2626)' : fireDefs > 5 ? 'var(--accent-orange, #EA580C)' : 'var(--accent-green, #059669)';
            const maxScale = Math.max(natlAvg * 3, fireDefs * 1.2);
            const pctPos = Math.min(100, (fireDefs / maxScale) * 100);
            const avgPos = Math.min(100, (natlAvg / maxScale) * 100);
            return (
              <div className="data-cell" style={{ borderTop: `3px solid ${sevColor}` }}>
                <div className={`data-cell-value ${fireDefs > 14.3 ? 'val-red' : fireDefs > 5 ? 'val-orange' : 'val-green'}`}>{fireDefs}</div>
                <div className="data-cell-label">Fire Safety Violations <MetricTooltip title="Life Safety Code violations" benchmark="National avg: 14.3">Fire safety deficiencies are cited during Life Safety Code inspections — a separate survey from the health inspection. These cover fire alarms, sprinkler systems, emergency exits, smoke barriers, and electrical safety. Facilities with many fire safety violations may have deferred maintenance.</MetricTooltip></div>
                <div className="data-cell-context">Nat'l avg: {natlAvg}{fireDefs <= natlAvg && fireDefs > 0 ? ' \u2713' : ''}</div>
                <div className="data-cell-position">
                  <div className="position-track">
                    <div className="position-avg" style={{ left: `${avgPos}%` }} title="National avg" />
                    <div className="position-dot" style={{ left: `${pctPos}%`, background: sevColor }} title="This facility" />
                  </div>
                  <div className="position-labels"><span>Better</span><span>Worse</span></div>
                </div>
              </div>
            );
          })()}
          </div>
        </div>

        {/* Section 02 — What Did Inspectors Find? */}
        <div className="section" id="s-inspections">
          <div className="section-header-row">
            <div className="section-number">02</div>
            <div className="section-title">What Did Inspectors Find?</div>
            <span className="badge-updated">Updated</span>
            <span className="badge-source">CMS Deficiencies</span>
          </div>
          <p className="section-subtitle">Health inspection results — severity-graded citations from unannounced federal surveys</p>

          {/* Computed stats from deficiency details */}
          {(() => {
            const avgDaysToCorrect = deficiencyDetails?.length > 0
              ? Math.round(deficiencyDetails.filter(d => d.correction_date && d.survey_date).reduce((sum, d) => {
                  const diff = (new Date(d.correction_date) - new Date(d.survey_date)) / (1000 * 60 * 60 * 24);
                  return sum + Math.max(0, diff);
                }, 0) / (deficiencyDetails.filter(d => d.correction_date && d.survey_date).length || 1))
              : null;

            const ftagSurveys = {};
            deficiencyDetails?.forEach(d => {
              if (d.ftag) {
                if (!ftagSurveys[d.ftag]) ftagSurveys[d.ftag] = new Set();
                ftagSurveys[d.ftag].add(d.survey_date);
              }
            });
            const repeatCount = Object.values(ftagSurveys).filter(s => s.size > 1).length;

            return (
              <>
                {deficiencyDetails && deficiencyDetails.length > 0 && (
                  <div className="data-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
                    {avgDaysToCorrect != null && (
                      <div className="data-cell">
                        <div className={`data-cell-value ${avgDaysToCorrect > 40 ? 'val-red' : avgDaysToCorrect > 32 ? 'val-orange' : 'val-green'}`}>{avgDaysToCorrect} days</div>
                        <div className="data-cell-label">Avg Days to Correct</div>
                        <div className="data-cell-context">Nat'l avg: 32 days</div>
                      </div>
                    )}
                    <div className="data-cell">
                      <div className={`data-cell-value ${repeatCount > 5 ? 'val-red' : repeatCount > 3 ? 'val-orange' : 'val-green'}`}>{repeatCount}</div>
                      <div className="data-cell-label">Repeat Offender Citations</div>
                      <div className="data-cell-context">Same F-tag cited again</div>
                    </div>
                  </div>
                )}

                {deficiencyDetails && deficiencyDetails.length > 0 && (avgDaysToCorrect > 32 || repeatCount > 3) && (
                  <div className="verdict-banner caution">
                    <div className="verdict-icon caution">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <div className="verdict-text">
                      <h3 className="caution">
                        {repeatCount > 3 ? 'Slow to Fix Problems & Repeat Offender' : 'Slow to Correct Deficiencies'}
                      </h3>
                      <p>
                        {avgDaysToCorrect > 32 && <>Takes <strong>{avgDaysToCorrect} days on average</strong> to correct problems — {Math.round((avgDaysToCorrect / 32 - 1) * 100)}% longer than the national average of 32 days. </>}
                        {repeatCount > 0 && <><strong>{repeatCount} violation{repeatCount !== 1 ? 's' : ''}</strong> cited in multiple inspection cycles.</>}
                      </p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {facility.total_deficiencies || 0} total deficiency citations.
            {facility.jeopardy_count > 0 && <> <strong style={{ color: 'var(--accent-red, #f85149)' }}>{facility.jeopardy_count}</strong> were classified as <strong style={{ color: 'var(--accent-red, #f85149)' }}>serious danger</strong> — the most severe level.</>}
          </p>
          {/* Change #3: Deficiency cards with filter chips + pagination */}
          {deficiencyDetails && deficiencyDetails.length > 0 ? (() => {
            // Get unique years for year filter chips
            const defYears = [...new Set(deficiencyDetails.map(d => d.survey_date ? new Date(d.survey_date).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a);

            // Apply severity + year filters
            const filtered = deficiencyDetails.filter(d => {
              if (defSeverityFilter !== 'all') {
                if (defSeverityFilter === 'danger' && d.severity_label !== 'Immediate Jeopardy') return false;
                if (defSeverityFilter === 'harm' && d.severity_label !== 'Actual Harm') return false;
                if (defSeverityFilter === 'minor' && (d.severity_label === 'Immediate Jeopardy' || d.severity_label === 'Actual Harm')) return false;
              }
              if (defYearFilter !== 'all') {
                const yr = d.survey_date ? new Date(d.survey_date).getFullYear() : null;
                if (String(yr) !== defYearFilter) return false;
              }
              return true;
            }).sort((a, b) => {
              const severityOrder = { 'Immediate Jeopardy': 0, 'Actual Harm': 1 };
              return (severityOrder[a.severity_label] ?? 2) - (severityOrder[b.severity_label] ?? 2);
            });

            const totalPages = Math.ceil(filtered.length / DEF_PAGE_SIZE);
            const currentPage = Math.min(defPage, totalPages - 1);
            const visible = filtered.slice(currentPage * DEF_PAGE_SIZE, (currentPage + 1) * DEF_PAGE_SIZE);

            // Severity counts for chips
            const dangerCount = deficiencyDetails.filter(d => d.severity_label === 'Immediate Jeopardy').length;
            const harmCount = deficiencyDetails.filter(d => d.severity_label === 'Actual Harm').length;
            const minorDefCount = deficiencyDetails.length - dangerCount - harmCount;

            return (
              <>
                {/* Filter chips */}
                <div className="def-filter-row">
                  <div className="def-filter-group">
                    <span className="def-filter-label">Severity:</span>
                    <button className={`def-chip ${defSeverityFilter === 'all' ? 'active' : ''}`} onClick={() => { setDefSeverityFilter('all'); setDefPage(0); }}>All ({deficiencyDetails.length})</button>
                    {dangerCount > 0 && <button className={`def-chip chip-danger ${defSeverityFilter === 'danger' ? 'active' : ''}`} onClick={() => { setDefSeverityFilter('danger'); setDefPage(0); }}>Serious Danger ({dangerCount})</button>}
                    {harmCount > 0 && <button className={`def-chip chip-harm ${defSeverityFilter === 'harm' ? 'active' : ''}`} onClick={() => { setDefSeverityFilter('harm'); setDefPage(0); }}>Residents Hurt ({harmCount})</button>}
                    {minorDefCount > 0 && <button className={`def-chip chip-minor ${defSeverityFilter === 'minor' ? 'active' : ''}`} onClick={() => { setDefSeverityFilter('minor'); setDefPage(0); }}>Minor ({minorDefCount})</button>}
                  </div>
                  {defYears.length > 1 && (
                    <div className="def-filter-group">
                      <span className="def-filter-label">Year:</span>
                      <button className={`def-chip ${defYearFilter === 'all' ? 'active' : ''}`} onClick={() => { setDefYearFilter('all'); setDefPage(0); }}>All Years</button>
                      {defYears.slice(0, 4).map(yr => (
                        <button key={yr} className={`def-chip ${defYearFilter === String(yr) ? 'active' : ''}`} onClick={() => { setDefYearFilter(String(yr)); setDefPage(0); }}>{yr}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="deficiency-cards">
                  {visible.map((def, idx) => {
                    const severityClass = def.severity_label === 'Immediate Jeopardy' ? 'severity-danger'
                      : def.severity_label === 'Actual Harm' ? 'severity-harm' : 'severity-minor';
                    const severityText = def.severity_label === 'Immediate Jeopardy' ? 'Serious Danger'
                      : def.severity_label === 'Actual Harm' ? 'Residents Hurt' : 'Minor';
                    const year = def.survey_date ? new Date(def.survey_date).getFullYear() : '';
                    const surveyLabel = def.is_complaint ? 'Complaint Investigation' : 'Standard Health Survey';
                    const ftagNum = def.ftag ? def.ftag.replace('F-0', 'F').replace('F-', 'F') : '';
                    return (
                      <div className="deficiency-card" key={idx}>
                        <span className={`deficiency-severity ${severityClass}`}>{severityText}</span>
                        <div className="deficiency-card-body">
                          <div className="deficiency-text">{def.description}{ftagNum && <> ({ftagNum})</>}</div>
                          <div className="deficiency-meta">{surveyLabel} · {year} · Category: {def.category}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="def-pagination">
                    <button className="def-page-btn" disabled={currentPage === 0} onClick={() => setDefPage(p => p - 1)}>← Previous</button>
                    <span className="def-page-info">Page {currentPage + 1} of {totalPages} · Showing {filtered.length} citation{filtered.length !== 1 ? 's' : ''}</span>
                    <button className="def-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setDefPage(p => p + 1)}>Next →</button>
                  </div>
                )}

                {filtered.length === 0 && (
                  <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No citations match the selected filters.</p>
                )}
              </>
            );
          })() : (
            <div className="deficiency-cards">
              {facility.jeopardy_count > 0 && (
                <div className="deficiency-card">
                  <span className="deficiency-severity severity-danger">Serious Danger</span>
                  <div className="deficiency-card-body">
                    <div className="deficiency-text">{facility.jeopardy_count} citation(s) — conditions so serious that residents faced risk of serious injury or death</div>
                  </div>
                </div>
              )}
              {facility.harm_count > 0 && (
                <div className="deficiency-card">
                  <span className="deficiency-severity severity-harm">Residents Hurt</span>
                  <div className="deficiency-card-body">
                    <div className="deficiency-text">{facility.harm_count} citation(s) — facility practices caused actual harm to residents</div>
                  </div>
                </div>
              )}
              {minorCount > 0 && (
                <div className="deficiency-card">
                  <span className="deficiency-severity severity-minor">Minor</span>
                  <div className="deficiency-card-body">
                    <div className="deficiency-text">{minorCount} citation(s) — technical violations that did not cause direct harm</div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="source-line">Source: CMS Health Deficiencies Data · Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a></div>

          <WhatDoesThisMean question="How do nursing home inspections work?">
            <p>
              Every nursing home that accepts Medicare or Medicaid money must be inspected at least once every 12–15 months by state surveyors working for CMS. Surveyors arrive unannounced and spend several days observing care, reviewing records, and interviewing residents and staff.
            </p>
            <KeyPoint>
              <strong>"Serious Danger" (Immediate Jeopardy)</strong> means inspectors found conditions so dangerous that residents faced imminent risk of serious injury or death. This is the most severe finding possible.
            </KeyPoint>
            <KeyPoint color="#D97706">
              <strong>"Residents Hurt" (Actual Harm)</strong> means inspectors documented that facility practices caused real, measurable harm to one or more residents.
            </KeyPoint>
            <KeyPoint color="#64748B">
              <strong>Minor deficiencies</strong> are problems that didn't cause direct harm but could if not corrected — things like documentation gaps, medication storage issues, or infection control lapses.
            </KeyPoint>
            <p>
              <strong>Why this matters:</strong> Deficiency counts alone don't tell the whole story. A facility with 5 serious-danger citations is far more concerning than one with 30 minor paperwork issues. Always look at the severity, not just the total.
            </p>
          </WhatDoesThisMean>
        </div>

        {/* Section 03 — Complaints & Abuse History */}
        <div className="section" id="s-complaints">
          <div className="section-header-row">
            <div className="section-number">03</div>
            <div className="section-title">Complaints &amp; Abuse History</div>
            <span className="badge-new">New</span>
            <span className="badge-source">CMS Inspections</span>
          </div>
          <p className="section-subtitle">Complaint investigations, abuse and neglect citations, and Special Focus Facility status</p>

          {/* SFF Banner */}
          {facility.flags?.some(f => f.includes('SPECIAL FOCUS')) && (
            <div className="sff-banner">
              <span className="sff-dot" />
              <div className="sff-content">
                <span className="sff-label">CMS Special Focus Facility (SFF)</span>
                <span className="sff-explain">Designated by CMS as one of approximately 88 nursing homes (out of 14,713) with a persistent pattern of serious quality issues. SFF facilities receive twice the normal inspection frequency. This is an official federal designation — not our assessment.</span>
              </div>
            </div>
          )}

          {(() => {
            // Compute complaint stats from deficiency details
            const complaintDefs = deficiencyDetails?.filter(d => d.is_complaint === true) || [];

            // Count unique complaint investigation dates
            const complaintDates = new Set(complaintDefs.map(d => d.survey_date));
            const complaintInvestigations = complaintDates.size;

            // Abuse/neglect citations (F600-F609)
            const abuseDefs = (deficiencyDetails || []).filter(d => {
              if (!d.ftag) return false;
              const num = parseInt(d.ftag.replace(/[^0-9]/g, ''));
              return num >= 600 && num <= 609;
            });

            // Complaint investigations by year (count unique survey dates, not individual citations)
            const complaintDatesByYear = {};
            complaintDefs.forEach(d => {
              const yr = d.survey_date ? new Date(d.survey_date).getFullYear() : null;
              if (yr) {
                if (!complaintDatesByYear[yr]) complaintDatesByYear[yr] = new Set();
                complaintDatesByYear[yr].add(d.survey_date);
              }
            });
            const complaintsByYear = {};
            Object.entries(complaintDatesByYear).forEach(([yr, dates]) => { complaintsByYear[yr] = dates.size; });
            const years = Object.keys(complaintsByYear).sort((a, b) => b - a);
            const maxComplaintsInYear = Math.max(...Object.values(complaintsByYear), 7);

            // Led to penalties
            const penaltyCount = facility.fine_count || 0;

            return (
              <>
                {/* Summary stat cards */}
                <div className="data-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="data-cell">
                    <div className={`data-cell-value ${complaintInvestigations > 7 ? 'val-red' : complaintInvestigations > 3 ? 'val-orange' : 'val-green'}`}>{complaintInvestigations}</div>
                    <div className="data-cell-label">Complaint Investigations</div>
                    <div className="data-cell-context">Last 3 years · avg: 7</div>
                  </div>
                  <div className="data-cell">
                    <div className={`data-cell-value ${abuseDefs.length > 0 ? 'val-red' : 'val-green'}`}>{abuseDefs.length}</div>
                    <div className="data-cell-label">Abuse/Neglect Citations</div>
                    <div className="data-cell-context">F600–F609 range</div>
                  </div>
                  <div className="data-cell">
                    <div className={`data-cell-value ${penaltyCount > 0 ? 'val-orange' : 'val-green'}`}>{penaltyCount}</div>
                    <div className="data-cell-label">Led to Penalties</div>
                    <div className="data-cell-context">Fines or sanctions</div>
                  </div>
                </div>

                {/* Verdict banner */}
                {(complaintInvestigations > 5 || abuseDefs.length > 0) && (
                  <div className={`verdict-banner ${abuseDefs.length > 0 ? 'concern' : 'caution'}`}>
                    <div className={`verdict-icon ${abuseDefs.length > 0 ? 'concern' : 'caution'}`}>
                      {abuseDefs.length > 0 ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      )}
                    </div>
                    <div className="verdict-text">
                      <h3 className={abuseDefs.length > 0 ? 'concern' : 'caution'}>
                        {abuseDefs.length > 0 ? 'Pattern of Complaints With Abuse Citations' : 'Above-Average Complaint Activity'}
                      </h3>
                      <p>
                        <strong>{complaintInvestigations} complaint investigation{complaintInvestigations !== 1 ? 's' : ''}</strong> in 3 years
                        {complaintInvestigations > 7 && <> — above the 7.0 national average</>}
                        {abuseDefs.length > 0 && <>. <strong>{abuseDefs.length} resulted in formal abuse or neglect citation{abuseDefs.length !== 1 ? 's' : ''}</strong> under F600–F609, the federal standards for resident protection from abuse</>}
                        .
                      </p>
                    </div>
                  </div>
                )}

                {/* CMS callout note */}
                <div className="cms-callout">
                  <div className="cms-callout-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </div>
                  <p><strong>Note:</strong> CMS removed complaint counts from Care Compare on Feb 25, 2026. We rebuilt this number from publicly available federal inspection records. <Link to="/data-transparency">How we calculate this →</Link></p>
                </div>

                {/* Complaint Investigations by Year */}
                {years.length > 0 && (
                  <>
                    <div className="complaints-sub-label">Complaint Investigations by Year</div>
                    {years.map(yr => (
                      <div key={yr} className="yr-row">
                        <div className="yr-label">{yr}</div>
                        <div className="yr-track">
                          <div
                            className={`yr-fill ${complaintsByYear[yr] > 3 ? 'red' : 'orange'}`}
                            style={{ width: `${(complaintsByYear[yr] / maxComplaintsInYear) * 100}%` }}
                          >
                            {complaintsByYear[yr]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Change #4: Abuse & Neglect Citations — Grouped by F-Tag */}
                {abuseDefs.length > 0 && (
                  <>
                    <div className="complaints-sub-label">Abuse &amp; Neglect Citations</div>
                    {(() => {
                      // Group by F-tag
                      const grouped = {};
                      abuseDefs.forEach(def => {
                        const ftagNum = def.ftag ? def.ftag.replace('F-0', 'F').replace('F-', 'F') : 'Unknown';
                        if (!grouped[ftagNum]) grouped[ftagNum] = [];
                        grouped[ftagNum].push(def);
                      });

                      // F-tag descriptions
                      const ftagDescriptions = {
                        'F600': 'Free from Abuse and Neglect',
                        'F601': 'Abuse Investigation & Reporting',
                        'F602': 'Neglect Investigation & Reporting',
                        'F603': 'Free from Exploitation',
                        'F604': 'Right to be Free from Restraints',
                        'F605': 'Proper Use of Bed Rails',
                        'F606': 'Not Employ/Engage Abusive Staff',
                        'F607': 'Develop & Implement Abuse Policies',
                        'F608': 'Reporting of Crimes',
                        'F609': 'Timely Reporting of Allegations',
                      };

                      return Object.entries(grouped).map(([ftag, defs]) => {
                        const harmCount = defs.filter(d => d.severity_label === 'Immediate Jeopardy' || d.severity_label === 'Actual Harm').length;
                        const hasActualHarm = harmCount > 0;
                        const desc = ftagDescriptions[ftag] || 'Abuse/Neglect Regulation';
                        return (
                          <div key={ftag} className={`abuse-group${hasActualHarm ? ' severe' : ''}`}>
                            <div className="abuse-group-header">
                              <span className={`f-tag ${hasActualHarm ? 'red' : 'orange'}`}>{ftag}</span>
                              <div className="abuse-group-info">
                                <div className="abuse-group-title">{desc}</div>
                                <div className="abuse-group-stats">
                                  {defs.length} citation{defs.length > 1 ? 's' : ''}
                                  {harmCount > 0 && <> · <strong style={{ color: 'var(--accent-red, #f85149)' }}>{harmCount} with actual harm</strong></>}
                                </div>
                              </div>
                            </div>
                            {defs.map((def, idx) => {
                              const year = def.survey_date ? new Date(def.survey_date).getFullYear() : '';
                              const harmLabel = def.severity_label === 'Immediate Jeopardy' ? 'Actual Harm' : def.severity_label === 'Actual Harm' ? 'Actual Harm' : 'No Actual Harm';
                              const surveyType = def.is_complaint ? 'Complaint Investigation' : 'Standard Health Survey';
                              return (
                                <div key={idx} className="abuse-group-item">
                                  <div className="abuse-text">{def.description}</div>
                                  <div className="abuse-detail">{harmLabel} · {surveyType} · {year}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                  </>
                )}
              </>
            );
          })()}

          <div className="source-line" style={{ marginTop: '16px' }}>Source: CMS Health Deficiencies &amp; Inspection Records · <a href="https://data.cms.gov" target="_blank" rel="noopener noreferrer">data.cms.gov</a></div>
          <WhatDoesThisMean question="What are complaint investigations?">
            <p>
              Anyone can file a complaint about a nursing home — a resident, family member, staff member, or visitor. When CMS or a state survey agency receives a complaint, they investigate it separately from the regular annual survey.
            </p>
            <KeyPoint>
              <strong>If inspectors find a problem</strong> during a complaint investigation, they issue a deficiency citation — just like in a standard inspection. Those citations appear in this section.
            </KeyPoint>
            <KeyPoint color="#D97706">
              <strong>CMS removed complaint counts from Care Compare in February 2026.</strong> We reconstructed complaint-triggered citations from detailed inspection records so you can still see this important context.
            </KeyPoint>
            <p>
              <strong>How to file a complaint:</strong> Contact your state&rsquo;s Long-Term Care Ombudsman or file directly with your state survey agency. Complaints can be made anonymously.
            </p>
          </WhatDoesThisMean>
        </div>

        {/* Contextual explainer banners — auto-triggered by data */}
        <ExplainerBanners facility={facility} />

        {/* Section 04 — How Much Care Do Residents Get? */}
        <div className="section" id="s-staffing">
          <div className="section-header-row">
            <div className="section-number">04</div>
            <div className="section-title">How Much Care Do Residents Get?</div>
            <span className="badge-updated">Updated</span>
          </div>
          <StaffingSection
            facility={facility}
            benchmarks={{ state: stateBenchmarks, national: nationalBenchmarks }}
          />

          {facility.zero_rn_pct > 0 && (
            <div className="alert-box" style={{ marginTop: '16px' }}>
              <strong>⚠ Zero-RN Days:</strong> This facility reported zero registered nurse hours on <strong>{pct(facility.zero_rn_pct)} of days</strong> (Q3 2025). Federal law requires RN coverage for at least 8 consecutive hours per day.
            </div>
          )}

          {facility.rn_gap_pct > 30 && (
            <div className="alert-box-yellow" style={{ marginTop: '12px' }}>
              <strong>⚠ Staffing Discrepancy:</strong> <strong>{facility.rn_gap_pct.toFixed(0)}%</strong> of this facility's self-reported RN hours are not verified by payroll records. It claims {(facility.self_report_rn * 60).toFixed(0)} min/resident/day but payroll shows {(facility.rn_hprd * 60).toFixed(0)} min. <em>Ask to see the posted daily staffing schedule — they are required to display it.</em>
            </div>
          )}

          {facility.staffing_trend && <StaffingTrendChart facility={facility} />}

          {/* What does this mean? — plain English staffing explainer */}
          <WhatDoesThisMean question="What do these staffing numbers actually mean?">
            <p>
              Nursing homes report their staffing to CMS through payroll records (called PBJ data).
              These numbers tell you how much direct nursing care each resident gets in a 24-hour period.
            </p>
            {facility.rn_hprd && (
              <KeyPoint>
                <strong>RN time: {Math.round(facility.rn_hprd * 60)} minutes/day</strong> means each resident gets about {Math.round(facility.rn_hprd * 60)} minutes of Registered Nurse care per day.
                {facility.rn_hprd < 0.55 ? " That's below the federal standard of 33 minutes." : ""}
              </KeyPoint>
            )}
            {facility.zero_rn_pct > 0 && (
              <KeyPoint color="#DC2626">
                <strong>Zero-RN days</strong> — on {pct(facility.zero_rn_pct)} of days, there was no Registered Nurse on duty at all. If a resident had a sudden medical change on those days, no one qualified to assess it was available.
              </KeyPoint>
            )}
            {facility.rn_turnover > 50 && (
              <KeyPoint color="#D97706">
                <strong>{Math.round(facility.rn_turnover)}% RN turnover</strong> — over the past year, more than half the RNs who worked here have left. Residents are being cared for by staff who may not know their medical history.
              </KeyPoint>
            )}
            <p>
              <strong>What families can do:</strong> Ask the facility directly — "How many RNs are on duty right now? How many were on duty last weekend?" If they can't or won't answer, that tells you something.
            </p>
          </WhatDoesThisMean>

          {/* Accordion: Federal Staffing Standards */}
          <div className={`accordion ${openAccordion === 'timeline' ? 'open' : ''}`} onClick={() => setOpenAccordion(openAccordion === 'timeline' ? null : 'timeline')}>
            <button className="accordion-toggle">
              Federal Staffing Standards — Timeline
              <span className="accordion-icon">+</span>
            </button>
            <div className="accordion-body">
              <div className="timeline-entry">
                <span className="timeline-date">Current federal requirement (42 CFR §483.35):</span> An RN must be on site for at least 8 consecutive hours per day, 7 days a week. A full-time RN must serve as Director of Nursing. Facilities must have "sufficient" licensed nursing staff 24 hours per day. There is no federal minimum hours-per-resident-per-day requirement.
              </div>
              <div className="timeline-entry">
                <span className="timeline-date">May 2024:</span> CMS finalized a rule that would have required 3.48 total nursing hours per resident per day (0.55 RN + 2.45 CNA) and 24/7 on-site RN coverage.
              </div>
              <div className="timeline-entry">
                <span className="timeline-date">April–June 2025:</span> Federal courts in Texas and Iowa struck down the rule. It never took effect at any facility.
              </div>
              <div className="timeline-entry">
                <span className="timeline-date">July 4, 2025:</span> The One Big Beautiful Bill Act (§71111) blocked enforcement of any staffing mandate through September 30, 2034.
              </div>
              <div className="timeline-entry">
                <span className="timeline-date">December 2, 2025:</span> CMS issued an interim final rule formally repealing the 2024 standards.
              </div>
              <div className="timeline-entry">
                <span className="timeline-date">February 2, 2026:</span> 18 state attorneys general asked CMS to implement a targeted staffing standard for for-profit nursing homes with high-risk financial practices.
              </div>
            </div>
          </div>

          {/* Accordion: Understanding Nursing Home Staff */}
          <div className={`accordion ${openAccordion === 'staff' ? 'open' : ''}`} onClick={() => setOpenAccordion(openAccordion === 'staff' ? null : 'staff')}>
            <button className="accordion-toggle">
              Understanding Nursing Home Staff
              <span className="accordion-icon">+</span>
            </button>
            <div className="accordion-body">
              <h4>Registered Nurses (RNs)</h4>
              <ul>
                <li>4-year college degree (BSN) or 2-year associate degree plus license</li>
                <li>Assess residents, create care plans, manage medications</li>
                <li>Supervise LPNs and CNAs</li>
                <li>Handle complex medical decisions and emergencies</li>
              </ul>
              <h4>Licensed Practical Nurses (LPNs)</h4>
              <ul>
                <li>1-year certificate program plus license</li>
                <li>Give medications, change wound dressings, monitor vital signs</li>
                <li>Work under RN supervision</li>
                <li>Cannot make care plan decisions</li>
              </ul>
              <h4>Certified Nursing Assistants (CNAs)</h4>
              <ul>
                <li>4–12 week training program</li>
                <li>Help residents with bathing, dressing, eating, toileting</li>
                <li>Take vital signs, report changes to nurses</li>
                <li>Provide most hands-on daily care</li>
                <li>Cannot give medications or perform medical procedures</li>
              </ul>
              <p style={{ marginTop: '12px' }}><strong>Why the mix matters:</strong> RNs can catch early warning signs of serious problems that LPNs and CNAs might miss. Studies linked higher RN staffing to fewer hospitalizations, pressure ulcers, and deaths (Needleman et al., NEJM, 2011).</p>
            </div>
          </div>
        </div>

        {/* Section 05 — How Are Residents Doing? (Quality Measures) */}
        <div className="section" id="s-quality">
          <div className="section-header-row">
            <div className="section-number">05</div>
            <div className="section-title">How Are Residents Doing?</div>
            <span className="badge-new">New</span>
            <span className="badge-source">CMS MDS + Claims QM &middot; Feb 2026</span>
          </div>
          {facility.quality_measures ? (() => {
            const qm = facility.quality_measures;

            // Helper: get verdict for a category
            const getVerdict = (catKey) => {
              if (catKey === 'memory') {
                const ap = getMeasureScore(qm, { code: '481', type: 'mds', stay: 'ls' });
                const apAvg = nationalQmAvgs['mds_ls_481'];
                if (ap != null && apAvg != null && ap > apAvg * 1.5) {
                  return { level: 'concern', title: 'Above-Average Antipsychotic Use',
                    text: <>This facility&rsquo;s antipsychotic medication rate is <strong>{ap.toFixed(1)}%</strong> &mdash; the national average is <strong>{apAvg.toFixed(1)}%</strong>. CMS excludes residents with schizophrenia, Huntington&rsquo;s, and Tourette syndrome from this measure.</> };
                }
                if (ap != null && apAvg != null && ap > apAvg * 1.1) {
                  return { level: 'caution', title: 'Antipsychotic Rate Above Average',
                    text: <>Antipsychotic medication rate of <strong>{ap.toFixed(1)}%</strong> vs the <strong>{apAvg.toFixed(1)}% national average</strong>. CMS excludes residents with schizophrenia, Huntington&rsquo;s, and Tourette syndrome from this measure.</> };
                }
                return null;
              }
              if (catKey === 'body') {
                const pu = getMeasureScore(qm, { code: '479', type: 'mds', stay: 'ls' });
                const puAvg = nationalQmAvgs['mds_ls_479'];
                const uti = getMeasureScore(qm, { code: '407', type: 'mds', stay: 'ls' });
                const utiAvg = nationalQmAvgs['mds_ls_407'];
                const puBad = pu != null && puAvg != null && pu > puAvg * 1.3;
                const utiBad = uti != null && utiAvg != null && uti > utiAvg * 1.3;
                if (puBad && utiBad) {
                  return { level: 'concern', title: 'Elevated Bedsore & Infection Rates',
                    text: <>Above-average pressure ulcers and urinary tract infections &mdash; the two clearest indicators of understaffing. Bedsores happen when residents aren&rsquo;t being repositioned. UTIs happen when residents aren&rsquo;t getting basic hygiene care.</> };
                }
                if (puBad || utiBad) {
                  return { level: 'caution', title: puBad ? 'Above-Average Bedsore Rate' : 'Above-Average UTI Rate',
                    text: puBad
                      ? <><strong>{pu.toFixed(1)}%</strong> of residents developed bedsores vs <strong>{puAvg.toFixed(1)}%</strong> national average. Bedsores are almost entirely preventable with proper repositioning.</>
                      : <><strong>{uti.toFixed(1)}%</strong> of residents have UTIs vs <strong>{utiAvg.toFixed(1)}%</strong> national average. UTIs in nursing homes often indicate delayed incontinence care.</> };
                }
                return null;
              }
              if (catKey === 'rehab') {
                const rh = getMeasureScore(qm, { code: '521', type: 'claims' });
                const rhAvg = nationalQmAvgs['claims_521'];
                if (rh != null && rhAvg != null && rh > rhAvg * 1.3) {
                  return { level: 'concern', title: 'High Re-hospitalization Rate',
                    text: <>This facility sends <strong>{rh.toFixed(1)}%</strong> of short-stay patients back to the hospital within 30 days &mdash; well above the <strong>{rhAvg.toFixed(1)}% national average</strong>. If you&rsquo;re choosing a facility for post-surgical rehab, this is the most important number.</> };
                }
                if (rh != null && rhAvg != null && rh > rhAvg * 1.1) {
                  return { level: 'caution', title: 'Above-Average Re-hospitalization',
                    text: <><strong>{rh.toFixed(1)}%</strong> re-hospitalization rate vs <strong>{rhAvg.toFixed(1)}%</strong> national average. Short-stay patients returning to the hospital is a sign the facility may not be managing complications well.</> };
                }
                return null;
              }
              if (catKey === 'vaccines') {
                const covidRes = getMeasureScore(qm, { code: 'covid_res', type: 'qrp_num' });
                const covidResAvg = nationalQmAvgs['qrp_num_covid_res'];
                const covidStaff = getMeasureScore(qm, { code: 'covid_staff', type: 'qrp_num' });
                const covidStaffAvg = nationalQmAvgs['qrp_num_covid_staff'];
                // Check COVID rates first (more clinically relevant)
                if (covidRes != null && covidResAvg != null && covidRes < covidResAvg * 0.7) {
                  return { level: 'concern', title: 'Low COVID-19 Vaccination Rates',
                    text: <>Only <strong>{covidRes.toFixed(1)}%</strong> of residents are up to date on COVID-19 vaccination vs <strong>{covidResAvg.toFixed(1)}%</strong> national average{covidStaff != null ? <> and <strong>{covidStaff.toFixed(1)}%</strong> of staff</> : ''}. In a congregate care setting where outbreaks can be lethal, this is a gap in infection prevention.</> };
                }
                if (covidRes != null && covidResAvg != null && covidRes < covidResAvg * 0.9) {
                  return { level: 'caution', title: 'Below-Average COVID-19 Vaccination',
                    text: <><strong>{covidRes.toFixed(1)}%</strong> of residents up to date on COVID-19 vs <strong>{covidResAvg.toFixed(1)}%</strong> national average. Vaccination reduces severe illness and death in the elderly.</> };
                }
                const flu = getMeasureScore(qm, { code: '454', type: 'mds', stay: 'ls' });
                const fluAvg = nationalQmAvgs['mds_ls_454'];
                if (flu != null && fluAvg != null && flu < fluAvg * 0.85) {
                  return { level: 'caution', title: 'Below-Average Vaccination Rates',
                    text: <>Flu vaccination rate of <strong>{flu.toFixed(1)}%</strong> is below the <strong>{fluAvg.toFixed(1)}%</strong> national average. In a congregate care setting, low vaccination rates increase outbreak risk for all residents.</> };
                }
                return null;
              }
              return null;
            };

            // Render a single indicator card
            const renderIndicator = (m) => {
              const score = getMeasureScore(qm, m);
              if (score == null) return null;
              const avgKey = m.stay ? `${m.type}_${m.stay}_${m.code}` : `${m.type}_${m.code}`;
              const avg = nationalQmAvgs[avgKey];
              const color = getQmColor(score, avg, m.lower);
              const indicatorId = `${m.type}-${m.code}`;
              const isExp = expandedQm === indicatorId;
              const maxScale = m.lower ? Math.max(score, avg || 1, 1) * 2.5 : 100;
              const barW = Math.min(score / maxScale * 100, 100);
              const mrkL = avg != null ? Math.min(avg / maxScale * 100, 100) : null;

              return (
                <div key={m.code} className={`qm-indicator${isExp ? ' expanded' : ''}`}>
                  <div className="qm-indicator-header">
                    <div className="qm-indicator-name">
                      {m.name}
                      <button className="qm-info-btn" onClick={() => setExpandedQm(isExp ? null : indicatorId)}>?</button>
                    </div>
                    <div className="qm-indicator-values">
                      <span className={`qm-fval ${color}`}>{score.toFixed(1)}%</span>
                      {avg != null && <>
                        <span className="qm-vs">vs</span>
                        <span className="qm-natl">{avg.toFixed(1)}% avg</span>
                      </>}
                    </div>
                  </div>
                  <div className="qm-bar-wrap">
                    <div className={`qm-bar ${color}`} style={{ width: `${barW}%` }} />
                    {mrkL != null && <div className="qm-natl-marker" style={{ left: `${mrkL}%` }} />}
                  </div>
                  <div className="qm-explainer">
                    <div className="qm-explainer-inner">
                      <strong>What this means:</strong> {score.toFixed(1)}% of residents &mdash; {m.explain}
                      {avg != null && <> National average: {avg.toFixed(1)}%.</>}
                      {' '}<em>Source: {m.type === 'claims' ? `Claims-Based Quality Measures (Code ${m.code})` : m.type === 'qrp_num' ? 'SNF Quality Reporting Program' : `MDS Quality Measures (Code ${m.code})`}</em>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <>
                <p className="qm-subtitle">
                  Federal quality measures for all long-stay and short-stay residents &mdash; reported quarterly by every Medicare-certified nursing home.
                </p>

                {/* Category tabs */}
                <div className="qm-tabs">
                  {QM_CATEGORIES.map(cat => {
                    if (cat.custom) {
                      // Workforce tab: count based on available facility-level fields
                      const wfCount = [facility.total_turnover, facility.rn_turnover].filter(v => v != null).length
                        + (facility.weekend_total_hprd != null && facility.total_hprd != null ? 1 : 0);
                      const wfFlag = facility.total_turnover != null && facility.total_turnover > 55 ? 'red' : facility.total_turnover != null && facility.total_turnover > 46.4 ? 'orange' : 'green';
                      return (
                        <button key={cat.key} className={`qm-tab${qmTab === cat.key ? ' active' : ''}`} onClick={() => { setQmTab(cat.key); setExpandedQm(null); }}>
                          {cat.label} <span className="tab-count">{wfCount}</span> <span className={`tab-flag ${wfFlag}`} />
                        </button>
                      );
                    }
                    const allM = cat.subgroups ? cat.subgroups.flatMap(g => g.measures) : cat.measures;
                    const count = allM.filter(m => getMeasureScore(qm, m) != null).length;
                    const flag = getCategoryFlag(qm, allM, nationalQmAvgs);
                    return (
                      <button key={cat.key} className={`qm-tab${qmTab === cat.key ? ' active' : ''}`} onClick={() => { setQmTab(cat.key); setExpandedQm(null); }}>
                        {cat.label} <span className="tab-count">{count}</span> <span className={`tab-flag ${flag}`} />
                      </button>
                    );
                  })}
                </div>

                {/* Active panel */}
                {QM_CATEGORIES.filter(cat => qmTab === cat.key).map(cat => {
                  // --- Workforce tab: custom rendering ---
                  if (cat.custom && cat.key === 'workforce') {
                    const totalTurn = facility.total_turnover;
                    const rnTurn = facility.rn_turnover;
                    const adminLeft = facility.admin_turnover;
                    const wkndHprd = facility.weekend_total_hprd;
                    const wkdayHprd = facility.total_hprd;
                    const wkndDrop = (wkdayHprd && wkndHprd) ? Math.round((1 - wkndHprd / wkdayHprd) * 100) : null;

                    // Verdict
                    const highTurnover = totalTurn != null && totalTurn > 55;
                    const bigWkndDrop = wkndDrop != null && wkndDrop > 25;
                    const wfVerdict = (highTurnover || bigWkndDrop) ? {
                      level: highTurnover ? 'concern' : 'caution',
                      title: highTurnover && bigWkndDrop ? 'High Staff Turnover & Weekend Staffing Drop'
                        : highTurnover ? 'High Staff Turnover'
                        : 'Significant Weekend Staffing Drop',
                      text: (highTurnover ? `${totalTurn}% annual nursing staff turnover \u2014 most nurses leave within a year. Continuity of care suffers when the people caring for your loved one are constantly changing.` : '')
                        + (highTurnover && bigWkndDrop ? ' ' : '')
                        + (bigWkndDrop ? `Weekends see a ${wkndDrop}% staffing drop vs weekdays.` : ''),
                    } : null;

                    return (
                      <div key={cat.key}>
                        {wfVerdict && (
                          <div className={`verdict-banner ${wfVerdict.level}`}>
                            <div className={`verdict-icon ${wfVerdict.level}`}>
                              {wfVerdict.level === 'concern' ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              )}
                            </div>
                            <div className="verdict-text">
                              <h3 className={wfVerdict.level}>{wfVerdict.title}</h3>
                              <p>{wfVerdict.text}</p>
                            </div>
                          </div>
                        )}

                        <div className="qm-indicators">
                          {/* Nursing staff turnover */}
                          {totalTurn != null && (() => {
                            const natl = 46.4;
                            const barColor = totalTurn > 60 ? 'red' : totalTurn > natl ? 'orange' : 'green';
                            const barW = Math.min(totalTurn, 100);
                            const natlPos = Math.min(natl, 100);
                            return (
                              <div className={`qm-indicator${expandedQm === 'wf_total_turn' ? ' expanded' : ''}`}>
                                <div className="qm-indicator-header">
                                  <div className="qm-indicator-name">
                                    Nursing staff turnover rate
                                    <button className="qm-info-btn" onClick={() => setExpandedQm(expandedQm === 'wf_total_turn' ? null : 'wf_total_turn')}>?</button>
                                  </div>
                                  <div className="qm-indicator-values">
                                    <span className={`qm-fval ${barColor}`}>{totalTurn}%</span>
                                    <span className="qm-vs">vs</span>
                                    <span className="qm-natl">{natl}%</span>
                                  </div>
                                </div>
                                <div className="qm-bar-wrap">
                                  <div className={`qm-bar ${barColor}`} style={{ width: `${barW}%` }} />
                                  <div className="qm-natl-marker" style={{ left: `${natlPos}%` }} />
                                </div>
                                <div className="qm-explainer">
                                  <div className="qm-explainer-inner">
                                    <strong>What this means:</strong> {totalTurn}% of nursing staff (RNs, LPNs, CNAs) left in the last year. National average: {natl}%. Every 10% increase in turnover is associated with measurable declines in quality indicators including falls, pressure ulcers, and medication errors. <em>Source: CMS Provider Info</em>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* RN turnover */}
                          {rnTurn != null && (() => {
                            const natl = 43.6;
                            const barColor = rnTurn > 55 ? 'red' : rnTurn > natl ? 'orange' : 'green';
                            const barW = Math.min(rnTurn, 100);
                            const natlPos = Math.min(natl, 100);
                            return (
                              <div className={`qm-indicator${expandedQm === 'wf_rn_turn' ? ' expanded' : ''}`}>
                                <div className="qm-indicator-header">
                                  <div className="qm-indicator-name">
                                    Registered Nurse (RN) turnover
                                    <button className="qm-info-btn" onClick={() => setExpandedQm(expandedQm === 'wf_rn_turn' ? null : 'wf_rn_turn')}>?</button>
                                  </div>
                                  <div className="qm-indicator-values">
                                    <span className={`qm-fval ${barColor}`}>{rnTurn}%</span>
                                    <span className="qm-vs">vs</span>
                                    <span className="qm-natl">{natl}%</span>
                                  </div>
                                </div>
                                <div className="qm-bar-wrap">
                                  <div className={`qm-bar ${barColor}`} style={{ width: `${barW}%` }} />
                                  <div className="qm-natl-marker" style={{ left: `${natlPos}%` }} />
                                </div>
                                <div className="qm-explainer">
                                  <div className="qm-explainer-inner">
                                    <strong>What this means:</strong> {rnTurn}% of Registered Nurses left in the last year. National average: {natl}%. RNs are the most critical clinical staff &mdash; they assess residents, manage medications, and oversee care plans. High RN turnover means less experienced eyes on your loved one. <em>Source: CMS Provider Info</em>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Weekend staffing drop */}
                          {wkndDrop != null && (() => {
                            const barColor = wkndDrop > 30 ? 'red' : wkndDrop > 15 ? 'orange' : 'green';
                            const barW = Math.min(Math.abs(wkndDrop), 60);
                            return (
                              <div className={`qm-indicator${expandedQm === 'wf_wknd_drop' ? ' expanded' : ''}`}>
                                <div className="qm-indicator-header">
                                  <div className="qm-indicator-name">
                                    Weekend staffing drop
                                    <button className="qm-info-btn" onClick={() => setExpandedQm(expandedQm === 'wf_wknd_drop' ? null : 'wf_wknd_drop')}>?</button>
                                  </div>
                                  <div className="qm-indicator-values">
                                    <span className={`qm-fval ${barColor}`}>{wkndDrop > 0 ? '-' : '+'}{Math.abs(wkndDrop)}%</span>
                                    <span className="qm-vs">weekday &rarr; weekend</span>
                                  </div>
                                </div>
                                <div className="qm-bar-wrap">
                                  <div className={`qm-bar ${barColor}`} style={{ width: `${barW}%` }} />
                                </div>
                                <div className="qm-explainer">
                                  <div className="qm-explainer-inner">
                                    <strong>What this means:</strong> Staffing drops {Math.abs(wkndDrop)}% on weekends compared to weekdays ({wkndHprd?.toFixed(2)} vs {wkdayHprd?.toFixed(2)} total nurse hours per resident per day). Residents need the same care on Saturday as on Tuesday. Weekend cuts mean fewer people to answer call lights, administer medications, reposition bedridden residents, and respond to emergencies. <em>Source: CMS PBJ Daily Staffing</em>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Administrator turnover */}
                          {adminLeft != null && adminLeft > 0 && (
                            <div className={`qm-indicator${expandedQm === 'wf_admin' ? ' expanded' : ''}`}>
                              <div className="qm-indicator-header">
                                <div className="qm-indicator-name">
                                  Administrators who left
                                  <button className="qm-info-btn" onClick={() => setExpandedQm(expandedQm === 'wf_admin' ? null : 'wf_admin')}>?</button>
                                </div>
                                <div className="qm-indicator-values">
                                  <span className={`qm-fval ${adminLeft >= 2 ? 'red' : 'orange'}`}>{adminLeft}</span>
                                  <span className="qm-vs">vs</span>
                                  <span className="qm-natl">0.5 avg</span>
                                </div>
                              </div>
                              <div className="qm-bar-wrap">
                                <div className={`qm-bar ${adminLeft >= 2 ? 'red' : 'orange'}`} style={{ width: `${Math.min(adminLeft * 20, 80)}%` }} />
                                <div className="qm-natl-marker" style={{ left: '10%' }} />
                              </div>
                              <div className="qm-explainer">
                                <div className="qm-explainer-inner">
                                  <strong>What this means:</strong> {adminLeft} administrator{adminLeft !== 1 ? 's' : ''} left this facility in the reporting period. National average: 0.5. Administrator turnover disrupts facility operations, regulatory compliance, and care culture. <em>Source: CMS Provider Info</em>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {facility.total_turnover == null && facility.rn_turnover == null && wkndDrop == null && (
                          <p style={{ fontSize: '14px', color: '#64748B' }}>Workforce data not available for this facility.</p>
                        )}

                        <div className="qm-direction-note">{cat.direction}</div>
                      </div>
                    );
                  }

                  const verdict = getVerdict(cat.key);
                  return (
                    <div key={cat.key}>
                      {/* Verdict banner */}
                      {verdict && (
                        <div className={`verdict-banner ${verdict.level}`}>
                          <div className={`verdict-icon ${verdict.level}`}>
                            {verdict.level === 'concern' ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            )}
                          </div>
                          <div className="verdict-text">
                            <h3 className={verdict.level}>{verdict.title}</h3>
                            <p>{verdict.text}</p>
                          </div>
                        </div>
                      )}

                      {/* Flat measures (Memory Care, Body & Basic Care, Rehab) */}
                      {cat.measures && (
                        <div className="qm-indicators">
                          {cat.measures.map(renderIndicator)}
                        </div>
                      )}

                      {/* Subgrouped measures (Vaccines) */}
                      {cat.subgroups && cat.subgroups.map((sg) => (
                        <div key={sg.label}>
                          <div className={`qm-sub-label${sg.noBorder ? ' no-border' : ''}`}>{sg.label}</div>
                          <div className="qm-indicators">
                            {sg.measures.map(renderIndicator)}
                          </div>
                        </div>
                      ))}

                      {/* QRP + VBP combined panel (Rehab tab only) */}
                      {cat.key === 'rehab' && (qm.qrp || qm.vbp) && (
                        <>
                          <div className="qm-sub-label">SNF Quality Reporting &amp; Value-Based Purchasing</div>
                          <div className="qrp-vbp-grid">
                            {[
                              { key: 'ppr', label: 'Preventable Readmissions' },
                              { key: 'dtc', label: 'Discharge to Community' },
                              { key: 'hai', label: 'Healthcare-Associated Infections' },
                            ].map(({ key, label }) => {
                              const val = qm.qrp?.[key];
                              if (!val) return null;
                              const n = (val + '').toLowerCase();
                              const color = n.includes('better') ? 'green' : n.includes('worse') ? 'red' : 'orange';
                              const display = n.includes('better') ? 'Above National Rate' : n.includes('worse') ? 'Below National Rate' : 'At National Rate';
                              return (
                                <div key={key} className="qrp-vbp-card">
                                  <div className="qrp-vbp-label">{label}</div>
                                  <div className={`qrp-vbp-value ${color}`}>{display}</div>
                                </div>
                              );
                            })}
                            {qm.vbp?.r && (
                              <div className="qrp-vbp-card">
                                <div className="qrp-vbp-label">CMS Performance Ranking</div>
                                <div className={`qrp-vbp-value ${qm.vbp.r > 10000 ? 'red' : qm.vbp.r > 5000 ? 'orange' : 'green'}`}>#{qm.vbp.r.toLocaleString()} <span className="qrp-vbp-of">of 13,726</span></div>
                              </div>
                            )}
                            {qm.vbp?.rr != null && (
                              <div className="qrp-vbp-card">
                                <div className="qrp-vbp-label">Readmission Rate</div>
                                <div className={`qrp-vbp-value ${qm.vbp.rr > 0.2 ? 'red' : qm.vbp.rr > 0.15 ? 'orange' : 'green'}`}>{(qm.vbp.rr * 100).toFixed(1)}%</div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      <div className="qm-direction-note">{cat.direction}</div>
                    </div>
                  );
                })}

                {/* Disclaimer */}
                <div className="qm-disclaimer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <div>
                    <strong>Data sources:</strong> MDS Quality Measures (assessment-based), Claims-Based Quality Measures (Medicare claims), SNF Quality Reporting Program (including COVID-19 vaccination data), SNF Value-Based Purchasing. National averages calculated from all 14,713 Medicare-certified nursing homes. Antipsychotic rates exclude residents with schizophrenia, Huntington&rsquo;s, and Tourette syndrome per CMS methodology. Elevated indicators highlight patterns that warrant investigation &mdash; no single metric above average automatically indicates poor care. <Link to="/methodology">Methodology</Link> &middot; <a href="https://data.cms.gov/provider-data/topics/nursing-homes" target="_blank" rel="noopener noreferrer">Verify on CMS.gov &rarr;</a>
                  </div>
                </div>

                <WhatDoesThisMean question="What are quality measures and where do they come from?">
                  <p>
                    Quality measures capture what&rsquo;s actually happening to residents &mdash; not just whether staff showed up. They come from three different data streams.
                  </p>
                  <KeyPoint>
                    <strong>MDS assessments</strong> are clinical evaluations completed by nursing home staff for every resident, regularly updated. They capture things like falls, weight loss, pressure ulcers, and medication use.
                  </KeyPoint>
                  <KeyPoint color="#D97706">
                    <strong>Claims-based measures</strong> come from Medicare billing data and track hospitalizations and ER visits &mdash; harder to manipulate than self-reported data.
                  </KeyPoint>
                  <KeyPoint color="#64748B">
                    <strong>QRP and VBP</strong> are federal programs that compare facilities to national benchmarks and tie Medicare payment to performance. A facility ranked in the bottom quartile nationally faces payment reductions.
                  </KeyPoint>
                </WhatDoesThisMean>
              </>
            );
          })() : (
            <p style={{ fontSize: '14px', color: '#64748B' }}>Quality measure data not available for this facility.</p>
          )}
        </div>

        {/* Section 06 — Fines & Penalties */}
        <div className="section" id="s-fines">
          <div className="section-number">06</div>
          <div className="section-title">Fines &amp; Penalties</div>
          {facility.total_fines > 0 ? (
            <>
              <div className="data-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="data-cell">
                  <div className={`data-cell-value ${facility.total_fines > 100000 ? 'val-red' : 'val-orange'}`}>{fmt(facility.total_fines)}</div>
                  <div className="data-cell-label">Total Fines</div>
                  <div className="data-cell-context">{facility.fine_count || 0} penalty(ies) imposed by CMS</div>
                </div>
                <div className="data-cell">
                  <div className="data-cell-value val-red">{((facility.total_fines / (stateBenchmarks.total_fines || 1))).toFixed(0)}×</div>
                  <div className="data-cell-label">vs. State Average</div>
                  <div className="data-cell-context">State avg: {fmt(stateBenchmarks.total_fines)} · National: {fmt(nationalBenchmarks.total_fines)}</div>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div className="comparison-row">
                  <span className="comparison-label">This facility</span>
                  <div className="comparison-bar-track"><div className="comparison-bar-fill" style={{ width: '100%', background: 'var(--accent-red, #f85149)' }} /></div>
                  <span className="comparison-value val-red">{fmt(facility.total_fines)}</span>
                </div>
                <div className="comparison-row">
                  <span className="comparison-label">State avg</span>
                  <div className="comparison-bar-track"><div className="comparison-bar-fill" style={{ width: `${Math.min(((stateBenchmarks.total_fines || 0) / facility.total_fines) * 100, 100)}%`, background: 'var(--accent-orange, #d29922)' }} /></div>
                  <span className="comparison-value">{fmt(stateBenchmarks.total_fines)}</span>
                </div>
                <div className="comparison-row">
                  <span className="comparison-label">National avg</span>
                  <div className="comparison-bar-track"><div className="comparison-bar-fill" style={{ width: `${Math.min(((nationalBenchmarks.total_fines || 0) / facility.total_fines) * 100, 100)}%`, background: 'var(--text-muted)' }} /></div>
                  <span className="comparison-value">{fmt(nationalBenchmarks.total_fines)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="data-cell" style={{ maxWidth: '300px' }}>
              <div className="data-cell-value val-green">$0</div>
              <div className="data-cell-label">No Fines</div>
              <div className="data-cell-context">No CMS penalties in recent records</div>
            </div>
          )}
          <p className="source">Source: CMS Penalties Data · Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a></p>

          <WhatDoesThisMean question="What do these fines actually mean?">
            <p>
              CMS can impose monetary penalties when inspectors find serious problems. Fines range from a few thousand dollars for minor violations to hundreds of thousands for conditions that endangered or harmed residents.
            </p>
            <KeyPoint>
              <strong>Context matters:</strong> A $50,000 fine at a large chain-owned facility generating millions in revenue may be a rounding error. The same fine at a small independent home could be devastating. Compare fines to the state and national averages shown above.
            </KeyPoint>
            <KeyPoint color="#D97706">
              <strong>Repeat fines</strong> are a stronger signal than a single penalty. If a facility has been fined multiple times, it may mean the underlying problems weren't fixed — or management decided paying fines was cheaper than improving care.
            </KeyPoint>
            <p>
              <strong>What families can do:</strong> Ask the facility — "I see you were fined [amount]. What changes were made?" A good facility will have a clear answer. Evasiveness is a warning sign.
            </p>
          </WhatDoesThisMean>
        </div>

        {/* Section 07 — Financial Transparency */}
        {facility.related_party_costs > 0 && (
          <div className="section">
            <div className="section-header-row">
              <div className="section-number">07</div>
              <div className="section-title">Financial Transparency</div>
              <span className="badge-updated">Updated</span>
            </div>
            <div className="financial-card">
              <div className="financial-amount">${Math.round(facility.related_party_costs).toLocaleString()}</div>
              <div className="financial-label">
                Paid to affiliated companies in FY{facility.related_party_year || '2024'}. Related-party transactions are payments to companies affiliated with the facility's owners — for management fees, real estate leases, or other services. High payments combined with poor quality may indicate profit extraction.
              </div>
              {facility.related_party_costs > 1000000 && facility.stars <= 2 && (
                <div className="alert-box" style={{ marginTop: '12px' }}>
                  This facility paid over <strong>${(facility.related_party_costs/1000000).toFixed(1)}M</strong> to affiliated companies while maintaining a <strong>{facility.stars}-star rating</strong>.
                </div>
              )}
              <div className="source-line" style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Source: <a href={hcris} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue, #7c8aff)', textDecoration: 'none' }}>CMS HCRIS Cost Reports</a>, FY2024 (Worksheet A-8) · Verify: <a href={propublica} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue, #7c8aff)', textDecoration: 'none' }}>ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue, #7c8aff)', textDecoration: 'none' }}>Medicare Care Compare</a>
              </div>
            </div>

            <WhatDoesThisMean question="What are related-party transactions and why should I care?">
              <p>
                A "related-party transaction" is when a nursing home pays money to another company that is owned or controlled by the same people. For example, the nursing home's parent company might also own a staffing agency, a real estate company, or a management firm — and the nursing home pays those affiliated companies for services.
              </p>
              <KeyPoint>
                <strong>This is legal</strong> — but it's one of the primary ways money gets extracted from facilities that receive taxpayer-funded Medicare and Medicaid payments. Every dollar that flows to an affiliated company is a dollar that didn't go to staffing, supplies, or facility maintenance.
              </KeyPoint>
              <KeyPoint color="#DC2626">
                <strong>Red flag combination:</strong> High related-party payments + low staffing + low star ratings is a pattern that researchers and regulators look for as a potential indicator of profit extraction at the expense of care quality.
              </KeyPoint>
              <p>
                <strong>Where this data comes from:</strong> CMS requires all nursing homes to file annual cost reports (HCRIS). Worksheet A-8 specifically breaks out payments to related parties.
              </p>
            </WhatDoesThisMean>
          </div>
        )}

        {/* Section 08 — Fire Safety */}
        <div className="section" id="s-fire">
          <div className="section-header-row">
            <div className="section-number">08</div>
            <div className="section-title">Fire Safety</div>
            <span className="badge-new">New</span>
            <span className="badge-source">CMS FIRE SAFETY</span>
          </div>
          <p className="section-subtitle">A separate inspection system from health deficiencies — most families never check this data</p>
          {(facility.fire_deficiency_count || 0) === 0 ? (
            <div className="data-cell" style={{ maxWidth: '360px' }}>
              <div className="data-cell-value val-green">0</div>
              <div className="data-cell-label">No fire safety deficiencies on record</div>
              <div className="data-cell-context">No citations from fire safety inspections</div>
            </div>
          ) : (
            <>
              <div className="data-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="data-cell">
                  <div className={`data-cell-value ${(facility.fire_deficiency_count || 0) > 14.3 ? 'val-red' : (facility.fire_deficiency_count || 0) > 5 ? 'val-orange' : 'val-green'}`}>
                    {facility.fire_deficiency_count || 0}
                  </div>
                  <div className="data-cell-label">Fire Code Violations</div>
                  <div className="data-cell-context">Nat'l avg: 14.3</div>
                </div>
                <div className="data-cell">
                  {(() => {
                    const seriousCount = (facility.fire_deficiencies || []).filter(d => d.scope_severity && (d.scope_severity.startsWith('K') || d.scope_severity.startsWith('L'))).length;
                    return (
                      <>
                        <div className={`data-cell-value ${seriousCount > 0 ? 'val-red' : 'val-green'}`}>
                          {seriousCount}
                        </div>
                        <div className="data-cell-label">Serious K-Level</div>
                        <div className="data-cell-context">Direct risk to residents</div>
                      </>
                    );
                  })()}
                </div>
                <div className="data-cell">
                  {(() => {
                    const uncorrectedCount = (facility.fire_deficiencies || []).filter(d => !d.corrected).length;
                    return (
                      <>
                        <div className={`data-cell-value ${uncorrectedCount > 5 ? 'val-red' : uncorrectedCount > 0 ? 'val-orange' : 'val-green'}`}>
                          {uncorrectedCount}
                        </div>
                        <div className="data-cell-label">Still Uncorrected</div>
                        <div className="data-cell-context">At last inspection</div>
                      </>
                    );
                  })()}
                </div>
              </div>
              {/* Fire Safety Verdict Banner */}
              {(facility.fire_deficiency_count || 0) > 14.3 && (
                <div className="verdict-banner caution">
                  <div className="verdict-icon caution">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div className="verdict-text">
                    <h3 className="caution">Above-Average Fire Code Violations</h3>
                    <p><strong>{facility.fire_deficiency_count} fire safety violations</strong> — above the 14.3 national average. Fire safety inspections are entirely separate from health inspections. Issues include sprinkler systems, blocked exits, and evacuation plans. <strong>Most residents cannot evacuate on their own.</strong></p>
                  </div>
                </div>
              )}
              {/* Change #7: Uncorrected Fire Safety Callout */}
              {(() => {
                const uncorrectedCount = (facility.fire_deficiencies || []).filter(d => !d.corrected).length;
                const totalFire = facility.fire_deficiency_count || 0;
                const uncorrectedPct = totalFire > 0 ? Math.round((uncorrectedCount / totalFire) * 100) : 0;
                if (uncorrectedPct >= 50 && uncorrectedCount > 2) {
                  return (
                    <div className="verdict-banner concern">
                      <div className="verdict-icon concern">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </div>
                      <div className="verdict-text">
                        <h3 className="concern">{uncorrectedPct}% of Fire Safety Violations Still Uncorrected</h3>
                        <p><strong>{uncorrectedCount} of {totalFire} fire code violations</strong> remain uncorrected as of the last inspection. Uncorrected fire safety issues — blocked exits, malfunctioning sprinklers, missing alarms — represent an ongoing, daily risk. <strong>Most nursing home residents cannot evacuate independently.</strong></p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {facility.fire_deficiencies && facility.fire_deficiencies.length > 0 && (
                <ul className="deficiency-list" style={{ marginTop: '16px' }}>
                  {facility.fire_deficiencies.slice(0, 5).map((def, idx) => {
                    const severityClass = def.severity_label === 'Immediate Jeopardy' ? 'severity-danger'
                      : def.severity_label === 'Actual Harm' ? 'severity-harm' : 'severity-minor';
                    const severityText = def.severity_label === 'Immediate Jeopardy' ? 'Serious Danger'
                      : def.severity_label === 'Actual Harm' ? 'Residents Hurt' : 'Minor';
                    const year = def.survey_date ? new Date(def.survey_date).getFullYear() : '';
                    return (
                      <li className="deficiency-item" key={idx}>
                        <span className={`deficiency-severity ${severityClass}`}>{severityText}</span>
                        <div>
                          <div className="deficiency-text">{def.description}</div>
                          {def.category && <div className="deficiency-category">{def.category}</div>}
                          <div className="deficiency-date">Fire Safety Inspection · {year}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          <div className="source-line" style={{ marginTop: '16px' }}>Source: CMS Fire Safety Deficiency Data</div>
          <WhatDoesThisMean question="How are fire safety inspections different?">
            <p>
              Fire safety inspections are conducted separately from standard health inspections. They are carried out by fire marshals or life safety code inspectors, not the same state surveyors who do health surveys.
            </p>
            <KeyPoint>
              <strong>What they check:</strong> Sprinkler systems, emergency exits, fire alarms, door hardware, evacuation plans, smoking policies, and emergency preparedness. These are structural and procedural safeguards designed to protect residents who may not be able to evacuate on their own.
            </KeyPoint>
            <KeyPoint color="#DC2626">
              <strong>Immediate jeopardy citations</strong> in fire safety inspections are rare and serious — they indicate conditions that put residents at immediate risk in the event of a fire or emergency.
            </KeyPoint>
            <p>
              <strong>Why this matters:</strong> Nursing home residents are among the most vulnerable in a fire emergency. Many have limited mobility, use oxygen or other equipment, and depend entirely on staff to evacuate them safely.
            </p>
          </WhatDoesThisMean>
        </div>

        {/* Section 09 — Who Runs This Place? */}
        <div className="section" id="s-ownership">
          <div className="section-header-row">
            <div className="section-number">09</div>
            <div className="section-title">Who Runs This Place?</div>
            <span className="badge-updated">Updated</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #9d97b8)', marginBottom: '16px', marginTop: '8px' }}>
            Operator details, PE/REIT ownership badges, chain stats — plus ownership change tracking
          </p>
          <div className="ownership-grid">
            <div className="ownership-card">
              <div className="ownership-card-label">Operator</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-white)' }}>
                {facility.worst_owner || 'Unknown'}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary, #9d97b8)' }}>
                Operates <strong>{facility.owner_portfolio_count || 1} facilities</strong>
              </div>
              {facility.owner_avg_stars && (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary, #9d97b8)', marginTop: '4px' }}>
                  Average rating: <strong className={facility.owner_avg_stars < 3 ? 'val-red' : ''}>{facility.owner_avg_stars.toFixed(1)}</strong> out of 5 stars
                </div>
              )}
              {facility.owner_pct_below_avg > 50 && (
                <div style={{ fontSize: '13px', color: 'var(--accent-red, #f85149)', marginTop: '8px', fontWeight: 600 }}>
                  ⚠ {facility.owner_pct_below_avg.toFixed(0)}% rated below average
                </div>
              )}
            </div>
            <div className="ownership-card">
              <div className="ownership-card-label">Rating Distribution</div>
              <div style={{ marginTop: '8px' }}>
                {(() => {
                  // Compute star distribution from all facilities with the same owner
                  const ownerName = facility.worst_owner;
                  const ownerFacs = ownerName ? allFacilities.filter(f => f.worst_owner === ownerName) : [];
                  const total = ownerFacs.length || 1;
                  const dist = [0, 0, 0, 0, 0]; // index 0=1star, 4=5star
                  ownerFacs.forEach(f => {
                    const s = Math.max(1, Math.min(5, f.stars || 1));
                    dist[s - 1]++;
                  });
                  return [5, 4, 3, 2, 1].map(star => {
                    const count = dist[star - 1];
                    const pctVal = Math.round((count / total) * 100);
                    return (
                      <div className="star-dist" key={star}>
                        <span className="star-dist-label">{star} ⭐</span>
                        <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '3px' }}>
                          <div className="star-dist-bar" style={{ width: `${pctVal}%`, height: '6px' }} />
                        </div>
                        <span className="star-dist-count">{count} ({pctVal}%)</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Change #9: Operator Portfolio Performance Stats */}
          {facility.worst_owner && (facility.owner_portfolio_count || 0) > 1 && (
            <>
              <div className="complaints-sub-label" style={{ marginTop: '24px' }}>Operator Portfolio Performance</div>
              <div className="data-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '12px' }}>
                <div className="data-cell">
                  <div className="data-cell-value" style={{ color: '#c0392b' }}>{facility.owner_portfolio_count || 1}</div>
                  <div className="data-cell-label">Facilities</div>
                </div>
                <div className="data-cell">
                  <div className={`data-cell-value ${(facility.owner_avg_stars || 0) < 3 ? 'val-red' : 'val-green'}`}>{facility.owner_avg_stars ? facility.owner_avg_stars.toFixed(1) : '—'}★</div>
                  <div className="data-cell-label">Avg Rating</div>
                </div>
                {facility.owner_avg_fines != null && (
                  <div className="data-cell">
                    <div className="data-cell-value val-red">${facility.owner_avg_fines >= 1000 ? `${Math.round(facility.owner_avg_fines / 1000)}K` : facility.owner_avg_fines}</div>
                    <div className="data-cell-label">Avg Fines (Penalized)</div>
                  </div>
                )}
                {facility.owner_pct_below_avg != null && (
                  <div className="data-cell">
                    <div className={`data-cell-value ${facility.owner_pct_below_avg > 50 ? 'val-red' : 'val-orange'}`}>{facility.owner_pct_below_avg.toFixed(0)}%</div>
                    <div className="data-cell-label">Below Average</div>
                  </div>
                )}
              </div>

              {facility.owner_pct_below_avg > 50 && (
                <div className="verdict-banner concern">
                  <div className="verdict-icon concern">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div className="verdict-text">
                    <h3 className="concern">Pattern of Poor Performance Across Portfolio</h3>
                    <p><strong>{facility.owner_pct_below_avg.toFixed(0)}% of this operator's {facility.owner_portfolio_count} facilities are rated below average.</strong> This isn't one bad facility — it's a systemic pattern across the operator's entire portfolio.{facility.pe_owned ? ' This operator is private equity-backed.' : ''}</p>
                  </div>
                </div>
              )}

              <Link to={`/?owner=${encodeURIComponent(facility.worst_owner)}`} className="owner-portfolio-link">
                → View all {facility.owner_portfolio_count} facilities by this operator
              </Link>
            </>
          )}

          {/* Ownership Change Timeline */}
          {(facility.ownership_changed_recently || (facility.num_owners && facility.num_owners > 1)) && (
            <>
              <div className="complaints-sub-label" style={{ marginTop: '24px' }}>Ownership History</div>
              <div className="ownership-timeline">
                {facility.ownership_changed_recently && facility.ownership_change_date && (
                  <div className="tl-item">
                    <div className="tl-col">
                      <div className="tl-dot red" />
                      <div className="tl-line" />
                    </div>
                    <div>
                      <div className="tl-date">{facility.ownership_change_date}</div>
                      <div className="tl-event">Acquired by {facility.new_owner_name || 'New Owner'}</div>
                      {facility.pe_owned && <div className="tl-detail">Private equity-backed</div>}
                    </div>
                  </div>
                )}
                <div className="tl-item">
                  <div className="tl-col">
                    <div className="tl-dot muted" />
                  </div>
                  <div>
                    <div className="tl-date">CMS Records</div>
                    <div className="tl-event">{facility.num_owners || 1} total owner{(facility.num_owners || 1) !== 1 ? 's' : ''} on file</div>
                    <div className="tl-detail">Per CMS ownership disclosure filings</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Verdict banner for frequent ownership changes */}
          {((facility.num_owners || 0) > 5 || (facility.ownership_changed_recently && (facility.num_owners || 0) > 3)) && (
            <div className="verdict-banner caution">
              <div className="verdict-icon caution">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="verdict-text">
                <h3 className="caution">Frequent Ownership Changes</h3>
                <p><strong>{facility.num_owners} owners on CMS records.</strong> Frequent ownership changes are associated with care disruptions. New owners may cut staff, change vendors, or restructure operations. Research shows quality typically dips in the 1-2 years following an acquisition.{facility.pe_owned ? ' The current operator is private equity-backed.' : ''}</p>
              </div>
            </div>
          )}

          <div className="source-line">Source: CMS Care Compare, ownership records</div>

          <WhatDoesThisMean question="Why does ownership matter for care quality?">
            <p>
              Research consistently shows that who owns a nursing home affects the quality of care residents receive. Facilities owned by large for-profit chains and private equity firms tend to have lower staffing levels, more deficiencies, and higher rates of resident harm compared to nonprofit and independent facilities.
            </p>
            <KeyPoint>
              <strong>Portfolio performance tells a story.</strong> If a company runs 20 facilities and most are rated 1–2 stars, that's a systemic pattern — not bad luck. Look at the star distribution above to see how this owner's other facilities are doing.
            </KeyPoint>
            <KeyPoint color="#D97706">
              <strong>Recent ownership changes</strong> often lead to care disruptions. New owners may cut staff, change vendors, or restructure operations. Research shows quality typically dips in the 1–2 years following an acquisition, especially by private equity.
            </KeyPoint>
            <p>
              <strong>What families can do:</strong> Search the owner's name on this site to see all their facilities. If most are poorly rated, that tells you something about how this company operates.
            </p>
          </WhatDoesThisMean>
        </div>

        {/* Section 10 — Questions to Ask */}
        <div className="section" id="s-questions">
          <div className="section-header-row">
            <div className="section-number">10</div>
            <div className="section-title">Questions to Ask When You Visit</div>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #9d97b8)', marginBottom: '16px' }}>Tailored to this facility's specific record — prioritized by severity:</p>

          {(() => {
            const questions = [];
            if (facility.jeopardy_count > 0) {
              questions.push({ priority: 'critical', text: 'What corrective actions were taken after the serious danger citations?', context: `Inspectors found serious danger to residents ${facility.jeopardy_count} time${facility.jeopardy_count > 1 ? 's' : ''}.` });
            }
            if (facility.zero_rn_pct > 0) {
              questions.push({ priority: 'critical', text: 'How many registered nurses are on duty right now? What about weekends?', context: `This facility reported zero RN hours on ${pct(facility.zero_rn_pct)} of days.` });
            }
            if (facility.rn_gap_pct > 30) {
              questions.push({ priority: 'critical', text: 'Can I see your actual staffing schedules for the past month?', context: `Payroll records account for only ${(100 - facility.rn_gap_pct).toFixed(0)}% of self-reported RN hours.` });
            }
            if (facility.total_fines > 50000) {
              questions.push({ priority: 'important', text: `What changes have you made since being fined ${fmt(facility.total_fines)}?`, context: `This is ${((facility.total_fines / (stateBenchmarks.total_fines || 1)).toFixed(0))}× the state average fine amount.` });
            }
            if (facility.chain_facility_count > 10) {
              questions.push({ priority: 'important', text: `How does staffing here compare to the operator's other ${facility.chain_facility_count} facilities?`, context: 'Multi-facility operators can have widely varying quality across their portfolio.' });
            }
            questions.push({ priority: 'important', text: 'Can I visit at different times — evenings, weekends, mealtimes?', context: 'Staffing and care quality can vary dramatically by time of day.' });

            return questions.map((q, idx) => (
              <div key={idx} className={`question-item ${q.priority === 'critical' ? 'question-critical' : 'question-important'}`}>
                <div className="question-rank">{idx + 1}</div>
                <div className="question-body">
                  <div className="question-text">
                    {q.text}
                    <span className={`question-priority-tag ${q.priority}`}>{q.priority === 'critical' ? 'Critical' : 'Important'}</span>
                  </div>
                  <div className="question-context">{q.context}</div>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Change #11: Ask a Clinician CTA — highest-intent moment */}
        <ClinicianCTA facility={facility} placement="after-questions" />

        {/* Section 11 — What You Can Do */}
        <div className="section">
          <div className="section-header-row">
            <div className="section-number">11</div>
            <div className="section-title">What You Can Do</div>
          </div>
          <ActionPaths facility={facility} />
        </div>

        {/* Nearby Alternatives */}
        <NearbyFacilities facility={facility} />

        {/* Free Report CTA */}
        <div className="free-report-cta">
          <h3>Download Your Free Safety Report</h3>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary, #9d97b8)', maxWidth: '560px', margin: '0 auto' }}>
            Everything above — packaged into a shareable PDF with your facility's personalized analysis.
          </p>
          <div className="free-report-features">
            <span>All inspection data</span>
            <span>Staffing analysis &amp; trends</span>
            <span>Financial transparency</span>
            <span>Ownership breakdown</span>
            <span>Visit questions &amp; checklist</span>
            <span>Nearby alternatives</span>
          </div>
          <DownloadButton facility={facility} nearbyFacilities={nearbyForPDF} allFacilities={allFacilities} label="Download Free Report (PDF)" variant="prominent" />
          <div className="free-report-note">Free forever. No login. No email required.</div>
        </div>

        {/* Evidence Package CTA */}
        <div className="paid-upsell">
          <div className="paid-upsell-header">
            <h3>Need This for a Case?</h3>
            <span className="paid-price">$29</span>
          </div>
          <div className="paid-upsell-desc">
            A professionally cited Evidence Package. Everything in the free report plus deeper analysis — compiled from 16 federal databases into a single documented report.
          </div>
          <div className="paid-features">
            <span className="paid-feature">Numbered source citations</span>
            <span className="paid-feature">Multi-year trend analysis</span>
            <span className="paid-feature">Side-by-side state/national comparisons</span>
            <span className="paid-feature">Full ownership network map</span>
            <span className="paid-feature">Staffing discrepancy documentation</span>
            <span className="paid-feature">Related-party transaction detail</span>
          </div>
          <button className="btn-evidence" onClick={() => setShowEvidencePreview(true)}>Preview Evidence Package</button>
          <div className="paid-upsell-note">One-time purchase. Instant download. Used by attorneys, journalists, and regulators.</div>
          <a href="/evidence-sample" className="paid-upsell-sample-link">↓ See a full sample report</a>
        </div>

        {/* Professional Plans — Coming Soon */}
        <div className="pro-plans">
          <h3>Professional Plans — Coming Soon</h3>
          <div className="pro-plans-grid">
            <div className="pro-plan-card">
              <div className="pro-plan-name">Pro</div>
              <div className="pro-plan-price">$14/mo</div>
              <div className="pro-plan-features">Watchlist alerts · Unlimited PDF exports · Bulk facility comparison · API access</div>
              <button className="btn-waitlist" onClick={() => window.open('mailto:contact@oversightreports.com?subject=Pro Waitlist', '_blank')}>Join Waitlist</button>
            </div>
            <div className="pro-plan-card">
              <div className="pro-plan-name">Enterprise</div>
              <div className="pro-plan-price">$59/mo</div>
              <div className="pro-plan-features">Cost report deep dives · Multi-facility dashboards · Custom data exports · Priority support</div>
              <button className="btn-waitlist" onClick={() => window.open('mailto:contact@oversightreports.com?subject=Enterprise Waitlist', '_blank')}>Join Waitlist</button>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="section">
          <div className="section-title">Data Sources</div>
          <div className="data-sources-grid">
            <div className="data-source-item"><h4>CMS Provider Information Data</h4><p>14,713 Medicare/Medicaid certified nursing homes. Includes star ratings, beds, ownership, location.</p></div>
            <div className="data-source-item"><h4>CMS Penalties Data</h4><p>18,060 enforcement actions. Fines and payment denials.</p></div>
            <div className="data-source-item"><h4>CMS Ownership Data</h4><p>157,839 ownership records. Tracks 5%+ ownership interests and management.</p></div>
            <div className="data-source-item"><h4>Payroll-Based Journal (PBJ)</h4><p>1,332,804 daily staffing records (CY2025 Q3). Mandatory payroll data showing actual hours worked by RNs, LPNs, and CNAs per day.</p></div>
            <div className="data-source-item"><h4>CMS Health Deficiencies Data</h4><p>417,293 deficiency citations. Standard surveys, complaint investigations, infection control.</p></div>
            <div className="data-source-item"><h4>CMS HCRIS Cost Reports</h4><p>Facility financial data including related-party transactions, revenue, and expenses.</p></div>
          </div>
        </div>

        {/* Glossary — Change #13: Expanded + Searchable */}
        <div className="section">
          <div className="section-title">Glossary</div>
          <p className="section-subtitle">Terms used throughout this report</p>
          {(() => {
            const glossaryTerms = [
              { term: 'RN', meaning: 'Registered Nurse — highest-level bedside nurse, responsible for assessments and care decisions' },
              { term: 'LPN', meaning: 'Licensed Practical Nurse — administers medications, wound care, vital signs' },
              { term: 'CNA', meaning: 'Certified Nursing Assistant — provides daily personal care (bathing, feeding, dressing)' },
              { term: 'Hrs/res/day', meaning: 'Total nursing hours divided by number of residents, per day — the key staffing density metric' },
              { term: 'PBJ', meaning: 'Payroll-Based Journal — mandatory payroll records submitted to CMS (not self-reported)' },
              { term: 'SFF', meaning: 'Special Focus Facility — CMS designation for the worst-performing ~1% of nursing homes' },
              { term: 'CCN', meaning: 'CMS Certification Number — unique federal ID for each Medicare-certified facility' },
              { term: 'F-tag', meaning: 'Federal regulation code (e.g., F689 = accident hazards). Each deficiency cites a specific F-tag.' },
              { term: 'K-tag', meaning: 'Fire safety regulation code — K-level citations are the most serious fire code violations' },
              { term: 'REIT', meaning: 'Real Estate Investment Trust — a corporate structure where the building is owned separately from operations' },
              { term: 'Scope & Severity', meaning: 'CMS grid classifying each deficiency by how many residents affected and how serious the harm' },
            ];
            return (
              <table className="fp-glossary">
                <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
                <tbody>
                  {glossaryTerms.map((g, i) => (
                    <tr key={i}><td><strong>{g.term}</strong></td><td>{g.meaning}</td></tr>
                  ))}
                </tbody>
              </table>
            );
          })()}

          {/* Change #13: $29 Evidence PDF Upsell — contextual comparison */}
          <div className="pdf-upsell-section">
            <h3 className="pdf-upsell-title">Want the complete picture? Download the Evidence Report.</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Everything on this page — plus the deep-dive analysis that doesn't fit on a free report card.</p>

            <div className="pdf-compare-grid">
              <div className="pdf-compare-col free">
                <div className="pdf-compare-col-title">Free Report Card (This Page)</div>
                <div className="pdf-compare-item"><span className="pdf-check">✓</span> Safety score &amp; 6 key metrics</div>
                <div className="pdf-compare-item"><span className="pdf-check">✓</span> Deficiency list with severity</div>
                <div className="pdf-compare-item"><span className="pdf-check">✓</span> Staffing hours vs benchmarks</div>
                <div className="pdf-compare-item"><span className="pdf-check">✓</span> Quality measures by category</div>
                <div className="pdf-compare-item"><span className="pdf-check">✓</span> Fines &amp; penalty timeline</div>
                <div className="pdf-compare-item"><span className="pdf-check">✓</span> Questions to ask</div>
              </div>
              <div className="pdf-compare-col paid">
                <div className="pdf-compare-col-title paid">Evidence Report PDF — $29</div>
                <div className="pdf-compare-item"><span className="pdf-check">✓</span> Everything in the free report, plus:</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Full deficiency narratives (inspector's own words)</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Penalty timeline with fine amounts per incident</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Ownership chain analysis (PE, REIT, operator history)</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Staffing trend analysis (improving or declining?)</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Complaint investigation yield — citations per investigation</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Staffing vs. the 3.48 HPRD threshold cited by 18 state AGs</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Risk score methodology with 42 CFR regulatory references</div>
                <div className="pdf-compare-item"><span className="pdf-extra">+</span> Print-ready format for attorneys, ombudsmen, and family meetings</div>
              </div>
            </div>

            <button className="pdf-upsell-btn" onClick={() => setShowEvidencePreview(true)}>Download Evidence Report — $29</button>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', textAlign: 'center' }}>Instant PDF download · Source data from CMS · 100% money-back guarantee</div>
          </div>
        </div>

        {/* Change #14: Bottom Download CTA */}
        <div className="bottom-download-cta">
          <div className="bottom-cta-content">
            <h3>Save this report for later</h3>
            <p>Download the full evidence report with complete deficiency narratives, penalty timeline, and ownership history.</p>
          </div>
          <DownloadButton facility={facility} nearbyFacilities={nearbyForPDF} allFacilities={allFacilities} label="↓ Download PDF Report" />
        </div>

        {/* Disclaimer */}
        <div className="disclaimer-box">
          <strong>About This Data:</strong> The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. If you have concerns about a facility, contact your state survey agency or the HHS Office of Inspector General at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
        </div>

        {/* Evidence Preview Modal */}
        {showEvidencePreview && facility && (
          <div className="ev-preview-overlay" onClick={() => setShowEvidencePreview(false)}>
            <div className="ev-preview-modal" onClick={e => e.stopPropagation()}>
              <button className="ev-preview-close" onClick={() => setShowEvidencePreview(false)}>&times;</button>
              <h2>Evidence Package — {facility.name}</h2>
              <p className="ev-preview-subtitle">10-section professionally documented report. Here's what's inside:</p>

              <div className="ev-preview-sections">
                <div className="ev-preview-section">
                  <span className="ev-preview-num">1</span>
                  <div>
                    <strong>Executive Summary</strong>
                    <p>Risk score: {facility.composite?.toFixed(1) || 'N/A'} · CMS Stars: {facility.stars || 0}/5 · Auto-generated assessment</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">2</span>
                  <div>
                    <strong>Ownership Profile</strong>
                    <p>Owner: {facility.worst_owner || 'N/A'} · Type: {facility.ownership_type || 'N/A'} · Portfolio: {facility.owner_portfolio_count || 1} facilities</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">3</span>
                  <div>
                    <strong>Staffing Analysis</strong>
                    <p>RN: {facility.rn_hprd?.toFixed(1) || 'N/A'} · CNA: {facility.cna_hprd?.toFixed(1) || 'N/A'} · Total: {facility.total_hprd?.toFixed(1) || 'N/A'} HPRD · Zero-RN days: {facility.zero_rn_pct?.toFixed(0) || 0}%</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">4</span>
                  <div>
                    <strong>Inspection History</strong>
                    <p>{facility.total_deficiencies || 0} deficiencies · {facility.jeopardy_count || 0} serious danger · {facility.harm_count || 0} residents hurt</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">5</span>
                  <div>
                    <strong>Financial Penalties</strong>
                    <p>${Math.round(facility.total_fines || 0).toLocaleString()} in fines · {facility.fine_count || 0} penalties</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">6</span>
                  <div>
                    <strong>Red Flags &amp; Accountability</strong>
                    <p>Automated pattern detection across all data sources</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">7</span>
                  <div>
                    <strong>Nearby Alternatives</strong>
                    <p>5 closest facilities with better safety records</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">8</span>
                  <div>
                    <strong>Methodology &amp; Data Sources</strong>
                    <p>CMS PBJ, Deficiencies, Penalties, Ownership — all cited</p>
                  </div>
                </div>
                <div className="ev-preview-section">
                  <span className="ev-preview-num">9</span>
                  <div>
                    <strong>Legal Disclaimer</strong>
                    <p>Proper disclaimers and agency contact information</p>
                  </div>
                </div>
              </div>

              <p className="ev-value-line">We analyze publicly available federal data from 16 CMS databases so you don't have to. Each report compiles inspections, penalties, staffing records, ownership, quality measures, and cost reports into a single professional analysis.</p>
              <div className="ev-preview-actions">
                <button className="ev-buy-btn" onClick={() => { setShowEvidencePreview(false); checkoutSingleReport(ccn); }}>
                  Download Evidence Report — $29
                </button>
                <p className="ev-or-subscribe">or <Link to="/pricing" onClick={() => setShowEvidencePreview(false)}>subscribe for unlimited access</Link></p>
              </div>
            </div>
          </div>
        )}

        <ClinicianCTA />

        <div className="fp-footer-text">
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94A3B8)', lineHeight: '1.6', maxWidth: '680px', margin: '0 auto 10px', opacity: 0.85 }}>
            Reports are prepared using the professional knowledge of a licensed Nurse Practitioner applied to publicly available CMS regulatory data. The Oversight Report is an independent service with no financial ties to any nursing facility or chain. Reports are informational — not medical advice — and do not create a provider-patient relationship.
          </p>
          The Oversight Report — Nursing Home Risk Data | Data processed 2026-02-23<br />
          Built by Robert Benard, NP · DataLink Clinical LLC · All data sourced from CMS Medicare.gov
        </div>

        <div className="fp-footer-nav">
          <Link to="/">← Back to Map</Link>
        </div>
      </div>
    </div>
  );
}
