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
          ⚠️ This facility reported zero RN hours on {facility.zero_rn_pct}% of days (Q3 2025).
          Federal law requires RN coverage for at least 8 consecutive hours per day (42 CFR §483.35).
          Days with zero reported RN hours may indicate a violation of this requirement.
          Without an RN present, certain clinical functions cannot be performed — including
          IV medication administration, complex wound assessment, and evaluation of acute changes in condition.
          <br /><br />
          <em>PBJ data is self-reported by facilities and not routinely audited by CMS.
          Zero reported hours could reflect an actual staffing gap or a reporting error — both are concerning.</em>
          <br />
          <span className="staffing-source">Source: CMS Payroll-Based Journal, Q3 2025</span>
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
          <span className="timeline-date">Current federal requirement (42 CFR §483.35):</span> An RN
          must be on site for at least 8 consecutive hours per day, 7 days per week. A full-time RN
          must serve as Director of Nursing. Facilities must have "sufficient" licensed nursing staff
          24 hours per day. There is no federal minimum hours-per-resident-day (HPRD) requirement.
        </p>

        <div className="timeline-entry">
          <p>
            <span className="timeline-date">May 2024:</span> CMS finalized a rule that would have required:
          </p>
          <ul>
            <li>3.48 total nursing hours per resident per day (0.55 RN + 2.45 CNA)</li>
            <li>24/7 on-site RN coverage</li>
          </ul>
        </div>

        <p>
          <span className="timeline-date">April–June 2025:</span> Federal courts in Texas and Iowa
          struck down the rule. It never took effect at any facility.
        </p>

        <p>
          <span className="timeline-date">July 4, 2025:</span> The{' '}
          <a href="https://www.congress.gov/bill/119th-congress/house-bill/1/text" target="_blank" rel="noopener noreferrer">
            One Big Beautiful Bill Act
          </a>{' '}
          (§71111) blocked enforcement of any staffing mandate through September 30, 2034.
        </p>

        <p>
          <span className="timeline-date">December 2, 2025:</span> CMS issued an{' '}
          <a href="https://www.federalregister.gov/documents/2025/12/03/2025-21792/medicare-and-medicaid-programs-repeal-of-minimum-staffing-standards-for-long-term-care-facilities" target="_blank" rel="noopener noreferrer">
            interim final rule
          </a>{' '}
          formally repealing the 2024 standards.
        </p>

        <p>
          <span className="timeline-date">February 2, 2026:</span>{' '}
          <a href="https://oag.ca.gov/system/files/attachments/press-docs/Repeal%20of%20Minimum%20Staffing%20Standards%20for%20LTC%20Facilities%20Comment%20Letter%202026.02.02.pdf" target="_blank" rel="noopener noreferrer">
            18 state attorneys general
          </a>{' '}
          asked CMS to implement a targeted staffing standard (3.48 HPRD) for for-profit nursing homes
          with high-risk financial practices, including related-party transactions and private equity ownership.
        </p>

        <p>
          <strong>Sources:</strong><br />
          <a href="https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.35" target="_blank" rel="noopener noreferrer">
            42 CFR §483.35 (current federal requirements)
          </a><br />
          <a href="https://www.federalregister.gov/documents/2025/12/03/2025-21792/medicare-and-medicaid-programs-repeal-of-minimum-staffing-standards-for-long-term-care-facilities" target="_blank" rel="noopener noreferrer">
            CMS Repeal IFR (Dec 2025)
          </a><br />
          <a href="https://www.congress.gov/bill/119th-congress/house-bill/1/text" target="_blank" rel="noopener noreferrer">
            One Big Beautiful Bill Act §71111
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
