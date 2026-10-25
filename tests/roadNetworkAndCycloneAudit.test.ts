import assert from 'node:assert';
import { MultiHazardSimulationEngine } from '../src/services/multiHazardSimulationEngine';
import { defaultSimulationEngine } from '../src/services/simulationService';
import {
  calculateGeodesicAreaSqMeters,
  calculateGeodesicAreaHa,
  calculateGeodesicAreaKm2,
  isPointInPolygonRing,
  doSegmentsIntersect,
  doesLineStringIntersectPolygonRing,
} from '../src/utils/geoUtils';
import { getNearestCwcGauges } from '../src/services/floodDataService';
import { BENCHMARK_ROAD_NETWORKS } from '../src/data/benchmarkRoads';
import type { FeatureCollection, LineString, Polygon } from 'geojson';
import type { RoadProperties, VillageDataset } from '../src/types/village';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Road Network & Cyclone Audit Test Suite');
console.log('=============================================================\n');

// ---------------------------------------------------------------------------
// 1. GEOMETRY & GEODESIC AREA VALIDATION
// ---------------------------------------------------------------------------
console.log('--- Suite 1: Geodesic Area Calculation & Polygon Reconciliation ---');

// Test 1a: Geodesic area calculation on 1km x 1km square at ~16.21°N
const lat = 16.21;
const lng = 80.84;
const dLat1km = 1.0 / 110.6; // approx 1km in lat
const dLng1km = 1.0 / (111.32 * Math.cos((lat * Math.PI) / 180)); // approx 1km in lng

const squareCoords: [number, number][] = [
  [lng, lat],
  [lng + dLng1km, lat],
  [lng + dLng1km, lat + dLat1km],
  [lng, lat + dLat1km],
  [lng, lat],
];

const squareAreaM2 = calculateGeodesicAreaSqMeters(squareCoords);
const squareAreaKm2 = calculateGeodesicAreaKm2(squareCoords);
const squareAreaHa = calculateGeodesicAreaHa(squareCoords);

assert(squareAreaM2 > 950_000 && squareAreaM2 < 1_050_000, `Expected ~1,000,000 m², got ${squareAreaM2}`);
assert(squareAreaKm2 >= 0.95 && squareAreaKm2 <= 1.05, `Expected ~1.0 km², got ${squareAreaKm2}`);
assert(squareAreaHa >= 98 && squareAreaHa <= 102, `Expected ~100 ha, got ${squareAreaHa}`);
console.log(`  ✓ 1a. Geodesic area calculation verified on 1km² footprint: ${squareAreaKm2} km² (${squareAreaHa} ha)`);

// Test 1b: Spatial segment intersection & line-polygon containment
const polyRing: [number, number][] = [
  [80.840, 16.210],
  [80.850, 16.210],
  [80.850, 16.220],
  [80.840, 16.220],
  [80.840, 16.210],
];

const insideRoad: [number, number][] = [
  [80.842, 16.212],
  [80.848, 16.218],
];

const crossingRoad: [number, number][] = [
  [80.835, 16.215],
  [80.855, 16.215],
];

const outsideRoad: [number, number][] = [
  [80.830, 16.200],
  [80.835, 16.205],
];

assert.strictEqual(doesLineStringIntersectPolygonRing(insideRoad, polyRing), true, 'Inside road must intersect');
assert.strictEqual(doesLineStringIntersectPolygonRing(crossingRoad, polyRing), true, 'Crossing road must intersect');
assert.strictEqual(doesLineStringIntersectPolygonRing(outsideRoad, polyRing), false, 'Outside road must NOT intersect');
console.log('  ✓ 1b. Mathematically verified line-polygon intersection & non-intersection logic');

// ---------------------------------------------------------------------------
// 2. CYCLONE SIMULATION & EXTREME AREA RECONCILIATION
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: Cyclone Footprint vs District Advisory Extent ---');

const engine = new MultiHazardSimulationEngine();

// Krishna District location representation
const krishnaDistrict: LocationSearchResult = {
  id: 'loc-dist-ap-krishna',
  name: 'Krishna District',
  displayName: 'Krishna, Andhra Pradesh, India',
  state: 'Andhra Pradesh',
  district: 'Krishna',
  subdistrict: 'Machilipatnam',
  center: [80.840, 16.210],
  boundingBox: [80.5, 15.9, 81.2, 16.5],
  elevation_m: 6.0,
  regionCategory: 'coastal',
  adminLevel: 'district',
  population: 1735000,
  source: 'Survey of India / Census of India',
};

// Create a realistic sample roads network for Krishna district (~20 roads for unit testing)
const sampleKrishnaRoads: FeatureCollection<LineString, RoadProperties> = {
  type: 'FeatureCollection',
  features: [
    // 2 roads intersecting the center [80.84, 16.21]
    {
      type: 'Feature',
      id: 'rd-krishna-core-1',
      properties: {
        id: 'rd-krishna-core-1',
        name: 'NH-216 Machilipatnam Coastal Bypass',
        roadType: 'National Highway / Arterial',
        surface: 'Bitumen/Asphalt',
        lanes: 4,
        width_m: 14,
        elevation_m: 5.5,
        length_m: 2400,
        isEvacuationCorridor: true,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [80.838, 16.208],
          [80.842, 16.212],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'rd-krishna-core-2',
      properties: {
        id: 'rd-krishna-core-2',
        name: 'Machilipatnam Port Link Road',
        roadType: 'Major District Road (MDR)',
        surface: 'Bitumen/Asphalt',
        lanes: 2,
        width_m: 7,
        elevation_m: 4.8,
        length_m: 1800,
        isEvacuationCorridor: true,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [80.839, 16.209],
          [80.844, 16.214],
        ],
      },
    },
    // 5 roads outside the hazard ellipse (e.g. at 80.88 - 80.90, ~5-10 km away)
    ...Array.from({ length: 5 }, (_, i) => ({
      type: 'Feature' as const,
      id: `rd-krishna-outside-${i + 1}`,
      properties: {
        id: `rd-krishna-outside-${i + 1}`,
        name: `Rural Panchayat Road #${i + 1}`,
        roadType: 'Village Internal Street' as const,
        surface: 'Concrete (CC)' as const,
        lanes: 1,
        width_m: 4,
        elevation_m: 7.0,
        length_m: 850,
        isEvacuationCorridor: false,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [80.880 + i * 0.005, 16.250 + i * 0.005],
          [80.885 + i * 0.005, 16.255 + i * 0.005],
        ],
      },
    })),
  ],
};

const krishnaDataset: VillageDataset = {
  villageName: 'Krishna District Coastal Sector',
  district: 'Krishna',
  mandal: 'Machilipatnam',
  state: 'Andhra Pradesh',
  totalPopulation: 1735000,
  center: [80.840, 16.210],
  elevation_m: 6.0,
  boundary: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [80.5, 15.9],
              [81.2, 15.9],
              [81.2, 16.5],
              [80.5, 16.5],
              [80.5, 15.9],
            ],
          ],
        },
        properties: { name: 'Krishna District Boundary', area_sqkm: 4484.8 },
      },
    ],
  },
  buildings: { type: 'FeatureCollection', features: [] },
  roads: sampleKrishnaRoads,
  waterBodies: { type: 'FeatureCollection', features: [] },
  drainageLines: { type: 'FeatureCollection', features: [] },
  retentionPonds: { type: 'FeatureCollection', features: [] },
};

// Run Cyclone scenario on Krishna District
const cycloneReport = await engine.runScenario(
  krishnaDistrict,
  krishnaDataset,
  'cyclone',
  {
    stormCategory: 'Cat 3',
    maxSustainedWind_kmh: 165,
    stormSurge_m: 3.2,
    radiusMaxWinds_km: 30,
    trackAzimuth_deg: 295,
    forwardSpeed_kmh: 18,
  }
);

assert(cycloneReport.isApplicable, 'Cyclone scenario must be applicable in coastal AP');

// Verify that the reported area is NOT 336,363 ha ($3,363.63 km²)
console.log(`  Reported Most Affected Area: ${cycloneReport.mostAffectedArea.affectedAreaHa} ha (${cycloneReport.mostAffectedArea.affectedAreaKm2} km²)`);
assert(
  cycloneReport.mostAffectedArea.affectedAreaHa < 1000,
  `Expected local footprint < 1000 ha, got ${cycloneReport.mostAffectedArea.affectedAreaHa} ha (Must not be 336363 ha)`
);
assert.notStrictEqual(
  cycloneReport.mostAffectedArea.affectedAreaHa,
  336363,
  'Eliminated erroneous 336,363 ha calculation'
);

// Verify that the polygon properties strictly match their geodesic areas
const coreWindPoly = cycloneReport.impactPolygons.features.find((f) => f.properties.id === 'cyclone-core-wind');
assert(coreWindPoly, 'Core wind polygon must exist');
const calculatedCoreHa = calculateGeodesicAreaHa(coreWindPoly.geometry.coordinates[0]);
assert.strictEqual(
  coreWindPoly.properties.areaHa,
  calculatedCoreHa,
  `Polygon property areaHa (${coreWindPoly.properties.areaHa}) must equal geodesic area (${calculatedCoreHa})`
);
console.log(`  ✓ 2a. Core wind polygon area strictly matches geodesic computation: ${coreWindPoly.properties.areaHa} ha`);

// Verify that district-wide advisory is transparently distinguished
assert(
  cycloneReport.mostAffectedArea.rankingRationale?.includes('Differentiated from district-wide IMD meteorological advisory'),
  'Ranking rationale must distinguish local footprint from district-wide advisory extent'
);
console.log('  ✓ 2b. Transparently distinguishes local simulated wind corridor from district-wide IMD advisory extent');

// ---------------------------------------------------------------------------
// 3. ROAD NETWORK IMPACT VALIDATION
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Road Spatial Intersection & Severing Thresholds ---');

const roadStats = cycloneReport.infrastructureImpact;
console.log(`  Total Roads: ${roadStats.totalRoadsMapped}, Severed: ${roadStats.severedRoadSegmentsCount}`);

// Out of 7 roads, only the 2 center roads intersect the hazard; 5 outside roads are unaffected
assert.strictEqual(roadStats.totalRoadsMapped, 7, 'Must monitor all 7 mapped roads');
assert(
  roadStats.severedRoadSegmentsCount <= 2,
  `Expected <= 2 severed roads, got ${roadStats.severedRoadSegmentsCount}. Must NOT report all 7 severed!`
);
assert.notStrictEqual(
  roadStats.severedRoadSegmentsCount,
  roadStats.totalRoadsMapped,
  'Eliminated blanket severing of unaffected roads'
);
console.log(`  ✓ 3a. Stopped blanket severing: only intersecting roads evaluated (${roadStats.severedRoadSegmentsCount} severed of ${roadStats.totalRoadsMapped})`);

// Test Canonical Flood Simulation with spatial intersection
const floodSimResult = await defaultSimulationEngine.runSimulation(krishnaDataset, {
  rainfallIntensity_mmh: 65,
  rainfallDuration_hours: 4,
  scenario: 'baseline',
  soilType: 'alluvial_clay',
  infiltrationRate_mmh: 6.0,
  runoffCoefficient: 0.70,
  tideOutfallCondition: 'normal',
  desiltingFactor: 0.8,
});

assert(floodSimResult.affectedRoads.length === 7, 'Must evaluate all 7 roads');
const severedInFlood = floodSimResult.affectedRoads.filter((r) => r.impassable);
const waterloggedPassable = floodSimResult.affectedRoads.filter((r) => r.depth_m > 0 && !r.impassable);
const dryPassable = floodSimResult.affectedRoads.filter((r) => r.depth_m === 0);

console.log(`  Flood Results: ${severedInFlood.length} severed (>0.25m), ${waterloggedPassable.length} shallow waterlogged, ${dryPassable.length} completely dry`);
assert(dryPassable.length >= 5, 'All 5 roads outside the flood depression must remain completely dry and passable');
assert.strictEqual(
  severedInFlood.length + waterloggedPassable.length + dryPassable.length,
  7,
  'Road impact categories must cleanly partition total monitored roads'
);
console.log('  ✓ 3b. Canonical flood simulation correctly leaves outside roads dry (0.0m) and passable');

// ---------------------------------------------------------------------------
// 4. KRISHNA BASIN HYDROLOGICAL CONNECTIVITY & RIVER GAUGES
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Krishna River Basin Hydrological Connectivity ---');

// Center of Krishna District (~Machilipatnam / Guduru)
const krishnaGauges = getNearestCwcGauges([80.840, 16.210], 3, 80);
assert(krishnaGauges.length >= 1, 'Krishna district must connect to authoritative CWC gauge telemetry');

const gaugeNames = krishnaGauges.map((g) => g.stationName);
console.log(`  Indexed Stations within 80km: ${gaugeNames.join(', ')}`);

const hasPrakasamOrBandar = krishnaGauges.some(
  (g) => g.stationName.includes('Bandar Canal') || g.stationName.includes('Prakasam Barrage')
);
assert(hasPrakasamOrBandar, 'Gauges in Krishna District must genuinely connect to Krishna River / Delta canal system');

const hasSrikakulamGauge = krishnaGauges.some(
  (g) => g.stationName.includes('Gotta Barrage') || g.riverName.includes('Vamsadhara')
);
assert(!hasSrikakulamGauge, 'Srikakulam / Vamsadhara gauges (>400km away) must NOT appear in Krishna District');
console.log('  ✓ 4a. Krishna District genuinely connects to Krishna Delta telemetry (Bandar Canal / Prakasam Barrage)');
console.log('  ✓ 4b. Zero cross-basin assignment: Gotta Barrage / Vamsadhara (>400km away) strictly excluded');

// Center of Kotturu, Srikakulam (~18.70°N, 83.95°E)
const srikakulamGauges = getNearestCwcGauges([83.950, 18.700], 3, 80);
const srikakulamNames = srikakulamGauges.map((g) => g.stationName);
console.log(`  Srikakulam Stations within 80km: ${srikakulamNames.join(', ')}`);
assert(
  srikakulamGauges.some((g) => g.stationName.includes('Gotta Barrage')),
  'Kotturu, Srikakulam must connect to Gotta Barrage (Vamsadhara)'
);
assert(
  !srikakulamGauges.some((g) => g.stationName.includes('Bandar Canal') || g.stationName.includes('Prakasam Barrage')),
  'Krishna delta stations (>400km away) must NOT appear in Srikakulam'
);
console.log('  ✓ 4c. Kotturu, Srikakulam strictly connects to Vamsadhara basin without Krishna Delta stations');

console.log('\n=============================================================');
console.log(' ALL ROAD NETWORK & CYCLONE AUDIT TESTS PASSED SUCCESSFULLY');
console.log('=============================================================\n');
