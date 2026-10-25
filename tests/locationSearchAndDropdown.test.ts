import { strict as assert } from 'node:assert';
import { NATIONWIDE_BENCHMARK_LOCATIONS, searchBenchmarkLocations } from '../src/data/indiaLocations';
import { searchIndiaLocations } from '../src/services/geospatialService';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('=============================================================');
console.log(' Bharat Village Twin: Location Search & Autocomplete Audit');
console.log('=============================================================');

let passCount = 0;
let failCount = 0;

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
          failCount++;
          process.exit(1);
        });
    }
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failCount++;
    process.exit(1);
  }
}

async function runTests() {
  console.log('\n--- Suite 1: Query Resolution & Administrative Matching ---');

  // 1. Search for Kotturu
  await test('1. Search for "Kotturu" matches Kotturu Gram Panchayat in Srikakulam', async () => {
    const results = await searchIndiaLocations('Kotturu');
    assert(results.length > 0, 'Expected results for "Kotturu"');
    const match = results.find((r) => r.id === 'loc-ap-kothuru' || r.name.toLowerCase().includes('kotturu'));
    assert(match, 'Expected to find Kotturu location');
    assert.equal(match.district, 'Srikakulam');
    assert.equal(match.subdistrict, 'Kotturu Mandal');
    assert.equal(match.state, 'Andhra Pradesh');
    assert.equal(match.center[0], 83.950);
    assert.equal(match.center[1], 18.700);
  });

  // 2. Search for Kotturu Gram Panchayat
  await test('2. Search for full name "Kotturu Gram Panchayat" resolves accurately', async () => {
    const results = await searchIndiaLocations('Kotturu Gram Panchayat');
    assert(results.length > 0, 'Expected results for "Kotturu Gram Panchayat"');
    assert.equal(results[0].id, 'loc-ap-kothuru');
    assert.equal(results[0].name, 'Kotturu Gram Panchayat');
  });

  // 3. Search for district name
  await test('3. Search for district name "Srikakulam" returns Srikakulam locations', async () => {
    const results = await searchIndiaLocations('Srikakulam');
    assert(results.length > 0, 'Expected results for district search');
    assert(results.some((r) => r.district.toLowerCase() === 'srikakulam'));
  });

  await test('3b. Search for district name "Chamoli" returns Joshimath in Uttarakhand', async () => {
    const results = await searchIndiaLocations('Chamoli');
    assert(results.length > 0);
    assert(results.some((r) => r.district.toLowerCase() === 'chamoli'));
  });

  // 4. Search for partial place name
  await test('4. Search for partial place name "kott" returns Kotturu', async () => {
    const results = await searchIndiaLocations('kott');
    assert(results.length > 0);
    assert(results.some((r) => r.name.toLowerCase().includes('kotturu')));
  });

  await test('4b. Search for partial place name "josh" returns Joshimath', async () => {
    const results = await searchIndiaLocations('josh');
    assert(results.length > 0);
    assert(results.some((r) => r.name.toLowerCase().includes('joshimath')));
  });

  // 5. Search with multiple matching locations
  await test('5. Search for "Andhra Pradesh" returns multiple distinct AP locations', async () => {
    const results = await searchIndiaLocations('Andhra Pradesh');
    assert(results.length >= 2, 'Expected multiple locations in Andhra Pradesh');
    const srikakulam = results.find((r) => r.district === 'Srikakulam');
    const krishna = results.find((r) => r.district === 'Krishna');
    assert(srikakulam, 'Expected Kotturu in Srikakulam');
    assert(krishna, 'Expected Guduru in Krishna');
    assert.notEqual(srikakulam.id, krishna.id);
  });

  // 6. Search for non-existent name
  await test('6. Search for non-existent query returns empty results without fabricating data', async () => {
    const results = await searchIndiaLocations('NonExistentPlaceXYZ999');
    assert.strictEqual(results.length, 0, 'Should not fabricate locations for nonexistent query');
  });

  // 7. Spelling variations and transliteration
  await test('7. Transliteration variation "Kothuru" matches "Kotturu Gram Panchayat"', async () => {
    const results = await searchIndiaLocations('Kothuru');
    assert(results.length > 0, 'Expected phonetic match for Kothuru');
    assert(results.some((r) => r.id === 'loc-ap-kothuru'));
  });

  await test('7b. Alternate spelling "Jyotirmath" matches "Joshimath"', async () => {
    const results = await searchIndiaLocations('Jyotirmath');
    assert(results.length > 0, 'Expected match for Jyotirmath');
    assert(results.some((r) => r.id === 'loc-uk-joshimath'));
  });

  // 8. Coordinate-based search
  await test('8. Coordinates search "18.7000, 83.9500" generates valid geocoded point', async () => {
    const results = await searchIndiaLocations('18.7000, 83.9500');
    assert.strictEqual(results.length, 1);
    assert.equal(results[0].center[1], 18.7);
    assert.equal(results[0].center[0], 83.95);
    assert.equal(results[0].adminLevel, 'coordinates');
  });

  // 9. Asynchronous race-condition simulation
  await test('9. Concurrent / rapid query simulation maintains integrity of final search', async () => {
    let latestReqId = 0;
    let committedResults: LocationSearchResult[] = [];

    const simulateTyping = async (text: string) => {
      const thisId = ++latestReqId;
      const delay = text === 'kott' ? 80 : text === 'kotturu' ? 20 : 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
      const res = await searchIndiaLocations(text);
      if (thisId === latestReqId) {
        committedResults = res;
      }
    };

    // User types "k", then "kott", then "kotturu"
    const p1 = simulateTyping('k');
    const p2 = simulateTyping('kott');
    const p3 = simulateTyping('kotturu');

    await Promise.all([p1, p2, p3]);

    assert(committedResults.length > 0);
    assert(committedResults.some((r) => r.id === 'loc-ap-kothuru'));
    assert.equal(latestReqId, 3, 'Latest request ID must match 3');
  });

  // 10. Data completeness of search results
  await test('10. Search results contain complete administrative metadata', async () => {
    const results = await searchIndiaLocations('Kotturu');
    const k = results[0];
    assert.ok(k.name, 'Must have name');
    assert.ok(k.district, 'Must have district');
    assert.ok(k.state, 'Must have state');
    assert.ok(k.center && k.center.length === 2, 'Must have center coordinates');
    assert.ok(k.boundingBox && k.boundingBox.length === 4, 'Must have bounding box');
    assert.ok(typeof k.elevation_m === 'number', 'Must have elevation');
  });

  console.log('\n=============================================================');
  console.log(` Search Audit Complete: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=============================================================');
}

runTests();

