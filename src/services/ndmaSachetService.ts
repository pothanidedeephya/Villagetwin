import https from 'https';
import type { LocationSearchResult } from '../types/nationwide';
import { translateIndicAlertTextToEnglish } from './alertTranslationService';

export interface RawNdmaSachetAlert {
  identifier: number | string;
  severity: string; // 'ALERT' | 'WARNING' | 'WATCH' | 'ADVISORY'
  severity_level?: string; // 'Likely' | 'Observed'
  severity_color?: string; // 'orange' | 'yellow' | 'red' | 'green'
  disaster_type: string; // 'Lightning' | 'Flood' | 'Cyclone' | 'Heavy Rain' | 'Thunderstorm'
  area_description: string;
  warning_message: string;
  effective_start_time: string; // e.g. "Wed Oct 21 23:20:00 IST 2026"
  effective_end_time: string; // e.g. "Thu Oct 22 01:20:00 IST 2026"
  disseminated?: string;
  alert_id_sdma_autoinc?: number;
  centroid?: string; // "lon,lat" e.g. "79.6658,14.9842"
  alert_source: string; // e.g. "Andhra Pradesh SDMA", "IMD", "CWC"
  area_covered?: string; // in km² e.g. "1004.24"
  sender_org_id?: string;
  actual_lang?: string;
  type?: number;
}

export interface ParsedNdmaSachetAlert {
  id: string;
  identifier: string;
  disasterType: string;
  severity: 'ALERT' | 'WARNING' | 'WATCH' | 'ADVISORY';
  severityLevel: string;
  severityColor: 'red' | 'orange' | 'yellow' | 'green';
  effectiveStartIso: string;
  effectiveEndIso: string;
  isExpired: boolean;
  issuingAuthority: string;
  areaDescription: string;
  warningMessage: string;
  originalWarningMessage?: string;
  originalAreaDescription?: string;
  isTranslated?: boolean;
  language: string;
  centroid: [number, number] | null; // [lng, lat]
  areaCoveredKm2: number;
  distanceToVillageKm?: number;
  isApplicableToLocation: boolean;
  sourceUrl: string;
  sourceAgency: string;
  retrievedAt: string;
}

export interface NdmaSachetFeedResponse {
  connectionStatus: 'CONNECTED' | 'EMPTY' | 'ERROR';
  endpointUrl: string;
  retrievedAt: string;
  totalNationalAlerts: number;
  activeNationalAlertsCount: number;
  expiredAlertsCount: number;
  locationAlertsCount: number;
  alertsForSelectedLocation: ParsedNdmaSachetAlert[];
  allActiveNationalAlerts: ParsedNdmaSachetAlert[];
  errorMessage?: string;
  authNotice: string;
}

// In-memory cache for SACHET alerts (5 minutes TTL)
let sachetCache: { timestamp: number; alerts: ParsedNdmaSachetAlert[] } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Calculates Great-Circle distance in km between two coordinate pairs
 */
function calculateDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Parses Indian Standard Time format from SACHET
 * e.g. "Wed Oct 21 23:20:00 IST 2026"
 */
function parseIndianStandardTime(dateStr: string): Date {
  if (!dateStr) return new Date();
  try {
    // Replace IST with +0530 for standard JS ISO parsing
    const normalized = dateStr.replace(/\bIST\b/, '+0530');
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;
  } catch (_e) {
    // fallback
  }
  return new Date();
}

/**
 * Normalizes raw NDMA SACHET alert record
 */
export function normalizeSachetAlert(raw: RawNdmaSachetAlert): ParsedNdmaSachetAlert {
  const now = Date.now();
  const startDate = parseIndianStandardTime(raw.effective_start_time);
  const endDate = parseIndianStandardTime(raw.effective_end_time);
  const isExpired = endDate.getTime() < now;

  let centroidCoords: [number, number] | null = null;
  if (raw.centroid && typeof raw.centroid === 'string' && raw.centroid.includes(',')) {
    const parts = raw.centroid.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      // In SACHET, centroid is "lon,lat"
      centroidCoords = [parts[0], parts[1]];
    }
  }

  const sevUpper = (raw.severity || 'ALERT').toUpperCase();
  const severity: 'ALERT' | 'WARNING' | 'WATCH' | 'ADVISORY' =
    sevUpper === 'WARNING'
      ? 'WARNING'
      : sevUpper === 'WATCH'
      ? 'WATCH'
      : sevUpper === 'ADVISORY'
      ? 'ADVISORY'
      : 'ALERT';

  const sevColor: 'red' | 'orange' | 'yellow' | 'green' =
    raw.severity_color === 'red'
      ? 'red'
      : raw.severity_color === 'yellow'
      ? 'yellow'
      : raw.severity_color === 'green'
      ? 'green'
      : 'orange';

  // Translate Telugu, Hindi or other Indic text to clear English
  const transMsg = translateIndicAlertTextToEnglish(raw.warning_message, raw.disaster_type);
  const transArea = translateIndicAlertTextToEnglish(raw.area_description);

  return {
    id: `sachet-${raw.identifier || raw.alert_id_sdma_autoinc || Math.random().toString(36).slice(2)}`,
    identifier: String(raw.identifier || ''),
    disasterType: raw.disaster_type || 'Multi-Hazard Alert',
    severity,
    severityLevel: raw.severity_level || 'Likely',
    severityColor: sevColor,
    effectiveStartIso: startDate.toISOString(),
    effectiveEndIso: endDate.toISOString(),
    isExpired,
    issuingAuthority: raw.alert_source || 'State Disaster Management Authority (SDMA)',
    areaDescription: transArea.translatedText || raw.area_description || 'Regional Zone',
    warningMessage: transMsg.translatedText || raw.warning_message || 'Official CAP alert issued by NDMA SACHET network.',
    originalWarningMessage: transMsg.originalText,
    originalAreaDescription: transArea.originalText,
    isTranslated: transMsg.isTranslated || transArea.isTranslated,
    language: raw.actual_lang || 'en',
    centroid: centroidCoords,
    areaCoveredKm2: parseFloat(raw.area_covered || '0') || 0,
    isApplicableToLocation: false,
    sourceUrl: 'https://sachet.ndma.gov.in/',
    sourceAgency: 'National Disaster Management Authority (NDMA) - SACHET Common Alerting Protocol',
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Fetches real active official disaster alerts from NDMA SACHET
 */
export async function fetchAllNdmaSachetAlerts(): Promise<ParsedNdmaSachetAlert[]> {
  if (sachetCache && Date.now() - sachetCache.timestamp < CACHE_TTL_MS) {
    return sachetCache.alerts;
  }

  const endpointUrl = 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails';

  return new Promise((resolve) => {
    const req = https.request(
      endpointUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BharatVillageTwin-DisasterPlatform/1.0',
        },
        timeout: 9000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          try {
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            if (res.statusCode !== 200) {
              console.warn(`[NDMA SACHET] Server returned HTTP ${res.statusCode}`);
              resolve(sachetCache ? sachetCache.alerts : []);
              return;
            }

            const rawAlerts: RawNdmaSachetAlert[] = JSON.parse(rawBody);
            if (!Array.isArray(rawAlerts)) {
              resolve([]);
              return;
            }

            // Deduplicate by identifier
            const seen = new Set<string>();
            const parsedList: ParsedNdmaSachetAlert[] = [];

            for (const r of rawAlerts) {
              const id = String(r.identifier || r.alert_id_sdma_autoinc || '');
              if (!id || seen.has(id)) continue;
              seen.add(id);
              parsedList.push(normalizeSachetAlert(r));
            }

            sachetCache = { timestamp: Date.now(), alerts: parsedList };
            resolve(parsedList);
          } catch (err: any) {
            console.warn('[NDMA SACHET] Error parsing JSON response:', err.message);
            resolve(sachetCache ? sachetCache.alerts : []);
          }
        });
      }
    );

    req.on('error', (err) => {
      console.warn('[NDMA SACHET] Request error:', err.message);
      resolve(sachetCache ? sachetCache.alerts : []);
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[NDMA SACHET] Request timed out (9s)');
      resolve(sachetCache ? sachetCache.alerts : []);
    });

    req.end();
  });
}

/**
 * Retrieves alerts from NDMA SACHET and matches them specifically to the selected village
 * using geographic radius (centroid distance) and administrative text targeting.
 */
export async function getSachetAlertsForLocation(
  location: LocationSearchResult,
  maxDistanceKm: number = 75
): Promise<NdmaSachetFeedResponse> {
  const endpointUrl = 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails';
  const retrievedAt = new Date().toISOString();

  try {
    const allAlerts = await fetchAllNdmaSachetAlerts();

    const activeAlerts = allAlerts.filter((a) => !a.isExpired);
    const expiredCount = allAlerts.length - activeAlerts.length;

    const [vLng, vLat] = location.center;
    const villageCoords: [number, number] = [vLng, vLat];
    const districtUpper = (location.district || '').toUpperCase().trim();
    const stateUpper = (location.state || '').toUpperCase().trim();

    const matchingAlerts: ParsedNdmaSachetAlert[] = [];

    for (const alert of activeAlerts) {
      let isMatch = false;
      let distKm: number | undefined = undefined;

      // 1. Coordinate distance check if alert has a valid centroid
      if (alert.centroid) {
        distKm = calculateDistanceKm(villageCoords, alert.centroid);
        if (distKm <= maxDistanceKm) {
          isMatch = true;
        }
      }

      // 2. Administrative text match in area description or authority
      const areaUpper = alert.areaDescription.toUpperCase();
      const authUpper = alert.issuingAuthority.toUpperCase();
      if (
        (districtUpper.length > 2 && areaUpper.includes(districtUpper)) ||
        (stateUpper.length > 2 && (areaUpper.includes(stateUpper) || authUpper.includes(stateUpper)))
      ) {
        // District/State explicitly cited
        if (distKm === undefined || distKm <= maxDistanceKm * 2) {
          isMatch = true;
        }
      }

      if (isMatch) {
        matchingAlerts.push({
          ...alert,
          distanceToVillageKm: distKm,
          isApplicableToLocation: true,
        });
      }
    }

    // Sort matching alerts: closest distance first, then non-expired
    matchingAlerts.sort((a, b) => (a.distanceToVillageKm || 999) - (b.distanceToVillageKm || 999));

    return {
      connectionStatus: allAlerts.length > 0 ? 'CONNECTED' : 'EMPTY',
      endpointUrl,
      retrievedAt,
      totalNationalAlerts: allAlerts.length,
      activeNationalAlertsCount: activeAlerts.length,
      expiredAlertsCount: expiredCount,
      locationAlertsCount: matchingAlerts.length,
      alertsForSelectedLocation: matchingAlerts,
      allActiveNationalAlerts: activeAlerts,
      authNotice:
        'Live Public CAP (Common Alerting Protocol) Interface from NDMA SACHET (https://sachet.ndma.gov.in/)',
    };
  } catch (err: any) {
    return {
      connectionStatus: 'ERROR',
      endpointUrl,
      retrievedAt,
      totalNationalAlerts: 0,
      activeNationalAlertsCount: 0,
      expiredAlertsCount: 0,
      locationAlertsCount: 0,
      alertsForSelectedLocation: [],
      allActiveNationalAlerts: [],
      errorMessage: err.message,
      authNotice: 'Failed to connect to NDMA SACHET public API.',
    };
  }
}

