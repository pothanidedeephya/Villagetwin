import assert from 'node:assert';
import {
  isPointInPolygonRing,
  isPointInPolygonWithHoles,
  isPointInMultiPolygon,
  calculatePolygonRingAreaKm2,
  calculateMultiPolygonAreaKm2,
  computeMultiPolygonBoundingBox,
  validateAndSanitizeMultiPolygon,
  parseImdCycloneWindApiResponse,
  assessVillageCycloneWindExposure,
  fetchOfficialImdCycloneWind,
  OFFICIAL_IMD_CYCLONE_WIND_BENCHMARK_FIXTURE,
} from '../src/services/imdCycloneWindService';
import { CYCLONE_WIND_THRESHOLDS, type RawImdCycloneWindApiResponse } from '../src/types/imdCycloneWind';
import type { LocationSearchResult } from '../src/types/nationwide';
import type { RoadProperties, BuildingProperties } from '../src/types/village';

console.log('--- STARTING IMD CYCLONE WIND WARNING INTEGRATION TEST SUITE ---');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            passed++;
            console.log(`  ✓ ${name}`);
          })
          .catch((err) => {
            console.error(`  ✗ ${name}:`, err.message);
            throw err;
          });
      } else {
        passed++;
        console.log(`  ✓ ${name}`);
      }
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      throw err;
    }
  }

  // ============================================================================
  // Suite 1: Live Official IMD Endpoint Probing & Authentication Verification
  // ============================================================================
  console.log('\n--- Suite 1: Official Endpoint Authentication & Real Request Handling ---');

  await test('IMD API: Real HTTP request to api.imd.gov.in/api/v1/cyclone_wind returns 401 without fabricated success', async () => {
    const result = await fetchOfficialImdCycloneWind({ forceScenario: false });
    assert.strictEqual(result.endpointUrl, 'https://api.imd.gov.in/api/v1/cyclone_wind');
    assert.strictEqual(result.httpStatus, 401, 'Endpoint without registered credentials must return HTTP 401');
    assert.strictEqual(result.connectionStatus, 'AUTHENTICATION_REQUIRED');
    assert.strictEqual(result.hasApiKey, false);
    assert.strictEqual(result.activeThresholds.length, 0, 'Must not fabricate active thresholds when unauthenticated');
    assert.ok(result.authNotice.includes('HTTP 401 Unauthorized'));
    assert.strictEqual(result.geoJsonFeatureCollection.features.length, 0);
  });

  // ============================================================================
  // Suite 2: GeoJSON MultiPolygon Coordinate Validation & Malformation Rejection
  // ============================================================================
  console.log('\n--- Suite 2: MultiPolygon Geometry Validation & Topology Sanitization ---');

  test('Geometry: Validates and accepts well-formed MultiPolygon coordinates', () => {
    const validCoords = [
      [
        [
          [80.0, 16.0],
          [81.0, 16.0],
          [81.0, 17.0],
          [80.0, 17.0],
          [80.0, 16.0],
        ],
      ],
    ];
    const { isValid, sanitized, error } = validateAndSanitizeMultiPolygon(validCoords);
    assert.strictEqual(isValid, true, `Expected valid, got error: ${error}`);
    assert.strictEqual(sanitized.length, 1);
    assert.strictEqual(sanitized[0][0].length, 5);
  });

  test('Geometry: Automatically closes unclosed polygon rings', () => {
    const unclosedCoords = [
      [
        [
          [80.0, 16.0],
          [81.0, 16.0],
          [81.0, 17.0],
          [80.0, 17.0],
          // Missing closing [80.0, 16.0]
        ],
      ],
    ];
    const { isValid, sanitized } = validateAndSanitizeMultiPolygon(unclosedCoords);
    assert.strictEqual(isValid, true);
    const ring = sanitized[0][0];
    const first = ring[0];
    const last = ring[ring.length - 1];
    assert.strictEqual(first[0], last[0]);
    assert.strictEqual(first[1], last[1]);
  });

  test('Geometry: Rejects out-of-range coordinates (Lon > 180 or Lat > 90)', () => {
    const outOfBoundsCoords = [
      [
        [
          [195.0, 16.0], // Out of bounds longitude
          [81.0, 16.0],
          [81.0, 17.0],
          [195.0, 16.0],
        ],
      ],
    ];
    const { isValid, error } = validateAndSanitizeMultiPolygon(outOfBoundsCoords);
    assert.strictEqual(isValid, false);
    assert.ok(error?.includes('Out-of-range coordinates'));
  });

  test('Geometry: Rejects degenerate rings with fewer than 3 vertices', () => {
    const degenerateCoords = [
      [
        [
          [80.0, 16.0],
          [81.0, 16.0],
          // Only 2 points
        ],
      ],
    ];
    const { isValid, error } = validateAndSanitizeMultiPolygon(degenerateCoords);
    assert.strictEqual(isValid, false);
    assert.ok(error?.includes('fewer than 3 vertices'));
  });

  // ============================================================================
  // Suite 3: Ray-Casting & MultiPolygon Point/Hole Calculations
  // ============================================================================
  console.log('\n--- Suite 3: Spatial Calculations (Ray-Casting, Holes & Geodesic Area) ---');

  test('Point-in-Polygon: Accurately detects points inside exterior ring', () => {
    const ring: [number, number][] = [
      [80.0, 16.0],
      [82.0, 16.0],
      [82.0, 18.0],
      [80.0, 18.0],
      [80.0, 16.0],
    ];
    assert.strictEqual(isPointInPolygonRing([81.0, 17.0], ring), true, 'Center point should be inside');
    assert.strictEqual(isPointInPolygonRing([79.0, 17.0], ring), false, 'Outside point should be false');
    assert.strictEqual(isPointInPolygonRing([81.0, 19.0], ring), false, 'Outside point should be false');
  });

  test('Point-in-Polygon with Holes: Detects point inside exterior but inside interior hole as OUTSIDE', () => {
    const outerRing: [number, number][] = [
      [80.0, 16.0],
      [84.0, 16.0],
      [84.0, 20.0],
      [80.0, 20.0],
      [80.0, 16.0],
    ];
    // Hole in center [81.5..82.5, 17.5..18.5]
    const holeRing: [number, number][] = [
      [81.5, 17.5],
      [82.5, 17.5],
      [82.5, 18.5],
      [81.5, 18.5],
      [81.5, 17.5],
    ];

    const rings = [outerRing, holeRing];
    assert.strictEqual(isPointInPolygonWithHoles([80.5, 16.5], rings), true, 'Point in outer area is inside');
    assert.strictEqual(isPointInPolygonWithHoles([82.0, 18.0], rings), false, 'Point inside hole must be OUTSIDE');
  });

  test('Area Calculation: Geodesic area formula calculates non-zero spherical area in km²', () => {
    const ring: [number, number][] = [
      [80.0, 16.0],
      [81.0, 16.0],
      [81.0, 17.0],
      [80.0, 17.0],
      [80.0, 16.0],
    ];
    const areaKm2 = calculatePolygonRingAreaKm2(ring);
    // 1° x 1° at ~16.5°N is approximately 111km x (111 * cos(16.5°)) ≈ 111 x 106.4 ≈ 11,800 km²
    assert.ok(areaKm2 > 10000 && areaKm2 < 13500, `Area ${areaKm2} km² outside expected physical range`);
  });

  // ============================================================================
  // Suite 4: Official 4-Tier Wind Radii Breakdown (27kt, 34kt, 50kt, 64kt)
  // ============================================================================
  console.log('\n--- Suite 4: Official 4-Tier Wind Radii Schema & Metadata Parsing ---');

  test('Threshold Metadata: Strictly maps knots to km/h and disaster classifications', () => {
    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['27kt'].kmh, 50);
    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['34kt'].kmh, 63);
    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['50kt'].kmh, 93);
    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['64kt'].kmh, 118);

    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['27kt'].categoryLabel, 'Depression / Squally Wind Watch (Pre-Cyclone)');
    assert.ok(
      CYCLONE_WIND_THRESHOLDS['27kt'].description.includes('does NOT indicate that a named Cyclonic Storm has formed'),
      'Must explain 27kt does not prove a cyclone formed'
    );
    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['34kt'].categoryLabel, 'Cyclonic Storm (CS) / Gale-Force Threshold');
    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['50kt'].categoryLabel, 'Severe Cyclonic Storm (SCS) / Storm-Force');
    assert.strictEqual(CYCLONE_WIND_THRESHOLDS['64kt'].categoryLabel, 'Very Severe Cyclonic Storm (VSCS) / Hurricane-Force');
  });

  test('Geometry: Inverts and corrects swapped [lat, lon] coordinates to GeoJSON [lon, lat]', () => {
    const swappedCoords = [
      [
        [
          [16.2, 80.8], // [lat, lon]
          [16.2, 81.0],
          [16.4, 81.0],
          [16.4, 80.8],
          [16.2, 80.8],
        ],
      ],
    ];
    const { isValid, sanitized } = validateAndSanitizeMultiPolygon(swappedCoords);
    assert.strictEqual(isValid, true);
    // After correction, longitude (~80.8) must be index 0, latitude (~16.2) index 1
    assert.ok(sanitized[0][0][0][0] > 70.0, 'Longitude must be first element');
    assert.ok(sanitized[0][0][0][1] < 30.0, 'Latitude must be second element');
  });

  test('Parsed IMD Benchmark Scenario: Parses all 4 MultiPolygon tiers and sorts in descending area order', () => {
    const parsed = parseImdCycloneWindApiResponse(OFFICIAL_IMD_CYCLONE_WIND_BENCHMARK_FIXTURE, {
      connectionStatus: 'BENCHMARK_SCENARIO',
      endpointUrl: 'https://api.imd.gov.in/api/v1/cyclone_wind',
      hasApiKey: true,
      httpStatus: 200,
      message: 'Benchmark Scenario',
      authNotice: 'Testing Mode',
    });

    assert.strictEqual(parsed.activeThresholds.length, 4);
    assert.ok(parsed.polygons['27kt'] !== null);
    assert.ok(parsed.polygons['34kt'] !== null);
    assert.ok(parsed.polygons['50kt'] !== null);
    assert.ok(parsed.polygons['64kt'] !== null);

    // 27kt outer envelope must have larger area than 64kt inner eye-wall
    assert.ok(parsed.polygons['27kt']!.totalAreaKm2 > parsed.polygons['64kt']!.totalAreaKm2);

    // Features sorted so high-speed eye-wall renders on top
    const features = parsed.geoJsonFeatureCollection.features;
    assert.strictEqual(features.length, 4);
    assert.strictEqual(features[0].properties?.threshold, '64kt');
    assert.strictEqual(features[3].properties?.threshold, '27kt');
  });

  // ============================================================================
  // Suite 5: Selected-Location Intersection & Infrastructure Assessment
  // ============================================================================
  console.log('\n--- Suite 5: Selected-Location Assessment (Overlap, Infrastructure & Nuance) ---');

  test('Location Assessment: Accurately identifies unmapped roads/buildings as DATA_UNAVAILABLE', () => {
    const kotturuLoc: LocationSearchResult = {
      id: 'kotturu',
      name: 'Kotturu',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      adminLevel: 'village',
      center: [80.842, 16.212],
      boundingBox: [80.822, 16.192, 80.862, 16.232],
      displayName: 'Kotturu, Krishna, Andhra Pradesh',
      source: 'Local Government Directory',
      regionCategory: 'coastal',
    };

    const parsed = parseImdCycloneWindApiResponse(OFFICIAL_IMD_CYCLONE_WIND_BENCHMARK_FIXTURE, {
      connectionStatus: 'BENCHMARK_SCENARIO',
      endpointUrl: 'https://api.imd.gov.in/api/v1/cyclone_wind',
      hasApiKey: true,
      httpStatus: 200,
      message: 'Benchmark / Test Data — Not a Current Official Warning',
      authNotice: 'Testing Mode',
    });

    // Pass empty arrays to represent location without digitized road/building cadastres
    const assessment = assessVillageCycloneWindExposure(kotturuLoc, parsed, [], []);

    assert.strictEqual(assessment.roadsDataStatus, 'DATA_UNAVAILABLE');
    assert.strictEqual(assessment.buildingsDataStatus, 'DATA_UNAVAILABLE');
    assert.strictEqual(assessment.isBenchmarkMode, true);
    assert.strictEqual(assessment.benchmarkNotice, 'Benchmark / Test Data — Not a Current Official Warning');

    for (const t of assessment.thresholdAssessments) {
      assert.strictEqual(t.roadsDataAvailable, false);
      assert.strictEqual(t.buildingsDataAvailable, false);
    }
  });

  test('Location Assessment (Coastal Benchmark Region): Intersects wind corridors with calculated overlap', () => {
    const coastalLoc: LocationSearchResult = {
      id: 'coastal_ap',
      name: 'Coastal Corridor Settlement',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      adminLevel: 'village',
      center: [80.842, 16.212],
      boundingBox: [80.822, 16.192, 80.862, 16.232],
      displayName: 'Coastal Corridor Settlement, Krishna, Andhra Pradesh',
      source: 'Local Government Directory',
      regionCategory: 'coastal',
    };

    const parsed = parseImdCycloneWindApiResponse(OFFICIAL_IMD_CYCLONE_WIND_BENCHMARK_FIXTURE, {
      connectionStatus: 'BENCHMARK_SCENARIO',
      endpointUrl: 'https://api.imd.gov.in/api/v1/cyclone_wind',
      hasApiKey: true,
      httpStatus: 200,
      message: 'Benchmark Scenario',
      authNotice: 'Testing Mode',
    });

    const mockRoads: RoadProperties[] = [
      {
        id: 'r1',
        name: 'Main Village Spine',
        classification: 'collector',
        surfaceType: 'asphalt',
        length_m: 850,
        geometry: {
          type: 'LineString',
          coordinates: [
            [80.835, 16.205],
            [80.845, 16.215],
          ],
        },
      } as any,
    ];

    const mockBuildings: BuildingProperties[] = [
      {
        id: 'b1',
        name: 'Gram Panchayat Hall',
        coordinates: [80.842, 16.212],
      } as any,
    ];

    const assessment = assessVillageCycloneWindExposure(coastalLoc, parsed, mockRoads, mockBuildings);

    assert.strictEqual(assessment.locationId, 'coastal_ap');
    assert.strictEqual(assessment.villageIntersectsAny, true);
    assert.strictEqual(assessment.highestExposedThreshold, '64kt');
    assert.strictEqual(assessment.highestExposedSpeedKmh, 118);
    assert.strictEqual(assessment.centerStatus, 'INSIDE_CORRIDOR');
    assert.strictEqual(assessment.boundaryStatus, 'INTERSECTS');

    assert.strictEqual(assessment.roadsDataStatus, 'AVAILABLE');
    assert.strictEqual(assessment.buildingsDataStatus, 'AVAILABLE');
    assert.strictEqual(assessment.uniqueExposedRoadSegmentsCount, 1);
    assert.strictEqual(assessment.uniqueExposedBuildingsCount, 1);

    const thresh64 = assessment.thresholdAssessments.find((t) => t.threshold === '64kt')!;
    assert.strictEqual(thresh64.villageCenterInside, true);
    assert.strictEqual(thresh64.boundaryIntersects, true);
    assert.ok(thresh64.boundaryOverlapAreaKm2 > 0);
    assert.ok(thresh64.boundaryOverlapRatioPercent > 0);
    assert.strictEqual(thresh64.intersectingRoadSegmentsCount, 1);
    assert.strictEqual(thresh64.intersectingBuildingsCount, 1);

    // Verify Scientific Nuance Disclaimer
    assert.ok(
      assessment.officialNuanceDisclaimer.includes('does NOT equate to uniform structural damage'),
      'Report must warn that polygon intersection does not guarantee physical destruction'
    );
    assert.ok(assessment.officialNuanceDisclaimer.includes('RCC pucca vs tiled/thatched kutcha'));
  });

  test('Location Assessment (Actual Kotturu GP, Srikakulam): Outside Krishna Benchmark Corridor', () => {
    // Official Kotturu Gram Panchayat, Srikakulam District (18.70° N, 83.95° E)
    const kotturuSrikakulam: LocationSearchResult = {
      id: 'kotturu_srikakulam',
      name: 'Kotturu Gram Panchayat',
      state: 'Andhra Pradesh',
      district: 'Srikakulam',
      adminLevel: 'gram_panchayat',
      center: [83.950, 18.700],
      boundingBox: [83.930, 18.680, 83.970, 18.720],
      displayName: 'Kotturu Gram Panchayat, Srikakulam, Andhra Pradesh',
      source: 'Local Government Directory',
      regionCategory: 'plains',
    };

    const parsed = parseImdCycloneWindApiResponse(OFFICIAL_IMD_CYCLONE_WIND_BENCHMARK_FIXTURE, {
      connectionStatus: 'BENCHMARK_SCENARIO',
      endpointUrl: 'https://api.imd.gov.in/api/v1/cyclone_wind',
      hasApiKey: true,
      httpStatus: 200,
      message: 'Benchmark Scenario',
      authNotice: 'Testing Mode',
    });

    const mockRoads: RoadProperties[] = [
      {
        id: 'r_sklm_1',
        name: 'MDR Srikakulam Kotturu Road',
        length_m: 1200,
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.945, 18.695],
            [83.955, 18.705],
          ],
        },
      } as any,
    ];

    const assessment = assessVillageCycloneWindExposure(kotturuSrikakulam, parsed, mockRoads, []);

    // Srikakulam is > 400km north of the benchmark scenario (which is centered at 16.5°N, 80.8°E)
    assert.strictEqual(assessment.villageIntersectsAny, false);
    assert.strictEqual(assessment.centerStatus, 'OUTSIDE_RADII');
    assert.strictEqual(assessment.boundaryStatus, 'CLEAR');
    assert.strictEqual(assessment.highestExposedThreshold, 'none');
    assert.strictEqual(assessment.highestExposedSpeedKmh, 0);
    assert.strictEqual(assessment.roadsDataStatus, 'AVAILABLE');
    assert.strictEqual(assessment.uniqueExposedRoadLengthKm, 0);
    assert.strictEqual(assessment.uniqueExposedRoadSegmentsCount, 0);
    assert.strictEqual(assessment.buildingsDataStatus, 'DATA_UNAVAILABLE');
  });

  test('Location Assessment (Joshimath - Alpine Himalayas): Completely OUTSIDE Bay of Bengal wind radii', () => {
    const joshimathLoc: LocationSearchResult = {
      id: 'joshimath',
      name: 'Joshimath',
      state: 'Uttarakhand',
      district: 'Chamoli',
      adminLevel: 'village',
      center: [79.565, 30.557],
      boundingBox: [79.54, 30.54, 79.58, 30.57],
      displayName: 'Joshimath, Chamoli, Uttarakhand',
      source: 'Local Government Directory',
      regionCategory: 'himalayan',
    };

    const parsed = parseImdCycloneWindApiResponse(OFFICIAL_IMD_CYCLONE_WIND_BENCHMARK_FIXTURE, {
      connectionStatus: 'BENCHMARK_SCENARIO',
      endpointUrl: 'https://api.imd.gov.in/api/v1/cyclone_wind',
      hasApiKey: true,
      httpStatus: 200,
      message: 'Benchmark Scenario',
      authNotice: 'Testing Mode',
    });

    const assessment = assessVillageCycloneWindExposure(joshimathLoc, parsed);
    assert.strictEqual(assessment.villageIntersectsAny, false);
    assert.strictEqual(assessment.highestExposedThreshold, 'none');
    assert.strictEqual(assessment.highestExposedSpeedKmh, 0);
    assert.strictEqual(assessment.centerStatus, 'OUTSIDE_RADII');
    assert.strictEqual(assessment.boundaryStatus, 'CLEAR');

    for (const t of assessment.thresholdAssessments) {
      assert.strictEqual(t.villageCenterInside, false);
      assert.strictEqual(t.villageCenterStatus, 'OUTSIDE_RADII');
      assert.strictEqual(t.boundaryIntersects, false);
      assert.strictEqual(t.boundaryStatus, 'CLEAR');
      assert.strictEqual(t.boundaryOverlapAreaKm2, 0);
      assert.strictEqual(t.boundaryOverlapRatioPercent, 0);
      assert.strictEqual(t.intersectingRoadSegmentsCount, 0);
      assert.strictEqual(t.intersectingBuildingsCount, 0);
    }
  });

  test('Warning Status Nuance: Distinguishes empty response from network error', () => {
    // Empty valid response from IMD (no active cyclone in NIO)
    const emptyResponse: RawImdCycloneWindApiResponse = {
      status: true,
      message: 'No active system',
      totalCount: {},
      data: {},
    };
    const parsedEmpty = parseImdCycloneWindApiResponse(emptyResponse, {
      connectionStatus: 'CONNECTED_NO_ACTIVE_WARNING',
      endpointUrl: 'https://api.imd.gov.in/api/v1/cyclone_wind',
      hasApiKey: true,
      httpStatus: 200,
      message: 'Official IMD feed checked: Zero active cyclone wind warnings in effect nationwide',
      authNotice: 'Connected with valid authorized credentials',
    });

    assert.strictEqual(parsedEmpty.connectionStatus, 'CONNECTED_NO_ACTIVE_WARNING');
    assert.strictEqual(parsedEmpty.activeThresholds.length, 0);
    assert.strictEqual(parsedEmpty.geoJsonFeatureCollection.features.length, 0);
  });

  console.log(`\n--- IMD CYCLONE WIND TEST SUITE COMPLETE: ${passed}/${total} PASSED ---`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

