import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';

export type CwcFloodStatus = 'normal' | 'warning' | 'danger' | 'extreme';
export type CwcFlowTrend = 'rising' | 'falling' | 'steady';

export interface CwcRiverGaugeStation {
  stationId: string;
  stationName: string;
  riverName: string;
  basinName: string;
  coordinates: [number, number]; // [lng, lat]
  warningLevel_m: number;
  dangerLevel_m: number;
  hfl_m: number; // Highest Flood Level recorded
  currentWaterLevel_m: number;
  discharge_m3s: number;
  floodStatus: CwcFloodStatus;
  flowTrend: CwcFlowTrend;
  distanceKm: number;
  lastObservationTime: string;
  retrievedAt: string;
  sourceUrl: string;
  sourceAgency: string;
  dataClassification: 'real_observed' | 'forecast' | 'model_estimate';
}

export type ImdWarningColor = 'green' | 'yellow' | 'orange' | 'red';

export interface ImdRainfallTelemetry {
  district: string;
  state: string;
  stationName?: string;
  observedRainfall24h_mm: number;
  normalRainfall_mm: number;
  departurePercent: number;
  warningColor: ImdWarningColor;
  warningTitle: string;
  advisoryText: string;
  bulletinNumber?: string;
  issuedAt?: string;
  validUntil?: string;
  coverage?: string;
  cycloneStage?: string;
  qpf24h_mm: number; // Quantitative Precipitation Forecast 24h
  qpf48h_mm: number;
  qpf72h_mm: number;
  observationTime: string;
  retrievedAt: string;
  source: string;
  dataClassification: 'real_observed' | 'forecast';
}

export interface DrainageBottleneck {
  id: string;
  coordinates: [number, number];
  title: string;
  roadOrWaterwayName: string;
  currentCapacity_m3s: number;
  requiredCapacity_m3s: number;
  chokeRatio: number; // required / current (e.g. 2.4x choked)
  cause: 'culvert_restriction' | 'gradient_flat' | 'cross_drain_siltation' | 'outfall_backwater';
  mitigationRecommendation: string;
  estimatedCostLakhs: number;
}

export interface TerrainHydrologyData {
  minElevation_m: number;
  maxElevation_m: number;
  meanSlope_deg: number;
  terrainType: 'steep_hills' | 'undulating_plateau' | 'alluvial_delta_plains';
  flowAccumulationLines: FeatureCollection<
    LineString,
    {
      id: string;
      flowOrder: number;
      accumulationCells: number;
      slope_deg: number;
      estimatedPeakDischarge_m3s: number;
    }
  >;
  depressionNodes: FeatureCollection<
    Point,
    {
      id: string;
      depth_m: number;
      area_sqm: number;
      elevation_m: number;
      storageCapacity_m3: number;
      isHabitationThreatened: boolean;
    }
  >;
  bottlenecks: DrainageBottleneck[];
  demSource: string;
  generatedAt: string;
}

export interface EvacuationRoadSegment {
  id: string;
  name: string;
  roadType: string;
  surface: string;
  length_m: number;
  elevation_m: number;
  floodDepth_m: number;
  status: 'passable' | 'caution' | 'blocked';
  coordinates: [number, number][];
}

export interface FloodAwareEvacuationRoute {
  id: string;
  name: string;
  originName: string;
  destinationName: string;
  destinationType: 'cyclone_shelter' | 'elevated_school' | 'community_hall' | 'high_ground_ridge';
  destinationElevation_m: number;
  totalDistance_m: number;
  estimatedWalkingMinutes: number;
  clearanceStatus: 'Clear & Passable' | 'Conditional (Caution)' | 'Impassable (Blocked)';
  isPassable: boolean;
  submergedDistance_m: number;
  maxFloodDepth_m: number;
  roadClosureThreshold_m: number;
  segments: EvacuationRoadSegment[];
  routeGeometry: FeatureCollection<LineString, { routeId: string; status: string }>;
  instructions: string[];
  safetyCaveats: string[];
  dataFreshnessNotice: string;
}

/**
 * 6. Data Freshness and Provenance Tracking Types
 */
export type DataFreshnessStatus = 'fresh' | 'delayed' | 'stale' | 'unavailable';

export interface DatasetProvenanceMeta {
  sourceAgency: string;
  sourceUrl?: string;
  geographicCoverage: string;
  observationTime?: string;
  forecastIssueTime?: string;
  forecastValidTime?: string;
  lastSuccessfulRetrievalTime: string;
  updateCadence: string;
  units: string;
  qualityIndicator: 'verified_gauge' | 'model_calibrated' | 'unvalidated_screening' | 'provisional_satellite';
  missingDataStatus: 'complete' | 'partial_delay' | 'gauge_offline' | 'ungauged_basin';
  freshnessStatus: DataFreshnessStatus;
  ageMinutes: number;
  warningNotice?: string;
}

/**
 * 7. Model Validation and Accuracy Measurement
 */
export interface FloodModelValidationMetrics {
  waterLevelMae_m?: number; // Mean Absolute Error in meters
  waterLevelRmse_m?: number; // Root Mean Square Error in meters
  inundationIoU: number; // Intersection-over-Union (Jaccard Index, 0.0 - 1.0)
  precision: number; // True Positive / (True Positive + False Positive)
  recall: number; // Probability of Detection (POD) = TP / (TP + FN)
  falseAlarmRate: number; // FAR = FP / (TP + FP)
  benchmarkEvent: string;
}

export interface FloodModelValidationReport {
  locationId: string;
  villageName: string;
  basinName: string;
  modelEngine: string;
  modelVersion: string;
  validationStatus: 'validated_calibrated' | 'provisionally_calibrated' | 'ungauged_unvalidated';
  calibrationEvent: string;
  evaluationEvent: string;
  metrics: FloodModelValidationMetrics;
  referenceDataSources: string[];
  scientificLimitations: string[];
  operationalNotice: string;
  lastAuditedAt: string;
}

/**
 * 8. Hourly Data Acquisition Pipeline Status
 */
export interface ProviderRefreshStatus {
  providerId: string;
  providerName: string;
  datasetName: string;
  lastAttemptTime: string;
  lastSuccessTime: string;
  freshness: DataFreshnessStatus;
  ageMinutes: number;
  recordsIngested: number;
  statusCode?: number;
  retryCount: number;
  errorMessage?: string;
  cadenceDescription: string;
}

export interface HourlyRefreshPipelineStatus {
  lastRunTime: string;
  nextScheduledRunTime: string;
  refreshIntervalMinutes: number;
  isJobRunning: boolean;
  overallHealth: 'optimal' | 'degraded' | 'critical';
  providers: Record<string, ProviderRefreshStatus>;
}

/**
 * 9. Multi-Factor Flood Risk Estimation Traceability
 */
export interface FloodRiskFactorItem {
  name: string;
  category: 'rainfall' | 'riverine' | 'terrain' | 'drainage';
  inputValue: string | number;
  unit: string;
  weightPercent: number;
  subScore: number; // 0 - 100
  source: string;
  confidence: 'high' | 'moderate' | 'screening_only';
}

export interface VerifiedFloodRiskAssessment {
  locationId: string;
  villageName: string;
  overallScore: number; // 0 - 100
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  classificationType: 'screening_susceptibility' | 'calibrated_hydrodynamic' | 'official_cwc_warning';
  modelVersion: string;
  assumptions: string[];
  factors: FloodRiskFactorItem[];
  computedAt: string;
  validUntil: string;
  validationSummary: string;
}

