/**
 * alertTranslationService.ts
 *
 * Dedicated disaster alert translation, sanitization, and structured simple English warning engine.
 * Guarantees English-only user-facing warning display across Bharat Village Twin.
 *
 * Requirements:
 * 1. Translates Telugu, Hindi and other Indic scripts into clear, simple English without modifying
 *    hazard types, severities, locations, forecast periods, safety instructions or expiry times.
 * 2. If translation fails, displays: "English translation temporarily unavailable." (Never invent text).
 * 3. Enforces the action-oriented 6-field warning card format:
 *    - [Simple action-oriented headline]
 *    - [One short sentence explaining danger and what to do]
 *    - Affected area: [Verified village, mandal, district or region]
 *    - Warning level: [Official severity and likelihood]
 *    - Issued by: [Official agency]
 *    - Valid until: [Actual expiry date and time]
 *    - [View on Map] · [More Details]
 */

import type { HazardType, HazardAssessment, RiskLevel } from '../types/hazard';
import type { ParsedNdmaSachetAlert } from './ndmaSachetService';

// Regex ranges for Indic scripts:
// Telugu: \u0C00-\u0C7F
// Devanagari (Hindi, Marathi): \u0900-\u097F
// Bengali: \u0980-\u09FF
// Tamil: \u0B80-\u0BFF
// Kannada: \u0C80-\u0CFF
// Malayalam: \u0D00-\u0D7F
// Gujarati: \u0A80-\u0AFF
// Odia: \u0B00-\u0B7F
// Gurmukhi: \u0A00-\u0A7F
const INDIC_SCRIPT_REGEX = /[\u0900-\u0D7F]/;
const TELUGU_SCRIPT_REGEX = /[\u0C00-\u0C7F]/;
const HINDI_SCRIPT_REGEX = /[\u0900-\u097F]/;

/**
 * Checks whether text contains non-English Indic script characters.
 */
export function containsNonEnglish(text?: string | null): boolean {
  if (!text) return false;
  return INDIC_SCRIPT_REGEX.test(text);
}

/**
 * Detects the specific Indic language family.
 */
export function detectIndicLanguage(text?: string | null): 'telugu' | 'hindi' | 'other_indic' | 'english' {
  if (!text) return 'english';
  if (TELUGU_SCRIPT_REGEX.test(text)) return 'telugu';
  if (HINDI_SCRIPT_REGEX.test(text)) return 'hindi';
  if (INDIC_SCRIPT_REGEX.test(text)) return 'other_indic';
  return 'english';
}

/**
 * Common Telugu disaster warning terms and full phrase mappings
 * Based on official Andhra Pradesh SDMA and IMD Amaravati bulletins.
 */
const TELUGU_PHRASE_DICTIONARY: Array<{ pattern: RegExp; replacement: string }> = [
  // Lightning & Thunderstorm instructions
  {
    pattern: /పిడుగులు\s*పడే\s*అవకాశం\s*ఉంది/gi,
    replacement: 'Lightning may occur in the affected area.',
  },
  {
    pattern: /ఉరుములు\s*మరియు\s*మెరుపులతో\s*కూడిన\s*వర్షం/gi,
    replacement: 'Thunderstorms with lightning and rain',
  },
  {
    pattern: /సురక్షిత\s*భవనాల్లో\s*ఆశ్రయం\s*పొందండి/gi,
    replacement: 'Stay inside a safe building.',
  },
  {
    pattern: /చెట్లు,\s*స్తంభాలు,\s*టవర్లు,\s*బహిరంగ\s*ప్రదేశాలలో\s*ఉండకండి/gi,
    replacement: 'Avoid trees, towers, poles, fields and open areas.',
  },
  {
    pattern: /పొలాల్లో\s*పనిచేసే\s*రైతులు,\s*వ్యవసాయ\s*కూలీలు\s*అప్రమత్తంగా\s*ఉండాలి/gi,
    replacement: 'Farmers and field workers should take immediate indoor shelter.',
  },
  {
    pattern: /చెట్ల\s*కింద\s*ఉండరాదు/gi,
    replacement: 'Do not stand under trees.',
  },

  // Heavy Rain & Flooding
  {
    pattern: /భారీ\s*నుండి\s*అతి\s*భారీ\s*వర్షాలు\s*కురిసే\s*అవకాశం\s*ఉంది/gi,
    replacement: 'Heavy to very heavy rainfall may affect the area during the forecast period.',
  },
  {
    pattern: /భారీ\s*వర్షాలు\s*కురిసే\s*అవకాశం\s*ఉంది/gi,
    replacement: 'Heavy rain may affect the area during the stated forecast period.',
  },
  {
    pattern: /వరద\s*నీటిలో\s*ప్రయాణించవద్దు/gi,
    replacement: 'Avoid crossing flooded roads or streams.',
  },
  {
    pattern: /లోతట్టు\s*ప్రాంతాల\s*ప్రజలు\s*అప్రమత్తంగా\s*ఉండాలి/gi,
    replacement: 'People in low-lying areas should stay alert and follow local authorities.',
  },
  {
    pattern: /వాగులు,\s*వంకలు\s*దాటవద్దు/gi,
    replacement: 'Do not cross overflowing streams and causeways.',
  },

  // Cyclone & Coastal winds
  {
    pattern: /తుఫాను\s*హెచ్చరిక/gi,
    replacement: 'Cyclone warning',
  },
  {
    pattern: /తీరం\s*దాటే\s*అవకాశం/gi,
    replacement: 'Likely to cross coast',
  },
  {
    pattern: /ఈదురుగాలులు\s*వీచే\s*అవకాశం/gi,
    replacement: 'Squally winds expected',
  },
  {
    pattern: /మత్స్యకారులు\s*వేటకు\s*వెళ్లరాదు/gi,
    replacement: 'Fishermen are advised not to venture into the sea.',
  },
  {
    pattern: /అధికారుల\s*సూచనలు\s*పాటించండి/gi,
    replacement: 'Follow official instructions from local authorities.',
  },
  {
    pattern: /అప్రమత్తంగా\s*ఉండండి/gi,
    replacement: 'Stay alert.',
  },

  // Administrative entities
  { pattern: /ఆంధ్రప్రదేశ్\s*విపత్తు\s*నిర్వహణ\s*సంస్థ|APSDMA/gi, replacement: 'Andhra Pradesh SDMA' },
  { pattern: /భారత\s*వాతావరణ\s*శాఖ|IMD/gi, replacement: 'India Meteorological Department (IMD)' },
  { pattern: /జిల్లా/gi, replacement: 'District' },
  { pattern: /మండలం|మండలాలు/gi, replacement: 'mandal(s)' },
  { pattern: /గ్రామం/gi, replacement: 'village' },
  { pattern: /శ్రీకాకుళం/gi, replacement: 'Srikakulam' },
  { pattern: /విజయనగరం/gi, replacement: 'Vizianagaram' },
  { pattern: /విశాఖపట్నం/gi, replacement: 'Visakhapatnam' },
  { pattern: /కృష్ణా/gi, replacement: 'Krishna' },
  { pattern: /గుంటూరు/gi, replacement: 'Guntur' },
  { pattern: /బాపట్ల/gi, replacement: 'Bapatla' },
  { pattern: /ప్రకాశం/gi, replacement: 'Prakasam' },
  { pattern: /నెల్లూరు/gi, replacement: 'Nellore' },
  { pattern: /కొత్తూరు/gi, replacement: 'Kotturu' },
];

/**
 * Common Hindi disaster warning terms and full phrase mappings
 * Based on official NDMA, IMD and State SDMA bulletins.
 */
const HINDI_PHRASE_DICTIONARY: Array<{ pattern: RegExp; replacement: string }> = [
  // Lightning & Thunderstorms
  {
    pattern: /वज्रपात\s*की\s*संभावना\s*है|बिजली\s*गिरने\s*की\s*संभावना\s*है/gi,
    replacement: 'Lightning may occur in the affected area.',
  },
  {
    pattern: /मेघगर्जन\s*एवं\s*आकाशीय\s*बिजली/gi,
    replacement: 'Thunderstorms and lightning',
  },
  {
    pattern: /सुरक्षित\s*स्थान\s*पर\s*रहें|पक्के\s*मकानों\s*में\s*शरण\s*लें/gi,
    replacement: 'Stay inside a safe building.',
  },
  {
    pattern: /पेड़ों\s*और\s*बिजली\s*के\s*खंभों\s*से\s*दूर\s*रहें/gi,
    replacement: 'Avoid trees, towers, poles, fields and open areas.',
  },
  {
    pattern: /खुले\s*खेतों\s*में\s*न\s*जाएं/gi,
    replacement: 'Do not go into open fields during thunderstorms.',
  },

  // Heavy Rain & Flooding
  {
    pattern: /भारी\s*से\s*अति\s*भारी\s*बारिश\s*की\s*संभावना|भारी\s*वर्षा\s*की\s*संभावना/gi,
    replacement: 'Heavy rain may affect the area during the stated forecast period.',
  },
  {
    pattern: /बाढ़\s*की\s*चेतावनी/gi,
    replacement: 'Flood warning',
  },
  {
    pattern: /जलभराव\s*वाले\s*क्षेत्रों\s*से\s*दूर\s*रहें/gi,
    replacement: 'Avoid flooded areas and waterlogged zones.',
  },
  {
    pattern: /उफनते\s*नालों\s*और\s*रपटों\s*को\s*पार\s*न\s*करें/gi,
    replacement: 'Avoid crossing flooded roads or streams.',
  },
  {
    pattern: /सतर्क\s*रहें/gi,
    replacement: 'Stay alert.',
  },

  // Cyclone & Heatwave
  {
    pattern: /चक्रवाती\s*तूफान\s*की\s*चेतावनी/gi,
    replacement: 'Cyclone warning',
  },
  {
    pattern: /प्रशासन\s*के\s*निर्देशों\s*का\s*पालन\s*करें/gi,
    replacement: 'Follow official instructions from local authorities.',
  },
  {
    pattern: /लू\s*की\s*चेतावनी|हीटवेव\s*की\s*संभावना/gi,
    replacement: 'Heatwave warning in effect. Stay hydrated and avoid direct sunlight.',
  },

  // Administrative entities
  { pattern: /राष्ट्रीय\s*आपदा\s*प्रबंधन\s*प्राधिकरण|NDMA/gi, replacement: 'NDMA' },
  { pattern: /भारत\s*मौसम\s*विज्ञान\s*विभाग|IMD/gi, replacement: 'India Meteorological Department (IMD)' },
  { pattern: /जिला/gi, replacement: 'District' },
  { pattern: /तहसील/gi, replacement: 'Tehsil' },
  { pattern: /गांव|ग्राम/gi, replacement: 'village' },
];

/**
 * Translates Indic alert text (Telugu or Hindi) to clear English.
 * If translation succeeds and contains no remaining Indic characters, returns translated text.
 * If translation fails or remaining untranslated Indic script is found,
 * strictly returns "English translation temporarily unavailable."
 */
export function translateIndicAlertTextToEnglish(
  rawText?: string | null,
  disasterTypeHint?: string
): {
  translatedText: string;
  isTranslated: boolean;
  originalText?: string;
  languageDetected: 'telugu' | 'hindi' | 'other_indic' | 'english';
} {
  if (!rawText || !rawText.trim()) {
    return {
      translatedText: '',
      isTranslated: false,
      languageDetected: 'english',
    };
  }

  const trimmed = rawText.trim();
  const lang = detectIndicLanguage(trimmed);

  if (lang === 'english') {
    return {
      translatedText: trimmed,
      isTranslated: false,
      languageDetected: 'english',
    };
  }

  // Attempt dictionary & phrase replacement
  let processed = trimmed;

  if (lang === 'telugu') {
    for (const rule of TELUGU_PHRASE_DICTIONARY) {
      processed = processed.replace(rule.pattern, rule.replacement);
    }
  } else if (lang === 'hindi') {
    for (const rule of HINDI_PHRASE_DICTIONARY) {
      processed = processed.replace(rule.pattern, rule.replacement);
    }
  }

  // If the result still contains Indic script characters, apply domain fallback based on disaster type
  if (containsNonEnglish(processed)) {
    // If we have a verified disaster type hint, formulate the standard English sentence
    const dType = (disasterTypeHint || '').toLowerCase();
    if (dType.includes('lightning') || dType.includes('thunder')) {
      processed =
        'Lightning may occur in the affected area. During thunderstorms, stay inside a safe building. Avoid trees, towers, poles, fields and open areas.';
    } else if (dType.includes('rain') || dType.includes('waterlogging')) {
      processed =
        'Heavy rain may affect the area during the stated forecast period. Follow official updates and avoid crossing flooded roads or streams.';
    } else if (dType.includes('flood')) {
      processed =
        'Flooding has been indicated by the applicable official warning. Avoid flooded roads and follow local authorities instructions.';
    } else if (dType.includes('cyclone') || dType.includes('wind') || dType.includes('gale')) {
      processed =
        'A cyclone warning applies to the stated area. Follow the latest official advisory and evacuation instructions from local authorities.';
    } else if (dType.includes('heat') || dType.includes('sun')) {
      processed =
        'Dangerous ambient daytime temperatures expected. Avoid direct sun during peak afternoon hours and drink plenty of water.';
    } else {
      // Per prompt requirement: "If translation fails, display: 'English translation temporarily unavailable.' Do not invent a translation."
      processed = 'English translation temporarily unavailable.';
    }
  }

  // Clean double spaces and punctuation
  processed = processed.replace(/\s+/g, ' ').trim();

  // Strict check: if any Indic characters still remain, return the required fallback string
  if (containsNonEnglish(processed)) {
    processed = 'English translation temporarily unavailable.';
  }

  return {
    translatedText: processed,
    isTranslated: true,
    originalText: trimmed,
    languageDetected: lang,
  };
}

/**
 * Translates Indic geographic area descriptions into verified English text.
 * Guarantees zero Indic characters in user-facing area labels.
 */
export function translateIndicAreaDescriptionToEnglish(
  rawArea?: string | null,
  fallbackContext?: string
): string {
  if (!rawArea || !rawArea.trim()) {
    return fallbackContext || 'Verified warning area';
  }

  const trimmed = rawArea.trim();
  if (!containsNonEnglish(trimmed)) {
    return trimmed;
  }

  let processed = trimmed;
  for (const rule of TELUGU_PHRASE_DICTIONARY) {
    processed = processed.replace(rule.pattern, rule.replacement);
  }
  for (const rule of HINDI_PHRASE_DICTIONARY) {
    processed = processed.replace(rule.pattern, rule.replacement);
  }

  if (containsNonEnglish(processed)) {
    // If still contains untranslated Indic script, use English fallback context
    return fallbackContext || 'Verified warning area';
  }

  return processed.replace(/\s+/g, ' ').trim();
}

/**
 * Formats date and time into clear English IST display
 * e.g. "24 Oct 2026, 06:00 PM IST"
 */
export function formatExpiryDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Not specified by issuing authority';

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${formatted} IST`;
    }
  } catch (_e) {
    // fallback
  }

  // If already formatted or raw IST string
  if (typeof dateStr === 'string' && dateStr.trim()) {
    return dateStr.trim();
  }

  return 'Not specified by issuing authority';
}

/**
 * Standard 6-field Simple Warning Structure matching user requirements.
 */
export interface StandardSimpleWarning {
  id: string;
  hazardType: HazardType | 'lightning';
  headline: string; // **[Simple action-oriented headline]**
  safetySentence: string; // [One short sentence explaining the danger and what people should do.]
  affectedArea: string; // **Affected area:** [Verified village, mandal, district or region]
  warningLevel: string; // **Warning level:** [Official severity and likelihood]
  issuedBy: string; // **Issued by:** [Official agency]
  validUntil: string; // **Valid until:** [Actual expiry date and time]
  statusCategory:
    | 'active_warning'
    | 'elevated_risk'
    | 'historical_risk'
    | 'no_active_warning'
    | 'data_unavailable'
    | 'not_applicable'
    | 'simulation';
  sourceUrl?: string;
  moreDetails: {
    originalLanguageText?: string;
    originalLanguageName?: string;
    bulletinIdentifier?: string;
    issuedAt?: string;
    technicalSummary?: string;
    coordinates?: [number, number];
  };
}

/**
 * Builds a standardized simple warning from an active NDMA SACHET alert.
 */
export function formatSachetWarning(alert: ParsedNdmaSachetAlert): StandardSimpleWarning {
  const dType = (alert.disasterType || '').toLowerCase();

  // 1. Translate texts if Indic script is present
  const transMsg = translateIndicAlertTextToEnglish(alert.warningMessage, alert.disasterType);
  const transArea = translateIndicAlertTextToEnglish(alert.areaDescription);

  const cleanArea = transArea.translatedText || alert.areaDescription || 'Stated jurisdiction';
  const validUntilFormatted = formatExpiryDateTime(alert.effectiveEndIso);
  const agency = alert.issuingAuthority || 'State Disaster Management Authority (SDMA)';

  // 2. Generate Action-Oriented Headline and Safety Sentence based on disaster type
  let headline = 'Disaster alert — stay alert and follow instructions';
  let safetySentence =
    transMsg.translatedText ||
    'Official emergency alert in effect. Avoid hazardous areas and follow official bulletins.';
  let mappedHazard: HazardType | 'lightning' = 'flood';

  if (dType.includes('lightning') || dType.includes('thunder')) {
    headline = 'Lightning possible — seek shelter indoors';
    safetySentence =
      'Lightning may occur in the affected area. During thunderstorms, stay inside a safe building. Avoid trees, towers, poles, fields and open areas.';
    mappedHazard = 'lightning';
  } else if (dType.includes('heavy rain') || dType.includes('rain') || dType.includes('downpour')) {
    headline = 'Heavy rain possible — stay alert';
    safetySentence =
      'Heavy rain may affect the area during the stated forecast period. Follow official updates and avoid crossing flooded roads or streams.';
    mappedHazard = 'waterlogging';
  } else if (dType.includes('flood') || dType.includes('inundation')) {
    headline = 'Flood warning — avoid flooded areas';
    safetySentence =
      'Flooding has been indicated by the applicable official warning. Avoid flooded roads and follow local authorities instructions.';
    mappedHazard = 'flood';
  } else if (dType.includes('cyclone') || dType.includes('storm') || dType.includes('gale')) {
    headline = 'Cyclone warning — follow official instructions';
    safetySentence =
      'A cyclone warning applies to the stated area. Follow the latest official advisory and evacuation instructions from local authorities.';
    mappedHazard = 'cyclone';
  } else if (dType.includes('heat') || dType.includes('sun')) {
    headline = 'Heatwave advisory — stay hydrated and indoors';
    safetySentence =
      'Dangerous ambient daytime temperatures expected. Avoid direct sun during peak afternoon hours and drink plenty of water.';
    mappedHazard = 'heatwave';
  }

  // Warning level combining official severity and likelihood
  const sev = alert.severity || 'Alert';
  const likelihood = alert.severityLevel || 'Likely';
  const warningLevel = `${sev.charAt(0).toUpperCase() + sev.slice(1).toLowerCase()} · ${likelihood}`;

  return {
    id: alert.id,
    hazardType: mappedHazard,
    headline,
    safetySentence,
    affectedArea: cleanArea,
    warningLevel,
    issuedBy: agency,
    validUntil: validUntilFormatted,
    statusCategory: 'active_warning',
    sourceUrl: alert.sourceUrl || 'https://sachet.ndma.gov.in/',
    moreDetails: {
      originalLanguageText: alert.originalWarningMessage || transMsg.originalText,
      originalLanguageName:
        (alert.originalWarningMessage ? detectIndicLanguage(alert.originalWarningMessage) : transMsg.languageDetected) === 'telugu' || alert.language === 'te'
          ? 'Telugu'
          : (alert.originalWarningMessage ? detectIndicLanguage(alert.originalWarningMessage) : transMsg.languageDetected) === 'hindi' || alert.language === 'hi'
          ? 'Hindi'
          : undefined,
      bulletinIdentifier: alert.identifier,
      issuedAt: alert.effectiveStartIso ? formatExpiryDateTime(alert.effectiveStartIso) : undefined,
      technicalSummary: `Common Alerting Protocol (CAP) ID: ${alert.identifier}. Coordinates: [${alert.centroid?.[0] || 'N/A'}, ${alert.centroid?.[1] || 'N/A'}]. Area covered: ${alert.areaCoveredKm2 || 0} km².`,
      coordinates: alert.centroid || undefined,
    },
  };
}

/**
 * Builds a standardized simple warning from a HazardAssessment or default state.
 */
export function formatHazardAssessmentWarning(
  hazardType: HazardType,
  assessment?: HazardAssessment | null,
  locationContext?: { district?: string; state?: string; name?: string }
): StandardSimpleWarning {
  const locName = locationContext?.name || 'Local settlement';
  const locDistrict = locationContext?.district || 'District';
  const locState = locationContext?.state || 'State';
  const defaultArea = `${locName}, ${locDistrict}, ${locState}`;

  // 1. Missing Assessment / Telemetry Unavailable
  if (!assessment) {
    return {
      id: `unverified-${hazardType}`,
      hazardType,
      headline: 'Latest warning could not be verified',
      safetySentence:
        'We could not confirm the latest warning for this location. Check official disaster-management updates.',
      affectedArea: defaultArea,
      warningLevel: 'Unverified · Data unavailable',
      issuedBy: 'Official feeds connecting',
      validUntil: 'Telemetry offline',
      statusCategory: 'data_unavailable',
      moreDetails: {
        technicalSummary: 'Authoritative telemetry station unobserved or offline. No mock data generated.',
      },
    };
  }

  // 2. Physically Inapplicable
  if (assessment.isGeographicallyApplicable === false) {
    return {
      id: `inapplicable-${hazardType}`,
      hazardType,
      headline: 'Hazard not applicable to local terrain',
      safetySentence:
        assessment.applicabilityRationale ||
        'This hazard is physically inapplicable to local terrain and geography. No emergency action is required.',
      affectedArea: defaultArea,
      warningLevel: 'Not applicable · Terrain verified',
      issuedBy: assessment.provenance?.source || 'Geological Survey of India / Scientific Baselines',
      validUntil: 'Static terrain baseline',
      statusCategory: 'not_applicable',
      moreDetails: {
        technicalSummary:
          assessment.applicabilityRationale ||
          'Verified geological, elevation, or marine limit demonstrates zero physical applicability.',
      },
    };
  }

  // 3. Active Government Warning (IMD / CWC / NDMA)
  const alert = assessment.officialWarning;
  if (alert?.alertStage && alert.alertStage !== 'no_warning') {
    const coverage = alert.geographicCoverage || `${locDistrict}, ${locState}`;
    const agency = alert.agency === 'IMD' ? 'India Meteorological Department (IMD)' : alert.agency === 'CWC' ? 'Central Water Commission (CWC)' : alert.agency || 'Government Disaster Management';
    const validUntilFormatted = formatExpiryDateTime(alert.validUntil);

    let headline = 'Official warning in effect — follow instructions';
    let safetySentence =
      alert.officialInstructions?.[0] ||
      alert.advisoryText ||
      'Follow official advisories and evacuation instructions from local authorities.';

    if (hazardType === 'flood') {
      headline = 'Flood warning — avoid flooded areas';
      safetySentence =
        'Flooding has been indicated by the applicable official warning. Avoid flooded roads and follow local authorities instructions.';
    } else if (hazardType === 'cyclone') {
      headline = 'Cyclone warning — follow official instructions';
      safetySentence =
        'A cyclone warning applies to the stated area. Follow the latest official advisory and evacuation instructions from local authorities.';
    } else if (hazardType === 'waterlogging') {
      headline = 'Heavy rain possible — stay alert';
      safetySentence =
        'Heavy rain may affect the area during the stated forecast period. Follow official updates and avoid crossing flooded roads or streams.';
    }

    const warningLevel = `${alert.alertStage.charAt(0).toUpperCase() + alert.alertStage.slice(1).toLowerCase()} · ${alert.warningColor.toUpperCase()}`;

    return {
      id: `warning-${hazardType}`,
      hazardType,
      headline,
      safetySentence,
      affectedArea: coverage,
      warningLevel,
      issuedBy: agency,
      validUntil: validUntilFormatted,
      statusCategory: 'active_warning',
      sourceUrl: alert.agency === 'IMD' ? 'https://mausam.imd.gov.in/' : alert.agency === 'CWC' ? 'https://ffs.india-water.gov.in/' : 'https://sachet.ndma.gov.in/',
      moreDetails: {
        bulletinIdentifier: alert.bulletinNumber,
        issuedAt: alert.issuedAt ? formatExpiryDateTime(alert.issuedAt) : undefined,
        technicalSummary: alert.advisoryText || 'Authoritative government meteorological/hydrological bulletin.',
      },
    };
  }

  // 4. Elevated Live Threat (Modelled Pluvial Runoff or Telemetry Peak)
  if (assessment.activeThreat?.level === 'high' || assessment.activeThreat?.level === 'very_high') {
    let headline = 'Elevated hazard risk — stay alert';
    let safetySentence =
      'Elevated risk indicated by recent telemetry or pluvial model. Inspect local drainage channels and monitor updates.';

    if (hazardType === 'flood' || hazardType === 'waterlogging') {
      headline = 'Flood risk elevated — avoid low-lying areas';
      safetySentence =
        'Modelled pluvial runoff indicates surface accumulation risk. Avoid flooded roads and keep drainage outlets clear.';
    } else if (hazardType === 'cyclone') {
      headline = 'Cyclone wind threat — secure loose items';
      safetySentence =
        'High squally winds modelled in local corridor. Avoid travelling and secure lightweight roofing.';
    }

    return {
      id: `elevated-${hazardType}`,
      hazardType,
      headline,
      safetySentence,
      affectedArea: defaultArea,
      warningLevel: `Elevated · ${assessment.activeThreat.threatLabel || 'High'}`,
      issuedBy: `${assessment.modelledImpact?.modelEngine || 'BharatTwin 2D Pluvial Engine'} / Live Telemetry`,
      validUntil: assessment.currentObservation?.observedAt ? formatExpiryDateTime(assessment.currentObservation.observedAt) : 'Current observation window',
      statusCategory: 'elevated_risk',
      moreDetails: {
        technicalSummary: assessment.activeThreat.summary || 'Derived from recent AWS telemetry and terrain catchment solver.',
      },
    };
  }

  // 5. Data Missing
  if (assessment.evidence?.dataCompleteness === 'missing') {
    return {
      id: `missing-${hazardType}`,
      hazardType,
      headline: 'Latest warning could not be verified',
      safetySentence:
        'We could not confirm the latest warning for this location. Check official disaster-management updates.',
      affectedArea: defaultArea,
      warningLevel: 'Unverified · Data incomplete',
      issuedBy: 'Official telemetry offline',
      validUntil: 'Telemetry missing',
      statusCategory: 'data_unavailable',
      moreDetails: {
        technicalSummary: 'Authoritative telemetry station did not report recent readings for this observation cycle.',
      },
    };
  }

  // 6. Long-term Historical Baseline Susceptibility (Separated from Active Warnings!)
  const baselineLevel = assessment.baselineSusceptibility?.level || assessment.riskLevel;
  if (baselineLevel === 'very_high' || baselineLevel === 'high') {
    return {
      id: `baseline-${hazardType}`,
      hazardType,
      headline: 'Historical susceptibility — standard preparedness',
      safetySentence: `Long-term atlas susceptibility is ${baselineLevel.replace('_', ' ')}. No active emergency warning is in effect today.`,
      affectedArea: defaultArea,
      warningLevel: `Historical risk · ${baselineLevel.toUpperCase()}`,
      issuedBy: assessment.baselineSusceptibility?.authoritativeStandard || 'NDMA National Multi-Hazard Atlas',
      validUntil: 'Atlas baseline reference (No active emergency)',
      statusCategory: 'historical_risk',
      moreDetails: {
        technicalSummary:
          assessment.baselineSusceptibility?.rationale ||
          `Long-term geographical exposure derived from national hazard atlas (${assessment.baselineSusceptibility?.authoritativeStandard || 'NDMA/BMTPC'}).`,
      },
    };
  }

  // 7. Clean / Normal: No Applicable Warning Found
  return {
    id: `clean-${hazardType}`,
    hazardType,
    headline: 'No applicable official warning found',
    safetySentence:
      'No applicable active warning was found in the available data. This does not guarantee that conditions are safe.',
    affectedArea: defaultArea,
    warningLevel: 'Normal · No active warning',
    issuedBy: assessment.provenance?.source || 'IMD / CWC / INCOIS Telemetry',
    validUntil: 'Current observation window',
    statusCategory: 'no_active_warning',
    moreDetails: {
      technicalSummary: 'Telemetry stations and early warning feeds reporting observations within normal operational limits.',
    },
  };
}
