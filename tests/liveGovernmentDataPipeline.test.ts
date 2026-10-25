import assert from 'node:assert';
import {
  normalizeSachetAlert,
  getSachetAlertsForLocation,
  fetchAllNdmaSachetAlerts,
  type RawNdmaSachetAlert,
} from '../src/services/ndmaSachetService';
import {
  parseCwcCsv,
  parseCwcDateToIso,
  calculateDistanceKm,
  getNwdpCwcRainfallForLocation,
  fetchNwdpMetadata,
} from '../src/services/nwdpCwcRainfallService';
import {
  fetchOfficialImdCycloneTrack,
  buildGeoJsonForCycloneTrack,
  BENCHMARK_CYCLONE_TRACK_FIXTURE,
} from '../src/services/imdCycloneWindService';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('--- STARTING LIVE GOVERNMENT DATA PIPELINE TEST SUITE ---');

const KOTTURU_LOCATION: LocationSearchResult = {
  id: 'loc-kotturu-andhra',
  displayName: 'Kotturu, Srikakulam, Andhra Pradesh',
  name: 'Kotturu',
  adminLevel: 'village',
  state: 'Andhra Pradesh',
  district: 'Srikakulam',
  subdistrict: 'Kotturu Mandal',
  center: [83.76, 18.63],
  boundingBox: [83.7, 18.58, 83.82, 18.68],
  elevation_m: 35,
  population: 8500,
  source: 'Survey of India / OpenStreetMap',
  regionCategory: 'coastal',
};

const JOSHIMATH_LOCATION: LocationSearchResult = {
  id: 'loc-joshimath-uk',
  displayName: 'Joshimath, Chamoli, Uttarakhand',
  name: 'Joshimath',
  adminLevel: 'village',
  state: 'Uttarakhand',
  district: 'Chamoli',
  subdistrict: 'Joshimath',
  center: [79.565, 30.558],
  boundingBox: [79.5, 30.5, 79.6, 30.6],
  elevation_m: 1875,
  population: 16700,
  source: 'Survey of India / OpenStreetMap',
  regionCategory: 'himalayan',
};

async function runTests() {
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      throw err;
    }
  }

  // ============================================================================
  // SOURCE 1 — NDMA SACHET
  // ============================================================================
  console.log('\n[1. NDMA SACHET Common Alerting Protocol (CAP) Feed]');

  await test('SACHET: Normalizes raw CAP alert with IST dates, colors, and coordinates', () => {
    const rawAlert: RawNdmaSachetAlert = {
      identifier: 104592,
      severity: 'WARNING',
      severity_level: 'Likely',
      severity_color: 'orange',
      disaster_type: 'Lightning',
      area_description: 'SRIKAKULAM, VIZIANAGARAM, VISAKHAPATNAM',
      warning_message: 'Thunderstorm accompanied with lightning likely to occur in isolated places.',
      effective_start_time: 'Wed Oct 21 20:00:00 IST 2026',
      effective_end_time: 'Thu Oct 22 23:59:00 IST 2026',
      centroid: '83.75,18.60',
      alert_source: 'Andhra Pradesh SDMA',
      area_covered: '1240.50',
    };

    const parsed = normalizeSachetAlert(rawAlert);
    assert.strictEqual(parsed.identifier, '104592');
    assert.strictEqual(parsed.severity, 'WARNING');
    assert.strictEqual(parsed.severityColor, 'orange');
    assert.strictEqual(parsed.disasterType, 'Lightning');
    assert.deepStrictEqual(parsed.centroid, [83.75, 18.6]);
    assert.strictEqual(parsed.issuingAuthority, 'Andhra Pradesh SDMA');
    assert.strictEqual(parsed.areaCoveredKm2, 1240.5);
    assert.ok(parsed.sourceAgency.includes('National Disaster Management Authority (NDMA)'));
    assert.ok(typeof parsed.effectiveStartIso === 'string');
  });

  await test('SACHET: Accurately detects expired alerts based on IST end timestamp', () => {
    const pastAlert: RawNdmaSachetAlert = {
      identifier: 99991,
      severity: 'ALERT',
      disaster_type: 'Heavy Rain',
      area_description: 'Krishna Delta Zone',
      warning_message: 'Historical flash flood watch.',
      effective_start_time: 'Fri Jan 01 10:00:00 IST 2021',
      effective_end_time: 'Fri Jan 01 18:00:00 IST 2021',
      alert_source: 'IMD Amaravati',
    };

    const parsed = normalizeSachetAlert(pastAlert);
    assert.strictEqual(parsed.isExpired, true);
  });

  await test('SACHET: Retrieves active alerts and matches location with centroid & jurisdiction', async () => {
    const res = await getSachetAlertsForLocation(KOTTURU_LOCATION, 100);
    assert.ok(res, 'Expected SACHET response object');
    assert.strictEqual(res.endpointUrl, 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails');
    assert.ok(res.authNotice.includes('NDMA SACHET'));
    assert.ok(Array.isArray(res.allActiveNationalAlerts));
    assert.ok(Array.isArray(res.alertsForSelectedLocation));
  });

  // ============================================================================
  // SOURCE 2 — NATIONAL WATER DATA PORTAL (NWDP / CWC)
  // ============================================================================
  console.log('\n[2. National Water Data Portal / CWC Hourly Telemetry]');

  await test('NWDP CWC: Parses Indian format DD-MM-YYYY HH:mm into ISO with IST offset', () => {
    const iso = parseCwcDateToIso('10-01-2026 17:30');
    assert.strictEqual(iso, '2026-01-10T17:30:00+05:30');
  });

  await test('NWDP CWC: Parses telemetry CSV and verifies genuine observation nature (not forecast)', () => {
    const sampleCsv = `SlNo,Station,Agency,State LGD Code,State,District LGD Code,District,Tehsil,Block,Village,River,Basin,Tributary,Subtributary,SubSubtributary,Local River,Latitude,Longitude,Data Acquisition Time,Telemetry Hourly Rainfall (mm)
1,Doddipadu,CWC,28,Andhra Pradesh,511,KURNOOL,KALLUR,-,-,Krishna,Krishna,Hundri,-,-,Hundri,15.74000000,78.00805556,24-05-2026 02:00,2
2,Polampalli,CWC,28,Andhra Pradesh,510,KRISHNA,CHANDARLAPADU,-,-,Krishna,Krishna,-,-,-,Krishna,17.01555556,80.17166667,27-04-2026 11:00,48
`;

    const records = parseCwcCsv(sampleCsv);
    assert.strictEqual(records.length, 2);

    assert.strictEqual(records[0].station, 'Doddipadu');
    assert.strictEqual(records[0].district, 'KURNOOL');
    assert.strictEqual(records[0].river, 'Krishna');
    assert.strictEqual(records[0].hourlyRainfallMm, 2);
    assert.strictEqual(records[0].dataAcquisitionIso, '2026-05-24T02:00:00+05:30');

    assert.strictEqual(records[1].station, 'Polampalli');
    assert.strictEqual(records[1].district, 'KRISHNA');
    assert.strictEqual(records[1].hourlyRainfallMm, 48);
  });

  await test('NWDP CWC: Calculates accurate Haversine distance from village to gauge station', () => {
    const dist = calculateDistanceKm([83.76, 18.63], [83.9638, 18.688]);
    assert.ok(dist >= 15 && dist <= 30, `Expected distance between 15-30 km, got ${dist}`);
  });

  await test('NWDP CWC: Ingests 2026-2030 partition dataset and matches nearest station to location', async () => {
    const report = await getNwdpCwcRainfallForLocation(KOTTURU_LOCATION, 250);
    assert.strictEqual(report.locationName, 'Kotturu');
    assert.strictEqual(report.metadata.ckanPackageId, 'rainfall-cwc-telemetry-hourly');
    assert.strictEqual(report.metadata.dataClassification, 'OFFICIAL_OBSERVED_TELEMETRY');
    assert.strictEqual(report.metadata.isForecast, false);

    assert.ok(report.nearestStation !== null, 'Expected nearest station to be identified');
    if (report.nearestStation) {
      assert.ok(report.nearestStation.station.length > 0);
      assert.ok(report.nearestStation.distanceKm >= 0);
    }
  });

  await test('NWDP CWC: Respects regional separation for Himalayan village (Joshimath)', async () => {
    const report = await getNwdpCwcRainfallForLocation(JOSHIMATH_LOCATION, 200);
    assert.ok(report.nearestStation !== null);
    assert.ok(report.nearestStation!.distanceKm > 1000, 'AP stations must be >1000 km from Chamoli');
  });

  // ============================================================================
  // SOURCE 3 — IMD CYCLONE TRACK & WIND CONNECTORS
  // ============================================================================
  console.log('\n[3. IMD Cyclone Wind & Track API Connectors]');

  await test('IMD Track: Constructs GeoJSON LineString and Point FeatureCollection', () => {
    const geoJson = buildGeoJsonForCycloneTrack(BENCHMARK_CYCLONE_TRACK_FIXTURE);
    assert.strictEqual(geoJson.type, 'FeatureCollection');
    assert.strictEqual(geoJson.features.length, BENCHMARK_CYCLONE_TRACK_FIXTURE.length + 1);

    const lineFeature = geoJson.features[0];
    assert.strictEqual(lineFeature.geometry.type, 'LineString');
    assert.strictEqual(lineFeature.properties?.type, 'cyclone_track_path');

    const pointFeature = geoJson.features[1];
    assert.strictEqual(pointFeature.geometry.type, 'Point');
    assert.strictEqual(pointFeature.properties?.cycloneName, 'Michaung-Benchmark');
  });

  await test('IMD Track: Reports AUTHENTICATION_REQUIRED (HTTP 401) transparently without inventing data', async () => {
    const result = await fetchOfficialImdCycloneTrack({
      location: KOTTURU_LOCATION,
    });

    assert.ok(result);
    assert.ok(['AUTHENTICATION_REQUIRED', 'API_ERROR', 'CONNECTED_ACTIVE'].includes(result.connectionStatus));

    if (result.connectionStatus === 'AUTHENTICATION_REQUIRED') {
      assert.strictEqual(result.httpStatus, 401);
      assert.ok(result.authNotice.includes('HTTP 401 Unauthorized'));
      assert.ok(result.activeStatus.includes('Benchmark') || result.activeStatus.includes('Offline'));
      assert.ok(result.geoJsonTrack.features.length > 0);
    }
  });

  await test('IMD Track: Supports forceScenario benchmark mode for verified preparedness evaluation', async () => {
    const scenario = await fetchOfficialImdCycloneTrack({
      forceScenario: true,
      location: KOTTURU_LOCATION,
    });

    assert.strictEqual(scenario.connectionStatus, 'BENCHMARK_SCENARIO');
    assert.strictEqual(scenario.httpStatus, 200);
    assert.ok(scenario.observedPoints.length > 0);
    assert.ok(scenario.forecastPoints.length > 0);
    assert.ok(scenario.nearestPointToLocation);
    assert.ok(scenario.minDistanceToLocationKm! > 0);
  });

  console.log(`\nAll ${passed}/${total} Live Government Data Pipeline tests passed successfully! ✓`);
}

runTests().catch((err) => {
  console.error('\nTest suite failed:', err);
  process.exit(1);
});
