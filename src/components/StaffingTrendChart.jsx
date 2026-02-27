import '../styles/staffing-trend.css';

export function StaffingTrendChart({ facility }) {
  if (!facility?.staffing_trend) return null;

  const trend = facility.staffing_trend;
  const SAFETY_BENCHMARK = 4.1; // CMS research benchmark

  // Direction badge
  const getDirectionBadge = () => {
    if (trend.direction === 'improving') {
      return <span className="trend-badge trend-badge--improving">IMPROVING ↑</span>;
    } else if (trend.direction === 'declining') {
      return <span className="trend-badge trend-badge--declining">DECLINING ↓</span>;
    } else {
      return <span className="trend-badge trend-badge--stable">STABLE →</span>;
    }
  };

  return (
    <div className="staffing-trend-section">
      <div className="trend-header">
        <h4>Staffing Trend by Quarter</h4>
        <span className="badge-free">Free</span>
        {getDirectionBadge()}
      </div>

      <table className="trend-table">
        <thead>
          <tr>
            <th>Quarter</th>
            <th>Total Nursing Care</th>
            <th>RN Care</th>
            <th>Total vs. Safety Benchmark (4.1 hrs)</th>
            <th>Days With No RN</th>
          </tr>
        </thead>
        <tbody>
          {trend.quarters.map((quarter, i) => {
            const totalHPRD = trend.total_hprd[i];
            const rnHPRD = trend.rn_hprd[i];
            const zeroRNPct = trend.zero_rn_pct[i];
            const barWidthPct = Math.min((totalHPRD / SAFETY_BENCHMARK) * 100, 100);

            return (
              <tr key={quarter}>
                <td className="quarter">{quarter}</td>
                <td>{totalHPRD.toFixed(1)} hrs/resident/day</td>
                <td className={rnHPRD < 0.55 ? 'val-red' : ''}>{rnHPRD.toFixed(2)} hrs</td>
                <td className="trend-bar-cell">
                  <div className="trend-bar-track">
                    <div
                      className="trend-bar-fill trend-bar-fill-total"
                      style={{ width: `${barWidthPct}%` }}
                    ></div>
                    <div className="benchmark-line" style={{ left: '100%' }}></div>
                  </div>
                </td>
                <td className={`trend-zero-rn ${zeroRNPct > 0 ? 'val-red' : ''}`}>
                  {zeroRNPct.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="trend-legend">
        <span>■ Blue bar = total nursing hours per resident per day</span>
        <span>| Red line = safety benchmark (4.1 hrs)</span>
      </div>

      <p className="staffing-trend-source">
        Source: CMS Payroll-Based Journal data, quarterly
      </p>
    </div>
  );
}
