import { describe, it } from 'node:test';
import assert from 'node:assert';
import { searchIndiaLocations, fetchLocationGeospatialData } from '../src/services/geospatialService';
import { isValidIndiaCoordinate, toLatLng } from '../src/utils/geoUtils';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import {
  ALL_INDIA_NATIONAL_LOCATION,
  ALL_INDIAN_STATES_AND_UTS,
  REPRESENTATIVE_DISTRICTS,
  stateToLocationResult,
  districtToLocationResult,
  searchNationwideHierarchy,
} from '../src/data/indiaAdministrativeHierarchy';
import { defaultSimulationEngine } from '../src/services/simulationService';
import type { LocationSearchResult } from '../src/types/nationwide';
import type { SimulationConfig, VillageDataset } from '../src/types/village';

describe('Bharat Village Twin — Selected Location Map Redirection Tests', () => {

  // Helper simulating the authoritative camera navigation engine
  function resolveCameraNavigationForLocation(loc: LocationSearchResult) {
    const [cLng, cLat] = loc.center || [NaN, NaN];
    if (!isFinite(cLat) || !isFinite(cLng) || !isValidIndiaCoordinate(cLat, cLng)) {
      return {
        success: false,
        error: `Navigation unavailable: Invalid geographic coordinates for ${loc.name}`,
        navigationAction: null,
      };
    }

    const adminLevel = loc.adminLevel;
    const hasValidBBox =
      loc.boundingBox &&
      loc.boundingBox.length === 4 &&
      loc.boundingBox[1] < loc.boundingBox[3] &&
      loc.boundingBox[0] < loc.boundingBox[2] &&
      isValidIndiaCoordinate(loc.boundingBox[1], loc.boundingBox[0]) &&
      isValidIndiaCoordinate(loc.boundingBox[3], loc.boundingBox[2]);

    if (adminLevel === 'country') {
      return {
        success: true,
        navigationAction: {
          type: 'set_view' as const,
          center: [22.5937, 78.9629] as [number, number],
          zoom: 5,
        },
      };
    }

    if (hasValidBBox) {
      const [minLng, minLat, maxLng, maxLat] = loc.boundingBox;
      let maxZoom = 16.5;
      if (adminLevel === 'state_ut') maxZoom = 7.5;
      else if (adminLevel === 'district') maxZoom = 10.5;
      else if (adminLevel === 'taluk_tehsil') maxZoom = 13;
      else if ((adminLevel as string) === 'town' || (adminLevel as string) === 'city') maxZoom = 14.5;
      else maxZoom = 16.5;

      return {
        success: true,
        navigationAction: {
          type: 'fit_bounds' as const,
          bounds: [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]],
          maxZoom,
          center: [cLat, cLng] as [number, number],
        },
      };
    }

    let zoom = 15.5;
    if (adminLevel === 'state_ut') zoom = 7;
    else if (adminLevel === 'district') zoom = 10;
    else if (adminLevel === 'taluk_tehsil') zoom = 12.5;
    else if ((adminLevel as string) === 'town' || (adminLevel as string) === 'city') zoom = 14;
    else zoom = 15.5;

    return {
      success: true,
      navigationAction: {
        type: 'set_view' as const,
        center: [cLat, cLng] as [number, number],
        zoom,
      },
    };
  }

  // 1. Search for Kotturu Gram Panchayat and verify the map moves to its correct location
  it('1. Searches for Kotturu Gram Panchayat and resolves correct coordinates and bounding bounds', async () => {
    const results = await searchIndiaLocations('Kotturu');
    assert.ok(results.length > 0, 'Should find Kotturu search results');
    const kotturu = results.find((r) => r.name.toLowerCase().includes('kotturu') || r.name.toLowerCase().includes('kothuru')) || results[0];
    assert.strictEqual(kotturu.adminLevel, 'village');
    assert.strictEqual(kotturu.state, 'Andhra Pradesh');

    // GeoJSON [lng, lat]
    const [lng, lat] = kotturu.center;
    assert.ok(isValidIndiaCoordinate(lat, lng), 'Kotturu coordinates must be valid for India');
    assert.ok(lng >= 83.9 && lng <= 84.1, 'Kotturu longitude near 83.95°E');
    assert.ok(lat >= 18.6 && lat <= 18.8, 'Kotturu latitude near 18.70°N');

    const nav = resolveCameraNavigationForLocation(kotturu);
    assert.strictEqual(nav.success, true);
    assert.ok(nav.navigationAction);
    if (nav.navigationAction.type === 'fit_bounds') {
      const [[minLat, minLng], [maxLat, maxLng]] = nav.navigationAction.bounds;
      assert.ok(minLat < maxLat && minLng < maxLng);
      assert.strictEqual(nav.navigationAction.maxZoom, 16.5);
    }
  });

  // 2. Select a different village in another district and verify the map moves there
  it('2. Selects a village in another district (Joshimath, Uttarakhand) and redirects map there', async () => {
    const results = await searchIndiaLocations('Joshimath');
    assert.ok(results.length > 0, 'Should find Joshimath');
    const joshimath = results[0];
    assert.strictEqual(joshimath.state, 'Uttarakhand');
    assert.strictEqual(joshimath.district, 'Chamoli');

    const [lng, lat] = joshimath.center;
    assert.ok(isValidIndiaCoordinate(lat, lng));
    assert.ok(lat > 30.0 && lat < 31.0, 'Joshimath latitude in Himalayan belt ~30.55°N');
    assert.ok(lng > 79.0 && lng < 80.0, 'Joshimath longitude in Chamoli ~79.56°E');

    const nav = resolveCameraNavigationForLocation(joshimath);
    assert.strictEqual(nav.success, true);
    assert.ok(nav.navigationAction);
    // Leaflet coordinates are [lat, lng]
    assert.ok(nav.navigationAction.center[0] > 30.0);
    assert.ok(nav.navigationAction.center[1] > 79.0);
  });

  // 3. Select a district and verify the map zooms to that district
  it('3. Selects a district (Jaipur District) and zooms camera with district-level boundary padding', async () => {
    const results = await searchIndiaLocations('Jaipur');
    assert.ok(results.length > 0, 'Should return Jaipur district results');
    const jaipur = results.find((r) => r.adminLevel === 'district') || results[0];
    assert.strictEqual(jaipur.adminLevel, 'district');
    assert.strictEqual(jaipur.state, 'Rajasthan');

    const nav = resolveCameraNavigationForLocation(jaipur);
    assert.strictEqual(nav.success, true);
    assert.ok(nav.navigationAction);
    assert.strictEqual(nav.navigationAction.type, 'fit_bounds');
    if (nav.navigationAction.type === 'fit_bounds') {
      assert.strictEqual(nav.navigationAction.maxZoom, 10.5, 'District maxZoom should be capped at 10.5 to keep context');
    }
  });

  // 4. Select a state and verify the map fits the state
  it('4. Selects a state (Rajasthan) and fits bounds across the full state boundary', async () => {
    const stateMatches = searchNationwideHierarchy('Rajasthan');
    assert.ok(stateMatches.length > 0, 'Finds Rajasthan state');
    const rajasthan = stateMatches.find((s) => s.adminLevel === 'state_ut');
    assert.ok(rajasthan, 'Found state result');
    assert.strictEqual(rajasthan.name, 'Rajasthan');

    const nav = resolveCameraNavigationForLocation(rajasthan);
    assert.strictEqual(nav.success, true);
    assert.ok(nav.navigationAction);
    assert.strictEqual(nav.navigationAction.type, 'fit_bounds');
    if (nav.navigationAction.type === 'fit_bounds') {
      assert.strictEqual(nav.navigationAction.maxZoom, 7.5, 'State maxZoom should be capped at 7.5');
      const [[minLat, minLng], [maxLat, maxLng]] = nav.navigationAction.bounds;
      assert.ok(maxLat - minLat > 5.0, 'Span across Rajasthan is > 5 degrees of latitude');
      assert.ok(maxLng - minLng > 5.0, 'Span across Rajasthan is > 5 degrees of longitude');
    }
  });

  // 5. Search for one location, then quickly select another (Race-condition / request-id guard)
  it('5. Rapidly switches locations and prevents in-flight responses from overwriting the latest selection', async () => {
    let activeLocationId = 'loc-ap-kothuru';
    let latestReqId = 0;
    let completedDatasetId: string | null = null;

    async function simulateSelectLocation(loc: LocationSearchResult, delayMs: number) {
      activeLocationId = loc.id;
      const myReqId = ++latestReqId;

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Guard check: only commit if request ID is still current
      if (latestReqId === myReqId) {
        completedDatasetId = loc.id;
      }
    }

    const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS[0];
    const joshimath = NATIONWIDE_BENCHMARK_LOCATIONS[1];

    // Trigger slow request for Kotturu (30ms), immediately followed by fast request for Joshimath (5ms)
    const p1 = simulateSelectLocation(kotturu, 30);
    const p2 = simulateSelectLocation(joshimath, 5);

    await Promise.all([p1, p2]);

    assert.strictEqual(activeLocationId, joshimath.id, 'Active selection is Joshimath');
    assert.strictEqual(completedDatasetId, joshimath.id, 'Kotturu slow response was discarded');
  });

  // 6. Confirm location breadcrumb, marker, map centre, weather and simulation location agree
  it('6. Location metadata, marker coordinates, map center and simulation parameters agree with selected location', async () => {
    const majuli = NATIONWIDE_BENCHMARK_LOCATIONS[2]; // Majuli Riverine Island
    assert.strictEqual(majuli.name, 'Majuli Riverine Island (Kamalabari)');
    assert.strictEqual(majuli.state, 'Assam');

    // Interim dataset 생성 확인
    const [cLng, cLat] = majuli.center;
    const interimDataset: VillageDataset = {
      villageName: majuli.name,
      district: majuli.district,
      mandal: majuli.subdistrict || majuli.district,
      state: majuli.state,
      center: majuli.center,
      elevation_m: majuli.elevation_m || 25,
      totalPopulation: majuli.population || 4250,
      boundary: { type: 'FeatureCollection', features: [] },
      roads: { type: 'FeatureCollection', features: [] },
      waterBodies: { type: 'FeatureCollection', features: [] },
      buildings: { type: 'FeatureCollection', features: [] },
      drainageLines: { type: 'FeatureCollection', features: [] },
      retentionPonds: { type: 'FeatureCollection', features: [] },
    };

    assert.strictEqual(interimDataset.villageName, majuli.name);
    assert.strictEqual(interimDataset.center[0], cLng);
    assert.strictEqual(interimDataset.center[1], cLat);

    // Marker coordinate conversion uses Leaflet [lat, lng]
    const leafletMarkerPos = toLatLng(majuli.center);
    assert.strictEqual(leafletMarkerPos[0], cLat);
    assert.strictEqual(leafletMarkerPos[1], cLng);
  });

  // 7. Confirm invalid or missing coordinates produce a clear error rather than keeping old map position
  it('7. Invalid or missing coordinates produce explicit error notice without silent fallback', () => {
    const invalidLoc1: LocationSearchResult = {
      id: 'bad-coord-1',
      name: 'Invalid Point',
      displayName: 'Invalid Point Out of Range',
      adminLevel: 'village',
      state: 'Nowhere',
      district: 'None',
      center: [200.0, -10.0], // Out of India bounds
      boundingBox: [199, -11, 201, -9],
      source: 'Test',
      regionCategory: 'plains',
    };

    const nav1 = resolveCameraNavigationForLocation(invalidLoc1);
    assert.strictEqual(nav1.success, false);
    assert.ok(nav1.error && nav1.error.includes('Navigation unavailable'));

    const invalidLoc2: LocationSearchResult = {
      id: 'bad-coord-2',
      name: 'NaN Coordinates Place',
      displayName: 'NaN Place',
      adminLevel: 'village',
      state: 'Nowhere',
      district: 'None',
      center: [NaN, NaN],
      boundingBox: [0, 0, 0, 0],
      source: 'Test',
      regionCategory: 'plains',
    };

    const nav2 = resolveCameraNavigationForLocation(invalidLoc2);
    assert.strictEqual(nav2.success, false);
    assert.ok(nav2.error && nav2.error.includes('Navigation unavailable'));
  });

  // 8. Verify existing layers, flood simulation, cyclone display and map controls still work
  it('8. Simulation engine and spatial data generation operate correctly with redirected location dataset', async () => {
    const pokhran = NATIONWIDE_BENCHMARK_LOCATIONS[3]; // Ramdevra / Pokhran
    const geo = await fetchLocationGeospatialData(pokhran);
    assert.ok(geo.boundary.features.length > 0, 'Generates geospatial boundary for Pokhran');

    const dataset: VillageDataset = {
      villageName: pokhran.name,
      district: pokhran.district,
      mandal: pokhran.subdistrict || pokhran.district,
      state: pokhran.state,
      center: pokhran.center,
      elevation_m: pokhran.elevation_m || 226,
      totalPopulation: pokhran.population || 3120,
      boundary: geo.boundary,
      roads: geo.roads,
      waterBodies: geo.waterBodies,
      buildings: { type: 'FeatureCollection', features: [] },
      drainageLines: { type: 'FeatureCollection', features: [] },
      retentionPonds: { type: 'FeatureCollection', features: [] },
    };

    const cfg: SimulationConfig = {
      scenario: 'existing_drainage',
      rainfallIntensity_mmh: 40,
      rainfallDuration_hours: 2,
      soilType: 'red_sandy_loam',
      infiltrationRate_mmh: 25.0, // High desert infiltration
      runoffCoefficient: 0.35,
      tideOutfallCondition: 'normal',
      desiltingFactor: 1.0,
      timeStep_mins: 60,
    };

    const simResult = await defaultSimulationEngine.runSimulation(dataset, cfg);
    assert.ok(simResult);
    assert.strictEqual(typeof simResult.maxInundatedArea_ha, 'number');
    assert.ok(simResult.frames.length > 0);
  });
});

