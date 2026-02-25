import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFacilityData } from '../hooks/useFacilityData';
import { haversineDistance } from '../utils/haversine';
import { generateEvidencePDF } from '../utils/generateEvidencePDF';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { checkoutSingleReport } from '../utils/stripe';
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ccn]);

  if (COMING_SOON) {
    return (
      <ComingSoonPage
        title="Evidence Packages"
        description="Generate comprehensive, litigation-ready PDF reports for any facility. Ten sections covering staffing, inspections, penalties, ownership, quality measures, and nearby alternatives — everything an attorney or ombudsman needs in one document."
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
  const fmt = (v) => (!v && v !== 0) ? 'N/A' : `$${v.toLocaleString()}`;
  const pct = (v) => (v === null || v === undefined) ? 'N/A' : `${v.toFixed(0)}%`;
  const num = (v) => (v === null || v === undefined) ? 'N/A' : v.toFixed(1);

  // Red flags logic (from AccountabilityFlags)
  const redFlags = [];
  if (facility.jeopardy_count > 0) {
    redFlags.push(`Serious danger citations: ${facility.jeopardy_count}`);
  }
  if (facility.harm_count > 0) {
    redFlags.push(`Residents hurt: ${facility.harm_count}`);
  }
  if (facility.rn_gap_pct > 30) {
    redFlags.push(`Staffing discrepancy: ${pct(facility.rn_gap_pct)} gap between reported and verified RN hours`);
  }
  if (facility.zero_rn_pct > 25) {
    redFlags.push(`Zero-RN days: ${pct(facility.zero_rn_pct)} of days without a registered nurse`);
  }
  if (facility.total_fines > 100000) {
    redFlags.push(`High financial penalties: ${fmt(facility.total_fines)} in fines`);
  }

  // Executive summary auto-generated
  const getExecutiveSummary = () => {
    const parts = [];
    const score = facility.composite || 0;
    const stars = facility.stars || 0;

    if (score >= 70) {
      parts.push('This facility shows significant patterns of concern in federal data.');
    } else if (score >= 50) {
      parts.push('This facility shows some patterns of concern in federal data.');
    } else {
      parts.push('This facility shows relatively few concerns in federal data.');
    }

    if (facility.jeopardy_count > 0 || facility.harm_count > 0) {
      parts.push(`Inspectors documented serious safety issues including ${facility.jeopardy_count > 0 ? 'conditions posing serious danger to residents' : 'actual harm to residents'}.`);
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

  const handleDownloadPDF = () => {
    generateEvidencePDF(facility, nearbyAlternatives);
  };

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
          <p>10-section litigation-ready report with staffing data, inspection history, penalties, ownership profile, and nearby alternatives.</p>
          <div className="ev-purchase-options">
            <button className="ev-buy-single" onClick={() => checkoutSingleReport(ccn)}>
              Buy This Report — $29
            </button>
            <Link to="/pricing" className="ev-subscribe-link">
              or subscribe from $59/mo for unlimited reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ev">
      {/* Header */}
      <div className="ev-header no-print">
        <Link to={`/facility/${ccn}`} className="ev-back">Back to Report Card</Link>
        <h2 className="ev-badge">Evidence Package</h2>
        <div className="ev-header-actions">
          <button onClick={handlePrint} className="ev-btn ev-btn-secondary">
            Print Version
          </button>
          <button onClick={handleDownloadPDF} className="ev-btn ev-btn-primary">
            Download PDF
          </button>
        </div>
      </div>

      {/* Page Preview */}
      <div className="ev-body">

        {/* Section 1: Cover Page */}
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

        {/* Section 2: Executive Summary */}
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
          </div>
          <div className="ev-text-block">
            <p><strong>Assessment:</strong></p>
            <p>{getExecutiveSummary()}</p>
          </div>
        </section>

        {/* Section 3: Ownership Profile */}
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
        </section>

        {/* Section 4: Staffing Analysis */}
        <section className="ev-section">
          <h2 className="ev-section-number">3. Staffing Analysis</h2>

          <h3 className="ev-subsection">Hours Per Resident Per Day (HPRD)</h3>
          <div className="ev-data-row">
            <span className="ev-data-label">Registered Nurse (RN):</span>
            <span className="ev-data-value">{num(facility.rn_hprd)} hrs</span>
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
            <span className="ev-data-value">{num(facility.total_hprd)} hrs</span>
          </div>

          <h3 className="ev-subsection">Staffing Verification</h3>
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
          <div className="ev-data-row">
            <span className="ev-data-label">Weekend Staffing:</span>
            <span className="ev-data-value">{num(facility.weekend_total_hprd)} hrs</span>
          </div>

          {facility.rn_gap_pct > 20 && (
            <div className="ev-alert">
              Note: Significant discrepancy between self-reported and verified staffing data.
            </div>
          )}
        </section>

        {/* Section 5: Inspection History */}
        <section className="ev-section">
          <h2 className="ev-section-number">4. Inspection History</h2>

          <div className="ev-data-row">
            <span className="ev-data-label">Total Deficiencies:</span>
            <span className="ev-data-value">{facility.total_deficiencies || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Serious Danger Citations:</span>
            <span className="ev-data-value">{facility.jeopardy_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Residents Hurt:</span>
            <span className="ev-data-value">{facility.harm_count || 0}</span>
          </div>

          <h3 className="ev-subsection">Deficiency Categories</h3>
          <div className="ev-data-row">
            <span className="ev-data-label">Infection Control:</span>
            <span className="ev-data-value">{facility.infection_control_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Quality of Care:</span>
            <span className="ev-data-value">{facility.quality_of_care_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Resident Rights:</span>
            <span className="ev-data-value">{facility.resident_rights_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Administration:</span>
            <span className="ev-data-value">{facility.admin_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Nutrition:</span>
            <span className="ev-data-value">{facility.nutrition_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Environment:</span>
            <span className="ev-data-value">{facility.environment_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Pharmacy Services:</span>
            <span className="ev-data-value">{facility.pharmacy_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Abuse Prevention:</span>
            <span className="ev-data-value">{facility.abuse_count || 0}</span>
          </div>
          <div className="ev-data-row">
            <span className="ev-data-label">Other:</span>
            <span className="ev-data-value">{facility.other_count || 0}</span>
          </div>
        </section>

        {/* Section 6: Financial Penalties */}
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
        </section>

        {/* Section 7: Red Flags / Accountability */}
        <section className="ev-section">
          <h2 className="ev-section-number">6. Red Flags / Accountability Indicators</h2>

          {redFlags.length > 0 ? (
            <ul className="ev-list">
              {redFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          ) : (
            <p className="ev-text-muted">No major red flags identified in available data.</p>
          )}
        </section>

        {/* Section 8: Nearby Alternatives */}
        <section className="ev-section">
          <h2 className="ev-section-number">7. Nearby Alternatives</h2>

          {nearbyAlternatives.length > 0 ? (
            <div className="ev-alternatives">
              {nearbyAlternatives.map((alt, idx) => (
                <div key={alt.ccn} className="ev-alternative">
                  <div className="ev-alternative-header">
                    <strong>{idx + 1}. {alt.name}</strong>
                    <span>{alt.distance.toFixed(1)} miles</span>
                  </div>
                  <div className="ev-alternative-meta">
                    {alt.city}, {alt.state}
                  </div>
                  <div className="ev-alternative-stats">
                    <span>Risk Score: {alt.composite?.toFixed(1) || 'N/A'}</span>
                    <span>Stars: {alt.stars || 0}/5</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ev-text-muted">No nearby facilities with better scores found within search radius.</p>
          )}
        </section>

        {/* Section 9: Methodology */}
        <section className="ev-section">
          <h2 className="ev-section-number">8. Methodology</h2>

          <h3 className="ev-subsection">Data Sources</h3>
          <p>All data in this report is sourced from publicly available federal databases:</p>
          <ul className="ev-list">
            <li>CMS Care Compare (Provider Information, Star Ratings)</li>
            <li>CMS Payroll-Based Journal (Daily Nurse Staffing)</li>
            <li>CMS Health Deficiencies (State Survey Agency Inspections)</li>
            <li>CMS Penalties (Fines and Payment Denials)</li>
            <li>CMS Ownership Database (Corporate Structure)</li>
          </ul>

          <h3 className="ev-subsection">Composite Score Formula</h3>
          <p>The risk score is a weighted composite of multiple factors:</p>
          <ul className="ev-list">
            <li>Staffing Levels: 30% (verified payroll data vs. self-reported)</li>
            <li>Inspection Results: 25% (deficiencies, serious danger, harm)</li>
            <li>Financial Penalties: 20% (fines, payment denials)</li>
            <li>Ownership History: 15% (portfolio performance, patterns)</li>
            <li>Quality Measures: 10% (CMS star rating components)</li>
          </ul>
          <p>Higher scores indicate greater patterns of concern in federal data.</p>

          <h3 className="ev-subsection">Disclaimers</h3>
          <p>This analysis is based on the most recently available federal data. Facilities may have addressed issues since data collection. Scores indicate patterns warranting further investigation, not definitive conclusions.</p>
        </section>

        {/* Section 10: Disclaimer */}
        <section className="ev-section ev-disclaimer">
          <h2 className="ev-section-number">9. Disclaimer</h2>

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
            Nursing Home Risk Data | Data processed 2026-02-23<br />
            Built by Robert Benard | All data sourced from CMS Medicare.gov
          </div>
        </div>

      </div>
    </div>
  );
}
