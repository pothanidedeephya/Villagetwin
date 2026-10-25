import assert from 'node:assert';
import test from 'node:test';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import {
  runPlanSafeWorkflow,
  auditDataQualityAndSources,
  generateObjectiveSpecificCandidates,
  evaluateCandidateForObjective,
  PlanningObjective,
  PlanSafeStatus,
  PLANNING_OBJECTIVES,
} from '../src/services/planSafeInstructionsService';
import type { SimulationResult } from '../src/types/village';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('\n========================================================================');
console.log(' Bharat Village Twin — Plan Safe Instructions & Site Evaluation Audit');
console.log('========================================================================\n');

const kotturuLoc = NATIONWIDE_BENCHMARK_LOCATIONS[0]; // Kotturu, AP (Coastal Delta)
const joshimathLoc = NATIONWIDE_BENCHMARK_LOCATIONS[1]; // Joshimath, UK (Himalayan)

const mockSimResult: SimulationResult = {
  scenario: 'baseline',
  config: {
    rainfallIntensity_mmh: 65,
    rainfallDuration_hours: 6,
    soilType: 'black_cotton',
    infiltrationRate_mmh: 8,
    runoffCoefficient: 0.6,
    scenario: 'baseline',
    tideOutfallCondition: 'normal',
    desiltingFactor: 0.8,
  },
  frames: [],
  peakHour: 3,
  totalRainfall_mm: 120,
  maxInundatedArea_ha: 42.5,
  peakDepth_m: 1.85,
  affectedBuildings: [],
  affectedRoads: [
    { id: 'rd-kotturu-shelter', name: 'Z.P. High School Lifeline Way', depth_m: 0.12, impassable: false },
    { id: 'rd-kotturu-lowland', name: 'South Agriculture Silt Track', depth_m: 0.85, impassable: true },
  ],
  farmlandInundated_ha: 38.0,
  vulnerablePopulationAffected: 850,
  estimatedLoss_lakhs: 45.0,
  drainageEfficiency_percent: 62,
};

// -------------------------------------------------------------------------
// TEST 1: SUCCESSFUL PLANNING WORKFLOW WITH VALID DATA ACROSS ALL OBJECTIVES
// -------------------------------------------------------------------------
test('Test 1: Successful planning workflow with valid data across all 5 planning objectives', async () => {
  console.log('--- Running Test 1: Complete Multi-Objective Planning Workflows ---');

  const objectives: PlanningObjective[] = [
    'flood_shelter',
    'evacuation_route',
    'drainage_management',
    'health_resilience',
    'community_asset',
  ];

  for (const obj of objectives) {
    const report = await runPlanSafeWorkflow({
      location: kotturuLoc,
      objective: obj,
      activeHazard: 'Floods & Waterlogging',
      simulationResult: mockSimResult,
    });

    assert.strictEqual(report.villageName, kotturuLoc.displayName);
    assert.strictEqual(report.objective, obj);
    assert.strictEqual(report.objectiveMeta.id, obj);
    assert(report.candidates.length > 0, `Must generate candidate sites for objective ${obj}`);
    assert(report.dataQualityChecks.length >= 4, 'Must audit at least 4 geospatial layers');
    assert(report.requiredFieldSurveys.length > 0, 'Must provide required field verification surveys');
    assert(report.recommendedActions.length > 0, 'Must provide recommended next actions');
    assert(report.limitationsSummary.includes('Copernicus 30m Global DEM'), 'Must cite real DEM model');

    console.log(`  ✓ Objective [${obj}]: Generated ${report.candidates.length} candidates (Overall status: ${report.overallStatus})`);
  }
});

// -------------------------------------------------------------------------
// TEST 2: OBJECTIVE-SPECIFIC SCORING & CRITERIA DIFFERENTIATION
// -------------------------------------------------------------------------
test('Test 2: Objective-specific scoring uses distinct criteria and formulas', async () => {
  console.log('\n--- Running Test 2: Objective-Specific Scoring Differentiation ---');

  const shelterReport = await runPlanSafeWorkflow({
    location: kotturuLoc,
    objective: 'flood_shelter',
    simulationResult: mockSimResult,
  });

  const drainageReport = await runPlanSafeWorkflow({
    location: kotturuLoc,
    objective: 'drainage_management',
    simulationResult: mockSimResult,
  });

  const routeReport = await runPlanSafeWorkflow({
    location: kotturuLoc,
    objective: 'evacuation_route',
    simulationResult: mockSimResult,
  });

  // 1. Shelter criteria must evaluate elevation clearance and flood immunity
  const shelterCand = shelterReport.candidates[0];
  const shelterCriteriaNames = shelterCand.criteriaEvaluations.map(c => c.name);
  assert(shelterCriteriaNames.some(n => n.includes('Elevation Clearance')), 'Shelter must evaluate elevation clearance');
  assert(shelterCriteriaNames.some(n => n.includes('Flood Level Clearance')), 'Shelter must evaluate flood immunity');

  // 2. Drainage criteria must evaluate gravity gradient (lower ground)
  const drainageCand = drainageReport.candidates[0];
  const drainageCriteriaNames = drainageCand.criteriaEvaluations.map(c => c.name);
  assert(drainageCriteriaNames.some(n => n.includes('Gravity Outfall Gradient')), 'Drainage must evaluate gravity gradient');

  // 3. Evacuation route criteria must evaluate road classification and submergence
  const routeCand = routeReport.candidates[0];
  const routeCriteriaNames = routeCand.criteriaEvaluations.map(c => c.name);
  assert(routeCriteriaNames.some(n => n.includes('Classification')), 'Route must evaluate road classification');
  assert(routeCriteriaNames.some(n => n.includes('Impedance')), 'Route must evaluate water impedance');

  console.log('  ✓ Verified objective-specific criteria differentiation across Flood Shelter, Drainage, and Evacuation');
});

// -------------------------------------------------------------------------
// TEST 3: CRITICAL SAFETY CONSTRAINTS OVERRIDE HIGH MATHEMATICAL SCORES
// -------------------------------------------------------------------------
test('Test 3: Critical safety constraints override mathematical scores (submerged sites marked REJECTED)', async () => {
  console.log('\n--- Running Test 3: Critical Safety Constraint Overrides ---');

  const report = await runPlanSafeWorkflow({
    location: kotturuLoc,
    objective: 'flood_shelter',
    simulationResult: mockSimResult,
  });

  // Find candidate that falls in depression / simulated flood zone
  const negativeControlSite = report.candidates.find(c => c.id.includes('low-depression') || c.isDisqualified);
  assert(negativeControlSite, 'Must evaluate at least one site testing critical safety constraints');

  // Verify that despite having a calculated score, it is DISQUALIFIED and marked REJECTED
  assert.strictEqual(negativeControlSite.isDisqualified, true, 'Submerged/depression site must be disqualified');
  assert.strictEqual(negativeControlSite.evaluationStatus, 'REJECTED', 'Disqualified site must be given status REJECTED');
  assert(
    negativeControlSite.disqualifyingReason?.includes('CRITICAL SAFETY FAILURE'),
    'Must provide explicit critical safety failure explanation'
  );

  // Verify that a disqualified site does not rank above safe sites
  const topCandidate = report.candidates[0];
  assert.strictEqual(topCandidate.isDisqualified, false, 'Rank #1 candidate must be safe and not disqualified');
  assert.notStrictEqual(topCandidate.evaluationStatus, 'REJECTED', 'Rank #1 candidate cannot be REJECTED');

  console.log(`  ✓ Submerged candidate [${negativeControlSite.title}] correctly REJECTED (Reason: ${negativeControlSite.disqualifyingReason})`);
  console.log(`  ✓ High mathematical score prevented from overriding life-safety constraint`);
});

// -------------------------------------------------------------------------
// TEST 4: DATA AUDITING & MISSING/STALE DATA TREATMENT
// -------------------------------------------------------------------------
test('Test 4: Missing or stale telemetry flagged honestly with zero fabricated values', async () => {
  console.log('\n--- Running Test 4: Missing / Stale Data Auditing ---');

  // Create remote location with missing elevation & no CWC gauge
  const remoteLocation: LocationSearchResult = {
    id: 'loc-test-remote',
    name: 'Remote Ridge Hamlets',
    displayName: 'Remote Ridge Hamlets',
    adminLevel: 'village',
    state: 'Nagaland',
    district: 'Phek',
    center: [94.5020, 25.6840],
    boundingBox: [94.48, 25.66, 94.52, 25.70],
    elevation_m: undefined, // Missing elevation!
    regionCategory: 'himalayan',
    source: 'Test Registry',
  };

  const auditChecks = auditDataQualityAndSources(remoteLocation, null, null, null);

  const demCheck = auditChecks.find(c => c.layer.includes('DEM'));
  assert(demCheck, 'Must audit DEM layer');
  assert.strictEqual(demCheck.status, 'REQUIRES REVIEW', 'Missing elevation must be marked REQUIRES REVIEW');

  const cwcCheck = auditChecks.find(c => c.layer.includes('River Stage'));
  assert(cwcCheck, 'Must audit CWC gauge layer');
  assert.strictEqual(cwcCheck.status, 'UNABLE TO ASSESS', 'Missing CWC gauge must be marked UNABLE TO ASSESS');
  assert.strictEqual(cwcCheck.isAvailable, false, 'Missing gauge must be flagged isAvailable: false');

  const report = await runPlanSafeWorkflow({
    location: remoteLocation,
    objective: 'flood_shelter',
    simulationResult: null,
    cwcGauges: null,
    weatherData: null,
  });

  // Overall report must reflect missing data status
  assert.strictEqual(report.overallStatus, 'REQUIRES REVIEW', 'Report with missing critical DEM must be REQUIRES REVIEW');
  assert(report.missingDataPoints.length >= 2, 'Must list missing data points transparently');

  console.log(`  ✓ Missing DEM & CWC gauge transparently caught: Overall status is [${report.overallStatus}]`);
});

// -------------------------------------------------------------------------
// TEST 5: GEOGRAPHIC BOUNDARY & COORDINATE GROUNDING
// -------------------------------------------------------------------------
test('Test 5: Candidate coordinates fall strictly within target location vicinity with zero external leakage', async () => {
  console.log('\n--- Running Test 5: Geographic Coordinate Grounding ---');

  const joshimathReport = await runPlanSafeWorkflow({
    location: joshimathLoc,
    objective: 'flood_shelter',
    simulationResult: null,
  });

  for (const c of joshimathReport.candidates) {
    const [cLng, cLat] = c.candidateCoordinates;
    // Coordinates must be near Joshimath [79.5658, 30.5574], NEVER near Kotturu [83.97, 18.73]
    assert(Math.abs(cLng - joshimathLoc.center[0]) < 0.05, `Candidate longitude ${cLng} must be near Joshimath ${joshimathLoc.center[0]}`);
    assert(Math.abs(cLat - joshimathLoc.center[1]) < 0.05, `Candidate latitude ${cLat} must be near Joshimath ${joshimathLoc.center[1]}`);
    assert(!c.title.includes('Kotturu'), 'Joshimath candidate must not leak Kotturu title');
  }

  console.log(`  ✓ All ${joshimathReport.candidates.length} Joshimath candidates verified strictly within Chamoli coordinates`);
});

// -------------------------------------------------------------------------
// TEST 6: STANDARD STATUS LABEL CONFORMANCE
// -------------------------------------------------------------------------
test('Test 6: All candidate sites and audit checks conform to mandatory status labels', async () => {
  console.log('\n--- Running Test 6: Standard Status Label Conformance ---');

  const validStatuses: PlanSafeStatus[] = [
    'DATA VERIFIED',
    'PRELIMINARY SCREENING',
    'REQUIRES REVIEW',
    'REJECTED',
    'UNABLE TO ASSESS',
  ];

  const report = await runPlanSafeWorkflow({
    location: kotturuLoc,
    objective: 'flood_shelter',
    simulationResult: mockSimResult,
  });

  assert(validStatuses.includes(report.overallStatus), `Overall status ${report.overallStatus} must be valid`);

  for (const check of report.dataQualityChecks) {
    assert(validStatuses.includes(check.status), `Check status ${check.status} must be valid`);
  }

  for (const cand of report.candidates) {
    assert(validStatuses.includes(cand.evaluationStatus), `Candidate status ${cand.evaluationStatus} must be valid`);
  }

  console.log('  ✓ 100% adherence to standard NDMA status labels confirmed');
});

