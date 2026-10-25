/**
 * Real-time Earthquake Event Type Definitions
 * Source: USGS Earthquake Hazards Program (https://earthquake.usgs.gov)
 */

export interface EarthquakeEvent {
  id: string; // e.g. "us6000u3j1"
  mag: number;
  place: string;
  time: number; // epoch milliseconds
  eventTimeIso: string;
  updatedTime: number;
  url: string;
  detailUrl?: string;
  depthKm: number;
  longitude: number;
  latitude: number;
  coordinates: [number, number, number]; // [lng, lat, depth]
  felt?: number | null;
  cdi?: number | null;
  mmi?: number | null;
  alert?: string | null;
  status: string;
  tsunami: number;
  sig: number;
  magType: string;
  title: string;
  distanceKm?: number | null;
  source: string;
}

export interface EarthquakeFeedResponse {
  success: boolean;
  feedTitle: string;
  count: number;
  totalInFeed?: number;
  lastUpdated: string;
  source: string;
  sourceUrl: string;
  timeRange: 'day' | 'week' | 'month';
  minMag?: number;
  selectedVillageCoords?: [number, number] | null;
  events: EarthquakeEvent[];
  error?: string;
}

export interface EarthquakeFilterParams {
  timeRange?: 'day' | 'week' | 'month';
  minMag?: number;
  maxDistanceKm?: number;
  searchQuery?: string;
  sortBy?: 'recent' | 'magnitude' | 'distance';
}
