import {
  scoreToRiskLevel,
  getSeismicZone,
  getLandslideSusceptibility,
  getCycloneHazard,
  getTsunamiHazard,
  getDroughtHazard,
  getHeatwaveHazard,
  getFloodHazard,
  getWaterloggingHazard,
  generateNationwideHazardAssessment,
} from '../src/services/indiaHazardEngine';
import { auditVillageHazardAccuracy } from '../src/services/hazardAuditService';
import type { LocationSearchResult } from '../src/types/nationwide';
import type { HazardType, RiskLevel } from '../src/types/hazard';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗\x1b[0m ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

function assertStrictEqual<T>(actual: T, expected: T, testName: string) {
  assert(
    actual === expected,
    testName,
    `Expected "${expected}", received "${actual}"`
  );
}

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Scientific Hazard Audit & Validation');
console.log('=============================================================\n');

// ---------------------------------------------------------------------------
// SUITE 1: Universal Score-to-Risk-Level Threshold Mapping
// ---------------------------------------------------------------------------
console.log('--- Suite 1: Boundary & Threshold Classification ---');

// Low: 0 - 30
assertStrictEqual(scoreToRiskLevel(0), 'low', 'score 0 maps to low');
assertStrictEqual(scoreToRiskLevel(15), 'low', 'score 15 maps to low');
assertStrictEqual(scoreToRiskLevel(30), 'low', 'score 30 boundary maps to low');

// Moderate: 31 - 60
assertStrictEqual(scoreToRiskLevel(31), 'moderate', 'score 31 boundary maps to moderate');
assertStrictEqual(scoreToRiskLevel(45), 'moderate', 'score 45 maps to moderate');
assertStrictEqual(scoreToRiskLevel(60), 'moderate', 'score 60 boundary maps to moderate');

// High: 61 - 80
assertStrictEqual(scoreToRiskLevel(61), 'high', 'score 61 boundary maps to high');
assertStrictEqual(scoreToRiskLevel(70), 'high', 'score 70 maps to high');
assertStrictEqual(scoreToRiskLevel(80), 'high', 'score 80 boundary maps to high');

// Very High: 81 - 100
assertStrictEqual(scoreToRiskLevel(81), 'very_high', 'score 81 boundary maps to very_high');
assertStrictEqual(scoreToRiskLevel(95), 'very_high', 'score 95 maps to very_high');
assertStrictEqual(scoreToRiskLevel(100), 'very_high', 'score 100 boundary maps to very_high');

// Bounding & Clamping
assertStrictEqual(scoreToRiskLevel(-10), 'low', 'negative score clamps to low');
assertStrictEqual(scoreToRiskLevel(150), 'very_high', 'score > 100 clamps to very_high');


// ---------------------------------------------------------------------------
// SUITE 2: Benchmark Locations Scientific Assessment
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: Benchmark Geography Validations ---');

const kotturu: LocationSearchResult = {
  id: 'kotturu_gp',
  displayName: 'Kotturu Gram Panchayat, Krishna, Andhra Pradesh',
  name: 'Kotturu',
  adminLevel: 'gram_panchayat',
  state: 'Andhra Pradesh',
  district: 'Krishna',
  subdistrict: 'Vijayawada Rural',
  center: [80.5516, 16.5912],
  boundingBox: [80.53, 16.57, 80.57, 16.61],
  elevation_m: 8.5,
  population: 4200,
  source: 'Survey of India / OSM',
  regionCategory: 'coastal',
};

const joshimath: LocationSearchResult = {
  id: 'joshimath_uk',
  displayName: 'Joshimath, Chamoli, Uttarakhand',
  name: 'Joshimath',
  adminLevel: 'village',
  state: 'Uttarakhand',
  district: 'Chamoli',
  subdistrict: 'Joshimath',
  center: [79.5661, 30.5583],
  boundingBox: [79.54, 30.53, 79.59, 30.58],
  elevation_m: 1890,
  population: 16700,
  source: 'Survey of India',
  regionCategory: 'himalayan',
};

const pokhran: LocationSearchResult = {
  id: 'pokhran_rj',
  displayName: 'Pokhran, Jaisalmer, Rajasthan',
  name: 'Pokhran',
  adminLevel: 'village',
  state: 'Rajasthan',
  district: 'Jaisalmer',
  center: [71.7588, 26.9208],
  boundingBox: [71.72, 26.89, 71.79, 26.95],
  elevation_m: 233,
  population: 22000,
  source: 'Survey of India',
  regionCategory: 'drought_prone',
};

const majuli: LocationSearchResult = {
  id: 'majuli_as',
  displayName: 'Majuli River Island, Assam',
  name: 'Majuli',
  adminLevel: 'district',
  state: 'Assam',
  district: 'Majuli',
  center: [94.2167, 26.95],
  boundingBox: [94.1, 26.85, 94.35, 27.05],
  elevation_m: 84,
  population: 167000,
  source: 'Survey of India',
  regionCategory: 'riverine',
};

// Benchmark 1: Kotturu (Krishna Delta, AP)
console.log('\n  [Location 1: Kotturu Gram Panchayat (Coastal Delta)]');
const kotturuSeismic = getSeismicZone(kotturu.state, kotturu.district, kotturu.center[0], kotturu.center[1]);
assertStrictEqual(kotturuSeismic.zone, 'Zone III', 'Kotturu is BIS IS 1893:2016 Zone III');
assertStrictEqual(kotturuSeismic.riskLevel, 'moderate', 'Zone III maps to moderate seismic risk');
assert(kotturuSeismic.pga === 0.16, 'Zone III design PGA is 0.16g');

const kotturuLandslide = getLandslideSusceptibility(kotturu);
assertStrictEqual(kotturuLandslide.applicable, false, 'Landslide is not applicable on Krishna delta alluvial flat');
assertStrictEqual(kotturuLandslide.riskLevel, 'low', 'Kotturu landslide risk is LOW');
assert(kotturuLandslide.slopeDeg < 1.0, `Kotturu delta slope is flat (${kotturuLandslide.slopeDeg}°)`);

const kotturuCyclone = getCycloneHazard(kotturu);
assert(kotturuCyclone.windSpeedMs >= 50, `Kotturu wind zone is Vb >= 50 m/s (found ${kotturuCyclone.windSpeedMs} m/s)`);
assert(kotturuCyclone.riskLevel === 'very_high' || kotturuCyclone.riskLevel === 'high', 'Kotturu East Coast is High or Very High cyclone zone');

// Benchmark 2: Joshimath (Chamoli, High Himalaya)
console.log('\n  [Location 2: Joshimath (Himalayan Fault / Steeps)]');
const joshimathSeismic = getSeismicZone(joshimath.state, joshimath.district, joshimath.center[0], joshimath.center[1]);
assertStrictEqual(joshimathSeismic.zone, 'Zone V', 'Joshimath is BIS IS 1893 Zone V');
assertStrictEqual(joshimathSeismic.riskLevel, 'very_high', 'Zone V maps to Very High seismic risk');
assert(joshimathSeismic.pga === 0.36, 'Zone V design PGA is 0.36g');

const joshimathLandslide = getLandslideSusceptibility(joshimath);
assertStrictEqual(joshimathLandslide.applicable, true, 'Landslide is applicable in steep Himalayan terrain');
assertStrictEqual(joshimathLandslide.riskLevel, 'very_high', 'Joshimath landslide risk is Very High');
assert(joshimathLandslide.slopeDeg >= 25, `Joshimath slope is steep (${joshimathLandslide.slopeDeg}°)`);

const joshimathTsunami = getTsunamiHazard(joshimath);
assertStrictEqual(joshimathTsunami.applicable, false, 'Tsunami is not applicable at 1890m elevation in Himalayas');
assertStrictEqual(joshimathTsunami.riskLevel, 'low', 'Joshimath tsunami risk is LOW');

const joshimathHeatwave = getHeatwaveHazard(joshimath);
assertStrictEqual(joshimathHeatwave.riskLevel, 'low', 'Alpine Joshimath heatwave risk is LOW');

// Benchmark 3: Pokhran (Thar Arid Zone)
console.log('\n  [Location 3: Pokhran (Thar Desert)]');
const pokhranDrought = getDroughtHazard(pokhran);
assertStrictEqual(pokhranDrought.riskLevel, 'very_high', 'Pokhran Thar desert drought risk is Very High');
assert(pokhranDrought.score >= 80, `Pokhran drought score >= 80 (found ${pokhranDrought.score})`);

const pokhranHeatwave = getHeatwaveHazard(pokhran);
assertStrictEqual(pokhranHeatwave.riskLevel, 'very_high', 'Pokhran summer heatwave risk is Very High');

const pokhranLandslide = getLandslideSusceptibility(pokhran);
assertStrictEqual(pokhranLandslide.applicable, false, 'Landslide is not applicable on desert plains');
assertStrictEqual(pokhranLandslide.riskLevel, 'low', 'Pokhran landslide risk is LOW');

const pokhranTsunami = getTsunamiHazard(pokhran);
assertStrictEqual(pokhranTsunami.applicable, false, 'Tsunami is not applicable in Rajasthan desert');

// Benchmark 4: Majuli (Brahmaputra Active Riverine Alluvial Island)
console.log('\n  [Location 4: Majuli (Assam Riverine Island)]');
const majuliFlood = getFloodHazard(majuli);
assertStrictEqual(majuliFlood.riskLevel, 'very_high', 'Majuli Brahmaputra flood risk is Very High');
assert(majuliFlood.score >= 80, `Majuli flood score >= 80 (found ${majuliFlood.score})`);

const majuliSeismic = getSeismicZone(majuli.state, majuli.district, majuli.center[0], majuli.center[1]);
assertStrictEqual(majuliSeismic.zone, 'Zone V', 'Assam Majuli is BIS IS 1893 Zone V');
assertStrictEqual(majuliSeismic.riskLevel, 'very_high', 'Zone V seismic is Very High');


// ---------------------------------------------------------------------------
// SUITE 3: Multi-Hazard Summary Integrity & Evidence Chain
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Multi-Hazard Summary & Evidence Transparency ---');

const testLocations = [kotturu, joshimath, pokhran, majuli];
const hazardKeys: HazardType[] = [
  'flood',
  'waterlogging',
  'cyclone',
  'heatwave',
  'wildfire',
  'earthquake',
  'landslide',
  'tsunami',
  'drought',
];

const validEvidenceTypes = new Set([
  'Official observation or warning',
  'Forecast',
  'Modelled estimate',
  'Preliminary screening',
  'Illustrative demo',
  'Insufficient data',
]);

testLocations.forEach((loc) => {
  const summary = generateNationwideHazardAssessment(loc);

  assert(summary.villageName === loc.name, `${loc.name}: Summary references villageName (${summary.villageName})`);
  assert(
    summary.compositeRiskScore >= 0 && summary.compositeRiskScore <= 100,
    `${loc.name}: Composite risk score ${summary.compositeRiskScore} is within [0, 100]`
  );
  assert(
    summary.highestRiskHazards.length > 0,
    `${loc.name}: Has identified highest risk hazards (${summary.highestRiskHazards.join(', ')})`
  );

  hazardKeys.forEach((hazardKey) => {
    const assessment = summary.assessments[hazardKey];
    assert(assessment !== undefined, `${loc.name} -> ${hazardKey}: Assessment exists`);
    if (!assessment) return;

    // Strict Score-to-Level Consistency
    assertStrictEqual(
      assessment.riskLevel,
      scoreToRiskLevel(assessment.scientificScore),
      `${loc.name} -> ${hazardKey}: Score (${assessment.scientificScore}) strictly matches riskLevel (${assessment.riskLevel})`
    );

    // Evidence object completeness
    assert(assessment.evidence !== undefined, `${loc.name} -> ${hazardKey}: Evidence object exists`);
    if (assessment.evidence) {
      assert(
        validEvidenceTypes.has(assessment.evidence.evidenceType),
        `${loc.name} -> ${hazardKey}: Valid evidenceType (${assessment.evidence.evidenceType})`
      );
      assert(
        assessment.evidence.inputsUsed.length > 0,
        `${loc.name} -> ${hazardKey}: Has verified input parameters (${assessment.evidence.inputsUsed.length} inputs)`
      );
      assert(
        assessment.evidence.assessmentMethod.length > 20,
        `${loc.name} -> ${hazardKey}: Has scientific methodology description`
      );
      assert(
        assessment.evidence.classificationThresholds.length === 4,
        `${loc.name} -> ${hazardKey}: Has 4-tier authoritative thresholds`
      );
      assert(
        assessment.evidence.qualityWarnings.length > 0,
        `${loc.name} -> ${hazardKey}: Discloses data quality warnings / limitations`
      );
      assert(
        assessment.evidence.validationStatus !== undefined,
        `${loc.name} -> ${hazardKey}: Has validation status (${assessment.evidence.validationStatus})`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: Independent Accuracy & Recalculation Audit Verification
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Independent Accuracy Audit & Recalculation Verification ---');

testLocations.forEach((loc) => {
  const summary = generateNationwideHazardAssessment(loc);
  const auditReport = auditVillageHazardAccuracy(loc, summary);

  assert(auditReport.villageName === loc.name, `${loc.name}: Audit report references correct village`);
  assert(auditReport.totalHazards === 9, `${loc.name}: All 9 hazards audited`);
  assertStrictEqual(auditReport.mismatchesCount, 0, `${loc.name}: Exactly 0 mismatches found`);
  assertStrictEqual(auditReport.matchesCount, 9, `${loc.name}: All 9 hazards verified as MATCH`);

  // Flood-specific checks
  const floodAudit = auditReport.items.find((i) => i.hazardType === 'flood');
  assert(floodAudit !== undefined, `${loc.name}: Flood audit item exists`);
  if (floodAudit?.floodSpecifics) {
    assert(floodAudit.floodSpecifics.rainfall_mmh > 0, `${loc.name}: Flood design rainfall > 0`);
    assert(floodAudit.floodSpecifics.soilInfiltration_mmh > 0, `${loc.name}: Flood soil infiltration > 0`);
    assert(floodAudit.floodSpecifics.terrainSlope_deg > 0, `${loc.name}: Flood terrain slope > 0`);
    assert(floodAudit.floodSpecifics.maxInundationDepth_m > 0, `${loc.name}: Flood max depth > 0`);
    assert(floodAudit.floodSpecifics.catchmentCharacteristics.length > 5, `${loc.name}: Catchment description populated`);
  }

  // Verify each item's verdict
  auditReport.items.forEach((item) => {
    assert(
      item.verdict === 'MATCH' || item.verdict === 'UNVERIFIED',
      `${loc.name} -> ${item.hazardType}: Has valid audit verdict (${item.verdict})`
    );
    assert(
      item.displayedRiskLevel === item.recalculatedRiskLevel,
      `${loc.name} -> ${item.hazardType}: Displayed risk (${item.displayedRiskLevel}) matches recalculated (${item.recalculatedRiskLevel})`
    );
    assert(
      item.displayedScore === item.recalculatedScore,
      `${loc.name} -> ${item.hazardType}: Displayed score (${item.displayedScore}) matches recalculated (${item.recalculatedScore})`
    );
  });
});

console.log('\n=============================================================');
console.log(` Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('=============================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
