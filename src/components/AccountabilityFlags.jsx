import React from 'react';
import '../styles/accountability.css';

export default function AccountabilityFlags({ facility, allFacilities }) {
  if (!facility) return null;

  // Flag 1: Staffing Discrepancy
  const showStaffingFlag = facility.rn_gap_pct > 25 || (facility.flags && facility.flags.includes('STAFFING INFLATION'));

  let gapText = '';
  if (showStaffingFlag) {
    if (facility.rn_gap_pct > 25) {
      gapText = `the facility self-reports ${Math.round(facility.rn_gap_pct)}% more RN hours than verified payroll records show`;
    } else if (facility.flags && facility.flags.includes('STAFFING INFLATION')) {
      gapText = 'federal data shows indicators of inflated staffing numbers';
    }
  }

  const totalMin = facility.total_hprd ? facility.total_hprd.toFixed(1) : 'N/A';

  // Flag 2: Ownership Cluster Warning
  const showOwnershipFlag = facility.owner_portfolio_count >= 3;

  let siblings = [];
  let starDist = [0, 0, 0, 0, 0];
  let avgStars = 0;
  let belowAvgPct = 0;
  let allInGroup = [];
  let showOwnershipWarning = false;

  if (showOwnershipFlag && allFacilities && facility.worst_owner) {
    siblings = allFacilities.filter(f =>
      f.worst_owner &&
      f.worst_owner === facility.worst_owner &&
      f.ccn !== facility.ccn
    );

    if (siblings.length >= 2) {
      allInGroup = [facility, ...siblings];

      allInGroup.forEach(f => {
        if (f.stars >= 1 && f.stars <= 5) {
          starDist[f.stars - 1]++;
        }
      });

      avgStars = (allInGroup.reduce((s, f) => s + (f.stars || 0), 0) / allInGroup.length).toFixed(1);
      belowAvgPct = Math.round(((starDist[0] + starDist[1]) / allInGroup.length) * 100);
      showOwnershipWarning = avgStars < 2.5 || belowAvgPct > 40;
    }
  }

  // Flag 3: Fine Information
  const showFineFlag = facility.total_fines > 0;

  // Flag 4: Inspection Results
  const showInspectionFlag = facility.jeopardy_count > 0 || facility.harm_count > 0;

  return (
    <div className="accountability-flags">
      {/* Flag 1: Staffing Discrepancy */}
      {showStaffingFlag && (
        <div className="accountability-flag flag-warning">
          <div className="flag-header">
            <span className="flag-icon">⚠️</span>
            <h4>STAFFING DISCREPANCY</h4>
          </div>
          <div className="flag-body">
            <p>
              This facility reports {totalMin} minutes of daily nursing care per resident
              in federal payroll records, but {gapText}.
            </p>
            <p>
              Nursing homes self-report their staffing data to the federal government.
              Inspectors visit and assess actual conditions. When these two don't match,
              it raises questions about the accuracy of reported staffing levels.
            </p>
            <p className="flag-action">
              <strong>What you can do:</strong> Ask the facility for their current daily
              staffing schedule. They are required to post it.
            </p>
            <p className="flag-source">Sources: CMS Payroll Based Journal data, CMS Health Inspection Reports</p>
          </div>
        </div>
      )}

      {/* Flag 2: Ownership Cluster Warning */}
      {showOwnershipFlag && siblings.length >= 2 && (
        showOwnershipWarning ? (
          <div className="accountability-flag flag-warning">
            <div className="flag-header">
              <span className="flag-icon">🏢</span>
              <h4>OWNERSHIP INFORMATION</h4>
            </div>
            <div className="flag-body">
              <p>This facility is operated by <strong>{facility.worst_owner}</strong>, which also operates <strong>{siblings.length}</strong> other nursing homes in our database.</p>

              <div className="ownership-stars-grid">
                {[5, 4, 3, 2, 1].map(star => (
                  <div className="ownership-star-row" key={star}>
                    <span className="ownership-star-label">{'⭐'.repeat(star)}</span>
                    <div className="ownership-star-bar-track">
                      <div
                        className="ownership-star-bar-fill"
                        style={{ width: `${(starDist[star - 1] / allInGroup.length) * 100}%` }}
                      />
                    </div>
                    <span className="ownership-star-count">
                      {starDist[star - 1]} ({Math.round((starDist[star - 1] / allInGroup.length) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>

              <p>Average rating: <strong>{avgStars}</strong> out of 5 stars (national average: 3.2)</p>

              {belowAvgPct > 40 && (
                <p className="flag-alert">⚠️ {belowAvgPct}% of facilities under this operator are rated below average.</p>
              )}

              <p className="flag-source">Source: CMS Care Compare, ownership records</p>
            </div>
          </div>
        ) : (
          <div className="accountability-flag flag-neutral">
            <div className="flag-header">
              <span className="flag-icon">🏢</span>
              <h4>OWNERSHIP INFORMATION</h4>
            </div>
            <div className="flag-body">
              <p>
                Operated by <strong>{facility.worst_owner}</strong>, which runs {siblings.length + 1} facilities.
                Average rating: {avgStars} / 5 stars.
              </p>
              <p className="flag-source">Source: CMS Care Compare, ownership records</p>
            </div>
          </div>
        )
      )}

      {/* Flag 3: Fine Information */}
      {showFineFlag && (
        <div className={`accountability-flag ${facility.total_fines > 100000 ? 'flag-danger' : 'flag-neutral'}`}>
          <div className="flag-header">
            <span className="flag-icon">💰</span>
            <h4>FINE HISTORY</h4>
          </div>
          <div className="flag-body">
            <p>Total fines: <strong className="fine-amount">${Math.round(facility.total_fines).toLocaleString()}</strong></p>
            <p>Number of separate fines: {facility.fine_count}</p>
            {facility.denial_count > 0 && (
              <p>Payment denials: {facility.denial_count} (CMS temporarily stopped paying for new admissions)</p>
            )}
            {facility.total_fines > 100000 && (
              <p className="flag-alert">⚠️ Fines exceeding $100,000 suggest serious or repeated violations.</p>
            )}
            <p className="flag-source">Source: CMS Penalty data</p>
          </div>
        </div>
      )}

      {/* Flag 4: Plain English Inspection Results */}
      {showInspectionFlag && (
        <div className={`accountability-flag ${facility.jeopardy_count > 0 ? 'flag-danger' : 'flag-warning'}`}>
          <div className="flag-header">
            <span className="flag-icon">{facility.jeopardy_count > 0 ? '🔴' : '🟡'}</span>
            <h4>WHAT INSPECTORS FOUND</h4>
          </div>
          <div className="flag-body">
            {facility.jeopardy_count > 0 && (
              <>
                <p className="flag-severity-label severity-jeopardy">SERIOUS DANGER TO RESIDENTS</p>
                <p>Government inspectors found conditions so severe that residents faced risk of serious injury or death. This is the most serious finding an inspection can produce.</p>
              </>
            )}
            {facility.harm_count > 0 && facility.jeopardy_count === 0 && (
              <>
                <p className="flag-severity-label severity-harm">RESIDENTS WERE HURT</p>
                <p>Inspectors documented that residents were actually hurt — not just at risk, but harmed — during the inspection period.</p>
              </>
            )}

            {facility.top_categories && facility.top_categories.length > 0 && (
              <>
                <p><strong>Top citation areas:</strong></p>
                <ul>
                  {facility.top_categories.map(([cat, count], i) => (
                    <li key={i}>{cat}: {count} citation(s)</li>
                  ))}
                </ul>
              </>
            )}

            <p>These are the facility's own inspection results as reported by the {facility.state} Department of Health and CMS.</p>
            <p className="flag-source">Source: CMS Health Inspection data</p>
          </div>
        </div>
      )}

      {/* Data Disclaimer (always shown) */}
      <div className="accountability-disclaimer">
        <h4>ABOUT THIS DATA</h4>
        <p>
          The Oversight Report identifies patterns and discrepancies in publicly available federal data.
          These indicators do not constitute evidence of wrongdoing. If you have concerns
          about a facility, contact your state survey agency or the HHS Office of Inspector
          General at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
        </p>
      </div>
    </div>
  );
}
