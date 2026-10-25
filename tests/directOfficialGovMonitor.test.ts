import assert from 'node:assert';
import { test } from 'node:test';
import {
  getUnifiedGovernmentHealthReport,
  auditImdProvider,
  auditCwcProvider,
  auditNwicNwdpProvider,
  auditNdmaSachetProvider,
  auditSdmaProvider,
  auditIsroBhuvanProvider,
  auditNcsProvider,
  auditUsgsProvider,
  auditIncoisProvider,
  auditImdCycloneProvider,
  auditOsmProvider,
  sanitizePayload,
  isPointInIndiaSovereignBoundary,
} from '../src/services/governmentIntegrationService';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Direct Official Government Data Monitor');
console.log(' Six-Dimensional Data Validation & Authoritative Telemetry Audit');
console.log('=============================================================\n');

const kotturuLoc: LocationSearchResult = {
  id: 'loc-kotturu',
  name: 'Kotturu Gram Panchayat',
  displayName: 'Kotturu, Srikakulam, Andhra Pradesh',
  adminLevel: 'village',
  state: 'Andhra Pradesh',
  district: 'Srikakulam',
  center: [83.950, 18.700],
  boundingBox: [83.9, 18.65, 84.0, 18.75],
  source: 'Survey of India',
  regionCategory: 'riverine',
  elevation_m: 45,
};

const vishakapatnamLoc: LocationSearchResult = {
  id: 'loc-vizag',
  name: 'Visakhapatnam Coastal Habitation',
  displayName: 'Visakhapatnam, Andhra Pradesh',
  adminLevel: 'district',
  state: 'Andhra Pradesh',
  district: 'Visakhapatnam',
  center: [83.315, 17.723],
  boundingBox: [83.2, 17.6, 83.4, 17.8],
  source: 'Survey of India',
  regionCategory: 'coastal',
  elevation_m: 8,
};

const desertLoc: LocationSearchResult = {
  id: 'loc-thar',
  name: 'Sam Sand Dunes',
  displayName: 'Sam, Jaisalmer, Rajasthan',
  adminLevel: 'village',
  state: 'Rajasthan',
  district: 'Jaisalmer',
  center: [70.525, 26.832],
  boundingBox: [70.4, 26.7, 70.6, 26.9],
  source: 'Survey of India',
  regionCategory: 'drought_prone',
  elevation_m: 210,
};

test('1. All 11 sources configured and audited when allSources=true', async () => {
  const report = await getUnifiedGovernmentHealthReport(kotturuLoc, { allSources: true });
  assert.strictEqual(report.totalProviders, 11, 'Must report exactly 11 sources');
  assert.strictEqual(report.summary.sourcesConfigured, 11, 'Summary must configure 11 sources');

  const expectedSourceIds = [
    'imd_weather_and_warnings',
    'cwc_river_telemetry',
    'nwic_nwdp_rainfall',
    'ndma_sachet_alerts',
    'sdma_state_emergency',
    'isro_bhuvan_ndem',
    'ncs_seismic',
    'usgs_earthquake_supplementary',
    'incois_tews_tsunami',
    'imd_cyclone_bulletins',
    'osm_geographic_roads',
  ];

  for (const id of expectedSourceIds) {
    const prov = report.providers[id as any];
    assert(prov, `Provider ${id} must be present in report`);
    assert(prov.sixDimensions, `Provider ${id} must contain sixDimensions validation`);
    assert(prov.sourceProvenance, `Provider ${id} must contain sourceProvenance model`);
  }
});

test('2. Six validation dimensions adhere strictly to standardized enums', async () => {
  const report = await getUnifiedGovernmentHealthReport(kotturuLoc, { allSources: true });

  const validConnectivity = ['CONNECTED', 'PARTIAL', 'FAILED', 'NOT_ATTEMPTED'];
  const validAuth = ['PUBLIC_OPEN_ACCESS', 'AUTHENTICATED', 'AUTH_REQUIRED', 'ACCESS_DENIED', 'UNKNOWN'];
  const validSchema = ['VALIDATED', 'INVALID', 'PARTIAL', 'UNVALIDATED'];
  const validFreshness = ['FRESH', 'STALE', 'UNKNOWN', 'UNAVAILABLE'];
  const validGeo = [
    'RELEVANT_TO_SELECTED_LOCATION',
    'RELEVANT_TO_REGION',
    'NATIONAL_COVERAGE',
    'OUTSIDE_COVERAGE',
    'UNMAPPED_LOCATION',
    'UNKNOWN',
  ];
  const validUsability = [
    'USABLE_FOR_CURRENT_LOCATION',
    'USABLE_FOR_REGIONAL_CONTEXT',
    'HISTORICAL_ONLY',
    'OUTSIDE_COVERAGE',
    'UNUSABLE_GEOGRAPHICALLY',
    'UNUSABLE_SCHEMA',
    'UNUSABLE_STALE',
    'UNAVAILABLE',
  ];

  for (const prov of Object.values(report.providers)) {
    const d = prov.sixDimensions;
    assert(validConnectivity.includes(d.connectivity), `Invalid connectivity: ${d.connectivity}`);
    assert(validAuth.includes(d.authentication), `Invalid auth: ${d.authentication}`);
    assert(validSchema.includes(d.schema), `Invalid schema: ${d.schema}`);
    assert(validFreshness.includes(d.freshness), `Invalid freshness: ${d.freshness}`);
    assert(validGeo.includes(d.geographicRelevance), `Invalid geo relevance: ${d.geographicRelevance}`);
    assert(validUsability.includes(d.usability), `Invalid usability: ${d.usability}`);
  }
});

test('3. Top 7 summary KPI metrics are mathematically bounded', async () => {
  const report = await getUnifiedGovernmentHealthReport(kotturuLoc, { allSources: true });
  const s = report.summary;

  assert.strictEqual(s.sourcesConfigured, 11);
  assert(s.reachable >= 0 && s.reachable <= s.sourcesConfigured, 'Reachable count within range');
  assert(s.validSchema >= 0 && s.validSchema <= s.sourcesConfigured, 'Valid schema within range');
  assert(s.fresh >= 0 && s.fresh <= s.sourcesConfigured, 'Fresh count within range');
  assert(s.relevantToLocation >= 0 && s.relevantToLocation <= s.sourcesConfigured, 'Relevant count within range');
  assert(s.usable >= 0 && s.usable <= s.sourcesConfigured, 'Usable count within range');
  assert(s.errorsOrIncomplete >= 0 && s.errorsOrIncomplete <= s.sourcesConfigured, 'Errors count within range');
});

test('4. Sensitive payload credentials and tokens are redacted', () => {
  const testPayload = {
    apiKey: 'secret_live_key_99999',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123',
    endpointUrl: 'https://api.imd.gov.in/v1/forecast?token=top_secret_token_abc',
    district: 'Srikakulam',
    password: 'super_secret_db_pass',
    readings: [
      { tempC: 28.5, privateToken: 'inner_secret' },
    ],
  };

  const sanitized = sanitizePayload(testPayload);

  assert.strictEqual(sanitized.apiKey, '[REDACTED]');
  assert.strictEqual(sanitized.authorization, '[REDACTED]');
  assert.strictEqual(sanitized.password, '[REDACTED]');
  assert.strictEqual(sanitized.district, 'Srikakulam');
  assert(sanitized.endpointUrl.includes('[REDACTED]'));
  assert.strictEqual(sanitized.readings[0].tempC, 28.5);
  assert.strictEqual(sanitized.readings[0].privateToken, '[REDACTED]');
});

test('5. Source Provenance distinguishes GoI official vs Community vs Supplementary', async () => {
  const ncs = await auditNcsProvider(kotturuLoc);
  const usgs = await auditUsgsProvider(kotturuLoc);
  const osm = await auditOsmProvider(kotturuLoc);
  const sdma = await auditSdmaProvider(kotturuLoc);

  assert.strictEqual(ncs.sourceProvenance.sourceType, 'government_official');
  assert.strictEqual(sdma.sourceProvenance.sourceType, 'government_official');
  assert.strictEqual(usgs.sourceProvenance.sourceType, 'international_supplementary');
  assert.strictEqual(osm.sourceProvenance.sourceType, 'community_dataset');

  assert(ncs.sourceProvenance.license.includes('MoES'));
  assert(usgs.sourceProvenance.license.includes('USGS Public Domain'));
  assert(osm.sourceProvenance.license.includes('ODbL'));
  assert(sdma.sourceProvenance.attribution.includes('Andhra Pradesh State Disaster Management Authority'));
});

test('6. Tsunami is physically inapplicable for inland settlements and applicable for coastal', async () => {
  const inlandTsunami = await auditIncoisProvider(kotturuLoc);
  assert.strictEqual(inlandTsunami.sixDimensions.geographicRelevance, 'OUTSIDE_COVERAGE');
  assert(
    ['UNUSABLE_GEOGRAPHICALLY', 'OUTSIDE_COVERAGE'].includes(inlandTsunami.sixDimensions.usability),
    'Inland tsunami usability must be UNUSABLE_GEOGRAPHICALLY or OUTSIDE_COVERAGE'
  );
  assert(inlandTsunami.summaryText.includes('inland'));

  const coastalTsunami = await auditIncoisProvider(vishakapatnamLoc);
  assert.strictEqual(coastalTsunami.sixDimensions.geographicRelevance, 'RELEVANT_TO_SELECTED_LOCATION');
  assert.strictEqual(coastalTsunami.sixDimensions.usability, 'USABLE_FOR_CURRENT_LOCATION');
});

test('7. Transboundary earthquake in Tibet/China is excluded from Indian sovereign territory', () => {
  const nagquTibet = isPointInIndiaSovereignBoundary(92.0, 31.5);
  assert.strictEqual(nagquTibet, false, 'Nagqu, Tibet is strictly outside Indian Sovereign Boundary');

  const srikakulam = isPointInIndiaSovereignBoundary(83.95, 18.70);
  assert.strictEqual(srikakulam, true, 'Srikakulam is inside Indian Sovereign Boundary');

  const jaisalmer = isPointInIndiaSovereignBoundary(70.52, 26.83);
  assert.strictEqual(jaisalmer, true, 'Jaisalmer is inside Indian Sovereign Boundary');
});

test('8. Ungauged desert basin sets unmapped location with zero fake data', async () => {
  const desertCwc = await auditCwcProvider(desertLoc);
  assert.strictEqual(desertCwc.sixDimensions.geographicRelevance, 'UNMAPPED_LOCATION');
  assert(
    ['UNUSABLE_GEOGRAPHICALLY', 'OUTSIDE_COVERAGE'].includes(desertCwc.sixDimensions.usability),
    'Ungauged basin usability must be UNUSABLE_GEOGRAPHICALLY or OUTSIDE_COVERAGE'
  );
  assert.strictEqual(desertCwc.details?.zeroFakeDataPolicy, 'Enforced. No synthetic gauge readings fabricated.');
});

test('9. Stale NWIC telemetry is quarantined and blocked from live calculations', async () => {
  const nwic = await auditNwicNwdpProvider(kotturuLoc);
  assert.strictEqual(nwic.sixDimensions.freshness, 'STALE');
  assert.strictEqual(nwic.sixDimensions.usability, 'UNUSABLE_STALE');
  assert.strictEqual(nwic.sourceProvenance.freshnessStatus, 'STALE');
});
