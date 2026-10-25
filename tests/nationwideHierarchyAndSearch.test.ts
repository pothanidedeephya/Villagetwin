import assert from 'node:assert';
import {
  ALL_INDIAN_STATES_AND_UTS,
  ALL_INDIA_NATIONAL_LOCATION,
  REPRESENTATIVE_DISTRICTS,
  searchNationwideHierarchy,
  getAllStatesAndUTs,
  stateToLocationResult,
  districtToLocationResult,
} from '../src/data/indiaAdministrativeHierarchy';
import { searchIndiaLocations } from '../src/services/geospatialService';
import { NATIONWIDE_BENCHMARK_LOCATIONS, parseCoordinatesInput } from '../src/data/indiaLocations';
import { generateNationwideHazardAssessment } from '../src/services/indiaHazardEngine';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Nationwide Hierarchy & Search Test Suite');
console.log('=============================================================\n');

// 1. Verify Republic of India (All 28 States & 8 Union Territories = 36 Entities)
console.log('1. Verifying 36 States & Union Territories of India...');
assert.strictEqual(ALL_INDIAN_STATES_AND_UTS.length, 36, 'Must contain all 28 states and 8 union territories (total 36)');

const statesOnly = ALL_INDIAN_STATES_AND_UTS.filter((s) => s.type === 'state');
const utsOnly = ALL_INDIAN_STATES_AND_UTS.filter((s) => s.type === 'union_territory');
assert.strictEqual(statesOnly.length, 28, 'Must contain exactly 28 States');
assert.strictEqual(utsOnly.length, 8, 'Must contain exactly 8 Union Territories');

// Verify all states have valid metadata, coordinates within India, and bounding boxes
for (const st of ALL_INDIAN_STATES_AND_UTS) {
  assert(st.name && st.name.length > 2, `State ${st.name} must have a valid name`);
  assert(st.code.startsWith('IN-'), `State ${st.name} code ${st.code} must follow ISO 3166-2:IN`);
  assert(st.lgdCode > 0, `State ${st.name} must have valid LGD code`);
  assert(st.capital, `State ${st.name} must have a capital`);
  assert(st.districtsCount > 0, `State ${st.name} must specify official district count`);

  const [lng, lat] = st.center;
  assert(lng >= 68.0 && lng <= 97.5, `State ${st.name} lng ${lng} out of India boundary`);
  assert(lat >= 6.5 && lat <= 37.5, `State ${st.name} lat ${lat} out of India boundary`);

  const [minLng, minLat, maxLng, maxLat] = st.boundingBox;
  assert(minLng < maxLng, `State ${st.name} bounding box minLng must be < maxLng`);
  assert(minLat < maxLat, `State ${st.name} bounding box minLat must be < maxLat`);
}
console.log('  ✓ All 28 States and 8 Union Territories pass authoritative administrative validation.');

// 2. National All-India Overview Entity
console.log('\n2. Verifying All-India National Location Entity...');
assert.strictEqual(ALL_INDIA_NATIONAL_LOCATION.id, 'loc-in-all');
assert.strictEqual(ALL_INDIA_NATIONAL_LOCATION.adminLevel, 'country');
assert.strictEqual(ALL_INDIA_NATIONAL_LOCATION.state, 'National Level');
assert(ALL_INDIA_NATIONAL_LOCATION.boundingBox[0] <= 68.1 && ALL_INDIA_NATIONAL_LOCATION.boundingBox[2] >= 97.4, 'Bounding box must encompass India');
console.log('  ✓ All-India National entity conforms to country-level specifications.');

// 3. Search Administrative Hierarchy
console.log('\n3. Verifying Administrative Hierarchy Search queries...');

// 3.1 Country query
const nationalMatches = searchNationwideHierarchy('India');
assert(nationalMatches.some((m) => m.id === 'loc-in-all'), 'Searching "India" must return National Overview');

const bharatMatches = searchNationwideHierarchy('Bharat');
assert(bharatMatches.some((m) => m.id === 'loc-in-all'), 'Searching "Bharat" must return National Overview');

// 3.2 State query by name
const keralaMatches = searchNationwideHierarchy('Kerala');
assert(keralaMatches.some((m) => m.name === 'Kerala' && m.adminLevel === 'state_ut'), 'Searching "Kerala" must return Kerala state entity');

const odishaMatches = searchNationwideHierarchy('Odisha');
assert(odishaMatches.some((m) => m.name === 'Odisha' && m.adminLevel === 'state_ut'), 'Searching "Odisha" must return Odisha state entity');

// 3.3 State query by short code
const apMatches = searchNationwideHierarchy('AP');
assert(apMatches.some((m) => m.name === 'Andhra Pradesh'), 'Searching "AP" must match Andhra Pradesh');

const mhMatches = searchNationwideHierarchy('MH');
assert(mhMatches.some((m) => m.name === 'Maharashtra'), 'Searching "MH" must match Maharashtra');

// 3.4 District query
const srikakulamMatches = searchNationwideHierarchy('Srikakulam');
assert(srikakulamMatches.some((m) => m.district === 'Srikakulam' && m.adminLevel === 'district'), 'Must match Srikakulam District');

const chamoliMatches = searchNationwideHierarchy('Chamoli');
assert(chamoliMatches.some((m) => m.district === 'Chamoli' && m.adminLevel === 'district'), 'Must match Chamoli District');
console.log('  ✓ Country, State, and District hierarchy searches succeed across all levels.');

// 4. Disambiguation of Duplicate Place Names
console.log('\n4. Verifying Disambiguation of Duplicate/Confusable Place Names...');

// Kotturu must unambiguously point to Srikakulam District
const kotturuResults = searchNationwideHierarchy('Kotturu');
const benchmarkKotturu = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-kothuru');
assert(benchmarkKotturu, 'Kotturu benchmark must be present');
assert.strictEqual(benchmarkKotturu.district, 'Srikakulam', 'Kotturu must be in Srikakulam District');
assert.strictEqual(benchmarkKotturu.subdistrict, 'Kotturu Mandal', 'Kotturu must be in Kotturu Mandal');
assert.strictEqual(benchmarkKotturu.center[1], 18.700, 'Kotturu latitude must be 18.700');
assert.strictEqual(benchmarkKotturu.center[0], 83.950, 'Kotturu longitude must be 83.950');

// Guduru in Krishna vs Guduru in Tirupati
const guduruKrishna = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-guduru-krishna');
assert(guduruKrishna, 'Guduru (Krishna) benchmark must be present');
assert.strictEqual(guduruKrishna.district, 'Krishna', 'Guduru Krishna must be in Krishna District');
assert.strictEqual(guduruKrishna.center[1], 16.212, 'Guduru Krishna latitude must be 16.212');

const guduruTirupati = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-guduru-tirupati');
assert(guduruTirupati, 'Guduru (Tirupati) benchmark must be present');
assert.strictEqual(guduruTirupati.district, 'Tirupati', 'Guduru Tirupati must be in Tirupati District');
assert.strictEqual(guduruTirupati.center[1], 14.148, 'Guduru Tirupati latitude must be 14.148');

// Ensure they do not collide
assert.notStrictEqual(guduruKrishna.district, guduruTirupati.district, 'Districts must be distinct');
assert.notStrictEqual(benchmarkKotturu.district, guduruKrishna.district, 'Kotturu and Guduru Krishna districts must be distinct');
console.log('  ✓ Place name disambiguation verified: Kotturu (Srikakulam) and Guduru (Krishna vs Tirupati) are distinct.');

// 5. Unified searchIndiaLocations Integration Test
console.log('\n5. Verifying searchIndiaLocations integration...');
async function testSearchIntegration() {
  // 5.1 Empty query returns national overview, benchmarks, and states
  const defaultItems = await searchIndiaLocations('');
  assert(defaultItems.length > 5, 'Empty query must return representative options');
  assert(defaultItems.some((i) => i.id === 'loc-in-all'), 'Default list must include All-India National Overview');

  // 5.2 Coordinates query
  const coordItems = await searchIndiaLocations('18.70, 83.95');
  assert.strictEqual(coordItems.length, 1);
  assert.strictEqual(coordItems[0].adminLevel, 'coordinates');
  assert.strictEqual(coordItems[0].center[1], 18.7);
  assert.strictEqual(coordItems[0].center[0], 83.95);

  // 5.3 Hierarchy query: State
  const stateItems = await searchIndiaLocations('Tamil Nadu');
  assert(stateItems.some((i) => i.name === 'Tamil Nadu' && i.adminLevel === 'state_ut'), 'Must resolve Tamil Nadu state');

  // 5.4 Hierarchy query: District
  const distItems = await searchIndiaLocations('Jaisalmer');
  assert(distItems.some((i) => i.district === 'Jaisalmer'), 'Must resolve Jaisalmer District');

  // 5.5 Benchmark query: Village
  const villageItems = await searchIndiaLocations('Joshimath');
  assert(villageItems.some((i) => i.name.includes('Joshimath') && i.district === 'Chamoli'), 'Must resolve Joshimath in Chamoli');
}

await testSearchIntegration();
console.log('  ✓ searchIndiaLocations seamlessly resolves coordinates, states, districts, and villages.');

// 6. Dynamic Multi-Hazard Assessment on Nationwide Administrative Tiers
console.log('\n6. Verifying Multi-Hazard Engine on different administrative tiers...');

// National Level
const nationalHazards = generateNationwideHazardAssessment(ALL_INDIA_NATIONAL_LOCATION);
assert(nationalHazards.assessments.flood, 'National level must evaluate flood hazard');
assert(nationalHazards.assessments.cyclone, 'National level must evaluate cyclone hazard');
assert(nationalHazards.assessments.earthquake, 'National level must evaluate earthquake hazard');

// State Level: Uttarakhand (Himalayan)
const ukState = ALL_INDIAN_STATES_AND_UTS.find((s) => s.shortCode === 'UK')!;
const ukLoc = stateToLocationResult(ukState);
const ukHazards = generateNationwideHazardAssessment(ukLoc);
assert(
  ukHazards.assessments.landslide.scientificScore > ukHazards.assessments.cyclone.scientificScore,
  'Uttarakhand must have higher landslide risk than cyclone risk'
);

// State Level: Odisha (Coastal)
const odState = ALL_INDIAN_STATES_AND_UTS.find((s) => s.shortCode === 'OD')!;
const odLoc = stateToLocationResult(odState);
const odHazards = generateNationwideHazardAssessment(odLoc);
assert(
  odHazards.assessments.cyclone.scientificScore > 50,
  'Odisha coastal state must have elevated cyclone risk'
);

// State Level: Rajasthan (Arid)
const rjState = ALL_INDIAN_STATES_AND_UTS.find((s) => s.shortCode === 'RJ')!;
const rjLoc = stateToLocationResult(rjState);
const rjHazards = generateNationwideHazardAssessment(rjLoc);
assert(
  rjHazards.assessments.drought.scientificScore >= 70,
  'Rajasthan arid state must have elevated drought risk'
);

console.log('  ✓ Multi-hazard engine dynamically produces valid, scientifically differentiated profiles across India.');

console.log('\n=============================================================');
console.log(' ALL 6 NATIONWIDE HIERARCHY & SEARCH TESTS PASSED SUCCESSFULLY');
console.log('=============================================================\n');
