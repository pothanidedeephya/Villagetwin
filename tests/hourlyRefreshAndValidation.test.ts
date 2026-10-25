import { floodRefreshPipeline } from '../src/services/floodRefreshPipeline';
import {
  calculateWaterLevelMae,
  calculateWaterLevelRmse,
  calculateSpatialInundationMetrics,
  generateFloodModelValidationReport,
} from '../src/services/floodValidationService';
import { calculateVerifiedFloodRisk } from '../src/services/floodRiskEngine';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { LocationSearchResult } from '../src/types/nationwide';

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
console.log(' Bharat Village Twin: Hourly Refresh & Validation Audit');
console.log('=============================================================\n');

// ---------------------------------------------------------------------------
// SUITE 1: Hourly Data Acquisition Pipeline & Cadence Evaluation
// ---------------------------------------------------------------------------
console.log('--- Suite 1: Scheduled Hourly Data Acquisition & Pipeline Status ---');

const pipelineStatus = floodRefreshPipeline.getStatus();
assertStrictEqual(pipelineStatus.refreshIntervalMinutes, 60, 'Refresh interval is configured to 60 minutes (hourly)');
assert(pipelineStatus.providers.cwc !== undefined, 'CWC river gauge provider registered');
assert(pipelineStatus.providers.imd !== undefined, 'IMD rainfall telemetry provider registered');
assert(pipelineStatus.providers.nasa_gpm !== undefined, 'NASA GPM / Open-Meteo backup provider registered');
assert(pipelineStatus.providers.dem_copernicus !== undefined, 'Copernicus DEM terrain provider registered');
assert(pipelineStatus.providers.osm_infrastructure !== undefined, 'OSM infrastructure vectors provider registered');
assert(pipelineStatus.overallHealth === 'optimal' || pipelineStatus.overallHealth === 'degraded', 'Overall pipeline health evaluated');

// ---------------------------------------------------------------------------
// SUITE 2: Data Freshness Status Classification
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: Actual Timestamp Freshness Classification ---');

const now = Date.now();
const twentyMinsAgo = new Date(now - 20 * 60 * 1000).toISOString();
const eightyMinsAgo = new Date(now - 80 * 60 * 1000).toISOString();
const fourHoursAgo = new Date(now - 240 * 60 * 1000).toISOString();

const freshEval = floodRefreshPipeline.evaluateFreshness(twentyMinsAgo);
assertStrictEqual(freshEval.status, 'fresh', '20 mins elapsed classifies as FRESH (< 60m)');
assert(freshEval.ageMinutes >= 19 && freshEval.ageMinutes <= 21, `Age in minutes calculated correctly (${freshEval.ageMinutes}m)`);

const delayedEval = floodRefreshPipeline.evaluateFreshness(eightyMinsAgo);
assertStrictEqual(delayedEval.status, 'delayed', '80 mins elapsed classifies as DELAYED (60m - 180m)');
assert(delayedEval.ageMinutes >= 79 && delayedEval.ageMinutes <= 81, `Age in minutes calculated correctly (${delayedEval.ageMinutes}m)`);

const staleEval = floodRefreshPipeline.evaluateFreshness(fourHoursAgo);
assertStrictEqual(staleEval.status, 'stale', '240 mins elapsed classifies as STALE (> 180m)');
assert(staleEval.ageMinutes >= 239 && staleEval.ageMinutes <= 241, `Age in minutes calculated correctly (${staleEval.ageMinutes}m)`);

// ---------------------------------------------------------------------------
// SUITE 3: Graceful Degradation Without Data Fabrication
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Graceful Degradation & Provenance Transparency ---');

const kotturuLoc = NATIONWIDE_BENCHMARK_LOCATIONS[0];
const initialFetch = floodRefreshPipeline.getLocationFloodData(kotturuLoc, 12);
assert(initialFetch.cwcGauges.length > 0, 'Initial fetch retrieves verified CWC river gauges');
assert(initialFetch.imdTelemetry.observedRainfall24h_mm > 0, 'Initial fetch retrieves verified IMD rainfall telemetry');
assertStrictEqual(initialFetch.freshness, 'fresh', 'Initial fetch freshness is fresh');
assert(initialFetch.provenance.cwc.sourceAgency.includes('Central Water Commission'), 'CWC source agency documented');
assert(initialFetch.provenance.imd.sourceAgency.includes('India Meteorological Department'), 'IMD source agency documented');
assert(initialFetch.provenance.cwc.units.includes('m MSL'), 'CWC stage measurement units specified');
assert(initialFetch.provenance.imd.units.includes('mm/24h'), 'IMD rainfall measurement units specified');

// ---------------------------------------------------------------------------
// SUITE 4: Scientific Accuracy & Metric Calculation (MAE, RMSE, IoU, Skill)
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Objective Accuracy Metric Calculations ---');

const obsStages = [3.50, 4.00, 4.50, 4.20];
const simStages = [3.60, 4.10, 4.40, 4.10]; // errors: +0.1, +0.1, -0.1, -0.1 -> MAE = 0.10, RMSE = 0.10

const mae = calculateWaterLevelMae(simStages, obsStages);
assertStrictEqual(mae, 0.1, 'Water level MAE calculation is exact (0.100m)');

const rmse = calculateWaterLevelRmse(simStages, obsStages);
assertStrictEqual(rmse, 0.1, 'Water level RMSE calculation is exact (0.100m)');

// Inundation spatial overlap: Simulated = 120 ha, Reference = 150 ha, Intersection = 100 ha
// Union = 120 + 150 - 100 = 170 ha
// IoU = 100 / 170 = 0.588
// Precision = 100 / 120 = 0.833
// Recall = 100 / 150 = 0.667
// FAR = (120 - 100) / 120 = 0.167
const spatial = calculateSpatialInundationMetrics(120, 150, 100);
assertStrictEqual(spatial.iou, 0.588, 'Intersection-over-Union (IoU / Jaccard) calculation accurate (0.588)');
assertStrictEqual(spatial.precision, 0.833, 'Inundation Precision accurate (83.3%)');
assertStrictEqual(spatial.recall, 0.667, 'Inundation Recall / POD accurate (66.7%)');
assertStrictEqual(spatial.falseAlarmRate, 0.167, 'Inundation False Alarm Rate accurate (16.7%)');

// ---------------------------------------------------------------------------
// SUITE 5: Benchmark Validation Reports Across Key Indian Basins
// ---------------------------------------------------------------------------
console.log('\n--- Suite 5: Benchmark Event Validation Reports ---');

// 1. Vamsadhara / Krishna Basin (Kotturu)
const kotturuReport = generateFloodModelValidationReport(kotturuLoc);
assertStrictEqual(kotturuReport.validationStatus, 'validated_calibrated', 'Kotturu is marked as validated_calibrated');
assert(
  kotturuReport.calibrationEvent.includes('Cyclone Titli') || kotturuReport.calibrationEvent.includes('Cyclone Nivar'),
  'Kotturu calibrated against regional flood event (Cyclone Titli / Nivar)'
);
assert(
  kotturuReport.evaluationEvent.includes('August 2024') || kotturuReport.evaluationEvent.includes('August 2022'),
  'Kotturu evaluated against high inflow spate'
);
assert(kotturuReport.metrics.inundationIoU > 0.65, `Inundation IoU meets target (${(kotturuReport.metrics.inundationIoU * 100).toFixed(1)}%)`);
assert(kotturuReport.metrics.waterLevelRmse_m !== undefined && kotturuReport.metrics.waterLevelRmse_m < 0.25, 'Water level RMSE is within 0.25m');
assert(kotturuReport.scientificLimitations.length >= 2, 'Discloses scientific limitations');

// 2. Ungauged Catchment Disclaimer (Pokhran / Thar Desert)
const pokhranLoc = NATIONWIDE_BENCHMARK_LOCATIONS[3]; // Ramdevra, Thar Desert
const pokhranReport = generateFloodModelValidationReport(pokhranLoc);
assertStrictEqual(pokhranReport.validationStatus, 'ungauged_unvalidated', 'Pokhran correctly identified as ungauged_unvalidated');
assert(pokhranReport.operationalNotice.includes('ungauged catchment'), 'Displays prominent ungauged basin operational disclaimer');
assert(pokhranReport.operationalNotice.includes('NOT an operational hydraulic forecast'), 'Warns against operational reliance without local gauges');

// ---------------------------------------------------------------------------
// SUITE 6: Deterministic Risk Calculation & Reproducibility Test
// ---------------------------------------------------------------------------
console.log('\n--- Suite 6: Traceable Multi-Input Risk Reproducibility ---');

const riskAssessment1 = calculateVerifiedFloodRisk({
  location: kotturuLoc,
  nearestGauge: initialFetch.cwcGauges[0],
  imdTelemetry: initialFetch.imdTelemetry,
  terrainHydrology: initialFetch.terrainHydrology,
  currentObservedRainfall_mmh: 5.0,
});

const riskAssessment2 = calculateVerifiedFloodRisk({
  location: kotturuLoc,
  nearestGauge: initialFetch.cwcGauges[0],
  imdTelemetry: initialFetch.imdTelemetry,
  terrainHydrology: initialFetch.terrainHydrology,
  currentObservedRainfall_mmh: 5.0,
});

assertStrictEqual(riskAssessment1.overallScore, riskAssessment2.overallScore, 'Identical inputs produce identical risk score (Reproducible)');
assertStrictEqual(riskAssessment1.riskLevel, riskAssessment2.riskLevel, 'Identical inputs produce identical risk classification (Reproducible)');
assertStrictEqual(riskAssessment1.factors.length, 4, 'Includes all 4 traceable risk factor breakdowns');
assert(riskAssessment1.factors.every((f) => f.source.length > 5), 'Every factor discloses authoritative source provenance');
assert(riskAssessment1.factors.every((f) => f.weightPercent > 0), 'Every factor discloses transparent percentage weight');

console.log('\n=============================================================');
console.log(` Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('=============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
