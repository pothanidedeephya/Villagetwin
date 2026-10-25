import type { FeatureCollection, Polygon, LineString, Point } from 'geojson';
import type { HazardAssessment, HazardType, RiskLevel } from './hazard';
import type { InfrastructureIntervention } from './infrastructure';
import type { BuildingProperties, RoadProperties, WaterBodyProperties } from './village';

export type IndiaAdministrativeLevel =
  | 'country'
  | 'state_ut'
  | 'district'
  | 'taluk_tehsil'
  | 'gram_panchayat'
  | 'village'
  | 'coordinates';

export type CoverageStatus = 'complete' | 'partial' | 'unavailable' | 'demonstration';

export interface LocationSearchResult {
  id: string;
  displayName: string;
  name: string;
  adminLevel: IndiaAdministrativeLevel;
  state: string;
  district: string;
  subdistrict?: string;
  center: [number, number]; // [lng, lat]
  boundingBox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  elevation_m?: number;
  population?: number;
  source: string;
  regionCategory: 'himalayan' | 'coastal' | 'riverine' | 'drought_prone' | 'northeastern' | 'island' | 'plains';
}

export interface LayerCoverageDetail {
  layerName: string;
  status: CoverageStatus;
  featureCount: number;
  source: string;
  retrievedAt: string;
  notes: string;
  geographicCoverage?: string;
  updateFrequency?: string;
  usedInCalculations?: string;
  dataClassification?: 'real_observed' | 'calculated_output' | 'illustrative_baseline' | 'missing';
}

export interface LocationDataCoverageReport {
  locationId: string;
  displayName: string;
  center?: [number, number];
  overallReadiness:
    | 'Verified Geospatial Twin'
    | 'Partial Mapped Twin'
    | 'Boundary & Terrain Only'
    | 'Unmapped Settlement'
    | 'Verified Geospatial Twin (Full Plinth & Vector Survey)'
    | 'Verified Environmental & Hazard Twin (Building Footprints Unmapped)'
    | string;
  layers: {
    boundary: LayerCoverageDetail;
    buildings: LayerCoverageDetail;
    roads: LayerCoverageDetail;
    waterways: LayerCoverageDetail;
    amenities: LayerCoverageDetail;
    elevation: LayerCoverageDetail;
    hazards: LayerCoverageDetail;
    weather?: LayerCoverageDetail;
    earthquakes?: LayerCoverageDetail;
    disasters?: LayerCoverageDetail;
    alerts?: LayerCoverageDetail;
    [key: string]: LayerCoverageDetail | undefined;
  };
  coverageWarnings?: string[];
  lastAuditTimestamp: string;
}

export interface RealLocationGeospatialData {
  location: LocationSearchResult;
  coverage: LocationDataCoverageReport;
  boundary: FeatureCollection<Polygon, { name: string; adminLevel: string; area_sqkm: number }>;
  buildings: FeatureCollection<Polygon, BuildingProperties>;
  roads: FeatureCollection<LineString, RoadProperties>;
  waterBodies: FeatureCollection<Polygon, WaterBodyProperties>;
  amenities: FeatureCollection<Point, { id: string; name: string; type: string; operator?: string }>;
  elevationDem: {
    minElevation_m: number;
    maxElevation_m: number;
    meanElevation_m: number;
    averageSlopeDeg: number;
    source: string;
  };
}

export interface CandidateScoreBreakdown {
  hazardMitigation: { score: number; max: number; note: string };
  accessibility: { score: number; max: number; note: string };
  terrainSuitability: { score: number; max: number; note: string };
  populationServed: { score: number; max: number; note: string };
  costViability: { score: number; max: number; note: string };
  compositeTotal: number;
  limitations: string;
}

export interface InfrastructureCandidateSite {
  id: string;
  infrastructureType: string;
  title: string;
  candidateCoordinates: [number, number]; // [lng, lat]
  elevation_m: number;
  suitabilityScore: number; // 0 - 100
  scoreBreakdown?: CandidateScoreBreakdown;
  hazardsIdentified: HazardType[];
  estimatedCostLakhs: number;
  expectedBeneficiaries: number;
  justification: string;
  evidenceDatasets: string[];
  fieldVerificationNeeded: string[];
  rank: number;
}
