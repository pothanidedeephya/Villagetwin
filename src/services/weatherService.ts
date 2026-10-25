import type { WeatherData } from '../types/weather';
import {
  buildOpenMeteoForecastUrl,
  parseOpenMeteoResponse,
} from './rainfallDataService';

/**
 * Weather Service: Retrieves real-time meteorological conditions and forecasts
 * for the currently active village coordinates via the secure backend proxy endpoint.
 */
export async function fetchVillageWeather(
  lat: number,
  lng: number,
  villageName: string,
  forceRefresh = false
): Promise<WeatherData> {
  try {
    const refreshQuery = forceRefresh ? '&refresh=true' : '';
    const url = `/api/weather?lat=${lat}&lng=${lng}&name=${encodeURIComponent(villageName)}${refreshQuery}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errJson.error || `Weather API returned HTTP ${res.status}`);
    }
    const data: WeatherData = await res.json();
    return data;
  } catch (err: any) {
    // If backend proxy is unreachable, fallback to direct client-side open-meteo
    console.warn('Backend /api/weather call failed, falling back to direct open meteorological fetch:', err);
    return await fetchDirectOpenMeteo(lat, lng, villageName);
  }
}

/**
 * Direct client fallback if the Express proxy route is momentarily unreachable
 */
async function fetchDirectOpenMeteo(
  lat: number,
  lng: number,
  villageName: string
): Promise<WeatherData> {
  const url = buildOpenMeteoForecastUrl(lat, lng, { pastHours: 24, forecastHours: 24 });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Direct meteorological query returned HTTP ${res.status}`);
  }
  const data = await res.json();
  const parsed = parseOpenMeteoResponse(data, villageName, lat, lng);
  parsed.notice = 'Operating in open-access meteorological model mode (ECMWF IFS & GFS via client fallback).';
  return parsed;
}
