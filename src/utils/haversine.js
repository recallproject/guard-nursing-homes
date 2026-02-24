/**
 * Haversine Distance Calculator
 * Computes the great-circle distance between two points on Earth
 * Returns distance in miles
 */

const EARTH_RADIUS_MILES = 3959;

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} - Distance in miles
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  // Convert degrees to radians
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));

  return EARTH_RADIUS_MILES * c;
}
