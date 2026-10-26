import type { FeatureCollection, Polygon, LineString, Point, Geometry } from 'geojson';

export type CriticalFacilityType =
  | 'school'
  | 'clinic'
  | 'panchayat'
  | 'water_facility'
  | 'religious'
  | 'commercial'
  | 'agriculture'
  | 'residential';

export interface BuildingProperties {
  id: string;
  name: string;
  type: CriticalFacilityType;
  plinthElevation_m: number; // ground elevation + plinth height
  groundElevation_m: number;
  plinthHeight_cm: number;
  occupants: number;
  constructionType: 'Pukka (RCC)' | 'Semi-Pukka' | 'Kutcha (Thatch/Mud)' | string;
  currentDepth_m?: number;
  riskLevel?: 'safe' | 'low' | 'moderate' | 'severe';
  osm_id?: string;
  osmId?: string;
  building_use?: string;
  elevation_m?: number;
  plinth_elevation_m?: number;
  ground_elevation_m?: number;
  plinth_height_m?: number;
  occupancy?: number;
  structure?: string;
  construction?: string;
  [key: string]: any;
}

export interface RoadProperties {
  id: string;
  name: string;
  roadType:
    | 'National Highway / Arterial'
    | 'National Highway / Expressway'
    | 'National Highway'
    | 'State Highway'
    | 'State Highway Corridor'
    | 'Major District Road (MDR)'
    | 'Major City Arterial'
    | 'Panchayat Arterial'
    | 'Village Internal Street'
    | 'Kutcha Lane'
    | 'Rural Track / Agricultural Bund'
    | 'Canal Bund'
    | string;
  width_m: number;
  elevation_m: number;
  surface: 'Bitumen/Asphalt' | 'Concrete (CC)' | 'Gravel / WBM' | 'Gravel/Earthen' | 'Earthen' | string;
  isEvacuationCorridor: boolean;
  length_m: number;
  lanes?: number;
  source?: string;
  currentDepth_m?: number;
  isImpassable?: boolean;
  highwayClass?: 'national_highway' | 'state_highway' | 'major_road' | 'local_rural' | 'track_service';
  isCandidateRoute?: boolean;
  validationStatus?: 'vetted' | 'candidate' | 'unvalidated';
  hazardIntersection?: boolean;
  [key: string]: any;
}

export interface WaterBodyProperties {
  id: string;
  name: string;
  type: 'Pedda Cheruvu (Tank)' | 'Vagu (Seasonal Stream)' | 'Irrigation Canal (Ayacut)' | 'Wetland / Outfall';
  normalWaterLevel_m: number;
  maxRetainingCapacity_m3: number;
  description: string;
}

export interface DrainageProperties {
  id: string;
  name: string;
  type: 'RCC Covered Box' | 'Masonry U-Drain' | 'Earthen Swale' | 'Underground Pipe';
  status: 'existing' | 'proposed' | 'needs_desilting';
  width_m: number;
  depth_m: number;
  capacity_m3s: number;
  gradient_percent: number;
  cost_lakhs: number;
  length_m: number;
  maintenanceStatus?: 'Good' | 'Partially Silted' | 'Choked';
}

export interface RetentionPondProperties {
  id: string;
  name: string;
  area_sqm: number;
  depth_m: number;
  storage_m3: number;
  estimatedCost_lakhs: number;
  status: 'existing' | 'proposed';
}

export type ScenarioType = 'baseline' | 'existing_drainage' | 'proposed_intervention';

export interface SimulationConfig {
  rainfallIntensity_mmh: number; // e.g. 65 mm/hr
  rainfallDuration_hours: number; // e.g. 4 hours
  soilType: 'black_cotton' | 'alluvial_clay' | 'red_sandy_loam';
  infiltrationRate_mmh: number; // e.g. 8 mm/hr
  runoffCoefficient: number; // 0.35 - 0.75
  scenario: ScenarioType;
  tideOutfallCondition: 'normal' | 'high_surge_backwater';
  desiltingFactor: number; // 0.3 (clogged) to 1.0 (clean)
  timeStep_mins?: number; // e.g. 15, 30, 60 minutes
  rainfallSource?: 'custom' | 'weather_observed' | 'weather_hourly_completed' | 'weather_forecast';
  rainfallSourceLabel?: string;
  rainfallSourceInterval?: string;
  rainfallAssumptions?: string;
  baselineWaterDepth_m?: number;
}

export interface SimulationFrame {
  hour: number;
  rainfallThisHour_mm: number;
  cumulativeRain_mm: number;
  runoffVolume_m3: number;
  drainedVolume_m3: number;
  inundatedArea_ha: number;
  maxDepth_m: number;
  floodedBuildingsCount: number;
  criticalFacilitiesFlooded: string[];
  affectedRoadsKm: number;
  floodPolygons: FeatureCollection<Polygon, { depth_m: number; category: string }>;
}

export interface CanonicalDepthStatistics {
  peakDepth_m: number; // Highest water surface depth at lowest topographic depression
  meanDepth_m: number; // Mean water surface depth across inundated footprint
  minInundationThreshold_m: number; // Surface cutoff threshold (0.05m / 5cm)
}

export interface CanonicalSimulationResult {
  scenarioId: string;
  scenarioTitle: string;
  locationId: string;
  locationName: string;
  district: string;
  state: string;
  modelVersion: string;
  calculationTimestamp: string;
  affectedAreaDefinition: string;
  impactedHectares: number; // Inundated territory in hectares
  impactedSquareKilometres: number; // Inundated territory in km² (strictly: impactedHectares / 100)
  depthStatistics: CanonicalDepthStatistics;
  affectedBuildingsCount: number;
  affectedRoadLengthKm: number;
  farmlandInundatedHa: number;
  vulnerablePopulationAffected: number;
  drainageEfficiencyPercent: number;
  isIllustrative: boolean;
  validationStatus: string;
  modelScopeNote: string;
}

export interface SimulationResult {
  scenario: ScenarioType;
  config: SimulationConfig;
  frames: SimulationFrame[];
  peakHour: number;
  totalRainfall_mm: number;
  maxInundatedArea_ha: number;
  peakDepth_m: number;
  peakFloodPolygons?: FeatureCollection<Polygon, { depth_m: number; category: string }>;
  canonicalResult?: CanonicalSimulationResult;
  affectedBuildings: Array<{
    id: string;
    name: string;
    type: CriticalFacilityType;
    depth_m: number;
    risk: 'safe' | 'low' | 'moderate' | 'severe';
  }>;
  affectedRoads: Array<{
    id: string;
    name: string;
    depth_m: number;
    impassable: boolean;
  }>;
  farmlandInundated_ha: number;
  vulnerablePopulationAffected: number;
  estimatedLoss_lakhs: number;
  drainageEfficiency_percent: number;
  timestamp?: string;
  modelLabel?: string;
  isIllustrative?: boolean;
  modelScopeNote?: string;
  rainfallSource?: 'live_weather_observation' | 'scenario_design_storm';
  buildingDataStatus?: 'available_mapped' | 'unavailable_unmapped';
}

export type FeatureCollectionWithMeta<G extends Geometry = Geometry, P = any> = FeatureCollection<G, P> & {
  properties?: {
    isSynthetic?: boolean;
    source?: string;
    notes?: string;
    [key: string]: any;
  };
};

export interface VillageDataset {
  villageName: string;
  district: string;
  mandal: string;
  state: string;
  totalPopulation: number;
  center: [number, number]; // [lng, lat]
  elevation_m?: number;
  boundary: FeatureCollection<Polygon, { name: string; area_sqkm: number }>;
  buildings: FeatureCollectionWithMeta<Polygon, BuildingProperties>;
  roads: FeatureCollection<LineString, RoadProperties>;
  waterBodies: FeatureCollection<Polygon, WaterBodyProperties>;
  drainageLines: FeatureCollection<LineString, DrainageProperties>;
  retentionPonds: FeatureCollection<Polygon, RetentionPondProperties>;
}
