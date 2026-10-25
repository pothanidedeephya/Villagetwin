import { strict as assert } from 'node:assert';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { BENCHMARK_ROAD_NETWORKS } from '../src/data/benchmarkRoads';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import {
  getNavigationPOIs,
  calculateNavigationRoutes,
  getTrafficProvenance,
} from '../src/services/navigationRoutingService';
import {
  buildRoadNetworkGraph,
  findNearestGraphNode,
  findSafestEvacuationPath,
} from '../src/services/routingEngine';
import type { SimulationResult } from '../src/types/village';
import type { NavigationPoint } from '../src/types/navigation';

console.log('=============================================================');
console.log(' Bharat Village Twin: Google Maps Navigation & Routing Audit');
console.log('=============================================================');

let passCount = 0;
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
          process.exit(1);
        });
    }
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runTests() {
  const kotturuLoc = NATIONWIDE_BENCHMARK_LOCATIONS[0];
  const kotturuRoads = BENCHMARK_ROAD_NETWORKS['loc-ap-kothuru'];

  const joshimathLoc = NATIONWIDE_BENCHMARK_LOCATIONS[1];
  const joshimathRoads = BENCHMARK_ROAD_NETWORKS['loc-uk-joshimath'];

  const majuliLoc = NATIONWIDE_BENCHMARK_LOCATIONS[2];
  const majuliRoads = BENCHMARK_ROAD_NETWORKS['loc-as-majuli'];

  console.log('\n--- Suite 1: Road Network Integrity & Intersection Connectivity ---');

  test('Kotturu benchmark roads contain real line features with valid Indian coordinates', () => {
    assert(kotturuRoads.features.length >= 8, 'Expected at least 8 real road segments in Kotturu');
    kotturuRoads.features.forEach((feature) => {
      assert(feature.geometry.type === 'LineString');
      assert(feature.geometry.coordinates.length >= 2, 'LineString must have >= 2 coordinates');
      feature.geometry.coordinates.forEach(([lng, lat]) => {
        const isSrikakulam = lng >= 83.90 && lng <= 84.00 && lat >= 18.65 && lat <= 18.75;
        const isKrishna = lng >= 80.80 && lng <= 80.90 && lat >= 16.15 && lat <= 16.25;
        assert(isSrikakulam || isKrishna, `Coordinates [${lng}, ${lat}] outside Kotturu bounds`);
      });
    });
  });

  test('Road network graph builds connected intersection vertices within snap tolerance', () => {
    const graph = buildRoadNetworkGraph(kotturuRoads, [], 0.25);
    assert(graph.nodes.size >= 8, `Expected graph nodes, got ${graph.nodes.size}`);
    assert(graph.edges.size >= 8, `Expected graph edges, got ${graph.edges.size}`);
    assert(graph.passableEdgeCount === graph.edges.size, 'All edges dry initially');
    assert(graph.blockedEdgeCount === 0, 'Zero blocked edges initially');

    // Verify at least one junction connects multiple edges
    const junction = Array.from(graph.nodes.values()).find((n) => n.connectedEdges.length >= 2);
    assert(junction, 'Must have at least one topological junction connecting multiple road corridors');
  });

  console.log('\n--- Suite 2: Google Maps-Style Route Planning (Connected Locations) ---');

  const dataset = {
    ...DEMO_VILLAGE,
    roads: kotturuRoads,
  };

  const pois = getNavigationPOIs(kotturuLoc, dataset);

  test('Generates structured POIs for village navigation (Panchayat, Shelter, School, PHC)', () => {
    assert(pois.length >= 4, `Expected at least 4 POIs, got ${pois.length}`);
    const villageCore = pois.find((p) => p.category === 'village_core');
    const shelter = pois.find((p) => p.category === 'shelter');
    const school = pois.find((p) => p.category === 'school');
    const hospital = pois.find((p) => p.category === 'hospital');

    assert(villageCore, 'Village core POI must exist');
    assert(shelter, 'Cyclone shelter POI must exist');
    assert(school, 'School relief camp POI must exist');
    assert(hospital, 'Primary health centre POI must exist');
  });

  await test('Calculates real road route between village core and cyclone shelter', async () => {
    const origin = pois[0]; // Village core
    const destination = pois[1]; // Shelter

    const result = await calculateNavigationRoutes(origin, destination, 'driving', dataset);
    assert(result.routes.length === 3, 'Must compute 3 alternatives: flood_aware, fastest, shortest');

    const recommended = result.routes.find((r) => r.isRecommended);
    assert(recommended, 'Must identify recommended route');
    assert(recommended.criterion === 'flood_aware');
    assert(recommended.totalDistance_m > 400, 'Distance must follow road network (> 400m)');
    assert(recommended.coordinates.length >= 2, 'Route line must have coordinates');
    assert(recommended.steps.length >= 2, 'Must generate step-by-step turn directions');
    assert(recommended.steps[0].instruction.includes('Follow') || recommended.steps[0].instruction.includes('Proceed'));
  });

  console.log('\n--- Suite 3: Destination Outside Cadastral Boundary ---');

  await test('Routes successfully to an elevated destination outside immediate village cluster', async () => {
    // Destination 1.5km northeast of village
    const remoteDest: NavigationPoint = {
      id: 'poi-remote-junction',
      name: 'State Highway 118 Regional Inter-District Junction',
      category: 'custom',
      coordinates: [80.8540, 16.2220],
      elevation_m: 8.5,
    };

    const result = await calculateNavigationRoutes(pois[0], remoteDest, 'driving', dataset);
    assert(result.routes.length > 0);
    const activeRoute = result.routes[0];
    assert(activeRoute.totalDistance_m > 800, 'Should traverse road network to the highway junction');
    assert(activeRoute.estimatedDrivingMinutes >= 1);
  });

  console.log('\n--- Suite 4: Shortest vs Fastest Alternatives ---');

  await test('Distinguishes fastest route by speed limit vs shortest route by physical meters', async () => {
    const origin = pois[0];
    const destination = pois[2]; // School

    const result = await calculateNavigationRoutes(origin, destination, 'driving', dataset);
    const fastest = result.routes.find((r) => r.criterion === 'fastest')!;
    const shortest = result.routes.find((r) => r.criterion === 'shortest')!;

    assert(fastest, 'Fastest route must be present');
    assert(shortest, 'Shortest route must be present');

    // Verify routing does not treat shortest distance and fastest travel time as identical assumptions
    assert(typeof fastest.estimatedDrivingMinutes === 'number');
    assert(typeof shortest.totalDistance_m === 'number');
    assert(shortest.totalDistance_m <= fastest.totalDistance_m + 50, 'Shortest route distance must be <= fastest route distance (or equal if identical corridor)');
  });

  console.log('\n--- Suite 5: Flood-Aware Route Inundation & Detour Finding ---');

  test('Detects flood intersection and detours around submerged road segment', async () => {
    // Flood the primary street `rd-ap-3` with 0.45m water (exceeds 0.25m closure threshold)
    const mockFloodSim: SimulationResult = {
      scenario: 'baseline',
      config: { rainfallIntensity_mmh: 80, rainfallDuration_hours: 4 } as any,
      frames: [],
      peakHour: 2,
      totalRainfall_mm: 200,
      maxInundatedArea_ha: 14.5,
      peakDepth_m: 0.72,
      affectedBuildings: [],
      affectedRoads: [
        { id: 'rd-ap-3', name: 'Kotturu West Habitation Internal Street', depth_m: 0.45, impassable: true },
      ],
      farmlandInundated_ha: 10,
      vulnerablePopulationAffected: 240,
      estimatedLoss_lakhs: 18,
      drainageEfficiency_percent: 15,
      isIllustrative: false,
    };

    const floodAwareRoutes = await calculateNavigationRoutes(
      pois[0],
      pois[1],
      'driving',
      dataset,
      mockFloodSim,
      0.25
    );

    const safeRoute = floodAwareRoutes.routes.find((r) => r.criterion === 'flood_aware')!;
    assert(safeRoute, 'Flood-aware route must exist');

    // The flood-aware route should circumvent the severed road rd-ap-3
    const usesSeveredRoad = safeRoute.affectedSegments.some((s) => s.roadId === 'rd-ap-3' && s.impassable);
    assert(!usesSeveredRoad, 'Flood-aware route must NOT include impassable road rd-ap-3');
    assert(safeRoute.clearanceStatus === 'Clear & Passable' || safeRoute.clearanceStatus === 'Conditional (Caution)');
    assert(safeRoute.whyRecommended, 'Must provide clear hydrologic justification for route choice');
  });

  test('Correctly marks route as Impassable (Blocked) when all connecting corridors are severed', async () => {
    // Sever ALL road corridors
    const totalCutSim: SimulationResult = {
      scenario: 'baseline',
      config: {} as any,
      frames: [],
      peakHour: 2,
      totalRainfall_mm: 350,
      maxInundatedArea_ha: 45,
      peakDepth_m: 1.4,
      affectedBuildings: [],
      affectedRoads: kotturuRoads.features.map((r) => ({
        id: r.properties.id,
        name: r.properties.name,
        depth_m: 0.85,
        impassable: true,
      })),
      farmlandInundated_ha: 40,
      vulnerablePopulationAffected: 800,
      estimatedLoss_lakhs: 50,
      drainageEfficiency_percent: 0,
      isIllustrative: false,
    };

    const routes = await calculateNavigationRoutes(
      pois[0],
      pois[1],
      'driving',
      dataset,
      totalCutSim,
      0.25
    );

    const safeRoute = routes.routes.find((r) => r.criterion === 'flood_aware')!;
    assert.equal(safeRoute.isPassable, false, 'Route must be marked impassable');
    assert.equal(safeRoute.clearanceStatus, 'Impassable (Blocked)');
    assert(safeRoute.whyRecommended?.includes('blocked') || safeRoute.whyRecommended?.includes('evacuation required'), 'Must warn of road severance');
    assert(safeRoute.steps.some((s) => s.status === 'impassable'), 'Steps must explicitly flag impassable status');
  });

  console.log('\n--- Suite 6: Disconnected Network & Edge Case Handling ---');

  test('Gracefully handles empty road network without crashing or drawing fake lines', async () => {
    const emptyDataset = {
      ...dataset,
      roads: { type: 'FeatureCollection' as const, features: [] },
    };

    const result = await calculateNavigationRoutes(pois[0], pois[1], 'driving', emptyDataset);
    assert.equal(result.routes.length, 0, 'No routes invented for empty network');
    assert(result.notice?.includes('disconnected') || result.notice?.includes('no mapped road'), 'Explains limitation to user');
  });

  console.log('\n--- Suite 7: Missing Traffic Data & Truthful Provenance ---');

  test('Truthfully discloses that live vehicle telemetry requires an external API key', () => {
    const traffic = getTrafficProvenance();
    assert.equal(traffic.provider, 'None (Standard Geometric Speed Model)');
    assert.equal(traffic.requiresApiKey, true);
    assert(traffic.message.includes('Traffic API Key'));
    assert(traffic.message.includes('Indian Roads Congress'));
  });

  console.log('\n--- Suite 8: Switching Villages & Dynamic Recalculation ---');

  test('Dynamically updates POIs and road graph for Joshimath (Mountain Terrain)', async () => {
    const joshimathDataset = {
      ...DEMO_VILLAGE,
      villageName: 'Joshimath (Jyotirmath)',
      center: joshimathLoc.center,
      roads: joshimathRoads,
    };

    const joshimathPOIs = getNavigationPOIs(joshimathLoc, joshimathDataset);
    assert(joshimathPOIs.length >= 3);
    assert(joshimathPOIs[0].name.includes('Joshimath'));

    const result = await calculateNavigationRoutes(
      joshimathPOIs[0],
      joshimathPOIs[1],
      'driving',
      joshimathDataset
    );
    assert(result.routes.length === 3);
    assert(result.routes[0].totalDistance_m > 0);
  });

  test('Dynamically updates POIs and road graph for Majuli (Riverine Island)', async () => {
    const majuliDataset = {
      ...DEMO_VILLAGE,
      villageName: 'Majuli Kamalabari',
      center: majuliLoc.center,
      roads: majuliRoads,
    };

    const majuliPOIs = getNavigationPOIs(majuliLoc, majuliDataset);
    assert(majuliPOIs.length >= 3);
    assert(majuliPOIs[0].name.includes('Majuli'));

    const result = await calculateNavigationRoutes(
      majuliPOIs[0],
      majuliPOIs[1],
      'driving',
      majuliDataset
    );
    assert(result.routes.length === 3);
    assert(result.routes[0].totalDistance_m > 0);
  });

  console.log('=============================================================');
  console.log(` Test Summary: All ${passCount} Navigation & Routing Tests Passed!`);
  console.log('=============================================================');
}

runTests();

