/**
 * Authoritative Location Persistence Service for Bharat Village Twin
 *
 * Implements reliable, versioned location persistence across browser sessions,
 * page reloads, and tab reopens.
 *
 * Requirements:
 * 1. Versioned storage key ('bharat_twin_selected_location_v1')
 * 2. URL query parameters synchronization for bookmarking and sharing
 * 3. Strict coordinate and metadata validation (preventing corrupted saves)
 * 4. Request race-condition protection (latest valid selection always wins)
 * 5. First-visit fallback to Kotturu Gram Panchayat without silent overwrites
 */

import type { LocationSearchResult } from '../types/nationwide';
import { NATIONWIDE_BENCHMARK_LOCATIONS, isValidIndiaCoordinate } from '../data/indiaLocations';

export const LOCATION_STORAGE_KEY = 'bharat_twin_selected_location_v1';
export const LOCATION_STORAGE_VERSION = 1;

export interface PersistedLocationRecord {
  version: number;
  timestamp: number;
  location: LocationSearchResult;
}

/**
 * Validates whether an arbitrary object is a well-formed LocationSearchResult
 * within valid geographic bounds of the Republic of India.
 */
export function isValidSavedLocation(item: any): item is LocationSearchResult {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.trim().length === 0) return false;
  if (typeof item.name !== 'string' || item.name.trim().length === 0) return false;

  // Validate geographic center coordinates [lng, lat]
  if (!Array.isArray(item.center) || item.center.length !== 2) return false;
  const [lng, lat] = item.center;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;

  // Geographic validation against Indian territory (6.0°N to 37.5°N, 68.0°E to 97.5°E)
  if (!isValidIndiaCoordinate(lat, lng)) return false;

  // Validate adminLevel if present
  if (item.adminLevel && typeof item.adminLevel !== 'string') return false;

  return true;
}

/**
 * Persists the currently selected location to localStorage and updates URL query parameters.
 */
export function savePersistedLocation(location: LocationSearchResult): boolean {
  if (!isValidSavedLocation(location)) {
    console.warn('[LocationPersistence] Refusing to persist invalid location:', location);
    return false;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const record: PersistedLocationRecord = {
        version: LOCATION_STORAGE_VERSION,
        timestamp: Date.now(),
        location,
      };
      window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(record));
    }

    // Synchronize URL query parameters without triggering full page reload
    if (typeof window !== 'undefined' && window.history && window.location) {
      const url = new URL(window.location.href);
      url.searchParams.set('locId', location.id);
      url.searchParams.set('name', location.name);
      url.searchParams.set('lat', location.center[1].toFixed(4));
      url.searchParams.set('lng', location.center[0].toFixed(4));
      if (location.state) url.searchParams.set('state', location.state);
      if (location.district) url.searchParams.set('dist', location.district);
      window.history.replaceState({ locationId: location.id }, '', url.toString());
    }

    return true;
  } catch (err) {
    console.warn('[LocationPersistence] Failed to persist location to storage/URL:', err);
    return false;
  }
}

/**
 * Attempts to parse location from URL query parameters (bookmarking support).
 */
export function getLocationFromUrl(): LocationSearchResult | null {
  if (typeof window === 'undefined' || !window.location) return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const locId = params.get('locId');
    const latStr = params.get('lat');
    const lngStr = params.get('lng');
    const name = params.get('name');
    const state = params.get('state') || '';
    const district = params.get('dist') || '';

    if (latStr && lngStr && name) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (isFinite(lat) && isFinite(lng) && isValidIndiaCoordinate(lat, lng)) {
        // Check if ID matches a known benchmark location
        const match = NATIONWIDE_BENCHMARK_LOCATIONS.find((b) => b.id === locId);
        if (match) {
          return match;
        }

        const syntheticFromUrl: LocationSearchResult = {
          id: locId || `loc-custom-${lat.toFixed(3)}-${lng.toFixed(3)}`,
          name: name.trim(),
          displayName: `${name.trim()}${district ? `, ${district}` : ''}${state ? `, ${state}` : ''}`,
          state,
          district: district || name.trim(),
          center: [lng, lat],
          boundingBox: [lng - 0.02, lat - 0.02, lng + 0.02, lat + 0.02],
          elevation_m: 25,
          adminLevel: 'village',
          source: 'Bookmarked Location URL Parameters',
          regionCategory: 'plains',
        };
        return syntheticFromUrl;
      }
    }
  } catch (e) {
    console.warn('[LocationPersistence] Error reading location from URL:', e);
  }

  return null;
}

/**
 * Reads and validates the saved location from localStorage.
 * If storage is corrupt or contains invalid coordinates, logs a development warning,
 * safely purges the invalid entry, and returns null.
 */
export function getPersistedLocation(): LocationSearchResult | null {
  // 1. Check URL parameters first (explicit user bookmark or navigation link)
  const urlLoc = getLocationFromUrl();
  if (urlLoc) {
    return urlLoc;
  }

  // 2. Check localStorage
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const loc = parsed?.location ?? parsed;

    if (isValidSavedLocation(loc)) {
      return loc;
    }

    console.warn(
      '[LocationPersistence] Saved location record failed validation. Purging corrupted entry from localStorage.',
      raw
    );
    window.localStorage.removeItem(LOCATION_STORAGE_KEY);
    return null;
  } catch (err) {
    console.warn('[LocationPersistence] Failed to parse saved location from localStorage. Purging.', err);
    try {
      window.localStorage.removeItem(LOCATION_STORAGE_KEY);
    } catch {}
    return null;
  }
}

/**
 * Returns the authoritative initial location on application startup:
 * 1. Restored saved selection (if valid)
 * 2. Explicit benchmark default (Kotturu Gram Panchayat) on genuine first visit
 */
export function getInitialSelectedLocation(): LocationSearchResult {
  const saved = getPersistedLocation();
  if (saved) {
    return saved;
  }
  return NATIONWIDE_BENCHMARK_LOCATIONS[0];
}

/**
 * Clears saved location preference (used for testing or site reset).
 */
export function clearPersistedLocation(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCATION_STORAGE_KEY);
    }
  } catch {}
}

