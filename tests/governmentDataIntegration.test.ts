import assert from 'node:assert';
import {
  getImdLiveDistrictWarnings,
  getImdWarningForLocation,
  getImdLiveCycloneAdvisory,
  getIncoisLiveTsunamiStatus,
  getLiveSeismicEventsForLocation,
  getLiveAtmosphericTelemetry,
  getCwcTelemetryForLocation,
} from '../src/services/governmentDataConnector';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('--- STARTING GOVERNMENT DATA INTEGRATION TEST SUITE ---');

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

  // 1. IMD Live District Warnings
  await test('IMD: Retrieves and parses national district warning dataset (>700 districts)', async () => {
    const warnings = await getImdLiveDistrictWarnings();
    assert.ok(warnings.size >= 700, `Expected at least 700 districts, found ${warnings.size}`);
    
    // Check known districts across states
    assert.ok(warnings.has('KRISHNA'), 'Expected Krishna district to be indexed');
    assert.ok(warnings.has('CHAMOLI'), 'Expected Chamoli district to be indexed');
    assert.ok(warnings.has('JAISALMER'), 'Expected Jaisalmer district to be indexed');
  });

  // 2. IMD Warning for Locations
  await test('IMD: Resolves warning for Kotturu (Krishna district)', async () => {
    const kotturuLoc: LocationSearchResult = {
      id: 'loc-kotturu',
      name: 'Kotturu',
      displayName: 'Kotturu, Krishna, Andhra Pradesh',
      adminLevel: 'village',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      center: [80.842, 16.212],
      boundingBox: [80.822, 16.192, 80.862, 16.232],
      source: 'Local Government Directory',
      regionCategory: 'coastal',
    };

    const warning = await getImdWarningForLocation(kotturuLoc);
    assert.ok(warning, 'Expected IMD warning record for Kotturu/Krishna');
    assert.strictEqual(warning.districtName, 'KRISHNA');
    assert.ok(['No Warning', 'Yellow Watch', 'Orange Alert', 'Red Warning'].includes(warning.alertCategory));
    assert.strictEqual(warning.provenance.agency, 'India Meteorological Department (IMD)');
  });

  // 3. IMD RSMC Cyclone Advisory
  await test('IMD RSMC: Retrieves authoritative cyclone advisory bulletin', async () => {
    const advisory = await getImdLiveCycloneAdvisory();
    assert.strictEqual(advisory.agency, 'RSMC New Delhi / India Meteorological Department');
    assert.ok(['active_system', 'no_active_cyclone', 'pre_cyclonic_watch'].includes(advisory.status));
    assert.ok(advisory.bulletinUrl.includes('rsmcnewdelhi.imd.gov.in'));
    assert.ok(advisory.officialAdvisoryText.length > 20);
  });

  // 4. INCOIS Tsunami Status
  await test('INCOIS: Retrieves official Indian Tsunami Early Warning System (ITEWS) status', async () => {
    const tsunamiStatus = await getIncoisLiveTsunamiStatus();
    assert.ok(tsunamiStatus.agency.includes('Indian National Centre for Ocean Information Services'));
    assert.strictEqual(tsunamiStatus.systemName, 'Indian Tsunami Early Warning System (ITEWS)');
    assert.ok(['NO_THREAT', 'WARNING', 'ALERT', 'WATCH'].includes(tsunamiStatus.threatStatus));
    assert.ok(tsunamiStatus.portalUrl.includes('tsunami.incois.gov.in'));
  });

  // 5. NCS / USGS Real-time Seismic Feed
  await test('NCS/USGS: Retrieves real-time seismic events covering Indian subcontinent bounding box', async () => {
    const kotturuLoc: LocationSearchResult = {
      id: 'loc-kotturu',
      name: 'Kotturu',
      displayName: 'Kotturu, Krishna, Andhra Pradesh',
      adminLevel: 'village',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      center: [80.842, 16.212],
      boundingBox: [80.822, 16.192, 80.862, 16.232],
      source: 'Local Government Directory',
      regionCategory: 'coastal',
    };
    const seismicData = await getLiveSeismicEventsForLocation(kotturuLoc);
    assert.ok(Array.isArray(seismicData.events), 'Expected array of seismic events');
    
    // Check structure of first event if present
    if (seismicData.events.length > 0) {
      const ev = seismicData.events[0];
      assert.ok(typeof ev.magnitude === 'number');
      assert.ok(Array.isArray(ev.coordinates));
      assert.strictEqual(ev.coordinates.length, 2);
      assert.ok(typeof ev.distanceToVillageKm === 'number');
      assert.strictEqual(ev.agencySource, 'USGS / National Center for Seismology (NCS) Federation');
    }
  });

  // 6. CWC River Gauge Matching for Different Basins
  test('CWC: Matches correct river basin and gauge station for Kotturu (Krishna River)', () => {
    const kotturuLoc: LocationSearchResult = {
      id: 'loc-kotturu',
      name: 'Kotturu',
      displayName: 'Kotturu, Krishna, Andhra Pradesh',
      adminLevel: 'village',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      center: [80.842, 16.212],
      boundingBox: [80.822, 16.192, 80.862, 16.232],
      source: 'Local Government Directory',
      regionCategory: 'coastal',
    };
    const cwc = getCwcTelemetryForLocation(kotturuLoc);
    assert.strictEqual(cwc.stationName, 'Prakasam Barrage Hydraulic Station');
    assert.strictEqual(cwc.riverName, 'Krishna River');
    assert.strictEqual(cwc.currentLevelM, 15.2);
    assert.strictEqual(cwc.warningLevelM, 16.5);
    assert.strictEqual(cwc.dangerLevelM, 17.5);
    assert.strictEqual(cwc.status, 'Normal / Below Warning');
  });

  test('CWC: Matches correct river basin and gauge station for Majuli (Brahmaputra River)', () => {
    const majuliLoc: LocationSearchResult = {
      id: 'loc-majuli',
      name: 'Majuli',
      displayName: 'Majuli Island, Majuli, Assam',
      adminLevel: 'village',
      state: 'Assam',
      district: 'Majuli',
      center: [94.216, 26.963],
      boundingBox: [94.0, 26.8, 94.4, 27.1],
      source: 'Local Government Directory',
      regionCategory: 'island',
    };
    const cwc = getCwcTelemetryForLocation(majuliLoc);
    assert.strictEqual(cwc.stationName, 'Neamati Ghat River Gauge');
    assert.strictEqual(cwc.riverName, 'Brahmaputra');
    assert.strictEqual(cwc.warningLevelM, 85.04);
  });

  test('CWC: Matches correct river basin and gauge station for Joshimath (Alaknanda River)', () => {
    const joshimathLoc: LocationSearchResult = {
      id: 'loc-joshimath',
      name: 'Joshimath',
      displayName: 'Joshimath, Chamoli, Uttarakhand',
      adminLevel: 'village',
      state: 'Uttarakhand',
      district: 'Chamoli',
      center: [79.565, 30.557],
      boundingBox: [79.54, 30.54, 79.58, 30.57],
      source: 'Local Government Directory',
      regionCategory: 'himalayan',
    };
    const cwc = getCwcTelemetryForLocation(joshimathLoc);
    assert.strictEqual(cwc.stationName, 'Joshimath Hydro-Telemetry Gauge');
    assert.strictEqual(cwc.riverName, 'Alaknanda River');
  });

  // 7. Live Atmospheric Telemetry
  await test('Telemetry: Retrieves live surface weather observations for coordinates', async () => {
    const weather = await getLiveAtmosphericTelemetry(16.212, 80.842);
    assert.ok(typeof weather.temperatureC === 'number');
    assert.ok(typeof weather.windSpeedKmh === 'number');
    assert.ok(typeof weather.humidityPercent === 'number');
    assert.ok(weather.timestamp);
    assert.ok(weather.source.includes('Meteorological Telemetry'));
  });

  console.log(`\n--- GOVERNMENT DATA INTEGRATION TEST COMPLETE: ${passed}/${total} PASSED ---`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
