import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useFacilityData } from '../hooks/useFacilityData';
import { computeBenchmarks } from '../utils/benchmarks';
import { haversineDistance } from '../utils/haversine';
import { checkoutSingleReport } from '../utils/stripe';
import { NearbyFacilities } from '../components/NearbyFacilities';
import { DownloadButton } from '../components/DownloadButton';
import { ActionPaths } from '../components/ActionPaths';
import StaffingSection from '../components/StaffingSection';
import { StaffingTrendChart } from '../components/StaffingTrendChart';
import { useWatchlist } from '../hooks/useWatchlist';

import '../styles/facility.css';
import '../styles/staffing.css';

export function FacilityPage() {
  const { ccn } = useParams();
  const location = useLocation();
  const { data, loading, error } = useFacilityData();
  const { watchlist, addFacility, removeFacility, isWatched } = useWatchlist();
  const pageRef = useRef(null);
  const fromState = location.state?.fromState || null;
  const [showEvidencePreview, setShowEvidencePreview] = useState(false);
  const [ahcaData, setAhcaData] = useState(null);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [deficiencyDetails, setDeficiencyDetails] = useState(null);

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
  const stars = '⭐'.repeat(Math.max(0, Math.min(5, facility.stars || 0)));
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

        {/* Bottom Line Card */}
        <div className="bottom-line-card">
          <div className="bottom-line-label">⚠ Bottom Line</div>
          <div className="bottom-line-text" dangerouslySetInnerHTML={{ __html: getBottomLine() }} />
          <div className="bottom-line-source">
            Source: CMS Provider Data, Health Deficiencies, Penalties, Ownership · Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a>
          </div>
        </div>

        {/* Section 01 — Safety Score */}
        <div className="section">
          <div className="section-number">01</div>
          <div className="section-title">Safety Score</div>
          <div className="data-grid">
            <div className="data-cell">
              <div className={`data-cell-value ${(facility.total_deficiencies || 0) > 20 ? 'val-red' : 'val-green'}`}>
                {facility.total_deficiencies || 0}
              </div>
              <div className="data-cell-label">Total Deficiencies</div>
              <div className="data-cell-context">
                State avg: {stateBenchmarks.total_deficiencies?.toFixed(1) || 'N/A'} · National: {nationalBenchmarks.total_deficiencies?.toFixed(1) || 'N/A'}
              </div>
            </div>
            <div className="data-cell">
              <div className={`data-cell-value ${(facility.jeopardy_count || 0) > 0 ? 'val-red' : 'val-green'}`}>
                {facility.jeopardy_count || 0}
              </div>
              <div className="data-cell-label">Serious Danger</div>
              <div className="data-cell-context">
                State avg: {stateBenchmarks.jeopardy_count?.toFixed(1) || 'N/A'} · National: {nationalBenchmarks.jeopardy_count?.toFixed(1) || 'N/A'}
              </div>
            </div>
            <div className="data-cell">
              <div className={`data-cell-value ${(facility.total_fines || 0) > 50000 ? 'val-red' : (facility.total_fines || 0) > 0 ? 'val-orange' : 'val-green'}`}>
                {fmt(facility.total_fines)}
              </div>
              <div className="data-cell-label">Total Fines</div>
              <div className="data-cell-context">
                State avg: {fmt(stateBenchmarks.total_fines)}
              </div>
            </div>
            <div className="data-cell">
              <div className={`data-cell-value ${(facility.zero_rn_pct || 0) > 5 ? 'val-red' : 'val-green'}`}>
                {pct(facility.zero_rn_pct)}
              </div>
              <div className="data-cell-label">Zero-RN Days</div>
              <div className="data-cell-context">Days with no registered nurse on site</div>
            </div>
          </div>
        </div>

        {/* Section 02 — What Did Inspectors Find? */}
        <div className="section">
          <div className="section-number">02</div>
          <div className="section-title">What Did Inspectors Find?</div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {facility.total_deficiencies || 0} total deficiency citations.
            {facility.jeopardy_count > 0 && <> <strong style={{ color: 'var(--accent-red, #f85149)' }}>{facility.jeopardy_count}</strong> were classified as <strong style={{ color: 'var(--accent-red, #f85149)' }}>serious danger</strong> — the most severe level.</>}
          </p>
          <ul className="deficiency-list">
            {deficiencyDetails && deficiencyDetails.length > 0 ? (
              <>
                {deficiencyDetails
                  .sort((a, b) => {
                    const severityOrder = { 'Immediate Jeopardy': 0, 'Actual Harm': 1 };
                    return (severityOrder[a.severity_label] ?? 2) - (severityOrder[b.severity_label] ?? 2);
                  })
                  .slice(0, 7)
                  .map((def, idx) => {
                    const severityClass = def.severity_label === 'Immediate Jeopardy' ? 'severity-danger'
                      : def.severity_label === 'Actual Harm' ? 'severity-harm' : 'severity-minor';
                    const severityText = def.severity_label === 'Immediate Jeopardy' ? 'Serious Danger'
                      : def.severity_label === 'Actual Harm' ? 'Residents Hurt' : 'Minor';
                    const year = def.survey_date ? new Date(def.survey_date).getFullYear() : '';
                    const surveyLabel = def.is_complaint ? 'Complaint Investigation' : 'Standard Health Survey';
                    return (
                      <li className="deficiency-item" key={idx}>
                        <span className={`deficiency-severity ${severityClass}`}>{severityText}</span>
                        <div>
                          <div className="deficiency-text">{def.description}</div>
                          <div className="deficiency-category">{def.category}</div>
                          <div className="deficiency-date">{surveyLabel} · {year}</div>
                        </div>
                      </li>
                    );
                  })}
              </>
            ) : (
              <>
                {facility.jeopardy_count > 0 && (
                  <li className="deficiency-item">
                    <span className="deficiency-severity severity-danger">Serious Danger</span>
                    <div>
                      <div className="deficiency-text">
                        {facility.jeopardy_count} citation(s) — conditions so serious that residents faced risk of serious injury or death
                      </div>
                    </div>
                  </li>
                )}
                {facility.harm_count > 0 && (
                  <li className="deficiency-item">
                    <span className="deficiency-severity severity-harm">Residents Hurt</span>
                    <div>
                      <div className="deficiency-text">
                        {facility.harm_count} citation(s) — facility practices caused actual harm to residents
                      </div>
                    </div>
                  </li>
                )}
                {minorCount > 0 && (
                  <li className="deficiency-item">
                    <span className="deficiency-severity severity-minor">Minor</span>
                    <div>
                      <div className="deficiency-text">
                        {minorCount} citation(s) — technical violations that did not cause direct harm
                      </div>
                    </div>
                  </li>
                )}
              </>
            )}
          </ul>
          {deficiencyDetails && deficiencyDetails.length > 7 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Showing 7 of {deficiencyDetails.length} citations · <a href={propublica} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue, #7c8aff)', textDecoration: 'none' }}>View all {deficiencyDetails.length} deficiencies →</a>
            </p>
          )}
          <div className="source-line">Source: CMS Health Deficiencies Data · Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a></div>
        </div>

        {/* Section 03 — How Much Care Do Residents Get? */}
        <div className="section">
          <div className="section-number">03</div>
          <div className="section-title">How Much Care Do Residents Get?</div>
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

        {/* Section 04 — Fines & Penalties */}
        <div className="section">
          <div className="section-number">04</div>
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
        </div>

        {/* Section 05 — Financial Transparency */}
        {facility.related_party_costs > 0 && (
          <div className="section">
            <div className="section-number">05</div>
            <div className="section-title">Financial Transparency</div>
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
          </div>
        )}

        {/* Section 06 — Who Runs This Place? */}
        <div className="section">
          <div className="section-number">06</div>
          <div className="section-title">Who Runs This Place?</div>
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
          <div className="source-line">Source: CMS Care Compare, ownership records</div>
        </div>

        {/* Section 07 — Questions to Ask */}
        <div className="section">
          <div className="section-number">07</div>
          <div className="section-title">Questions to Ask When You Visit</div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #9d97b8)', marginBottom: '16px' }}>Tailored to this facility's specific record:</p>

          {facility.zero_rn_pct > 0 && (
            <div className="question-item">
              <div className="question-text">How many registered nurses are on duty right now? What about weekends?</div>
              <div className="question-context">This facility reported zero RN hours on {pct(facility.zero_rn_pct)} of days.</div>
            </div>
          )}

          {facility.jeopardy_count > 0 && (
            <div className="question-item">
              <div className="question-text">What corrective actions were taken after the serious danger citations?</div>
              <div className="question-context">Inspectors found serious danger to residents {facility.jeopardy_count} time{facility.jeopardy_count > 1 ? 's' : ''}.</div>
            </div>
          )}

          {facility.rn_gap_pct > 30 && (
            <div className="question-item">
              <div className="question-text">Can I see your actual staffing schedules for the past month?</div>
              <div className="question-context">Payroll records account for only {(100 - facility.rn_gap_pct).toFixed(0)}% of self-reported RN hours.</div>
            </div>
          )}

          {facility.total_fines > 50000 && (
            <div className="question-item">
              <div className="question-text">What changes have you made since being fined {fmt(facility.total_fines)}?</div>
              <div className="question-context">This is {((facility.total_fines / (stateBenchmarks.total_fines || 1)).toFixed(0))}× the state average fine amount.</div>
            </div>
          )}

          {facility.chain_facility_count > 10 && (
            <div className="question-item">
              <div className="question-text">How does staffing here compare to the operator's other {facility.chain_facility_count} facilities?</div>
              <div className="question-context">Multi-facility operators can have widely varying quality across their portfolio.</div>
            </div>
          )}

          <div className="question-item">
            <div className="question-text">Can I visit at different times — evenings, weekends, mealtimes?</div>
            <div className="question-context">Staffing and care quality can vary dramatically by time of day.</div>
          </div>
        </div>

        {/* Section 08 — What You Can Do */}
        <div className="section">
          <div className="section-number">08</div>
          <div className="section-title">What You Can Do</div>
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
          <DownloadButton facility={facility} nearbyFacilities={nearbyForPDF} allFacilities={allFacilities} label="↓ Download Free Report (PDF)" variant="prominent" />
          <div className="free-report-note">Free forever. No login. No email required.</div>
        </div>

        {/* Evidence Package CTA */}
        <div className="paid-upsell">
          <div className="paid-upsell-header">
            <h3>Need This for a Case?</h3>
            <span className="paid-price">$29</span>
          </div>
          <div className="paid-upsell-desc">
            A 10-section litigation-ready Evidence Package. Everything in the free report plus deeper analysis — compiled from 6 CMS databases into a single professional document.
          </div>
          <div className="paid-features">
            <span className="paid-feature">Exhibit-numbered citations</span>
            <span className="paid-feature">Multi-year trend analysis</span>
            <span className="paid-feature">Side-by-side state/national comparisons</span>
            <span className="paid-feature">Full ownership network map</span>
            <span className="paid-feature">Staffing discrepancy documentation</span>
            <span className="paid-feature">Related-party transaction detail</span>
          </div>
          <button className="btn-evidence" onClick={() => setShowEvidencePreview(true)}>Preview Evidence Package</button>
          <div className="paid-upsell-note">One-time purchase. Instant download. Used by attorneys, journalists, and regulators.</div>
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

        {/* Glossary */}
        <div className="section">
          <div className="section-title">Glossary</div>
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
