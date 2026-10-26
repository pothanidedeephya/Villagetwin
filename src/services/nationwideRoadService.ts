/**
 * Nationwide Road Network Service for Bharat Village Twin
 *
 * Implements reliable, viewport-driven road data queries across every Indian state and union territory.
 *
 * Architectural Features:
 * 1. Viewport-driven loading: Fetches roads for visible map bounds, independent of selected location.
 * 2. Spatial grid caching (0.05° tiles) to prevent redundant queries during panning.
 * 3. Feature deduplication by canonical ID across adjacent query viewports.
 * 4. Request throttling and AbortController cancellation for smooth camera interaction.
 * 5. Zoom-dependent filtering (Highways at low zoom; local & rural roads at high zoom).
 * 6. Explicit separation of physical road vectors from vetted emergency evacuation corridors.
 */

import type { FeatureCollection, LineString } from 'geojson';
import type { RoadProperties } from '../types/village';
import { BENCHMARK_ROAD_NETWORKS } from '../data/benchmarkRoads';
import { performanceTracker } from './performanceTracker';

export type HighwayClass =
  | 'national_highway'
  | 'state_highway'
  | 'major_road'
  | 'local_rural'
  | 'track_service';

export interface ViewportBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface NationwideRoadResult {
  roads: FeatureCollection<LineString, RoadProperties>;
  featureCount: number;
  source: string;
  status: 'available' | 'partial' | 'unmapped' | 'error';
  zoom: number;
  retrievedAt: string;
  isFallback?: boolean;
  message?: string;
}

// In-memory spatial cache with bounded capacity and TTL
interface TileCacheEntry {
  features: Array<any>;
  timestamp: number;
}
const MAX_TILE_CACHE_SIZE = 120;
const TILE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const viewportTileCache = new Map<string, TileCacheEntry>();

/**
 * Normalizes, validates and deduplicates raw road features.
 * Filters out invalid geometries, single-point linestrings, and non-finite coordinates.
 */
export function normalizeAndDeduplicateRoads(rawFeatures: Array<any>): Array<any> {
  if (!Array.isArray(rawFeatures)) return [];
  const seenIds = new Set<string>();
  const validFeatures: Array<any> = [];

  for (const f of rawFeatures) {
    if (!f || !f.geometry || !f.properties) continue;
    const geomType = f.geometry.type;
    if (geomType !== 'LineString' && geomType !== 'MultiLineString') continue;

    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) continue;

    // Validate coordinates
    if (geomType === 'LineString') {
      if (coords.length < 2) continue;
      const hasInvalid = coords.some(
        (pt: any) => !Array.isArray(pt) || pt.length < 2 || !isFinite(pt[0]) || !isFinite(pt[1])
      );
      if (hasInvalid) continue;
    } else if (geomType === 'MultiLineString') {
      const hasInvalid = coords.some(
        (line: any) =>
          !Array.isArray(line) ||
          line.length < 2 ||
          line.some((pt: any) => !Array.isArray(pt) || pt.length < 2 || !isFinite(pt[0]) || !isFinite(pt[1]))
      );
      if (hasInvalid) continue;
    }

    const fid = String(
      f.properties.id ||
      f.id ||
      (geomType === 'LineString'
        ? `rd_${coords[0][0].toFixed(5)}_${coords[0][1].toFixed(5)}_${coords[coords.length - 1][0].toFixed(5)}_${coords[coords.length - 1][1].toFixed(5)}`
        : `rd_multi_${validFeatures.length + 1}`)
    );

    if (seenIds.has(fid)) continue;
    seenIds.add(fid);

    const highwayClass = classifyHighway(f.properties.highway || f.properties.highwayTag, f.properties.roadType);

    validFeatures.push({
      ...f,
      id: fid,
      properties: {
        ...f.properties,
        id: fid,
        highwayClass,
        isEvacuationCorridor: Boolean(f.properties.isEvacuationCorridor),
        isCandidateRoute: Boolean(f.properties.isCandidateRoute),
      },
    });
  }

  return validFeatures;
}

/**
 * Rounds coordinate to a 0.05-degree spatial tile index (~5.5 km resolution)
 */
function getTileKey(lng: number, lat: number, zoomTier: number): string {
  const tileX = Math.floor(lng / 0.05);
  const tileY = Math.floor(lat / 0.05);
  return `${tileX}_${tileY}_z${zoomTier}`;
}

/**
 * Determines zoom tier to adjust detail density:
 * - Tier 1 (Zoom < 9): National Highways & Expressways only
 * - Tier 2 (Zoom 9-11): National + State Highways
 * - Tier 3 (Zoom 12-14): Highways + Major District Roads + Connecting Roads
 * - Tier 4 (Zoom >= 15): All roads including village streets, residential, and rural tracks
 */
export function getZoomTier(zoom: number): number {
  if (zoom < 9) return 1;
  if (zoom < 12) return 2;
  if (zoom < 15) return 3;
  return 4;
}

/**
 * Classifies an OSM highway tag or road type into standardized highway classes
 */
export function classifyHighway(highwayTag = '', roadType = ''): HighwayClass {
  const tag = (highwayTag || roadType).toLowerCase();
  if (
    tag.includes('motorway') ||
    tag.includes('trunk') ||
    tag.includes('primary') ||
    tag.includes('national')
  ) {
    return 'national_highway';
  }
  if (tag.includes('secondary') || tag.includes('state')) {
    return 'state_highway';
  }
  if (tag.includes('tertiary') || tag.includes('major district') || tag.includes('arterial')) {
    return 'major_road';
  }
  if (tag.includes('track') || tag.includes('service') || tag.includes('path') || tag.includes('agricultural')) {
    return 'track_service';
  }
  return 'local_rural';
}

/**
 * Padds a bounding box by a given percentage (default 18%)
 * so road vectors do not abruptly truncate at the visible canvas edges.
 */
export function padBounds(bounds: ViewportBounds, paddingFraction = 0.18): ViewportBounds {
  const spanLng = bounds.maxLng - bounds.minLng;
  const spanLat = bounds.maxLat - bounds.minLat;

  const padLng = spanLng * paddingFraction;
  const padLat = spanLat * paddingFraction;

  return {
    minLng: bounds.minLng - padLng,
    minLat: bounds.minLat - padLat,
    maxLng: bounds.maxLng + padLng,
    maxLat: bounds.maxLat + padLat,
  };
}

/**
 * Queries the backend road API for the visible map viewport.
 * Falls back gracefully to benchmark network extracts or curated road models if offline.
 */
export async function fetchRoadsForViewport(
  bounds: ViewportBounds,
  zoom: number,
  signal?: AbortSignal
): Promise<NationwideRoadResult> {
  // Validate input bounds
  if (
    !bounds ||
    !isFinite(bounds.minLng) ||
    !isFinite(bounds.minLat) ||
    !isFinite(bounds.maxLng) ||
    !isFinite(bounds.maxLat) ||
    bounds.minLng >= bounds.maxLng ||
    bounds.minLat >= bounds.maxLat
  ) {
    return {
      roads: { type: 'FeatureCollection', features: [] },
      featureCount: 0,
      source: 'Invalid Viewport',
      status: 'error',
      zoom,
      retrievedAt: new Date().toISOString(),
      message: 'Invalid viewport bounding box parameters provided.',
    };
  }

  const padded = padBounds(bounds, 0.15);
  const zoomTier = getZoomTier(zoom);

  // Check if tile is cached and valid
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const tileKey = getTileKey(centerLng, centerLat, zoomTier);

  const cached = viewportTileCache.get(tileKey);
  if (cached && Date.now() - cached.timestamp < TILE_CACHE_TTL_MS) {
    performanceTracker.recordCacheHit('road_tiles', tileKey);
    return {
      roads: {
        type: 'FeatureCollection',
        features: cached.features,
      },
      featureCount: cached.features.length,
      source: 'OpenStreetMap Cache',
      status: cached.features.length > 0 ? 'available' : 'unmapped',
      zoom,
      retrievedAt: new Date().toISOString(),
    };
  }

  performanceTracker.recordCacheMiss('road_tiles', tileKey);

  const setTileInCache = (features: Array<any>) => {
    if (viewportTileCache.size >= MAX_TILE_CACHE_SIZE) {
      const oldestKey = viewportTileCache.keys().next().value;
      if (oldestKey) viewportTileCache.delete(oldestKey);
    }
    viewportTileCache.set(tileKey, { features, timestamp: Date.now() });
  };

  try {
    const queryParams = new URLSearchParams({
      minLng: padded.minLng.toFixed(4),
      minLat: padded.minLat.toFixed(4),
      maxLng: padded.maxLng.toFixed(4),
      maxLat: padded.maxLat.toFixed(4),
      zoom: String(Math.round(zoom)),
    });

    const res = await fetch(`/api/geo/roads-in-bounds?${queryParams.toString()}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const rawFeatures: Array<any> = data.features || [];
      const validFeatures = normalizeAndDeduplicateRoads(rawFeatures);

      setTileInCache(validFeatures);

      return {
        roads: {
          type: 'FeatureCollection',
          features: validFeatures,
        },
        featureCount: validFeatures.length,
        source: data.metadata?.provider || 'OpenStreetMap High-Resolution Vectors',
        status: validFeatures.length > 0 ? 'available' : 'unmapped',
        zoom,
        retrievedAt: new Date().toISOString(),
        isFallback: Boolean(data.metadata?.isFallback),
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    console.warn('[NationwideRoads] Backend bounds query failed, checking benchmark and client catalog:', err.message);
  }

  // Fallback: Check benchmark road catalogs for matching features in bounds
  const fallbackFeatures: Array<any> = [];

  Object.values(BENCHMARK_ROAD_NETWORKS).forEach((fc) => {
    fc.features.forEach((f) => {
      const coords = f.geometry.coordinates;
      if (coords && coords.length >= 2) {
        // Simple bounding box intersection
        const intersects = coords.some(
          ([rLng, rLat]) =>
            rLng >= padded.minLng &&
            rLng <= padded.maxLng &&
            rLat >= padded.minLat &&
            rLat <= padded.maxLat
        );
        if (intersects) {
          fallbackFeatures.push({
            ...f,
            properties: {
              ...f.properties,
              isEvacuationCorridor: false, // Ensure base roads are not marked as evacuation corridors
            },
          });
        }
      }
    });
  });

  const normalizedFallback = normalizeAndDeduplicateRoads(fallbackFeatures);
  setTileInCache(normalizedFallback);

  return {
    roads: {
      type: 'FeatureCollection',
      features: normalizedFallback,
    },
    featureCount: normalizedFallback.length,
    source: normalizedFallback.length > 0 ? 'Verified Indian Roadway Catalog' : 'OpenStreetMap (No vectors in viewport)',
    status: normalizedFallback.length > 0 ? 'available' : 'unmapped',
    zoom,
    retrievedAt: new Date().toISOString(),
    isFallback: true,
  };
}

/**
 * Clears the viewport road tile cache (used during testing or force-refresh)
 */
export function clearRoadViewportCache(): void {
  viewportTileCache.clear();
}

performanceTracker.registerCacheProvider({
  name: 'road_tiles_cache',
  displayName: 'Road Network Viewport Tile Cache',
  type: 'road_tiles',
  getEntryCount: () => viewportTileCache.size,
  clear: () => clearRoadViewportCache(),
});

