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

  return (
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
            <div className="staffing-role">Registered Nurses (RNs)</div>
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
                <div className="staffing-role">Licensed Practical Nurses (LPNs)</div>
                <div className="staffing-desc">Medications, wound care, vital signs</div>
              </td>
              <td>{lpnMinutes} min</td>
              <td>{stateAvgLpnMinutes != null ? `${stateAvgLpnMinutes} min` : '—'}</td>
              <td>—</td>
            </tr>
            <tr>
              <td>
                <div className="staffing-role">Certified Nursing Assistants (CNAs)</div>
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
            <div className="staffing-role">Total Nursing Care</div>
          </td>
          <td><strong className={totalClass}>{totalMinutes} min ({totalHours} hrs)</strong></td>
          <td>{stateAvgTotalMinutes != null ? `${stateAvgTotalMinutes} min` : '—'}</td>
          <td>{SAFETY_BENCHMARK_TOTAL} min (4.1 hrs)</td>
        </tr>
      </tbody>
    </table>
  );
}
