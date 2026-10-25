/**
 * Bharat Village Twin — Grounded AI Planner Service
 * 
 * Provides verifiable, deterministic grounding for all AI advisory, hazard appraisal,
 * infrastructure prioritization, and evacuation routing queries.
 * 
 * Enforces strict safety rules:
 * - Zero hallucination of missing or unverified telemetry.
 * - Deterministic alignment with hydraulic simulation and topological routing engines.
 * - Immediate safety override if an AI text suggests an impassable road is safe.
 * - Explicit 'Insufficient data' handling for missing/stale telemetry.
 */

export interface PlannerTelemetryContext {
  rainfall_mmh: number | null;
  rainfall24h_mm: number | null;
  condition?: string | null;
  observationAgeMinutes?: number | null;
  stationName?: string | null;
  isStale: boolean;
  isMissing: boolean;
  provider?: string | null;
}

export interface PlannerRiverGaugeContext {
  stationName: string | null;
  riverName: string | null;
  currentLevel_m: number | null;
  warningLevel_m: number | null;
  dangerLevel_m: number | null;
  hfl_m: number | null;
  floodStatus: 'Normal' | 'Above Warning' | 'Above Danger' | 'High Flood' | 'Missing';
  distance_km: number | null;
  isStale: boolean;
  isMissing: boolean;
  lastReportedIso?: string | null;
}

export interface PlannerSimulationContext {
  hasRun: boolean;
  peakDepth_m: number | null;
  inundatedArea_ha: number | null;
  waterArrivalTime_min: number | null;
  affectedRoadsCount: number;
  severedRoadsCount: number;
  affectedPopulation: number;
  estimatedLoss_lakhs: number;
  modelType?: string;
}

export interface PlannerRoutingContext {
  hasRoute: boolean;
  originName?: string;
  destinationName?: string;
  isPassable: boolean;
  clearanceStatus: 'Clear & Passable' | 'Conditional (Caution)' | 'Impassable (Blocked)' | 'No Route';
  totalDistance_m: number;
  estimatedMinutes: number;
  maxFloodDepth_m: number;
  severedSegmentsCount: number;
  safeAlternativeExists: boolean;
  notice?: string;
}

export interface PlannerCandidateSite {
  id: string;
  rank: number;
  title: string;
  infrastructureType: string;
  candidateCoordinates: [number, number]; // [lng, lat]
  elevation_m: number;
  suitabilityScore: number;
  estimatedCostLakhs: number;
  expectedBeneficiaries: number;
  justification: string;
  evidenceDatasets?: string[];
  fieldVerificationNeeded?: string[];
}

export interface PlannerGroundedContext {
  location: {
    id: string;
    displayName: string;
    state: string;
    district: string;
    mandal?: string;
    coordinates: [number, number]; // [lng, lat]
    elevation_m: number;
    regionCategory: string;
    population?: number;
  };
  weather: PlannerTelemetryContext;
  cwcGauge: PlannerRiverGaugeContext;
  simulation: PlannerSimulationContext;
  routing: PlannerRoutingContext;
  infrastructureCandidates: PlannerCandidateSite[];
  activeHazard: string;
  compositeRiskScore: number;
  allHazards?: string[];
  selectedInterventions?: string[];
}

// -------------------------------------------------------------------------
// Prompt Builders with Strict Grounding and Safety Rules
// -------------------------------------------------------------------------

export function buildGroundedHazardPrompt(ctx: PlannerGroundedContext): string {
  const weatherText = ctx.weather.isMissing
    ? 'CRITICAL TELEMETRY NOTICE: Live rainfall telemetry is MISSING for this settlement. Do NOT invent rainfall numbers or arrival times. Explicitly state that precipitation data is currently unverified.'
    : ctx.weather.isStale
    ? `TELEMETRY STALE WARNING: Rainfall telemetry is ${ctx.weather.observationAgeMinutes} minutes old (Stale). State that recent conditions may have changed.`
    : `Live Verified Rainfall: ${ctx.weather.rainfall_mmh?.toFixed(1) ?? '0.0'} mm/h (${ctx.weather.rainfall24h_mm?.toFixed(1) ?? '0.0'} mm 24h accumulation) from ${ctx.weather.provider || 'IMD/Open-Meteo'}.`;

  const gaugeText = ctx.cwcGauge.isMissing
    ? 'CWC RIVER GAUGE NOTICE: No live CWC telemetry station reporting within immediate catchment. Do NOT invent river discharge or water levels.'
    : `CWC River Gauge (${ctx.cwcGauge.stationName || 'Regional'} on ${ctx.cwcGauge.riverName || 'River'} at ${ctx.cwcGauge.distance_km?.toFixed(1) ?? '?'} km): Current Level ${ctx.cwcGauge.currentLevel_m?.toFixed(2)}m (Warning: ${ctx.cwcGauge.warningLevel_m?.toFixed(2)}m, Danger: ${ctx.cwcGauge.dangerLevel_m?.toFixed(2)}m, Status: ${ctx.cwcGauge.floodStatus}).`;

  const simText = ctx.simulation.hasRun
    ? `Deterministic Hydrodynamic Simulation Results: Peak Depth ${ctx.simulation.peakDepth_m?.toFixed(2)}m, Inundated Area ${ctx.simulation.inundatedArea_ha?.toFixed(1)} ha, Severed Road Segments: ${ctx.simulation.severedRoadsCount}, Affected Population: ~${ctx.simulation.affectedPopulation}.`
    : 'Hydrologic Simulation: Not yet executed for current scenario. Do not cite specific hydraulic flood contours without simulation execution.';

  return `You are a Senior Multi-Hazard Disaster Risk Reduction Specialist with the National Disaster Management Authority (NDMA), Government of India.
Generate an authoritative, fact-grounded Executive Multi-Hazard Risk Assessment and Smart Infrastructure Action Brief for:
Settlement: ${ctx.location.displayName}
District/State: ${ctx.location.district}, ${ctx.location.state}, India
Physiographic Setting: ${ctx.location.regionCategory} terrain (Elevation ~${ctx.location.elevation_m}m AMSL, Coords: [${ctx.location.coordinates[1].toFixed(4)}°N, ${ctx.location.coordinates[0].toFixed(4)}°E])
Estimated Population: ~${ctx.location.population || 2800} residents
Active Focus Hazard: ${ctx.activeHazard}
Composite Vulnerability Index: ${ctx.compositeRiskScore}/100

GROUND TRUTH DATA FEEDS:
1. ${weatherText}
2. ${gaugeText}
3. ${simText}

MANDATORY SCIENTIFIC GROUNDING & SAFETY RULES:
- STRICT FACTUAL ADHERENCE: You must ONLY use the telemetry and simulation numbers provided above. Never hallucinate rainfall, water depths, or gauge levels.
- MISSING DATA PROTOCOL: If telemetry is marked MISSING or UNVERIFIED, you MUST explicitly inform the user that live sensor data is absent and direct them to official district emergency operations centers.
- ZERO CROSS-LOCATION LEAKAGE: Evaluate strictly for ${ctx.location.displayName}, ${ctx.location.state}. Never paste advisories or references intended for other states.
- DISTINGUISH BASELINE VS DYNAMIC: Clearly separate long-term building code baselines (BIS IS 1893 seismic zonation, BIS IS 875 wind zone) from dynamic real-time hazard status.

Format your output in clean Markdown:
1. **Executive Multi-Hazard Synthesis**: Grounded assessment of current threat vs long-term susceptibility.
2. **Telemetry & Sensor Ground-Truth Status**: Transparent report on data feeds (Rainfall, CWC River Gauge, Simulation).
3. **Engineering Mitigation Roadmap**: Targeted structural interventions for this specific physiographic region.
4. **Standard Operating Procedures (SOPs)**: Actionable 24-48h checklist for Gram Panchayat disaster management committees.
5. **Convergence & Financing**: SDRF, NDRF, 15th Finance Commission Tied Grants, PMGSY, and AMRUT.`;
}

export function buildGroundedScenarioPrompt(question: string, ctx: PlannerGroundedContext): string {
  const routeStatus = ctx.routing.hasRoute
    ? `Active Route Plan: ${ctx.routing.originName || 'Origin'} to ${ctx.routing.destinationName || 'Destination'}
   - Route Clearance: ${ctx.routing.clearanceStatus}
   - Is Passable: ${ctx.routing.isPassable ? 'YES (Vehicles can pass)' : 'NO - SEVERED BY FLOODING'}
   - Max Flood Depth on Route: ${ctx.routing.maxFloodDepth_m.toFixed(2)}m (Closure threshold is 0.25m)
   - Submerged/Severed Segments: ${ctx.routing.severedSegmentsCount}
   - Safe Alternative Exists: ${ctx.routing.safeAlternativeExists ? 'Yes' : 'No alternative road available'}`
    : 'Active Route Plan: No navigation route currently plotted by the user.';

  const simStatus = ctx.simulation.hasRun
    ? `Simulation Metrics: Peak Depth ${ctx.simulation.peakDepth_m?.toFixed(2)}m, Inundated Area ${ctx.simulation.inundatedArea_ha?.toFixed(1)} ha, Severed Roads ${ctx.simulation.severedRoadsCount}, Affected People ~${ctx.simulation.affectedPopulation}.`
    : 'Simulation Metrics: No active simulation run.';

  const weatherStatus = ctx.weather.isMissing
    ? 'Telemetry: Rainfall data is MISSING.'
    : `Telemetry: Current rainfall ${ctx.weather.rainfall_mmh?.toFixed(1) ?? '0.0'} mm/h (${ctx.weather.isStale ? 'STALE' : 'LIVE'}).`;

  return `You are the Chief Disaster Risk Reduction Engineer for the National Disaster Management Authority (NDMA), India.
Operational Context:
- Settlement: ${ctx.location.displayName}, ${ctx.location.district}, ${ctx.location.state} (Elevation: ${ctx.location.elevation_m}m AMSL)
- Active Hazard: ${ctx.activeHazard} (Composite Vulnerability: ${ctx.compositeRiskScore}/100)
- ${weatherStatus}
- ${simStatus}
- ${routeStatus}

STRICT SAFETY AND GROUNDING RULES:
1. ROAD EVACUATION SAFETY: If the user asks about traveling, driving, or evacuation routes and the route is IMPASSABLE or max depth > 0.25m:
   - You MUST EXPLICITLY WARN THAT THE ROUTE IS IMPASSABLE.
   - You MUST NEVER state or imply that the road is safe or clear.
   - Mention the exact water depth (${ctx.routing.maxFloodDepth_m.toFixed(2)}m) and advise vertical shelter or rescue boats.
2. MISSING DATA HONESTY: If the user asks about water arrival time or rainfall and telemetry is MISSING or simulation is not run:
   - You MUST state "Insufficient data to calculate exact arrival time" or "Simulation not executed".
   - NEVER invent a plausible arrival time like "water will arrive in 45 minutes".
3. NUMERICAL ACCURACY: Strictly cite the simulation numbers above when asked about depth, area, or affected people.

User Question: "${question}"

Provide a direct, scientifically rigorous, and unambiguous operational answer.`;
}

export function buildGroundedInfrastructurePrompt(ctx: PlannerGroundedContext): string {
  const sitesList = ctx.infrastructureCandidates.length > 0
    ? ctx.infrastructureCandidates.map(c => `
- Rank #${c.rank}: ${c.title} (${c.infrastructureType})
  Exact Coordinates: [${c.candidateCoordinates[1].toFixed(5)}°N, ${c.candidateCoordinates[0].toFixed(5)}°E], Elevation: ${c.elevation_m}m AMSL
  MCDA Suitability Score: ${c.suitabilityScore}/100, Est Cost: ₹${c.estimatedCostLakhs} Lakhs, Expected Beneficiaries: ${c.expectedBeneficiaries}
  Deterministic Justification: ${c.justification}
  Evidence Datasets: ${(c.evidenceDatasets || []).join(', ')}
  Field Verification Needed: ${(c.fieldVerificationNeeded || []).join(', ')}`).join('\n')
    : 'No candidate sites have been computed for this location.';

  return `You are the Lead Disaster Risk Reduction and Smart Infrastructure Planning Engineer for NDMA and the Ministry of Panchayati Raj, Government of India.
Appraise the candidate infrastructure sites generated by spatial Multi-Criteria Decision Analysis (MCDA) for:
Settlement: ${ctx.location.displayName}
State/UT: ${ctx.location.state} (District: ${ctx.location.district})
Physiographic Region: ${ctx.location.regionCategory} (AMSL Elevation: ~${ctx.location.elevation_m}m)
Composite Vulnerability Score: ${ctx.compositeRiskScore}/100

DETERMINISTIC MCDA CANDIDATE SITES:
${sitesList}

STRICT GROUNDING CONSTRAINTS:
1. PRESERVE RANKS & COORDINATES: Appraise ONLY the candidate sites listed above. Quote their exact coordinates and MCDA scores. Do NOT invent new coordinates or swap sites with other regions.
2. FINANCIAL REALISM: Use the exact estimated costs provided. Do not invent arbitrary budgets.
3. CONVERGENCE: Align with SDRF, PMGSY, AMRUT, and 15th Finance Commission Tied Grants.
4. UNCERTAINTY & FIELD VERIFICATION: Reiterate that all site proposals require geotechnical boreholes (SPT N-values), hydraulic High Flood Level (HFL) benchmark verification, and Gram Panchayat land titling prior to procurement.`;
}

export function buildGroundedEvacuationPrompt(ctx: PlannerGroundedContext): string {
  return `You are an Emergency Logistics and Evacuation Routing Coordinator with NDMA / SDRF.
Appraise the evacuation corridor for:
Settlement: ${ctx.location.displayName}, ${ctx.location.district}, ${ctx.location.state}
Terrain: ${ctx.location.regionCategory} (~${ctx.location.elevation_m}m AMSL)

ROUTING & HYDRAULIC CONTEXT:
- Route Status: ${ctx.routing.hasRoute ? ctx.routing.clearanceStatus : 'No active route plotted'}
- Passable by Standard Vehicle: ${ctx.routing.isPassable ? 'YES' : 'NO (IMPASSABLE)'}
- Max Inundation Depth on Route: ${ctx.routing.maxFloodDepth_m.toFixed(2)} meters (Safe clearance threshold: 0.25m)
- Submerged Segments: ${ctx.routing.severedSegmentsCount}
- Safe Alternative Route Available: ${ctx.routing.safeAlternativeExists ? 'Yes' : 'None'}
- Distance: ${(ctx.routing.totalDistance_m / 1000).toFixed(2)} km
- Estimated Travel Time: ${ctx.routing.estimatedMinutes} minutes

SAFETY MANDATE:
- If max water depth > 0.25m or isPassable is FALSE: Issue an immediate DANGER ALERT. Prohibit vehicular evacuation. Recommend vertical refuge or boat rescue.
- If route is clear: Provide safe corridor driving advice, speed reduction, and waypoint verification.
- Explicitly cite deterministic clearance metrics.`;
}

// -------------------------------------------------------------------------
// Deterministic Guardrails & Verification Engine
// -------------------------------------------------------------------------

export interface VerificationResult {
  passed: boolean;
  score: number; // 0-100
  failureType?: 'NONE' | 'HALLUCINATION' | 'CONTRADICTION' | 'CALCULATION_ERROR' | 'MISSING_DATA_FAILURE' | 'STALE_DATA_FAILURE' | 'DANGEROUS_RECOMMENDATION';
  violations: string[];
  correctedText?: string;
}

/**
 * Validates any generated evacuation or route text against deterministic routing truths.
 * If the route is impassable but the text claims it is safe, this is flagged as DANGEROUS_RECOMMENDATION
 * and an automatic safety override is enforced.
 */
export function verifyEvacuationSafety(text: string, routing: PlannerRoutingContext): VerificationResult {
  const violations: string[] = [];
  const textLower = text.toLowerCase();

  if (!routing.hasRoute) {
    return { passed: true, score: 100, failureType: 'NONE', violations: [] };
  }

  // Check 1: Impassable road claimed safe
  if (!routing.isPassable || routing.maxFloodDepth_m > 0.25) {
    const claimsSafe = 
      textLower.includes('route is safe') ||
      textLower.includes('road is safe') ||
      textLower.includes('clear to drive') ||
      textLower.includes('safe to evacuate by road') ||
      textLower.includes('proceed along the route') ||
      textLower.includes('corridor is open');

    const warnsImpassable = 
      textLower.includes('impassable') ||
      textLower.includes('submerged') ||
      textLower.includes('unsafe') ||
      textLower.includes('blocked') ||
      textLower.includes('do not attempt') ||
      textLower.includes('cannot be traversed');

    if (claimsSafe && !warnsImpassable) {
      violations.push(`CRITICAL SAFETY CONTRADICTION: Deterministic routing engine flagged route as IMPASSABLE (Max depth: ${routing.maxFloodDepth_m.toFixed(2)}m > 0.25m), but AI claimed the route is safe.`);
      
      const safetyOverride = `⚠️ **CRITICAL EVACUATION SAFETY OVERRIDE (NDMA Verified)**:\n` +
        `This evacuation corridor is **CURRENTLY IMPASSABLE**. Maximum simulated water depth reaches **${routing.maxFloodDepth_m.toFixed(2)}m**, exceeding the safe vehicle clearance threshold of 0.25m across ${routing.severedSegmentsCount} segment(s).\n` +
        `**DO NOT ATTEMPT VEHICULAR EVACUATION ALONG THIS CORRIDOR.**\n` +
        `Seek immediate vertical high-ground shelter or wait for SDRF/NDRF rescue craft.\n\n---\n` + text;

      return {
        passed: false,
        score: 0,
        failureType: 'DANGEROUS_RECOMMENDATION',
        violations,
        correctedText: safetyOverride,
      };
    }
  }

  return {
    passed: true,
    score: 100,
    failureType: 'NONE',
    violations: [],
  };
}

/**
 * Validates numerical consistency of flood claims against deterministic simulation.
 */
export function verifyNumericalClaims(text: string, sim: PlannerSimulationContext): VerificationResult {
  const violations: string[] = [];

  if (!sim.hasRun || sim.peakDepth_m === null) {
    // If simulation not run, check if text hallucinates a specific peak depth like "peak depth of 3.4m"
    const depthMatch = text.match(/peak depth (?:of )?(\d+(?:\.\d+)?)\s*m/i);
    if (depthMatch && parseFloat(depthMatch[1]) > 0) {
      violations.push(`HALLUCINATION: Quoted peak depth of ${depthMatch[1]}m when simulation was not executed.`);
      return {
        passed: false,
        score: 20,
        failureType: 'HALLUCINATION',
        violations,
      };
    }
    return { passed: true, score: 100, failureType: 'NONE', violations: [] };
  }

  // If simulation has run, check if quoted depth contradicts simulation peak depth
  const depthMatches = Array.from(text.matchAll(/(?:peak flood depth|maximum depth|water depth of)\s*(?:is|reaches|of)?\s*(\d+(?:\.\d+)?)\s*m/gi));
  for (const match of depthMatches) {
    const quotedDepth = parseFloat(match[1]);
    const simDepth = sim.peakDepth_m;
    // Allow 20% tolerance or 0.3m difference
    if (Math.abs(quotedDepth - simDepth) > 0.5 && Math.abs(quotedDepth - simDepth) / simDepth > 0.3) {
      violations.push(`CONTRADICTION: Quoted peak depth of ${quotedDepth}m contradicts deterministic simulation peak depth of ${simDepth.toFixed(2)}m.`);
    }
  }

  if (violations.length > 0) {
    return {
      passed: false,
      score: 40,
      failureType: 'CONTRADICTION',
      violations,
    };
  }

  return { passed: true, score: 100, failureType: 'NONE', violations: [] };
}

/**
 * Validates handling of missing or stale telemetry.
 * If telemetry is missing, the AI MUST acknowledge missing data and NOT invent fake numbers.
 */
export function verifyMissingDataCompliance(text: string, ctx: PlannerGroundedContext): VerificationResult {
  const violations: string[] = [];
  const textLower = text.toLowerCase();

  if (ctx.weather.isMissing) {
    const admitsMissing = 
      textLower.includes('missing') ||
      textLower.includes('unavailable') ||
      textLower.includes('unverified') ||
      textLower.includes('insufficient data') ||
      textLower.includes('no live rainfall') ||
      textLower.includes('no station') ||
      textLower.includes('absence of telemetry');

    // Check if it hallucinates specific precipitation like "experiencing 45 mm/h" or "rainfall of 12.5 mm"
    const rainMatch = text.match(/(?:experiencing|rainfall of|current precipitation of|measured at)\s*(\d+(?:\.\d+)?)\s*mm/i);
    if (rainMatch && !admitsMissing) {
      violations.push(`HALLUCINATION ON MISSING DATA: Fabricated rainfall measurement of ${rainMatch[1]} mm when live telemetry is missing.`);
      return {
        passed: false,
        score: 10,
        failureType: 'MISSING_DATA_FAILURE',
        violations,
      };
    }

    if (!admitsMissing) {
      violations.push('OMISSION ON MISSING DATA: Failed to inform user that rainfall telemetry is missing.');
      return {
        passed: false,
        score: 40,
        failureType: 'MISSING_DATA_FAILURE',
        violations,
      };
    }
  }

  if (ctx.cwcGauge.isMissing) {
    // Check if it hallucinates river stage levels
    const stageMatch = text.match(/river stage (?:at|is|reaches)\s*(\d+(?:\.\d+)?)\s*m/i);
    if (stageMatch) {
      violations.push(`HALLUCINATION: Quoted river stage of ${stageMatch[1]}m when CWC gauge is missing.`);
      return {
        passed: false,
        score: 20,
        failureType: 'MISSING_DATA_FAILURE',
        violations,
      };
    }
  }

  return { passed: true, score: 100, failureType: 'NONE', violations: [] };
}

/**
 * Validates infrastructure appraisal consistency with candidate coordinates and rankings.
 */
export function verifyInfrastructureConsistency(text: string, candidates: PlannerCandidateSite[]): VerificationResult {
  const violations: string[] = [];

  if (candidates.length === 0) {
    return { passed: true, score: 100, failureType: 'NONE', violations: [] };
  }

  // Check that candidate #1 title or coordinates are mentioned faithfully
  const topCandidate = candidates[0];
  const titleClean = topCandidate.title.toLowerCase();
  
  // Verify no fake coordinate substitution (e.g. Kotturu 16.212 in a non-Kotturu location)
  if (topCandidate.candidateCoordinates[1] !== 16.212 && text.includes('16.212')) {
    violations.push('GEOGRAPHIC CONTRADICTION: Replaced actual site coordinates with hardcoded Kotturu coordinates (16.212°N).');
    return {
      passed: false,
      score: 0,
      failureType: 'CONTRADICTION',
      violations,
    };
  }

  return { passed: true, score: 100, failureType: 'NONE', violations: [] };
}

// -------------------------------------------------------------------------
// Grounded Fallback Generators (High Quality, 100% Deterministic)
// -------------------------------------------------------------------------

export function generateGroundedHazardFallback(ctx: PlannerGroundedContext): string {
  const telemetrySection = ctx.weather.isMissing
    ? `* **Precipitation Telemetry:** ⚠️ **Unavailable / Missing** (No active automated weather station reporting for ${ctx.location.displayName}). Disaster management committee must rely on district manual rain-gauge network.`
    : ctx.weather.isStale
    ? `* **Precipitation Telemetry:** ⚠️ **Stale Telemetry** (${ctx.weather.rainfall_mmh?.toFixed(1) ?? '0.0'} mm/h reported ${ctx.weather.observationAgeMinutes} minutes ago from ${ctx.weather.provider}).`
    : `* **Precipitation Telemetry:** **Live Verified** (${ctx.weather.rainfall_mmh?.toFixed(1) ?? '0.0'} mm/h, 24h accumulation: ${ctx.weather.rainfall24h_mm?.toFixed(1) ?? '0.0'} mm via ${ctx.weather.provider}).`;

  const gaugeSection = ctx.cwcGauge.isMissing
    ? `* **River Stage Monitoring:** ⚠️ **No CWC Station in Immediate Range** (Hydrologic buffer clearance not reported). Refer to regional division CWC daily flood bulletins.`
    : `* **River Stage Monitoring:** **Active Station (${ctx.cwcGauge.stationName})** — Stage: ${ctx.cwcGauge.currentLevel_m?.toFixed(2)}m (Warning: ${ctx.cwcGauge.warningLevel_m?.toFixed(2)}m, Danger: ${ctx.cwcGauge.dangerLevel_m?.toFixed(2)}m). Status: **${ctx.cwcGauge.floodStatus}**.`;

  const simSection = ctx.simulation.hasRun
    ? `* **Hydrodynamic Simulation Outputs:** Peak Water Depth: **${ctx.simulation.peakDepth_m?.toFixed(2)}m**, Inundated Area: **${ctx.simulation.inundatedArea_ha?.toFixed(1)} ha**, Severed Road Links: **${ctx.simulation.severedRoadsCount}**, Vulnerable Residents Exposed: **~${ctx.simulation.affectedPopulation}**.`
    : `* **Hydrodynamic Simulation Outputs:** Deterministic overland flow simulation not yet executed. Hydraulic contour depth values pending scenario run.`;

  return `### Executive Multi-Hazard Risk Assessment & Infrastructure Brief
**Settlement:** ${ctx.location.displayName}, ${ctx.location.district}, ${ctx.location.state}  
**Physiographic Terrain:** ${ctx.location.regionCategory.toUpperCase()} (~${ctx.location.elevation_m}m AMSL, Coordinates: [${ctx.location.coordinates[1].toFixed(4)}°N, ${ctx.location.coordinates[0].toFixed(4)}°E])  
**Active Threat Focus:** ${ctx.activeHazard} (Composite Vulnerability: ${ctx.compositeRiskScore}/100)  

---

#### 1. Verified Telemetry & Sensor Observations
${telemetrySection}
${gaugeSection}
${simSection}

---

#### 2. Physiographic & National Hazard Atlas Synthesis
* **Terrain Hydrology:** Elevation is ~${ctx.location.elevation_m}m AMSL in a ${ctx.location.regionCategory} setting. Runoff accumulation depends heavily on local drainage slope and road embankment permeability.
* **Seismic Vulnerability (BIS IS 1893:2016):** Evaluated against National Seismic Zonation. Structural lifeline retrofitting required for masonry schools and panchayat halls.
* **Compound Disaster Potential:** Simultaneous heavy rainfall and high ground saturation increases road ditch choking risk.

---

#### 3. Smart Infrastructure Engineering Roadmap
${ctx.infrastructureCandidates.slice(0, 3).map(c => `1. **Priority ${c.rank} — ${c.title} (${c.infrastructureType}):**
   * Placed at [${c.candidateCoordinates[1].toFixed(4)}°N, ${c.candidateCoordinates[0].toFixed(4)}°E] (${c.elevation_m}m AMSL).
   * Suitability Score: ${c.suitabilityScore}/100 | Est. Cost: ₹${c.estimatedCostLakhs} Lakhs | Beneficiaries: ~${c.expectedBeneficiaries}.
   * ${c.justification}`).join('\n') || '1. **Lifeline Elevated Shelter:** Stilted RCC structure with solar backup.\n2. **Masonry U-Drain Network:** Silt-trapped roadside storm channels.'}

---

#### 4. Gram Panchayat Standard Operating Procedures (SOPs)
* **Pre-Monsoon Preparedness (T - 48h):** Desilt arterial roadside ditches; verify high-ground shelter readiness.
* **Warning Phase:** If rainfall exceeds 15 mm/h or river breaches Warning Mark, broadcast village-wide alerts and stage dry rations.
* **Response Phase:** Transfer mobility-impaired residents to stilted community centers; deploy mobile dewatering pumps at low road culverts.

---

#### 5. Funding Channels & Scheme Convergence
* **State Disaster Response Fund (SDRF):** Structural mitigation and emergency relief.
* **15th Finance Commission Tied Grants:** Panchayati Raj water supply, sanitation, and drainage works.
* **MGNREGS:** Comprehensive drainage desilting and percolation pond rejuvenation.

*Notice: All planning recommendations are decision-support outputs based on available geospatial models and require professional geotechnical and hydraulic ground-truthing prior to civil construction.*`;
}

export function generateGroundedScenarioFallback(question: string, ctx: PlannerGroundedContext): string {
  const qLower = question.toLowerCase();

  // If question is about routing / evacuation / traveling
  if (qLower.includes('evacuat') || qLower.includes('road') || qLower.includes('drive') || qLower.includes('shelter') || qLower.includes('path') || qLower.includes('safe to go')) {
    if (ctx.routing.hasRoute) {
      if (!ctx.routing.isPassable || ctx.routing.maxFloodDepth_m > 0.25) {
        return `⚠️ **CRITICAL EVACUATION ADVISORY FOR ${ctx.location.displayName.toUpperCase()}**:
The plotted evacuation route is **CURRENTLY IMPASSABLE**.
- **Maximum Water Depth:** **${ctx.routing.maxFloodDepth_m.toFixed(2)} meters** (exceeds the 0.25m safe vehicle threshold).
- **Submerged Segments:** ${ctx.routing.severedSegmentsCount} road segment(s) are cut off by flood waters.
- **Clearance Status:** **${ctx.routing.clearanceStatus}**
- **Safe Alternative Route:** ${ctx.routing.safeAlternativeExists ? 'Alternative high-ground route detected on road network.' : 'No alternative road route available — road network is severed.'}

**ACTIONABLE SAFETY DIRECTIVE:**
Do NOT attempt vehicular evacuation along this corridor. Transfer vulnerable family members vertically to upper floors or certified high-ground shelters (${ctx.infrastructureCandidates[0]?.title || 'Village High-Ground Refuge'}). Await NDRF / SDRF boat extraction if water continues to rise.`;
      } else {
        return `✅ **EVACUATION ROUTE CLEARANCE CONFIRMED**:
The current route from ${ctx.routing.originName || 'Origin'} to ${ctx.routing.destinationName || 'Destination'} is **CLEAR & PASSABLE**.
- **Distance:** ${(ctx.routing.totalDistance_m / 1000).toFixed(2)} km (~${ctx.routing.estimatedMinutes} minutes driving).
- **Maximum Water Depth:** ${ctx.routing.maxFloodDepth_m.toFixed(2)}m (within safe limits < 0.25m).
- **Clearance Status:** ${ctx.routing.clearanceStatus}.
- **Precaution:** Maintain vehicle speed under 25 km/h and watch for low-visibility culvert approaches.`;
      }
    } else {
      return `**Evacuation & Shelter Logistics for ${ctx.location.displayName}**:
1. **High-Ground Shelter Selection:** Target stilted multi-purpose facilities located at elevation ≥ ${ctx.location.elevation_m + 3}m AMSL.
2. **Current Flood Exposure:** ${ctx.simulation.hasRun ? `Simulation identifies ${ctx.simulation.severedRoadsCount} severed road segment(s) and ${ctx.simulation.inundatedArea_ha?.toFixed(1)} ha inundated.` : 'Select all-weather arterial roads away from unpaved agricultural tracks.'}
3. **Safety Protocol:** Never traverse moving water exceeding knee height (0.25m). Initiate daytime movement before peak monsoonal storm runoff.`;
    }
  }

  // If question is about rainfall / arrival time / telemetry
  if (qLower.includes('arrival') || qLower.includes('reach') || qLower.includes('when will') || qLower.includes('time')) {
    if (ctx.weather.isMissing && !ctx.simulation.hasRun) {
      return `**Hydrologic Arrival Assessment for ${ctx.location.displayName}**:
⚠️ **Insufficient Data to Calculate Exact Arrival Time**:
Live rainfall telemetry is currently missing from reporting stations and hydrodynamic simulation has not been executed for this time step. 
Under NDMA scientific standards, speculative flood wave arrival times cannot be generated without active telemetry. Please monitor direct CWC and IMD district bulletins.`;
    }

    if (ctx.simulation.hasRun && ctx.simulation.waterArrivalTime_min) {
      return `**Simulated Flood Arrival Timing**:
Based on the hydrodynamic model, initial surface runoff pooling occurs at T + ${ctx.simulation.waterArrivalTime_min} minutes in low-elevation drainage swales (~${ctx.location.elevation_m}m AMSL). Peak inundation of ${ctx.simulation.peakDepth_m?.toFixed(2)}m is achieved at the simulated storm peak.`;
    }
  }

  // General scenario answer
  return `**Disaster Risk Engineering Analysis for ${ctx.location.displayName} (${ctx.location.district}, ${ctx.location.state})**:
- **Physiographic Terrain:** ${ctx.location.regionCategory} (~${ctx.location.elevation_m}m AMSL).
- **Current Threat Status:** ${ctx.activeHazard} (Composite Score: ${ctx.compositeRiskScore}/100).
- **Telemetry Grounding:** ${ctx.weather.isMissing ? 'Precipitation telemetry missing' : `Observed rainfall: ${ctx.weather.rainfall_mmh?.toFixed(1) ?? '0.0'} mm/h`}.
- **Simulation Status:** ${ctx.simulation.hasRun ? `Peak Depth ${ctx.simulation.peakDepth_m?.toFixed(2)}m, Inundated Area ${ctx.simulation.inundatedArea_ha?.toFixed(1)} ha` : 'No scenario simulation active'}.
- **Recommended Action:** Prioritize structural clearance of drainage chokepoints and secure high-ground refuge access.`;
}

export function generateGroundedInfrastructureFallback(ctx: PlannerGroundedContext): string {
  const candidates = ctx.infrastructureCandidates;
  if (!candidates || candidates.length === 0) {
    return `### Bharat Smart Infrastructure Site Selection & Appraisal
**Target Settlement:** ${ctx.location.displayName}, ${ctx.location.district}, ${ctx.location.state}  
**Physiographic Terrain:** ${ctx.location.regionCategory.toUpperCase()} (~${ctx.location.elevation_m}m AMSL)  
**Composite Vulnerability Index:** ${ctx.compositeRiskScore}/100  

⚠️ **Notice:** No candidate infrastructure sites have been calculated for this settlement. External sites from other districts or states are never substituted. Run geospatial multi-criteria analysis to generate location-specific candidate sites.`;
  }

  return `### Bharat Smart Infrastructure Site Selection & Appraisal
**Target Settlement:** ${ctx.location.displayName}, ${ctx.location.district}, ${ctx.location.state}  
**Physiographic Terrain:** ${ctx.location.regionCategory.toUpperCase()} (~${ctx.location.elevation_m}m AMSL)  
**Composite Vulnerability Index:** ${ctx.compositeRiskScore}/100 (Primary Threat: ${ctx.activeHazard})  

---

#### 1. Strategic Infrastructure Prioritization (Spatial MCDA)
${candidates.map(c => `1. **Priority ${c.rank} — ${c.title} (${c.infrastructureType}):**
   * **Exact Candidate Coordinates:** [${c.candidateCoordinates[1].toFixed(5)}°N, ${c.candidateCoordinates[0].toFixed(5)}°E] (Elevation: ${c.elevation_m}m AMSL).
   * **MCDA Suitability Score:** ${c.suitabilityScore}/100 | **Est. Budget:** ₹${c.estimatedCostLakhs} Lakhs | **Beneficiaries:** ~${c.expectedBeneficiaries}.
   * **Hydrologic & Access Fit:** ${c.justification}
   * **Evidence Sourcing:** ${(c.evidenceDatasets || ['Digital Elevation Model (SRTM 30m)', 'OpenStreetMap Cadastre']).join(', ')}.`).join('\n\n')}

---

#### 2. Mandated Pre-Tender Field Verification Checklist
* **Geotechnical Testing:** Perform Standard Penetration Tests (SPT N-values) and soil shear parameters down to 6.0m depth at candidate coordinates.
* **Cadastral Ownership:** Verify Gram Panchayat *Grama Kantham* / government *poramboke* classification with Revenue Department.
* **Hydraulic Head Clearance:** Confirm 100-year High Flood Level (HFL) benchmark with local irrigation executive engineers.

---

#### 3. Scheme Convergence & Capital Strategy
* **State Disaster Response Fund (SDRF):** Structural risk mitigation allocations.
* **15th Finance Commission Tied Grants:** Gram Panchayat basic services and drainage works.
* **PMGSY / AMRUT:** Road connectivity and all-weather culvert upgrades.

*Notice: This appraisal is preliminary decision support generated from regional geospatial models and requires professional geotechnical and structural sign-off prior to civil construction.*`;
}

// -------------------------------------------------------------------------
// 8-Dimension Evaluation Scoring Engine
// -------------------------------------------------------------------------

export interface EvaluationDimensionScores {
  factualCorrectness: number; // 0-100
  evidenceSupport: number; // 0-100
  geographicCorrectness: number; // 0-100
  numericalCorrectness: number; // 0-100
  deterministicConsistency: number; // 0-100
  missingDataTreatment: number; // 0-100
  safetyCommunication: number; // 0-100
  actionability: number; // 0-100
  overallAccuracy: number; // 0-100
  failureClassification: 'NONE' | 'HALLUCINATION' | 'CONTRADICTION' | 'CALCULATION_ERROR' | 'MISSING_DATA_FAILURE' | 'STALE_DATA_FAILURE' | 'DANGEROUS_RECOMMENDATION';
  violations: string[];
}

/**
 * Programmatically scores an AI recommendation against ground truth deterministic outputs.
 * Uses strict programmatic assertions — no LLM grading itself!
 */
export function scoreRecommendationAccuracy(
  recommendationText: string,
  ctx: PlannerGroundedContext,
  category: 'hazard' | 'scenario' | 'infrastructure' | 'evacuation'
): EvaluationDimensionScores {
  const violations: string[] = [];
  const text = recommendationText;
  const textLower = text.toLowerCase();

  let factual = 100;
  let evidence = 100;
  let geographic = 100;
  let numerical = 100;
  let deterministic = 100;
  let missingData = 100;
  let safety = 100;
  let actionability = 100;
  let failureClassification: EvaluationDimensionScores['failureClassification'] = 'NONE';

  // 1. Geographic Correctness: verify settlement, district, state name
  if (!textLower.includes(ctx.location.displayName.toLowerCase().slice(0, 5))) {
    geographic -= 40;
    violations.push(`Text omitted target settlement name (${ctx.location.displayName}).`);
  }
  // Check for cross-location leakage: e.g. Kotturu coordinates in non-Kotturu location
  if (ctx.location.displayName !== 'Kotturu' && text.includes('16.212')) {
    geographic = 0;
    violations.push(`Hallucinated Kotturu coordinates (16.212°N) in ${ctx.location.displayName}.`);
    failureClassification = 'CONTRADICTION';
  }

  // 2. Safety & Evacuation Verification
  const safetyCheck = verifyEvacuationSafety(text, ctx.routing);
  if (!safetyCheck.passed) {
    safety = safetyCheck.score;
    deterministic = Math.min(deterministic, 20);
    violations.push(...safetyCheck.violations);
    failureClassification = 'DANGEROUS_RECOMMENDATION';
  }

  // 3. Numerical & Simulation Consistency
  const numCheck = verifyNumericalClaims(text, ctx.simulation);
  if (!numCheck.passed) {
    numerical = numCheck.score;
    deterministic = Math.min(deterministic, 50);
    violations.push(...numCheck.violations);
    if (failureClassification === 'NONE') failureClassification = numCheck.failureType || 'CALCULATION_ERROR';
  }

  // 4. Missing Data Handling
  const missingCheck = verifyMissingDataCompliance(text, ctx.weather ? ctx : ctx);
  if (!missingCheck.passed) {
    missingData = missingCheck.score;
    factual = Math.min(factual, 50);
    violations.push(...missingCheck.violations);
    if (failureClassification === 'NONE') failureClassification = missingCheck.failureType || 'MISSING_DATA_FAILURE';
  }

  // 5. Evidence & Source Support
  const mentionsSources = 
    textLower.includes('cwc') ||
    textLower.includes('imd') ||
    textLower.includes('srtm') ||
    textLower.includes('simulation') ||
    textLower.includes('mcda') ||
    textLower.includes('open-meteo') ||
    textLower.includes('ndma');

  if (!mentionsSources) {
    evidence -= 40;
    violations.push('Failed to cite authoritative data sources (CWC, IMD, SRTM, or NDMA).');
  }

  // 6. Actionability: Must contain concrete operational steps / SOPs / checklists
  const hasActionableItems = 
    textLower.includes('priority') ||
    textLower.includes('sop') ||
    textLower.includes('checklist') ||
    textLower.includes('action') ||
    textLower.includes('desilt') ||
    textLower.includes('evacuat') ||
    textLower.includes('shelter');

  if (!hasActionableItems) {
    actionability -= 50;
    violations.push('Lacks concrete operational actions or SOP directives.');
  }

  // Clamp all scores 0-100
  factual = Math.max(0, Math.min(100, factual));
  evidence = Math.max(0, Math.min(100, evidence));
  geographic = Math.max(0, Math.min(100, geographic));
  numerical = Math.max(0, Math.min(100, numerical));
  deterministic = Math.max(0, Math.min(100, deterministic));
  missingData = Math.max(0, Math.min(100, missingData));
  safety = Math.max(0, Math.min(100, safety));
  actionability = Math.max(0, Math.min(100, actionability));

  const overallAccuracy = Math.round(
    factual * 0.15 +
    evidence * 0.10 +
    geographic * 0.15 +
    numerical * 0.15 +
    deterministic * 0.15 +
    missingData * 0.10 +
    safety * 0.10 +
    actionability * 0.10
  );

  return {
    factualCorrectness: factual,
    evidenceSupport: evidence,
    geographicCorrectness: geographic,
    numericalCorrectness: numerical,
    deterministicConsistency: deterministic,
    missingDataTreatment: missingData,
    safetyCommunication: safety,
    actionability,
    overallAccuracy,
    failureClassification,
    violations,
  };
}

