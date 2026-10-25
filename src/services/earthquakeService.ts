import type { EarthquakeEvent, EarthquakeFeedResponse, EarthquakeFilterParams } from '../types/earthquake';

export async function fetchLiveEarthquakes(params: {
  timeRange?: 'day' | 'week' | 'month';
  minMag?: number;
  lat?: number;
  lng?: number;
  maxDistanceKm?: number;
  searchQuery?: string;
  sortBy?: 'recent' | 'magnitude' | 'distance';
  limit?: number;
}): Promise<EarthquakeFeedResponse> {
  const q = new URLSearchParams();
  if (params.timeRange) q.set('timeRange', params.timeRange);
  if (params.minMag !== undefined && params.minMag > 0) q.set('minMag', params.minMag.toString());
  if (params.lat !== undefined && !isNaN(params.lat)) q.set('lat', params.lat.toString());
  if (params.lng !== undefined && !isNaN(params.lng)) q.set('lng', params.lng.toString());
  if (params.maxDistanceKm !== undefined && params.maxDistanceKm > 0) {
    q.set('maxDistanceKm', params.maxDistanceKm.toString());
  }
  if (params.searchQuery) q.set('q', params.searchQuery.trim());
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.limit) q.set('limit', params.limit.toString());

  const res = await fetch(`/api/earthquakes?${q.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch earthquake feed`);
  }
  return await res.json();
}

export async function syncEarthquakesToDatabase(events: EarthquakeEvent[]): Promise<{
  success: boolean;
  imported: number;
  duplicatesSkipped: number;
  message: string;
}> {
  const res = await fetch('/api/earthquakes/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to sync earthquakes to database');
  }
  return await res.json();
}

/**
 * Return magnitude styling config (color, label, badge)
 */
export function getMagnitudeStyle(mag: number): {
  badgeBg: string;
  textColor: string;
  borderColor: string;
  hexColor: string;
  intensityLabel: string;
} {
  if (mag >= 7.0) {
    return {
      badgeBg: 'bg-purple-100',
      textColor: 'text-purple-800',
      borderColor: 'border-purple-300',
      hexColor: '#7e22ce',
      intensityLabel: 'Major / Catastrophic',
    };
  }
  if (mag >= 6.0) {
    return {
      badgeBg: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      hexColor: '#dc2626',
      intensityLabel: 'Strong',
    };
  }
  if (mag >= 4.5) {
    return {
      badgeBg: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300',
      hexColor: '#ea580c',
      intensityLabel: 'Moderate',
    };
  }
  if (mag >= 3.0) {
    return {
      badgeBg: 'bg-amber-100',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-300',
      hexColor: '#d97706',
      intensityLabel: 'Minor',
    };
  }
  return {
    badgeBg: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-300',
    hexColor: '#059669',
    intensityLabel: 'Micro / Light',
  };
}

/**
 * Format relative time (e.g. "14m ago", "3h ago", "2d ago")
 */
export function formatRelativeTime(timeMs: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timeMs) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
