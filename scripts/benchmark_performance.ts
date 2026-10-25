import { performance } from 'node:perf_hooks';
import { defaultSimulationEngine } from '../src/services/simulationService';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { fetchLocationGeospatialData, searchIndiaLocations } from '../src/services/geospatialService';
import { generateNationwideHazardAssessment } from '../src/services/indiaHazardEngine';
import { multiHazardSimulationEngine } from '../src/services/multiHazardSimulationEngine';

async function runBenchmark() {
  console.log('=============================================================');
  console.log(' Bharat Village Twin: Baseline Performance Benchmark');
  console.log('=============================================================\n');

  const results: Record<string, number> = {};

  // 1. Simulation Engine Cold Run
  {
    const start = performance.now();
    await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, {
      rainfallIntensity_mmh: 65,
      rainfallDuration_hours: 4,
      scenario: 'baseline',
      soilType: 'alluvial_clay',
      infiltrationRate_mmh: 5.0,
      runoffCoefficient: 0.73,
      tideOutfallCondition: 'normal',
      desiltingFactor: 1.0,
    });
    const dur = performance.now() - start;
    results['simulation_cold_ms'] = dur;
    console.log(`[1] Simulation Cold Run: ${dur.toFixed(2)} ms`);
  }

  // 2. Simulation Engine Warm Run (Identical parameters)
  {
    const start = performance.now();
    await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, {
      rainfallIntensity_mmh: 65,
      rainfallDuration_hours: 4,
      scenario: 'baseline',
      soilType: 'alluvial_clay',
      infiltrationRate_mmh: 5.0,
      runoffCoefficient: 0.73,
      tideOutfallCondition: 'normal',
      desiltingFactor: 1.0,
    });
    const dur = performance.now() - start;
    results['simulation_warm_ms'] = dur;
    console.log(`[2] Simulation Warm Run: ${dur.toFixed(2)} ms`);
  }

  // 3. MultiHazard Simulation Engine Run
  {
    const start = performance.now();
    await multiHazardSimulationEngine.runScenario(
      NATIONWIDE_BENCHMARK_LOCATIONS[0],
      DEMO_VILLAGE,
      'flood',
      {
        rainfallIntensity_mmh: 65,
        duration_hours: 4,
        drainageCondition: 'normal',
        tideOutfallCondition: 'normal',
        designStormType: '100_year',
      },
      'village_boundary'
    );
    const dur = performance.now() - start;
    results['multi_hazard_sim_ms'] = dur;
    console.log(`[3] Multi-Hazard Simulation Run: ${dur.toFixed(2)} ms`);
  }

  // 4. Geospatial Data Ingestion & Transformation
  {
    const start = performance.now();
    await fetchLocationGeospatialData(NATIONWIDE_BENCHMARK_LOCATIONS[0]);
    const dur = performance.now() - start;
    results['geospatial_load_ms'] = dur;
    console.log(`[4] Geospatial Data Loading (Buildings/Roads/Boundaries): ${dur.toFixed(2)} ms`);
  }

  // 5. Nationwide Location Search (Cold query)
  {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      searchIndiaLocations('Kotturu');
      searchIndiaLocations('Joshimath');
      searchIndiaLocations('Mumbai');
      searchIndiaLocations('532455');
    }
    const dur = (performance.now() - start) / 80;
    results['search_query_avg_ms'] = dur;
    console.log(`[5] Location Search Avg Query Latency: ${dur.toFixed(3)} ms`);
  }

  // 6. Hazard Assessment Calculation
  {
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      generateNationwideHazardAssessment(NATIONWIDE_BENCHMARK_LOCATIONS[0]);
    }
    const dur = (performance.now() - start) / 10;
    results['hazard_assessment_ms'] = dur;
    console.log(`[6] Multi-Hazard Assessment Generation: ${dur.toFixed(2)} ms`);
  }

  console.log('\n--- Benchmark Completed ---');
  return results;
}

runBenchmark().catch(console.error);
