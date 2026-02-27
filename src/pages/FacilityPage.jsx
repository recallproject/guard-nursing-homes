import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useFacilityData } from '../hooks/useFacilityData';
import { computeBenchmarks } from '../utils/benchmarks';
import { haversineDistance } from '../utils/haversine';
import { checkoutSingleReport } from '../utils/stripe';
import { BenchmarkBar } from '../components/BenchmarkBar';
import { NearbyFacilities } from '../components/NearbyFacilities';
import { DownloadButton } from '../components/DownloadButton';
import { ActionPaths } from '../components/ActionPaths';
import StaffingSection from '../components/StaffingSection';
import AccountabilityFlags from '../components/AccountabilityFlags';
import { StaffingTrendChart } from '../components/StaffingTrendChart';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { useWatchlist } from '../hooks/useWatchlist';

import '../styles/facility.css';
import '../styles/staffing.css';

export function FacilityPage() {
  const { ccn } = useParams();
  const location = useLocation();
  const { data, loading, error } = useFacilityData();
  const { tier } = useSubscription();
  const { watchlist, addFacility, removeFacility, isWatched } = useWatchlist();
  const pageRef = useRef(null);
  const fromState = location.state?.fromState || null;
  const [showEvidencePreview, setShowEvidencePreview] = useState(false);
  const [ahcaData, setAhcaData] = useState(null);

  const facility = data?.states
    ? Object.values(data.states).flatMap(state => state.facilities || []).find(f => f.ccn === ccn)
    : null;

  // All facilities (for ownership cluster computation)
  const allFacilities = useMemo(() => {
    if (!data?.states) return [];
    return Object.values(data.states).flatMap(state => state.facilities || []);
  }, [data]);

  // Compute benchmarks
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
  const fmt = (v) => (!v && v !== 0) ? 'N/A' : `$${v.toLocaleString()}`;
  const pct = (v) => (v === null || v === undefined) ? 'N/A' : `${v.toFixed(0)}%`;
  const stars = '⭐'.repeat(Math.max(0, Math.min(5, facility.stars || 0)));
  const propublica = `https://projects.propublica.org/nursing-homes/homes/h-${ccn}`;
  const medicare = `https://www.medicare.gov/care-compare/details/nursing-home/${ccn}`;
  const hcris = `https://www.cms.gov/Research-Statistics-Data-and-Systems/Downloadable-Public-Use-Files/Cost-Reports/Cost-Reports-by-Fiscal-Year`;

  // Safety level
  const getSafety = () => {
    if (facility.jeopardy_count > 0) return { cls: 'box-red', text: 'SAFETY: CONCERNING' };
    if (facility.harm_count > 0) return { cls: 'box-yellow', text: 'SAFETY: SOME ISSUES' };
    return { cls: 'box-green', text: 'SAFETY: GOOD' };
  };

  // Bottom line — dynamic based on data
  const getBottomLine = () => {
    const parts = [];
    if (facility.jeopardy_count > 0)
      parts.push(`Inspectors found serious danger to residents ${facility.jeopardy_count} time${facility.jeopardy_count !== 1 ? 's' : ''} — risk of serious injury or death.`);
    else if (facility.harm_count > 0)
      parts.push(`Residents were hurt ${facility.harm_count} time${facility.harm_count !== 1 ? 's' : ''} according to inspection reports.`);
    if (facility.total_fines > 0)
      parts.push(`This facility has been fined ${fmt(facility.total_fines)}.`);
    if (facility.zero_rn_pct > 25)
      parts.push(`On ${pct(facility.zero_rn_pct)} of days, there was no registered nurse in the building.`);
    if (facility.owner_portfolio_count > 1)
      parts.push(`The same company runs ${facility.owner_portfolio_count} other facilities${facility.owner_avg_fines ? ` with average fines of ${fmt(facility.owner_avg_fines)} each` : ''}.`);
    if (parts.length === 0)
      parts.push('This facility has no major issues recorded in recent CMS data.');
    return parts.join(' ');
  };

  const safety = getSafety();

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
        {/* Facility Name + Meta */}
        <h1 className="fp-name">{facility.name}</h1>
        <p className="fp-meta">
          {facility.city}, {facility.state} | {facility.beds || '—'} beds | CMS Rating: {facility.stars || 0} {stars}
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

        {/* Evidence Report Banner */}
        <div className="evidence-report-banner">
          Need this for an investigation or case? <Link to={`/evidence/${ccn}`}>Download the full Evidence Report — $29</Link>
        </div>

        <hr />

        {/* Bottom Line */}
        <h2>Bottom Line</h2>
        <div className="info-box">{getBottomLine()}</div>
        <p className="source">Source: CMS Provider Data, Health Deficiencies, Penalties, Ownership | Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a></p>

        <hr />

        {/* Evidence Package CTA */}
        <div className="fp-evidence-cta">
          <h3>Need This for a Case?</h3>
          <p>Get a 10-section litigation-ready Evidence Package with everything on this page plus deeper analysis — in one downloadable PDF.</p>
          <p className="ev-value-line">We analyze publicly available federal data from 6 CMS databases so you don't have to. Each report compiles inspections, penalties, staffing records, and ownership data into a single professional analysis.</p>
          <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => setShowEvidencePreview(true)}>
            Preview Evidence Package
          </button>
        </div>

        <hr />

        {/* 1. Safety Score */}
        <h2>1. Safety Score</h2>
        <div className={`callout ${safety.cls}`}><strong>{safety.text}</strong></div>

        {facility.jeopardy_count > 0 && (
          <div className="callout box-red">
            <strong>Serious danger to residents: {facility.jeopardy_count} citation(s)</strong><br />
            Government inspectors found conditions so serious that residents faced risk of serious injury or death.
          </div>
        )}

        {facility.harm_count > 0 && (
          <div className="callout box-yellow">
            <strong>Residents were hurt: {facility.harm_count} citation(s)</strong><br />
            Inspectors found that the facility's practices caused actual harm to residents.
          </div>
        )}

        {facility.jeopardy_count === 0 && facility.harm_count === 0 && (
          <div className="callout box-green">
            <strong>No serious safety issues</strong><br />
            No citations for serious danger or actual harm to residents.
          </div>
        )}

        <p className="source">
          Source: CMS Health Deficiencies Data, processed 2026-02-23 | Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica Inspection Report</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a>
        </p>

        {/* Benchmark Bars for Safety Metrics */}
        <BenchmarkBar
          value={facility.total_deficiencies}
          stateAvg={stateBenchmarks.total_deficiencies}
          nationalAvg={nationalBenchmarks.total_deficiencies}
          label="Total Deficiencies vs. Average"
          lowerIsBetter={true}
          format="number"
        />
        <BenchmarkBar
          value={facility.harm_count}
          stateAvg={stateBenchmarks.harm_count}
          nationalAvg={nationalBenchmarks.harm_count}
          label="Harm Citations vs. Average"
          lowerIsBetter={true}
          format="number"
        />
        <BenchmarkBar
          value={facility.jeopardy_count}
          stateAvg={stateBenchmarks.jeopardy_count}
          nationalAvg={nationalBenchmarks.jeopardy_count}
          label="Serious Danger Citations vs. Average"
          lowerIsBetter={true}
          format="number"
        />

        <hr />

        {/* 2. Staffing — Full Overhaul */}
        <h2>2. How Much Care Do Residents Get?</h2>
        <StaffingSection
          facility={facility}
          benchmarks={{ state: stateBenchmarks, national: nationalBenchmarks }}
        />

        {/* Staffing Discrepancy Alert */}
        {facility.rn_gap_pct > 30 && (
          <div className="alert-box-yellow" style={{ marginTop: '12px' }}>
            <strong>⚠ Staffing Discrepancy:</strong> This facility self-reports <strong>{facility.rn_gap_pct.toFixed(0)}% more RN hours</strong> than verified payroll records show. When what a facility tells the government doesn't match what they actually pay their staff, it raises questions about accuracy. <em>Ask to see the posted daily staffing schedule — they are required to display it.</em>
          </div>
        )}

        {/* Staffing Trend Chart - NO LONGER PAYWALLED */}
        {facility.staffing_trend && (
          <StaffingTrendChart facility={facility} />
        )}

        <hr />

        {/* Financial Transparency — Related-Party Costs */}
        {facility.related_party_costs > 0 && (
          <UpgradePrompt requiredTier="professional" featureName="Financial Transparency Data">
            <div className="financial-transparency">
              <h2>Financial Transparency — Where does the money go?</h2>
              <div className="financial-big-number">
                ${facility.related_party_costs.toLocaleString()}
              </div>
              <p className="financial-label">Paid to affiliated companies in FY{facility.related_party_year}</p>
              <p className="financial-explainer">Related-party transactions are payments to companies affiliated with the facility's owners — for management fees, real estate leases, or other services. High payments combined with poor quality may indicate profit extraction.</p>
              {facility.related_party_costs > 1000000 && facility.stars <= 2 && (
                <div className="financial-flag">
                  This facility paid over ${(facility.related_party_costs/1000000).toFixed(1)}M to affiliated companies while maintaining a {facility.stars}-star rating.
                </div>
              )}
              <p className="financial-source">Source: <a href={hcris} target="_blank" rel="noopener noreferrer">CMS HCRIS Cost Reports</a>, FY2024 (Worksheet A-8) | Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a></p>
            </div>
          </UpgradePrompt>
        )}

        <hr />

        {/* 3. Inspection History */}
        <h2>3. Inspection History — What did the government find?</h2>

        <p><strong>Total Deficiencies Found: {facility.total_deficiencies || 0}</strong></p>

        {minorCount > 0 && (
          <div className="callout box-green">
            <strong>Minor issues: {minorCount}</strong><br />
            These are technical violations that did not cause harm to residents.
          </div>
        )}

        {facility.harm_count > 0 && (
          <div className="callout box-yellow">
            <strong>Residents were hurt: {facility.harm_count}</strong><br />
            Inspectors documented actual harm to residents from facility practices.
          </div>
        )}

        {facility.jeopardy_count > 0 && (
          <div className="callout box-red">
            <strong>Serious danger to residents: {facility.jeopardy_count}</strong><br />
            Government inspectors found conditions so serious that residents faced risk of serious injury or death.
          </div>
        )}

        {facility.top_categories && facility.top_categories.length > 0 && (
          <>
            <p><strong>Top Problem Areas:</strong></p>
            <ul className="problem-areas">
              {facility.top_categories.map(([category, count]) => (
                <li key={category}>
                  <strong>{category}:</strong> {count} citation(s) — <a href={propublica} target="_blank" rel="noopener noreferrer">View inspection details</a>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="source">
          Source: CMS Health Deficiencies Data, processed 2026-02-23 | Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica Inspection Report</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a>
        </p>

        <hr />

        {/* 4. Fines & Penalties */}
        <h2>4. Fines & Penalties — Has this place been punished?</h2>

        {facility.total_fines > 0 ? (
          <>
            <div className={`callout ${facility.total_fines > 100000 ? 'box-red' : facility.total_fines > 25000 ? 'box-yellow' : 'box-green'}`}>
              <strong>Total Fines: {fmt(facility.total_fines)}</strong><br />
              CMS imposed {facility.fine_count || 0} fine(s) for violations.
            </div>
            {facility.denial_count > 0 && (
              <div className="callout box-yellow">
                <strong>Payment Denials: {facility.denial_count}</strong><br />
                CMS denied Medicare/Medicaid payments as punishment.
              </div>
            )}
          </>
        ) : (
          <div className="callout box-green">
            <strong>No Fines or Penalties</strong><br />
            This facility has not been fined by CMS in recent records.
          </div>
        )}

        <p className="source">Source: CMS Penalties Data, processed 2026-02-23 | Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a></p>

        {/* Benchmark Bar for Fines */}
        {facility.total_fines > 0 && (
          <BenchmarkBar
            value={facility.total_fines}
            stateAvg={stateBenchmarks.total_fines}
            nationalAvg={nationalBenchmarks.total_fines}
            label="Total Fines vs. Average"
            lowerIsBetter={true}
            format="currency"
          />
        )}

        <hr />

        {/* 5. Accountability Indicators */}
        <h2>5. Accountability Indicators</h2>
        <AccountabilityFlags facility={facility} allFacilities={allFacilities} />

        <hr />

        {/* 6. Questions to Ask */}
        <h2>6. Questions to Ask When You Visit</h2>
        <p>Tailored to this facility's specific record:</p>

        {facility.zero_rn_pct > 0 && (
          <div className="question-card">
            <strong>How many registered nurses are on duty right now? What about weekends?</strong><br />
            <span className="context">This facility reported zero RN hours on {pct(facility.zero_rn_pct)} of days. Without an RN present, certain clinical functions cannot be performed — including IV medication administration, complex wound assessment, and evaluation of acute changes in condition.</span>
          </div>
        )}

        {facility.jeopardy_count > 0 && (
          <div className="question-card">
            <strong>What corrective actions were taken after the serious danger citations?</strong><br />
            <span className="context">Government inspectors found serious danger to residents {facility.jeopardy_count} time{facility.jeopardy_count > 1 ? 's' : ''} — risk of serious injury or death.</span>
          </div>
        )}

        {facility.rn_gap_pct > 30 && (
          <div className="question-card">
            <strong>Can I see your actual staffing schedules for the past month?</strong><br />
            <span className="context">Facility reports {pct(facility.rn_gap_pct)} more RN hours than payroll records show. When what a facility tells the government doesn't match what they actually pay their staff, it raises questions about accuracy.</span>
          </div>
        )}

        {facility.total_fines > 50000 && (
          <div className="question-card">
            <strong>What changes have you made since being fined {fmt(facility.total_fines)}?</strong><br />
            <span className="context">This is {((facility.total_fines / (stateBenchmarks.total_fines || 1)).toFixed(0))}× the state average fine amount.</span>
          </div>
        )}

        {facility.chain_facility_count > 10 && (
          <div className="question-card">
            <strong>How does staffing here compare to the operator's other {facility.chain_facility_count} facilities?</strong><br />
            <span className="context">Multi-facility operators can have widely varying quality across their portfolio.</span>
          </div>
        )}

        <div className="question-card">
          <strong>Can I visit at different times — evenings, weekends, mealtimes?</strong><br />
          <span className="context">Staffing and care quality can vary dramatically by time of day and day of the week.</span>
        </div>

        <hr />

        {/* 7. What You Can Do */}
        <h2>7. What You Can Do</h2>
        <ActionPaths facility={facility} />

        <hr />

        {/* Nearby Facilities */}
        <NearbyFacilities facility={facility} />

        <hr />

        {/* Data Sources */}
        <h2>Data Sources</h2>
        <div className="fp-two-col">
          <div>
            <p><strong>CMS Provider Information Data</strong></p>
            <ul>
              <li>14,713 Medicare/Medicaid certified nursing homes</li>
              <li>Includes star ratings, beds, ownership, location</li>
            </ul>
            <p><strong>CMS Ownership Data</strong></p>
            <ul>
              <li>157,839 ownership records</li>
              <li>Tracks 5%+ ownership interests and management</li>
            </ul>
            <p><strong>CMS Health Deficiencies Data</strong></p>
            <ul>
              <li>417,293 deficiency citations</li>
              <li>Standard surveys, complaint investigations, infection control</li>
            </ul>
          </div>
          <div>
            <p><strong>CMS Penalties Data</strong></p>
            <ul>
              <li>18,060 enforcement actions</li>
              <li>Fines and payment denials</li>
            </ul>
            <p><strong>Payroll-Based Journal (PBJ) Daily Nurse Staffing</strong></p>
            <ul>
              <li>1,332,804 daily staffing records (CY2025 Q3)</li>
              <li>Mandatory payroll data nursing homes submit to CMS each quarter</li>
              <li>Shows actual hours worked by RNs, LPNs, and CNAs per day</li>
              <li>Used to verify self-reported staffing numbers</li>
            </ul>
          </div>
        </div>

        <hr />

        {/* Free Report CTA */}
        <div className="free-report-cta">
          <h3>Download Your Free Safety Report</h3>
          <p style={{ fontSize: '1rem', color: '#475569', maxWidth: '560px', margin: '0 auto' }}>
            Everything above — packaged into a shareable PDF with your facility's personalized analysis.
          </p>
          <div className="free-report-features">
            <span>All inspection data</span>
            <span>Staffing analysis & trends</span>
            <span>Financial transparency</span>
            <span>Ownership breakdown</span>
            <span>Visit questions & checklist</span>
            <span>Nearby alternatives</span>
          </div>
          <DownloadButton facility={facility} nearbyFacilities={nearbyForPDF} allFacilities={allFacilities} label="↓ Download Free Report (PDF)" variant="prominent" />
          <div className="free-report-note">Free forever. No login. No email required.</div>
        </div>

        <hr />

        {/* Glossary */}
        <h2>Glossary</h2>
        <table className="fp-glossary">
          <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><strong>RN</strong></td><td>Registered Nurse — highest-level bedside nurse</td></tr>
            <tr><td><strong>LPN</strong></td><td>Licensed Practical Nurse</td></tr>
            <tr><td><strong>CNA</strong></td><td>Certified Nursing Assistant</td></tr>
            <tr><td><strong>Hrs/resident/day</strong></td><td>Total nursing hours divided by number of residents, per day — the standard staffing adequacy measure</td></tr>
            <tr><td><strong>PBJ</strong></td><td>Payroll-Based Journal — mandatory payroll records that nursing homes submit to CMS quarterly</td></tr>
            <tr><td><strong>"Serious danger"</strong></td><td>Most severe deficiency level — inspectors found conditions so serious that residents faced risk of serious injury or death</td></tr>
            <tr><td><strong>"Residents hurt"</strong></td><td>Second-most severe level — inspectors found conditions that caused real harm to residents</td></tr>
            <tr><td><strong>CCN</strong></td><td>CMS Certification Number — unique ID for each Medicare/Medicaid-certified facility</td></tr>
            <tr><td><strong>SFF</strong></td><td>Special Focus Facility — nursing homes CMS has flagged for a history of serious quality issues</td></tr>
          </tbody>
        </table>

        <hr />

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
              <p className="ev-preview-subtitle">10-section litigation-ready report. Here's what's inside:</p>

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
                    <p>${(facility.total_fines || 0).toLocaleString()} in fines · {facility.fine_count || 0} penalties</p>
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

              <p className="ev-value-line">We analyze publicly available federal data from 6 CMS databases so you don't have to. Each report compiles inspections, penalties, staffing records, and ownership data into a single professional analysis.</p>
              <div className="ev-preview-actions">
                <button className="ev-buy-btn" onClick={() => { setShowEvidencePreview(false); checkoutSingleReport(ccn); }}>
                  Download Evidence Report — $29
                </button>
                <p className="ev-or-subscribe">or <Link to="/pricing" onClick={() => setShowEvidencePreview(false)}>subscribe for unlimited access</Link></p>
              </div>
            </div>
          </div>
        )}

        <div className="fp-footer-text">
          The Oversight Report — Nursing Home Risk Data | Data processed 2026-02-23<br />
          Built by Robert Benard · All data sourced from CMS Medicare.gov
        </div>

        <div className="fp-footer-nav">
          <Link to="/">← Back to Map</Link>
        </div>
      </div>
    </div>
  );
}
