import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  getNwdpCwcRainfallForLocation,
  parseCwcCsv,
  REGISTERED_OFFICIAL_CWC_STATIONS,
} from '../src/services/nwdpCwcRainfallService';
import { auditNwicNwdpProvider } from '../src/services/governmentIntegrationService';
import type { LocationSearchResult } from '../src/types/nationwide';

describe('CWC Telemetry & Historical Rainfall: Gotta Barrage Official Verification Tests', () => {

  const kotturuLocation: LocationSearchResult = {
    id: 'kotturu-gp',
    displayName: 'Kotturu Gram Panchayat, Srikakulam, Andhra Pradesh',
    name: 'Kotturu',
    adminLevel: 'village',
    state: 'Andhra Pradesh',
    district: 'Srikakulam',
    center: [83.950, 18.700], // [lng, lat]
    boundingBox: [83.935, 18.685, 83.965, 18.715],
    source: 'Census of India LGD',
    regionCategory: 'coastal',
  };

  it('1. Verifies unverified Gotta Barrage rainfall entries are removed at source from cwc_rainfall_2026_2030.csv', () => {
    const csvPath = path.resolve(process.cwd(), 'data', 'cwc_rainfall_2026_2030.csv');
    assert.ok(fs.existsSync(csvPath), 'cwc_rainfall_2026_2030.csv must exist');

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    assert.strictEqual(
      csvContent.includes('Gotta Barrage'),
      false,
      'Seed CSV must NOT contain any unverified Gotta Barrage rainfall records'
    );
    assert.strictEqual(
      csvContent.includes('31-08-2026 16:30,111'),
      false,
      'Seed CSV must NOT contain unverified 111 mm/h observation'
    );
    assert.strictEqual(
      csvContent.includes('26-03-2026 20:30,192'),
      false,
      'Seed CSV must NOT contain unverified 192 mm/h peak observation'
    );
  });

  it('2. Verifies parseCwcCsv integrity filter actively drops unverified Gotta Barrage rainfall rows', () => {
    const unverifiedCsv = `SlNo,Station,Agency,State LGD Code,State,District LGD Code,District,Tehsil,Block,Village,River,Basin,Tributary,Subtributary,SubSubtributary,Local River,Latitude,Longitude,Data Acquisition Time,Telemetry Hourly Rainfall (mm)
1,Gotta Barrage,CWC,28,Andhra Pradesh,519,SRIKAKULAM,HEERAMANDALAM,-,-,Vamsadhara,East flowing rivers between Mahanadi and Pennar,-,-,-,Vamsadhara,18.68805556,83.96388889,31-08-2026 16:30,111
2,Doddipadu,CWC,28,Andhra Pradesh,511,KURNOOL,KALLUR,-,-,Krishna,Krishna,Hundri,-,-,Hundri,15.74000000,78.00805556,24-05-2026 02:00,2
`;
    const parsed = parseCwcCsv(unverifiedCsv);
    // Gotta Barrage must be filtered out
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].station, 'Doddipadu');
    assert.strictEqual(parsed[0].hourlyRainfallMm, 2);
  });

  it('3. Preserves official Gotta Barrage station metadata in CWC registry', () => {
    const gottaMeta = REGISTERED_OFFICIAL_CWC_STATIONS.find((s) => s.station === 'Gotta Barrage');
    assert.ok(gottaMeta, 'Gotta Barrage must exist in official registered stations');
    assert.strictEqual(gottaMeta!.station, 'Gotta Barrage');
    assert.strictEqual(gottaMeta!.river, 'Vamsadhara');
    assert.strictEqual(gottaMeta!.agency, 'CWC');
    assert.strictEqual(gottaMeta!.district, 'SRIKAKULAM');
    assert.strictEqual(gottaMeta!.hasVerifiedRainfall, false);

    // Coordinates match official records (~18.69°N, ~83.96°E)
    assert.ok(Math.abs(gottaMeta!.latitude - 18.688) < 0.01, 'Latitude ~18.69°N');
    assert.ok(Math.abs(gottaMeta!.longitude - 83.964) < 0.01, 'Longitude ~83.96°E');
  });

  it('4. Queries CWC telemetry for Kotturu: Gotta Barrage is identified as nearest station without unverified rainfall figures', async () => {
    const report = await getNwdpCwcRainfallForLocation(kotturuLocation, 250);
    assert.ok(report.nearestStation !== null, 'Gotta Barrage should be identified as nearest station (~2 km)');

    const nearest = report.nearestStation!;
    assert.strictEqual(nearest.station, 'Gotta Barrage');
    assert.strictEqual(nearest.river, 'Vamsadhara');
    assert.ok(nearest.distanceKm < 5.0, `Gotta Barrage distance (${nearest.distanceKm} km) must be < 5 km`);

    // Verify unverified rainfall fields are completely stripped
    assert.strictEqual(nearest.hasVerifiedRainfall, false, 'hasVerifiedRainfall must be false');
    assert.strictEqual(nearest.latestObservation, null, 'latestObservation must be null (no 111 mm/h)');
    assert.strictEqual(nearest.peakObservation, null, 'peakObservation must be null (no 192 mm/h peak)');
    assert.strictEqual(nearest.totalObservationsCount, 0);
    assert.strictEqual(nearest.isStale, true, 'Non-live historical telemetry marked isStale=true');
    assert.ok(nearest.observationAgeHours > 24, 'Observation age > 24h');

    // Verify exact required message
    assert.strictEqual(
      nearest.observationStatusDescription,
      'Historical rainfall observations are currently unavailable for verification.'
    );
  });

  it('5. Verifies Government Data Connector honesty: no 111 mm/h, no 192 mm/h, no fabricated timestamp', async () => {
    const nwicProvider = await auditNwicNwdpProvider(kotturuLocation);
    assert.ok(nwicProvider, 'NWIC / NWDP provider must exist');

    assert.strictEqual(nwicProvider.details?.hasVerifiedRainfall, false);
    assert.strictEqual(nwicProvider.details?.recordedTelemetryRainMm, undefined);
    assert.strictEqual(nwicProvider.details?.currentLiveRainfallMm, null);
    assert.strictEqual(nwicProvider.details?.station, 'Gotta Barrage');
    assert.strictEqual(nwicProvider.details?.river, 'Vamsadhara');

    // Observation time should NOT be fabricated 31-08-2026 16:30
    assert.strictEqual(nwicProvider.timestamps.observationTimeIst, null);

    // Status description explains unavailability
    assert.ok(
      nwicProvider.details?.currentRainfallStatus?.includes(
        'Historical rainfall observations are currently unavailable for verification'
      )
    );
  });

  it('6. Verifies official source link points to National Water Data Portal / CWC dataset', async () => {
    const report = await getNwdpCwcRainfallForLocation(kotturuLocation, 250);
    assert.ok(report.metadata.portalUrl.includes('nwdp.nwic.gov.in'));
    assert.strictEqual(report.metadata.ckanPackageId, 'rainfall-cwc-telemetry-hourly');
  });

});
