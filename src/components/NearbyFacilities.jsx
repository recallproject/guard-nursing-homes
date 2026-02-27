import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFacilityData } from '../hooks/useFacilityData';
import { haversineDistance } from '../utils/haversine';

/**
 * NearbyFacilities Component
 * Shows better-rated alternative facilities near the current facility
 */
export function NearbyFacilities({ facility }) {
  const { data } = useFacilityData();
  const [radius, setRadius] = useState(15);
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'score', 'stars'

  const nearbyFacilities = useMemo(() => {
    if (!facility || !data || !data.states) {
      return [];
    }

    // Get all facilities from the same state
    const stateData = data.states[facility.state];
    if (!stateData || !stateData.facilities) {
      return [];
    }

    const results = [];

    // Filter and compute distances
    stateData.facilities.forEach(f => {
      // Skip the current facility
      if (f.ccn === facility.ccn) return;

      // Check if facility has coordinates
      if (!f.lat || !f.lon || !facility.lat || !facility.lon) return;

      // Compute distance
      const distance = haversineDistance(
        facility.lat,
        facility.lon,
        f.lat,
        f.lon
      );

      // Filter by radius
      if (distance > radius) return;

      // Filter by composite score (lower is better)
      // Only show facilities with equal or better safety scores
      if ((f.composite || 100) > (facility.composite || 0)) return;

      results.push({
        ...f,
        distance: distance,
      });
    });

    // Sort results
    results.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'score':
          return (a.composite || 0) - (b.composite || 0);
        case 'stars':
          return (b.stars || 0) - (a.stars || 0);
        default:
          return a.distance - b.distance;
      }
    });

    // Return top 10
    return results.slice(0, 10);
  }, [facility, data, radius, sortBy]);

  if (!facility || !facility.lat || !facility.lon) {
    return null;
  }

  return (
    <div className="nearby-facilities">
      <h2>Nearby Alternatives</h2>
      <p className="nearby-subtitle">
        Showing facilities within {radius} miles with equal or better safety scores
      </p>

      {/* Controls */}
      <div className="nearby-controls">
        <div className="nearby-control-group">
          <label htmlFor="radius-slider">Radius: {radius} miles</label>
          <input
            id="radius-slider"
            type="range"
            min="5"
            max="25"
            step="5"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="nearby-slider"
          />
          <div className="nearby-slider-labels">
            <span>5</span>
            <span>15</span>
            <span>25</span>
          </div>
        </div>

        <div className="nearby-control-group">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="nearby-select"
          >
            <option value="distance">Distance</option>
            <option value="score">Safety Score</option>
            <option value="stars">Stars</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {nearbyFacilities.length === 0 ? (
        <div className="nearby-empty">
          No better-rated facilities found within {radius} miles.
          Try increasing the radius.
        </div>
      ) : (
        <div className="nearby-results">
          {nearbyFacilities.map((f) => (
            <Link
              key={f.ccn}
              to={`/facility/${f.ccn}`}
              className="nearby-card"
              onClick={() => { window.plausible && window.plausible('Nearby-Facilities-Click', {props: {from_facility: facility.ccn, to_facility: f.ccn}}); }}
            >
              <div className="nearby-card-header">
                <h3 className="nearby-card-name">{f.name}</h3>
                <div className="nearby-card-distance">
                  {f.distance.toFixed(1)} mi
                </div>
              </div>

              <div className="nearby-card-location">
                {f.city}, {f.state}
              </div>

              <div className="nearby-card-metrics">
                <div className="nearby-metric">
                  <span className="nearby-metric-label">Safety Score:</span>
                  <span
                    className={`nearby-metric-value ${
                      f.composite < 40
                        ? 'nearby-metric-good'
                        : f.composite < 60
                        ? 'nearby-metric-ok'
                        : 'nearby-metric-bad'
                    }`}
                  >
                    {f.composite?.toFixed(1) || 'N/A'}
                  </span>
                </div>

                <div className="nearby-metric">
                  <span className="nearby-metric-label">Stars:</span>
                  <span className="nearby-metric-value">
                    {f.stars || 0} ⭐
                  </span>
                </div>

                {f.beds && (
                  <div className="nearby-metric">
                    <span className="nearby-metric-label">Beds:</span>
                    <span className="nearby-metric-value">{f.beds}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
