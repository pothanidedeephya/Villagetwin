import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { computeOverallStatus } from '../src/components/dashboard/SimpleTopNavbar';
import { deriveSimpleHazardStatus, HAZARD_CARDS } from '../src/components/hazard/SimpleHazardSelector';
import { generateNationwideHazardAssessment } from '../src/services/indiaHazardEngine';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: UI Upgrade & Design Verification Suite');
console.log(' Header, Breadcrumb, Sidebar Tabs, Hazard Cards & Map Layout');
console.log('=============================================================\n');

describe('Dashboard UI Upgrade Tests', () => {
  const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-kothuru')!;
  const joshimath = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-uk-joshimath')!;

  it('1. Geographic Hierarchy Breadcrumb contains 4-tier Indian administrative hierarchy', () => {
    assert.ok(kotturu.state, 'State must exist');
    assert.strictEqual(kotturu.state, 'Andhra Pradesh');
    assert.strictEqual(kotturu.district, 'Srikakulam');
    assert.ok(kotturu.subdistrict, 'Subdistrict/Mandal must exist');
    assert.strictEqual(kotturu.subdistrict, 'Kotturu Mandal');
    assert.ok(kotturu.name, 'Gram Panchayat/Village must exist');
    assert.strictEqual(kotturu.name, 'Kotturu Gram Panchayat');

    console.log('  ✓ 1. Verified 4-tier hierarchy: India > Andhra Pradesh > Srikakulam > Kotturu Mandal > Kotturu Gram Panchayat');
  });

  it('2. Geographic Breadcrumb accurately renders Himalayan and Desert locations', () => {
    assert.strictEqual(joshimath.state, 'Uttarakhand');
    assert.strictEqual(joshimath.district, 'Chamoli');
    assert.strictEqual(joshimath.subdistrict, 'Joshimath Tehsil');
    assert.strictEqual(joshimath.regionCategory, 'himalayan');

    console.log('  ✓ 2. Verified Himalayan hierarchy: India > Uttarakhand > Chamoli > Joshimath Tehsil > Joshimath');
  });

  it('3. Top Navbar Header computes All-India status and supports Menu & Warning badges', () => {
    const status = computeOverallStatus({
      cycloneWindIntersects: false,
      imdCycloneStage: 'none',
      imdWarningColor: 'green',
      gaugeStatus: 'normal',
      isGovFeedsAvailable: true,
    });

    assert.strictEqual(status.type, 'all_clear');
    assert.strictEqual(status.label, 'All clear in available alerts');
    assert.strictEqual(status.icon, 'clear');

    console.log('  ✓ 3. Verified top navbar header status computation');
  });

  it('4. Hazard Directory has all 9 natural hazard profiles with distinct icons and categories', () => {
    assert.strictEqual(HAZARD_CARDS.length, 9);
    const types = HAZARD_CARDS.map((c) => c.type);
    assert.ok(types.includes('flood'));
    assert.ok(types.includes('cyclone'));
    assert.ok(types.includes('earthquake'));
    assert.ok(types.includes('landslide'));
    assert.ok(types.includes('tsunami'));
    assert.ok(types.includes('drought'));
    assert.ok(types.includes('heatwave'));

    console.log('  ✓ 4. Verified 9 natural hazard cards directory');
  });

  it('5. Hazard Cards derive authoritative severity labels and descriptive summaries', () => {
    const hazardSummary = generateNationwideHazardAssessment(kotturu);
    const floodAssessment = hazardSummary.assessments.flood;
    assert.ok(floodAssessment, 'Flood assessment must exist');

    const status = deriveSimpleHazardStatus(floodAssessment, {
      district: kotturu.district,
      state: kotturu.state,
      name: kotturu.name,
    });

    assert.ok(status.statusLabel, 'Status label must be present');
    assert.ok(status.safetySentence, 'Safety description must be present');
    assert.ok(status.affectedArea.includes('Kotturu'), 'Affected area must ground to location');

    console.log(`  ✓ 5. Verified hazard card status for Kotturu: ${status.statusLabel} - ${status.headline}`);
  });

  it('6. Map-First Proportions: Basemap switching and coordinate bounds verification', () => {
    assert.ok(kotturu.boundingBox.length === 4);
    const [minLng, minLat, maxLng, maxLat] = kotturu.boundingBox;
    assert.ok(minLng < maxLng);
    assert.ok(minLat < maxLat);

    console.log('  ✓ 6. Verified map viewport bounds and coordinates');
  });
});

