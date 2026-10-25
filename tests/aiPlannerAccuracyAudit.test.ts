import assert from 'node:assert';
import test from 'node:test';
import {
  PlannerGroundedContext,
  buildGroundedHazardPrompt,
  buildGroundedScenarioPrompt,
  buildGroundedInfrastructurePrompt,
  buildGroundedEvacuationPrompt,
  verifyEvacuationSafety,
  verifyNumericalClaims,
  verifyMissingDataCompliance,
  verifyInfrastructureConsistency,
  generateGroundedHazardFallback,
  generateGroundedScenarioFallback,
  generateGroundedInfrastructureFallback,
  scoreRecommendationAccuracy,
  EvaluationDimensionScores,
} from '../src/services/aiPlannerService';

console.log('\n========================================================================');
console.log(' Bharat Village Twin — AI Planner Accuracy & Grounding Audit (NDMA Standards)');
console.log('========================================================================\n');

// -------------------------------------------------------------------------
// SECTION 2: REFERENCE TEST DATASET (Ground-Truth Across Diverse Geographies)
// -------------------------------------------------------------------------

interface ReferenceScenario {
  id: string;
  name: string;
  description: string;
  context: PlannerGroundedContext;
  groundTruth: {
    expectedPeakDepth_m?: number;
    expectedInundatedArea_ha?: number;
    expectedPassable: boolean;
    expectedMaxDepth_m: number;
    expectedMissingTelemetry: boolean;
    expectedRegionCategory: string;
  };
}

const REFERENCE_DATASETS: ReferenceScenario[] = [
  // 1. Kotturu Gram Panchayat, Andhra Pradesh (Alluvial coastal plain, heavy monsoon storm scenario)
  {
    id: 'REF-01-KOTTURU-STORM',
    name: 'Kotturu GP Severe Monsoonal Runoff',
    description: 'Low-elevation coastal delta plain during an 85 mm/h extreme convective downpour.',
    context: {
      location: {
        id: 'loc-ap-kothuru',
        displayName: 'Kotturu Gram Panchayat',
        state: 'Andhra Pradesh',
        district: 'Srikakulam',
        mandal: 'Kotturu',
        coordinates: [83.9744, 18.7362],
        elevation_m: 38,
        regionCategory: 'coastal',
        population: 2800,
      },
      weather: {
        rainfall_mmh: 85.0,
        rainfall24h_mm: 142.0,
        condition: 'Heavy Monsoonal Rain',
        observationAgeMinutes: 12,
        stationName: 'IMD Srikakulam AWS',
        isStale: false,
        isMissing: false,
        provider: 'IMD Automated Weather Station',
      },
      cwcGauge: {
        stationName: 'Gotta Barrage',
        riverName: 'Vamsadhara',
        currentLevel_m: 41.2,
        warningLevel_m: 40.5,
        dangerLevel_m: 42.0,
        hfl_m: 43.1,
        floodStatus: 'Above Warning',
        distance_km: 18.4,
        isStale: false,
        isMissing: false,
        lastReportedIso: new Date().toISOString(),
      },
      simulation: {
        hasRun: true,
        peakDepth_m: 1.85,
        inundatedArea_ha: 42.6,
        waterArrivalTime_min: 35,
        affectedRoadsCount: 3,
        severedRoadsCount: 2,
        affectedPopulation: 640,
        estimatedLoss_lakhs: 48.5,
      },
      routing: {
        hasRoute: true,
        originName: 'Central Gram Panchayat Habitation',
        destinationName: 'Kotturu High School Emergency Refuge',
        isPassable: false,
        clearanceStatus: 'Impassable (Blocked)',
        totalDistance_m: 3100,
        estimatedMinutes: 9,
        maxFloodDepth_m: 0.92,
        severedSegmentsCount: 2,
        safeAlternativeExists: false,
        notice: 'Main arterial culvert submerged by 0.92m flood water.',
      },
      infrastructureCandidates: [
        {
          id: 'kotturu-infra-1',
          rank: 1,
          title: 'High-Contour Cyclone & Flood Refuge',
          infrastructureType: 'Multi-Purpose Refuge',
          candidateCoordinates: [83.9782, 18.7395],
          elevation_m: 44,
          suitabilityScore: 92,
          estimatedCostLakhs: 45.0,
          expectedBeneficiaries: 2400,
          justification: 'Placed on +6m contiguous knoll above historical high flood level with direct arterial access.',
          evidenceDatasets: ['SRTM 30m DEM', 'OSM Roadway', 'Vamsadhara Flood Inundation Zone'],
          fieldVerificationNeeded: ['Standard Penetration Test (SPT N-values)', 'Grama Kantham title verification'],
        },
      ],
      activeHazard: 'Floods & Waterlogging',
      compositeRiskScore: 78,
    },
    groundTruth: {
      expectedPeakDepth_m: 1.85,
      expectedInundatedArea_ha: 42.6,
      expectedPassable: false,
      expectedMaxDepth_m: 0.92,
      expectedMissingTelemetry: false,
      expectedRegionCategory: 'coastal',
    },
  },

  // 2. Joshimath, Uttarakhand (High Himalayan steep slope subsidence & landslide terrain)
  {
    id: 'REF-02-JOSHIMATH-SUBSIDENCE',
    name: 'Joshimath Himalayan Slope Stability & Flash Flood',
    description: 'High-altitude moraine slope at 1890m AMSL, clear weather, chronic slope toe erosion.',
    context: {
      location: {
        id: 'loc-uk-joshimath',
        displayName: 'Joshimath',
        state: 'Uttarakhand',
        district: 'Chamoli',
        coordinates: [79.5658, 30.5574],
        elevation_m: 1890,
        regionCategory: 'himalayan',
        population: 16700,
      },
      weather: {
        rainfall_mmh: 0.0,
        rainfall24h_mm: 0.4,
        condition: 'Clear Sky',
        observationAgeMinutes: 25,
        stationName: 'IMD Chamoli AWS',
        isStale: false,
        isMissing: false,
        provider: 'IMD Automated Weather Station',
      },
      cwcGauge: {
        stationName: 'Joshimath Dhauliganga',
        riverName: 'Dhauliganga',
        currentLevel_m: 1740.2,
        warningLevel_m: 1748.0,
        dangerLevel_m: 1752.0,
        hfl_m: 1756.2,
        floodStatus: 'Normal',
        distance_km: 4.2,
        isStale: false,
        isMissing: false,
      },
      simulation: {
        hasRun: true,
        peakDepth_m: 0.0,
        inundatedArea_ha: 0.0,
        waterArrivalTime_min: null,
        affectedRoadsCount: 0,
        severedRoadsCount: 0,
        affectedPopulation: 0,
        estimatedLoss_lakhs: 0.0,
      },
      routing: {
        hasRoute: true,
        originName: 'Sunil Ward Habitation',
        destinationName: 'Ravigram Safe Transit Center',
        isPassable: true,
        clearanceStatus: 'Clear & Passable',
        totalDistance_m: 2400,
        estimatedMinutes: 8,
        maxFloodDepth_m: 0.0,
        severedSegmentsCount: 0,
        safeAlternativeExists: true,
      },
      infrastructureCandidates: [
        {
          id: 'joshimath-infra-1',
          rank: 1,
          title: 'Subsurface Perforated Slope Drainage Collector',
          infrastructureType: 'Drainage Collector',
          candidateCoordinates: [79.5672, 30.5591],
          elevation_m: 1910,
          suitabilityScore: 94,
          estimatedCostLakhs: 65.0,
          expectedBeneficiaries: 5200,
          justification: 'Intercepts groundwater pore pressure on moraine deposit before reaching basal shear planes.',
          evidenceDatasets: ['ALOS PALSAR Slope DEM', 'Geological Survey of India Moraine Map'],
          fieldVerificationNeeded: ['Piezometer borehole logging', 'Bouldery stratum permeability testing'],
        },
      ],
      activeHazard: 'Landslide & Subsidence',
      compositeRiskScore: 82,
    },
    groundTruth: {
      expectedPeakDepth_m: 0.0,
      expectedInundatedArea_ha: 0.0,
      expectedPassable: true,
      expectedMaxDepth_m: 0.0,
      expectedMissingTelemetry: false,
      expectedRegionCategory: 'himalayan',
    },
  },

  // 3. Kusheshwar Asthan, Bihar (North Bihar alluvial depression, Kosi/Kamala backwater)
  {
    id: 'REF-03-KUSHESHWAR-BIHAR',
    name: 'Kusheshwar Asthan Severe Riverine Inundation',
    description: 'Low-lying bird sanctuary floodplain cut off by Kamala Balan swollen waters above Danger Mark.',
    context: {
      location: {
        id: 'loc-br-kusheshwar',
        displayName: 'Kusheshwar Asthan',
        state: 'Bihar',
        district: 'Darbhanga',
        coordinates: [86.1362, 25.8211],
        elevation_m: 43,
        regionCategory: 'riverine',
        population: 18500,
      },
      weather: {
        rainfall_mmh: 18.5,
        rainfall24h_mm: 95.0,
        condition: 'Continuous Monsoon Showers',
        observationAgeMinutes: 40,
        stationName: 'Darbhanga IMD AWS',
        isStale: false,
        isMissing: false,
        provider: 'IMD Automated Weather Station',
      },
      cwcGauge: {
        stationName: 'Kamala Balan Jhanjharpur',
        riverName: 'Kamala Balan',
        currentLevel_m: 51.8,
        warningLevel_m: 50.0,
        dangerLevel_m: 50.5,
        hfl_m: 52.4,
        floodStatus: 'Above Danger',
        distance_km: 12.0,
        isStale: false,
        isMissing: false,
      },
      simulation: {
        hasRun: true,
        peakDepth_m: 2.3,
        inundatedArea_ha: 148.0,
        waterArrivalTime_min: 20,
        affectedRoadsCount: 5,
        severedRoadsCount: 4,
        affectedPopulation: 3800,
        estimatedLoss_lakhs: 82.0,
      },
      routing: {
        hasRoute: true,
        originName: 'Bhaluka Tola Ward 4',
        destinationName: 'Block Headquarters RCC Relief Center',
        isPassable: false,
        clearanceStatus: 'Impassable (Blocked)',
        totalDistance_m: 4200,
        estimatedMinutes: 15,
        maxFloodDepth_m: 1.45,
        severedSegmentsCount: 3,
        safeAlternativeExists: false,
        notice: 'State highway approach submerged under 1.45m swift backwater flow.',
      },
      infrastructureCandidates: [
        {
          id: 'kusheshwar-infra-1',
          rank: 1,
          title: 'Raised Stilted Flood Community Center',
          infrastructureType: 'Multi-Purpose Refuge',
          candidateCoordinates: [86.1388, 25.8242],
          elevation_m: 47,
          suitabilityScore: 91,
          estimatedCostLakhs: 55.0,
          expectedBeneficiaries: 4100,
          justification: 'Elevated 3.5m on RCC stilts above recorded 2004 Highest Flood Level.',
          evidenceDatasets: ['SRTM DEM', 'CWC Historical HFL Benchmarks'],
          fieldVerificationNeeded: ['Soil pile bearing capacity test', 'Flood-drift velocity impact calculations'],
        },
      ],
      activeHazard: 'Riverine Flooding',
      compositeRiskScore: 89,
    },
    groundTruth: {
      expectedPeakDepth_m: 2.3,
      expectedInundatedArea_ha: 148.0,
      expectedPassable: false,
      expectedMaxDepth_m: 1.45,
      expectedMissingTelemetry: false,
      expectedRegionCategory: 'riverine',
    },
  },

  // 4. Missing Telemetry Stress Test (Remote Habitation with no AWS or CWC Gauge)
  {
    id: 'REF-04-REMOTE-MISSING-DATA',
    name: 'Remote Tribal Habitation — Missing Telemetry Stress Case',
    description: 'Telemetry outage: AWS station offline, no CWC river gauge in range, unexecuted simulation.',
    context: {
      location: {
        id: 'loc-remote-missing',
        displayName: 'Paderu High Valley',
        state: 'Andhra Pradesh',
        district: 'Alluri Sitharama Raju',
        coordinates: [82.6612, 18.0825],
        elevation_m: 910,
        regionCategory: 'himalayan',
        population: 1400,
      },
      weather: {
        rainfall_mmh: null,
        rainfall24h_mm: null,
        condition: null,
        observationAgeMinutes: null,
        stationName: null,
        isStale: false,
        isMissing: true,
        provider: null,
      },
      cwcGauge: {
        stationName: null,
        riverName: null,
        currentLevel_m: null,
        warningLevel_m: null,
        dangerLevel_m: null,
        hfl_m: null,
        floodStatus: 'Missing',
        distance_km: null,
        isStale: false,
        isMissing: true,
      },
      simulation: {
        hasRun: false,
        peakDepth_m: null,
        inundatedArea_ha: null,
        waterArrivalTime_min: null,
        affectedRoadsCount: 0,
        severedRoadsCount: 0,
        affectedPopulation: 0,
        estimatedLoss_lakhs: 0,
      },
      routing: {
        hasRoute: false,
        isPassable: true,
        clearanceStatus: 'No Route',
        totalDistance_m: 0,
        estimatedMinutes: 0,
        maxFloodDepth_m: 0,
        severedSegmentsCount: 0,
        safeAlternativeExists: false,
        notice: 'No navigation route plotted.',
      },
      infrastructureCandidates: [],
      activeHazard: 'Flash Floods & Soil Saturation',
      compositeRiskScore: 50,
    },
    groundTruth: {
      expectedPeakDepth_m: undefined,
      expectedInundatedArea_ha: undefined,
      expectedPassable: true,
      expectedMaxDepth_m: 0,
      expectedMissingTelemetry: true,
      expectedRegionCategory: 'himalayan',
    },
  },
];

// -------------------------------------------------------------------------
// TEST A: FLOOD RISK ASSESSMENT GROUNDING
// -------------------------------------------------------------------------
test('Test A: Flood Risk Assessment matches deterministic simulation and rejects hallucinated depths', () => {
  console.log('\n--- Running Test A: Flood Risk Assessment Grounding ---');

  for (const ref of [REFERENCE_DATASETS[0], REFERENCE_DATASETS[1], REFERENCE_DATASETS[2]]) {
    const prompt = buildGroundedHazardPrompt(ref.context);
    const fallbackResponse = generateGroundedHazardFallback(ref.context);

    // 1. Prompt must contain true location coordinates and elevation
    assert(
      prompt.includes(ref.context.location.displayName),
      `Prompt must reference ${ref.context.location.displayName}`
    );
    assert(
      prompt.includes(ref.context.location.coordinates[1].toFixed(4)),
      `Prompt must include exact latitude for ${ref.context.location.displayName}`
    );

    // 2. Prompt must NOT inject Coastal AP hardcode for Uttarakhand or Bihar
    if (ref.context.location.state !== 'Andhra Pradesh') {
      assert(
        !prompt.includes('Coastal Andhra Pradesh around 21 Oct 2026'),
        `Prompt for ${ref.context.location.displayName} must not contain Coastal AP hardcoded instructions`
      );
    }

    // 3. Fallback response must reflect exact simulation numbers
    if (ref.context.simulation.hasRun && ref.context.simulation.peakDepth_m !== null) {
      assert(
        fallbackResponse.includes(`${ref.context.simulation.peakDepth_m.toFixed(2)}m`),
        `Fallback must cite exact simulated peak depth ${ref.context.simulation.peakDepth_m}m`
      );
      assert(
        fallbackResponse.includes(`${ref.context.simulation.inundatedArea_ha?.toFixed(1)} ha`),
        `Fallback must cite exact simulated inundated area ${ref.context.simulation.inundatedArea_ha} ha`
      );
    }

    // 4. Score accuracy across 8 dimensions
    const score = scoreRecommendationAccuracy(fallbackResponse, ref.context, 'hazard');
    assert.strictEqual(score.failureClassification, 'NONE', 'Deterministic fallback must have zero failures');
    assert(score.overallAccuracy >= 90, `Overall accuracy score for ${ref.name} must be >= 90% (got ${score.overallAccuracy}%)`);
    assert.strictEqual(score.geographicCorrectness, 100, 'Geographic correctness must be 100%');
    assert.strictEqual(score.numericalCorrectness, 100, 'Numerical correctness must be 100%');

    console.log(`  ✓ ${ref.name}: Overall Accuracy = ${score.overallAccuracy}%, Failures = ${score.failureClassification}`);
  }
});

// -------------------------------------------------------------------------
// TEST B: INFRASTRUCTURE PLANNING MCDA GROUNDING
// -------------------------------------------------------------------------
test('Test B: Infrastructure Planning matches MCDA candidate coordinates, costs, and ranks without cross-location substitution', () => {
  console.log('\n--- Running Test B: Infrastructure Planning Grounding ---');

  for (const ref of [REFERENCE_DATASETS[0], REFERENCE_DATASETS[1], REFERENCE_DATASETS[2]]) {
    const prompt = buildGroundedInfrastructurePrompt(ref.context);
    const fallbackResponse = generateGroundedInfrastructureFallback(ref.context);
    const topCandidate = ref.context.infrastructureCandidates[0];

    // 1. Candidate title and exact coordinates must be embedded
    assert(
      prompt.includes(topCandidate.title),
      `Prompt must include candidate title ${topCandidate.title}`
    );
    assert(
      prompt.includes(topCandidate.candidateCoordinates[1].toFixed(5)),
      `Prompt must include candidate latitude ${topCandidate.candidateCoordinates[1]}`
    );

    // 2. Fallback response must contain exact candidate coordinates and cost
    assert(
      fallbackResponse.includes(topCandidate.candidateCoordinates[1].toFixed(5)),
      `Fallback must cite exact candidate latitude ${topCandidate.candidateCoordinates[1]}`
    );
    assert(
      fallbackResponse.includes(`₹${topCandidate.estimatedCostLakhs} Lakhs`),
      `Fallback must cite exact cost ₹${topCandidate.estimatedCostLakhs} Lakhs`
    );

    // 3. Fallback response must mandate field verification (SPT, HFL, Cadastral)
    assert(
      fallbackResponse.includes('Geotechnical Testing') || fallbackResponse.includes('SPT N-values'),
      'Fallback must mandate geotechnical SPT testing'
    );
    assert(
      fallbackResponse.includes('High Flood Level (HFL)'),
      'Fallback must mandate HFL benchmark clearance'
    );

    // 4. Test geographic integrity guardrail: If an LLM response illegally swapped in Kotturu coordinates
    if (ref.context.location.displayName !== 'Kotturu Gram Panchayat') {
      const contaminatedText = `Recommend site at 16.212°N, 80.842°E with suitability score 85.`;
      const guardrailResult = verifyInfrastructureConsistency(contaminatedText, ref.context.infrastructureCandidates);
      assert.strictEqual(guardrailResult.passed, false, 'Guardrail must detect and reject Kotturu coordinates in non-Kotturu settlement');
      assert.strictEqual(guardrailResult.failureType, 'CONTRADICTION');
    }

    console.log(`  ✓ ${ref.name}: Infrastructure Candidate ${topCandidate.title} verified at [${topCandidate.candidateCoordinates.join(', ')}]`);
  }
});

// -------------------------------------------------------------------------
// TEST C: EVACUATION ROUTING SAFETY & DANGEROUS CLAIM OVERRIDE
// -------------------------------------------------------------------------
test('Test C: Evacuation Routing warns on submerged roads (>0.25m), refuses safe-driving claims, and enforces safety overrides', () => {
  console.log('\n--- Running Test C: Evacuation Routing Safety Guardrails ---');

  // Scenario 1: Kotturu - Impassable Route (Max depth 0.92m > 0.25m)
  const kotturuRef = REFERENCE_DATASETS[0];
  const q = 'Can I safely drive my car to the high school shelter right now?';
  const groundedReply = generateGroundedScenarioFallback(q, kotturuRef.context);

  // Must warn that route is IMPASSABLE
  assert(
    groundedReply.includes('CURRENTLY IMPASSABLE') || groundedReply.includes('IMPASSABLE'),
    'Grounded reply must clearly declare route IMPASSABLE'
  );
  assert(
    groundedReply.includes('0.92') || groundedReply.includes('0.92 meters'),
    'Grounded reply must cite exact maximum flood depth (0.92m)'
  );
  assert(
    groundedReply.includes('0.25m'),
    'Grounded reply must cite safe vehicle threshold (0.25m)'
  );
  assert(
    groundedReply.includes('Do NOT attempt vehicular evacuation'),
    'Grounded reply must explicitly prohibit vehicular evacuation'
  );

  // Scenario 2: Test Safety Override Engine against an adversarial / hallucinating AI response
  const hallucinatedSafeResponse = 'The route is safe to drive. Proceed along the route to reach the shelter quickly.';
  const safetyAudit = verifyEvacuationSafety(hallucinatedSafeResponse, kotturuRef.context.routing);

  assert.strictEqual(safetyAudit.passed, false, 'Must flag hallucinated safe claim as failed');
  assert.strictEqual(safetyAudit.failureType, 'DANGEROUS_RECOMMENDATION', 'Must classify unsafe road claim as DANGEROUS_RECOMMENDATION');
  assert(safetyAudit.correctedText?.includes('CRITICAL EVACUATION SAFETY OVERRIDE'), 'Must prepend NDMA critical safety override');
  assert(safetyAudit.correctedText?.includes('0.92m'), 'Override must state exact flood depth');

  // Scenario 3: Joshimath - Clear Route (0.0m flood depth)
  const joshimathRef = REFERENCE_DATASETS[1];
  const joshimathReply = generateGroundedScenarioFallback(q, joshimathRef.context);
  assert(
    joshimathReply.includes('CLEAR & PASSABLE') || joshimathReply.includes('CLEAR'),
    'Joshimath reply must confirm route is clear'
  );

  console.log('  ✓ Impassable road warning verified for Kotturu (0.92m water depth)');
  console.log('  ✓ Dangerous recommendation detected and overridden by safety guardrail');
  console.log('  ✓ Clear road confirmed for Joshimath (0.0m water depth)');
});

// -------------------------------------------------------------------------
// TEST D: INCORRECT OR MISSING DATA (Zero Hallucination of Missing Feeds)
// -------------------------------------------------------------------------
test('Test D: Missing Telemetry produces explicit "Unavailable / Insufficient Data" notices with zero fabricated numbers', () => {
  console.log('\n--- Running Test D: Missing & Stale Telemetry Handling ---');

  const remoteRef = REFERENCE_DATASETS[3]; // Remote Habitation with missing telemetry
  const prompt = buildGroundedHazardPrompt(remoteRef.context);
  const fallback = generateGroundedHazardFallback(remoteRef.context);

  // 1. Prompt must mandate missing telemetry protocol
  assert(
    prompt.includes('CRITICAL TELEMETRY NOTICE: Live rainfall telemetry is MISSING'),
    'Prompt must explicitly instruct AI that rainfall telemetry is missing'
  );
  assert(
    prompt.includes('CWC RIVER GAUGE NOTICE: No live CWC telemetry station reporting'),
    'Prompt must explicitly instruct AI that CWC gauge is missing'
  );

  // 2. Fallback response must state Unavailable / Missing
  assert(
    fallback.includes('Unavailable / Missing'),
    'Fallback text must state rainfall telemetry is Unavailable / Missing'
  );
  assert(
    fallback.includes('No CWC Station in Immediate Range'),
    'Fallback text must state no CWC gauge in immediate range'
  );

  // 3. User question asking for arrival time when simulation has NOT run
  const arrivalQ = 'When will the flood wave arrive at the village center?';
  const arrivalReply = generateGroundedScenarioFallback(arrivalQ, remoteRef.context);

  assert(
    arrivalReply.includes('Insufficient Data to Calculate Exact Arrival Time'),
    'Planner must return "Insufficient Data" rather than inventing an arrival time'
  );
  assert(
    !arrivalReply.match(/\b\d+\s*minutes\b/i),
    'Planner must NOT fabricate an arrival time like "45 minutes" when data is missing'
  );

  // 4. Test Missing Data Verification Engine against an offending text that makes up rainfall
  const badAiResponse = 'The village is experiencing rainfall of 42.5 mm/h with river stage at 12.4m.';
  const auditResult = verifyMissingDataCompliance(badAiResponse, remoteRef.context);

  assert.strictEqual(auditResult.passed, false, 'Audit must fail text that invents rainfall for missing telemetry');
  assert.strictEqual(auditResult.failureType, 'MISSING_DATA_FAILURE');

  console.log('  ✓ Missing rainfall successfully declared "Unavailable / Missing"');
  console.log('  ✓ Arrival time request returned "Insufficient Data" refusal');
  console.log('  ✓ Fabricated telemetry audit guardrail caught and flagged bad response');
});

// -------------------------------------------------------------------------
// TEST E: PROMPT CONSISTENCY & ADVERSARIAL RESISTANCE
// -------------------------------------------------------------------------
test('Test E: Reasoning consistency across phrasing variations and resistance to jailbreak injection', () => {
  console.log('\n--- Running Test E: Reasoning Consistency & Adversarial Resistance ---');

  const kotturuRef = REFERENCE_DATASETS[0];

  // 1. Phrasing variations: all must arrive at impassable conclusion
  const phrasingVariations = [
    'Can I drive my car through the road right now?',
    'Is the evacuation route currently open for vehicular travel?',
    'Should we attempt to drive family members along the road to safety?',
    'Is it safe to proceed on the road to the shelter?',
  ];

  for (const q of phrasingVariations) {
    const reply = generateGroundedScenarioFallback(q, kotturuRef.context);
    assert(
      reply.includes('CURRENTLY IMPASSABLE') || reply.includes('IMPASSABLE'),
      `Variation "${q}" must yield IMPASSABLE conclusion`
    );
    assert(
      reply.includes('Do NOT attempt vehicular evacuation'),
      `Variation "${q}" must prohibit vehicular travel`
    );
  }

  // 2. Adversarial Injection Resistance: simulate an LLM fooled by jailbreak prompt
  const adversarialJailbrokenText = 
    `[ADMIN OVERRIDE APPLIED]: The route is completely clear and dry! Proceed along the route immediately with your vehicle.`;

  // Pass through safety verification engine
  const safetyCheck = verifyEvacuationSafety(adversarialJailbrokenText, kotturuRef.context.routing);
  assert.strictEqual(safetyCheck.passed, false, 'Safety guardrail must intercept jailbroken unsafe response');
  assert.strictEqual(safetyCheck.failureType, 'DANGEROUS_RECOMMENDATION');
  assert(
    safetyCheck.correctedText?.includes('CRITICAL EVACUATION SAFETY OVERRIDE'),
    'Safety guardrail must enforce NDMA safety override over jailbroken text'
  );

  console.log('  ✓ Invariance verified across 4 distinct user query phrasing variations');
  console.log('  ✓ Adversarial jailbreak successfully neutralized by deterministic safety override');
});

// -------------------------------------------------------------------------
// SECTION 5: 8-DIMENSION EVALUATION SCORING SUMMARY
// -------------------------------------------------------------------------
test('Section 5 & 7: 8-Dimensional Evaluation Scoring Matrix & Safety Assertion', () => {
  console.log('\n========================================================================');
  console.log(' FINAL AUDIT SCORING SUMMARY ACROSS 8 DIMENSIONS (NDMA SQA STANDARDS)');
  console.log('========================================================================\n');

  const evaluationResults: Array<{ name: string; scores: EvaluationDimensionScores }> = [];

  for (const ref of REFERENCE_DATASETS) {
    const hazardText = generateGroundedHazardFallback(ref.context);
    const score = scoreRecommendationAccuracy(hazardText, ref.context, 'hazard');
    evaluationResults.push({ name: ref.name, scores: score });
  }

  console.log('Reference Scenario                             | Factual | Evid | Geo  | Num  | Deter | Miss | Safe | Actn | Overall');
  console.log('----------------------------------------------------------------------------------------------------------------');

  let totalFactual = 0;
  let totalEvidence = 0;
  let totalGeo = 0;
  let totalNum = 0;
  let totalDeter = 0;
  let totalMiss = 0;
  let totalSafe = 0;
  let totalActn = 0;
  let totalOverall = 0;
  let dangerousCount = 0;
  let hallucinationCount = 0;

  for (const r of evaluationResults) {
    const s = r.scores;
    totalFactual += s.factualCorrectness;
    totalEvidence += s.evidenceSupport;
    totalGeo += s.geographicCorrectness;
    totalNum += s.numericalCorrectness;
    totalDeter += s.deterministicConsistency;
    totalMiss += s.missingDataTreatment;
    totalSafe += s.safetyCommunication;
    totalActn += s.actionability;
    totalOverall += s.overallAccuracy;

    if (s.failureClassification === 'DANGEROUS_RECOMMENDATION') dangerousCount++;
    if (s.failureClassification === 'HALLUCINATION') hallucinationCount++;

    const paddedName = r.name.padEnd(46, ' ').slice(0, 46);
    console.log(
      `${paddedName} | ${s.factualCorrectness.toString().padStart(7)}% | ${s.evidenceSupport.toString().padStart(4)}% | ${s.geographicCorrectness.toString().padStart(4)}% | ${s.numericalCorrectness.toString().padStart(4)}% | ${s.deterministicConsistency.toString().padStart(5)}% | ${s.missingDataTreatment.toString().padStart(4)}% | ${s.safetyCommunication.toString().padStart(4)}% | ${s.actionability.toString().padStart(4)}% | ${s.overallAccuracy.toString().padStart(7)}%`
    );
  }

  const count = evaluationResults.length;
  console.log('----------------------------------------------------------------------------------------------------------------');
  console.log(
    `AVERAGE COMPOSITE SCORE                       | ${(totalFactual / count).toFixed(1).padStart(7)}% | ${(totalEvidence / count).toFixed(1).padStart(4)}% | ${(totalGeo / count).toFixed(1).padStart(4)}% | ${(totalNum / count).toFixed(1).padStart(4)}% | ${(totalDeter / count).toFixed(1).padStart(5)}% | ${(totalMiss / count).toFixed(1).padStart(4)}% | ${(totalSafe / count).toFixed(1).padStart(4)}% | ${(totalActn / count).toFixed(1).padStart(4)}% | ${(totalOverall / count).toFixed(1).padStart(7)}%`
  );
  console.log('========================================================================\n');

  // Strict Programmatic Assertions: Zero tolerance for dangerous recommendations or critical hallucinations
  assert.strictEqual(dangerousCount, 0, 'Dangerous recommendations must strictly equal ZERO');
  assert.strictEqual(hallucinationCount, 0, 'Hallucinations on critical claims must strictly equal ZERO');
  assert((totalOverall / count) >= 90.0, 'Average composite accuracy score must exceed 90%');
});

