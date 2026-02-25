import { useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFacilityData } from '../hooks/useFacilityData';
import { computeBenchmarks } from '../utils/benchmarks';
import { haversineDistance } from '../utils/haversine';
import { BenchmarkBar } from '../components/BenchmarkBar';
import { NearbyFacilities } from '../components/NearbyFacilities';
import { DownloadButton } from '../components/DownloadButton';
import { ActionPaths } from '../components/ActionPaths';
import StaffingSection from '../components/StaffingSection';
import AccountabilityFlags from '../components/AccountabilityFlags';
import { StaffingTrendChart } from '../components/StaffingTrendChart';
import '../styles/facility.css';
import '../styles/staffing.css';

export function FacilityPage() {
  const { ccn } = useParams();
  const { data, loading, error } = useFacilityData();
  const pageRef = useRef(null);

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
      {/* Header */}
      <div className="fp-header">
        <Link to="/" className="fp-back">← Back to Map</Link>
        <h2 className="fp-badge">Facility Report Card</h2>
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

        <hr />

        {/* Bottom Line */}
        <h2>Bottom Line</h2>
        <div className="info-box">{getBottomLine()}</div>
        <p className="source">Source: CMS Provider Data, Health Deficiencies, Penalties, Ownership | Verify: <a href={propublica} target="_blank" rel="noopener noreferrer">ProPublica</a> · <a href={medicare} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a></p>

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

        {/* Staffing Trend Chart */}
        {facility.staffing_trend && (
          <StaffingTrendChart facility={facility} />
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
        <p>These questions are tailored to this facility's specific record:</p>

        {facility.zero_rn_pct > 10 && (
          <div className="question-card">
            <strong>Q: How many registered nurses are on duty right now? What is your weekend staffing like?</strong><br />
            <span className="context"><em>Context:</em> This facility had zero RN days {pct(facility.zero_rn_pct)} of the time.</span>
          </div>
        )}

        {facility.jeopardy_count > 0 && (
          <div className="question-card">
            <strong>Q: What corrective actions were taken after the serious danger citation?</strong><br />
            <span className="context"><em>Context:</em> Government inspectors found serious danger to residents {facility.jeopardy_count} time(s).</span>
          </div>
        )}

        {facility.rn_gap_pct > 30 && (
          <div className="question-card">
            <strong>Q: Can I see your actual staffing schedules for the past month?</strong><br />
            <span className="context"><em>Context:</em> Facility reports {pct(facility.rn_gap_pct)} more RN hours than payroll records show.</span>
          </div>
        )}

        {facility.total_fines > 50000 && (
          <div className="question-card">
            <strong>Q: What changes have you made since being fined by the government?</strong><br />
            <span className="context"><em>Context:</em> Total fines: {fmt(facility.total_fines)}</span>
          </div>
        )}

        {facility.owner_portfolio_count > 10 && (
          <div className="question-card">
            <strong>Q: How does this facility's staffing compare to the owner's other facilities?</strong><br />
            <span className="context"><em>Context:</em> This owner operates {facility.owner_portfolio_count} facilities.</span>
          </div>
        )}

        <div className="question-card">
          <strong>Q: Can I visit at different times of day, including evenings and weekends?</strong><br />
          <span className="context"><em>Why it matters:</em> Staffing levels and care quality can vary dramatically by time and day.</span>
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
        <div className="callout box-yellow">
          <strong>Educational Use Disclaimer</strong><br />
          This analysis is for informational purposes only. Risk scores indicate areas warranting further investigation, not confirmed issues.
          All data sourced from publicly available CMS datasets. Always visit facilities in person and consult with healthcare professionals.
        </div>

        {/* Download CTA */}
        <div className="fp-download-cta">
          <h3>Your Personalized Safety Analysis</h3>
          <p>Everything on this page is free — always. The downloadable report adds deeper analysis you won't find anywhere else:</p>
          <ul className="fp-download-features">
            <li><strong>Clinical context</strong> — what this data actually means for your loved one</li>
            <li><strong>National percentile rankings</strong> — how this facility compares to all 14,713 nursing homes</li>
            <li><strong>Ownership deep dive</strong> — the full picture of every facility this owner operates</li>
            <li><strong>Visit checklist</strong> — tailored to this facility's specific flags</li>
            <li><strong>Questions to ask</strong> — based on what inspectors actually found here</li>
          </ul>
          <DownloadButton facility={facility} nearbyFacilities={nearbyForPDF} allFacilities={allFacilities} label="Download Personalized Report (PDF)" variant="prominent" />
          <span className="fp-download-hint fp-download-hint--promo">Unlimited free downloads through March 31, 2026</span>
          <span className="fp-download-hint fp-download-hint--future">After March 31: 3 free reports per day | Need more? Go Pro — $12/mo for unlimited reports</span>
        </div>

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
