import type { FeatureCollection, Polygon } from 'geojson';
import type { HazardType } from './hazard';

export type MultiHazardSimulationType = 'flood' | 'tsunami' | 'cyclone' | 'earthquake';

export type SimulationAreaScope = 'village_boundary' | 'radius_2km' | 'radius_5km';

// Hazard-specific parameter configurations
export interface FloodScenarioParams {
  rainfallIntensity_mmh: number; // 20 - 150 mm/h
  duration_hours: number; // 1 - 24 hours
  drainageCondition: 'normal' | 'silted' | 'improved' | 'blocked';
  tideOutfallCondition: 'normal' | 'surge_backwater';
  designStormType: '10_year' | '25_year' | '50_year' | '100_year' | 'custom';
}

export interface TsunamiScenarioParams {
  earthquakeMagnitude_Mw: number; // 7.0 - 9.5
  ruptureDistance_km: number; // 30 - 1500 km
  maxRunupHeight_m: number; // 1.0 - 15.0 m
  coastalSetback_km?: number;
}

export interface CycloneScenarioParams {
  stormCategory: 'Cat 1' | 'Cat 2' | 'Cat 3' | 'Cat 4' | 'Cat 5';
  maxSustainedWind_kmh: number; // 90 - 260 km/h
  stormSurge_m: number; // 0.5 - 6.0 m
  radiusMaxWinds_km: number; // 15 - 60 km
  trackAzimuth_deg: number; // 0 - 360 degrees
  forwardSpeed_kmh: number; // 10 - 40 km/h
}

export interface EarthquakeScenarioParams {
  hypotheticalMagnitude_Mw: number; // 4.5 - 8.8
  hypocenterDepth_km: number; // 5 - 70 km
  epicentralDistance_km: number; // 0 - 200 km
  localSoilType: 'hard_rock' | 'stiff_soil' | 'soft_alluvium';
}

export type ScenarioParamsUnion =
  | { hazard: 'flood'; params: FloodScenarioParams }
  | { hazard: 'tsunami'; params: TsunamiScenarioParams }
  | { hazard: 'cyclone'; params: CycloneScenarioParams }
  | { hazard: 'earthquake'; params: EarthquakeScenarioParams };

export interface MostAffectedAreaInfo {
  zoneId: string;
  zoneName: string;
  severityRank: number; // 1 is highest
  severityTier: 'extreme' | 'high' | 'moderate' | 'low';
  metricLabel: string;
  metricValue: string | number;
  affectedAreaHa: number;
  affectedAreaKm2: number;
  exposedBuildingsCount: number | null; // null if unmapped
  exposedRoadsKm: number;
  exposedRoadsCount: number;
  rankingRationale: string;
  canDistinguish: boolean;
  indistinguishableReason?: string;
  centerCoordinates: [number, number]; // [lng, lat] for map pan/focus
}

export interface StructuredHazardImpactReport {
  locationId: string;
  locationName: string;
  state: string;
  district: string;
  scenarioId: string;
  scenarioTitle: string;
  hazardType: MultiHazardSimulationType;
  modelVersion: string;
  calculatedAt: string;
  isSimulatedScenario: true;
  isHypotheticalNotice: string;
  isApplicable: boolean;
  inapplicableReason?: string;

  // A. Geographic Impact
  geographicImpact: {
    totalStudyAreaKm2: number;
    estimatedAffectedAreaKm2: number;
    percentageAreaAffected: number;
    affectedZonesCount: number;
    impactSeverityByZone: Array<{
      zoneId: string;
      zoneName: string;
      tier: 'extreme' | 'high' | 'moderate' | 'low';
      areaKm2: number;
      percentageOfAffected: number;
      primaryMetric: string;
      color: string;
    }>;
  };

  // B. Buildings
  buildingImpact: {
    dataStatus: 'available_mapped' | 'unavailable_unmapped';
    totalMappedBuildings: number;
    buildingsInImpactZone: number;
    percentageBuildingsExposed: number | null;
    severityCategories: {
      severe: number;
      moderate: number;
      low: number;
      safe: number;
    };
    unknownStructuralVulnerabilityCount: number;
    notes: string;
  };

  // C. Population
  populationImpact: {
    dataStatus: 'census_demographic' | 'proportional_buffer' | 'unavailable';
    totalStudyPopulation: number;
    estimatedExposedPopulation: number | null;
    percentageExposed: number | null;
    dataSource: string;
    resolution: string;
    referenceYear: string;
    methodologyNote: string;
  };

  // D. Roads & Infrastructure
  infrastructureImpact: {
    totalRoadsMapped: number;
    totalRoadLengthKm: number;
    intersectingRoadLengthKm: number;
    percentageRoadsExposed: number;
    severedRoadSegmentsCount: number;
    exposedCriticalFacilities: Array<{
      name: string;
      type: string;
      hazardExposure: string;
    }>;
    evacuationRouteAccessibility: 'fully_accessible' | 'partially_severed' | 'critical_failure' | 'data_unavailable';
    evacuationAccessibilityNote: string;
  };

  // E. Uncertainty & Data Coverage
  uncertaintyAndCoverage: {
    dataSources: string[];
    timestamps: Record<string, string>;
    missingDatasets: string[];
    modelAssumptions: string[];
    confidenceTier: 'High' | 'Medium' | 'Indicative' | 'Screening';
    validationStatus: string;
  };

  // Most Affected Area
  mostAffectedArea: MostAffectedAreaInfo;

  // Map Overlays
  impactPolygons: FeatureCollection<Polygon, any>;
}

