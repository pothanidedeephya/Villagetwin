import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { toLatLng, isValidIndiaCoordinate } from '../src/utils/geoUtils';
import { calculateFloodAwareEvacuationRoutes } from '../src/services/floodDataService';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { SimulationResult } from '../src/types/village';
import { floodRefreshPipeline } from '../src/services/floodRefreshPipeline';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: System Robustness & Safety Audit');
console.log('=============================================================\n');

// ---------------------------------------------------------------------------
// Suite 1: Coordinate Reference System & Latitude/Longitude Normalization
// ---------------------------------------------------------------------------
console.log('--- Suite 1: Coordinate Reference System & Bounds Validation ---');

for (const loc of NATIONWIDE_BENCHMARK_LOCATIONS) {
  const [lng, lat] = loc.center;
  assert.ok(lat >= 6 && lat <= 38, `${loc.name} latitude (${lat}°N) must be within India bounds [6°N, 38°N]`);
  assert.ok(lng >= 68 && lng <= 98, `${loc.name} longitude (${lng}°E) must be within India bounds [68°E, 98°E]`);

  // Bounding box order: [minLng, minLat, maxLng, maxLat]
  const [minLng, minLat, maxLng, maxLat] = loc.boundingBox;
  assert.ok(minLng < maxLng, `${loc.name} minLng (${minLng}) must be < maxLng (${maxLng})`);
  assert.ok(minLat < maxLat, `${loc.name} minLat (${minLat}) must be < maxLat (${maxLat})`);
  assert.ok(lng >= minLng && lng <= maxLng, `${loc.name} center longitude must be within bounding box`);
  assert.ok(lat >= minLat && lat <= maxLat, `${loc.name} center latitude must be within bounding box`);
  console.log(`  ✓ ${loc.name} geodetic bounds verified strictly within Indian CRS`);
}

// Test coordinate normalization helper (toLatLng)
const normalizedGeo = toLatLng([80.842, 16.212]); // [lng, lat] format
assert.strictEqual(normalizedGeo[0], 16.212, 'toLatLng must place Latitude (~16°) as index 0');
assert.strictEqual(normalizedGeo[1], 80.842, 'toLatLng must place Longitude (~80°) as index 1');
console.log('  ✓ toLatLng accurately normalizes [lng, lat] to Leaflet [lat, lng]');

const alreadyLatFirst = toLatLng([16.212, 80.842]); // already [lat, lng] format
assert.strictEqual(alreadyLatFirst[0], 16.212, 'toLatLng preserves existing [lat, lng] without flipping');
assert.strictEqual(alreadyLatFirst[1], 80.842, 'toLatLng preserves existing [lat, lng] without flipping');
console.log('  ✓ toLatLng idempotently preserves [lat, lng] order');

// ---------------------------------------------------------------------------
// Suite 2: Bounding Box Containment of Features
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: Feature Geometry Bounding Box Containment ---');

const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS[0];
const [minLng, minLat, maxLng, maxLat] = kotturu.boundingBox;
const bufferDeg = 0.05; // allowable surrounding context buffer

// Verify roads belong to the selected village vicinity
for (const road of DEMO_VILLAGE.roads.features) {
  for (const coord of road.geometry.coordinates) {
    const [cLng, cLat] = coord;
    assert.ok(
      cLng >= minLng - bufferDeg && cLng <= maxLng + bufferDeg,
      `Road coordinate (${cLng}°E) must be within village bounding box buffer`
    );
    assert.ok(
      cLat >= minLat - bufferDeg && cLat <= maxLat + bufferDeg,
      `Road coordinate (${cLat}°N) must be within village bounding box buffer`
    );
  }
}
console.log(`  ✓ All ${DEMO_VILLAGE.roads.features.length} road features are strictly contained in village vicinity`);

// ---------------------------------------------------------------------------
// Suite 3: Evacuation Road Closure Threshold & Impassability Detection
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Evacuation Route Safety Under Flooding ---');

// Simulation where all roads are inundated beyond 0.35m (hazardous for pedestrians/vehicles)
const extremeInundationSim: SimulationResult = {
  scenario: 'existing_drainage',
  config: {
    rainfallIntensity_mmh: 90,
    rainfallDuration_hours: 6,
    soilType: 'alluvial_clay',
    infiltrationRate_mmh: 6,
    runoffCoefficient: 0.75,
    scenario: 'existing_drainage',
    tideOutfallCondition: 'high_surge_backwater',
    desiltingFactor: 0.3,
  },
  peakHour: 4,
  totalRainfall_mm: 360,
  maxInundatedArea_ha: 42.0,
  peakDepth_m: 1.25,
  affectedBuildings: [],
  affectedRoads: DEMO_VILLAGE.roads.features.map((r) => ({
    id: r.properties.id,
    name: r.properties.name,
    depth_m: 0.45, // Exceeds 0.25m closure threshold
    impassable: true,
  })),
  farmlandInundated_ha: 22.0,
  vulnerablePopulationAffected: 850,
  estimatedLoss_lakhs: 48.0,
  drainageEfficiency_percent: 18.0,
  frames: [],
};

const extremeRoutes = calculateFloodAwareEvacuationRoutes(
  DEMO_VILLAGE,
  extremeInundationSim,
  0.25
);

assert.ok(extremeRoutes.length > 0, 'Must produce route evaluation');
const primaryRoute = extremeRoutes[0];
assert.strictEqual(
  primaryRoute.clearanceStatus,
  'Impassable (Blocked)',
  'When road depth > 0.25m, evacuation corridor must be marked Impassable (Blocked)'
);
assert.strictEqual(primaryRoute.isPassable, false, 'isPassable must be false when submerged');
assert.ok(
  primaryRoute.safetyCaveats.some((c) => c.includes('Hazardous') || c.includes('0.25m') || c.includes('inundated')),
  'Must include prominent life-safety warning against crossing submerged roads'
);
console.log('  ✓ Severe flooding correctly marks evacuation roads Impassable (Blocked)');
console.log('  ✓ Clear safety caveats warn against crossing flooded corridors');

// ---------------------------------------------------------------------------
// Suite 4: Telemetry Stale Degradation Without Fake Data Substitution
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Telemetry Stale Degradation Transparency ---');

const pipelineStatus = floodRefreshPipeline.getStatus();
assert.ok(pipelineStatus.refreshIntervalMinutes === 60, 'Pipeline configured for 60m hourly intervals');
const providerList = Object.values(pipelineStatus.providers);
assert.ok(providerList.length >= 4, 'Must register at least 4 authoritative data providers');

for (const p of providerList) {
  assert.ok(['fresh', 'delayed', 'stale', 'unavailable'].includes(p.freshness), `Provider ${p.providerId} has valid freshness: ${p.freshness}`);
  assert.ok(typeof p.ageMinutes === 'number' && p.ageMinutes >= 0, `Provider ${p.providerId} discloses age in minutes`);
  assert.ok(p.cadenceDescription.length > 0, `Provider ${p.providerId} documents update cadence`);
  console.log(`  ✓ Provider [${p.providerName}]: ${p.freshness.toUpperCase()} (${p.ageMinutes}m old) · ${p.cadenceDescription}`);
}

console.log('\n=============================================================');
console.log(' Test Summary: All System Robustness & Safety Tests Passed');
console.log('=============================================================\n');
