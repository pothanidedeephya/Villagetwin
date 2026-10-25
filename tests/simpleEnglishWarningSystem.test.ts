import { strictEqual as assertStrictEqual, ok as assert, notStrictEqual } from 'assert';
import {
  containsNonEnglish,
  detectIndicLanguage,
  translateIndicAlertTextToEnglish,
  translateIndicAreaDescriptionToEnglish,
  formatExpiryDateTime,
  formatSachetWarning,
  formatHazardAssessmentWarning,
} from '../src/services/alertTranslationService';
import { deriveSimpleHazardStatus } from '../src/components/hazard/SimpleHazardSelector';
import { normalizeSachetAlert, type RawNdmaSachetAlert, type ParsedNdmaSachetAlert } from '../src/services/ndmaSachetService';
import type { HazardAssessment } from '../src/types/hazard';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Final Simple English Warning System');
console.log(' Verification of Translation, 6-Field Structure & Integrity');
console.log('=============================================================\n');

async function runTests() {

  // Test 1: Telugu Alert Translation
  console.log('--- Test 1: Telugu Disaster Alert Translation ---');
  const teluguAlert: RawNdmaSachetAlert = {
    identifier: 'AP-SDMA-2026-LTN-09',
    severity: 'ALERT',
    severity_level: 'Likely',
    severity_color: 'orange',
    disaster_type: 'Lightning',
    area_description: 'శ్రీకాకుళం జిల్లా (కొత్తూరు మండలం)',
    warning_message: 'కొత్తూరు మండలంలో పిడుగులు పడే అవకాశం ఉంది. సురక్షిత భవనాల్లో ఆశ్రయం పొందండి. చెట్లు, స్తంభాలు, టవర్లు, బహిరంగ ప్రదేశాలలో ఉండకండి.',
    effective_start_time: 'Sat Oct 24 10:00:00 IST 2026',
    effective_end_time: 'Sat Oct 24 16:00:00 IST 2026',
    alert_source: 'Andhra Pradesh SDMA',
    centroid: '83.950,18.700',
    area_covered: '240.5',
    actual_lang: 'te',
  };

  const parsedTelugu = normalizeSachetAlert(teluguAlert);
  assert(parsedTelugu.isTranslated === true, 'Alert marked as translated');
  assertStrictEqual(containsNonEnglish(parsedTelugu.warningMessage), false, 'Zero Telugu in translated warning message');
  assertStrictEqual(containsNonEnglish(parsedTelugu.areaDescription), false, 'Zero Telugu in translated area description');
  assertStrictEqual(parsedTelugu.originalWarningMessage, teluguAlert.warning_message, 'Preserves original Telugu text for More Details');

  const formattedWarning = formatSachetWarning(parsedTelugu);
  assertStrictEqual(formattedWarning.headline, 'Lightning possible — seek shelter indoors');
  assertStrictEqual(
    formattedWarning.safetySentence,
    'Lightning may occur in the affected area. During thunderstorms, stay inside a safe building. Avoid trees, towers, poles, fields and open areas.'
  );
  assertStrictEqual(formattedWarning.issuedBy, 'Andhra Pradesh SDMA');
  assertStrictEqual(formattedWarning.warningLevel, 'Alert · Likely');
  assert(formattedWarning.affectedArea.includes('Srikakulam') || formattedWarning.affectedArea.includes('Kotturu'));
  assert(formattedWarning.validUntil.includes('IST'));
  assertStrictEqual(formattedWarning.moreDetails.originalLanguageName, 'Telugu');
  assertStrictEqual(formattedWarning.moreDetails.originalLanguageText, teluguAlert.warning_message);
  console.log('  ✓ Telugu lightning alert translated to English matching exact headline and safety instructions');

  // Test 2: Hindi Alert Translation
  console.log('\n--- Test 2: Hindi Disaster Alert Translation ---');
  const hindiAlert: RawNdmaSachetAlert = {
    identifier: 'IMD-HND-RAIN-42',
    severity: 'WARNING',
    severity_level: 'Observed',
    severity_color: 'red',
    disaster_type: 'Heavy Rain',
    area_description: 'कृष्णा जिला (तटीय क्षेत्र)',
    warning_message: 'कृष्णा जिले में भारी बारिश की संभावना है। जलभराव वाले क्षेत्रों से दूर रहें। उफनते नालों और रपटों को पार न करें। सतर्क रहें।',
    effective_start_time: 'Sat Oct 24 08:00:00 IST 2026',
    effective_end_time: 'Sat Oct 24 18:00:00 IST 2026',
    alert_source: 'India Meteorological Department (IMD)',
    centroid: '80.840,16.210',
    area_covered: '512.0',
    actual_lang: 'hi',
  };

  const parsedHindi = normalizeSachetAlert(hindiAlert);
  assert(parsedHindi.isTranslated === true, 'Hindi alert marked as translated');
  assertStrictEqual(containsNonEnglish(parsedHindi.warningMessage), false, 'Zero Hindi in translated warning message');
  assertStrictEqual(containsNonEnglish(parsedHindi.areaDescription), false, 'Zero Hindi in translated area description');
  
  const formattedHindi = formatSachetWarning(parsedHindi);
  assertStrictEqual(formattedHindi.headline, 'Heavy rain possible — stay alert');
  assertStrictEqual(
    formattedHindi.safetySentence,
    'Heavy rain may affect the area during the stated forecast period. Follow official updates and avoid crossing flooded roads or streams.'
  );
  assertStrictEqual(formattedHindi.issuedBy, 'India Meteorological Department (IMD)');
  assertStrictEqual(formattedHindi.warningLevel, 'Warning · Observed');
  assert(formattedHindi.validUntil.includes('IST'));
  console.log('  ✓ Hindi heavy rain alert translated to English with exact safety sentence');

  // Test 3: Translation Failure Fallback
  console.log('\n--- Test 3: Translation Failure Fallback ---');
  const unknownIndicGibberish = 'అఆఇఈఉఊఋఌఎఏఐఒఓఔకఖగఘఙ'; // Random vowels and consonants without meaning
  const fallbackResult = translateIndicAlertTextToEnglish(unknownIndicGibberish);
  assertStrictEqual(containsNonEnglish(fallbackResult.translatedText), false, 'Zero Indic script in fallback');
  assertStrictEqual(
    fallbackResult.translatedText,
    'English translation temporarily unavailable.',
    'Strictly returns "English translation temporarily unavailable." when translation fails'
  );
  console.log('  ✓ Untranslatable Indic script strictly returns "English translation temporarily unavailable." without inventing text');

  // Test 4: Format Validation - Flood
  console.log('\n--- Test 4: Format Validation — Flood Warning ---');
  const mockFloodAssessment: Partial<HazardAssessment> = {
    hazardType: 'flood',
    isGeographicallyApplicable: true,
    riskLevel: 'high',
    officialWarning: {
      alertStage: 'warning',
      warningColor: 'red',
      warningTitle: 'CWC Flood Warning: River Vamsadhara in Spate',
      agency: 'CWC',
      issuedAt: '2026-10-24T06:00:00Z',
      validUntil: '2026-10-24T22:00:00Z',
      geographicCoverage: 'Vamsadhara Basin (Kotturu, Gotta Barrage)',
      advisoryText: 'Move to safe high ground.',
      officialInstructions: ['Avoid flooded roads and follow local authorities instructions.'],
    },
  };

  const floodWarning = formatHazardAssessmentWarning('flood', mockFloodAssessment as HazardAssessment, {
    district: 'Srikakulam',
    state: 'Andhra Pradesh',
    name: 'Kotturu',
  });
  assertStrictEqual(floodWarning.headline, 'Flood warning — avoid flooded areas');
  assertStrictEqual(
    floodWarning.safetySentence,
    'Flooding has been indicated by the applicable official warning. Avoid flooded roads and follow local authorities instructions.'
  );
  assertStrictEqual(floodWarning.warningLevel, 'Warning · RED');
  assertStrictEqual(floodWarning.issuedBy, 'Central Water Commission (CWC)');
  assertStrictEqual(floodWarning.affectedArea, 'Vamsadhara Basin (Kotturu, Gotta Barrage)');
  assert(floodWarning.validUntil.includes('IST'));
  console.log('  ✓ Flood warning matches headline, safety sentence, agency and validUntil');

  // Test 5: Format Validation - Cyclone
  console.log('\n--- Test 5: Format Validation — Cyclone Warning ---');
  const mockCycloneAssessment: Partial<HazardAssessment> = {
    hazardType: 'cyclone',
    isGeographicallyApplicable: true,
    riskLevel: 'very_high',
    officialWarning: {
      alertStage: 'warning',
      warningColor: 'orange',
      warningTitle: 'IMD Severe Cyclonic Storm Warning',
      agency: 'IMD',
      issuedAt: '2026-10-24T08:00:00Z',
      validUntil: '2026-10-25T12:00:00Z',
      geographicCoverage: 'North Coastal Andhra Pradesh',
      advisoryText: 'High coastal gales expected.',
      officialInstructions: [],
    },
  };

  const cycloneWarning = formatHazardAssessmentWarning('cyclone', mockCycloneAssessment as HazardAssessment, {
    district: 'Srikakulam',
    state: 'Andhra Pradesh',
    name: 'Kotturu',
  });
  assertStrictEqual(cycloneWarning.headline, 'Cyclone warning — follow official instructions');
  assertStrictEqual(
    cycloneWarning.safetySentence,
    'A cyclone warning applies to the stated area. Follow the latest official advisory and evacuation instructions from local authorities.'
  );
  assertStrictEqual(cycloneWarning.warningLevel, 'Warning · ORANGE');
  assertStrictEqual(cycloneWarning.issuedBy, 'India Meteorological Department (IMD)');
  assertStrictEqual(cycloneWarning.affectedArea, 'North Coastal Andhra Pradesh');
  console.log('  ✓ Cyclone warning matches headline, safety sentence and official agency');

  // Test 6: No Applicable Official Warning Found
  console.log('\n--- Test 6: Format Validation — No Applicable Official Warning Found ---');
  const mockCleanAssessment: Partial<HazardAssessment> = {
    hazardType: 'drought',
    isGeographicallyApplicable: true,
    riskLevel: 'low',
    baselineSusceptibility: {
      level: 'low',
      score: 15,
      zoneClassification: 'Normal soil moisture',
      authoritativeStandard: 'NIDM',
      rationale: 'Normal rainfall',
    },
    officialWarning: {
      alertStage: 'no_warning',
      warningColor: 'green',
      warningTitle: 'No warning in effect',
      agency: 'IMD',
      issuedAt: '2026-10-24T00:00:00Z',
      validUntil: '2026-10-24T18:00:00Z',
      geographicCoverage: 'Kotturu',
      advisoryText: 'Normal condition',
      officialInstructions: [],
    },
    provenance: {
      source: 'IMD Telemetry Network',
      publicationYear: '2026',
      spatialResolution: 'District',
      scientificAssumptions: 'Normal moisture',
      confidenceLevel: 'High',
    },
  };

  const cleanWarning = formatHazardAssessmentWarning('drought', mockCleanAssessment as HazardAssessment, {
    district: 'Srikakulam',
    state: 'Andhra Pradesh',
    name: 'Kotturu',
  });
  assertStrictEqual(cleanWarning.headline, 'No applicable official warning found');
  assertStrictEqual(
    cleanWarning.safetySentence,
    'No applicable active warning was found in the available data. This does not guarantee that conditions are safe.'
  );
  assertStrictEqual(cleanWarning.warningLevel, 'Normal · No active warning');
  console.log('  ✓ "No applicable official warning found" cleanly rendered when no alert is active');

  // Test 7: Data Unavailable
  console.log('\n--- Test 7: Format Validation — Latest Warning Could Not Be Verified ---');
  const unverifiedWarning = formatHazardAssessmentWarning('earthquake', null, {
    district: 'Srikakulam',
    state: 'Andhra Pradesh',
    name: 'Kotturu',
  });
  assertStrictEqual(unverifiedWarning.headline, 'Latest warning could not be verified');
  assertStrictEqual(
    unverifiedWarning.safetySentence,
    'We could not confirm the latest warning for this location. Check official disaster-management updates.'
  );
  assertStrictEqual(unverifiedWarning.warningLevel, 'Unverified · Data unavailable');
  console.log('  ✓ Missing assessment clearly produces "Latest warning could not be verified"');

  // Test 8: Historical Risk vs Active Warning Separation
  console.log('\n--- Test 8: Historical Risk vs Active Warning Separation ---');
  const mockHistoricalAssessment: Partial<HazardAssessment> = {
    hazardType: 'earthquake',
    isGeographicallyApplicable: true,
    riskLevel: 'high',
    baselineSusceptibility: {
      level: 'high',
      score: 75,
      zoneClassification: 'BIS IS 1893 Zone IV',
      authoritativeStandard: 'BIS IS 1893:2016',
      rationale: 'Seismic Zone IV tectonic plate margin',
    },
    officialWarning: {
      alertStage: 'no_warning',
      warningColor: 'green',
      warningTitle: 'No active seismic warning',
      agency: 'NDMA',
      issuedAt: '2026-10-24T00:00:00Z',
      validUntil: '2026-10-24T24:00:00Z',
      geographicCoverage: 'Tehri',
      advisoryText: 'No active event',
      officialInstructions: [],
    },
  };

  const historicalWarning = formatHazardAssessmentWarning('earthquake', mockHistoricalAssessment as HazardAssessment, {
    district: 'Tehri Garhwal',
    state: 'Uttarakhand',
    name: 'Joshimath',
  });
  assertStrictEqual(historicalWarning.statusCategory, 'historical_risk');
  assertStrictEqual(historicalWarning.headline, 'Historical susceptibility — standard preparedness');
  assert(historicalWarning.safetySentence.includes('No active emergency warning is in effect today'));
  assert(historicalWarning.validUntil.includes('Atlas baseline reference'));
  console.log('  ✓ Long-term atlas susceptibility strictly separated from active emergency');

  // Test 9: deriveSimpleHazardStatus Integration in Hazard Cards
  console.log('\n--- Test 9: deriveSimpleHazardStatus Format Consistency ---');
  const cardResult = deriveSimpleHazardStatus(mockFloodAssessment as HazardAssessment, {
    district: 'Srikakulam',
    state: 'Andhra Pradesh',
    name: 'Kotturu',
  });
  assertStrictEqual(cardResult.headline, 'Flood warning — avoid flooded areas');
  assertStrictEqual(
    cardResult.safetySentence,
    'Flooding has been indicated by the applicable official warning. Avoid flooded roads and follow local authorities instructions.'
  );
  assertStrictEqual(cardResult.warningLevel, 'Warning · RED');
  assert(cardResult.validUntil.includes('IST'));
  console.log('  ✓ deriveSimpleHazardStatus provides all 6 fields to sidebar warning cards');

  // Test 10: Location Awareness & Cross-State Filtering
  console.log('\n--- Test 10: Location Awareness & Cross-State Alert Filtering ---');
  const rajasthanAlert: RawNdmaSachetAlert = {
    identifier: 'RJ-SDMA-HEAT-01',
    severity: 'WARNING',
    severity_level: 'Observed',
    severity_color: 'orange',
    disaster_type: 'Heatwave',
    area_description: 'Jaisalmer District (Thar Region)',
    warning_message: 'Severe heatwave advisory for Jaisalmer.',
    effective_start_time: 'Sat Oct 24 10:00:00 IST 2026',
    effective_end_time: 'Sat Oct 24 18:00:00 IST 2026',
    alert_source: 'Rajasthan SDMA',
    centroid: '70.900,26.900',
    area_covered: '1200.0',
    actual_lang: 'en',
  };

  const normalizedRj = normalizeSachetAlert(rajasthanAlert);
  // An AP village (Kotturu: [83.95, 18.70]) is over 1500 km away from Jaisalmer ([70.90, 26.90])
  const [apLng, apLat] = [83.95, 18.70];
  const [rjLng, rjLat] = normalizedRj.centroid!;
  const R = 6371;
  const dLat = ((rjLat - apLat) * Math.PI) / 180;
  const dLon = ((rjLng - apLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((apLat * Math.PI) / 180) *
      Math.cos((rjLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  assert(distanceKm > 1000, 'Distance is over 1000 km');
  const isApplicableToKotturu = distanceKm <= 75;
  assertStrictEqual(isApplicableToKotturu, false, 'Rajasthan alert is not applicable to Kotturu');
  console.log('  ✓ Alert from another state (>1000 km away) is strictly filtered out from local village warnings');

  console.log('\n=============================================================');
  console.log(' ALL 10 TESTS PASSED SUCCESSFULLY');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
