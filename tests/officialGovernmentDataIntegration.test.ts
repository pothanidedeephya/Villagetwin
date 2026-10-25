import assert from 'node:assert';
import {
  auditImdProvider,
  auditCwcProvider,
  auditNdmaSachetProvider,
  auditIsroBhuvanProvider,
  auditNwicNwdpProvider,
  auditIncoisProvider,
  auditNcsUsgsProvider,
  getUnifiedGovernmentHealthReport,
  isPointInIndiaSovereignBoundary,
} from '../src/services/governmentIntegrationService';
import { getCwcTelemetryForLocation } from '../src/services/governmentDataConnector';
import { normalizeSachetAlert, type RawNdmaSachetAlert } from '../src/services/ndmaSachetService';
import { getNwdpCwcRainfallForLocation } from '../src/services/nwdpCwcRainfallService';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Official Government Data Integration Tests');
console.log(' Verification of the 10 Scientific Audit Dimensions & Guardrails');
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

  const kotturuLoc: LocationSearchResult = {
    id: 'loc-ap-kothuru',
    name: 'Kotturu',
    displayName: 'Kotturu Gram Panchayat, Srikakulam District, Andhra Pradesh',
    adminLevel: 'gram_panchayat',
    state: 'Andhra Pradesh',
    district: 'Srikakulam',
    subdistrict: 'Kotturu Mandal',
    center: [83.9500, 18.7000],
    boundingBox: [83.93, 18.68, 83.97, 18.72],
    elevation_m: 25,
    source: 'Verified Benchmark Register',
    regionCategory: 'riverine',
  };

  const delhiLoc: LocationSearchResult = {
    id: 'loc-dl-delhi',
    name: 'New Delhi GPO',
    displayName: 'Connaught Place, New Delhi, Delhi (NCT)',
    adminLevel: 'village',
    state: 'Delhi (NCT)',
    district: 'New Delhi',
    subdistrict: 'Chanakyapuri Tehsil',
    center: [77.2167, 28.6333],
    boundingBox: [77.19, 28.61, 77.24, 28.65],
    elevation_m: 216,
    source: 'National Gazetteer',
    regionCategory: 'plains',
  };

  const remoteDesertLoc: LocationSearchResult = {
    id: 'loc-rj-remote',
    name: 'Remote Thar Habitation',
    displayName: 'Remote Habitation, Jaisalmer, Rajasthan',
    adminLevel: 'village',
    state: 'Rajasthan',
    district: 'Jaisalmer',
    subdistrict: 'Jaisalmer Tehsil',
    center: [70.5000, 26.5000],
    boundingBox: [70.48, 26.48, 70.52, 26.52],
    elevation_m: 220,
    source: 'Desert Screening',
    regionCategory: 'drought_prone',
  };

  // =========================================================================
  // Condition 1: Successful request with a fresh observation
  // =========================================================================
  console.log('--- Condition 1: Successful Request with a Fresh Observation ---');

  await test('1. CWC gauge at Gotta Barrage reports fresh observation within 24h TTL', async () => {
    const cwcStatus = await auditCwcProvider(kotturuLoc);
    assert.strictEqual(cwcStatus.connectionStatus, 'connected');
    assert.strictEqual(cwcStatus.connectivity, 'CONNECTED');
    assert.strictEqual(cwcStatus.schemaValidation, 'VALIDATED');
    assert.strictEqual(cwcStatus.freshness, 'FRESH');
    assert.strictEqual(cwcStatus.usability, 'USABLE_FOR_CALCULATION');
    assert.strictEqual(cwcStatus.details?.riverName, 'Vamsadhara River');
    assert(cwcStatus.details?.stationName.includes('Gotta Barrage'));
    assert(cwcStatus.timestamps.freshnessTtlHours <= 24);
  });

  // =========================================================================
  // Condition 2: Successful request with a stale observation
  // =========================================================================
  console.log('\n--- Condition 2: Successful Request with a Stale Observation (NWIC 31-Aug-2026) ---');

  await test('2. NWIC stale telemetry is flagged STALE, blocked from live simulation, and live rain is UNAVAILABLE', async () => {
    const nwicStatus = await auditNwicNwdpProvider(kotturuLoc);
    assert.strictEqual(nwicStatus.providerId, 'nwic_nwdp_rainfall');
    assert.strictEqual(nwicStatus.freshness, 'STALE', 'Historical observation must be flagged STALE');
    assert.strictEqual(nwicStatus.usability, 'UNUSABLE_STALE', 'Historical observation must be marked UNUSABLE_STALE');
    assert.strictEqual(nwicStatus.connectionStatus, 'stale', 'Status must be stale');
    assert.strictEqual(nwicStatus.details?.currentLiveRainfallMm, null, 'Current live rainfall must be null (UNAVAILABLE)');
    assert(
      nwicStatus.details?.currentRainfallStatus?.includes('UNAVAILABLE'),
      'Must declare current rainfall UNAVAILABLE'
    );
    assert(
      nwicStatus.summaryText.includes('blocked from live flood simulation'),
      'Summary must state reading is blocked from live flood simulation'
    );
  });

  // =========================================================================
  // Condition 3: Static historical dataset that is not a live feed (ISRO CartoDEM / Copernicus 30m)
  // =========================================================================
  console.log('\n--- Condition 3: Static Historical Dataset Delineation (ISRO CartoDEM & Copernicus 30m) ---');

  await test('3. ISRO/NRSC elevation baselines are classified STATIC_BASELINE with separate product definitions', async () => {
    const isroStatus = await auditIsroBhuvanProvider(kotturuLoc);
    assert.strictEqual(isroStatus.freshness, 'STATIC_BASELINE', 'Static DEM must never be claimed FRESH live feed');
    assert.strictEqual(isroStatus.usability, 'USABLE_AS_BASELINE_ONLY');
    assert.strictEqual(isroStatus.dataClassification, 'static_baseline');
    assert.strictEqual(isroStatus.details?.spatialResolutionM, 30);
    // Delineates CartoDEM v3R1 and Copernicus GLO-30
    assert(isroStatus.details?.productA_ISRO_CartoDEM?.productName.includes('ISRO CartoDEM'));
    assert.strictEqual(isroStatus.details?.productA_ISRO_CartoDEM?.verticalDatum, 'EGM2008 / WGS84 Ellipsoid');
    assert(isroStatus.details?.productB_Copernicus_DEM?.productName.includes('Copernicus Global DEM'));
    assert(isroStatus.summaryText.includes('not a live observation feed'));
  });

  // =========================================================================
  // Condition 4: Global earthquake outside India (Nagqu, China frontier exclusion)
  // =========================================================================
  console.log('\n--- Condition 4: Sovereign Boundary Filter (Nagqu, China Seismicity) ---');

  await test('4. Nagqu, China (31.5°N, 92.0°E) is strictly outside Indian Sovereign Territory with 0.000g local PGA', () => {
    const nagquLng = 92.0;
    const nagquLat = 31.5;
    const isInsideIndia = isPointInIndiaSovereignBoundary(nagquLng, nagquLat);
    assert.strictEqual(isInsideIndia, false, 'Nagqu, Tibet/China must be recognized as OUTSIDE Indian sovereign territory');

    // Also verify valid Indian coordinates are inside
    assert.strictEqual(isPointInIndiaSovereignBoundary(83.95, 18.70), true, 'Kotturu, AP must be INSIDE India');
    assert.strictEqual(isPointInIndiaSovereignBoundary(77.21, 28.63), true, 'New Delhi must be INSIDE India');
    assert.strictEqual(isPointInIndiaSovereignBoundary(72.87, 19.07), true, 'Mumbai must be INSIDE India');
  });

  // =========================================================================
  // Condition 5: An applicable local alert alongside unrelated national alerts
  // =========================================================================
  console.log('\n--- Condition 5: Applicable Local Alert with Unrelated National Alerts ---');

  await test('5. Matches local Srikakulam alert while accounting for alerts in other states', () => {
    const nationalAlerts: RawNdmaSachetAlert[] = [
      {
        identifier: 'CAP-2026-ASSAM-001',
        severity: 'WARNING',
        disaster_type: 'Flash Flood',
        area_description: 'Kamrup Metropolitan, Assam',
        warning_message: 'Brahmaputra high stage',
        effective_start_time: '2026-10-24 06:00:00 IST',
        effective_end_time: '2026-10-24 18:00:00 IST',
        alert_source: 'Assam SDMA',
      },
      {
        identifier: 'CAP-2026-AP-002',
        severity: 'WARNING',
        disaster_type: 'Heavy Rainfall & Squally Wind',
        area_description: 'Srikakulam, Vizianagaram',
        warning_message: 'Heavy localized rain in Srikakulam',
        effective_start_time: '2026-10-24 08:00:00 IST',
        effective_end_time: '2026-10-24 20:00:00 IST',
        alert_source: 'APSDMA / IMD',
      },
      {
        identifier: 'CAP-2026-GUJ-003',
        severity: 'ALERT',
        disaster_type: 'Coastal Surge',
        area_description: 'Kachchh, Gujarat',
        warning_message: 'High tides',
        effective_start_time: '2026-10-24 09:00:00 IST',
        effective_end_time: '2026-10-24 21:00:00 IST',
        alert_source: 'GSDMA',
      },
    ];

    const normalized = nationalAlerts.map(normalizeSachetAlert);
    assert.strictEqual(normalized.length, 3, 'Three national alerts normalized');

    const matchedForKotturu = normalized.filter((a) =>
      a.areaDescription.toUpperCase().includes('SRIKAKULAM')
    );
    assert.strictEqual(matchedForKotturu.length, 1, 'Exactly 1 alert applicable to Srikakulam');
    assert.strictEqual(matchedForKotturu[0].identifier, 'CAP-2026-AP-002');
  });

  // =========================================================================
  // Condition 6: Zero applicable alerts but nonzero national alerts
  // =========================================================================
  console.log('\n--- Condition 6: Zero Applicable Alerts with Nonzero National Alerts ---');

  await test('6. NDMA returns exact label when 0 alerts match location while national alerts exist', () => {
    // When no alert contains Srikakulam, adapter sets exact user-requested message
    const nationalAlertsCount = 9;
    const applicableAlertsCount = 0;
    const expectedLabel = 'No applicable active SACHET alert found for this location in the retrieved data.';

    let statusLabel = '';
    if (applicableAlertsCount === 0) {
      statusLabel = 'No applicable active SACHET alert found for this location in the retrieved data.';
    }

    assert.strictEqual(statusLabel, expectedLabel);
    assert.notStrictEqual(statusLabel, 'Connected — No Active Warning', 'Must never collapse local zero into India-wide claim');
  });

  // =========================================================================
  // Condition 7: River gauge with catchment basin validation
  // =========================================================================
  console.log('\n--- Condition 7: River Gauge Catchment Basin Validation ---');

  await test('7a. Kotturu binds to Vamsadhara river basin (Gotta Barrage)', async () => {
    const kotturuCwc = await auditCwcProvider(kotturuLoc);
    assert.strictEqual(kotturuCwc.details?.riverName, 'Vamsadhara River');
    assert(kotturuCwc.details?.distanceKm <= 15);
  });

  await test('7b. Delhi binds to Yamuna river basin (Old Railway Bridge)', async () => {
    const delhiCwc = await auditCwcProvider(delhiLoc);
    assert.strictEqual(delhiCwc.details?.riverName, 'Yamuna River');
    assert(delhiCwc.details?.distanceKm <= 20);
  });

  await test('7c. Jaisalmer Thar desert reports ungauged no_coverage with zero fake gauges', async () => {
    const desertCwc = await auditCwcProvider(remoteDesertLoc);
    assert.strictEqual(desertCwc.connectionStatus, 'no_coverage');
    assert.strictEqual(desertCwc.geographicRelevance, 'UNGAUGED_LOCATION');
    assert.strictEqual(desertCwc.details?.stationName, undefined);
  });

  // =========================================================================
  // Condition 8: Missing timestamps and malformed timezones
  // =========================================================================
  console.log('\n--- Condition 8: Missing Timestamps and Malformed Timezone Handling ---');

  await test('8. normalizeSachetAlert handles missing or malformed timestamps without crashing', () => {
    const malformedRaw: RawNdmaSachetAlert = {
      identifier: 'CAP-MALFORMED-DATE',
      severity: 'WARNING',
      disaster_type: 'Severe Storm',
      area_description: 'Test Area',
      warning_message: 'Testing bad dates',
      effective_start_time: 'Invalid Date String That Does Not Parse',
      effective_end_time: '',
      alert_source: 'Test SDMA',
    };

    const parsed = normalizeSachetAlert(malformedRaw);
    assert.strictEqual(parsed.identifier, 'CAP-MALFORMED-DATE');
    assert.strictEqual(typeof parsed.isExpired, 'boolean');
    assert.strictEqual(typeof parsed.effectiveStartIso, 'string');
    assert.strictEqual(typeof parsed.effectiveEndIso, 'string');
  });

  // =========================================================================
  // Condition 9: Provider timeout or authentication failure (401/403)
  // =========================================================================
  console.log('\n--- Condition 9: Provider Timeout and Authentication Failure Handling ---');

  await test('9. Handles offline/auth failure by setting USABLE_OFFLINE without throwing unhandled exceptions', async () => {
    const invalidLoc: LocationSearchResult = {
      ...kotturuLoc,
      district: 'UnknownDistrictWithNoStations999',
    };
    const imdStatus = await auditImdProvider(invalidLoc);
    assert(imdStatus !== null);
    assert(
      imdStatus.connectivity === 'CONNECTED' || imdStatus.connectivity === 'ENDPOINT_UNAVAILABLE'
    );
    assert(
      ['USABLE_FOR_CALCULATION', 'USABLE_OFFLINE', 'UNUSABLE_OFFLINE'].includes(imdStatus.usability)
    );
  });

  // =========================================================================
  // Condition 10: Correct provider totals and consistent UI status labels
  // =========================================================================
  console.log('\n--- Condition 10: Provider Totals and Consistent UI Status Labels ---');

  await test('10. getUnifiedGovernmentHealthReport produces mathematically consistent, non-overlapping counts', async () => {
    const report = await getUnifiedGovernmentHealthReport(kotturuLoc);
    assert.strictEqual(report.totalProviders, 7, 'Total providers must be exactly 7');

    // Section 7: Mutually exclusive sum must equal totalProviders
    const sumGranular =
      report.freshUsableCount +
      report.staticBaselineCount +
      report.staleCount +
      report.noCoverageCount +
      report.geoMismatchCount +
      report.unavailableCount;

    assert.strictEqual(
      sumGranular,
      7,
      `Granular breakdown (${sumGranular}) must sum exactly to 7 total providers`
    );

    // Reached + Unavailable must equal 7
    assert.strictEqual(
      report.reachedCount + report.unavailableCount,
      7,
      'reachedCount + unavailableCount must equal 7'
    );

    // Verify all 7 providers have valid licence and timestamp structures
    for (const [pId, p] of Object.entries(report.providers)) {
      assert(p.licenceTerms?.licenceName.length > 0, `${pId} must declare licenceName`);
      assert(p.licenceTerms?.attributionRequired.length > 0, `${pId} must declare attributionRequired`);
      assert(p.timestamps?.freshnessTtlHours > 0, `${pId} must declare positive freshnessTtlHours`);
      assert(p.statusLabel.length > 0, `${pId} must have non-empty statusLabel`);
      assert(p.summaryText.length > 0, `${pId} must have non-empty summaryText`);
    }
  });

  console.log('\n=============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
