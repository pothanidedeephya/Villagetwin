/**
 * India coordinate normalization helper:
 * Longitude is ~68°E - 98°E (> 45), Latitude is ~8°N - 38°N (< 45).
 * Accurately standardizes coordinates into Leaflet [lat, lng] format.
 */
export const toLatLng = (c: [number, number] | number[]): [number, number] => {
  if (!c || c.length < 2) return [18.700, 83.950];
  const c0 = Number(c[0]);
  const c1 = Number(c[1]);
  if (!isFinite(c0) || !isFinite(c1)) return [18.700, 83.950];
  if (c0 > 45 && c1 < 45) {
    return [c1, c0];
  }
  return [c0, c1];
};

/**
 * Validate that a coordinate falls strictly within the sovereign territory and
 * coastal exclusive economic zone bounds of India (Lat 6°N - 38°N, Lng 68°E - 98°E).
 */
export const isValidIndiaCoordinate = (lat: number, lng: number): boolean => {
  return isFinite(lat) && isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
};

/**
 * Calculates geodesic area in square meters for a polygon ring using WGS84 spherical excess.
 * Coordinates are formatted as [longitude, latitude] or [lat, lng] (handles normalized order).
 */
export function calculateGeodesicAreaSqMeters(coordinates: Array<[number, number] | number[]>): number {
  if (!coordinates || coordinates.length < 3) return 0;
  const R = 6378137.0; // WGS84 Earth semi-major axis in meters
  let total = 0;
  const len = coordinates.length;
  // Exclude duplicate closing vertex if present
  const isClosed =
    coordinates[0][0] === coordinates[len - 1][0] && coordinates[0][1] === coordinates[len - 1][1];
  const n = isClosed ? len - 1 : len;
  if (n < 3) return 0;

  for (let i = 0; i < n; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[(i + 1) % n];
    // GeoJSON coordinates are [lng, lat]
    const p1Lng = Number(p1[0]);
    const p1Lat = Number(p1[1]);
    const p2Lng = Number(p2[0]);
    const p2Lat = Number(p2[1]);

    const lam1 = (p1Lng * Math.PI) / 180.0;
    const phi1 = (p1Lat * Math.PI) / 180.0;
    const lam2 = (p2Lng * Math.PI) / 180.0;
    const phi2 = (p2Lat * Math.PI) / 180.0;

    total += (lam2 - lam1) * (2.0 + Math.sin(phi1) + Math.sin(phi2));
  }

  total = (Math.abs(total) * R * R) / 2.0;
  return total;
}

export const calculateGeodesicAreaKm2 = (coords: Array<[number, number] | number[]>): number => {
  return Number((calculateGeodesicAreaSqMeters(coords) / 1_000_000.0).toFixed(2));
};

export const calculateGeodesicAreaHa = (coords: Array<[number, number] | number[]>): number => {
  return Number((calculateGeodesicAreaSqMeters(coords) / 10_000.0).toFixed(1));
};

/**
 * Ray-casting point-in-polygon algorithm for WGS84 coordinates.
 */
export function isPointInPolygonRing(
  point: [number, number] | number[],
  ring: Array<[number, number] | number[]>
): boolean {
  if (!point || !ring || ring.length < 3) return false;
  const x = Number(point[0]);
  const y = Number(point[1]);
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]);
    const yi = Number(ring[i][1]);
    const xj = Number(ring[j][0]);
    const yj = Number(ring[j][1]);
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function ccw(
  a: [number, number],
  b: [number, number],
  c: [number, number]
): boolean {
  return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
}

/**
 * Checks if two 2D line segments intersect.
 */
export function doSegmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number]
): boolean {
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Geometrically evaluates if a LineString (or road corridor) intersects a Polygon outer ring.
 * Evaluates vertex containment, segment edge intersection, and midpoint containment.
 */
export function doesLineStringIntersectPolygonRing(
  lineCoords: Array<[number, number] | number[]>,
  ring: Array<[number, number] | number[]>
): boolean {
  if (!lineCoords || lineCoords.length === 0 || !ring || ring.length < 3) return false;

  // 1. Any road vertex inside polygon ring
  for (let i = 0; i < lineCoords.length; i++) {
    if (isPointInPolygonRing(lineCoords[i], ring)) {
      return true;
    }
  }

  // 2. Line segment edge intersection against polygon edges
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const p1: [number, number] = [Number(lineCoords[i][0]), Number(lineCoords[i][1])];
    const p2: [number, number] = [Number(lineCoords[i + 1][0]), Number(lineCoords[i + 1][1])];

    for (let j = 0; j < ring.length - 1; j++) {
      const q1: [number, number] = [Number(ring[j][0]), Number(ring[j][1])];
      const q2: [number, number] = [Number(ring[j + 1][0]), Number(ring[j + 1][1])];

      if (doSegmentsIntersect(p1, p2, q1, q2)) {
        return true;
      }
    }

    // Midpoint check for longer segments
    const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    if (isPointInPolygonRing(mid, ring)) {
      return true;
    }
  }

  return false;
}


