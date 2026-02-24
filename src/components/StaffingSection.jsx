import CollapsibleSection from './CollapsibleSection';

export default function StaffingSection({ facility, benchmarks }) {
  // Convert HPRD to minutes
  const rnMinutes = Math.round(facility.rn_hprd * 60);
  const totalMinutes = Math.round(facility.total_hprd * 60);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // LPN/CNA breakdown (new enriched fields)
  const hasLpnCna = facility.lpn_hprd != null && facility.cna_hprd != null;
  const lpnMinutes = hasLpnCna ? Math.round(facility.lpn_hprd * 60) : null;
  const cnaMinutes = hasLpnCna ? Math.round(facility.cna_hprd * 60) : null;
  const otherMinutes = hasLpnCna ? null : totalMinutes - rnMinutes;

  // Weekend staffing
  const hasWeekend = facility.weekend_total_hprd != null;
  const weekendTotalMinutes = hasWeekend ? Math.round(facility.weekend_total_hprd * 60) : null;
  const weekendDrop = hasWeekend ? totalMinutes - weekendTotalMinutes : null;

  // Safety benchmarks in minutes
  const SAFETY_BENCHMARK_TOTAL = 246; // 4.1 hrs
  const SAFETY_BENCHMARK_RN = 33; // CMS 2024 standard

  // State averages in minutes
  const stateAvgRnMinutes = Math.round(benchmarks.state.avg_rn_hprd * 60);
  const stateAvgTotalMinutes = Math.round(benchmarks.state.avg_total_hprd * 60);

  // Helper to calculate percentage for bar chart (max at 300 min for scale)
  const calcBarPct = (minutes, max = 300) => Math.min((minutes / max) * 100, 100);

  // Helper to determine bar color
  const getBarColor = (minutes, benchmark, stateAvg) => {
    if (minutes >= benchmark) return '#16A34A'; // green
    if (minutes >= stateAvg) return '#F59E0B'; // yellow
    return '#DC2626'; // red
  };

  // RN bar percentages
  const rnBarPct = calcBarPct(rnMinutes);
  const rnStateAvgPct = calcBarPct(stateAvgRnMinutes);
  const rnBenchmarkPct = calcBarPct(SAFETY_BENCHMARK_RN);
  const rnBarColor = getBarColor(rnMinutes, SAFETY_BENCHMARK_RN, stateAvgRnMinutes);

  // Total bar percentages
  const totalBarPct = calcBarPct(totalMinutes);
  const totalStateAvgPct = calcBarPct(stateAvgTotalMinutes);
  const totalBenchmarkPct = calcBarPct(SAFETY_BENCHMARK_TOTAL);
  const totalBarColor = getBarColor(totalMinutes, SAFETY_BENCHMARK_TOTAL, stateAvgTotalMinutes);

  // Plain English Summary
  const getSummary = () => {
    if (totalMinutes < 192) {
      return {
        className: 'staffing-summary-danger',
        text: `This facility provides ${totalMinutes} minutes (${totalHours} hours) of nursing care per resident per day. This is below the average for nursing homes in ${facility.state} and significantly below the safety benchmark of 246 minutes (4.1 hours) identified in CMS research.`
      };
    } else if (totalMinutes < 209) {
      return {
        className: 'staffing-summary-warning',
        text: `This facility provides ${totalMinutes} minutes (${totalHours} hours) of nursing care per resident per day. This is about average for nursing homes, but below the safety benchmark of 246 minutes (4.1 hours) identified in CMS research.`
      };
    } else if (totalMinutes < 246) {
      return {
        className: 'staffing-summary-ok',
        text: `This facility provides ${totalMinutes} minutes (${totalHours} hours) of nursing care per resident per day. This is above average for nursing homes in ${facility.state}, but still below the safety benchmark of 246 minutes (4.1 hours) identified in CMS research.`
      };
    } else {
      return {
        className: 'staffing-summary-good',
        text: `This facility provides ${totalMinutes} minutes (${totalHours} hours) of nursing care per resident per day. This meets or exceeds the safety benchmark of 246 minutes (4.1 hours) identified in CMS research.`
      };
    }
  };

  const summary = getSummary();

  // State-specific requirements
  const getStateRequirement = () => {
    const stateMinimums = {
      'CA': { minutes: 210, description: '210 min/day (3.5 HPRD)' },
      'NY': { minutes: null, description: 'Has specific requirements (varies by facility type)' },
      'MA': { minutes: null, description: 'Has specific requirements' }
    };

    const stateMin = stateMinimums[facility.state];
    if (stateMin) {
      if (stateMin.minutes) {
        const meetsState = totalMinutes >= stateMin.minutes;
        return (
          <div className="state-note">
            <strong>{facility.state} state requirement:</strong> {stateMin.description}.
            This facility {meetsState ? 'meets' : 'does not meet'} this requirement.
          </div>
        );
      } else {
        return (
          <div className="state-note">
            <strong>{facility.state} state requirement:</strong> {stateMin.description}
          </div>
        );
      }
    } else {
      return (
        <div className="state-note">
          We're researching {facility.state}'s specific requirements.
        </div>
      );
    }
  };

  return (
    <div className="staffing-section">
      <h2>HOW MUCH CARE DO RESIDENTS GET?</h2>

      <p>Nursing care each resident receives per day at {facility.name}:</p>

      <div className="staffing-table">
        <div className="staffing-row">
          <div>
            <div className="staffing-role">Registered Nurses (RNs)</div>
            <div className="staffing-role-desc">
              Assessments, medication management,<br />
              complex care decisions
            </div>
          </div>
          <div className="staffing-minutes">{rnMinutes} min/day</div>
        </div>

        {hasLpnCna ? (
          <>
            <div className="staffing-row">
              <div>
                <div className="staffing-role">Licensed Practical Nurses (LPNs)</div>
                <div className="staffing-role-desc">
                  Medications, wound care,<br />
                  vital signs monitoring
                </div>
              </div>
              <div className="staffing-minutes">{lpnMinutes} min/day</div>
            </div>
            <div className="staffing-row">
              <div>
                <div className="staffing-role">Certified Nursing Assistants (CNAs)</div>
                <div className="staffing-role-desc">
                  Bathing, feeding, dressing,<br />
                  daily personal care
                </div>
              </div>
              <div className="staffing-minutes">{cnaMinutes} min/day</div>
            </div>
          </>
        ) : (
          <div className="staffing-row">
            <div>
              <div className="staffing-role">Other Nursing Staff (LPN + CNA)</div>
              <div className="staffing-role-desc">
                Medication, wound care, bathing,<br />
                feeding, daily personal care
              </div>
            </div>
            <div className="staffing-minutes">{otherMinutes} min/day</div>
          </div>
        )}

        <div className="staffing-row staffing-total-row">
          <div className="staffing-role">Total nursing care:</div>
          <div className="staffing-minutes">{totalMinutes} min/day ({totalHours} hrs)</div>
        </div>
      </div>

      {/* Weekend Staffing Drop */}
      {hasWeekend && weekendDrop > 10 && (
        <div className="staffing-warning">
          ⚠️ Weekend staffing drops to {weekendTotalMinutes} min/day — that's {weekendDrop} fewer
          minutes of care per resident compared to weekdays.
        </div>
      )}

      {/* RN Benchmark Bar */}
      <div className="staffing-bar">
        <div className="staffing-bar-track">
          <div
            className="staffing-bar-fill"
            style={{ width: `${rnBarPct}%`, backgroundColor: rnBarColor }}
          />
          <div
            className="staffing-bar-marker staffing-bar-state"
            style={{ left: `${rnStateAvgPct}%` }}
            title="State average"
          />
          <div
            className="staffing-bar-marker staffing-bar-benchmark"
            style={{ left: `${rnBenchmarkPct}%` }}
            title="Safety benchmark"
          />
        </div>
        <div className="staffing-bar-legend">
          <span>This facility RN: {rnMinutes} min</span>
          <span>State avg: {stateAvgRnMinutes} min</span>
          <span>Safety benchmark: {SAFETY_BENCHMARK_RN} min</span>
        </div>
      </div>

      {/* Total Benchmark Bar */}
      <div className="staffing-bar">
        <div className="staffing-bar-track">
          <div
            className="staffing-bar-fill"
            style={{ width: `${totalBarPct}%`, backgroundColor: totalBarColor }}
          />
          <div
            className="staffing-bar-marker staffing-bar-state"
            style={{ left: `${totalStateAvgPct}%` }}
            title="State average"
          />
          <div
            className="staffing-bar-marker staffing-bar-benchmark"
            style={{ left: `${totalBenchmarkPct}%` }}
            title="Safety benchmark"
          />
        </div>
        <div className="staffing-bar-legend">
          <span>This facility total: {totalMinutes} min</span>
          <span>State avg: {stateAvgTotalMinutes} min</span>
          <span>Safety benchmark: {SAFETY_BENCHMARK_TOTAL} min</span>
        </div>
      </div>

      {/* Plain English Summary */}
      <div className={`staffing-summary ${summary.className}`}>
        {summary.text}
      </div>

      {/* Zero RN Days Warning */}
      {facility.zero_rn_pct > 0 && (
        <div className="staffing-warning">
          ⚠️ This facility reported zero RN hours on {facility.zero_rn_pct}% of days.
          That means no registered nurse was providing care to any resident.
        </div>
      )}

      {/* Contractor Warning */}
      {facility.contractor_pct > 30 && (
        <div className="staffing-info">
          ℹ️ {facility.contractor_pct}% of nursing hours at this facility come from contract
          (temporary) staff. High contractor use can affect care continuity.
        </div>
      )}

      {/* State Requirement */}
      {getStateRequirement()}

      {/* Federal Staffing Standards Timeline */}
      <CollapsibleSection title="Federal Staffing Standards — Timeline">
        <p>
          <span className="timeline-date">Until 2024:</span> No specific federal minimum. Nursing homes were
          required to have "sufficient staff" to meet residents' needs,
          but no number was defined. Only hard rule: at least 1 RN on
          duty for 8 hours per day.
        </p>

        <div className="timeline-entry">
          <p>
            <span className="timeline-date">April 2024:</span> CMS finalized new minimum standards requiring:
          </p>
          <ul>
            <li>At least 33 minutes of RN care per resident per day</li>
            <li>At least 147 minutes of CNA care per resident per day</li>
            <li>At least 209 minutes total nursing care per resident per day</li>
            <li>An RN physically in the building 24/7</li>
          </ul>
        </div>

        <p>
          <span className="timeline-date">December 2025:</span> These standards were repealed through the
          One Big Beautiful Bill Act (Public Law 119-21, Section 71111).
          The law prohibits CMS from enforcing any minimum staffing
          numbers until at least October 1, 2034.
        </p>

        <p>
          <span className="timeline-date">Current federal requirement:</span> "Sufficient" nursing staff —
          with no specific number defined. An RN must be on duty at
          least 8 hours per day. Some states have their own stricter
          requirements.
        </p>

        <p>
          <strong>Sources:</strong><br />
          <a href="https://www.federalregister.gov/documents/2024/05/10/2024-08273/medicare-and-medicaid-programs-minimum-staffing-standards-for-long-term-care-facilities-and-medicaid" target="_blank" rel="noopener noreferrer">
            2024 Final Rule (Federal Register)
          </a><br />
          <a href="https://nursinghome411.org/federal-staffing-standard/" target="_blank" rel="noopener noreferrer">
            Safety Benchmark Research
          </a>
        </p>
      </CollapsibleSection>

      {/* Understanding Nursing Home Staff */}
      <CollapsibleSection title="Understanding Nursing Home Staff">
        <p><strong>👩‍⚕️ Registered Nurses (RNs)</strong></p>
        <ul>
          <li>4-year college degree (BSN) or 2-year associate degree plus license</li>
          <li>Assess residents, create care plans, manage medications</li>
          <li>Supervise LPNs and CNAs</li>
          <li>Handle complex medical decisions and emergencies</li>
        </ul>

        <p><strong>👨‍⚕️ Licensed Practical Nurses (LPNs)</strong></p>
        <ul>
          <li>1-year certificate program plus license</li>
          <li>Give medications, change wound dressings, monitor vital signs</li>
          <li>Work under RN supervision</li>
          <li>Cannot make care plan decisions</li>
        </ul>

        <p><strong>🤝 Certified Nursing Assistants (CNAs)</strong></p>
        <ul>
          <li>4-12 week training program</li>
          <li>Help residents with bathing, dressing, eating, toileting</li>
          <li>Take vital signs, report changes to nurses</li>
          <li>Provide most hands-on daily care</li>
          <li>Cannot give medications or perform medical procedures</li>
        </ul>

        <p>
          <strong>Why the mix matters:</strong> RNs can catch early warning signs of serious problems
          (infections, strokes, medication reactions) that LPNs and CNAs might miss.
          Research shows that facilities with more RN hours have fewer hospitalizations,
          pressure ulcers, and deaths.
        </p>
      </CollapsibleSection>
    </div>
  );
}
