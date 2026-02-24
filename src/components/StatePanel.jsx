import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StatePanel({ stateCode, stateData, stateSummary }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('risk'); // risk, name, fines, stars

  // Sort facilities based on selected sort option
  const sortedFacilities = useMemo(() => {
    if (!stateData?.facilities) return [];

    const facilities = [...stateData.facilities];

    switch (sortBy) {
      case 'risk':
        return facilities.sort((a, b) => (b.composite || 0) - (a.composite || 0));
      case 'name':
        return facilities.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'fines':
        return facilities.sort((a, b) => (b.total_fines || 0) - (a.total_fines || 0));
      case 'stars':
        return facilities.sort((a, b) => (a.stars || 0) - (b.stars || 0));
      default:
        return facilities;
    }
  }, [stateData, sortBy]);

  if (!stateCode || !stateData) {
    return (
      <div className="state-panel empty">
        <div className="empty-state">
          <h3>Explore Nursing Home Data</h3>
          <p>Click any state on the map to view detailed facility information, risk scores, and inspection data.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            States are color-coded by average risk score:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '20px', height: '20px', background: 'rgba(20, 184, 166, 0.4)', borderRadius: '4px' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Low Risk (&lt;30)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '20px', height: '20px', background: 'rgba(245, 158, 11, 0.4)', borderRadius: '4px' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Medium Risk (30-40)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '20px', height: '20px', background: 'rgba(251, 146, 60, 0.4)', borderRadius: '4px' }}></div>
              <span style={{ fontSize: '0.85rem' }}>High Risk (40-50)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '20px', height: '20px', background: 'rgba(239, 68, 68, 0.4)', borderRadius: '4px' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Very High Risk (&gt;50)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function getRiskClass(score) {
    if (score >= 60) return 'risk-critical';
    if (score >= 40) return 'risk-high';
    if (score >= 20) return 'risk-medium';
    return 'risk-low';
  }

  function formatCurrency(value) {
    if (!value) return '$0';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }

  function getStateFullName(code) {
    const stateNames = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois',
      'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
      'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon',
      'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota',
      'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia',
      'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };
    return stateNames[code] || code;
  }

  return (
    <div className="state-panel animate-slide-in-left">
      <div className="state-panel-header">
        <div className="state-panel-title">{getStateFullName(stateCode)}</div>

        <div className="state-panel-stats">
          <div className="state-stat">
            <div className="state-stat-value">{stateSummary?.count || 0}</div>
            <div className="state-stat-label">Facilities</div>
          </div>
          <div className="state-stat">
            <div className="state-stat-value highlight">{stateSummary?.high_risk || 0}</div>
            <div className="state-stat-label">High Risk</div>
          </div>
          <div className="state-stat">
            <div className="state-stat-value">{stateSummary?.avg_composite?.toFixed(1) || '0.0'}</div>
            <div className="state-stat-label">Avg Score</div>
          </div>
          <div className="state-stat">
            <div className="state-stat-value">{formatCurrency(stateSummary?.total_fines)}</div>
            <div className="state-stat-label">Total Fines</div>
          </div>
        </div>
      </div>

      <div className="state-panel-sort">
        <label className="sort-label">Sort by:</label>
        <div className="sort-buttons">
          <button
            className={`sort-btn ${sortBy === 'risk' ? 'active' : ''}`}
            onClick={() => setSortBy('risk')}
          >
            Risk Score
          </button>
          <button
            className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => setSortBy('name')}
          >
            Name
          </button>
          <button
            className={`sort-btn ${sortBy === 'fines' ? 'active' : ''}`}
            onClick={() => setSortBy('fines')}
          >
            Fines
          </button>
          <button
            className={`sort-btn ${sortBy === 'stars' ? 'active' : ''}`}
            onClick={() => setSortBy('stars')}
          >
            Stars
          </button>
        </div>
      </div>

      <div className="state-panel-list">
        {sortedFacilities.map((facility, index) => {
          const riskClass = getRiskClass(facility.composite || 0);
          const stars = '★'.repeat(Math.max(0, facility.stars || 0)) +
                        '☆'.repeat(Math.max(0, 5 - (facility.stars || 0)));

          return (
            <div
              key={facility.ccn || index}
              className="facility-list-item"
              onClick={() => navigate(`/facility/${facility.ccn}`)}
            >
              <div className="facility-item-header">
                <div className="facility-item-name">{facility.name}</div>
                <div className={`facility-item-badge ${riskClass}`}>
                  {(facility.composite || 0).toFixed(0)}
                </div>
              </div>
              <div className="facility-item-footer">
                <div className="facility-item-city">{facility.city}</div>
                <div className="facility-item-stars">{stars}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
