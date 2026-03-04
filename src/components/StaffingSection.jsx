import MetricTooltip from './facility/MetricTooltip';

export default function StaffingSection({ facility, benchmarks }) {
  // Convert HPRD to minutes
  const rnMinutes = Math.round(facility.rn_hprd * 60);
  const totalMinutes = Math.round(facility.total_hprd * 60);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // LPN/CNA breakdown
  const hasLpnCna = facility.lpn_hprd != null && facility.cna_hprd != null;
  const lpnMinutes = hasLpnCna ? Math.round(facility.lpn_hprd * 60) : null;
  const cnaMinutes = hasLpnCna ? Math.round(facility.cna_hprd * 60) : null;

  // Safety benchmarks in minutes
  const SAFETY_BENCHMARK_TOTAL = 246; // 4.1 hrs
  const SAFETY_BENCHMARK_RN = 33; // CMS 2024 standard

  // State averages in minutes
  const stateAvgRnMinutes = benchmarks.state.rn_hprd ? Math.round(benchmarks.state.rn_hprd * 60) : null;
  const stateAvgTotalMinutes = benchmarks.state.total_hprd ? Math.round(benchmarks.state.total_hprd * 60) : null;
  const stateAvgLpnMinutes = benchmarks.state.lpn_hprd ? Math.round(benchmarks.state.lpn_hprd * 60) : null;
  const stateAvgCnaMinutes = benchmarks.state.cna_hprd ? Math.round(benchmarks.state.cna_hprd * 60) : null;

  // Color class for values below benchmarks
  const rnClass = rnMinutes < SAFETY_BENCHMARK_RN ? 'val-red' : rnMinutes < (stateAvgRnMinutes || 999) ? 'val-orange' : 'val-green';
  const totalClass = totalMinutes < SAFETY_BENCHMARK_TOTAL ? 'val-red' : '';

  // Staffing verdict logic
  const rnBelowFederal = rnMinutes < SAFETY_BENCHMARK_RN;
  const totalBelowBenchmark = totalMinutes < SAFETY_BENCHMARK_TOTAL;
  const rnBelowState = stateAvgRnMinutes != null && rnMinutes < stateAvgRnMinutes;
  const totalBelowState = stateAvgTotalMinutes != null && totalMinutes < stateAvgTotalMinutes;
  const rnPctOfBenchmark = Math.round((rnMinutes / SAFETY_BENCHMARK_RN) * 100);
  const totalPctOfBenchmark = Math.round((totalMinutes / SAFETY_BENCHMARK_TOTAL) * 100);

  let verdictLevel, verdictTitle, verdictText;
  if (rnBelowFederal && totalBelowBenchmark) {
    verdictLevel = 'concern';
    verdictTitle = 'Staffing Levels Are a Serious Concern';
    verdictText = `This facility provides only <strong>${rnMinutes} minutes</strong> of RN care per resident per day — <strong>${100 - rnPctOfBenchmark}% below</strong> the federal standard of ${SAFETY_BENCHMARK_RN} minutes. Total nursing care is ${totalMinutes} minutes (${totalHours} hrs), which is <strong>${100 - totalPctOfBenchmark}% below</strong> the 4.1-hour safety benchmark.${rnBelowState ? ` RN hours also fall below the state average of ${stateAvgRnMinutes} minutes.` : ''} Low staffing is the single strongest predictor of poor outcomes in nursing homes.`;
  } else if (rnBelowFederal || totalBelowBenchmark) {
    verdictLevel = 'caution';
    verdictTitle = 'Staffing Levels Raise Questions';
    if (rnBelowFederal) {
      verdictText = `RN staffing is <strong>${100 - rnPctOfBenchmark}% below</strong> the federal standard at ${rnMinutes} minutes per resident per day (benchmark: ${SAFETY_BENCHMARK_RN} min).${totalBelowState ? ` Total nursing hours are also below the state average.` : ` Total nursing care (${totalHours} hrs) meets the safety benchmark.`} RNs catch deteriorating conditions early — fewer RN minutes means higher risk of missed warning signs.`;
    } else {
      verdictText = `Total nursing care is <strong>${100 - totalPctOfBenchmark}% below</strong> the 4.1-hour safety benchmark at ${totalMinutes} minutes (${totalHours} hrs) per resident per day. While RN hours meet the federal standard, the overall staffing level means fewer hands for daily care tasks like repositioning, feeding, and hygiene.`;
    }
  } else {
    verdictLevel = 'ok';
    verdictTitle = 'Staffing Levels Meet Safety Benchmarks';
    verdictText = `This facility provides <strong>${rnMinutes} minutes</strong> of RN care and <strong>${totalMinutes} minutes</strong> (${totalHours} hrs) of total nursing care per resident per day — both meeting or exceeding safety benchmarks.${rnBelowState ? ' Note: RN hours are still below the state average, so there may be room for improvement.' : ''} Meeting staffing benchmarks is a positive sign, though it doesn't guarantee quality of care.`;
  }

  return (
    <>
    {/* Staffing Verdict */}
    <div className={`verdict-banner ${verdictLevel}`}>
      <div className={`verdict-icon ${verdictLevel}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {verdictLevel === 'concern' && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
          {verdictLevel === 'caution' && <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
          {verdictLevel === 'ok' && <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
        </svg>
      </div>
      <div className="verdict-text">
        <h3 className={verdictLevel}>{verdictTitle}</h3>
        <p dangerouslySetInnerHTML={{ __html: verdictText }} />
      </div>
    </div>

    <table className="staffing-table">
      <thead>
        <tr>
          <th>Role</th>
          <th>Minutes/Day</th>
          <th>State Avg</th>
          <th>Safety Benchmark</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div className="staffing-role">Registered Nurses (RNs)
              <MetricTooltip title="What is RN HPRD?" benchmark="National avg: ~40 min · Federal standard: 33 min">
                This is how many minutes of care from a Registered Nurse each resident gets in a 24-hour period. RNs are the most trained nurses on staff — they assess conditions, manage medications, and catch problems early.
              </MetricTooltip>
            </div>
            <div className="staffing-desc">Assessments, medications, complex care decisions</div>
          </td>
          <td><strong className={rnClass}>{rnMinutes} min</strong></td>
          <td>{stateAvgRnMinutes != null ? `${stateAvgRnMinutes} min` : '—'}</td>
          <td>{SAFETY_BENCHMARK_RN} min</td>
        </tr>
        {hasLpnCna && (
          <>
            <tr>
              <td>
                <div className="staffing-role">Licensed Practical Nurses (LPNs)
                  <MetricTooltip title="What do LPNs do?" benchmark="No federal minimum for LPN hours specifically">
                    LPNs handle medications, wound care, and vital signs. They work under RN supervision and provide essential day-to-day nursing tasks. More LPN minutes generally means more hands-on clinical care.
                  </MetricTooltip>
                </div>
                <div className="staffing-desc">Medications, wound care, vital signs</div>
              </td>
              <td>{lpnMinutes} min</td>
              <td>{stateAvgLpnMinutes != null ? `${stateAvgLpnMinutes} min` : '—'}</td>
              <td>—</td>
            </tr>
            <tr>
              <td>
                <div className="staffing-role">Certified Nursing Assistants (CNAs)
                  <MetricTooltip title="What do CNAs do?" benchmark="CNAs provide ~60% of all direct nursing care in most facilities">
                    CNAs provide the most hands-on care — bathing, dressing, feeding, and repositioning residents. They spend the most time at the bedside and are often the first to notice when something is wrong.
                  </MetricTooltip>
                </div>
                <div className="staffing-desc">Bathing, feeding, dressing, daily personal care</div>
              </td>
              <td>{cnaMinutes} min</td>
              <td>{stateAvgCnaMinutes != null ? `${stateAvgCnaMinutes} min` : '—'}</td>
              <td>—</td>
            </tr>
          </>
        )}
        <tr style={{ borderTop: '2px solid var(--border)' }}>
          <td>
            <div className="staffing-role">Total Nursing Care
              <MetricTooltip title="Total Staffing" benchmark="National avg: ~3.8 hrs · Safety benchmark: 4.1 hrs">
                This combines hours from RNs, LPNs, and CNAs — everyone who provides direct nursing care. A higher number means more hands available per resident per day.
              </MetricTooltip>
            </div>
          </td>
          <td><strong className={totalClass}>{totalMinutes} min ({totalHours} hrs)</strong></td>
          <td>{stateAvgTotalMinutes != null ? `${stateAvgTotalMinutes} min` : '—'}</td>
          <td>{SAFETY_BENCHMARK_TOTAL} min (4.1 hrs)</td>
        </tr>
      </tbody>
    </table>
    <div style={{ fontSize: '11px', color: 'var(--text-muted, #6b6590)', marginTop: '8px', lineHeight: '1.4' }}>
      RN and Total hours from CMS Payroll-Based Journal (mandatory payroll records). LPN and CNA hours from CMS Provider Information (facility self-reported). Totals may not equal the sum of individual roles due to different data sources.
    </div>
    </>
  );
}
