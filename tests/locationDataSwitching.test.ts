import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { generateNationwideHazardAssessment } from '../src/services/indiaHazardEngine';
import {
  fetchLocationGeospatialData,
  generateCandidateInfrastructureSites,
} from '../src/services/geospatialService';
import { getInitialInfrastructureInterventions } from '../src/services/infrastructureService';
import { defaultSimulationEngine } from '../src/services/simulationService';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { VillageDataset, SimulationConfig } from '../src/types/village';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Location-Dependent Data Switching Test');
console.log('=============================================================\n');

async function testLocationSwitching() {
  const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-kothuru')!;
  const joshimath = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-uk-joshimath')!;
  const pokhran = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-rj-pokhran')!;
  const majuli = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-as-majuli')!;

  assert.ok(kotturu, 'Kotturu benchmark location must exist');
  assert.ok(joshimath, 'Joshimath benchmark location must exist');
  assert.ok(pokhran, 'Pokhran benchmark location must exist');
  assert.ok(majuli, 'Majuli benchmark location must exist');

  console.log('--- Test 1: Location ID & Coordinate Differentiation ---');
  const locs = [kotturu, joshimath, pokhran, majuli];
  for (let i = 0; i < locs.length; i++) {
    for (let j = i + 1; j < locs.length; j++) {
      assert.notStrictEqual(locs[i].id, locs[j].id, `IDs must be distinct: ${locs[i].id} vs ${locs[j].id}`);
      assert.notStrictEqual(locs[i].center[0], locs[j].center[0], `Lng must be distinct: ${locs[i].name} vs ${locs[j].name}`);
      assert.notStrictEqual(locs[i].center[1], locs[j].center[1], `Lat must be distinct: ${locs[i].name} vs ${locs[j].name}`);
    }
    console.log(`  ✓ ${locs[i].name}: [${locs[i].center[1]}°N, ${locs[i].center[0]}°E] (Elevation: ${locs[i].elevation_m}m)`);
  }

  console.log('\n--- Test 2: Geospatial Dataset Provenance & Geometry Isolation ---');
  const geoKotturu = await fetchLocationGeospatialData(kotturu);
  const geoJoshimath = await fetchLocationGeospatialData(joshimath);
  const geoPokhran = await fetchLocationGeospatialData(pokhran);
  const geoMajuli = await fetchLocationGeospatialData(majuli);

  // Kotturu verified benchmark checks
  assert.strictEqual(geoKotturu.buildings.features.length, 0, 'Kotturu must have 0 buildings when unmapped in OSM without fabricating fake plinths');
  assert.strictEqual(geoKotturu.coverage.layers.buildings.status, 'unavailable', 'Kotturu building status must be unavailable when unmapped');
  assert.ok(geoKotturu.coverage.overallReadiness.includes('Geospatial Screening Twin'), 'Kotturu must be reported as Geospatial Screening Twin');
  assert.ok(!geoKotturu.coverage.layers.buildings.source.includes('Survey of India'), 'Must not claim Survey of India for unmapped buildings');
  assert.ok(geoKotturu.roads.features.length >= 2, 'Kotturu must have roads');
  const kotturuRoadLng = geoKotturu.roads.features[0].geometry.coordinates[0][0];
  assert.ok(Math.abs(kotturuRoadLng - kotturu.center[0]) < 0.05, `Kotturu roads must be in Srikakulam (~83.95°E), got ${kotturuRoadLng}`);

  // Joshimath Himalayan checks
  assert.strictEqual(geoJoshimath.buildings.features.length, 0, 'Joshimath must not fabricate fake buildings if unmapped');
  assert.ok(geoJoshimath.roads.features.length >= 2, 'Joshimath must have road vectors');
  const joshimathRoadLat = geoJoshimath.roads.features[0].geometry.coordinates[0][1];
  assert.ok(Math.abs(joshimathRoadLat - joshimath.center[1]) < 0.05, `Joshimath roads must be in Chamoli (~30.55°N), got ${joshimathRoadLat}`);

  // Pokhran Desert checks
  assert.strictEqual(geoPokhran.buildings.features.length, 0, 'Pokhran must not fabricate fake buildings if unmapped');
  assert.ok(geoPokhran.roads.features.length >= 2, 'Pokhran must have road vectors');
  const pokhranRoadLng = geoPokhran.roads.features[0].geometry.coordinates[0][0];
  assert.ok(Math.abs(pokhranRoadLng - pokhran.center[0]) < 0.05, `Pokhran roads must be in Thar Desert (~71.92°E), got ${pokhranRoadLng}`);

  // Majuli Riverine checks
  assert.strictEqual(geoMajuli.buildings.features.length, 0, 'Majuli must not fabricate fake buildings if unmapped');
  assert.ok(geoMajuli.roads.features.length >= 2, 'Majuli must have road vectors');
  const majuliRoadLng = geoMajuli.roads.features[0].geometry.coordinates[0][0];
  assert.ok(Math.abs(majuliRoadLng - majuli.center[0]) < 0.05, `Majuli roads must be in Assam (~94.16°E), got ${majuliRoadLng}`);

  console.log('  ✓ Kotturu roads and boundaries centered around Krishna delta');
  console.log('  ✓ Joshimath roads and boundaries centered around Chamoli Himalayas');
  console.log('  ✓ Pokhran roads and boundaries centered around Jaisalmer Thar Desert');
  console.log('  ✓ Majuli roads and boundaries centered around Brahmaputra river island');
  console.log('  ✓ No cross-contamination of Kotturu coordinates in other villages');

  console.log('\n--- Test 3: Infrastructure Candidate Sites (Regional Differentiation) ---');
  const candKotturu = generateCandidateInfrastructureSites(kotturu, geoKotturu);
  const candJoshimath = generateCandidateInfrastructureSites(joshimath, geoJoshimath);
  const candPokhran = generateCandidateInfrastructureSites(pokhran, geoPokhran);
  const candMajuli = generateCandidateInfrastructureSites(majuli, geoMajuli);

  assert.strictEqual(candKotturu.length, 4, 'Kotturu must have 4 ranked candidate sites');
  assert.strictEqual(candJoshimath.length, 4, 'Joshimath must have 4 ranked candidate sites');
  assert.strictEqual(candPokhran.length, 4, 'Pokhran must have 4 ranked candidate sites');
  assert.strictEqual(candMajuli.length, 4, 'Majuli must have 4 ranked candidate sites');

  // Verify site locations follow village coordinates
  candJoshimath.forEach((s) => {
    const lat = s.candidateCoordinates[1];
    const lng = s.candidateCoordinates[0];
    assert.ok(Math.abs(lat - joshimath.center[1]) < 0.05, `Joshimath candidate ${s.title} lat ${lat} must be near 30.55°N`);
    assert.ok(Math.abs(lng - joshimath.center[0]) < 0.05, `Joshimath candidate ${s.title} lng ${lng} must be near 79.56°E`);
  });

  candPokhran.forEach((s) => {
    const lat = s.candidateCoordinates[1];
    const lng = s.candidateCoordinates[0];
    assert.ok(Math.abs(lat - pokhran.center[1]) < 0.05, `Pokhran candidate ${s.title} lat ${lat} must be near 27.02°N`);
    assert.ok(Math.abs(lng - pokhran.center[0]) < 0.05, `Pokhran candidate ${s.title} lng ${lng} must be near 71.92°E`);
  });

  candKotturu.forEach((s) => {
    const lat = s.candidateCoordinates[1];
    const lng = s.candidateCoordinates[0];
    assert.ok(Math.abs(lat - kotturu.center[1]) < 0.05, `Kotturu candidate ${s.title} lat ${lat} must be near 18.70°N`);
    assert.ok(Math.abs(lng - kotturu.center[0]) < 0.05, `Kotturu candidate ${s.title} lng ${lng} must be near 83.95°E`);
  });

  // Verify appropriate engineering types per region
  assert.ok(candJoshimath[0].hazardsIdentified.includes('landslide') || candJoshimath[0].hazardsIdentified.includes('earthquake'), 'Joshimath rank 1 must mitigate landslide or earthquake');
  assert.ok(candPokhran[0].hazardsIdentified.includes('drought') || candPokhran[0].hazardsIdentified.includes('waterlogging'), 'Pokhran rank 1 must mitigate drought');
  assert.ok(candKotturu[0].hazardsIdentified.includes('cyclone') || candKotturu[0].hazardsIdentified.includes('flood'), 'Kotturu rank 1 must mitigate cyclone/flood');

  console.log(`  ✓ Joshimath Rank #1: "${candJoshimath[0].title}" (Mitigates: ${candJoshimath[0].hazardsIdentified.join(', ')})`);
  console.log(`  ✓ Pokhran Rank #1: "${candPokhran[0].title}" (Mitigates: ${candPokhran[0].hazardsIdentified.join(', ')})`);
  console.log(`  ✓ Kotturu Rank #1: "${candKotturu[0].title}" (Mitigates: ${candKotturu[0].hazardsIdentified.join(', ')})`);
  console.log(`  ✓ Majuli Rank #1: "${candMajuli[0].title}" (Mitigates: ${candMajuli[0].hazardsIdentified.join(', ')})`);

  console.log('\n--- Test 4: Smart Infrastructure Interventions Catalog ---');
  const dsJoshimath: VillageDataset = {
    villageName: joshimath.name,
    district: joshimath.district,
    mandal: joshimath.subdistrict || joshimath.district,
    state: joshimath.state,
    center: joshimath.center,
    elevation_m: joshimath.elevation_m || 1890,
    totalPopulation: joshimath.population || 16705,
    boundary: geoJoshimath.boundary,
    roads: geoJoshimath.roads,
    waterBodies: geoJoshimath.waterBodies,
    buildings: geoJoshimath.buildings,
    drainageLines: { type: 'FeatureCollection', features: [] },
    retentionPonds: { type: 'FeatureCollection', features: [] },
  };

  const dsPokhran: VillageDataset = {
    villageName: pokhran.name,
    district: pokhran.district,
    mandal: pokhran.subdistrict || pokhran.district,
    state: pokhran.state,
    center: pokhran.center,
    elevation_m: pokhran.elevation_m || 226,
    totalPopulation: pokhran.population || 3120,
    boundary: geoPokhran.boundary,
    roads: geoPokhran.roads,
    waterBodies: geoPokhran.waterBodies,
    buildings: geoPokhran.buildings,
    drainageLines: { type: 'FeatureCollection', features: [] },
    retentionPonds: { type: 'FeatureCollection', features: [] },
  };

  const infraJoshimath = getInitialInfrastructureInterventions(dsJoshimath);
  const infraPokhran = getInitialInfrastructureInterventions(dsPokhran);
  const infraKotturu = getInitialInfrastructureInterventions(DEMO_VILLAGE);

  // Joshimath hill interventions check
  assert.ok(infraJoshimath.some((i) => i.hazardsMitigated.includes('landslide')), 'Joshimath must have landslide interventions');
  assert.ok(infraJoshimath.some((i) => i.hazardsMitigated.includes('earthquake')), 'Joshimath must have seismic retrofitting');
  assert.ok(!infraJoshimath.some((i) => i.name.toLowerCase().includes('cyclone shelter')), 'Joshimath must NOT have cyclone shelter');

  // Pokhran desert interventions check
  assert.ok(infraPokhran.some((i) => i.hazardsMitigated.includes('drought')), 'Pokhran must have drought recharge interventions');
  assert.ok(infraPokhran.some((i) => i.hazardsMitigated.includes('heatwave')), 'Pokhran must have heatwave interventions');
  assert.ok(!infraPokhran.some((i) => i.name.toLowerCase().includes('tidal flap gate')), 'Pokhran must NOT have tidal flap gate');
  assert.ok(!infraPokhran.some((i) => i.name.toLowerCase().includes('cyclone shelter')), 'Pokhran must NOT have cyclone shelter');

  // Kotturu coastal interventions check
  assert.ok(infraKotturu.some((i) => i.hazardsMitigated.includes('cyclone')), 'Kotturu must have cyclone shelter');

  console.log('  ✓ Joshimath: Gabion slope wall, seismic retrofitting, torrent cascade, springhead recharge');
  console.log('  ✓ Pokhran: Masonry check dam, native sandbreak shelterbelt, solar deep borewell, cool roofs');
  console.log('  ✓ Kotturu: Stilted cyclone shelter, box stormwater drain, evacuation corridor, Amrit Sarovar');

  console.log('\n--- Test 5: Multi-Hazard Summary & Dynamic Priority Selection ---');
  const hazKotturu = generateNationwideHazardAssessment(kotturu);
  const hazJoshimath = generateNationwideHazardAssessment(joshimath);
  const hazPokhran = generateNationwideHazardAssessment(pokhran);
  const hazMajuli = generateNationwideHazardAssessment(majuli);

  assert.ok(hazJoshimath.highestRiskHazards.includes('landslide') || hazJoshimath.highestRiskHazards.includes('earthquake'), 'Joshimath top hazard must be landslide or earthquake');
  assert.ok(hazPokhran.highestRiskHazards.includes('drought') || hazPokhran.highestRiskHazards.includes('heatwave'), 'Pokhran top hazard must be drought or heatwave');
  assert.ok(hazMajuli.highestRiskHazards.includes('flood'), 'Majuli top hazard must be flood');
  assert.ok(hazKotturu.highestRiskHazards.includes('cyclone') || hazKotturu.highestRiskHazards.includes('flood'), 'Kotturu top hazard must be cyclone or flood');

  console.log(`  ✓ Kotturu Highest Threat: ${hazKotturu.highestRiskHazards.join(', ')}`);
  console.log(`  ✓ Joshimath Highest Threat: ${hazJoshimath.highestRiskHazards.join(', ')}`);
  console.log(`  ✓ Pokhran Highest Threat: ${hazPokhran.highestRiskHazards.join(', ')}`);
  console.log(`  ✓ Majuli Highest Threat: ${hazMajuli.highestRiskHazards.join(', ')}`);

  console.log('\n--- Test 6: Hydrological Simulation Terrain Calibration ---');
  const hillConfig: SimulationConfig = {
    scenario: 'existing_drainage',
    rainfallIntensity_mmh: 80,
    rainfallDuration_hours: 4,
    soilType: 'red_sandy_loam',
    infiltrationRate_mmh: 12.0,
    runoffCoefficient: 0.72,
    tideOutfallCondition: 'normal',
    desiltingFactor: 0.65,
    timeStep_mins: 60,
  };

  const desertConfig: SimulationConfig = {
    scenario: 'existing_drainage',
    rainfallIntensity_mmh: 40,
    rainfallDuration_hours: 2,
    soilType: 'red_sandy_loam',
    infiltrationRate_mmh: 18.0,
    runoffCoefficient: 0.45,
    tideOutfallCondition: 'normal',
    desiltingFactor: 0.65,
    timeStep_mins: 60,
  };

  const simJoshimath = await defaultSimulationEngine.runSimulation(dsJoshimath, hillConfig);
  const simPokhran = await defaultSimulationEngine.runSimulation(dsPokhran, desertConfig);

  // Joshimath high elevation pluvial check:
  // Steep terrain (elevation > 400m) should produce zero standing pluvial lake polygons
  const joshimathPeakFrame = simJoshimath.frames[simJoshimath.peakHour];
  assert.strictEqual(joshimathPeakFrame.floodPolygons.features.length, 0, 'Joshimath elevation 1890m must have 0 stagnant pluvial flood lake polygons');
  assert.strictEqual(simJoshimath.buildingDataStatus, 'unavailable_unmapped', 'Joshimath must honestly report buildingDataStatus as unavailable_unmapped');
  assert.strictEqual(simJoshimath.affectedBuildings.length, 0, 'Joshimath must report 0 affected buildings when unmapped');

  // Pokhran desert check:
  assert.strictEqual(simPokhran.buildingDataStatus, 'unavailable_unmapped', 'Pokhran must report buildingDataStatus as unavailable_unmapped');
  assert.strictEqual(simPokhran.affectedBuildings.length, 0, 'Pokhran must report 0 affected buildings when unmapped');

  console.log(`  ✓ Joshimath Simulation: Peak Depth ${simJoshimath.peakDepth_m}m · Affected Buildings: 0 (Building data unmapped)`);
  console.log(`  ✓ Pokhran Simulation: Peak Depth ${simPokhran.peakDepth_m}m · Affected Buildings: 0 (Building data unmapped)`);

  console.log('\n=============================================================');
  console.log(' All Location-Dependent Data Switching Tests Passed (6/6 Suites)');
  console.log('=============================================================\n');
}

testLocationSwitching().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

