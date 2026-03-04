import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

// Shared cache so multiple components don't re-fetch the same data
const stateCache = {};
let ccnIndex = null;
let indexData = null;
let fullData = null;

/**
 * Load the lightweight index (state_summary + national stats, ~5KB)
 */
async function loadIndex() {
  if (indexData) return indexData;
  const res = await fetch(`${BASE}data/index.json`);
  if (!res.ok) throw new Error(`Failed to load index: ${res.status}`);
  indexData = await res.json();
  return indexData;
}

/**
 * Load the CCN-to-state mapping (~201KB)
 */
async function loadCcnIndex() {
  if (ccnIndex) return ccnIndex;
  const res = await fetch(`${BASE}data/ccn-index.json`);
  if (!res.ok) throw new Error(`Failed to load CCN index: ${res.status}`);
  ccnIndex = await res.json();
  return ccnIndex;
}

/**
 * Load a single state's facility data (0.1–5MB depending on state)
 */
async function loadStateData(stateCode) {
  const code = stateCode.toUpperCase();
  if (stateCache[code]) return stateCache[code];
  const res = await fetch(`${BASE}data/states/${code}.json`);
  if (!res.ok) throw new Error(`Failed to load state ${code}: ${res.status}`);
  stateCache[code] = await res.json();
  return stateCache[code];
}

/**
 * Load the full monolith (legacy, for pages that need all data at once)
 */
async function loadFullData() {
  if (fullData) return fullData;
  const res = await fetch(`${BASE}facilities_map_data.json`);
  if (!res.ok) throw new Error(`Failed to load facility data: ${res.status}`);
  fullData = await res.json();
  return fullData;
}

// ═══════════════════════════════════════════════════════════
// Hook 1: useFacilityData — full dataset for search, map, etc.
// Loads all state files in parallel instead of one 53MB monolith
// ═══════════════════════════════════════════════════════════
export function useFacilityData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        // Load index first to get list of states
        const idx = await loadIndex();
        const stateCodes = Object.keys(idx.state_summary);

        // Load all state files in parallel (many small files vs one huge one)
        const stateEntries = await Promise.all(
          stateCodes.map(async (code) => {
            const stateData = await loadStateData(code);
            return [code, stateData];
          })
        );

        if (cancelled) return;

        // Reconstruct the same data shape the rest of the app expects
        const states = Object.fromEntries(stateEntries);
        setData({
          states,
          state_summary: idx.state_summary,
          national: idx.national,
        });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading facility data:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
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
      for (const [stateCode, stateData] of Object.entries(data.states)) {
        if (!stateData.facilities) continue;
        for (const facility of stateData.facilities) {
          const matchesName = facility.name?.toLowerCase().includes(searchTerm);
          const matchesCity = facility.city?.toLowerCase().includes(searchTerm);
          const matchesCCN = facility.ccn?.includes(searchTerm);
          const matchesZip = facility.zip?.startsWith(searchTerm);
          const matchesState = stateCode.toLowerCase() === searchTerm || facility.state?.toLowerCase() === searchTerm;
          if (matchesName || matchesCity || matchesCCN || matchesZip || matchesState) {
            results.push(facility);
          }
          if (results.length >= 50) return results;
        }
      }
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


// ═══════════════════════════════════════════════════════════
// Hook 2: useSingleFacility — fast load for facility detail page
// Only loads CCN index (201KB) + one state file (1-5MB)
// This is the hook that fixes the Google Soft 404 problem
// ═══════════════════════════════════════════════════════════
export function useSingleFacility(ccn) {
  const [facility, setFacility] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [allStateFacilities, setAllStateFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        // Step 1: Load CCN index (~201KB) to find which state this facility is in
        const index = await loadCcnIndex();
        const stateCode = index[ccn];

        if (!stateCode) {
          throw new Error(`Facility ${ccn} not found`);
        }

        // Step 2: Load just that state's data (~1-5MB)
        const state = await loadStateData(stateCode);

        if (cancelled) return;

        const fac = state.facilities?.find(f => f.ccn === ccn) || null;
        setFacility(fac);
        setStateData(state);
        setAllStateFacilities(state.facilities || []);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading facility:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (ccn) load();
    return () => { cancelled = true; };
  }, [ccn]);

  return { facility, stateData, allStateFacilities, loading, error };
}


// ═══════════════════════════════════════════════════════════
// Hook 3: useStateData — load a single state for state pages
// ═══════════════════════════════════════════════════════════
export function useStateData(stateCode) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await loadStateData(stateCode);
        if (!cancelled) {
          setStateData(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`Error loading state ${stateCode}:`, err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (stateCode) load();
    return () => { cancelled = true; };
  }, [stateCode]);

  return { stateData, loading, error };
}
