import { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScalesIcon } from './landing/Icons';

function FacilitySearch({ placeholder, onSelect, selectedFacility, onClear, searchFacilities }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      const searchResults = searchFacilities(query);
      setResults(searchResults.slice(0, 8));
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, searchFacilities]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (facility) => {
    onSelect(facility);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  if (selectedFacility) {
    return (
      <div className="compare-selected">
        <div className="compare-selected-info">
          <span className="compare-selected-name">{selectedFacility.name}</span>
          <span className="compare-selected-location">{selectedFacility.city}, {selectedFacility.state}</span>
        </div>
        <button className="compare-selected-clear" onClick={onClear}>&times;</button>
      </div>
    );
  }

  return (
    <div className="compare-search-wrapper" ref={wrapperRef}>
      <input
        type="text"
        className="compare-search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowResults(true)}
      />
      {showResults && results.length > 0 && (
        <div className="compare-search-dropdown">
          {results.map((facility) => (
            <div
              key={facility.ccn}
              className="compare-search-item"
              onClick={() => handleSelect(facility)}
            >
              <span className="compare-search-item-name">{facility.name}</span>
              <span className="compare-search-item-location">{facility.city}, {facility.state}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getRiskColor(score) {
  if (score >= 60) return 'var(--risk-critical)';
  if (score >= 40) return 'var(--risk-high)';
  if (score >= 20) return 'var(--risk-elevated)';
  return 'var(--risk-low)';
}

function getFineColor(amount) {
  if (amount >= 200000) return 'var(--risk-critical)';
  if (amount >= 50000) return 'var(--risk-high)';
  if (amount >= 10000) return 'var(--risk-elevated)';
  return 'var(--risk-low)';
}

function getDeficiencyColor(count) {
  if (count >= 20) return 'var(--risk-critical)';
  if (count >= 10) return 'var(--risk-high)';
  if (count >= 5) return 'var(--risk-elevated)';
  return 'var(--risk-low)';
}

function getStarColor(stars) {
  if (stars >= 4) return 'var(--risk-low)';
  if (stars >= 3) return 'var(--risk-elevated)';
  if (stars >= 2) return 'var(--risk-high)';
  return 'var(--risk-critical)';
}

function formatFines(amount) {
  if (!amount) return '$0';
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
  return '$' + amount.toLocaleString();
}

function renderStars(count) {
  const filled = Math.floor(Math.max(0, Math.min(5, count || 0)));
  const empty = 5 - filled;
  return (
    <span className="compare-stars">
      {'★'.repeat(filled)}
      <span className="compare-stars-empty">{'☆'.repeat(empty)}</span>
    </span>
  );
}

const ComparisonTool = forwardRef(function ComparisonTool({ searchFacilities }, ref) {
  const [facilities, setFacilities] = useState([null, null, null]);
  const navigate = useNavigate();

  const selectedCount = facilities.filter(Boolean).length;

  const handleSelect = (index, facility) => {
    const updated = [...facilities];
    updated[index] = facility;
    setFacilities(updated);
  };

  const handleClear = (index) => {
    const updated = [...facilities];
    updated[index] = null;
    setFacilities(updated);
  };

  const handleReset = () => {
    setFacilities([null, null, null]);
  };

  const activeFacilities = facilities.filter(Boolean);

  // For "best" highlighting: find best value per row
  const findBest = (getValue, lowerIsBetter = false) => {
    if (activeFacilities.length < 2) return -1;
    let bestIdx = 0;
    let bestVal = getValue(activeFacilities[0]);
    activeFacilities.forEach((f, i) => {
      const val = getValue(f);
      if (lowerIsBetter ? val < bestVal : val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    });
    return bestIdx;
  };

  const rows = [
    {
      label: 'Overall Rating',
      getValue: (f) => f.stars || 0,
      render: (f) => renderStars(f.stars),
      getColor: (f) => getStarColor(f.stars || 0),
      bestHigher: true,
    },
    {
      label: 'GUARD Risk Score',
      getValue: (f) => f.composite || 0,
      render: (f) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{(f.composite || 0).toFixed(1)}</span>,
      getColor: (f) => getRiskColor(f.composite || 0),
      bestHigher: false, // lower risk is better
    },
    {
      label: 'Total Fines (3yr)',
      getValue: (f) => f.total_fines || 0,
      render: (f) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{formatFines(f.total_fines)}</span>,
      getColor: (f) => getFineColor(f.total_fines || 0),
      bestHigher: false,
    },
    {
      label: 'Health Deficiencies',
      getValue: (f) => f.total_deficiencies || 0,
      render: (f) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{f.total_deficiencies || 0}</span>,
      getColor: (f) => getDeficiencyColor(f.total_deficiencies || 0),
      bestHigher: false,
    },
    {
      label: 'Harm Citations',
      getValue: (f) => f.harm_count || 0,
      render: (f) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{f.harm_count || 0}</span>,
      getColor: (f) => (f.harm_count || 0) > 0 ? 'var(--risk-critical)' : 'var(--risk-low)',
      bestHigher: false,
    },
    {
      label: 'Serious Danger Citations',
      getValue: (f) => f.jeopardy_count || 0,
      render: (f) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{f.jeopardy_count || 0}</span>,
      getColor: (f) => (f.jeopardy_count || 0) > 0 ? 'var(--risk-critical)' : 'var(--risk-low)',
      bestHigher: false,
    },
  ];

  return (
    <section className="landing-section section-dark compare-section" ref={ref}>
      <div className="container">
        <div className="section-header">
          <h2>Compare Facilities</h2>
          <p>Select 2-3 nursing homes to compare side by side</p>
        </div>

        <div className="compare-inputs">
          {[0, 1, 2].map((index) => (
            <FacilitySearch
              key={index}
              placeholder={`${index === 2 ? 'Add a third facility (optional)' : `Search facility ${index + 1}...`}`}
              onSelect={(f) => handleSelect(index, f)}
              selectedFacility={facilities[index]}
              onClear={() => handleClear(index)}
              searchFacilities={searchFacilities}
            />
          ))}
        </div>

        {selectedCount >= 2 && (
          <>
            <div className="compare-table-wrapper">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th className="compare-table-label-col"></th>
                    {activeFacilities.map((f) => (
                      <th key={f.ccn} className="compare-table-facility-col">
                        <div className="compare-th-name" onClick={() => navigate(`/facility/${f.ccn}`)}>{f.name}</div>
                        <div className="compare-th-location">{f.city}, {f.state}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const bestIdx = findBest(row.getValue, !row.bestHigher);
                    return (
                      <tr key={row.label}>
                        <td className="compare-row-label">{row.label}</td>
                        {activeFacilities.map((f, i) => (
                          <td
                            key={f.ccn}
                            className={`compare-cell ${i === bestIdx ? 'compare-cell-best' : ''}`}
                            style={{ color: row.getColor(f) }}
                          >
                            {row.render(f)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="compare-actions">
              <button className="btn btn-secondary" onClick={handleReset}>Clear All</button>
            </div>
          </>
        )}

        {selectedCount === 0 && (
          <div className="compare-empty">
            <ScalesIcon size={48} />
            <p>Search and select facilities above to start comparing</p>
          </div>
        )}
      </div>
    </section>
  );
});

export default ComparisonTool;
