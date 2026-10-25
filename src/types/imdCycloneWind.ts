import type { MultiPolygon, Feature, FeatureCollection } from 'geojson';
import type { LocationSearchResult } from './nationwide';

export type CycloneWindThreshold = '27kt' | '34kt' | '50kt' | '64kt';

export interface CycloneWindThresholdMeta {
  threshold: CycloneWindThreshold;
  knots: number;
  kmh: number;
  categoryLabel: string;
  beaufortScale: string;
  color: string;
  strokeColor: string;
  fillOpacity: number;
  dashArray?: string;
  description: string;
  recommendedAction: string;
}

export const CYCLONE_WIND_THRESHOLDS: Record<CycloneWindThreshold, CycloneWindThresholdMeta> = {
  '27kt': {
    threshold: '27kt',
    knots: 27,
    kmh: 50,
    categoryLabel: 'Depression / Squally Wind Watch (Pre-Cyclone)',
    beaufortScale: 'Force 7 (Near Gale)',
    color: '#fbbf24', // Amber
    strokeColor: '#d97706',
    fillOpacity: 0.22,
    dashArray: '4, 4',
    description: 'Squally surface winds 45-55 km/h. Per official IMD criteria, this represents Depression / Deep Depression precursor winds. It does NOT indicate that a named Cyclonic Storm has formed (which requires ≥ 34 kt / 62 km/h).',
    recommendedAction: 'Secure loose tin roofing, small fishing crafts, and agricultural tarpaulins. Fishermen advised not to venture out.',
  },
  '34kt': {
    threshold: '34kt',
    knots: 34,
    kmh: 63,
    categoryLabel: 'Cyclonic Storm (CS) / Gale-Force Threshold',
    beaufortScale: 'Force 8 (Gale)',
    color: '#f97316', // Orange
    strokeColor: '#ea580c',
    fillOpacity: 0.32,
    description: 'Gale wind threshold 60-70 km/h. Official IMD threshold for naming and declaring a Cyclonic Storm (CS). Snapping of small tree branches; unpaved roads and temporary structures vulnerable.',
    recommendedAction: 'Restrict outdoor activities. Coastal evacuation of thatched dwellings initiated.',
  },
  '50kt': {
    threshold: '50kt',
    knots: 50,
    kmh: 93,
    categoryLabel: 'Severe Cyclonic Storm (SCS) / Storm-Force',
    beaufortScale: 'Force 10 (Storm)',
    color: '#dc2626', // Red
    strokeColor: '#b91c1c',
    fillOpacity: 0.42,
    description: 'Destructive storm-force winds 85-100 km/h within a Severe Cyclonic Storm (SCS). Medium tree uprooting, overhead communication and powerline disruptions.',
    recommendedAction: 'Mandatory relocation of low-lying inhabitants to cyclone shelters. Power supply pre-emptively shut off.',
  },
  '64kt': {
    threshold: '64kt',
    knots: 64,
    kmh: 118,
    categoryLabel: 'Very Severe Cyclonic Storm (VSCS) / Hurricane-Force',
    beaufortScale: 'Force 12 (Hurricane Force)',
    color: '#7f1d1d', // Dark Red / Maroon
    strokeColor: '#450a0a',
    fillOpacity: 0.55,
    description: 'Extremely destructive hurricane-force winds ≥ 118 km/h within a Very Severe Cyclonic Storm (VSCS). Structural damage to pucca buildings, extensive tree uprooting.',
    recommendedAction: 'Total lockdown in cyclone shelters. Full DDMA disaster response teams in reinforced positions.',
  },
};

/**
 * Raw response structure returned by official IMD API:
 * https://api.imd.gov.in/api/v1/cyclone_wind
 */
export interface RawImdCycloneWindApiResponse {
  status: boolean;
  message: string;
  totalCount: {
    '27kt'?: number;
    '34kt'?: number;
    '50kt'?: number;
    '64kt'?: number;
  };
  data: {
    '27kt'?: {
      type: 'MultiPolygon';
      coordinates: number[][][][];
    };
    '34kt'?: {
      type: 'MultiPolygon';
      coordinates: number[][][][];
    };
    '50kt'?: {
      type: 'MultiPolygon';
      coordinates: number[][][][];
    };
    '64kt'?: {
      type: 'MultiPolygon';
      coordinates: number[][][][];
    };
  };
}

export type ImdConnectionStatus =
  | 'CONNECTED_ACTIVE'
  | 'CONNECTED_NO_ACTIVE_WARNING'
  | 'AUTHENTICATION_REQUIRED'
  | 'API_ERROR'
  | 'BENCHMARK_SCENARIO'
  | 'STALE_WARNING';

export interface ValidatedWindThresholdPolygon {
  threshold: CycloneWindThreshold;
  meta: CycloneWindThresholdMeta;
  geometry: MultiPolygon;
  totalAreaKm2: number;
  polygonCount: number;
  boundingBox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export interface ParsedImdCycloneWindData {
  connectionStatus: ImdConnectionStatus;
  endpointUrl: string;
  hasApiKey: boolean;
  httpStatus: number;
  message: string;
  authNotice: string;
  retrievedAt: string;
  warningIssueTime?: string;
  warningValidUntil?: string;
  cycloneName?: string;
  activeThresholds: CycloneWindThreshold[];
  polygons: Record<CycloneWindThreshold, ValidatedWindThresholdPolygon | null>;
  geoJsonFeatureCollection: FeatureCollection;
}

export interface ThresholdLocationAssessment {
  threshold: CycloneWindThreshold;
  knots: number;
  kmh: number;
  label: string;
  villageCenterInside: boolean;
  villageCenterStatus: 'INSIDE_CORRIDOR' | 'OUTSIDE_RADII';
  boundaryIntersects: boolean;
  boundaryStatus: 'INTERSECTS' | 'CLEAR';
  boundaryOverlapAreaKm2: number;
  boundaryOverlapRatioPercent: number;
  intersectingRoadSegmentsCount: number;
  intersectingRoadLengthKm: number;
  intersectingBuildingsCount: number;
  roadsDataAvailable: boolean;
  buildingsDataAvailable: boolean;
  exposureSummary: string;
}

export interface VillageCycloneWindAssessment {
  locationId: string;
  locationName: string;
  villageCenterCoordinates: [number, number];
  hasBoundaryPolygon: boolean;
  totalVillageAreaKm2: number;
  villageIntersectsAny: boolean;
  highestExposedThreshold: CycloneWindThreshold | 'none';
  highestExposedSpeedKmh: number;
  centerStatus: 'INSIDE_CORRIDOR' | 'OUTSIDE_RADII';
  boundaryStatus: 'INTERSECTS' | 'CLEAR';
  uniqueExposedRoadSegmentsCount: number;
  uniqueExposedRoadLengthKm: number;
  uniqueExposedBuildingsCount: number;
  roadsDataStatus: 'AVAILABLE' | 'DATA_UNAVAILABLE';
  buildingsDataStatus: 'AVAILABLE' | 'DATA_UNAVAILABLE';
  totalVillageRoadsCount: number;
  totalVillageBuildingsCount: number;
  isBenchmarkMode: boolean;
  benchmarkNotice?: string;
  thresholdAssessments: ThresholdLocationAssessment[];
  assessedAt: string;
  sourceAttribution: string;
  officialNuanceDisclaimer: string;
}

export interface ImdCycloneTrackPoint {
  id: string;
  cycloneName: string;
  basin: string;
  dateTime: string;
  coordinates: [number, number]; // [lng, lat]
  stage: string;
  intensityCategory: string;
  maxSustainedWindKnots: number;
  maxSustainedWindKmh: number;
  estimatedCentralPressureHpa: number;
  pointType: 'OBSERVED' | 'FORECAST';
  distanceToVillageKm?: number;
}

export interface ParsedImdCycloneTrackData {
  connectionStatus: ImdConnectionStatus;
  endpointUrl: string;
  hasApiKey: boolean;
  httpStatus: number;
  message: string;
  authNotice: string;
  retrievedAt: string;
  cycloneName: string;
  activeStatus: string;
  bulletinTime?: string;
  observedPoints: ImdCycloneTrackPoint[];
  forecastPoints: ImdCycloneTrackPoint[];
  nearestPointToLocation?: ImdCycloneTrackPoint | null;
  minDistanceToLocationKm?: number;
  geoJsonTrack: FeatureCollection;
}


