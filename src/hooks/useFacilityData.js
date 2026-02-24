import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for loading and accessing facility data
 * Loads facilities_map_data.json once and provides helper functions
 */
export function useFacilityData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch('/facilities_map_data.json');

        if (!response.ok) {
          throw new Error(`Failed to load facility data: ${response.status}`);
        }

        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        console.error('Error loading facility data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Get state data by state code
  const getState = useMemo(() => {
    return (stateCode) => {
      if (!data || !data.states) return null;
      return data.states[stateCode.toUpperCase()];
    };
  }, [data]);

  // Get facility by CCN
  const getFacility = useMemo(() => {
    return (ccn) => {
      if (!data || !data.states) return null;

      // Search through all states
      for (const stateData of Object.values(data.states)) {
        const facility = stateData.facilities?.find(f => f.ccn === ccn);
        if (facility) return facility;
      }

      return null;
    };
  }, [data]);

  // Search facilities by name, city, or CCN
  const searchFacilities = useMemo(() => {
    return (query) => {
      if (!data || !data.states || !query || query.trim().length < 2) {
        return [];
      }

      const searchTerm = query.toLowerCase().trim();
      const results = [];

      // Search through all states
      for (const [stateCode, stateData] of Object.entries(data.states)) {
        if (!stateData.facilities) continue;

        for (const facility of stateData.facilities) {
          // Match on name, city, or CCN
          const matchesName = facility.name?.toLowerCase().includes(searchTerm);
          const matchesCity = facility.city?.toLowerCase().includes(searchTerm);
          const matchesCCN = facility.ccn?.includes(searchTerm);

          if (matchesName || matchesCity || matchesCCN) {
            results.push(facility);
          }

          // Limit results to prevent performance issues
          if (results.length >= 50) {
            return results;
          }
        }
      }

      // Sort by composite score (highest risk first)
      return results.sort((a, b) => (b.composite || 0) - (a.composite || 0));
    };
  }, [data]);

  // Get all facilities as a flat array
  const getAllFacilities = useMemo(() => {
    if (!data || !data.states) return [];

    const facilities = [];
    for (const stateData of Object.values(data.states)) {
      if (stateData.facilities) {
        facilities.push(...stateData.facilities);
      }
    }
    return facilities;
  }, [data]);

  // Get high-risk facilities (composite >= 60)
  const getHighRiskFacilities = useMemo(() => {
    const all = getAllFacilities;
    return all.filter(f => (f.composite || 0) >= 60)
      .sort((a, b) => (b.composite || 0) - (a.composite || 0));
  }, [getAllFacilities]);

  return {
    data,
    loading,
    error,
    getState,
    getFacility,
    searchFacilities,
    getAllFacilities,
    getHighRiskFacilities,
  };
}
