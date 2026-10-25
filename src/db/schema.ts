/**
 * Database schema definitions for Bharat Village Twin nationwide platform.
 * Compliant with Supabase PostgreSQL / PostGIS and standard SQL types.
 */

// ============================================================================
// TABLE A: LOCATIONS
// ============================================================================
export interface DbLocation {
  id: string;
  name: string;
  displayName?: string;
  location_type?: 'village' | 'gram_panchayat' | 'mandal_block' | 'taluk_tehsil' | 'district' | 'state' | 'coordinates';
  adminLevel?: 'village' | 'gram_panchayat' | 'taluk_tehsil' | 'district' | 'state_ut' | 'coordinates';
  parent_location_id?: string | null;
  state: string;
  district: string;
  mandal_block?: string;
  subdistrict?: string;
  latitude?: number;
  longitude?: number;
  centerLat?: number;
  centerLng?: number;
  elevation_m?: number;
  regionCategory?: 'himalayan' | 'coastal' | 'riverine' | 'drought_prone' | 'northeastern' | 'island' | 'plains';
  boundingBox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  data_source?: string;
  source?: string;
  qualityNotes?: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// TABLE B: HISTORICAL DISASTERS
// ============================================================================
export interface DbHistoricalDisaster {
  id: string;
  location_id?: string | null;
  locationId?: string;
  hazardType: 'flood' | 'waterlogging' | 'cyclone' | 'earthquake' | 'tsunami' | 'landslide' | 'drought' | 'heatwave' | 'wildfire';
  hazard_type?: string;
  eventName: string;
  event_name?: string;
  eventDate: string; // 'YYYY-MM-DD'
  event_date?: string;
  event_end_date?: string | null;
  eventYear?: number;
  description?: string;
  state: string;
  district: string;
  villageName?: string;
  village_name?: string;
  latitude?: number;
  longitude?: number;
  observedMagnitude?: string;
  affected_population?: number | null;
  affectedPopulation?: number | null;
  deaths?: number | null;
  fatalities?: number | null;
  injuries?: number | null;
  injured?: number | null;
  displaced_people?: number | null;
  damaged_houses?: number | null;
  damagedHouses?: number | null;
  crop_area_ha?: number | null;
  cropAreaHa?: number | null;
  economic_loss_crores?: number | null;
  economicLossCrores?: number | null;
  affected_area_sqkm?: number | null;
  source_name?: string;
  source_url?: string;
  verification_status?: 'confirmed' | 'estimated' | 'incomplete' | 'unverified';
  confidenceLevel: 'confirmed' | 'estimated' | 'incomplete' | 'unverified';
  source: string;
  sourceCitation: string;
  metadataJson?: Record<string, any>;
  deduplication_key?: string;
  dedupHash: string;
  created_at?: string;
  updated_at?: string;
  createdAt: string;
}

// ============================================================================
// TABLE C: WEATHER OBSERVATIONS
// ============================================================================
export interface DbWeatherObservation {
  id: string;
  location_id?: string;
  locationId: string;
  observed_at?: string;
  latitude?: number;
  longitude?: number;
  temperature?: number;
  temperature_c: number;
  rainfall?: number;
  rainfallRate_mmh?: number;
  humidity?: number;
  humidity_percent: number;
  wind_speed?: number;
  windSpeed_kmh: number;
  wind_direction?: string;
  windDirection?: string;
  weather_condition?: string;
  condition: string;
  pressure_hpa?: number;
  provider: string;
  isLiveApi?: boolean;
  retrievalTimestamp?: string;
  raw_data?: any;
  rawPayload?: any;
  created_at?: string;
}

// ============================================================================
// TABLE D: WEATHER FORECASTS
// ============================================================================
export interface DbWeatherForecastSnapshot {
  id: string;
  location_id?: string;
  locationId: string;
  provider: string;
  forecast_issued_at?: string;
  forecastIssueTime: string;
  forecast_valid_at?: string;
  forecastValidTime: string;
  forecast_horizon_hours?: number;
  forecastType?: 'hourly' | 'daily' | '10day';
  temperature?: number;
  temperature_c?: number;
  maxTemp_c?: number;
  minTemp_c?: number;
  weather_condition?: string;
  condition: string;
  predicted_rainfall?: number;
  rainfall_mm: number;
  rainfall_probability?: number;
  rainProbability_percent?: number;
  wind_speed?: number;
  windSpeed_kmh?: number;
  raw_data?: any;
  retrievalTimestamp?: string;
  created_at?: string;
}

// Alias for Table D
export type DbWeatherForecast = DbWeatherForecastSnapshot;

// ============================================================================
// TABLE E: GEOSPATIAL ASSETS
// ============================================================================
export interface DbGeographicAsset {
  id: string;
  location_id?: string;
  locationId: string;
  asset_type?: 'boundary' | 'terrain' | 'elevation' | 'building' | 'road' | 'drainage' | 'land_use' | 'water_body' | 'critical_lifeline' | 'shelter';
  assetCategory?: 'building' | 'road' | 'waterbody' | 'critical_lifeline' | 'shelter' | 'drainage';
  name: string;
  data_source?: string;
  source_url?: string;
  geometry?: any;
  geomType?: 'Point' | 'LineString' | 'Polygon';
  coordinatesJson?: any;
  resolution?: string;
  elevation_m?: number;
  vulnerabilityScore?: number;
  isCriticalLifeline?: boolean;
  last_updated_at?: string;
  coverage_status?: 'available' | 'partial' | 'missing' | 'outdated';
  metadata?: Record<string, any>;
  propertiesJson?: Record<string, any>;
  provenance?: string;
  created_at?: string;
  createdAt?: string;
}

// Alias for Table E
export type DbGeospatialAsset = DbGeographicAsset;

// ============================================================================
// TABLE F: RISK ASSESSMENTS
// ============================================================================
export interface DbRiskAssessment {
  id: string;
  location_id?: string;
  locationId: string;
  hazardType: 'flood' | 'waterlogging' | 'cyclone' | 'earthquake' | 'tsunami' | 'landslide' | 'drought' | 'heatwave' | 'wildfire';
  hazard_type?: string;
  risk_level?: 'low' | 'moderate' | 'high' | 'very_high';
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  risk_score?: number;
  scientificScore: number;
  assessment_summary?: string;
  primaryMetricLabel?: string;
  primaryMetricValue?: string;
  exposedPopulation?: number;
  exposedRoadsKm?: number;
  exposedFarmlandHa?: number;
  isApplicable?: boolean;
  applicabilityRationale?: string;
  data_coverage?: 'high' | 'moderate' | 'low' | 'sparse';
  confidenceTier?: 'High' | 'Moderate' | 'Indicative';
  confidence?: 'High' | 'Moderate' | 'Indicative';
  provenanceSource?: string;
  model_name?: string;
  modelVersion?: string;
  model_version?: string;
  input_data_sources?: string[];
  metadata?: Record<string, any>;
  assessed_at?: string;
  assessedAt?: string;
  created_at?: string;
}

// ============================================================================
// TABLE G: SIMULATION RUNS
// ============================================================================
export interface DbSimulationRun {
  id: string;
  location_id?: string | null;
  locationId?: string;
  hazard_type: 'flood' | 'waterlogging' | 'cyclone' | 'earthquake' | 'tsunami' | 'landslide' | 'drought' | 'heatwave' | 'wildfire';
  scenario_parameters: {
    scenario: string;
    rainfallIntensity_mmh?: number;
    duration_hours?: number;
    terrainRoughness?: number;
    includeProposedPonds?: boolean;
    includeProposedDrains?: boolean;
    soilSaturation?: string;
    [key: string]: any;
  };
  model_name: string;
  model_version: string;
  input_data_sources: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string | null;
  result_summary?: {
    maxInundatedArea_ha?: number;
    peakDepth_m?: number;
    waterloggedBuildingsCount?: number;
    vulnerableRoadLength_km?: number;
    averageDepth_m?: number;
    scenarioLabel?: string;
    computationTime_ms?: number;
    [key: string]: any;
  } | null;
  result_asset_url?: string | null;
  error_message?: string | null;
  created_at: string;
}

// ============================================================================
// TABLE H: INFRASTRUCTURE RECOMMENDATIONS
// ============================================================================
export interface DbInfrastructureRecommendation {
  id: string;
  location_id?: string;
  locationId: string;
  recommendation_type?: string;
  proposed_name?: string;
  rank?: number;
  title: string;
  infrastructureType: string;
  latitude?: number;
  longitude?: number;
  candidateLat: number;
  candidateLng: number;
  candidate_geometry?: any;
  elevation_m: number;
  hazard_exposure?: string;
  accessibility_score?: number;
  suitabilityScore: number;
  suitability_score?: number;
  estimatedCostLakhs?: number;
  estimated_cost?: number;
  expectedBeneficiaries?: number;
  expected_beneficiaries?: number;
  explanation?: string;
  justification: string;
  evidence_sources?: string[];
  evidenceDatasets: string[];
  verification_status?: string;
  fieldVerificationNeeded: string[];
  model_version?: string;
  created_at?: string;
  updated_at?: string;
  createdAt: string;
}

// ============================================================================
// TABLE I: ALERTS
// ============================================================================
export interface DbAlert {
  id: string;
  location_id?: string | null;
  locationId?: string;
  state: string;
  district: string;
  hazard_type?: string;
  hazardType: 'flood' | 'waterlogging' | 'cyclone' | 'earthquake' | 'tsunami' | 'landslide' | 'drought' | 'heatwave' | 'wildfire';
  alert_level?: 'info' | 'advisory' | 'watch' | 'warning' | 'emergency';
  severity: 'info' | 'advisory' | 'watch' | 'warning' | 'emergency';
  title: string;
  message?: string;
  description: string;
  source_name?: string;
  source_url?: string;
  source: string;
  is_official_warning?: boolean;
  isOfficialWarning: boolean;
  issued_at?: string;
  valid_from?: string;
  valid_until?: string;
  effectiveFrom: string;
  expiresAt: string;
  status: 'active' | 'updated' | 'expired';
  evidence_metrics?: Record<string, any>;
  evidenceMetrics?: Record<string, any>;
  deduplication_key?: string;
  dedupHash: string;
  created_at?: string;
  createdAt: string;
}

// ============================================================================
// TABLE J: NOTIFICATION SUBSCRIPTIONS
// ============================================================================
export interface DbUserNotificationPreference {
  id: string;
  user_id?: string;
  userIdentifier: string;
  location_id?: string | null;
  monitored_location_ids?: string[];
  monitoredLocationIds: string[];
  hazard_types?: string[];
  monitoredHazardTypes: string[];
  notification_channels?: string[];
  min_severity?: 'info' | 'advisory' | 'watch' | 'warning' | 'emergency';
  minSeverity: 'info' | 'advisory' | 'watch' | 'warning' | 'emergency';
  enabled?: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailAddress?: string;
  smsEnabled: boolean;
  phoneNumber?: string;
  created_at?: string;
  updated_at?: string;
  createdAt: string;
  updatedAt: string;
}

// Alias for Table J
export type DbNotificationSubscription = DbUserNotificationPreference;

// ============================================================================
// TABLE K: NOTIFICATION HISTORY
// ============================================================================
export interface DbNotificationHistory {
  id: string;
  alert_id?: string;
  alertId: string;
  user_id?: string;
  userIdentifier: string;
  channel: 'in_app' | 'email' | 'sms';
  delivery_status?: 'delivered' | 'failed' | 'pending';
  deliveryStatus: 'delivered' | 'failed' | 'pending';
  sent_at?: string;
  delivered_at?: string;
  deliveredAt: string;
  failure_reason?: string;
  errorMessage?: string;
  created_at?: string;
}

// Supporting multi-hazard 10-day outlook entity
export interface DbTenDayRiskOutlook {
  id: string;
  locationId: string;
  hazardType: 'flood' | 'waterlogging' | 'cyclone' | 'earthquake' | 'tsunami' | 'landslide' | 'drought' | 'heatwave' | 'wildfire';
  outlookDate: string; // 'YYYY-MM-DD'
  dayNumber: number; // 1 to 10
  riskCategory: 'Low' | 'Moderate' | 'High' | 'Severe';
  sourceType: 'meteorological_forecast' | 'hydrologic_model' | 'seismic_hazard_model' | 'official_warning';
  evidenceSummary: string;
  forecastIssueTime: string;
  uncertaintyNotes: string;
  recommendedActions: string[];
  createdAt: string;
}
