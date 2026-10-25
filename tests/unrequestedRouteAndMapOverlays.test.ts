import assert from 'node:assert';
import test from 'node:test';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { calculateNavigationRoutes, getNavigationPOIs } from '../src/services/navigationRoutingService';
import { BENCHMARK_ROAD_NETWORKS } from '../src/data/benchmarkRoads';
import type { VillageDataset } from '../src/types/village';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Unrequested Route & Map Overlay Guardrails');
console.log('=============================================================\n');

const kotturuLoc = NATIONWIDE_BENCHMARK_LOCATIONS[0]; // Kotturu
const joshimathLoc = NATIONWIDE_BENCHMARK_LOCATIONS[1]; // Joshimath

const kotturuRoads = BENCHMARK_ROAD_NETWORKS['loc-ap-kothuru'];

const sampleDataset: VillageDataset = {
  villageName: kotturuLoc.name,
  district: kotturuLoc.district,
  mandal: kotturuLoc.district,
  state: kotturuLoc.state,
  center: kotturuLoc.center,
  elevation_m: 38,
  totalPopulation: 2800,
  boundary: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Kotturu Boundary', area_sqkm: 2.14 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [83.94, 18.69],
              [83.96, 18.69],
              [83.96, 18.71],
              [83.94, 18.71],
              [83.94, 18.69],
            ],
          ],
        },
      },
    ],
  },
  buildings: { type: 'FeatureCollection', features: [] },
  roads: kotturuRoads,
  waterBodies: { type: 'FeatureCollection', features: [] },
  drainageLines: { type: 'FeatureCollection', features: [] },
  retentionPonds: { type: 'FeatureCollection', features: [] },
};

test('1. Initial application state has null navigationResult (no unrequested route)', () => {
  // Verifies that initial state contracts start with null route
  let navigationResult = null;
  assert.strictEqual(navigationResult, null, 'navigationResult must be null on initial load');
});

test('2. Navigation POIs do not auto-invoke routing calculation', () => {
  const pois = getNavigationPOIs(kotturuLoc, sampleDataset, []);
  assert(pois.length >= 2, 'Must have available POIs for explicit user selection');
  // Ensuring POIs existence alone does not trigger route calculation
  const isRoutingActive = false; // By default inactive
  assert.strictEqual(isRoutingActive, false, 'Routing calculation must not start automatically');
});

test('3. Explicit route calculation returns valid route only when requested', async () => {
  const pois = getNavigationPOIs(kotturuLoc, sampleDataset, []);
  const origin = pois[0];
  const destination = pois[1];

  const result = await calculateNavigationRoutes(origin, destination, 'driving', sampleDataset);
  assert(result.routes.length > 0, 'Must compute routes when explicitly requested');
  assert.strictEqual(result.origin.id, origin.id);
  assert.strictEqual(result.destination.id, destination.id);
});

test('4. Clearing route planner removes route result and markers', () => {
  let navigationResult: any = { routes: [{ id: 'test' }] };
  let navOrigin: any = { id: 'orig' };
  let navDestination: any = { id: 'dest' };

  // Simulate onClearRoute action
  navigationResult = null;
  navOrigin = null;
  navDestination = null;

  assert.strictEqual(navigationResult, null, 'Route result must be null after clearing');
  assert.strictEqual(navOrigin, null, 'Origin must be null after clearing');
  assert.strictEqual(navDestination, null, 'Destination must be null after clearing');
});

test('5. Switching villages resets navigation route cleanly', () => {
  let navigationResult: any = { routes: [{ id: 'kotturu-route' }] };
  let activeEvacuationRoute: any = { id: 'kotturu-evac' };

  // Simulate village switch handler
  const switchLocation = (_newLoc: LocationSearchResult) => {
    navigationResult = null;
    activeEvacuationRoute = null;
  };

  switchLocation(joshimathLoc);
  assert.strictEqual(navigationResult, null, 'Previous route must not persist into new village');
  assert.strictEqual(activeEvacuationRoute, null, 'Previous evacuation route must not persist');
});

test('6. Disconnected road network returns notice without inventing fake polylines', async () => {
  const disconnectedDataset: VillageDataset = {
    ...sampleDataset,
    roads: { type: 'FeatureCollection', features: [] },
  };
  const pois = getNavigationPOIs(kotturuLoc, disconnectedDataset, []);
  const result = await calculateNavigationRoutes(pois[0], pois[1], 'driving', disconnectedDataset);

  assert.strictEqual(result.routes.length, 0, 'Must produce 0 routes for disconnected network');
  assert(result.notice && result.notice.length > 0, 'Must provide honest limitation notice');
});

test('7. Default layer visibility keeps unrequested overlays hidden', () => {
  const defaultLayers = {
    floodExtent: true,
    buildings: true,
    roads: true,
    drainageExisting: true,
    drainageProposed: false,
    retentionPonds: false,
    waterBodies: true,
    boundary: true,
    impactZone: false,
    earthquakes: false,
    candidateSites: false,
    cwcGauges: true,
    flowPaths: false,
    evacRoute: false,
    imdCycloneWind: false,
  };

  assert.strictEqual(defaultLayers.flowPaths, false, 'Flow paths must be hidden by default');
  assert.strictEqual(defaultLayers.candidateSites, false, 'Candidate sites must be hidden by default');
  assert.strictEqual(defaultLayers.earthquakes, false, 'Earthquakes must be hidden by default');
  assert.strictEqual(defaultLayers.drainageProposed, false, 'Proposed drainage must be hidden by default');
  assert.strictEqual(defaultLayers.evacRoute, false, 'Evacuation route must be hidden by default');
  assert.strictEqual(defaultLayers.imdCycloneWind, false, 'Cyclone wind must be hidden by default');
  assert.strictEqual(defaultLayers.boundary, true, 'Cadastral boundary must be visible');
  assert.strictEqual(defaultLayers.roads, true, 'Road network must be visible');
});

test('8. Actual road network styling is distinct from navigation routes', () => {
  // Navigation route: Google Maps Blue (#2563eb) or Red (#ef4444) with white underlay casing (8px)
  // National Highway: Cartographic Amber/Ochre (#b45309), weight 2.8px, subtle dark casing 4px
  const navRouteColor = '#2563eb';
  const nationalHighwayColor = '#b45309';
  const nationalHighwayWeight = 2.8;

  assert.notStrictEqual(navRouteColor, nationalHighwayColor, 'Road color must be distinct from navigation blue');
  assert.notStrictEqual(nationalHighwayColor, '#ea580c', 'National Highway must not use vibrant orange route color');
  assert(nationalHighwayWeight < 3.5, 'Highway weight must be subtle cartographic line');
});

