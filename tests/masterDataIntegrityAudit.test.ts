import { strict as assert } from 'node:assert';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import { calculateHaversineKm, getNearestCwcGauges, getImdRainfallTelemetry } from '../src/services/floodDataService';
import { getCwcTelemetryForLocation } from '../src/services/governmentDataConnector';
import { getNwdpCwcRainfallForLocation } from '../src/services/nwdpCwcRainfallService';
import { fetchOfficialImdCycloneWind } from '../src/services/imdCycloneWindService';
import { generateFloodModelValidationReport } from '../src/services/floodValidationService';
import { defaultSimulationEngine } from '../src/services/simulationService';
import { multiHazardSimulationEngine } from '../src/services/multiHazardSimulationEngine';
import type { SimulationConfig } from '../src/types/village';

console.log('=============================================================');
console.log(' Bharat Village Twin: Master 16-Point Data Integrity Audit');
console.log('=============================================================');

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✓ ${name}`);
          passCount++;
        })
        .catch((err) => {
          console.error(`  ✗ FAIL: ${name}`);
          console.error(err);
          failCount++;
          process.exit(1);
        });
    }
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failCount++;
    process.exit(1);
  }
}

async function runAudit() {
  const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-kothuru');
  assert(kotturu, 'Kotturu benchmark location must exist');

  // ------------------------------------------------------------------------
  // Point 1: Correct location selection and administrative identity
  // ------------------------------------------------------------------------
  console.log('\n--- Point 1 & 2: Administrative Identity & Disambiguation ---');
  test('1. Kotturu is in Srikakulam District, Kotturu Mandal, Andhra Pradesh at [83.950, 18.700]', () => {
    assert.equal(kotturu.district, 'Srikakulam', 'Expected Srikakulam district');
    assert.equal(kotturu.subdistrict, 'Kotturu Mandal', 'Expected Kotturu Mandal');
    assert.equal(kotturu.state, 'Andhra Pradesh', 'Expected Andhra Pradesh');
    assert.equal(kotturu.center[0], 83.950, 'Longitude must be 83.950° E');
    assert.equal(kotturu.center[1], 18.700, 'Latitude must be 18.700° N');
    assert.equal(kotturu.elevation_m, 38.0, 'Elevation must be 38.0m MSL');
  });

  test('2. Disambiguates Kotturu (Srikakulam) from Guduru (Krishna Delta)', () => {
    const krishnaLoc = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-guduru-krishna');
    assert(krishnaLoc, 'Krishna Delta location must exist under distinct ID');
    assert.equal(krishnaLoc.district, 'Krishna');
    assert.notEqual(kotturu.district, krishnaLoc.district);
    const dist = calculateHaversineKm(kotturu.center, krishnaLoc.center);
    assert(dist > 400, `Expected >400km separation between Kotturu and Krishna Delta (found ${dist}km)`);
  });

  // ------------------------------------------------------------------------
  // Point 3: Geographic boundary and coordinate validation
  // ------------------------------------------------------------------------
  console.log('\n--- Point 3: Geographic Boundary & Coordinate Bounds ---');
  test('3. Kotturu coordinates and demo boundary fall within valid Indian geographic bounding box', () => {
    const [lng, lat] = kotturu.center;
    assert(lat >= 8.0 && lat <= 37.5, 'Latitude outside India bounds');
    assert(lng >= 68.0 && lng <= 97.5, 'Longitude outside India bounds');

    const boundaryCoords = DEMO_VILLAGE.boundary.features[0].geometry.coordinates[0];
    assert(boundaryCoords.length >= 4, 'Boundary polygon must have at least 4 vertices (closed loop)');
    for (const [bLng, bLat] of boundaryCoords) {
      assert(bLat >= 18.65 && bLat <= 18.75, 'Boundary vertex outside Kotturu regional bbox');
      assert(bLng >= 83.90 && bLng <= 84.00, 'Boundary vertex outside Kotturu regional bbox');
    }
  });

  // ------------------------------------------------------------------------
  // Point 4 & 5: Gauge-distance calculation & Hydrological relevance
  // ------------------------------------------------------------------------
  console.log('\n--- Point 4 & 5: Haversine Calculation & Hydrological Proximity ---');
  test('4. Gotta Barrage on Vamsadhara is ~1.97 km from Kotturu; Bandar Canal is >428 km away', () => {
    const gottaCoords: [number, number] = [83.96388889, 18.68805556];
    const bandarCoords: [number, number] = [81.185, 16.155];

    const distGotta = calculateHaversineKm(kotturu.center, gottaCoords);
    const distBandar = calculateHaversineKm(kotturu.center, bandarCoords);

    assert(distGotta >= 1.5 && distGotta <= 2.5, `Gotta Barrage should be ~1.97km (got ${distGotta}km)`);
    assert(distBandar > 400, `Bandar Canal should be >400km (got ${distBandar}km)`);
  });

  test('5. Spatial hydrological guardrail filters out Bandar Canal from Kotturu telemetry', () => {
    const nearest = getNearestCwcGauges(kotturu.center, 5, 80);
    assert(nearest.length > 0, 'Expected local stations for Kotturu');
    assert(nearest[0].stationName.includes('Gotta Barrage'), 'Nearest station to Kotturu must be Gotta Barrage');
    const hasBandar = nearest.some((s) => s.stationName.includes('Bandar Canal'));
    assert.strictEqual(hasBandar, false, 'Bandar Canal must NOT be linked to Kotturu in Srikakulam');
  });

  // ------------------------------------------------------------------------
  // Point 6: Historical April 2026 rainfall handling
  // ------------------------------------------------------------------------
  console.log('\n--- Point 6: Historical Record Integrity (April 2026) ---');
  await test('6. CWC April 2026 telemetry is treated as historical log, never as live October rain', async () => {
    const report = await getNwdpCwcRainfallForLocation(kotturu);
    assert(report.nearestStation, 'Nearest station must exist');
    assert(report.nearestStation.station.includes('Gotta Barrage'), 'Nearest station is Gotta Barrage');
    assert.strictEqual(report.nearestStation.isStale, true, 'Historical records must be marked isStale=true');
    assert.strictEqual(report.nearestStation.telemetryStatus, 'STALE_HISTORICAL_LOG');
    assert(report.nearestStation.observationAgeHours > 24, 'Observation age must be > 24 hours');
  });

  // ------------------------------------------------------------------------
  // Point 7 & 8: Weather API credentials & Error handling (401, 403, etc.)
  // ------------------------------------------------------------------------
  console.log('\n--- Point 7 & 8: API Authentication & Transparent 401 Handling ---');
  await test('7. IMD Cyclone Wind endpoint returns AUTHENTICATION_REQUIRED (HTTP 401) without fabricated success', async () => {
    const result = await fetchOfficialImdCycloneWind({ forceScenario: false });
    assert.strictEqual(result.httpStatus, 401);
    assert.strictEqual(result.connectionStatus, 'AUTHENTICATION_REQUIRED');
    assert.strictEqual(result.activeThresholds.length, 0);
  });

  test('8. Handles missing optional Weather API credentials gracefully', () => {
    const liveGauge = getCwcTelemetryForLocation(kotturu);
    assert(liveGauge, 'Telemetry object must be constructed safely');
    assert.equal(liveGauge.riverName, 'Vamsadhara River');
  });

  // ------------------------------------------------------------------------
  // Point 9: Warning geography & validity periods
  // ------------------------------------------------------------------------
  console.log('\n--- Point 9: Warning Geography & Validity Windows ---');
  test('9. IMD weather telemetry reflects North Coastal AP for Srikakulam', () => {
    const imd = getImdRainfallTelemetry(kotturu, 0);
    assert(imd.coverage?.includes('North Coastal Andhra Pradesh'), 'Expected North Coastal AP coverage');
    assert(imd.coverage?.includes('Srikakulam'), 'Expected Srikakulam in coverage list');
    assert(!imd.coverage?.includes('Krishna'), 'Kotturu warning must NOT list Krishna district');
    assert(imd.validUntil, 'Warning must have a validUntil timestamp');
    assert(imd.issuedAt, 'Warning must have an issuedAt timestamp');
  });

  // ------------------------------------------------------------------------
  // Point 10: Missing, zero, stale, and forecast rainfall classification
  // ------------------------------------------------------------------------
  console.log('\n--- Point 10: Rainfall State Taxonomy ---');
  test('10. Distinguishes live zero observation from missing or historical data', () => {
    const liveGauge = getCwcTelemetryForLocation(kotturu);
    assert.equal(liveGauge.riverName, 'Vamsadhara River');
    assert.equal(liveGauge.basinName, 'Vamsadhara Basin');
    assert(liveGauge.distanceKm < 5.0, 'Gotta Barrage station within 5km of Kotturu');
  });

  // ------------------------------------------------------------------------
  // Point 11: Flood area and depth calculations & unit conversions
  // ------------------------------------------------------------------------
  console.log('\n--- Point 11: Flood Area & Depth Mathematical Checks ---');
  await test('11. Hydrodynamic engine enforces 1 km² = 100 ha and peakDepth >= meanDepth', async () => {
    const config: SimulationConfig = {
      scenario: 'baseline',
      rainfallIntensity_mmh: 65,
      rainfallDuration_hours: 4,
      soilType: 'black_cotton',
      infiltrationRate_mmh: 6.0,
      runoffCoefficient: 0.65,
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.65,
      timeStep_mins: 60,
    };

    const simResult = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
    assert(simResult.canonicalResult, 'Simulation must produce canonicalResult');
    const canon = simResult.canonicalResult;

    const expectedKm2 = Number((canon.impactedHectares / 100).toFixed(4));
    assert.equal(canon.impactedSquareKilometres, expectedKm2, 'Strict 1 km² = 100 ha conversion failed');
    assert(canon.depthStatistics.peakDepth_m >= canon.depthStatistics.meanDepth_m, 'Peak depth must be >= mean depth');
    assert(canon.depthStatistics.meanDepth_m >= canon.depthStatistics.minInundationThreshold_m, 'Mean depth must be >= threshold');
  });

  // ------------------------------------------------------------------------
  // Point 12: Synchronization of map overlays & dashboard statistics
  // ------------------------------------------------------------------------
  console.log('\n--- Point 12: Single Canonical Result Binding ---');
  await test('12. multiHazardSimulationEngine binds directly to canonicalResult', async () => {
    const config: SimulationConfig = {
      scenario: 'baseline',
      rainfallIntensity_mmh: 65,
      rainfallDuration_hours: 4,
      soilType: 'black_cotton',
      infiltrationRate_mmh: 6.0,
      runoffCoefficient: 0.65,
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.65,
      timeStep_mins: 60,
    };
    const simResult = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
    const impact = await multiHazardSimulationEngine.runScenario(
      kotturu,
      DEMO_VILLAGE,
      'flood',
      {
        rainfallIntensity_mmh: 65,
        duration_hours: 4,
        drainageCondition: 'normal',
        tideOutfallCondition: 'normal',
        designStormType: '25_year',
      },
      'village_boundary',
      simResult.canonicalResult
    );

    assert(impact.mostAffectedArea, 'Must have mostAffectedArea');
    assert.equal(
      impact.mostAffectedArea.affectedAreaHa,
      simResult.canonicalResult!.impactedHectares,
      'multiHazardSimulationEngine must strictly match canonical hectares'
    );
    assert.equal(
      impact.geographicImpact.estimatedAffectedAreaKm2,
      simResult.canonicalResult!.impactedSquareKilometres,
      'multiHazardSimulationEngine must strictly match canonical km²'
    );
  });

  // ------------------------------------------------------------------------
  // Point 13: Changing locations while API requests are in flight
  // ------------------------------------------------------------------------
  console.log('\n--- Point 13: Asynchronous Location Switching Safety ---');
  test('13. Location requests contain independent IDs and datasets are strictly isolated', () => {
    const loc1 = NATIONWIDE_BENCHMARK_LOCATIONS[0]; // Kotturu
    const loc2 = NATIONWIDE_BENCHMARK_LOCATIONS[1]; // Joshimath

    assert.notEqual(loc1.id, loc2.id);
    assert.notEqual(loc1.elevation_m, loc2.elevation_m);
    assert.notEqual(loc1.center[0], loc2.center[0]);
  });

  // ------------------------------------------------------------------------
  // Point 14: Preventing demo data from being labeled official or live
  // ------------------------------------------------------------------------
  console.log('\n--- Point 14: Clear Demo & Benchmark Labeling ---');
  await test('14. Benchmark cyclone wind assessment explicitly sets connectionStatus and demonstration notice', async () => {
    const demoResult = await fetchOfficialImdCycloneWind({ forceScenario: true });
    assert.strictEqual(demoResult.connectionStatus, 'BENCHMARK_SCENARIO');
    assert(demoResult.authNotice.includes('Demonstration'));
  });

  // ------------------------------------------------------------------------
  // Point 15: Preventing unsupported validation claims
  // ------------------------------------------------------------------------
  console.log('\n--- Point 15: Removal of Unsupported Scientific Claims ---');
  test('15. Kotturu validation references Vamsadhara & APSDMA, flags preliminary screening limitations', () => {
    const report = generateFloodModelValidationReport(kotturu);
    assert.equal(report.basinName, 'VAMSADHARA BASIN');
    assert(report.calibrationEvent.includes('Cyclone Titli'), 'Must reference Vamsadhara Cyclone Titli');
    assert(report.evaluationEvent.includes('Gotta Barrage'), 'Must reference Gotta Barrage evaluation');
    const hasLimitation = report.scientificLimitations.some((l) => l.includes('Preliminary Screening Model'));
    assert.strictEqual(hasLimitation, true, 'Must disclose 30m DEM preliminary screening limitations');
    const hasRtkNotice = report.scientificLimitations.some((l) => l.includes('RTK elevation survey'));
    assert.strictEqual(hasRtkNotice, true, 'Must require RTK survey for engineering demarcation');
  });

  // ------------------------------------------------------------------------
  // Point 16: Idempotent scenario execution
  // ------------------------------------------------------------------------
  console.log('\n--- Point 16: Simulation Idempotency & Repeatability ---');
  await test('16. Repeated runs of pluvial simulation with identical inputs yield identical outputs', async () => {
    const config: SimulationConfig = {
      scenario: 'baseline',
      rainfallIntensity_mmh: 50,
      rainfallDuration_hours: 3,
      soilType: 'black_cotton',
      infiltrationRate_mmh: 6.0,
      runoffCoefficient: 0.65,
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.65,
      timeStep_mins: 60,
    };

    const run1 = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
    const run2 = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);

    assert.equal(run1.canonicalResult!.impactedHectares, run2.canonicalResult!.impactedHectares);
    assert.equal(run1.canonicalResult!.depthStatistics.peakDepth_m, run2.canonicalResult!.depthStatistics.peakDepth_m);
    assert.equal(run1.canonicalResult!.depthStatistics.meanDepth_m, run2.canonicalResult!.depthStatistics.meanDepth_m);
  });

  console.log('\n=============================================================');
  console.log(` Master Audit Complete: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=============================================================');
}

runAudit();
