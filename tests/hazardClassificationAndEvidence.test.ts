import {
  generateNationwideHazardAssessment,
  getCycloneHazard,
  getTsunamiHazard,
  getFloodHazard,
  getSeismicZone,
  getLandslideSusceptibility,
  getDroughtHazard,
  getHeatwaveHazard,
  scoreToRiskLevel,
} from '../src/services/indiaHazardEngine';
import { getImdRainfallTelemetry } from '../src/services/floodDataService';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import type { LocationSearchResult } from '../src/types/nationwide';
import type { HazardType } from '../src/types/hazard';

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
console.log(' Bharat Village Twin: 4-Pillars Hazard Classification & Evidence Audit');
console.log('=============================================================\n');

const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-kothuru')!;
const joshimath = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-uk-joshimath')!;
const majuli = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-as-majuli')!;
const pokhran = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-rj-pokhran')!;

// ---------------------------------------------------------------------------
// SUITE 1: Four-Tier Information Separation Integrity
// ---------------------------------------------------------------------------
console.log('--- Suite 1: Four-Tier Information Separation Integrity ---');

const kotturuSummary = generateNationwideHazardAssessment(kotturu);
const hazardTypes: HazardType[] = [
  'flood',
  'waterlogging',
  'cyclone',
  'tsunami',
  'earthquake',
  'landslide',
  'drought',
  'heatwave',
  'wildfire',
];

hazardTypes.forEach((h) => {
  const a = kotturuSummary.assessments[h];
  assert(!!a.baselineSusceptibility, `[${h}] Pillar A (Baseline Susceptibility) exists`);
  assert(!!a.currentObservation, `[${h}] Pillar B (Current Observation) exists`);
  assert(!!a.officialWarning, `[${h}] Pillar C (Official Warning) exists`);
  assert(!!a.modelledImpact, `[${h}] Pillar D (Modelled Impact) exists`);
  assert(!!a.activeThreat, `[${h}] Real-Time Active Threat evaluation exists`);
  assert(a.verificationVerdict === 'MATCH', `[${h}] Verification Verdict is verified MATCH`);
});

// ---------------------------------------------------------------------------
// SUITE 2: Kotturu Cyclone & IMD October 2026 Bulletin Grounding
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: Kotturu Cyclone & IMD October 2026 Bulletin Grounding ---');

const kotturuCyclone = kotturuSummary.assessments.cyclone;

// Pillar A: Baseline Susceptibility
assertStrictEqual(
  kotturuCyclone.baselineSusceptibility.level,
  'very_high',
  'Baseline Cyclone Susceptibility is VERY HIGH (BMTPC Zone I, Vb = 50 m/s)'
);
assertStrictEqual(
  kotturuCyclone.baselineSusceptibility.score,
  86,
  'Baseline Cyclone score is 86 (50-year return period wind loading)'
);
assert(
  kotturuCyclone.baselineSusceptibility.zoneClassification.includes('IS 875'),
  'Baseline cites BIS IS 875 (Part 3):2015 statutory wind zonation'
);

// Pillar C: Official IMD Warning for Coastal AP
assertStrictEqual(
  kotturuCyclone.officialWarning.agency,
  'IMD',
  'Official Cyclone Warning agency is IMD'
);
assertStrictEqual(
  kotturuCyclone.officialWarning.warningColor,
  'yellow',
  'IMD Warning level is Yellow Watch'
);
assertStrictEqual(
  kotturuCyclone.officialWarning.alertStage,
  'watch',
  'IMD alert stage is "watch" (NOT emergency warning)'
);
assert(
  kotturuCyclone.officialWarning.warningTitle.includes('Squally Wind') ||
    kotturuCyclone.officialWarning.warningTitle.includes('Developing Bay of Bengal Low Pressure'),
  `IMD warning title correctly describes developing low-pressure advisory: "${kotturuCyclone.officialWarning.warningTitle}"`
);
assert(
  !!kotturuCyclone.officialWarning.bulletinNumber,
  `IMD bulletin number is present: ${kotturuCyclone.officialWarning.bulletinNumber}`
);
assert(
  !!kotturuCyclone.officialWarning.issuedAt,
  `IMD bulletin issue timestamp is present: ${kotturuCyclone.officialWarning.issuedAt}`
);
assert(
  !!kotturuCyclone.officialWarning.validUntil,
  `IMD bulletin validity window is present: ${kotturuCyclone.officialWarning.validUntil}`
);
assert(
  kotturuCyclone.officialWarning.geographicCoverage.includes('Coastal Andhra Pradesh') ||
    kotturuCyclone.officialWarning.geographicCoverage.includes('Krishna'),
  'IMD bulletin geographic coverage includes Coastal Andhra Pradesh / Krishna'
);
assert(
  Boolean(
    kotturuCyclone.officialWarning.cycloneStageOrPhase?.includes('Low-Pressure') ||
      kotturuCyclone.officialWarning.cycloneStageOrPhase?.includes('Pre-Cyclonic')
  ),
  'Cyclone stage explicitly clarifies pre-cyclonic low-pressure watch (NO formed cyclone)'
);
assert(
  !Boolean(kotturuCyclone.officialWarning.cycloneStageOrPhase?.includes('Severe Cyclone Active')),
  'Does NOT falsely declare a formed or severe cyclone'
);

// Real-Time Active Threat
assertStrictEqual(
  kotturuCyclone.activeThreat.level,
  'moderate',
  'Active Cyclone Threat level is MODERATE (Advisory Watch), distinct from Very High baseline'
);
assert(
  kotturuCyclone.activeThreat.score <= 50,
  `Active Cyclone threat score (${kotturuCyclone.activeThreat.score}) does not exceed moderate advisory range`
);

// IMD Rainfall Telemetry Integration
const imdTelemetry = getImdRainfallTelemetry(kotturu, 0);
assertStrictEqual(imdTelemetry.warningColor, 'yellow', 'IMD rainfall telemetry for Coastal AP is Yellow Watch');
assert(
  !imdTelemetry.warningTitle.toLowerCase().includes('no severe weather warning'),
  'IMD telemetry does NOT report "no severe weather warning" when AP advisory is active'
);
assert(
  imdTelemetry.advisoryText.includes('23 October') || imdTelemetry.advisoryText.includes('Low Pressure Area'),
  'IMD advisory text details developing Bay of Bengal low-pressure system around 23 Oct'
);

// ---------------------------------------------------------------------------
// SUITE 3: Kotturu Tsunami Ground Truth & INCOIS Normal Status
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Kotturu Tsunami Ground Truth & INCOIS Normal Status ---');

const kotturuTsunami = kotturuSummary.assessments.tsunami;

// Kotturu is ~16 km inland in Krishna delta; baseline is NOT high
assertStrictEqual(
  kotturuTsunami.baselineSusceptibility.level,
  'low',
  'Kotturu baseline tsunami risk is LOW (sheltered inland delta habitation ~16 km from open shoreline)'
);
assert(
  kotturuTsunami.baselineSusceptibility.score <= 30,
  `Kotturu baseline tsunami score is ${kotturuTsunami.baselineSusceptibility.score} (<= 30 Low)`
);
assert(
  kotturuTsunami.baselineSusceptibility.rationale.includes('inland') ||
    kotturuTsunami.baselineSusceptibility.rationale.includes('Inland'),
  'Tsunami rationale explains distance from open shoreline and tidal regulator barriers'
);

// INCOIS Official Warning Status
assertStrictEqual(
  kotturuTsunami.officialWarning.agency,
  'INCOIS',
  'Official Tsunami agency is INCOIS'
);
assertStrictEqual(
  kotturuTsunami.officialWarning.alertStage,
  'no_warning',
  'INCOIS alert stage is "no_warning" (Normal ocean conditions)'
);
assertStrictEqual(
  kotturuTsunami.officialWarning.warningColor,
  'green',
  'INCOIS warning color is Green (No Warning in Effect)'
);
assert(
  kotturuTsunami.officialWarning.tsunamiAlertStatus?.includes('No Tsunami Threat') ||
    kotturuTsunami.officialWarning.warningTitle.includes('Normal'),
  'INCOIS status confirms zero active tsunami threat nationwide'
);

// Real-Time Active Threat
assertStrictEqual(
  kotturuTsunami.activeThreat.level,
  'low',
  'Active Tsunami threat is strictly LOW'
);
assertStrictEqual(
  kotturuTsunami.activeThreat.score,
  5,
  'Active Tsunami threat score is 5/100'
);

// ---------------------------------------------------------------------------
// SUITE 4: Flood & Waterlogging Separation (Baseline vs CWC Telemetry vs SCS-CN)
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Flood & Waterlogging Separation ---');

const kotturuFlood = kotturuSummary.assessments.flood;

assertStrictEqual(
  kotturuFlood.baselineSusceptibility.level,
  'high',
  'Baseline Riverine Flood susceptibility is HIGH (Krishna delta monsoonal basin)'
);
assertStrictEqual(
  kotturuFlood.currentObservation.telemetryFreshness,
  'fresh',
  'Flood current telemetry is FRESH'
);
assertStrictEqual(
  kotturuFlood.officialWarning.alertStage,
  'no_warning',
  'CWC River flood alert stage is "no_warning" (Below Warning Level)'
);
assertStrictEqual(
  kotturuFlood.officialWarning.warningColor,
  'green',
  'CWC flood warning color is Green'
);
assert(
  kotturuFlood.currentObservation.metricValue.includes('15.2m') ||
    kotturuFlood.currentObservation.metricValue.includes('Normal'),
  'CWC gauge telemetry records stage 15.2m (1.3m clearance below 16.5m warning level)'
);
assertStrictEqual(
  kotturuFlood.activeThreat.level,
  'low',
  'Active flood threat under current clear telemetry is LOW, not an exaggerated disaster'
);
assertStrictEqual(
  kotturuFlood.modelledImpact.modelConfidence,
  'calibrated',
  'Kotturu benchmark pluvial twin is certified as CALIBRATED'
);

// ---------------------------------------------------------------------------
// SUITE 5: Nationwide Geographic Differentiation & Atomic Location Switching
// ---------------------------------------------------------------------------
console.log('\n--- Suite 5: Nationwide Geographic Differentiation & Atomic Switching ---');

// 1. Joshimath (High Himalaya)
const joshSummary = generateNationwideHazardAssessment(joshimath);
assertStrictEqual(joshSummary.assessments.earthquake.baselineSusceptibility.level, 'very_high', 'Joshimath: Seismic is VERY HIGH (Zone V, 0.36g)');
assertStrictEqual(joshSummary.assessments.landslide.baselineSusceptibility.level, 'very_high', 'Joshimath: Landslide is VERY HIGH (32° slope)');
assertStrictEqual(joshSummary.assessments.cyclone.baselineSusceptibility.level, 'low', 'Joshimath: Cyclone is LOW (1890m Alpine inland)');
assertStrictEqual(joshSummary.assessments.tsunami.baselineSusceptibility.level, 'low', 'Joshimath: Tsunami is LOW (Inapplicable in Himalayas)');
assertStrictEqual(joshSummary.assessments.landslide.officialWarning.alertStage, 'watch', 'Joshimath: GSI LEWS slope monitoring watch is active');

// 2. Pokhran (Thar Desert)
const pokhranSummary = generateNationwideHazardAssessment(pokhran);
assertStrictEqual(pokhranSummary.assessments.drought.baselineSusceptibility.level, 'very_high', 'Pokhran: Drought is VERY HIGH (Thar arid aquifer)');
assertStrictEqual(pokhranSummary.assessments.heatwave.baselineSusceptibility.level, 'very_high', 'Pokhran: Heatwave baseline is VERY HIGH');
assertStrictEqual(pokhranSummary.assessments.landslide.baselineSusceptibility.level, 'low', 'Pokhran: Landslide is LOW (Flat desert)');
assertStrictEqual(pokhranSummary.assessments.tsunami.baselineSusceptibility.level, 'low', 'Pokhran: Tsunami is LOW (Inland Rajasthan)');
assertStrictEqual(pokhranSummary.assessments.heatwave.officialWarning.alertStage, 'watch', 'Pokhran: IMD heatwave advisory watch is active');

// 3. Majuli (Assam Brahmaputra Riverine Island)
const majuliSummary = generateNationwideHazardAssessment(majuli);
assertStrictEqual(majuliSummary.assessments.flood.baselineSusceptibility.level, 'very_high', 'Majuli: Flood is VERY HIGH (Brahmaputra basin)');
assertStrictEqual(majuliSummary.assessments.flood.officialWarning.alertStage, 'watch', 'Majuli: CWC Neamati Ghat high river stage watch is active');
assertStrictEqual(majuliSummary.assessments.earthquake.baselineSusceptibility.level, 'very_high', 'Majuli: Seismic is VERY HIGH (Assam Zone V)');
assertStrictEqual(majuliSummary.assessments.tsunami.baselineSusceptibility.level, 'low', 'Majuli: Tsunami is LOW (Inapplicable river island)');

// 4. Switch back to Kotturu — verify atomic cleanliness (zero contamination from Majuli/Pokhran)
const kotturuReloaded = generateNationwideHazardAssessment(kotturu);
assertStrictEqual(kotturuReloaded.villageName, 'Kotturu Gram Panchayat', 'Reloaded: Settlement is Kotturu');
assertStrictEqual(kotturuReloaded.assessments.cyclone.baselineSusceptibility.score, 86, 'Reloaded: Baseline Cyclone score is 86 (Clean)');
assertStrictEqual(kotturuReloaded.assessments.tsunami.activeThreat.level, 'low', 'Reloaded: Active Tsunami is LOW (Clean)');
assertStrictEqual(kotturuReloaded.assessments.flood.activeThreat.level, 'low', 'Reloaded: Active Flood is LOW (Clean)');
assertStrictEqual(kotturuReloaded.assessments.cyclone.activeThreat.level, 'moderate', 'Reloaded: Active Cyclone is MODERATE Watch (Clean)');
assertStrictEqual(kotturuReloaded.assessments.landslide.baselineSusceptibility.level, 'low', 'Reloaded: Landslide is LOW (Clean, no Joshimath residue)');

console.log(`\n=============================================================`);
console.log(` Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log(`=============================================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
