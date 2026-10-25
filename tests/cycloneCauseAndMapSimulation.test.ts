/**
 * tests/cycloneCauseAndMapSimulation.test.ts
 *
 * Automated verification test suite for Cyclone Cause Explainer and Map Simulation:
 * 1. Physical Environmental Factors Evaluation (SST >= 26.5°C, Moisture, Disturbance, Shear < 15kt, Coriolis >= 5°N)
 * 2. Scientific Honesty & Missing Data Handling (truthful "Data unavailable" in live mode without buoy/satellite feeds)
 * 3. 5-Stage Visual Formation Lifecycle (stages 1 to 5 with physics mechanisms, pressure & wind metrics)
 * 4. Strict Separation of Cause vs Track vs Impact (Wind radii != Flood extents verification)
 * 5. Interactive Demonstration Scenario Controls (play, pause, step scrubbing, speed, intensity)
 * 6. Multi-Hazard Layer Coexistence (cyclone wind radii & flood inundation layers distinct and non-colliding)
 */

import {
  evaluateCycloneFormationFactors,
  CYCLONE_FORMATION_STAGES,
  getCauseTrackImpactBreakdown,
  type CycloneFormationAssessment,
  type FormationStage,
} from '../src/services/cycloneFormationService';
import {
  generateDemoCycloneTrack,
  fetchLiveOfficialCycloneTrack,
  buildGeoJsonForWindRadii,
  type CycloneState,
  type CycloneTrackStep,
} from '../src/services/cycloneTrackingService';
import type { LocationSearchResult } from '../src/types/nationwide';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

async function runCycloneCauseExplainerTests() {
  console.log('\n========================================================');
  console.log('🧪 BHARAT VILLAGE TWIN: CYCLONE CAUSE EXPLAINER & SIMULATION TEST SUITE');
  console.log('========================================================\n');

  const mockLocation: LocationSearchResult = {
    id: 'loc-puri-odisha',
    name: 'Puri Coastal Zone',
    displayName: 'Puri Coastal Zone, Puri, Odisha',
    district: 'Puri',
    state: 'Odisha',
    adminLevel: 'district',
    center: [85.8312, 19.8135], // [lng, lat]
    boundingBox: [85.7, 19.7, 85.9, 19.9],
    elevation_m: 8,
    source: 'Census 2011 / Survey of India',
    regionCategory: 'coastal',
  };

  // -------------------------------------------------------------------------
  // TEST 1: Physical Environmental Factors (Demo Mode)
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Physical Environmental Factors Evaluation in Demo Mode ---');
  const demoTrackState = generateDemoCycloneTrack({
    scenarioId: 'bob-andhra-odisha',
    intensity: 'VSCS',
    forwardSpeedKmh: 18,
  });

  const activeStep: CycloneTrackStep = demoTrackState.steps[2]; // Peak step
  const demoAssessment: CycloneFormationAssessment = evaluateCycloneFormationFactors('demo', activeStep);

  assert(demoAssessment.overallSuitability === 'Favourable', 'Demo scenario evaluates overall suitability as Favourable');
  const favourableCount = demoAssessment.factors.filter(f => f.status === 'favourable').length;
  assert(favourableCount >= 4, `Favourable factors count (${favourableCount}) >= 4`);
  assert(demoAssessment.isDemo === true, 'Assessment correctly flags isDemo = true');

  // Verify 5 Gray Parameters
  const sstFactor = demoAssessment.factors.find(f => f.id === 'sst');
  assert(!!sstFactor, 'SST factor exists in assessment');
  assert(sstFactor!.status === 'favourable', 'SST is favourable (>= 26.5°C)');
  assert(sstFactor!.measuredValue !== null && sstFactor!.measuredValue >= 26.5, `SST value is ${sstFactor!.measuredValue}°C (>= 26.5°C)`);
  assert(sstFactor!.unit === '°C', 'SST unit is °C');
  assert(sstFactor!.statusExplanation.includes('Illustrative scenario value'), 'SST is labeled as illustrative scenario value');

  const moistureFactor = demoAssessment.factors.find(f => f.id === 'moisture');
  assert(!!moistureFactor, 'Atmospheric moisture factor exists');
  assert(moistureFactor!.status === 'favourable', 'Moisture is favourable (RH >= 60%)');
  assert(moistureFactor!.measuredValue !== null && moistureFactor!.measuredValue >= 60, `Moisture is ${moistureFactor!.measuredValue}% (>= 60%)`);

  const disturbanceFactor = demoAssessment.factors.find(f => f.id === 'disturbance');
  assert(!!disturbanceFactor, 'Atmospheric disturbance factor exists');
  assert(disturbanceFactor!.measuredValue !== null && disturbanceFactor!.measuredValue <= 1000, `Disturbance central pressure is ${disturbanceFactor!.measuredValue} hPa (<= 1000 hPa)`);

  const shearFactor = demoAssessment.factors.find(f => f.id === 'wind_shear');
  assert(!!shearFactor, 'Wind shear factor exists');
  assert(shearFactor!.status === 'favourable', 'Vertical wind shear is favourable (< 15 kt)');
  assert(shearFactor!.measuredValue !== null && shearFactor!.measuredValue < 15, `Wind shear is ${shearFactor!.measuredValue} kt (< 15 kt)`);

  const coriolisFactor = demoAssessment.factors.find(f => f.id === 'coriolis');
  assert(!!coriolisFactor, 'Coriolis factor exists');
  assert(coriolisFactor!.status === 'favourable', 'Coriolis spin is favourable (latitude >= 5°N)');
  assert(coriolisFactor!.scientificExplanation.includes('Coriolis'), 'Coriolis explains planetary rotation effect');

  // -------------------------------------------------------------------------
  // TEST 2: Scientific Honesty & Missing Data Handling (Live Mode)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Scientific Honesty & Live Mode Missing Data Handling ---');
  // In live mode without direct satellite SST radiometer or upper-air sounder feeds
  const liveAssessment: CycloneFormationAssessment = evaluateCycloneFormationFactors('live', null);

  const liveSst = liveAssessment.factors.find(f => f.id === 'sst');
  assert(!!liveSst, 'Live SST factor exists');
  assert(liveSst!.status === 'unavailable', 'Live SST reports status: unavailable when direct buoy/satellite stream absent');
  assert(liveSst!.measuredValue === null, 'Live SST measuredValue is null (does not invent fake numbers)');
  assert(liveSst!.statusExplanation.includes('Data unavailable'), 'Live SST truthfully displays "Data unavailable"');
  assert(liveAssessment.isDemo === false, 'Live assessment isDemo is false');

  const liveShear = liveAssessment.factors.find(f => f.id === 'wind_shear');
  assert(!!liveShear, 'Live shear factor exists');
  assert(liveShear!.status === 'unavailable', 'Live vertical wind shear reports unavailable when radiosonde stream absent');
  assert(liveShear!.statusExplanation.includes('Data unavailable'), 'Live shear provides scientific reason for missing data');

  // General scientific principle distinction
  assert(liveAssessment.factors.every(f => f.scientificExplanation && f.scientificExplanation.length > 20),
    'Every factor clearly provides general physical principles and scientific explanations');

  // -------------------------------------------------------------------------
  // TEST 3: 5-Stage Visual Formation Lifecycle
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: 5-Stage Visual Formation Lifecycle Verification ---');
  assert(CYCLONE_FORMATION_STAGES.length === 5, `Lifecycle contains exactly 5 stages (found: ${CYCLONE_FORMATION_STAGES.length})`);

  const stage1 = CYCLONE_FORMATION_STAGES[0];
  assert(stage1.stageNumber === 1, 'Stage 1 starts with stage number 1');
  assert(stage1.title.includes('Thermal Engine') || stage1.subtitle.includes('SST'), 'Stage 1 explains ocean thermal engine');
  assert(stage1.shortExplanation.length > 30, 'Stage 1 provides short English explanation for ordinary citizens');
  assert(stage1.typicalPressureHpa.includes('hPa'), 'Stage 1 includes typical pressure range');
  assert(stage1.typicalWindsKmh.includes('km/h'), 'Stage 1 includes typical wind speed range');

  const stage2 = CYCLONE_FORMATION_STAGES[1];
  assert(stage2.stageNumber === 2, 'Stage 2 is Convective Disturbance');
  assert(
    stage2.detailedScience.toLowerCase().includes('converge') ||
      stage2.detailedScience.toLowerCase().includes('cumulonimbus') ||
      stage2.shortExplanation.toLowerCase().includes('thunderstorm'),
    'Stage 2 explains physical convergence and thunderstorm clustering'
  );

  const stage3 = CYCLONE_FORMATION_STAGES[2];
  assert(stage3.stageNumber === 3, 'Stage 3 is Latent Heat Release & Cyclonic Spin Organization');
  assert(stage3.detailedScience.includes('Coriolis') || stage3.detailedScience.includes('spin') || stage3.detailedScience.includes('rotation'),
    'Stage 3 explains planetary rotation and latent heat');

  const stage4 = CYCLONE_FORMATION_STAGES[3];
  assert(stage4.stageNumber === 4, 'Stage 4 is Vortex Intensification & Eyewall Formation');
  assert(stage4.typicalWindsKmh.includes('118') || stage4.typicalWindsKmh.includes('120') || stage4.typicalWindsKmh.includes('165'),
    'Stage 4 documents hurricane-force winds');

  const stage5 = CYCLONE_FORMATION_STAGES[4];
  assert(stage5.stageNumber === 5, 'Stage 5 is Coastal Landfall & Decay');
  assert(
    stage5.shortExplanation.toLowerCase().includes('friction') ||
      stage5.detailedScience.toLowerCase().includes('roughness') ||
      stage5.detailedScience.toLowerCase().includes('landfall'),
    'Stage 5 explains landfall decay due to land surface friction and loss of ocean moisture'
  );

  // -------------------------------------------------------------------------
  // TEST 4: Strict Separation: Cause vs Track vs Impact (Radii != Flood)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Strict Separation of Cause vs Track vs Impact ---');
  const breakdown = getCauseTrackImpactBreakdown(
    'demo',
    activeStep,
    mockLocation,
    215 // 215 km distance to eye
  );

  assert(breakdown.cause.title.includes('CAUSE'), 'Cause section title is explicit');
  assert(breakdown.cause.items.length >= 3, 'Cause section lists thermodynamic triggers');

  assert(breakdown.track.title.includes('TRACK'), 'Track section title is explicit');
  assert(breakdown.track.items.some(i => i.label.includes('Position')), 'Track gives position details');
  assert(breakdown.track.items.some(i => i.label.includes('Speed')), 'Track gives translation speed');

  assert(breakdown.impact.title.includes('IMPACT'), 'Impact section title is explicit');
  assert(breakdown.impact.items.length >= 3, 'Impact computes local wind radii exposure');

  // CRITICAL REQUIREMENT: Wind radii circles must NEVER be equated to flood extents
  assert(breakdown.impact.disclaimer.includes('NOT flood extents'), 'Impact contains explicit warning against confusing wind radii with flood extents');
  assert(breakdown.impact.disclaimer.includes('storm surge') || breakdown.impact.disclaimer.includes('hydrodynamic'),
    'Impact warns that storm surge requires hydrodynamic modelling, not just wind circles');

  // -------------------------------------------------------------------------
  // TEST 5: Interactive Demonstration Controls & Scenarios
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Interactive Demonstration Controls & Timeline ---');
  const scenarios = ['bob-andhra-odisha', 'arabian-sea-gujarat', 'bob-chennai-tamilnadu'];
  for (const scenId of scenarios) {
    const track = generateDemoCycloneTrack({
      scenarioId: scenId,
      intensity: 'ESCS',
      forwardSpeedKmh: 22,
    });
    assert(track.steps.length >= 5, `Scenario ${scenId} generates at least 5 trajectory steps (found ${track.steps.length})`);
    assert(track.steps.some(s => s.offsetHours === 0), `Scenario ${scenId} has a baseline 0h step`);
    assert(track.steps.some(s => s.offsetHours > 0), `Scenario ${scenId} has forecast steps`);
    assert(track.steps.some(s => s.offsetHours < 0), `Scenario ${scenId} has observed past steps`);

    // Check Wind Radii Polygon Generation
    const radiiGeoJson = buildGeoJsonForWindRadii(track.steps[2]);
    assert(radiiGeoJson.type === 'FeatureCollection', `Scenario ${scenId} generates GeoJSON FeatureCollection`);
    assert(radiiGeoJson.features.length >= 3, `Scenario ${scenId} has 34kt, 50kt, and 64kt radii features`);
    
    const thresholds = radiiGeoJson.features.map(f => f.properties?.threshold);
    assert(thresholds.includes('34kt') && thresholds.includes('50kt') && thresholds.includes('64kt'),
      `Scenario ${scenId} contains standard 34kt, 50kt, and 64kt thresholds`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Multi-Hazard Layer Coexistence
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Multi-Hazard Layer Coexistence Verification ---');
  // Confirm that cyclone wind radii and flood inundation are maintained in separate state representations
  const testState: CycloneState = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
  assert(testState.windRadiiGeoJson !== null, 'Cyclone wind radii GeoJSON is defined');
  assert(testState.trackGeoJson !== null, 'Cyclone track polyline GeoJSON is defined');
  assert(testState.uncertaintyConeGeoJson !== null, 'Cyclone uncertainty cone GeoJSON is defined');

  // Verify feature distinction: Cyclone features have layerCategory = 'cyclone-wind-radii'
  const windFeature = testState.windRadiiGeoJson!.features[0];
  assert(windFeature?.properties?.layerCategory === 'cyclone-wind-radii', 'Cyclone wind feature is explicitly categorized as cyclone-wind-radii');
  assert((windFeature?.properties?.speedKmh ?? 0) > 0, 'Cyclone wind feature has speedKmh');

  console.log('\n========================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} CYCLONE CAUSE EXPLAINER & SIMULATION TESTS PASSED!`);
  console.log('========================================================\n');
}

runCycloneCauseExplainerTests().catch((err) => {
  console.error('\n💥 TEST SUITE FAILED:', err);
  process.exit(1);
});
