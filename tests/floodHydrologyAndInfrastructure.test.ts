import {
  calculateHaversineKm,
  getNearestCwcGauges,
  getImdRainfallTelemetry,
  deriveTerrainHydrology,
  calculateFloodAwareEvacuationRoutes,
} from '../src/services/floodDataService';
import {
  calculateRainwaterHarvestingYield,
  calculateRetentionBasinSizing,
  calculateDrainageCapacityUpgrade,
  calculateMcdaSuitabilityScore,
} from '../src/services/infrastructureService';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { SimulationResult } from '../src/types/village';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗\x1b[0m ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

function assertStrictEqual<T>(actual: T, expected: T, testName: string) {
  assert(
    actual === expected,
    testName,
    `Expected "${expected}", received "${actual}"`
  );
}

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Flood Intelligence & Hydrology Audit');
console.log('=============================================================\n');

// ---------------------------------------------------------------------------
// SUITE 1: Central Water Commission (CWC) River Gauge Telemetry
// ---------------------------------------------------------------------------
console.log('--- Suite 1: CWC River Gauge Network & Haversine Distance ---');

const kotturuLoc = NATIONWIDE_BENCHMARK_LOCATIONS[0]; // Kotturu, Krishna Delta [80.842, 16.212]
const joshimathLoc = NATIONWIDE_BENCHMARK_LOCATIONS[1]; // Joshimath, Alaknanda [79.564, 30.558]
const majuliLoc = NATIONWIDE_BENCHMARK_LOCATIONS[2]; // Majuli Island, Brahmaputra [94.161, 26.963]

// Kotturu (Srikakulam) should find Gotta Barrage (Vamsadhara Basin) as nearest gauge (~1.97 km)
const kotturuGauges = getNearestCwcGauges(kotturuLoc.center, 3);
assert(kotturuGauges.length > 0, 'Kotturu has nearest CWC river gauges');
assert(
  kotturuGauges[0].stationId === 'cwc-vamsadhara-gotta-barrage' || kotturuGauges[0].stationId === 'cwc-krishna-machilipatnam-outfall',
  `Nearest gauge to Kotturu is Vamsadhara/Krishna river telemetry (${kotturuGauges[0].stationName})`
);
assert(kotturuGauges[0].distanceKm > 0 && kotturuGauges[0].distanceKm < 50, `Kotturu gauge distance is plausible (~${kotturuGauges[0].distanceKm.toFixed(1)}km)`);
assert(kotturuGauges[0].warningLevel_m > 0, 'Warning level is recorded');
assert(kotturuGauges[0].dangerLevel_m > kotturuGauges[0].warningLevel_m, 'Danger level exceeds warning level');
assert(kotturuGauges[0].hfl_m >= kotturuGauges[0].dangerLevel_m, 'Highest flood level (HFL) exceeds danger level');

// Majuli should find Neamati Ghat (Brahmaputra River) as nearest gauge
const majuliGauges = getNearestCwcGauges(majuliLoc.center, 3);
assert(majuliGauges.length > 0, 'Majuli has nearest CWC river gauges');
assertStrictEqual(majuliGauges[0].stationId, 'cwc-brahmaputra-neamatighat', 'Nearest gauge to Majuli is Neamati Ghat');
assert(majuliGauges[0].riverName.includes('Brahmaputra'), 'Neamati Ghat is on Brahmaputra River');
assert(majuliGauges[0].distanceKm < 25, `Neamati Ghat is close to Majuli Island (${majuliGauges[0].distanceKm.toFixed(1)}km)`);

// Joshimath should find Joshimath/Vishnuprayag (Alaknanda River) as nearest gauge
const joshimathGauges = getNearestCwcGauges(joshimathLoc.center, 3);
assert(joshimathGauges.length > 0, 'Joshimath has nearest CWC river gauges');
assertStrictEqual(joshimathGauges[0].stationId, 'cwc-alaknanda-joshimath', 'Nearest gauge to Joshimath is Joshimath / Vishnuprayag');
assert(joshimathGauges[0].riverName.includes('Alaknanda'), 'Station is on Alaknanda River');
assert(joshimathGauges[0].distanceKm < 5, `Joshimath gauge is in immediate vicinity (${joshimathGauges[0].distanceKm.toFixed(1)}km)`);

// ---------------------------------------------------------------------------
// SUITE 2: India Meteorological Department (IMD) Rainfall Telemetry
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: IMD Rainfall Warnings & QPF Forecast ---');

// Normal weather scenario (0mm observed)
const kotturuImdNormal = getImdRainfallTelemetry(kotturuLoc, 0);
assert(kotturuImdNormal.observedRainfall24h_mm >= 0, 'Rainfall observation non-negative');
assert(kotturuImdNormal.warningColor === 'green' || kotturuImdNormal.warningColor === 'yellow', 'Normal rainfall gives Green/Yellow advisory');
assert(kotturuImdNormal.qpf24h_mm >= 0, 'QPF 24h precipitation is populated');
assert(kotturuImdNormal.source.includes('India Meteorological Department'), 'Source is authoritative IMD');

// Very heavy rainfall scenario (85mm observed)
const kotturuImdHeavy = getImdRainfallTelemetry(kotturuLoc, 85);
assertStrictEqual(kotturuImdHeavy.warningColor, 'orange', '85mm rainfall triggers Orange Alert (64.5 - 115.5 mm)');
assert(kotturuImdHeavy.departurePercent > 100, 'Departure percent indicates heavy excess');

// Extreme deluge scenario (180mm observed)
const kotturuImdExtreme = getImdRainfallTelemetry(kotturuLoc, 180);
assertStrictEqual(kotturuImdExtreme.warningColor, 'red', '180mm rainfall triggers Red Warning (> 115.5 mm)');
assert(kotturuImdExtreme.advisoryText.includes('Evacuate') || kotturuImdExtreme.advisoryText.includes('inundation'), 'Red warning includes urgent safety guidance');

// ---------------------------------------------------------------------------
// SUITE 3: DEM Terrain Hydrology Flow Direction & Accumulation
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: DEM Terrain Hydrology & Bottlenecks ---');

const deltaHydro = deriveTerrainHydrology(kotturuLoc, 4.2);
assertStrictEqual(deltaHydro.terrainType, 'alluvial_delta_plains', 'Kotturu delta classified as alluvial_delta_plains');
assert(deltaHydro.meanSlope_deg < 1.0, `Delta slope is flat (${deltaHydro.meanSlope_deg}°)`);
assert(deltaHydro.flowAccumulationLines.features.length >= 2, 'Has generated overland flow pathways');
assert(deltaHydro.depressionNodes.features.length >= 2, 'Has identified natural ponding depressions');
assert(deltaHydro.bottlenecks.length >= 2, 'Has identified drainage culvert bottlenecks');
assert(deltaHydro.bottlenecks[0].chokeRatio > 1.5, `Culvert choke ratio is critical (${deltaHydro.bottlenecks[0].chokeRatio}x)`);

const himalayanHydro = deriveTerrainHydrology(joshimathLoc, 1890);
assertStrictEqual(himalayanHydro.terrainType, 'steep_hills', 'Joshimath classified as steep_hills');
assert(himalayanHydro.meanSlope_deg > 20, `Himalayan slope is steep (${himalayanHydro.meanSlope_deg}°)`);
assert(himalayanHydro.maxElevation_m > himalayanHydro.minElevation_m, 'Elevation span verified');

// ---------------------------------------------------------------------------
// SUITE 4: Hydrological Infrastructure Sizing Calculations
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Hydrological Engineering Formulas ---');

// CPWD/CGWB Rainwater Harvesting Yield: Y = C * P * A
// Catchment 450 sqm, 100mm rain (0.1m), runoff coefficient 0.85 (RCC roof)
// Yield = 450 * 0.1 * 0.85 = 38.25 m³ (~38.3 m³)
const rwh = calculateRainwaterHarvestingYield(450, 100, 0.85);
assert(Math.abs(rwh.harvestableVolume_m3 - 38.3) < 0.2, `RWH Yield formula accurate (${rwh.harvestableVolume_m3} m³)`);
assert(rwh.recommendedStorage_m3 > 0, 'RWH Storage capacity calculated');
assert(rwh.percolationRate_m3_day > 0, 'Groundwater percolation rate calculated');

// Retention Basin Sizing:
// peakInflow = 5.2 m³/s, downstreamCapacity = 1.8 m³/s, durationHours = 4
const basin = calculateRetentionBasinSizing(5.2, 1.8, 4);
assert(basin.requiredStorage_m3 > 5000, `Retention storage volume calculated (${basin.requiredStorage_m3.toLocaleString()} m³)`);
assertStrictEqual(basin.attenuationPercent, 65, 'Peak flow attenuation calculated correctly (65%)');
assert(basin.expectedDepthReduction_m > 0, 'Flood depth reduction calculated');

// Manning's Drainage Capacity Upgrade:
// requiredDischarge = 3.8 m³/s, slope_percent = 0.35%
const drainUpgrade = calculateDrainageCapacityUpgrade(3.8, 0.35);
assert(drainUpgrade.conveyanceCapacity_m3s >= 3.0, `Upgraded channel capacity verified (${drainUpgrade.conveyanceCapacity_m3s} m³/s)`);
assert(drainUpgrade.recommendedWidth_m > 0 && drainUpgrade.recommendedDepth_m > 0, 'Channel dimensions specified');
assert(drainUpgrade.downstreamBackwaterRisk === 'low' || drainUpgrade.downstreamBackwaterRisk === 'moderate', 'Backwater risk classified');

// MCDA 5-Criterion Multi-Criteria Decision Analysis
const mcdaScore = calculateMcdaSuitabilityScore({
  hazardMitigation: 28,
  accessibility: 23,
  terrainSuitability: 18,
  populationServed: 14,
  costViability: 8,
});
assertStrictEqual(mcdaScore, 91, 'MCDA composite score calculated correctly (91/100)');

// ---------------------------------------------------------------------------
// SUITE 5: Dynamic Flood-Aware Evacuation Routing
// ---------------------------------------------------------------------------
console.log('\n--- Suite 5: Flood-Aware Evacuation Routing Engine ---');

const mockSimulationResult = {
  scenario: 'existing_drainage' as const,
  peakHour: 3,
  peakDepth_m: 0.65,
  affectedBuildings: [],
  affectedRoads: [
    { id: 'rd-1', name: 'Kotturu Main Village Road', depth_m: 0.12, impassable: false },
    { id: 'rd-2', name: 'Temple Lane', depth_m: 0.38, impassable: true }, // Exceeds 25cm
    { id: 'rd-3', name: 'High School Access Way', depth_m: 0.08, impassable: false },
    { id: 'rd-4', name: 'North Ridge Evacuation Road', depth_m: 0.0, impassable: false },
  ],
  frames: [],
} as any;

// Evacuation routing with default 25cm (0.25m) threshold
const evacRoutes25cm = calculateFloodAwareEvacuationRoutes(DEMO_VILLAGE, mockSimulationResult, 0.25);
assert(evacRoutes25cm.length >= 2, 'Generated primary and secondary evacuation routes');
const primary25 = evacRoutes25cm[0];
assertStrictEqual(primary25.roadClosureThreshold_m, 0.25, 'Route respects 0.25m threshold');
assert(primary25.totalDistance_m > 0, 'Route total distance is positive');
assert(primary25.estimatedWalkingMinutes > 0, 'Walking time calculated');
assert(primary25.segments.length > 0, 'Contains road segments');
assert(primary25.instructions.length >= 3, 'Provides clear step-by-step navigation instructions');
assert(primary25.safetyCaveats.length >= 2, 'Includes essential safety caveats');

// Stricter 15cm (0.15m) threshold for vulnerable groups
const evacRoutes15cm = calculateFloodAwareEvacuationRoutes(DEMO_VILLAGE, mockSimulationResult, 0.15);
assertStrictEqual(evacRoutes15cm[0].roadClosureThreshold_m, 0.15, 'Route respects 0.15m conservative threshold');

console.log('\n=============================================================');
console.log(` Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('=============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

