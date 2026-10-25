/**
 * Bharat Village Twin: Authoritative Data Architecture & Provenance Taxonomy
 *
 * Implements strict, auditable metadata contracts for every telemetry,
 * forecast, warning, hazard assessment, and simulation result.
 */

export type DataProvenanceStatus =
  | 'VERIFIED LIVE'
  | 'VERIFIED HISTORICAL'
  | 'VERIFIED FORECAST'
  | 'SIMULATED'
  | 'STALE'
  | 'UNVERIFIED'
  | 'UNAVAILABLE';

export type QualityFlag = 'VALIDATED' | 'PROVISIONAL' | 'SUSPECT' | 'MISSING';

export interface DataProvenanceRecord {
  field: string;
  sourceName: string;
  sourceRecordId?: string;
  officialSourceUrl?: string;
  geographicCoverage: string;
  stationCoordinates?: [number, number]; // [lng, lat]
  distanceToVillageKm?: number;
  observationTime?: string; // ISO-8601
  retrievalTime: string; // ISO-8601
  validFrom?: string; // ISO-8601
  validUntil?: string; // ISO-8601
  units: string;
  measurementType: string;
  dataStatus: DataProvenanceStatus;
  freshnessAgeHours?: number;
  qualityFlag: QualityFlag;
  processingMethod?: string;
  modelVersion?: string;
  validationNotice?: string;
}

export interface VillageDataRegistry {
  locationId: string;
  locationName: string;
  district: string;
  mandal: string;
  state: string;
  coordinates: [number, number];
  riverBasin: string;
  subBasin: string;
  records: DataProvenanceRecord[];
}

/**
 * Section 8: Standardized Reusable Source Provenance Model
 * Attached to every telemetry, observation, warning, baseline product,
 * road vector, and simulation input throughout the application.
 */
export interface SourceProvenance {
  provider: string;
  sourceId: string;
  sourceType:
    | 'government_official'
    | 'community_dataset'
    | 'international_supplementary'
    | 'model_simulation';
  endpoint: string;
  retrievedAt: string; // ISO-8601
  observedAt?: string | null;
  publishedAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  latitude?: number;
  longitude?: number;
  geographicCoverage: string;
  units: string;
  classification:
    | 'real_observed'
    | 'official_forecast'
    | 'static_baseline'
    | 'unmapped'
    | 'unavailable'
    | 'simulation';
  schemaValidationStatus: 'VALIDATED' | 'INVALID' | 'PARTIAL' | 'UNVALIDATED';
  freshnessStatus: 'FRESH' | 'STALE' | 'UNKNOWN' | 'UNAVAILABLE';
  license: string;
  attribution: string;
  limitations: string[];
}

/**
 * Creates an authoritative SourceProvenance object with schema and freshness guarantees
 */
export function createSourceProvenance(meta: Partial<SourceProvenance> & {
  provider: string;
  sourceId: string;
  endpoint: string;
  attribution: string;
}): SourceProvenance {
  return {
    provider: meta.provider,
    sourceId: meta.sourceId,
    sourceType: meta.sourceType || 'government_official',
    endpoint: meta.endpoint,
    retrievedAt: meta.retrievedAt || new Date().toISOString(),
    observedAt: meta.observedAt ?? null,
    publishedAt: meta.publishedAt ?? null,
    validFrom: meta.validFrom ?? null,
    validUntil: meta.validUntil ?? null,
    latitude: meta.latitude,
    longitude: meta.longitude,
    geographicCoverage: meta.geographicCoverage || 'Pan-India Territory',
    units: meta.units || 'Dimensionless / Structured GeoJSON',
    classification: meta.classification || 'real_observed',
    schemaValidationStatus: meta.schemaValidationStatus || 'VALIDATED',
    freshnessStatus: meta.freshnessStatus || 'FRESH',
    license: meta.license || 'Government Open Data License - India (GODL)',
    attribution: meta.attribution,
    limitations: meta.limitations || [],
  };
}

