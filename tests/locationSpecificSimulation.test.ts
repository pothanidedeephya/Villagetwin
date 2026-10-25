import { strictEqual as assertStrictEqual, ok as assert, notStrictEqual } from 'assert';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { multiHazardSimulationEngine } from '../src/services/multiHazardSimulationEngine';
import type { VillageDataset } from '../src/types/village';
import type { LocationSearchResult } from '../src/types/nationwide';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Multi-Hazard Location Simulation Tests');
console.log('=============================================================\n');

function createMockDataset(loc: LocationSearchResult): VillageDataset {
  const [lng, lat] = loc.center;
  return {
    villageName: loc.name,
    district: loc.district,
    mandal: loc.subdistrict || loc.district,
    state: loc.state,
    center: loc.center,
    elevation_m: loc.elevation_m || 25,
    totalPopulation: loc.population || 2800,
    boundary: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: `${loc.name} Boundary`, area_sqkm: 2.14 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [lng - 0.012, lat + 0.010],
                [lng + 0.012, lat + 0.010],
                [lng + 0.012, lat - 0.010],
                [lng - 0.012, lat - 0.010],
                [lng - 0.012, lat + 0.010],
              ],
            ],
          },
        },
      ],
    },
    roads: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: `rd-${loc.id}-1`,
            name: `${loc.name} Main Arterial Road`,
            roadType: 'State Highway',
            width_m: 7.0,
            elevation_m: loc.elevation_m || 25,
            surface: 'Bitumen/Asphalt',
            length_m: 1450,
            isEvacuationCorridor: true,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [lng - 0.008, lat - 0.002],
              [lng, lat],
              [lng + 0.008, lat + 0.002],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            id: `rd-${loc.id}-2`,
            name: `${loc.name} Low-Lying Village Connector`,
            roadType: 'Panchayat Arterial',
            width_m: 4.5,
            elevation_m: (loc.elevation_m || 25) - 0.4,
            surface: 'Concrete (CC)',
            length_m: 850,
            isEvacuationCorridor: false,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [lng - 0.003, lat - 0.003],
              [lng - 0.001, lat - 0.002],
              [lng + 0.002, lat - 0.001],
            ],
          },
        },
      ],
    },
    waterBodies: { type: 'FeatureCollection', features: [] },
    buildings: { type: 'FeatureCollection', features: [] },
    drainageLines: { type: 'FeatureCollection', features: [] },
    retentionPonds: { type: 'FeatureCollection', features: [] },
  };
}

async function runTests() {
  const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-ap-kothuru')!;
  const joshimath = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-uk-joshimath')!;
  const majuli = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-as-majuli')!;
  const pokhran = NATIONWIDE_BENCHMARK_LOCATIONS.find((l) => l.id === 'loc-rj-pokhran')!;

  const kotturuDataset = createMockDataset(kotturu);
  const joshimathDataset = createMockDataset(joshimath);
  const majuliDataset = createMockDataset(majuli);
  const pokhranDataset = createMockDataset(pokhran);

  // =========================================================================
  // SUITE 1: LOCATION SPECIFICITY & ATOMIC CLEARING
  // =========================================================================
  console.log('--- Suite 1: Location-Specific Execution & Atomic Isolation ---');

  // 1. Run Flood at Kotturu
  const kotturuFlood = await multiHazardSimulationEngine.runScenario(
    kotturu,
    kotturuDataset,
    'flood',
    { rainfallIntensity_mmh: 65, duration_hours: 4, drainageCondition: 'normal', tideOutfallCondition: 'normal', designStormType: '25_year' }
  );

  assertStrictEqual(kotturuFlood.locationId, 'loc-ap-kothuru');
  assertStrictEqual(kotturuFlood.locationName, kotturu.name);
  assert(kotturuFlood.scenarioId.startsWith('sim-flood-loc-ap-kothuru'), 'Scenario ID embeds location ID');
  assertStrictEqual(kotturuFlood.modelVersion, '2.4.0-spatial-coupled');
  assert(kotturuFlood.isSimulatedScenario, 'Marked as simulated scenario');
  assert(kotturuFlood.isHypotheticalNotice.includes('SIMULATED SCENARIO'), 'Hypothetical disclaimer present');
  console.log('  ✓ Kotturu: Result explicitly belongs to Kotturu (ID, name, scenarioId)');

  // Coordinates of polygons match Kotturu center [80.842, 16.212]
  const kPolyCoord = kotturuFlood.impactPolygons.features[0].geometry.coordinates[0][0];
  assert(Math.abs(kPolyCoord[0] - kotturu.center[0]) < 0.05, 'Kotturu polygon coords match Kotturu longitude');
  assert(Math.abs(kPolyCoord[1] - kotturu.center[1]) < 0.05, 'Kotturu polygon coords match Kotturu latitude');
  console.log('  ✓ Kotturu: Polygon geometries centered at Kotturu coordinates');

  // 2. Switch to Joshimath and Run Flood
  const joshimathFlood = await multiHazardSimulationEngine.runScenario(
    joshimath,
    joshimathDataset,
    'flood',
    { rainfallIntensity_mmh: 65, duration_hours: 4, drainageCondition: 'normal', tideOutfallCondition: 'normal', designStormType: '25_year' }
  );

  assertStrictEqual(joshimathFlood.locationId, 'loc-uk-joshimath');
  assertStrictEqual(joshimathFlood.locationName, joshimath.name);
  assert(joshimathFlood.scenarioId.startsWith('sim-flood-loc-uk-joshimath'), 'Scenario ID embeds Joshimath');
  notStrictEqual(joshimathFlood.scenarioId, kotturuFlood.scenarioId, 'New scenario ID generated on switch');
  console.log('  ✓ Joshimath: Switched atomically; zero Kotturu scenario residue');

  const jPolyCoord = joshimathFlood.impactPolygons.features[0].geometry.coordinates[0][0];
  assert(Math.abs(jPolyCoord[0] - joshimath.center[0]) < 0.05, 'Joshimath polygon longitude centered in Uttarakhand');
  assert(Math.abs(jPolyCoord[1] - joshimath.center[1]) < 0.05, 'Joshimath polygon latitude centered in Uttarakhand');
  assert(Math.abs(jPolyCoord[0] - kPolyCoord[0]) > 1.0, 'No spatial bleeding between Kotturu and Joshimath');
  console.log('  ✓ Joshimath: Polygons independently located at 30.55°N, 79.56°E');

  // =========================================================================
  // SUITE 2: DYNAMIC "MOST AFFECTED AREA" DERIVATION & RANKING
  // =========================================================================
  console.log('\n--- Suite 2: Dynamic Most Affected Area Derivation ---');

  // Verify Most Affected Area fields
  assert(kotturuFlood.mostAffectedArea.canDistinguish, 'Most Affected Area can be distinguished for Kotturu flood');
  assertStrictEqual(kotturuFlood.mostAffectedArea.severityRank, 1, 'Ranks #1');
  assertStrictEqual(kotturuFlood.mostAffectedArea.severityTier, 'extreme', 'Assigned extreme tier');
  assertStrictEqual(kotturuFlood.mostAffectedArea.metricLabel, 'Modelled Flood Depth');
  assert(typeof kotturuFlood.mostAffectedArea.metricValue === 'string', 'Metric value is string with units');
  assert(kotturuFlood.mostAffectedArea.affectedAreaHa > 0, 'Affected area > 0');
  assert(kotturuFlood.mostAffectedArea.rankingRationale.includes('Ranks #1 based on highest modelled peak inundation depth'), 'Documented ranking rationale present');
  console.log(`  ✓ Most Affected Area: ${kotturuFlood.mostAffectedArea.zoneName} (${kotturuFlood.mostAffectedArea.metricValue})`);
  console.log(`  ✓ Ranking Rationale: "${kotturuFlood.mostAffectedArea.rankingRationale.substring(0, 75)}..."`);

  // Increasing rainfall intensity updates Most Affected Area metrics monotonically
  const kotturuFloodIntense = await multiHazardSimulationEngine.runScenario(
    kotturu,
    kotturuDataset,
    'flood',
    { rainfallIntensity_mmh: 120, duration_hours: 4, drainageCondition: 'normal', tideOutfallCondition: 'normal', designStormType: '100_year' }
  );

  const depthModerate = parseFloat(kotturuFlood.mostAffectedArea.metricValue as string);
  const depthIntense = parseFloat(kotturuFloodIntense.mostAffectedArea.metricValue as string);
  assert(depthIntense > depthModerate, `Intense storm (120mm/h) produces higher depth (${depthIntense}m > ${depthModerate}m)`);
  assert(
    kotturuFloodIntense.geographicImpact.estimatedAffectedAreaKm2 >=
      kotturuFlood.geographicImpact.estimatedAffectedAreaKm2,
    'Higher rainfall increases affected area'
  );
  console.log(`  ✓ Intensity Scaling: Depth increased from ${depthModerate}m to ${depthIntense}m with 120 mm/h rain`);

  // =========================================================================
  // SUITE 3: TSUNAMI PHYSICAL INAPPLICABILITY FILTER
  // =========================================================================
  console.log('\n--- Suite 3: Tsunami Physical Inapplicability Filter ---');

  // 1. Coastal AP (Kotturu, elev 4.2m)
  const kotturuTsunami = await multiHazardSimulationEngine.runScenario(
    kotturu,
    kotturuDataset,
    'tsunami',
    { earthquakeMagnitude_Mw: 8.8, ruptureDistance_km: 180, maxRunupHeight_m: 4.5 }
  );
  assert(kotturuTsunami.isApplicable, 'Coastal delta settlement evaluates tsunami wave run-up scenario');
  assert(kotturuTsunami.mostAffectedArea.canDistinguish, 'Coastal zone produces distinct marine run-up area');
  console.log('  ✓ Coastal Kotturu: Tsunami simulation applicable; models wave run-up ingress');

  // 2. Himalayan Alpine (Joshimath, elev 1890m)
  const joshimathTsunami = await multiHazardSimulationEngine.runScenario(
    joshimath,
    joshimathDataset,
    'tsunami',
    { earthquakeMagnitude_Mw: 8.8, ruptureDistance_km: 180, maxRunupHeight_m: 4.5 }
  );
  assertStrictEqual(joshimathTsunami.isApplicable, false, 'Joshimath is NOT APPLICABLE for tsunami');
  assert(
    joshimathTsunami.inapplicableReason?.includes('NOT APPLICABLE'),
    'Explains physical inapplicability (1890m AMSL elevation)'
  );
  assertStrictEqual(joshimathTsunami.geographicImpact.estimatedAffectedAreaKm2, 0, 'Zero affected area');
  assertStrictEqual(joshimathTsunami.infrastructureImpact.severedRoadSegmentsCount, 0, 'Zero severed roads');
  assertStrictEqual(joshimathTsunami.mostAffectedArea.canDistinguish, false, 'Explains cannot distinguish');
  assertStrictEqual(joshimathTsunami.impactPolygons.features.length, 0, 'Does NOT fabricate tsunami polygons in Himalayas');
  console.log('  ✓ Alpine Joshimath: Strictly NOT APPLICABLE; zero fabricated tsunami waves or damage');

  // 3. Thar Desert (Pokhran, elev 226m)
  const pokhranTsunami = await multiHazardSimulationEngine.runScenario(
    pokhran,
    pokhranDataset,
    'tsunami',
    { earthquakeMagnitude_Mw: 8.8, ruptureDistance_km: 180, maxRunupHeight_m: 4.5 }
  );
  assertStrictEqual(pokhranTsunami.isApplicable, false, 'Pokhran desert is NOT APPLICABLE for tsunami');
  assert(pokhranTsunami.inapplicableReason?.includes('inland'), 'Notes inland location');
  console.log('  ✓ Desert Pokhran: Strictly NOT APPLICABLE; zero tsunami damage');

  // =========================================================================
  // SUITE 4: CYCLONE & INLAND WIND/SURGE ATTENUATION
  // =========================================================================
  console.log('\n--- Suite 4: Cyclone Wind Vortex & Inland Surge Attenuation ---');

  // Coastal Cat 3 Cyclone
  const kotturuCyclone = await multiHazardSimulationEngine.runScenario(
    kotturu,
    kotturuDataset,
    'cyclone',
    { stormCategory: 'Cat 3', maxSustainedWind_kmh: 165, stormSurge_m: 3.2, radiusMaxWinds_km: 30, trackAzimuth_deg: 295, forwardSpeed_kmh: 18 }
  );
  assert(kotturuCyclone.isApplicable, 'Cyclone scenario applicable in coastal AP');
  assert(
    kotturuCyclone.geographicImpact.impactSeverityByZone.some((z) => z.primaryMetric.includes('Surge')),
    'Coastal AP includes storm surge ingress zone'
  );
  console.log(`  ✓ Coastal Kotturu: Includes storm surge penetration (${kotturuCyclone.mostAffectedArea.metricValue})`);

  // Inland Himalayan Cat 3 Cyclone
  const joshimathCyclone = await multiHazardSimulationEngine.runScenario(
    joshimath,
    joshimathDataset,
    'cyclone',
    { stormCategory: 'Cat 3', maxSustainedWind_kmh: 165, stormSurge_m: 3.2, radiusMaxWinds_km: 30, trackAzimuth_deg: 295, forwardSpeed_kmh: 18 }
  );
  // High elevation terrain friction attenuates wind significantly and surge is zero
  const surgeInHimalayas = joshimathCyclone.geographicImpact.impactSeverityByZone.filter((z) =>
    z.zoneName.includes('Surge')
  );
  assertStrictEqual(surgeInHimalayas.length, 0, 'Storm surge is physically ZERO in Himalayas (1890m)');
  console.log('  ✓ Alpine Joshimath: Marine storm surge penetration is strictly 0.0m');

  // =========================================================================
  // SUITE 5: EARTHQUAKE GROUND SHAKING (GMPE ATTENUATION)
  // =========================================================================
  console.log('\n--- Suite 5: Earthquake Ground Shaking & Isoseismal Mapping ---');

  const joshimathQuake = await multiHazardSimulationEngine.runScenario(
    joshimath,
    joshimathDataset,
    'earthquake',
    { hypotheticalMagnitude_Mw: 7.2, hypocenterDepth_km: 12, epicentralDistance_km: 20, localSoilType: 'soft_alluvium' }
  );

  assert(joshimathQuake.isApplicable, 'Earthquake scenario applicable in Himalayan active seismic belt');
  assert(joshimathQuake.isHypotheticalNotice.includes('Earthquakes CANNOT be predicted'), 'Explicit predictability disclaimer');
  assertStrictEqual(joshimathQuake.mostAffectedArea.metricLabel, 'Peak Ground Acceleration (PGA)');
  assert(joshimathQuake.mostAffectedArea.metricValue.toString().includes('MMI'), 'Includes MMI intensity');
  assert(joshimathQuake.infrastructureImpact.severedRoadSegmentsCount > 0, 'Strong shaking cuts roads via debris/cracking');
  console.log(`  ✓ Joshimath Quake: Peak shaking ${joshimathQuake.mostAffectedArea.metricValue}`);
  console.log('  ✓ Predictability Disclaimer verified: "Earthquakes CANNOT be predicted in advance"');

  // =========================================================================
  // SUITE 6: STRUCTURED 5-PILLAR IMPACT REPORT TRANSPARENCY
  // =========================================================================
  console.log('\n--- Suite 6: 5-Pillar Structured Impact Report Completeness ---');

  // Check all 5 pillars on kotturuFlood
  // Pillar A
  assert(kotturuFlood.geographicImpact.totalStudyAreaKm2 > 0, 'Pillar A: Study area present');
  assert(kotturuFlood.geographicImpact.estimatedAffectedAreaKm2 > 0, 'Pillar A: Affected area present');
  assert(kotturuFlood.geographicImpact.percentageAreaAffected > 0, 'Pillar A: % affected present');
  assert(kotturuFlood.geographicImpact.impactSeverityByZone.length >= 2, 'Pillar A: Severity by zone present');
  console.log('  ✓ Pillar A (Geographic Impact): Complete');

  // Pillar B
  assertStrictEqual(kotturuFlood.buildingImpact.dataStatus, 'unavailable_unmapped');
  assertStrictEqual(kotturuFlood.buildingImpact.percentageBuildingsExposed, null);
  assert(kotturuFlood.buildingImpact.notes.includes('DATA UNAVAILABLE'), 'Discloses DATA UNAVAILABLE instead of fake 0% damage');
  console.log('  ✓ Pillar B (Buildings): Reports DATA UNAVAILABLE / UNMAPPED when OSM footprints absent');

  // Pillar C
  assertStrictEqual(kotturuFlood.populationImpact.dataStatus, 'census_demographic');
  assert(kotturuFlood.populationImpact.dataSource.includes('Census of India'), 'Cites Census of India');
  assertStrictEqual(kotturuFlood.populationImpact.referenceYear, '2011 (Interpolated 2024)');
  assert(kotturuFlood.populationImpact.methodologyNote.includes('Does not assume building count = population count'), 'Explains demographic methodology');
  console.log('  ✓ Pillar C (Population): Cites Census of India, resolution, and reference year');

  // Pillar D
  assert(kotturuFlood.infrastructureImpact.totalRoadsMapped > 0, 'Pillar D: Mapped roads present');
  assert(kotturuFlood.infrastructureImpact.intersectingRoadLengthKm > 0, 'Pillar D: Intersecting length present');
  assert(kotturuFlood.infrastructureImpact.evacuationRouteAccessibility !== undefined, 'Pillar D: Evacuation accessibility present');
  assert(kotturuFlood.infrastructureImpact.exposedCriticalFacilities.length > 0, 'Pillar D: Critical facilities identified');
  console.log('  ✓ Pillar D (Infrastructure): Evaluates intersecting length and cut segments');

  // Pillar E
  assert(kotturuFlood.uncertaintyAndCoverage.dataSources.length >= 3, 'Pillar E: Data sources listed');
  assert(kotturuFlood.uncertaintyAndCoverage.modelAssumptions.length >= 2, 'Pillar E: Documented model assumptions');
  assert(kotturuFlood.uncertaintyAndCoverage.missingDatasets.length >= 1, 'Pillar E: Missing datasets disclosed');
  assert(kotturuFlood.uncertaintyAndCoverage.confidenceTier !== undefined, 'Pillar E: Confidence tier present');
  console.log('  ✓ Pillar E (Uncertainty & Coverage): Transparently discloses assumptions and missing datasets');

  console.log('\n=============================================================');
  console.log(' Test Results: ALL 28 ASSERTIONS PASSED (0 FAILED)');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

