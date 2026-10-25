import { describe, it } from 'node:test';
import assert from 'node:assert';
import { searchIndiaLocations, fetchLocationGeospatialData } from '../src/services/geospatialService';
import { resolvePincodeToLocation, NATIONWIDE_PINCODE_INDEX } from '../src/data/indiaPincodes';
import {
  ALL_INDIAN_STATES_AND_UTS,
  getSubdistrictTypeByState,
  searchNationwideHierarchy,
  ALL_INDIA_NATIONAL_LOCATION,
} from '../src/data/indiaAdministrativeHierarchy';
import { fetchCwcGauges } from '../src/services/floodDataService';
import { generateDynamicHazardImpactBoundary } from '../src/services/hazardImpactBoundaryService';
import { calculateGeodesicAreaHa, calculateGeodesicAreaKm2 } from '../src/utils/geoUtils';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Nationwide GIS & Data Integrity Tests');
console.log('=============================================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✗ ${name}`);
        console.error(err);
        failed++;
      });
  }

  // --- Suite 1: Indian PIN Code Resolution ---
  console.log('--- Suite 1: Indian PIN Code (Postal Index Number) Resolution ---');

  await test('1a. Resolves 110001 to Connaught Place / New Delhi GPO', () => {
    const res = resolvePincodeToLocation('110001');
    assert(res !== null, 'Expected 110001 to resolve');
    assert.strictEqual(res.state, 'Delhi (NCT)');
    assert.strictEqual(res.district, 'New Delhi');
    assert.strictEqual(res.subdistrict, 'Chanakyapuri Tehsil');
    assert(res.center[0] > 77.0 && res.center[0] < 77.5);
    assert(res.center[1] > 28.5 && res.center[1] < 28.8);
  });

  await test('1b. Resolves 532455 to Kotturu / Srikakulam', () => {
    const res = resolvePincodeToLocation('532455');
    assert(res !== null, 'Expected 532455 to resolve');
    assert.strictEqual(res.state, 'Andhra Pradesh');
    assert.strictEqual(res.district, 'Srikakulam');
    assert.strictEqual(res.subdistrict, 'Kotturu Mandal');
    assert(res.center[0] > 83.8 && res.center[0] < 84.1);
    assert(res.center[1] > 18.6 && res.center[1] < 18.8);
  });

  await test('1c. Resolves 246443 to Joshimath, Uttarakhand', () => {
    const res = resolvePincodeToLocation('246443');
    assert(res !== null, 'Expected 246443 to resolve');
    assert.strictEqual(res.state, 'Uttarakhand');
    assert.strictEqual(res.district, 'Chamoli');
    assert.strictEqual(res.subdistrict, 'Joshimath Tehsil');
    assert.strictEqual(res.regionCategory, 'himalayan');
  });

  await test('1d. Resolves 400001 to Mumbai GPO, Maharashtra', () => {
    const res = resolvePincodeToLocation('400001');
    assert(res !== null, 'Expected 400001 to resolve');
    assert.strictEqual(res.state, 'Maharashtra');
    assert.strictEqual(res.district, 'Mumbai City');
    assert.strictEqual(res.subdistrict, 'Mumbai City Taluk');
  });

  await test('1e. searchIndiaLocations integrates PIN code detection with query', async () => {
    const results = await searchIndiaLocations('532455');
    assert(results.length > 0, 'Expected results for PIN 532455');
    assert(results[0].displayName.includes('532455'));
    assert(results[0].displayName.includes('Srikakulam'));
  });

  // --- Suite 2: State-Specific Administrative Hierarchy & Terminology ---
  console.log('\n--- Suite 2: State-Specific Administrative Hierarchy & Terminology ---');

  await test('2a. AP and Telangana use "Mandal"', () => {
    assert.strictEqual(getSubdistrictTypeByState('Andhra Pradesh'), 'Mandal');
    assert.strictEqual(getSubdistrictTypeByState('Telangana'), 'Mandal');
  });

  await test('2b. Karnataka, Maharashtra, Tamil Nadu, Kerala, Gujarat, Goa use "Taluk"', () => {
    assert.strictEqual(getSubdistrictTypeByState('Karnataka'), 'Taluk');
    assert.strictEqual(getSubdistrictTypeByState('Maharashtra'), 'Taluk');
    assert.strictEqual(getSubdistrictTypeByState('Tamil Nadu'), 'Taluk');
    assert.strictEqual(getSubdistrictTypeByState('Kerala'), 'Taluk');
    assert.strictEqual(getSubdistrictTypeByState('Gujarat'), 'Taluk');
    assert.strictEqual(getSubdistrictTypeByState('Goa'), 'Taluk');
  });

  await test('2c. Northern / Central states use "Tehsil"', () => {
    assert.strictEqual(getSubdistrictTypeByState('Uttar Pradesh'), 'Tehsil');
    assert.strictEqual(getSubdistrictTypeByState('Madhya Pradesh'), 'Tehsil');
    assert.strictEqual(getSubdistrictTypeByState('Rajasthan'), 'Tehsil');
    assert.strictEqual(getSubdistrictTypeByState('Punjab'), 'Tehsil');
    assert.strictEqual(getSubdistrictTypeByState('Haryana'), 'Tehsil');
    assert.strictEqual(getSubdistrictTypeByState('Uttarakhand'), 'Tehsil');
    assert.strictEqual(getSubdistrictTypeByState('Himachal Pradesh'), 'Tehsil');
    assert.strictEqual(getSubdistrictTypeByState('Delhi (NCT)'), 'Tehsil');
  });

  await test('2d. West Bengal, Bihar, Jharkhand use "CD Block"', () => {
    assert.strictEqual(getSubdistrictTypeByState('West Bengal'), 'CD Block');
    assert.strictEqual(getSubdistrictTypeByState('Bihar'), 'CD Block');
    assert.strictEqual(getSubdistrictTypeByState('Jharkhand'), 'CD Block');
  });

  await test('2e. North-Eastern states use "Circle / Sub-Division"', () => {
    assert.strictEqual(getSubdistrictTypeByState('Assam'), 'Circle / Sub-Division');
    assert.strictEqual(getSubdistrictTypeByState('Arunachal Pradesh'), 'Circle / Sub-Division');
    assert.strictEqual(getSubdistrictTypeByState('Meghalaya'), 'Circle / Sub-Division');
    assert.strictEqual(getSubdistrictTypeByState('Nagaland'), 'Circle / Sub-Division');
  });

  await test('2f. All 36 States and Union Territories are represented in national hierarchy', () => {
    assert.strictEqual(ALL_INDIAN_STATES_AND_UTS.length, 36);
    const names = ALL_INDIAN_STATES_AND_UTS.map((s) => s.name);
    assert(names.includes('Jammu & Kashmir'));
    assert(names.includes('Ladakh'));
    assert(names.includes('Andaman & Nicobar Islands'));
    assert(names.includes('Lakshadweep'));
    assert(names.includes('Puducherry'));
  });

  // --- Suite 3: Zero Synthetic Fake Roads on Data Gaps ---
  console.log('\n--- Suite 3: Zero Synthetic Fake Roads on Data Gaps ---');

  await test('3a. Non-benchmark unmapped location generates zero synthetic road features', async () => {
    const unmappedLoc: LocationSearchResult = {
      id: 'custom-loc-unmapped-village-123',
      name: 'Test Unmapped Village',
      displayName: 'Test Unmapped Village, Unknown District, Unknown State',
      adminLevel: 'village',
      state: 'Odisha',
      district: 'Mayurbhanj',
      center: [86.2500, 21.9000],
      boundingBox: [86.23, 21.88, 86.27, 21.92],
      elevation_m: 60,
      source: 'Test Custom Screening',
      regionCategory: 'plains',
    };

    const geo = await fetchLocationGeospatialData(unmappedLoc);
    assert.strictEqual(
      geo.roads.features.length,
      0,
      'Must contain 0 synthetic road lines when unmapped in public OSM/NHAI'
    );
    assert.strictEqual(geo.coverage.layers.roads.featureCount, 0);
    assert.strictEqual(geo.coverage.layers.roads.status, 'unavailable');
    assert(
      geo.coverage.layers.roads.notes.includes('Zero synthetic features generated'),
      'Notes must explicitly declare zero synthetic features'
    );
  });

  await test('3b. Verified benchmark locations contain documented, real-coordinate road networks', async () => {
    const kotturuLoc: LocationSearchResult = {
      id: 'loc-ap-kothuru',
      name: 'Kotturu',
      displayName: 'Kotturu Gram Panchayat, Srikakulam District, Andhra Pradesh',
      adminLevel: 'gram_panchayat',
      state: 'Andhra Pradesh',
      district: 'Srikakulam',
      center: [83.9500, 18.7000],
      boundingBox: [83.93, 18.68, 83.97, 18.72],
      elevation_m: 25,
      source: 'Verified Benchmark Register',
      regionCategory: 'riverine',
    };

    const geo = await fetchLocationGeospatialData(kotturuLoc);
    assert(geo.roads.features.length > 0, 'Kotturu benchmark must have verified road corridors');
    // Ensure roads are within Srikakulam Vamsadhara coordinate bbox (83.8°E - 84.1°E, 18.6°N - 18.8°N)
    for (const feat of geo.roads.features) {
      for (const [lng, lat] of feat.geometry.coordinates) {
        assert(lng > 83.5 && lng < 84.5, `Road coordinate lng ${lng} out of Srikakulam bound`);
        assert(lat > 18.4 && lat < 19.0, `Road coordinate lat ${lat} out of Srikakulam bound`);
      }
    }
  });

  // --- Suite 4: CWC River Gauging Basin Isolation & Pan-India Index ---
  console.log('\n--- Suite 4: CWC River Gauging Basin Isolation & Pan-India Coverage ---');

  await test('4a. Delhi location connects to Yamuna at Old Railway Bridge', async () => {
    // Delhi coordinates: [77.2167, 28.6333]
    const gauges = await fetchCwcGauges(28.6333, 77.2167, 80);
    assert(gauges.length > 0, 'Expected at least 1 CWC station near Delhi');
    const primary = gauges[0];
    assert.strictEqual(primary.riverName, 'Yamuna River');
    assert(primary.stationName.includes('Railway Bridge'));
    assert(primary.distanceKm < 15, `Expected distance < 15km, got ${primary.distanceKm}`);
  });

  await test('4b. Kolkata location connects to Hooghly at Garden Reach', async () => {
    // Kolkata coordinates: [88.3639, 22.5726]
    const gauges = await fetchCwcGauges(22.5726, 88.3639, 80);
    assert(gauges.length > 0, 'Expected Hooghly CWC station near Kolkata');
    const primary = gauges[0];
    assert.strictEqual(primary.riverName, 'Hooghly River');
    assert(primary.distanceKm < 20);
  });

  await test('4c. Pune location connects to Mula-Mutha at Bund Garden', async () => {
    // Pune coordinates: [73.8567, 18.5204]
    const gauges = await fetchCwcGauges(18.5204, 73.8567, 80);
    assert(gauges.length > 0, 'Expected Mula-Mutha CWC station in Pune');
    assert.strictEqual(gauges[0].riverName, 'Mula-Mutha River');
    assert(gauges[0].distanceKm < 10);
  });

  await test('4d. Cuttack / Mahanadi connects to Mundali Barrage', async () => {
    // Cuttack coordinates: [85.8828, 20.4625]
    const gauges = await fetchCwcGauges(20.4625, 85.8828, 80);
    assert(gauges.length > 0, 'Expected Mahanadi CWC station near Cuttack');
    assert.strictEqual(gauges[0].riverName, 'Mahanadi River');
    assert(gauges[0].distanceKm < 25);
  });

  await test('4e. Leh / Ladakh connects to Indus at Nimoo', async () => {
    // Leh coordinates: [77.5771, 34.1526]
    const gauges = await fetchCwcGauges(34.1526, 77.5771, 80);
    assert(gauges.length > 0, 'Expected Indus River station near Leh');
    assert.strictEqual(gauges[0].riverName, 'Indus River');
    assert(gauges[0].distanceKm < 35);
  });

  await test('4f. Ungauged remote region returns zero stations without mock fabrication', async () => {
    // Remote desert coordinates in Barmer border [70.500, 26.500] > 150km from any gauge
    const gauges = await fetchCwcGauges(26.500, 70.500, 80);
    assert.strictEqual(gauges.length, 0, 'Strict 80km radius must return 0 stations for remote location');
  });

  // --- Suite 5: Dynamic Geodesic Area Calculation on Hazard Boundaries ---
  console.log('\n--- Suite 5: Dynamic Geodesic Area Calculation on Hazard Boundaries ---');

  await test('5a. Hazard boundary areas are computed from geodesic polygon coordinates', () => {
    const coastalLoc: LocationSearchResult = {
      id: 'loc-coastal-test',
      name: 'Coastal Mandapam',
      displayName: 'Mandapam, Ramanathapuram, Tamil Nadu',
      adminLevel: 'village',
      state: 'Tamil Nadu',
      district: 'Ramanathapuram',
      center: [79.1300, 9.2800],
      boundingBox: [79.11, 9.26, 79.15, 9.30],
      elevation_m: 6,
      source: 'Tamil Nadu Coastal Registry',
      regionCategory: 'coastal',
    };

    const boundary = generateDynamicHazardImpactBoundary(coastalLoc, 'cyclone');
    assert(boundary.isApplicable, 'Cyclone should be applicable to low-elevation coastal location');
    assert(boundary.totalImpactAreaHa > 0, 'Total impact area must be positive');
    // Ensure total impact area matches gale corridor geodesic area
    const galeFeat = boundary.features.features.find((f) => f.properties.id === 'cyclone-tier-gale-corridor');
    assert(galeFeat, 'Gale corridor feature must exist');
    assert.strictEqual(boundary.totalImpactAreaHa, galeFeat.properties.areaHa);
  });

  await test('5b. Landslide hazard in flat alluvial delta returns physically inapplicable', () => {
    const deltaLoc: LocationSearchResult = {
      id: 'loc-delta-kotturu',
      name: 'Kotturu GP',
      displayName: 'Kotturu GP, Srikakulam, Andhra Pradesh',
      adminLevel: 'gram_panchayat',
      state: 'Andhra Pradesh',
      district: 'Srikakulam',
      center: [83.9500, 18.7000],
      boundingBox: [83.93, 18.68, 83.97, 18.72],
      elevation_m: 25,
      source: 'Verified Benchmark Register',
      regionCategory: 'riverine',
    };

    const boundary = generateDynamicHazardImpactBoundary(deltaLoc, 'landslide');
    assert.strictEqual(boundary.isApplicable, false);
    assert(boundary.inapplicableReason?.includes('Terrain Inapplicable'));
    assert.strictEqual(boundary.totalImpactAreaHa, 0);
    assert.strictEqual(boundary.features.features.length, 0);
  });

  console.log('\n=============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
