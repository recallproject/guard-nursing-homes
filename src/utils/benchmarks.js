/**
 * Benchmarks Utility
 * Computes state and national averages for facility metrics
 */

let cachedBenchmarks = null;

/**
 * Compute state and national averages for all metrics
 * @param {Object} data - The full facility data object with states
 * @returns {Object} - { state: { STATE_CODE: { metric: avg } }, national: { metric: avg } }
 */
export function computeBenchmarks(data) {
  // Return cached result if available
  if (cachedBenchmarks) {
    return cachedBenchmarks;
  }

  if (!data || !data.states) {
    return { state: {}, national: {} };
  }

  const metrics = [
    'total_deficiencies',
    'total_fines',
    'harm_count',
    'jeopardy_count',
    'rn_hprd',
    'lpn_hprd',
    'cna_hprd',
    'total_hprd',
    'zero_rn_pct',
    'stars',
    'composite',
  ];

  const stateAverages = {};
  const nationalTotals = {};
  const nationalCounts = {};

  // Initialize
  metrics.forEach(metric => {
    nationalTotals[metric] = 0;
    nationalCounts[metric] = 0;
  });

  // Compute state averages and accumulate national totals
  for (const [stateCode, stateData] of Object.entries(data.states)) {
    if (!stateData.facilities || stateData.facilities.length === 0) continue;

    const stateTotals = {};
    const stateCounts = {};

    metrics.forEach(metric => {
      stateTotals[metric] = 0;
      stateCounts[metric] = 0;
    });

    // Sum up values for this state
    stateData.facilities.forEach(facility => {
      metrics.forEach(metric => {
        const value = facility[metric];
        if (value !== null && value !== undefined && !isNaN(value)) {
          stateTotals[metric] += value;
          stateCounts[metric] += 1;

          nationalTotals[metric] += value;
          nationalCounts[metric] += 1;
        }
      });
    });

    // Compute state averages
    stateAverages[stateCode] = {};
    metrics.forEach(metric => {
      stateAverages[stateCode][metric] =
        stateCounts[metric] > 0
          ? stateTotals[metric] / stateCounts[metric]
          : null;
    });
  }

  // Compute national averages
  const nationalAverages = {};
  metrics.forEach(metric => {
    nationalAverages[metric] =
      nationalCounts[metric] > 0
        ? nationalTotals[metric] / nationalCounts[metric]
        : null;
  });

  cachedBenchmarks = {
    state: stateAverages,
    national: nationalAverages,
  };

  return cachedBenchmarks;
}

/**
 * Clear the cached benchmarks (useful for testing or data refresh)
 */
export function clearBenchmarksCache() {
  cachedBenchmarks = null;
}
