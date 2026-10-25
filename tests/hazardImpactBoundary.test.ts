import { generateDynamicHazardImpactBoundary } from '../src/services/hazardImpactBoundaryService';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { SimulationResult, SimulationFrame } from '../src/types/village';
import type { TerrainHydrologyData } from '../src/types/flood';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Dynamic Hazard Impact Boundary Audit');
console.log('=============================================================\n');

const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS[0]; // Coastal Delta, AP
const joshimath = NATIONWIDE_BENCHMARK_LOCATIONS[1]; // Himalayan, Uttarakhand
const pokhran = NATIONWIDE_BENCHMARK_LOCATIONS[2]; // Thar Desert, Rajasthan

// ---------------------------------------------------------------------------
// Suite 1: Administrative Boundary Distinction
// ---------------------------------------------------------------------------
console.log('--- Suite 1: Administrative Cadastral vs Hazard Boundary Distinction ---');

const kotturuFloodZone = generateDynamicHazardImpactBoundary(kotturu, 'flood', DEMO_VILLAGE);

assert(DEMO_VILLAGE.boundary.features.length > 0, 'Official cadastral boundary GeoJSON exists for Kotturu');
assert(
  DEMO_VILLAGE.boundary.features[0].properties.name.includes('Boundary'),
  'Cadastral feature is explicitly labelled as boundary'
);
assert(kotturuFloodZone.hazardType === 'flood', 'Dynamic hazard zone hazardType is flood');
assert(
  kotturuFloodZone.features.features.length > 0,
  'Hazard impact zone features are populated independently from cadastral boundary'
);
assert(
  kotturuFloodZone.features.features[0].properties.hazardType === 'flood',
  'Hazard feature properties clearly identify hazardType'
);
assert(
  kotturuFloodZone.modelBasis !== undefined && kotturuFloodZone.modelBasis.length > 0,
  'Hazard impact zone discloses explicit model basis'
);

// ---------------------------------------------------------------------------
// Suite 2: Flood Hydrological Coupling & Dynamic Scaling
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: Flood Hydrological Flow & Dynamic Scenario Expansion ---');

// Mock 2D Simulation Result: Moderate Rain (45 mm/h)
const mockModerateSimResult: SimulationResult = {
  scenario: 'existing_drainage',
  config: {
    rainfallIntensity_mmh: 45,
    rainfallDuration_hours: 4,
    soilType: 'alluvial_clay',
    infiltrationRate_mmh: 8,
    runoffCoefficient: 0.55,
    scenario: 'existing_drainage',
    tideOutfallCondition: 'normal',
    desiltingFactor: 0.7,
  },
  peakHour: 3,
  totalRainfall_mm: 180,
  maxInundatedArea_ha: 14.5,
  peakDepth_m: 0.58,
  affectedBuildings: [],
  affectedRoads: [],
  farmlandInundated_ha: 8.4,
  vulnerablePopulationAffected: 120,
  estimatedLoss_lakhs: 14.5,
  drainageEfficiency_percent: 62.0,
  frames: [
    {
      hour: 3,
      rainfallThisHour_mm: 45,
      cumulativeRain_mm: 135,
      runoffVolume_m3: 25000,
      drainedVolume_m3: 12000,
      inundatedArea_ha: 14.5,
      maxDepth_m: 0.58,
      floodedBuildingsCount: 6,
      criticalFacilitiesFlooded: [],
      affectedRoadsKm: 1.4,
      floodPolygons: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { depth_m: 0.42, category: 'moderate' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [80.84, 16.21],
                  [80.845, 16.21],
                  [80.845, 16.215],
                  [80.84, 16.215],
                  [80.84, 16.21],
                ],
              ],
            },
          },
        ],
      },
    },
  ],
};

// Mock 2D Simulation Result: Extreme Cloudburst (75 mm/h)
const mockExtremeSimResult: SimulationResult = {
  ...mockModerateSimResult,
  config: {
    ...mockModerateSimResult.config,
    rainfallIntensity_mmh: 75,
  },
  maxInundatedArea_ha: 26.8,
  peakDepth_m: 0.84,
  frames: [
    {
      hour: 3,
      rainfallThisHour_mm: 75,
      cumulativeRain_mm: 225,
      runoffVolume_m3: 45000,
      drainedVolume_m3: 14000,
      inundatedArea_ha: 26.8,
      maxDepth_m: 0.84,
      floodedBuildingsCount: 18,
      criticalFacilitiesFlooded: ['sub_station'],
      affectedRoadsKm: 3.1,
      floodPolygons: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { depth_m: 0.78, category: 'severe' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [80.835, 16.205],
                  [80.85, 16.205],
                  [80.85, 16.22],
                  [80.835, 16.22],
                  [80.835, 16.205],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: { depth_m: 0.48, category: 'moderate' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [80.84, 16.21],
                  [80.845, 16.21],
                  [80.845, 16.215],
                  [80.84, 16.215],
                  [80.84, 16.21],
                ],
              ],
            },
          },
        ],
      },
    },
  ],
};

const moderateFloodImpact = generateDynamicHazardImpactBoundary(
  kotturu,
  'flood',
  DEMO_VILLAGE,
  mockModerateSimResult
);
const extremeFloodImpact = generateDynamicHazardImpactBoundary(
  kotturu,
  'flood',
  DEMO_VILLAGE,
  mockExtremeSimResult
);

assert(
  moderateFloodImpact.dataConfidence === '2D Hydrodynamic Simulation',
  'Flood zone with simulation uses 2D Hydrodynamic Simulation confidence'
);
assert(
  extremeFloodImpact.totalImpactAreaHa > moderateFloodImpact.totalImpactAreaHa,
  `Extreme rain (75mm/h) expands inundation area (${extremeFloodImpact.totalImpactAreaHa} ha > ${moderateFloodImpact.totalImpactAreaHa} ha)`
);
assert(
  extremeFloodImpact.primaryRiskTier === 'extreme',
  'Extreme rain with depth >= 0.60m triggers extreme tier'
);
assert(
  moderateFloodImpact.primaryRiskTier === 'high',
  'Moderate rain with depth 0.42m triggers high tier'
);

// Fallback to D8 Topographic Screening when no simulation is loaded
const unsimulatedFloodImpact = generateDynamicHazardImpactBoundary(
  kotturu,
  'flood',
  DEMO_VILLAGE,
  null
);
assert(
  unsimulatedFloodImpact.dataConfidence === 'Topographic D8 Runoff Screening',
  'Unsimulated flood boundary falls back to Topographic D8 Runoff Screening'
);
assert(
  unsimulatedFloodImpact.summary.includes('Preliminary Screening'),
  'Unsimulated flood boundary clearly marks preliminary screening status'
);

// ---------------------------------------------------------------------------
// Suite 3: Cyclone Wind Field & Storm Surge Penetration Tiers
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Cyclone Meteorological Wind Field & Coastal Storm Surge ---');

const kotturuCyclone = generateDynamicHazardImpactBoundary(kotturu, 'cyclone', DEMO_VILLAGE);

assert(kotturuCyclone.isApplicable === true, 'Cyclone is applicable for East Coast Krishna delta location');
assert(kotturuCyclone.tierCount === 3, `Cyclone generates 3 meteorologically derived zones (found ${kotturuCyclone.tierCount})`);

const hurricaneCoreZone = kotturuCyclone.features.features.find((f) => f.properties.id.includes('hurricane-core'));
const galeCorridorZone = kotturuCyclone.features.features.find((f) => f.properties.id.includes('gale-corridor'));
const stormSurgeZone = kotturuCyclone.features.features.find((f) => f.properties.id.includes('storm-surge'));

assert(hurricaneCoreZone !== undefined, 'Contains Core Destructive Hurricane-Force Wind Zone (> 120 km/h)');
assert(hurricaneCoreZone?.properties.tier === 'extreme', 'Hurricane core is extreme risk tier');
assert(
  hurricaneCoreZone?.properties.metrics['Peak Wind Speed']?.toString().includes('165 km/h') ?? false,
  'Discloses 165 km/h peak design wind speed'
);

assert(galeCorridorZone !== undefined, 'Contains Gale-Force Wind Hazard Corridor (63-119 km/h)');
assert(galeCorridorZone?.properties.tier === 'high', 'Gale corridor is high risk tier');

assert(stormSurgeZone !== undefined, 'Contains Coastal Storm Surge Ingress Corridor');
assert(
  stormSurgeZone?.properties.metrics['Peak Storm Surge']?.toString().includes('3.8 m') ?? false,
  'Discloses 3.8m storm surge water depth'
);

// Inland cyclone test (Joshimath at 1890m elevation)
const joshimathCyclone = generateDynamicHazardImpactBoundary(joshimath, 'cyclone');
assert(
  joshimathCyclone.isApplicable === false,
  'Inland mountain location (Joshimath) is marked physically inapplicable for coastal storm surge'
);
assert(
  joshimathCyclone.features.features.length === 0,
  'Inland location does not generate arbitrary fake cyclone polygons'
);

// ---------------------------------------------------------------------------
// Suite 4: Landslide Topographic Slope Confinement (> 20°)
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Landslide Topographic Slope Confinement ---');

const kotturuFlatHydrology: TerrainHydrologyData = {
  minElevation_m: 18.5,
  maxElevation_m: 22.0,
  meanSlope_deg: 0.45,
  terrainType: 'alluvial_delta_plains',
  flowAccumulationLines: { type: 'FeatureCollection', features: [] },
  depressionNodes: { type: 'FeatureCollection', features: [] },
  bottlenecks: [],
  demSource: 'Copernicus 30m DEM',
  generatedAt: new Date().toISOString(),
};

const kotturuLandslide = generateDynamicHazardImpactBoundary(
  kotturu,
  'landslide',
  DEMO_VILLAGE,
  null,
  kotturuFlatHydrology
);

assert(
  kotturuLandslide.isApplicable === false,
  'Landslide is physically inapplicable on flat delta (slope 0.45°)'
);
assert(
  kotturuLandslide.features.features.length === 0,
  'Zero false landslide polygons on flat alluvial delta'
);
assert(
  kotturuLandslide.inapplicableReason?.includes('slope is 0.5°') ||
    kotturuLandslide.inapplicableReason?.includes('slope') === true,
  'Provides transparent scientific explanation for inapplicability'
);

// Mountainous location landslide test (Joshimath with slope 32°)
const joshimathSteepHydrology: TerrainHydrologyData = {
  minElevation_m: 1400,
  maxElevation_m: 2200,
  meanSlope_deg: 32.0,
  terrainType: 'steep_hills',
  flowAccumulationLines: { type: 'FeatureCollection', features: [] },
  depressionNodes: { type: 'FeatureCollection', features: [] },
  bottlenecks: [],
  demSource: 'Copernicus 30m DEM',
  generatedAt: new Date().toISOString(),
};

const joshimathLandslide = generateDynamicHazardImpactBoundary(
  joshimath,
  'landslide',
  null,
  null,
  joshimathSteepHydrology
);

assert(
  joshimathLandslide.isApplicable === true,
  'Landslide is applicable in steep terrain (slope 32°)'
);
assert(
  joshimathLandslide.features.features.length > 0,
  'Generates active escarpment debris flow runout corridor'
);
assert(
  joshimathLandslide.primaryRiskTier === 'extreme',
  'Steep slope instability is extreme risk tier'
);

// ---------------------------------------------------------------------------
// Suite 5: Tsunami Low-Elevation Marine Constraint (< 10m AMSL)
// ---------------------------------------------------------------------------
console.log('\n--- Suite 5: Tsunami Coastal Elevation Screening ---');

// Pokhran is 380m elevation in Rajasthan desert (inland):
const pokhranTsunami = generateDynamicHazardImpactBoundary(pokhran, 'tsunami');
assert(
  pokhranTsunami.isApplicable === false,
  'Tsunami is marked inapplicable for 380m elevation inland desert settlement (Pokhran)'
);
assert(
  pokhranTsunami.features.features.length === 0,
  'Zero false tsunami polygons for inland cadastre'
);

// Joshimath is 1890m elevation in Himalayas:
const joshimathTsunami = generateDynamicHazardImpactBoundary(joshimath, 'tsunami');
assert(
  joshimathTsunami.isApplicable === false,
  'Tsunami is marked inapplicable for Himalayan settlement (Joshimath)'
);
assert(
  joshimathTsunami.features.features.length === 0,
  'Zero false tsunami polygons for mountain cadastre'
);

// ---------------------------------------------------------------------------
// Suite 6: Earthquake BIS IS 1893:2016 Seismic Zonation
// ---------------------------------------------------------------------------
console.log('\n--- Suite 6: Earthquake BIS IS 1893:2016 Seismic Isoseismal Zonation ---');

const kotturuSeismic = generateDynamicHazardImpactBoundary(kotturu, 'earthquake');
assert(kotturuSeismic.isApplicable === true, 'Seismic zonation is applicable nationwide');
assert(
  kotturuSeismic.modelBasis.includes('Zone III'),
  'Kotturu correctly mapped to BIS Zone III'
);
assert(
  kotturuSeismic.features.features[0].properties.metrics['Design PGA'] === '0.16g',
  'Zone III maps to design PGA 0.16g'
);

const joshimathSeismic = generateDynamicHazardImpactBoundary(joshimath, 'earthquake');
assert(
  joshimathSeismic.modelBasis.includes('Zone V'),
  'Joshimath correctly mapped to BIS Zone V'
);
assert(
  joshimathSeismic.features.features[0].properties.metrics['Design PGA'] === '0.36g',
  'Zone V maps to design PGA 0.36g'
);
assert(
  joshimathSeismic.primaryRiskTier === 'extreme',
  'Zone V maps to extreme seismic tier'
);

console.log('\n=============================================================');
console.log(' Test Summary: All Dynamic Hazard Impact Boundary Tests Passed');
console.log('=============================================================\n');
