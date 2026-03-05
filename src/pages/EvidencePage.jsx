import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useFacilityData } from '../hooks/useFacilityData';
import { haversineDistance } from '../utils/haversine';
import { generateEvidencePDF } from '../utils/generateEvidencePDF';
import { checkoutSingleReport } from '../utils/stripe';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';

import ComingSoonPage from '../components/ComingSoonPage';
import '../styles/evidence.css';

export function EvidencePage() {
  const COMING_SOON = false;
  const { ccn } = useParams();
  const { data, loading, error } = useFacilityData();
  const { tier } = useSubscription();

  const facility = data?.states
    ? Object.values(data.states).flatMap(state => state.facilities || []).find(f => f.ccn === ccn)
    : null;

  // All facilities for nearby alternatives
  const allFacilities = useMemo(() => {
    if (!data?.states) return [];
    return Object.values(data.states).flatMap(state => state.facilities || []);
  }, [data]);

  // Nearby alternatives with better scores
  const nearbyAlternatives = useMemo(() => {
    if (!facility || !facility.lat || !facility.lon || !allFacilities.length) {
      return [];
    }

    const alternatives = allFacilities
      .filter(f => {
        if (f.ccn === facility.ccn) return false;
        if (!f.lat || !f.lon) return false;
        if ((f.composite || 100) >= (facility.composite || 0)) return false;
        return true;
      })
      .map(f => ({
        ...f,
        distance: haversineDistance(facility.lat, facility.lon, f.lat, f.lon)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    return alternatives;
  }, [facility, allFacilities]);

  // Ownership portfolio analysis
  const ownershipPortfolio = useMemo(() => {
    if (!facility || !facility.worst_owner || !allFacilities.length) {
      return null;
    }

    const portfolioFacilities = allFacilities.filter(f => f.worst_owner === facility.worst_owner);

    if (portfolioFacilities.length <= 1) {
      return null;
    }

    const states = [...new Set(portfolioFacilities.map(f => f.state))];
    const avgStars = portfolioFacilities.reduce((sum, f) => sum + (f.stars || 0), 0) / portfolioFacilities.length;
    const avgFines = portfolioFacilities.reduce((sum, f) => sum + (f.total_fines || 0), 0) / portfolioFacilities.length;
    const avgComposite = portfolioFacilities.reduce((sum, f) => sum + (f.composite || 0), 0) / portfolioFacilities.length;
    const jeopardyFacilities = portfolioFacilities.filter(f => (f.jeopardy_count || 0) > 0).length;
    const jeopardyPct = (jeopardyFacilities / portfolioFacilities.length) * 100;
    const worst5 = [...portfolioFacilities].sort((a, b) => (b.composite || 0) - (a.composite || 0)).slice(0, 5);

    return {
      count: portfolioFacilities.length,
      states: states.length,
      avgStars: avgStars.toFixed(1),
      avgFines,
      avgComposite: avgComposite.toFixed(1),
      jeopardyPct: jeopardyPct.toFixed(0),
      worst5,
    };
  }, [facility, allFacilities]);

  // Chain portfolio analysis
  const chainPortfolio = useMemo(() => {
    if (!facility || !facility.chain_name || !allFacilities.length) return null;
    const chainFacs = allFacilities.filter(f => f.chain_name === facility.chain_name);
    if (chainFacs.length <= 1) return null;
    const avgStars = chainFacs.reduce((s, f) => s + (f.stars || 0), 0) / chainFacs.length;
    const avgFines = chainFacs.reduce((s, f) => s + (f.total_fines || 0), 0) / chainFacs.length;
    const avgComposite = chainFacs.reduce((s, f) => s + (f.composite || 0), 0) / chainFacs.length;
    return { count: chainFacs.length, avgStars: avgStars.toFixed(1), avgFines, avgComposite: avgComposite.toFixed(1) };
  }, [facility, allFacilities]);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [deficiencyDetails, setDeficiencyDetails] = useState(null);
  const [defDetailsLoading, setDefDetailsLoading] = useState(false);

  // Fetch deficiency details on mount
  useEffect(() => {
    if (!facility?.state) return;
    setDefDetailsLoading(true);
    fetch(`${import.meta.env.BASE_URL}deficiency_details/${facility.state}.json`)
      .then(resp => resp.ok ? resp.json() : null)
      .then(stateData => {
        if (stateData) {
          const facDetails = stateData[String(facility.ccn)];
          setDeficiencyDetails(facDetails?.deficiency_details || []);
        }
      })
      .catch(() => setDeficiencyDetails(null))
      .finally(() => setDefDetailsLoading(false));
  }, [facility?.state, facility?.ccn]);

  const handleDownloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      let enrichedFacility = { ...facility };
      if (deficiencyDetails) {
        enrichedFacility.deficiency_details = deficiencyDetails;
      } else if (facility?.state) {
        try {
          const resp = await fetch(`${import.meta.env.BASE_URL}deficiency_details/${facility.state}.json`);
          if (resp.ok) {
            const stateDeficiencies = await resp.json();
            const facDetails = stateDeficiencies[String(facility.ccn)];
            if (facDetails?.deficiency_details) {
              enrichedFacility.deficiency_details = facDetails.deficiency_details;
            }
          }
        } catch (e) {
          console.warn('Could not load deficiency details:', e);
        }
      }
      generateEvidencePDF(enrichedFacility, nearbyAlternatives, allFacilities);
      window.plausible && window.plausible('PDF-Download', {props: {facility: facility.name, ccn: facility.ccn, state: facility.state}});
    } finally {
      setPdfLoading(false);
    }
  }, [facility, nearbyAlternatives, allFacilities, deficiencyDetails]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (facility) {
      window.plausible && window.plausible('Evidence-Page-View', {props: {facility: facility.name, ccn: facility.ccn}});
    }
  }, [ccn, facility]);

  if (COMING_SOON) {
    return (
      <ComingSoonPage
        title="Evidence Packages"
        description="Generate comprehensive, professionally documented PDF reports for any facility. Ten sections covering staffing, inspections, penalties, ownership, quality measures, and nearby alternatives — everything an attorney or ombudsman needs in one document."
        tier="professional"
        features={[
          '10-section facility analysis in a single PDF',
          'Staffing data with payroll verification',
          'Complete inspection and deficiency history',
          'Penalty and fine records with amounts',
          'Nearby alternative facilities with comparative data',
          'Ownership network context',
        ]}
      />
    );
  }

  if (loading) {
    return (
      <div className="ev">
        <div className="ev-loading">Loading facility data...</div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="ev">
        <div className="ev-error">
          <h1>Facility Not Found</h1>
          <p>We could not find a facility with CCN: {ccn}</p>
          <Link to="/">Return to Map</Link>
        </div>
      </div>
    );
  }

  // Helper functions
  const fmt = (v) => (!v && v !== 0) ? 'N/A' : `$${Math.round(v).toLocaleString()}`;
  const pct = (v) => (v === null || v === undefined) ? 'N/A' : `${v.toFixed(1)}%`;
  const num = (v) => (v === null || v === undefined) ? 'N/A' : v.toFixed(2);

  // Red flags logic
  const redFlags = [];
  if (facility.jeopardy_count > 0) {
    redFlags.push({ metric: `Immediate Jeopardy: ${facility.jeopardy_count} citation${facility.jeopardy_count > 1 ? 's' : ''}`, detail: 'Immediate jeopardy citations (42 CFR §488.301) indicate conditions that have caused, or are likely to cause, serious injury, harm, impairment, or death.', type: 'critical' });
  }
  if (facility.harm_count > 0) {
    redFlags.push({ metric: `Actual Harm: ${facility.harm_count} citation${facility.harm_count > 1 ? 's' : ''}`, detail: 'Actual harm citations indicate residents were directly and negatively affected by facility practices or conditions.', type: 'critical' });
  }
  if (facility.total_hprd && facility.total_hprd < 3.48) {
    redFlags.push({ metric: `Total Staffing Below 3.48 HPRD: ${num(facility.total_hprd)} hours`, detail: `In February 2026, 18 state Attorneys General called 3.48 HPRD the minimum safe staffing level. This facility is ${((1 - facility.total_hprd / 3.48) * 100).toFixed(0)}% below that threshold.`, type: 'warning' });
  }
  if (facility.zero_rn_pct > 25) {
    redFlags.push({ metric: `High Zero-RN Days: ${pct(facility.zero_rn_pct)}`, detail: 'Federal law (42 CFR §483.35) requires an RN on site at least 8 hours per day, 7 days per week.', type: 'warning' });
  }
  if (facility.rn_gap_pct > 30) {
    redFlags.push({ metric: `Staffing Verification Gap: ${pct(facility.rn_gap_pct)}`, detail: 'Large discrepancies between self-reported and payroll-verified staffing may warrant investigation.', type: 'warning' });
  }
  if (facility.total_fines > 100000) {
    redFlags.push({ metric: `High Financial Penalties: ${fmt(facility.total_fines)}`, detail: 'Repeated or severe violations resulted in substantial civil monetary penalties.', type: 'warning' });
  }
  if (facility.contractor_pct && facility.contractor_pct > 30) {
    redFlags.push({ metric: `High Contract Staffing: ${pct(facility.contractor_pct)}`, detail: 'Research links high contract staffing rates to continuity of care concerns.', type: 'info' });
  }

  // Executive summary auto-generated
  const getExecutiveSummary = () => {
    const parts = [];
    const score = facility.composite || 0;

    if (score >= 70) {
      parts.push('This facility shows significant patterns of concern in federal data.');
    } else if (score >= 50) {
      parts.push('This facility shows some patterns of concern in federal data.');
    } else {
      parts.push('This facility shows relatively few concerns in federal data.');
    }

    if (facility.jeopardy_count > 0 || facility.harm_count > 0) {
      parts.push(`Inspectors documented serious safety issues including ${facility.jeopardy_count > 0 ? 'conditions posing serious harm to residents' : 'actual harm to residents'}.`);
    }

    if (facility.total_fines > 50000) {
      parts.push(`Federal regulators have imposed ${fmt(facility.total_fines)} in financial penalties.`);
    } else if (facility.total_fines === 0) {
      parts.push('No federal financial penalties recorded in recent data.');
    }

    if (parts.length === 0) {
      parts.push('Limited information available for comprehensive assessment.');
    }

    return parts.join(' ');
  };

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // National benchmarks
  const NATIONAL_AVG = {
    total_hprd: 3.82, rn_hprd: 0.54, zero_rn_pct: 8.0, contractor_pct: 12.0,
    total_turnover: 46.4, rn_turnover: 43.6, admin_turnover: 0.5,
    complaint_investigations: 7, fire_deficiency_count: 14.3,
    stars: 3.2, total_deficiencies: 8.5, total_fines: 28000, composite: 32.1,
  };

  // QRP labels
  const qrpLabels = { ppr: 'Potentially Preventable Readmissions', dtc: 'Discharge to Community', hai: 'Healthcare-Associated Infections' };
  const qrpColors = { better: '#059669', same: '#D97706', worse: '#DC2626' };

  // Claims labels
  const claimsLabels = { '521': 'Rehospitalized within 30 days', '522': 'Emergency Room visits' };

  // Gate check - if not professional tier, show purchase options
  if (!canAccess(tier, 'professional')) {
    return (
      <div className="ev">
        <div className="ev-header no-print">
          <Link to={`/facility/${ccn}`} className="ev-back">Back to Report Card</Link>
          <h2 className="ev-badge">Evidence Package</h2>
        </div>
        <div className="ev-body" style={{ opacity: 0.4, filter: 'blur(3px)', pointerEvents: 'none' }}>
          <section className="ev-section ev-cover">
            <div className="ev-logo">THE OVERSIGHT REPORT</div>
            <h1 className="ev-facility-name">{facility?.name || 'Facility Name'}</h1>
          </section>
        </div>
        <div className="ev-purchase-gate">
          <h2>Evidence Package — {facility.name}</h2>
          <p>10-section professionally documented report with staffing data, inspection history, penalties, ownership profile, and nearby alternatives.</p>
          <p className="ev-value-line">We analyze publicly available federal data from 16 CMS databases so you don't have to. Each report compiles inspections, penalties, staffing records, ownership, quality measures, and cost reports into a single professional analysis.</p>
          <div className="ev-purchase-options">
            <button className="ev-buy-btn" onClick={() => checkoutSingleReport(ccn)}>
              Download Evidence Report — $29
            </button>
            <p className="ev-or-subscribe">or <Link to="/pricing">subscribe for unlimited access</Link></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ev">
      <Helmet>
        <title>{facility?.name || 'Facility'} — Evidence Package | The Oversight Report</title>
        <meta name="description" content={`Evidence package for ${facility?.name || 'facility'} in ${facility?.city || ''}, ${facility?.state || ''}. Comprehensive safety documentation for legal and advocacy use.`} />
        <link rel="canonical" href={`https://oversightreports.com/evidence/${ccn}`} />
      </Helmet>
      {/* Header */}
      <div className="ev-header no-print">
        <Link to={`/facility/${ccn}`} className="ev-back">Back to Report Card</Link>
        <h2 className="ev-badge">Evidence Package</h2>
        <div className="ev-header-actions">
          <button onClick={handlePrint} className="ev-btn ev-btn-secondary">
            Print Version
          </button>
          <button onClick={handleDownloadPDF} className="ev-btn ev-btn-primary" disabled={pdfLoading}>
            {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Page Preview */}
      <div className="ev-body">

        {/* ============================================================ */}
        {/* COVER PAGE */}
        {/* ============================================================ */}
        <section className="ev-section ev-cover">
          <div className="ev-logo">THE OVERSIGHT REPORT</div>
          <h1 className="ev-facility-name">{facility.name}</h1>
          <div className="ev-facility-meta">
            <p>{facility.address || ''}</p>
            <p>{facility.city}, {facility.state} {facility.zip || ''}</p>
            <p className="ev-ccn">CMS CCN: {ccn}</p>
          </div>
          <div className="ev-confidential">
            CONFIDENTIAL — Prepared for authorized use
          </div>
          <div className="ev-date">Generated: {today}</div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 1: EXECUTIVE SUMMARY */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">1. Executive Summary</h2>
          <div className="ev-summary-grid">
            <div className="ev-summary-item">
              <div className="ev-summary-label">Risk Score</div>
              <div className="ev-summary-value">{facility.composite?.toFixed(1) || 'N/A'}</div>
            </div>
            <div className="ev-summary-item">
              <div className="ev-summary-label">CMS Star Rating</div>
              <div className="ev-summary-value">{facility.stars || 0}/5</div>
            </div>
            <div className="ev-summary-item">
              <div className="ev-summary-label">Total Fines</div>
              <div className="ev-summary-value">{fmt(facility.total_fines || 0)}</div>
            </div>
            <div className="ev-summary-item">
              <div className="ev-summary-label">Deficiencies</div>
              <div className="ev-summary-value">{facility.total_deficiencies || 0}</div>
            </div>
          </div>
          <div className="ev-text-block">
            <p><strong>Assessment:</strong></p>
            <p>{getExecutiveSummary()}</p>
          </div>

          {/* Component Scores Breakdown */}
          {(facility.staffing_stars || facility.quality_stars || facility.inspection_stars) && (
            <>
              <h3 className="ev-subsection">CMS Component Ratings</h3>
              {facility.staffing_stars != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Staffing Rating:</span>
                  <span className="ev-data-value">{facility.staffing_stars}/5</span>
                </div>
              )}
              {facility.quality_stars != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Quality Measures Rating:</span>
                  <span className="ev-data-value">{facility.quality_stars}/5</span>
                </div>
              )}
              {facility.inspection_stars != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Inspection Rating:</span>
                  <span className="ev-data-value">{facility.inspection_stars}/5</span>
                </div>
              )}
            </>
          )}
        </section>

        {/* ============================================================ */}
        {/* SECTION 2: OWNERSHIP PROFILE */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">2. Ownership Profile</h2>
          <div className="ev-data-row">
            <span className="ev-data-label">Owner Name:</span>
            <span className="ev-data-value">{facility.worst_owner || facility.chain_name || 'N/A'}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Chain Name:</span>
            <span className="ev-data-value">{facility.chain_name || 'N/A'}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Ownership Type:</span>
            <span className="ev-data-value">{facility.ownership_type || 'N/A'}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Portfolio Size:</span>
            <span className="ev-data-value">{facility.owner_portfolio_count > 1 ? `${facility.owner_portfolio_count} facilities` : '1 facility'}</span>
          </div>

          {/* PE/REIT Detection */}
          {(facility.pe_owned || facility.reit_owned || facility.investment_firm_involved) && (
            <>
              <h3 className="ev-subsection">Private Equity / REIT Involvement</h3>
              {facility.pe_owned && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Private Equity Owner:</span>
                  <span className="ev-data-value" style={{ color: '#DC2626' }}>{facility.pe_owner_name || 'Yes'}</span>
                </div>
              )}
              {facility.reit_owned && (
                <div className="ev-data-row">
                  <span className="ev-data-label">REIT Owner:</span>
                  <span className="ev-data-value" style={{ color: '#D97706' }}>{facility.reit_owner_name || 'Yes'}</span>
                </div>
              )}
              {facility.investment_firm_involved && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Investment Firm Involved:</span>
                  <span className="ev-data-value">Yes</span>
                </div>
              )}
              {facility.pe_detection_method && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Detection Method:</span>
                  <span className="ev-data-value" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{facility.pe_detection_method}</span>
                </div>
              )}
              <div className="ev-text-block">
                <p>
                  Some peer-reviewed studies have examined the relationship between private equity ownership of nursing homes and outcomes including mortality rates, staffing levels, and Medicare spending. PE-backed facilities may face different financial pressures from leveraged debt structures.
                </p>
              </div>
            </>
          )}

          {/* Ownership Change */}
          {facility.ownership_changed_recently && (
            <>
              <h3 className="ev-subsection">Recent Ownership Change</h3>
              {facility.ownership_change_date && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Ownership Change Date:</span>
                  <span className="ev-data-value">{facility.ownership_change_date}</span>
                </div>
              )}
              {facility.new_owner_name && (
                <div className="ev-data-row">
                  <span className="ev-data-label">New Owner:</span>
                  <span className="ev-data-value">{facility.new_owner_name}</span>
                </div>
              )}
              <div className="ev-alert">
                <strong>Ownership Transition:</strong> This facility changed ownership recently. Some research has examined quality metrics during ownership transitions, noting potential changes as new management adjusts care processes and staffing.
              </div>
            </>
          )}

          {/* Owner Portfolio Analysis */}
          {ownershipPortfolio && (
            <>
              <h3 className="ev-subsection">Owner Portfolio Analysis</h3>
              <div className="ev-text-block">
                <p>
                  This facility is operated by (Parent Organization): <strong>{facility.worst_owner}</strong>, who controls{' '}
                  <strong>{ownershipPortfolio.count} facilities</strong> across{' '}
                  <strong>{ownershipPortfolio.states} states</strong>.{' '}
                  Average star rating: <strong>{ownershipPortfolio.avgStars}</strong>.{' '}
                  Average risk score: <strong>{ownershipPortfolio.avgComposite}</strong>.{' '}
                  Average fines per facility: <strong>{fmt(ownershipPortfolio.avgFines)}</strong>.{' '}
                  <strong>{ownershipPortfolio.jeopardyPct}%</strong> of portfolio facilities have immediate jeopardy citations.
                </p>
              </div>

              {/* Worst 5 in portfolio */}
              {ownershipPortfolio.worst5 && ownershipPortfolio.worst5.length > 0 && (
                <>
                  <h3 className="ev-subsection">Lowest-Performing Facilities in Portfolio</h3>
                  <table className="ev-table">
                    <thead>
                      <tr>
                        <th>Facility</th>
                        <th>Location</th>
                        <th>Stars</th>
                        <th>Risk</th>
                        <th>Fines</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownershipPortfolio.worst5.map(f => (
                        <tr key={f.ccn} style={f.ccn === facility.ccn ? { background: '#FFF9DB' } : {}}>
                          <td>{f.ccn === facility.ccn ? '>> ' : ''}{f.name}</td>
                          <td>{f.city}, {f.state}</td>
                          <td>{f.stars || 0}/5</td>
                          <td>{(f.composite || 0).toFixed(1)}</td>
                          <td>{fmt(f.total_fines || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}

          {/* Chain Performance */}
          {chainPortfolio && chainPortfolio.count > 1 && facility.chain_name !== facility.worst_owner && (
            <>
              <h3 className="ev-subsection">Chain-Wide Performance</h3>
              <div className="ev-text-block">
                <p>
                  Chain: <strong>{facility.chain_name}</strong> ({chainPortfolio.count} facilities).{' '}
                  Chain average: <strong>{chainPortfolio.avgStars}</strong> stars,{' '}
                  <strong>{chainPortfolio.avgComposite}</strong> risk score,{' '}
                  <strong>{fmt(chainPortfolio.avgFines)}</strong> avg fines.
                </p>
              </div>
            </>
          )}

          <div className="ev-verify">
            <a href={`https://www.medicare.gov/care-compare/details/nursing-home/${ccn}`} target="_blank" rel="noopener noreferrer">
              Verify ownership data on Medicare Care Compare
            </a>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 3: STAFFING ANALYSIS */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">3. Staffing Analysis</h2>

          <h3 className="ev-subsection">Hours Per Resident Per Day (HPRD)</h3>
          <div className="ev-data-row">
            <span className="ev-data-label">Registered Nurse (RN):</span>
            <span className="ev-data-value">{num(facility.rn_hprd)} hrs <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.rn_hprd})</span></span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Licensed Practical Nurse (LPN):</span>
            <span className="ev-data-value">{num(facility.lpn_hprd)} hrs</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Certified Nursing Assistant (CNA):</span>
            <span className="ev-data-value">{num(facility.cna_hprd)} hrs</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Total Nursing:</span>
            <span className="ev-data-value">{num(facility.total_hprd)} hrs <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.total_hprd})</span></span>
          </div>

          {/* Weekend Staffing Drop */}
          {facility.weekend_total_hprd != null && (
            <>
              <h3 className="ev-subsection">Weekend vs. Weekday Staffing</h3>
              <div className="ev-data-row">
                <span className="ev-data-label">Weekday Total HPRD:</span>
                <span className="ev-data-value">{num(facility.total_hprd)} hrs</span>
              </div>
              <div className="ev-data-row">
                <span className="ev-data-label">Weekend Total HPRD:</span>
                <span className="ev-data-value">{num(facility.weekend_total_hprd)} hrs</span>
              </div>
              {facility.rn_hprd != null && facility.weekend_rn_hprd != null && (
                <>
                  <div className="ev-data-row">
                    <span className="ev-data-label">Weekday RN HPRD:</span>
                    <span className="ev-data-value">{num(facility.rn_hprd)} hrs</span>
                  </div>
                  <div className="ev-data-row">
                    <span className="ev-data-label">Weekend RN HPRD:</span>
                    <span className="ev-data-value">{num(facility.weekend_rn_hprd)} hrs</span>
                  </div>
                </>
              )}
              {facility.total_hprd > 0 && (() => {
                const totalDrop = ((facility.total_hprd - facility.weekend_total_hprd) / facility.total_hprd * 100);
                return totalDrop > 20 ? (
                  <div className="ev-alert">
                    <strong>Weekend Staffing Gap:</strong> Weekend staffing drops {totalDrop.toFixed(1)}% below weekday levels. CMS Payroll-Based Journal data shows staffing levels typically differ between weekdays and weekends. Weekend staffing patterns may be relevant when evaluating overall care capacity.
                  </div>
                ) : null;
              })()}
              {facility.rn_hprd > 0 && facility.weekend_rn_hprd != null && (() => {
                const rnDrop = ((facility.rn_hprd - facility.weekend_rn_hprd) / facility.rn_hprd * 100);
                return rnDrop > 20 ? (
                  <div className="ev-alert">
                    <strong>Weekend RN Coverage Gap:</strong> Registered nurse hours drop {rnDrop.toFixed(1)}% on weekends ({num(facility.rn_hprd)} hrs weekday vs. {num(facility.weekend_rn_hprd)} hrs weekend). Reduced RN presence limits clinical assessment and medication management oversight.
                  </div>
                ) : null;
              })()}
            </>
          )}

          {/* Contract Staffing */}
          {facility.contractor_pct != null && (
            <>
              <h3 className="ev-subsection">Contract Staffing Reliance</h3>
              <div className="ev-data-row">
                <span className="ev-data-label">Contract/Agency Staff (%):</span>
                <span className="ev-data-value">{pct(facility.contractor_pct)} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.contractor_pct}%)</span></span>
              </div>
              <div className="ev-text-block">
                <p>
                  Contract or agency staff are temporary workers hired through staffing agencies. High reliance on contract staff reduces continuity of care — temporary nurses are unfamiliar with residents' individual needs, care plans, and histories.
                </p>
              </div>
              {facility.contractor_pct > 20 && (
                <div className="ev-alert">
                  <strong>High Contract Staffing:</strong> {pct(facility.contractor_pct)} of RN hours are provided by temporary contract staff — above the 20% threshold associated with continuity-of-care concerns in Health Affairs research. National average is {NATIONAL_AVG.contractor_pct}%.
                </div>
              )}
            </>
          )}

          {/* Staffing Verification */}
          <h3 className="ev-subsection">Staffing Verification</h3>
          <div className="ev-text-block">
            <p>
              <strong>Data Collection Context:</strong> Staffing data is self-reported by the facility to CMS through the Payroll-Based Journal (PBJ) system. While PBJ data is derived from payroll records, facilities control what is submitted. Independent audits of PBJ accuracy are limited.
            </p>
          </div>

          <div className="ev-data-row">
            <span className="ev-data-label">Self-Reported RN Hours:</span>
            <span className="ev-data-value">{num(facility.self_report_rn)} hrs</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Verified RN Hours (Payroll):</span>
            <span className="ev-data-value">{num(facility.rn_hprd)} hrs</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Discrepancy:</span>
            <span className="ev-data-value">{pct(facility.rn_gap_pct)}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Days Without RN:</span>
            <span className="ev-data-value">{pct(facility.zero_rn_pct)}</span>
          </div>

          {facility.zero_rn_pct > 0 && (
            <div className="ev-alert">
              <strong>Regulatory Context:</strong> Federal law (42 CFR §483.35) requires a registered nurse on site for at least 8 consecutive hours per day, 7 days per week. This facility reported zero RN hours on {pct(facility.zero_rn_pct)} of days, which may indicate a violation of this federal requirement.
            </div>
          )}

          {facility.total_hprd < 3.48 && (
            <div className="ev-alert">
              <strong>Staffing Standard Context:</strong> In February 2026, 18 state Attorneys General urged CMS to adopt a minimum staffing standard of 3.48 hours per resident per day. This facility provides {num(facility.total_hprd)} HPRD, which is {((1 - facility.total_hprd / 3.48) * 100).toFixed(0)}% below the proposed threshold.
            </div>
          )}

          {facility.rn_gap_pct > 20 && (
            <div className="ev-alert">
              <strong>Verification Discrepancy:</strong> This facility shows a {pct(facility.rn_gap_pct)} discrepancy between self-reported and verified staffing levels, which may warrant further investigation.
            </div>
          )}

          {/* Workforce Stability (Turnover) */}
          {(facility.total_turnover != null || facility.rn_turnover != null || facility.admin_turnover != null) && (
            <>
              <h3 className="ev-subsection">Workforce Stability (Turnover)</h3>
              <div className="ev-text-block">
                <p>
                  CMS collects turnover data from Payroll-Based Journal (PBJ) submissions. High turnover is an evidence marker of institutional instability — research consistently links elevated nurse turnover to lower care quality and increased adverse events.
                </p>
              </div>
              {facility.total_turnover != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Total Nursing Staff Turnover:</span>
                  <span className="ev-data-value">{facility.total_turnover.toFixed(1)}% <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.total_turnover}%)</span></span>
                </div>
              )}
              {facility.rn_turnover != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Registered Nurse Turnover:</span>
                  <span className="ev-data-value">{facility.rn_turnover.toFixed(1)}% <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.rn_turnover}%)</span></span>
                </div>
              )}
              {facility.admin_turnover != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Administrator Departures:</span>
                  <span className="ev-data-value">{facility.admin_turnover} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.admin_turnover})</span></span>
                </div>
              )}
              {facility.rn_turnover != null && facility.rn_turnover > 60 && (
                <div className="ev-alert">
                  <strong>High RN Turnover:</strong> This facility's RN turnover rate of {facility.rn_turnover.toFixed(1)}% significantly exceeds the national average of {NATIONAL_AVG.rn_turnover}%. High RN turnover directly impacts clinical oversight quality and care continuity.
                </div>
              )}
              {facility.total_turnover != null && facility.total_turnover > 55 && (
                <div className="ev-alert">
                  <strong>Elevated Staff Turnover:</strong> Total nursing staff turnover of {facility.total_turnover.toFixed(1)}% exceeds the national average of {NATIONAL_AVG.total_turnover}%, indicating potential workforce instability that may affect care quality.
                </div>
              )}
            </>
          )}

          <div className="ev-verify">
            <a href={`https://www.medicare.gov/care-compare/details/nursing-home/${ccn}`} target="_blank" rel="noopener noreferrer">
              Verify staffing data on Medicare Care Compare
            </a>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 4: INSPECTION HISTORY */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">4. Inspection History</h2>

          <div className="ev-data-row">
            <span className="ev-data-label">Total Deficiencies:</span>
            <span className="ev-data-value">{facility.total_deficiencies || 0} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.total_deficiencies})</span></span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Serious Harm Citations:</span>
            <span className="ev-data-value">{facility.jeopardy_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Residents Hurt:</span>
            <span className="ev-data-value">{facility.harm_count || 0}</span>
          </div>
          {facility.severity_score != null && (
            <div className="ev-data-row">
              <span className="ev-data-label">Severity Score:</span>
              <span className="ev-data-value">{facility.severity_score.toFixed(1)}</span>
            </div>
          )}

          {facility.jeopardy_count > 0 && (
            <div className="ev-alert">
              <strong>Immediate Jeopardy Findings:</strong> Immediate jeopardy citations indicate conditions posing serious harm to residents (42 CFR §488.301). This facility has received {facility.jeopardy_count} such citations.
            </div>
          )}

          {/* Top Deficiency Categories */}
          {facility.top_categories && facility.top_categories.length > 0 && (
            <>
              <h3 className="ev-subsection">Top Deficiency Categories</h3>
              <div className="ev-text-block">
                <p>The most frequently cited problem areas indicate where this facility consistently fails to meet federal standards.</p>
              </div>
              {facility.top_categories.slice(0, 5).map(([cat, count], idx) => (
                <div className="ev-data-row" key={idx}>
                  <span className="ev-data-label">{cat}:</span>
                  <span className="ev-data-value">{count} citation{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </>
          )}

          {/* Only show individual category counts if any are non-zero */}
          {(facility.infection_control_count > 0 || facility.quality_of_care_count > 0 || facility.resident_rights_count > 0 || facility.admin_count > 0 || facility.nutrition_count > 0 || facility.environment_count > 0 || facility.pharmacy_count > 0 || facility.abuse_count > 0) && (
            <>
              <h3 className="ev-subsection">Deficiency Categories (Detail)</h3>
              {facility.infection_control_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Infection Control:</span><span className="ev-data-value">{facility.infection_control_count}</span></div>}
              {facility.quality_of_care_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Quality of Care:</span><span className="ev-data-value">{facility.quality_of_care_count}</span></div>}
              {facility.resident_rights_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Resident Rights:</span><span className="ev-data-value">{facility.resident_rights_count}</span></div>}
              {facility.admin_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Administration:</span><span className="ev-data-value">{facility.admin_count}</span></div>}
              {facility.nutrition_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Nutrition:</span><span className="ev-data-value">{facility.nutrition_count}</span></div>}
              {facility.environment_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Environment:</span><span className="ev-data-value">{facility.environment_count}</span></div>}
              {facility.pharmacy_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Pharmacy Services:</span><span className="ev-data-value">{facility.pharmacy_count}</span></div>}
              {facility.abuse_count > 0 && <div className="ev-data-row"><span className="ev-data-label">Abuse Prevention:</span><span className="ev-data-value">{facility.abuse_count}</span></div>}
            </>
          )}

          {/* Individual Deficiency Details */}
          {(() => {
            const details = deficiencyDetails || facility.deficiency_details || [];
            if (defDetailsLoading) {
              return (
                <>
                  <h3 className="ev-subsection">Individual Deficiency Details</h3>
                  <p className="ev-text-muted">Loading deficiency details...</p>
                </>
              );
            }
            if (details.length === 0) return null;

            const sorted = [...details]
              .sort((a, b) => new Date(b.survey_date || 0) - new Date(a.survey_date || 0))
              .slice(0, 25);

            return (
              <>
                <h3 className="ev-subsection">Individual Deficiency Details</h3>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Showing {Math.min(25, details.length)} of {details.length} total citation{details.length !== 1 ? 's' : ''} (most recent first).
                </p>
                <table className="ev-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>F-Tag</th>
                      <th>Severity</th>
                      <th>Category</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((def, idx) => {
                      const sev = def.scope_severity || '';
                      const isJeopardy = sev.startsWith('J') || sev.startsWith('K') || sev.startsWith('L') || (def.severity_label || '').includes('Jeopardy');
                      const isHarm = sev.startsWith('H') || sev.startsWith('I') || (def.severity_label || '').includes('Harm');
                      const rowStyle = isJeopardy ? { background: '#FEF2F2' } : isHarm ? { background: '#FFFBEB' } : {};
                      return (
                        <tr key={idx} style={rowStyle}>
                          <td>{def.survey_date ? new Date(def.survey_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{def.ftag || 'N/A'}</td>
                          <td style={{ fontWeight: 600 }}>{sev}{def.severity_label ? ` (${def.severity_label})` : ''}</td>
                          <td>{def.category || 'N/A'}</td>
                          <td style={{ fontSize: '0.8rem', maxWidth: '250px' }}>{(def.description || 'No description').substring(0, 80)}{(def.description || '').length > 80 ? '...' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            );
          })()}

          {/* Complaint Investigations */}
          {(() => {
            const details = deficiencyDetails || facility.deficiency_details || [];
            const complaintDates = new Set(details.filter(d => d.is_complaint === true).map(d => d.survey_date).filter(Boolean));
            const complaintCount = complaintDates.size;
            return (
              <>
                <h3 className="ev-subsection">Complaint-Driven Investigations</h3>
                <div className="ev-data-row">
                  <span className="ev-data-label">Complaint Investigations (3 years):</span>
                  <span className="ev-data-value">{complaintCount} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.complaint_investigations})</span></span>
                </div>
                <div className="ev-text-block">
                  <p>
                    Each complaint investigation represents a separate instance where CMS sent surveyors for an unannounced inspection in response to a reported concern — filed by residents, families, staff, or other parties.
                  </p>
                  <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#94A3B8' }}>
                    Note: CMS removed complaint investigation data from Care Compare on 2/25/2026. This count was rebuilt from inspection records.
                  </p>
                </div>
                {complaintCount > NATIONAL_AVG.complaint_investigations && (
                  <div className="ev-alert">
                    <strong>Above-Average Complaint Activity:</strong> This facility has had {complaintCount} complaint-driven investigations, exceeding the national average of {NATIONAL_AVG.complaint_investigations}. Elevated complaint activity can indicate systemic care deficiencies not captured by routine inspections alone.
                  </div>
                )}
              </>
            );
          })()}

          {/* Fire Safety Violations */}
          {facility.fire_deficiency_count != null && (
            <>
              <h3 className="ev-subsection">Fire Safety Violations</h3>
              <div className="ev-data-row">
                <span className="ev-data-label">Life Safety Code Violations:</span>
                <span className="ev-data-value">{facility.fire_deficiency_count} <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.8rem' }}>(avg: {NATIONAL_AVG.fire_deficiency_count})</span></span>
              </div>
              <div className="ev-text-block">
                <p>
                  Fire safety deficiencies are cited during separate Life Safety Code (NFPA 101) inspections. K-level fire violations indicate conditions that could endanger residents in an emergency.
                </p>
              </div>
              {facility.fire_deficiency_count > NATIONAL_AVG.fire_deficiency_count * 1.5 && (
                <div className="ev-alert">
                  <strong>Elevated Fire Safety Violations:</strong> This facility has {facility.fire_deficiency_count} fire safety violations — {((facility.fire_deficiency_count / NATIONAL_AVG.fire_deficiency_count - 1) * 100).toFixed(0)}% above the national average of {NATIONAL_AVG.fire_deficiency_count}. This may indicate deferred maintenance or inadequate fire safety compliance.
                </div>
              )}
            </>
          )}

          <div className="ev-verify">
            <a href={`https://projects.propublica.org/nursing-homes/homes/h-${ccn}`} target="_blank" rel="noopener noreferrer">
              Verify inspection history on ProPublica Nursing Home Inspect
            </a>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 5: FINANCIAL PENALTIES */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">5. Financial Penalties</h2>

          <div className="ev-data-row">
            <span className="ev-data-label">Total Fines:</span>
            <span className="ev-data-value">{fmt(facility.total_fines || 0)}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Number of Fines:</span>
            <span className="ev-data-value">{facility.fine_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Payment Denials:</span>
            <span className="ev-data-value">{facility.denial_count || 0}</span>
          </div>

          {facility.total_fines > 0 && (
            <div className="ev-alert">
              <strong>Civil Monetary Penalties:</strong> CMS imposes civil monetary penalties under 42 CFR §488.438 for facilities that fail to meet federal requirements. This facility has been assessed {fmt(facility.total_fines)} in penalties.
            </div>
          )}

          {facility.denial_count > 0 && (
            <div className="ev-alert">
              <strong>Payment Denials:</strong> CMS can deny payment for new admissions when facilities are out of compliance (42 CFR §488.417). This facility has {facility.denial_count} payment denial{facility.denial_count > 1 ? 's' : ''} on record.
            </div>
          )}

          {/* Payment Denial Details */}
          {(facility.denial_days > 0 || facility.denial_start_date) && (
            <>
              <h3 className="ev-subsection">Payment Denial Details</h3>
              {facility.denial_days != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Total Days Under Payment Denial:</span>
                  <span className="ev-data-value">{facility.denial_days} days</span>
                </div>
              )}
              {facility.denial_start_date && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Most Recent Denial Start:</span>
                  <span className="ev-data-value">{facility.denial_start_date}</span>
                </div>
              )}
              {facility.denial_length_days != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Most Recent Denial Duration:</span>
                  <span className="ev-data-value">{facility.denial_length_days} days</span>
                </div>
              )}
              <div className="ev-text-block">
                <p>
                  A CMS payment denial means the facility's problems were so severe that Medicare stopped paying for new admissions. During a denial period, the facility cannot bill Medicare or Medicaid for any newly admitted patient. Denial of payment is one of the most serious enforcement actions available to CMS short of facility closure.
                </p>
              </div>
              {facility.denial_days > 0 && (
                <div className="ev-alert">
                  <strong>Severe Enforcement Action:</strong> CMS denied payment for new admissions for {facility.denial_days} total day{facility.denial_days > 1 ? 's' : ''}. This is a significant regulatory action reserved for facilities with serious, ongoing compliance failures.
                </div>
              )}
            </>
          )}

          {/* Penalty Timeline */}
          {facility.penalty_timeline && facility.penalty_timeline.length > 0 && (
            <>
              <h3 className="ev-subsection">Penalty Timeline</h3>
              <table className="ev-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[...facility.penalty_timeline].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0)).map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.date ? new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(p.amount || 0)}</td>
                      <td>{p.type || 'N/A'}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {p.type === 'Payment Denial' && p.denial_start_date && p.denial_length_days
                          ? `Payment denial starting ${new Date(p.denial_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} for ${p.denial_length_days} days`
                          : p.type === 'Fine' ? 'Civil monetary penalty' : (p.type || '')}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F1F5F9', fontWeight: 700 }}>
                    <td>TOTAL</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(facility.penalty_timeline.reduce((sum, p) => sum + (p.amount || 0), 0))}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          <div className="ev-verify">
            <a href={`https://projects.propublica.org/nursing-homes/homes/h-${ccn}`} target="_blank" rel="noopener noreferrer">
              Verify penalties on ProPublica Nursing Home Inspect
            </a>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 6: CLINICAL OUTCOMES (Quality Measures) */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">6. Clinical Outcomes (Quality Measures)</h2>

          <div className="ev-text-block">
            <p>
              Quality measures use actual Medicare billing data and clinical outcomes to assess facility performance — readmissions, infections, and successful discharges. These outcomes measure what actually happens to patients, not just what facilities report about their processes.
            </p>
          </div>

          {/* QRP Outcomes */}
          {facility.quality_measures?.qrp && (
            <>
              <h3 className="ev-subsection">SNF Quality Reporting Program (QRP) Outcomes</h3>
              {(() => {
                const qrp = facility.quality_measures.qrp;
                const rows = [];
                if (qrp.ppr != null) rows.push(['ppr', qrp.ppr]);
                if (qrp.dtc != null) rows.push(['dtc', qrp.dtc]);
                if (qrp.hai != null) rows.push(['hai', qrp.hai]);
                const displayMap = { better: 'Better Than Average', same: 'At National Average', worse: 'Worse Than Average' };
                return rows.map(([key, val]) => (
                  <div className="ev-data-row" key={key}>
                    <span className="ev-data-label">{qrpLabels[key]}:</span>
                    <span className="ev-data-value" style={{ color: qrpColors[val] || '#0F1629' }}>{displayMap[val] || val || 'N/A'}</span>
                  </div>
                ));
              })()}
              {facility.quality_measures.qrp.covid_res != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Resident COVID Vaccination Rate:</span>
                  <span className="ev-data-value">{pct(facility.quality_measures.qrp.covid_res)}</span>
                </div>
              )}
              {facility.quality_measures.qrp.covid_staff != null && (
                <div className="ev-data-row">
                  <span className="ev-data-label">Staff COVID Vaccination Rate:</span>
                  <span className="ev-data-value">{pct(facility.quality_measures.qrp.covid_staff)}</span>
                </div>
              )}
            </>
          )}

          {/* VBP Performance */}
          {facility.quality_measures?.vbp && (
            <>
              <h3 className="ev-subsection">SNF Value-Based Purchasing (VBP) Performance</h3>
              <div className="ev-text-block">
                <p>
                  The SNF Value-Based Purchasing program adjusts Medicare payment rates based on readmission performance. Lower rankings receive payment reductions; higher-performing facilities receive bonuses.
                </p>
              </div>
              {(() => {
                const vbp = facility.quality_measures.vbp;
                return (
                  <>
                    {vbp.r != null && (
                      <div className="ev-data-row">
                        <span className="ev-data-label">VBP Ranking (percentile):</span>
                        <span className="ev-data-value" style={{ color: vbp.r <= 25 ? '#DC2626' : vbp.r >= 75 ? '#059669' : '#0F1629' }}>{vbp.r}</span>
                      </div>
                    )}
                    {vbp.rr != null && (
                      <div className="ev-data-row">
                        <span className="ev-data-label">Readmission Rate:</span>
                        <span className="ev-data-value">{(vbp.rr * 100).toFixed(2)}%</span>
                      </div>
                    )}
                    {vbp.ach != null && (
                      <div className="ev-data-row">
                        <span className="ev-data-label">Achievement Score:</span>
                        <span className="ev-data-value">{vbp.ach}</span>
                      </div>
                    )}
                    {vbp.imp != null && (
                      <div className="ev-data-row">
                        <span className="ev-data-label">Improvement Score:</span>
                        <span className="ev-data-value">{vbp.imp}</span>
                      </div>
                    )}
                    {vbp.r != null && vbp.r <= 25 && (
                      <div className="ev-alert">
                        <strong>Bottom-Quartile VBP Ranking:</strong> This facility ranks in the bottom 25% of SNFs on Value-Based Purchasing performance (rank: {vbp.r}). Facilities in the bottom quartile receive Medicare payment reductions. Poor VBP performance indicates elevated readmission rates relative to peers.
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {/* Claims-Based Measures */}
          {facility.quality_measures?.claims && (
            <>
              <h3 className="ev-subsection">Claims-Based Quality Measures</h3>
              <div className="ev-text-block">
                <p>
                  Claims-based measures use actual Medicare billing data — not facility self-reports — to calculate adjusted rates for rehospitalization and emergency department visits.
                </p>
              </div>
              {(() => {
                const claims = facility.quality_measures.claims;
                const rows = Object.entries(claims).filter(([, vals]) => vals && (vals.adj != null || vals.obs != null));
                if (rows.length === 0) return <p className="ev-text-muted">No claims-based data available.</p>;
                return (
                  <table className="ev-table">
                    <thead>
                      <tr>
                        <th>Measure</th>
                        <th>Adjusted Rate</th>
                        <th>Observed Rate</th>
                        <th>Expected Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([code, vals]) => (
                        <tr key={code}>
                          <td style={{ fontWeight: 600 }}>{claimsLabels[code] || `Measure ${code}`}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{vals.adj != null ? (vals.adj * 100).toFixed(2) + '%' : 'N/A'}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{vals.obs != null ? (vals.obs * 100).toFixed(2) + '%' : 'N/A'}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{vals.exp != null ? (vals.exp * 100).toFixed(2) + '%' : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </>
          )}

          {/* MDS Quality Measures */}
          {facility.quality_measures?.mds && (
            <>
              <h3 className="ev-subsection">MDS Clinical Quality Measures</h3>
              <div className="ev-text-block">
                <p>
                  MDS (Minimum Data Set) measures are derived from mandatory clinical assessments conducted on every nursing home resident. These reflect day-to-day care quality outcomes.
                </p>
              </div>
              {(() => {
                const mds = facility.quality_measures.mds;
                const mdsLabels = {
                  '401': 'Falls with major injury (long-stay)',
                  '402': 'Antipsychotic medication use (long-stay)',
                  '403': 'UTI (long-stay)',
                  '406': 'Pressure ulcers (long-stay)',
                  '407': 'Physical restraints (long-stay)',
                  '415': 'Catheter use (long-stay)',
                  '419': 'ADL decline (long-stay)',
                  '424': 'Flu vaccination rate (short-stay)',
                  '425': 'New or worsened pressure ulcers (short-stay)',
                  '426': 'Rehospitalization (short-stay)',
                  '430': 'Successful discharge (short-stay)',
                  '434': 'Improvement in function (short-stay)',
                };
                const entries = Object.entries(mds).filter(([, v]) => v != null && v.r != null);
                if (entries.length === 0) return null;
                return (
                  <table className="ev-table">
                    <thead>
                      <tr>
                        <th>Measure</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(0, 10).map(([code, vals]) => (
                        <tr key={code}>
                          <td>{mdsLabels[code] || `Measure Q${code}`}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {vals.r != null ? (typeof vals.r === 'number' && vals.r < 1 ? (vals.r * 100).toFixed(1) + '%' : vals.r) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </>
          )}

          {!facility.quality_measures?.qrp && !facility.quality_measures?.vbp && !facility.quality_measures?.claims && !facility.quality_measures?.mds && (
            <p className="ev-text-muted">Quality measure data not available for this facility.</p>
          )}

          <div className="ev-verify">
            <a href={`https://www.medicare.gov/care-compare/details/nursing-home/${ccn}?id=${ccn}&measures=quality`} target="_blank" rel="noopener noreferrer">
              Verify quality measures on Medicare Care Compare
            </a>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 7: RED FLAGS */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">7. Red Flags & Accountability Indicators</h2>

          {redFlags.length > 0 ? (
            redFlags.map((flag, idx) => (
              <div key={idx} className="ev-alert" style={flag.type === 'critical' ? {} : flag.type === 'warning' ? { background: 'linear-gradient(135deg, #FFFBEB, #FFF7ED)', borderLeftColor: '#D97706', color: '#78350F' } : { background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', borderLeftColor: '#2563EB', color: '#1E3A5F' }}>
                <strong>{flag.metric}</strong>
                {flag.detail}
              </div>
            ))
          ) : (
            <p className="ev-text-muted">No major red flags identified in available data.</p>
          )}
        </section>

        {/* ============================================================ */}
        {/* SECTION 8: COMPARISON CONTEXT */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">8. Comparison Context</h2>
          <div className="ev-text-block">
            <p>
              Key metrics for {facility.name} compared against national averages across all {allFacilities.length.toLocaleString()} nursing homes in our dataset.
            </p>
          </div>
          {(() => {
            const mono = { fontFamily: "'JetBrains Mono', monospace" };
            const rows = [
              { label: 'CMS Stars', fac: `${facility.stars || 0}/5`, avg: `${NATIONAL_AVG.stars}/5`, worse: (facility.stars || 0) < NATIONAL_AVG.stars },
              { label: 'Risk Score', fac: (facility.composite || 0).toFixed(1), avg: NATIONAL_AVG.composite.toString(), worse: (facility.composite || 0) > NATIONAL_AVG.composite },
              { label: 'Total Staffing HPRD', fac: num(facility.total_hprd), avg: NATIONAL_AVG.total_hprd.toString(), worse: (facility.total_hprd || 0) < NATIONAL_AVG.total_hprd },
              { label: 'RN Staffing HPRD', fac: num(facility.rn_hprd), avg: NATIONAL_AVG.rn_hprd.toString(), worse: (facility.rn_hprd || 0) < NATIONAL_AVG.rn_hprd },
              { label: 'Zero-RN Days', fac: pct(facility.zero_rn_pct), avg: `${NATIONAL_AVG.zero_rn_pct}%`, worse: (facility.zero_rn_pct || 0) > NATIONAL_AVG.zero_rn_pct },
              { label: 'Total Deficiencies', fac: String(facility.total_deficiencies || 0), avg: NATIONAL_AVG.total_deficiencies.toString(), worse: (facility.total_deficiencies || 0) > NATIONAL_AVG.total_deficiencies },
              { label: 'Total Fines', fac: fmt(facility.total_fines || 0), avg: fmt(NATIONAL_AVG.total_fines), worse: (facility.total_fines || 0) > NATIONAL_AVG.total_fines },
              { label: 'Contract Staffing', fac: pct(facility.contractor_pct), avg: `${NATIONAL_AVG.contractor_pct}%`, worse: (facility.contractor_pct || 0) > NATIONAL_AVG.contractor_pct },
            ];
            return (
              <table className="ev-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Metric</th>
                    <th style={{ width: '30%', textAlign: 'center' }}>This Facility</th>
                    <th style={{ width: '30%', textAlign: 'center' }}>National Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.label}>
                      <td style={{ fontWeight: 600 }}>{r.label}</td>
                      <td style={{ ...mono, textAlign: 'center', color: r.worse ? '#DC2626' : '#059669', fontWeight: 700 }}>{r.fac}</td>
                      <td style={{ ...mono, textAlign: 'center', color: '#64748B' }}>{r.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </section>

        {/* ============================================================ */}
        {/* SECTION 9: NEARBY ALTERNATIVES */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">9. Nearby Alternatives Comparison</h2>

          {nearbyAlternatives.length > 0 ? (
            <>
              <div className="ev-text-block">
                <p>
                  The following facilities within a reasonable distance have lower risk scores than {facility.name}. This comparison is provided for reference purposes only and does not constitute a recommendation.
                </p>
              </div>
              <table className="ev-table">
                <thead>
                  <tr>
                    <th>Facility Name</th>
                    <th>Distance</th>
                    <th>City</th>
                    <th>Stars</th>
                    <th>Total HPRD</th>
                    <th>Total Fines</th>
                  </tr>
                </thead>
                <tbody>
                  {nearbyAlternatives.map((alt) => (
                    <tr key={alt.ccn}>
                      <td>{alt.name}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{alt.distance.toFixed(1)} mi</td>
                      <td>{alt.city}, {alt.state}</td>
                      <td>{alt.stars || 0}/5</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{num(alt.total_hprd)} hrs</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(alt.total_fines || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="ev-text-muted">No nearby facilities with better scores found within search radius.</p>
          )}
        </section>

        {/* ============================================================ */}
        {/* SECTION 10: METHODOLOGY */}
        {/* ============================================================ */}
        <section className="ev-section">
          <h2 className="ev-section-number">10. Data Sources & Methodology</h2>

          <h3 className="ev-subsection">Data Sources</h3>
          <p>All data in this report is sourced from publicly available federal databases:</p>
          <ul className="ev-list">
            <li>CMS Care Compare (Provider Information, Star Ratings, Quality Measures)</li>
            <li>CMS Payroll-Based Journal (Daily Nurse Staffing, Turnover)</li>
            <li>CMS Health Deficiencies (State Survey Agency Inspections, 2017-2025)</li>
            <li>CMS Penalties (Fines and Payment Denials, 2023-2025)</li>
            <li>CMS Ownership Database (Corporate Structure, PE/REIT flags)</li>
            <li>CMS HCRIS Cost Reports (Financial Transparency, Worksheet A-8)</li>
          </ul>

          <h3 className="ev-subsection">Composite Score Formula</h3>
          <p>The risk score is a weighted composite of multiple factors:</p>
          <ul className="ev-list">
            <li>Staffing Levels: 30% (verified payroll data vs. self-reported)</li>
            <li>Inspection Results: 25% (deficiencies, serious harm, harm)</li>
            <li>Financial Penalties: 20% (fines, payment denials)</li>
            <li>Ownership History: 15% (portfolio performance, patterns)</li>
            <li>Quality Measures: 10% (CMS star rating components)</li>
          </ul>
          <p>Higher scores indicate greater patterns of concern in federal data.</p>

          <h3 className="ev-subsection">Disclaimers</h3>
          <p>This analysis is based on the most recently available federal data. Facilities may have addressed issues since data collection. Scores indicate patterns warranting further investigation, not definitive conclusions.</p>
        </section>

        {/* ============================================================ */}
        {/* SECTION 11: DISCLAIMER */}
        {/* ============================================================ */}
        <section className="ev-section ev-disclaimer">
          <h2 className="ev-section-number">11. Legal Disclaimer</h2>

          <p><strong>This report is generated from publicly available federal data and is provided for informational purposes only.</strong></p>

          <p>This document does not constitute legal advice, medical advice, or a recommendation for or against any specific facility. Risk scores and indicators represent patterns in federal data that may warrant further investigation.</p>

          <p>Facilities should be evaluated through personal visits, consultation with healthcare professionals, and review of current inspection reports. Conditions may have changed since data collection.</p>

          <p>If you have concerns about a nursing home, contact:</p>
          <ul className="ev-list">
            <li>Your state survey agency (health department)</li>
            <li>HHS Office of Inspector General: <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a></li>
            <li>National Eldercare Locator: 1-800-677-1116</li>
          </ul>
        </section>

        {/* Footer */}
        <div className="ev-footer">
          <div className="ev-footer-logo">THE OVERSIGHT REPORT</div>
          <div className="ev-footer-text">
            Nursing Home Safety Data | Data processed 2026-02-23<br />
            Built by Robert Benard | All data sourced from CMS Medicare.gov
          </div>
        </div>

      </div>
    </div>
  );
}
