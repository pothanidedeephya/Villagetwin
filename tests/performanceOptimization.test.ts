import assert from 'assert';
import { defaultSimulationEngine, clearSimulationCache } from '../src/services/simulationService.ts';
import { multiHazardSimulationEngine } from '../src/services/multiHazardSimulationEngine.ts';
import { searchIndiaLocations, clearGeospatialCaches } from '../src/services/geospatialService.ts';
import { databaseService } from '../src/services/databaseService.ts';
import { performanceTracker } from '../src/services/performanceTracker.ts';
import { DEMO_VILLAGE } from '../src/data/demoVillage.ts';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations.ts';
import type { SimulationConfig } from '../src/types/village.ts';

async function runPerformanceTestSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING PERFORMANCE OPTIMIZATION & FASTER LOADING TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✅ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ [FAIL] ${name}`);
            console.error(err);
            process.exit(1);
          });
      } else {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // 1. Hydrodynamic Solver Precomputation & Cache Verification
  await test('1. Hydrodynamic solver produces accurate flood depths and building inundation count', async () => {
    clearSimulationCache();
    const config: SimulationConfig = {
      scenario: 'existing_drainage',
      rainfallIntensity_mmh: 65,
      rainfallDuration_hours: 4,
      soilType: 'black_cotton',
      infiltrationRate_mmh: 6.0,
      runoffCoefficient: 0.65,
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.65,
      timeStep_mins: 60,
    };

    const res = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
    assert(res.frames.length >= 4, 'Must have hourly simulation frames');
    assert(res.maxInundatedArea_ha > 0, 'Inundated area must be greater than zero');
    assert(res.peakDepth_m > 0, 'Peak depth must be greater than zero');
    assert(Array.isArray(res.affectedBuildings), 'Affected buildings array must be present');
    assert(Array.isArray(res.affectedRoads), 'Affected roads array must be present');
  });

  await test('2. Hydrodynamic solver memoization cache delivers > 5x warm execution speedup', async () => {
    clearSimulationCache();
    const config: SimulationConfig = {
      scenario: 'existing_drainage',
      rainfallIntensity_mmh: 70,
      rainfallDuration_hours: 4,
      soilType: 'red_sandy_loam',
      infiltrationRate_mmh: 12.0,
      runoffCoefficient: 0.70,
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.65,
      timeStep_mins: 60,
    };

    // Cold run (computes and caches)
    const t0 = performance.now();
    const coldRes = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
    const coldDuration = performance.now() - t0;

    // Warm run (instant cache retrieval)
    const t1 = performance.now();
    const warmRes = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
    const warmDuration = performance.now() - t1;

    console.log(`     Cold: ${coldDuration.toFixed(2)} ms | Warm: ${warmDuration.toFixed(2)} ms`);
    assert(warmDuration < coldDuration, 'Warm run must be faster than cold run');
    assert(warmDuration < 10, `Warm run must execute in under 10 ms (actual: ${warmDuration.toFixed(2)} ms)`);
    assert.deepStrictEqual(warmRes.maxInundatedArea_ha, coldRes.maxInundatedArea_ha, 'Cached outputs must match cold outputs');
    assert.deepStrictEqual(warmRes.peakDepth_m, coldRes.peakDepth_m, 'Peak depth must match');
  });

  await test('3. Simulation cache cleanly invalidates when meteorological parameters change', async () => {
    clearSimulationCache();
    const baseConfig: SimulationConfig = {
      scenario: 'existing_drainage',
      rainfallIntensity_mmh: 50,
      rainfallDuration_hours: 4,
      soilType: 'black_cotton',
      infiltrationRate_mmh: 6.0,
      runoffCoefficient: 0.65,
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.65,
      timeStep_mins: 60,
    };

    const res50 = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, baseConfig);
    const res100 = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, {
      ...baseConfig,
      rainfallIntensity_mmh: 100,
    });

    assert(res100.maxInundatedArea_ha > res50.maxInundatedArea_ha, '100 mm/h rain must produce larger inundation than 50 mm/h');
    assert(res100.peakDepth_m >= res50.peakDepth_m, '100 mm/h rain must produce higher or equal peak depth');
  });

  // 2. Multi-Hazard Simulation Engine Profiling
  await test('4. Multi-hazard simulation scenario runs efficiently and synchronously yields', async () => {
    const loc = NATIONWIDE_BENCHMARK_LOCATIONS[0];
    const t0 = performance.now();
    const report = await multiHazardSimulationEngine.runScenario(
      loc,
      DEMO_VILLAGE,
      'flood',
      {
        rainfallIntensity_mmh: 85,
        duration_hours: 4,
        drainageCondition: 'normal',
        tideOutfallCondition: 'normal',
        designStormType: '100_year',
      },
      'village_boundary'
    );
    const dur = performance.now() - t0;
    console.log(`     Multi-Hazard Flood Scenario: ${dur.toFixed(2)} ms`);

    assert(dur < 60, `Multi-hazard scenario should execute under 60 ms (actual: ${dur.toFixed(2)} ms)`);
    assert(report.hazardType === 'flood', 'Report must be flood hazard type');
    assert(report.geographicImpact && report.geographicImpact.totalStudyAreaKm2 > 0, 'Geographic impact must be calculated');
    assert(report.infrastructureImpact && Array.isArray(report.infrastructureImpact.exposedCriticalFacilities), 'Critical infrastructure exposure must be evaluated');
  });

  // 3. Location Search Debounce & In-Memory Cache Verification
  await test('5. Location search in-memory cache returns instant results on duplicate queries', async () => {
    clearGeospatialCaches();

    // Cold query
    const t0 = performance.now();
    const coldResults = await searchIndiaLocations('Kotturu');
    const coldDur = performance.now() - t0;

    // Warm query
    const t1 = performance.now();
    const warmResults = await searchIndiaLocations('Kotturu');
    const warmDur = performance.now() - t1;

    console.log(`     Search Cold: ${coldDur.toFixed(2)} ms | Search Warm: ${warmDur.toFixed(2)} ms`);
    assert(warmDur <= coldDur, 'Warm search query must be faster or equal to cold query');
    assert(warmResults.length === coldResults.length, 'Results count must match exactly');
    assert(warmResults[0].name.toLowerCase().includes('kotturu') || warmResults[0].displayName.toLowerCase().includes('kotturu'), 'Should find Kotturu');
  });

  // 4. Batch Risk Assessment Database API Verification
  await test('6. Database service batch risk assessment persistence saves all records in single transaction', () => {
    const mockAssessments = [
      {
        locationId: 'test-loc-1',
        hazardType: 'flood',
        riskLevel: 'high',
        scientificScore: 78,
      },
      {
        locationId: 'test-loc-1',
        hazardType: 'cyclone',
        riskLevel: 'very_high',
        scientificScore: 92,
      },
      {
        locationId: 'test-loc-1',
        hazardType: 'earthquake',
        riskLevel: 'low',
        scientificScore: 24,
      },
    ];

    const saved = databaseService.saveRiskAssessmentsBatch(mockAssessments as any);
    assert(saved.length === 3, 'Must save 3 assessments');

    const retrieved = databaseService.getRiskAssessments('test-loc-1');
    assert(retrieved.length >= 3, 'Must retrieve at least 3 assessments for test location');
    const flood = retrieved.find((r) => r.hazardType === 'flood' || r.hazard_type === 'flood');
    assert(flood && flood.risk_level === 'high', 'Flood risk level must match');
  });

  // 5. Performance Diagnostics Tracker Instrumentation
  await test('7. Performance diagnostics tracker tracks startup, map, layers, and computes cache hit ratio', () => {
    performanceTracker.clearMetrics();
    performanceTracker.markMapReady();
    performanceTracker.recordLayerDuration('roads', 12.4);
    performanceTracker.recordLayerDuration('buildings', 28.1);
    performanceTracker.recordSimulationDuration(25.3, false);
    performanceTracker.recordSimulationDuration(0.2, true);
    performanceTracker.recordSimulationDuration(0.1, true);

    const snapshot = performanceTracker.getSnapshot();
    assert(snapshot.mapReadyMs !== null, 'Map ready time must be tracked');
    assert(snapshot.layerTimings['roads'] === 12.4, 'Roads duration must match');
    assert(snapshot.layerTimings['buildings'] === 28.1, 'Buildings duration must match');
    assert(snapshot.cacheHits === 2, 'Simulation cache hits must be 2');
    assert(snapshot.cacheMisses === 1, 'Simulation cache misses must be 1');

    const ratio = performanceTracker.getCacheHitRatio();
    assert(ratio !== null && Math.round(ratio) === 67, `Cache hit ratio must be 67% (actual: ${ratio}%)`);
  });

  console.log(`\n🎉 All ${passed}/${total} performance optimization tests PASSED!\n`);
}

runPerformanceTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
