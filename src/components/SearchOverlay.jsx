import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RiskBadge from './RiskBadge';
import '../styles/search.css';

/**
 * Full-screen search overlay with live facility search
 * Supports keyboard navigation and ESC to close
 */
export default function SearchOverlay({ onClose, searchFacilities }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when overlay opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      const searchResults = searchFacilities(query);
      setResults(searchResults);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchFacilities]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle clicking outside the search box
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Navigate to facility page
  const handleSelectFacility = (facility) => {
    window.plausible && window.plausible('Facility-Search', {props: {query: query.slice(0, 100), facility: facility.name, ccn: facility.ccn}});
    navigate(`/facility/${facility.ccn}`);
    onClose();
  };

  return (
    <div className="search-overlay" onClick={handleBackdropClick}>
      <div className="search-overlay-content">
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search by facility name, city, or CCN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {query.trim().length >= 2 && (
          <div className="search-results">
            {results.length > 0 ? (
              results.map((facility) => (
                <div
                  key={facility.ccn}
                  className="search-result-item"
                  onClick={() => handleSelectFacility(facility)}
                >
                  <div className="search-result-info">
                    <div className="search-result-name">{facility.name}</div>
                    <div className="search-result-location">
                      {facility.city}, {facility.state} • CCN: {facility.ccn}
                    </div>
                  </div>
                  <RiskBadge score={facility.composite} />
                </div>
              ))
            ) : (
              <div className="search-no-results">
                No facilities found matching "{query}"
              </div>
            )}
          </div>
        )}

        <div className="search-close-hint">
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
}
