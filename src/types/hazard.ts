import type { FeatureCollection, Polygon } from 'geojson';

export type HazardType =
  | 'flood'
  | 'waterlogging'
  | 'cyclone'
  | 'tsunami'
  | 'earthquake'
  | 'landslide'
  | 'drought'
  | 'heatwave'
  | 'wildfire';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

export type EvidenceClassificationLabel =
  | 'Official observation or warning'
  | 'Forecast'
  | 'Modelled estimate'
  | 'Preliminary screening'
  | 'Illustrative demo'
  | 'Insufficient data';

export interface HazardEvidenceInput {
  name: string;
  value: string;
  unit?: string;
  source: string;
}

export interface HazardClassificationThreshold {
  level: RiskLevel;
  scoreRange: string;
  criterion: string;
  authoritativeSource: string;
}

export interface HazardEvidence {
  evidenceType: EvidenceClassificationLabel;
  dataSource: string;
  lastRetrievedOrUpdated: string;
  inputsUsed: HazardEvidenceInput[];
  assessmentMethod: string;
  classificationThresholds: HazardClassificationThreshold[];
  dataCompleteness: 'complete' | 'partial' | 'sparse' | 'missing';
  qualityWarnings: string[];
  validationStatus: 'Verified Benchmark' | 'Calibrated Model' | 'Preliminary Screening' | 'Unassessed / Insufficient Data';
  validationExplanation: string;
  missingInputs: string[];
  requiredForReliability: string;
}

export interface HazardEventRecord {
  year: string;
  eventName: string;
  impact: string;
  observedMagnitude?: string;
}

export interface HazardDataProvenance {
  source: string;
  publicationYear: string;
  spatialResolution: string;
  scientificAssumptions: string;
  confidenceLevel: 'High' | 'Moderate' | 'Indicative';
}

/**
 * ---------------------------------------------------------------------------
 * FOUR STRICTLY SEPARATED PILLARS OF DISASTER RISK INFORMATION
 * ---------------------------------------------------------------------------
 */

/**
 * PILLAR A: Baseline Hazard Susceptibility
 * Long-term geographical exposure, tectonic zonation, historical return-period atlas.
 */
export interface BaselineHazardSusceptibility {
  level: RiskLevel;
  score: number; // 0 - 100
  zoneClassification: string; // e.g. "BMTPC / IS 875 Zone I (Vb = 50 m/s)", "BIS IS 1893 Zone III"
  authoritativeStandard: string; // e.g. "BIS IS 875 (Part 3):2015 & NDMA NCRMP"
  rationale: string;
  returnPeriodYears?: number;
}

/**
 * PILLAR B: Current Observations & Telemetry
 * Measured physical quantities from AWS, stream gauges, seismometers.
 */
export interface HazardCurrentObservation {
  telemetrySource: string; // e.g. "IMD Automatic Weather Station (AWS) / CWC Gauge Telemetry"
  observedAt: string; // ISO 8601 string
  metricValue: string; // e.g. "Wind: 18 km/h | 24h Rain: 0.0 mm | Temp: 29.4°C"
  statusDescription: string; // e.g. "Normal sea state; squally wind advisory in offshore waters"
  telemetryFreshness: 'fresh' | 'stale' | 'offline';
  readingValues?: Record<string, number | string>;
}

/**
 * PILLAR C: Official Forecasts & Warnings
 * Current authoritative government bulletins with issue time, validity, coverage, agency.
 */
export type OfficialAlertStage = 'no_warning' | 'watch' | 'alert' | 'warning';
export type OfficialAlertColor = 'green' | 'yellow' | 'orange' | 'red';

export interface HazardOfficialWarning {
  alertStage: OfficialAlertStage;
  warningColor: OfficialAlertColor;
  warningTitle: string; // e.g. "IMD Heavy Rain & Squally Wind Advisory (Developing Bay of Bengal Low Pressure)"
  agency: 'IMD' | 'CWC' | 'INCOIS' | 'GSI' | 'NDMA';
  bulletinNumber?: string; // e.g. "IMD-AP-CW-2026/10-21"
  issuedAt: string; // e.g. "2026-10-21T08:30:00+05:30"
  validUntil: string; // e.g. "2026-10-24T18:00:00+05:30"
  geographicCoverage: string; // e.g. "Coastal Andhra Pradesh & Yanam (Krishna, Bapatla, West Godavari)"
  cycloneStageOrPhase?: string; // e.g. "Pre-Cyclonic Low-Pressure Watch (No Cyclonic Storm Formed)"
  tsunamiAlertStatus?: string; // e.g. "INCOIS ITEWC: No Tsunami Threat / Normal Marine Ingress"
  cwcRiverStageStatus?: string; // e.g. "CWC Gauges: Normal Flow Stage (Below Warning Level)"
  advisoryText: string;
  officialInstructions: string[];
}

/**
 * PILLAR D: Modelled Impact Estimates
 * Predicted flood depth, inundated area, exposed roads from numerical/physics models.
 */
export interface HazardModelledImpact {
  modelEngine: string; // e.g. "2D Hydrodynamic Pluvial Solver (SCS-CN & Saint-Venant)"
  scenarioBasis: string; // e.g. "Design Storm 45 mm/h Pulse & Live Telemetry Inflow"
  predictedMetricLabel: string;
  predictedMetricValue: string; // e.g. "Peak Water Depth: 0.45m; Inundation: 13.2 ha"
  inundatedArea_ha: number;
  exposedRoads_km: number;
  modelConfidence: 'validated' | 'calibrated' | 'preliminary' | 'screening' | 'unverified';
  calibrationNote: string;
}

/**
 * Active Real-Time Threat Evaluation
 * Derived from authoritative warning + telemetry (distinct from baseline vulnerability).
 */
export interface HazardActiveThreat {
  level: RiskLevel;
  score: number; // 0 - 100
  threatLabel: string; // e.g. "Advisory: Pre-Cyclonic Watch (Moderate)"
  summary: string;
}

export type VerificationVerdict = 'MATCH' | 'MISMATCH' | 'UNVERIFIED';

export interface HazardAssessment {
  hazardType: HazardType;
  title: string;
  subtitle: string;
  riskLevel: RiskLevel; // Primary baseline or active risk level (strictly guaranteed to match score)
  scientificScore: number; // 0 - 100
  
  // The 4 Distinct Pillars
  baselineSusceptibility: BaselineHazardSusceptibility;
  currentObservation: HazardCurrentObservation;
  officialWarning: HazardOfficialWarning;
  modelledImpact: HazardModelledImpact;
  activeThreat: HazardActiveThreat;
  verificationVerdict: VerificationVerdict;

  isGeographicallyApplicable: boolean;
  applicabilityRationale: string;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  exposedPopulation: number;
  isDemographicDataAvailable?: boolean;
  demographicNote?: string;
  exposedRoadsKm: number;
  isRoadsDataAvailable?: boolean;
  roadsNote?: string;
  exposedFarmlandHa: number;
  criticalFacilitiesExposed: Array<{
    name: string;
    type: string;
    vulnerabilityNote: string;
  }>;
  historicalEvents: HazardEventRecord[];
  provenance: HazardDataProvenance;
  evidence?: HazardEvidence;
  preparednessActions: string[];
  mitigationRecommendations: string[];
  riskPolygons: FeatureCollection<Polygon, {
    hazardType: HazardType;
    riskLevel: RiskLevel;
    zoneName: string;
    description: string;
    intensityLabel: string;
  }>;
}

export interface MultiHazardSummary {
  villageName: string;
  district: string;
  mandal: string;
  compositeRiskScore: number; // 0 - 100
  highestRiskHazards: HazardType[];
  highestActiveThreatHazards?: HazardType[];
  activeOfficialWarningsCount?: number;
  totalVulnerablePopulation: number;
  priorityActions: string[];
  assessments: Record<HazardType, HazardAssessment>;
}

export interface FloodSpecificAuditData {
  rainfall_mmh: number;
  terrainSlope_deg: number;
  soilInfiltration_mmh: number;
  maxInundationDepth_m: number;
  inundatedArea_ha: number;
  exposedRoads_km: number;
  catchmentCharacteristics: string;
  drainageOutfallCondition: string;
}

export interface HazardAuditItem {
  hazardType: HazardType;
  hazardLabel: string;
  displayedRiskLevel: RiskLevel;
  displayedScore: number;
  recalculatedRiskLevel: RiskLevel;
  recalculatedScore: number;
  verdict: VerificationVerdict;
  verdictExplanation: string;
  sourceCodeTrace: string;
  dataCategory: EvidenceClassificationLabel;
  dataSource: string;
  authoritativeStandard: string;
  inputsUsed: HazardEvidenceInput[];
  boundaryCasesChecked: string;
  limitationsAndDisclaimers: string[];
  isGroundTruthCertified: boolean;
  
  // Separation of Baseline vs Active Warning in Audit
  baselineSusceptibilityScore?: number;
  baselineSusceptibilityLevel?: RiskLevel;
  activeWarningTitle?: string;
  activeWarningAgency?: string;
  activeThreatLevel?: RiskLevel;
  
  floodSpecifics?: FloodSpecificAuditData;
}

export interface VillageHazardAuditReport {
  villageId: string;
  villageName: string;
  district: string;
  state: string;
  elevation_m: number;
  auditTimestamp: string;
  totalHazards: number;
  matchesCount: number;
  mismatchesCount: number;
  unverifiedCount: number;
  overallAuditSummary: string;
  items: HazardAuditItem[];
}
