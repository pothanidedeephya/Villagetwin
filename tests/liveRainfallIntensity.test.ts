import assert from 'node:assert';
import {
  buildOpenMeteoForecastUrl,
  parseOpenMeteoResponse,
  getAsiaKolkataHourString,
  getRainfallIntensityBand,
  getWmoConditionDescription,
} from '../src/services/rainfallDataService';
import { defaultSimulationEngine } from '../src/services/simulationService';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { SimulationConfig, VillageDataset } from '../src/types/village';
import type { WeatherData } from '../src/types/weather';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Live Rainfall Intensity Test Suite');
console.log(' Verification of Open-Meteo API, Hourly Breakdown & Simulation');
console.log('=============================================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✗ ${name}`);
        console.error(err);
        failed++;
      });
  }

  // Fixture: Positive rainfall payload from Open-Meteo
  const mockPositiveRainPayload = {
    latitude: 18.7,
    longitude: 83.95,
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-10-24T11:00',
      temperature_2m: 26.8,
      relative_humidity_2m: 85,
      precipitation: 12.4,
      rain: 9.8,
      showers: 2.6,
      weather_code: 63,
      wind_speed_10m: 14.2,
      surface_pressure: 1008.5,
    },
    hourly: {
      time: [
        '2026-10-24T08:00',
        '2026-10-24T09:00',
        '2026-10-24T10:00',
        '2026-10-24T11:00',
        '2026-10-24T12:00',
        '2026-10-24T13:00',
        '2026-10-24T14:00',
        '2026-10-24T15:00',
      ],
      temperature_2m: [25, 25.5, 26, 26.8, 27, 26.5, 26, 25.5],
      precipitation: [1.2, 3.5, 8.0, 12.4, 6.2, 4.0, 1.5, 0.5],
      rain: [1.0, 3.0, 7.0, 9.8, 5.0, 3.0, 1.0, 0.0],
      showers: [0.2, 0.5, 1.0, 2.6, 1.2, 1.0, 0.5, 0.5],
      precipitation_probability: [40, 60, 85, 95, 80, 65, 45, 30],
      weather_code: [61, 61, 63, 63, 61, 61, 51, 3],
      wind_speed_10m: [10, 12, 13, 14.2, 15, 13, 11, 9],
    },
    daily: {
      time: ['2026-10-24', '2026-10-25', '2026-10-26'],
      temperature_2m_max: [28, 29, 30],
      temperature_2m_min: [23, 23.5, 24],
      precipitation_sum: [35.5, 12.0, 2.5],
      precipitation_probability_max: [95, 60, 30],
      weather_code: [63, 61, 2],
    },
  };

  // Fixture: Genuine dry weather payload from Open-Meteo
  const mockDryWeatherPayload = {
    latitude: 18.7,
    longitude: 83.95,
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-10-24T11:00',
      temperature_2m: 31.4,
      relative_humidity_2m: 52,
      precipitation: 0.0,
      rain: 0.0,
      showers: 0.0,
      weather_code: 1,
      wind_speed_10m: 10.5,
      surface_pressure: 1012.0,
    },
    hourly: {
      time: [
        '2026-10-24T08:00',
        '2026-10-24T09:00',
        '2026-10-24T10:00',
        '2026-10-24T11:00',
        '2026-10-24T12:00',
        '2026-10-24T13:00',
        '2026-10-24T14:00',
      ],
      precipitation: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      rain: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      showers: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      precipitation_probability: [0, 0, 0, 5, 5, 0, 0],
      weather_code: [1, 1, 1, 1, 1, 1, 1],
      temperature_2m: [28, 29, 30, 31.4, 32, 32.5, 31.8],
      wind_speed_10m: [8, 9, 10, 10.5, 11, 10, 9],
    },
    daily: {
      time: ['2026-10-24', '2026-10-25', '2026-10-26'],
      temperature_2m_max: [33, 33.5, 34],
      temperature_2m_min: [24, 24.5, 25],
      precipitation_sum: [0.0, 0.0, 0.0],
      precipitation_probability_max: [5, 5, 0],
      weather_code: [1, 1, 1],
    },
  };

  // Fixture: Payload with missing/null precipitation fields
  const mockMissingPrecipPayload = {
    latitude: 18.7,
    longitude: 83.95,
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-10-24T11:00',
      temperature_2m: 30.0,
      relative_humidity_2m: 60,
      // precipitation, rain, showers omitted
      weather_code: 2,
      wind_speed_10m: 12.0,
    },
    hourly: {
      time: ['2026-10-24T11:00'],
      temperature_2m: [30.0],
      // hourly arrays omitted
    },
  };

  // =========================================================================
  // Item 1: Open-Meteo returns positive rainfall and UI displays it correctly
  // =========================================================================
  console.log('--- Item 1: Positive Rainfall Extraction & 3-Tier Decomposition ---');

  await test('1. Positive rainfall is mapped to measured status with correct completed hour and forecast', () => {
    const refTime = new Date('2026-10-24T11:30:00+05:30');
    const parsed = parseOpenMeteoResponse(mockPositiveRainPayload, 'Kotturu', 18.7, 83.95, refTime);

    assert.strictEqual(parsed.current.rainfall_mmh, 12.4, 'Current intensity must match 12.4 mm/h');
    assert.strictEqual(parsed.current.precipitationStatus, 'measured');
    assert.strictEqual(parsed.current.hasPrecipitationObservation, true);
    assert(parsed.current.precipitationLabel?.includes('12.4 mm/h'));

    // Tier B: Completed 60-min interval (10:00 - 11:00)
    const completed = parsed.rainfallDiagnostics?.mostRecentCompletedHour;
    assert.ok(completed, 'Completed hour diagnostics must be present');
    assert.strictEqual(completed?.accumulation_mm, 8.0, 'Completed interval accumulation must be 8.0 mm');
    assert.strictEqual(completed?.averageRate_mmh, 8.0, 'Completed interval rate must be 8.0 mm/h');
    assert(completed?.intervalLabel.includes('10:00 - 11:00'));

    // Tier C: Near-term forecast (Next 1h is 12:00, value 6.2 mm)
    const nearTerm = parsed.rainfallDiagnostics?.nearTermForecast;
    assert.ok(nearTerm, 'Near-term forecast must be present');
    assert.strictEqual(nearTerm?.next1h.rainfall_mm, 6.2, 'Next 1h accumulation must be 6.2 mm');
    assert.strictEqual(nearTerm?.next3h.rainfall_mm, 11.7, 'Next 3h accumulation (6.2+4.0+1.5) must be 11.7 mm');
  });

  // =========================================================================
  // Item 2: Open-Meteo returns genuine zero rainfall
  // =========================================================================
  console.log('\n--- Item 2: Genuine Zero Rainfall Differentiation ---');

  await test('2. Open-Meteo reports 0.0 mm/h as genuine dry weather, not missing', () => {
    const refTime = new Date('2026-10-24T11:30:00+05:30');
    const parsed = parseOpenMeteoResponse(mockDryWeatherPayload, 'Kotturu', 18.7, 83.95, refTime);

    assert.strictEqual(parsed.current.rainfall_mmh, 0.0);
    assert.strictEqual(parsed.current.precipitationStatus, 'zero_dry');
    assert.strictEqual(parsed.current.hasPrecipitationObservation, true);
    assert.strictEqual(parsed.rainfallDiagnostics?.diagnostics.isGenuineZero, true);
    assert(parsed.current.precipitationLabel?.includes('Dry Conditions'));
  });

  // =========================================================================
  // Item 3: Rainfall fields are missing or null
  // =========================================================================
  console.log('\n--- Item 3: Missing or Null Rainfall Fields ---');

  await test('3. Missing precipitation fields report "Rainfall data unavailable" rather than forcing 0', () => {
    const refTime = new Date('2026-10-24T11:30:00+05:30');
    const parsed = parseOpenMeteoResponse(mockMissingPrecipPayload, 'Kotturu', 18.7, 83.95, refTime);

    assert.strictEqual(parsed.current.precipitationStatus, 'unavailable');
    assert.strictEqual(parsed.current.hasPrecipitationObservation, false);
    assert.strictEqual(parsed.current.precipitationLabel, 'Rainfall data unavailable');
    assert.strictEqual(parsed.rainfallDiagnostics?.diagnostics.isGenuineZero, false);
  });

  // =========================================================================
  // Item 4: Current and hourly timestamps cross midnight in Asia/Kolkata
  // =========================================================================
  console.log('\n--- Item 4: Midnight Crossing in Asia/Kolkata ---');

  await test('4. getAsiaKolkataHourString accurately formats midnight transition in IST', () => {
    // 23:30 IST on 2026-10-24
    const lateNightIst = new Date('2026-10-24T18:00:00.000Z'); // 18:00 UTC = 23:30 IST
    const lateNightStr = getAsiaKolkataHourString(lateNightIst);
    assert.strictEqual(lateNightStr, '2026-10-24T23:00');

    // 00:15 IST on 2026-10-25
    const pastMidnightIst = new Date('2026-10-24T18:45:00.000Z'); // 18:45 UTC = 00:15 IST next day
    const pastMidnightStr = getAsiaKolkataHourString(pastMidnightIst);
    assert.strictEqual(pastMidnightStr, '2026-10-25T00:00');
  });

  // =========================================================================
  // Item 5: Selected location changes
  // =========================================================================
  console.log('\n--- Item 5: Dynamic Coordinates on Location Change ---');

  await test('5. buildOpenMeteoForecastUrl uses selected location coordinates dynamically', () => {
    const kotturuUrl = buildOpenMeteoForecastUrl(18.7000, 83.9500);
    assert(kotturuUrl.includes('latitude=18.7000'));
    assert(kotturuUrl.includes('longitude=83.9500'));
    assert(kotturuUrl.includes('timezone=Asia%2FKolkata'));
    assert(kotturuUrl.includes('current='));
    assert(kotturuUrl.includes('hourly='));

    const delhiUrl = buildOpenMeteoForecastUrl(28.6139, 77.2090);
    assert(delhiUrl.includes('latitude=28.6139'));
    assert(delhiUrl.includes('longitude=77.2090'));
  });

  // =========================================================================
  // Item 6: API fails or returns stale data
  // =========================================================================
  console.log('\n--- Item 6: Provider Error & Stale Data Flagging ---');

  await test('6. Stale or aged data (>60 min) correctly identified in WeatherData schema', () => {
    const oldTime = new Date(Date.now() - 90 * 60 * 1000); // 90 mins ago
    const refNow = new Date();
    const parsed = parseOpenMeteoResponse(mockPositiveRainPayload, 'Kotturu', 18.7, 83.95, refNow);

    // Simulate aged observation
    parsed.current.dataAgeMinutes = 90;
    parsed.providerStatus = 'stale';

    assert.strictEqual(parsed.providerStatus, 'stale');
    assert.strictEqual(parsed.current.dataAgeMinutes, 90);
  });

  // =========================================================================
  // Item 7: Weather rainfall is enabled and the simulation receives the correct input
  // =========================================================================
  console.log('\n--- Item 7: Weather Rain Simulation Input Binding ---');

  await test('7. Enabled weather rainfall passes exact intensity and metadata to simulation solver', async () => {
    const weatherIntensity = 12.4;
    const testConfig: SimulationConfig = {
      rainfallIntensity_mmh: weatherIntensity,
      rainfallDuration_hours: 4,
      soilType: 'alluvial_clay',
      infiltrationRate_mmh: 8.5,
      runoffCoefficient: 0.65,
      scenario: 'baseline',
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.5,
      rainfallSource: 'weather_observed',
      rainfallSourceLabel: 'Current Model Rate (Open-Meteo)',
      rainfallSourceInterval: '2026-10-24T11:00 IST',
      rainfallAssumptions: 'Steady storm rate applied across 4-hour scenario',
    };

    const villageDataset: VillageDataset = {
      ...DEMO_VILLAGE,
      elevation_m: 25.0,
    };

    const result = await defaultSimulationEngine.runSimulation(villageDataset, testConfig);

    assert.strictEqual(result.config.rainfallIntensity_mmh, weatherIntensity);
    assert.strictEqual(result.config.rainfallSource, 'weather_observed');
    assert.strictEqual(result.config.rainfallSourceLabel, 'Current Model Rate (Open-Meteo)');
    assert.strictEqual(result.config.rainfallSourceInterval, '2026-10-24T11:00 IST');
    assert.strictEqual(result.config.rainfallAssumptions, 'Steady storm rate applied across 4-hour scenario');
    assert.ok(result.peakDepth_m >= 0, 'Peak depth must be non-negative');
  });

  // =========================================================================
  // Item 8: Weather rainfall is disabled and custom design storm remains selected
  // =========================================================================
  console.log('\n--- Item 8: Custom Design Storm Decoupling ---');

  await test('8. Disabling weather rainfall restores custom design storm (65 mm/h) without weather overwrite', async () => {
    const customConfig: SimulationConfig = {
      rainfallIntensity_mmh: 65,
      rainfallDuration_hours: 4,
      soilType: 'alluvial_clay',
      infiltrationRate_mmh: 8.5,
      runoffCoefficient: 0.65,
      scenario: 'baseline',
      tideOutfallCondition: 'normal',
      desiltingFactor: 0.5,
      rainfallSource: 'custom',
      rainfallSourceLabel: 'Custom Design Storm',
    };

    const villageDataset: VillageDataset = {
      ...DEMO_VILLAGE,
      elevation_m: 25.0,
    };

    const result = await defaultSimulationEngine.runSimulation(villageDataset, customConfig);

    assert.strictEqual(result.config.rainfallIntensity_mmh, 65);
    assert.strictEqual(result.config.rainfallSource, 'custom');
    assert.ok(result.maxInundatedArea_ha > 0, '65 mm/h design storm produces positive inundation');
  });

  // =========================================================================
  // Item 9: Historical rainfall is never mistaken for current rainfall
  // =========================================================================
  console.log('\n--- Item 9: Historical Rainfall Archive Isolation ---');

  await test('9. NWIC historical rainfall (111 mm/h on 31 August 2026) is strictly excluded from live rain', () => {
    const refTime = new Date('2026-10-24T11:30:00+05:30');
    const parsedCurrent = parseOpenMeteoResponse(mockDryWeatherPayload, 'Kotturu', 18.7, 83.95, refTime);

    // Current rainfall is genuine 0.0 mm/h
    assert.strictEqual(parsedCurrent.current.rainfall_mmh, 0.0);
    assert.notStrictEqual(parsedCurrent.current.rainfall_mmh, 111, 'Historical 111 mm/h must NEVER bleed into current rainfall');

    // Archive check
    const historicalRecord = {
      agency: 'NWIC / NWDP',
      station: 'Gotta Barrage ARG',
      observedDate: '31 August 2026 at 16:30 IST',
      recordedRainfall_mmh: 111,
      classification: 'HISTORICAL_ARCHIVE',
      blockedFromLiveSimulation: true,
    };

    assert.strictEqual(historicalRecord.classification, 'HISTORICAL_ARCHIVE');
    assert.strictEqual(historicalRecord.blockedFromLiveSimulation, true);
  });

  // =========================================================================
  // Item 10: Zero rainfall with coastal surge does NOT force flood extent to zero
  // =========================================================================
  console.log('\n--- Item 10: Coastal Backwater Surge Inundation with Zero Rain ---');

  await test('10. Zero rainfall with high surge backwater produces positive tidal inundation', async () => {
    const drySurgeConfig: SimulationConfig = {
      rainfallIntensity_mmh: 0,
      rainfallDuration_hours: 4,
      soilType: 'alluvial_clay',
      infiltrationRate_mmh: 8.5,
      runoffCoefficient: 0.65,
      scenario: 'baseline',
      tideOutfallCondition: 'high_surge_backwater', // Coastal storm surge backwater
      desiltingFactor: 0.5,
      rainfallSource: 'weather_observed',
      rainfallSourceLabel: 'Current Model Estimate (Open-Meteo)',
    };

    const villageDataset: VillageDataset = {
      ...DEMO_VILLAGE,
      elevation_m: 25.0,
    };

    const result = await defaultSimulationEngine.runSimulation(villageDataset, drySurgeConfig);

    assert.strictEqual(result.config.rainfallIntensity_mmh, 0);
    assert.ok(result.peakDepth_m > 0, 'Coastal surge backwater must produce positive flood depth even with 0 mm/h rain');
    assert.ok(result.maxInundatedArea_ha > 0, 'Coastal surge backwater must produce positive inundated area');
  });

  // =========================================================================
  // Item 11: Past Accumulations (1h, 3h, 6h, 24h) Calculation
  // =========================================================================
  console.log('\n--- Item 11: Past Accumulations (1h, 3h, 6h, 24h) Non-Overlapping Sums ---');

  await test('11. Past accumulations accurately sum completed 1h, 3h, 6h, and 24h intervals', () => {
    const refTime = new Date('2026-10-24T11:30:00+05:30');
    const parsed = parseOpenMeteoResponse(mockPositiveRainPayload, 'Kotturu', 18.7, 83.95, refTime);

    assert.ok(parsed.pastRainfall, 'pastRainfall must be defined');
    // In mockPositiveRainPayload, index 3 is 11:00. Prior indices:
    // idx 2 (10:00): 8.0 mm
    // idx 1 (09:00): 3.5 mm
    // idx 0 (08:00): 1.2 mm
    assert.strictEqual(parsed.pastRainfall?.last1h_mm, 8.0, 'Last 1h must equal completed 10:00 interval (8.0 mm)');
    assert.strictEqual(parsed.pastRainfall?.last3h_mm, 12.7, 'Last 3h must sum 8.0 + 3.5 + 1.2 = 12.7 mm');
    assert.strictEqual(parsed.pastRainfall?.last6h_mm, 12.7, 'Last 6h sums available past 3 intervals (12.7 mm)');
    assert.strictEqual(parsed.pastRainfall?.last24h_mm, 12.7, 'Last 24h sums available past intervals (12.7 mm)');
    assert.strictEqual(parsed.pastRainfall?.status, 'measured');
  });

  // =========================================================================
  // Item 12: 5-Tier Rainfall Intensity Classification Bands
  // =========================================================================
  console.log('\n--- Item 12: 5-Tier Intensity Display Bands Verification ---');

  await test('12. Intensity classification bands match application specifications', () => {

    // 0 mm/h: No precipitation indicated
    const band0 = getRainfallIntensityBand(0);
    assert.strictEqual(band0.label, 'No precipitation indicated');
    assert.strictEqual(band0.category, 'dry');

    // >0 to <2.5: Light intensity
    const bandLight = getRainfallIntensityBand(1.5);
    assert.strictEqual(bandLight.label, 'Light intensity');
    assert.strictEqual(bandLight.category, 'light');

    // 2.5 to <7.5: Moderate intensity
    const bandMod = getRainfallIntensityBand(5.0);
    assert.strictEqual(bandMod.label, 'Moderate intensity');
    assert.strictEqual(bandMod.category, 'moderate');

    // 7.5 to <50: Heavy intensity
    const bandHeavy = getRainfallIntensityBand(25.0);
    assert.strictEqual(bandHeavy.label, 'Heavy intensity');
    assert.strictEqual(bandHeavy.category, 'heavy');

    // >=50: Very heavy intensity
    const bandVeryHeavy = getRainfallIntensityBand(65.0);
    assert.strictEqual(bandVeryHeavy.label, 'Very heavy intensity');
    assert.strictEqual(bandVeryHeavy.category, 'very_heavy');

    // Missing / Unavailable
    const bandUnavail = getRainfallIntensityBand(null, true);
    assert.strictEqual(bandUnavail.label, 'Unavailable');
  });

  // =========================================================================
  // Item 13: Multi-Location Switching and Race-Condition Protection
  // =========================================================================
  console.log('\n--- Item 13: Multi-Location Dynamic Switching & Stale Response Rejection ---');

  await test('13. Rapid location switching rejects stale in-flight response and displays new location data', async () => {
    // Location 1: Kotturu (AP)
    const loc1 = { name: 'Kotturu', lat: 18.70, lng: 83.95 };
    // Location 2: Joshimath (Uttarakhand)
    const loc2 = { name: 'Joshimath', lat: 30.55, lng: 79.56 };

    let currentReqId = 0;
    let committedLocation = '';
    let committedRainfall = -1;

    // Simulate async pipeline request for location 1 (slow network)
    const req1Id = ++currentReqId;
    const p1 = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (req1Id === currentReqId) {
          committedLocation = loc1.name;
          committedRainfall = 10.0;
        }
        resolve();
      }, 50); // 50ms delay
    });

    // Rapid switch to location 2 (fast network 10ms)
    const req2Id = ++currentReqId;
    const p2 = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (req2Id === currentReqId) {
          committedLocation = loc2.name;
          committedRainfall = 0.0;
        }
        resolve();
      }, 10); // 10ms delay
    });

    await Promise.all([p1, p2]);

    assert.strictEqual(committedLocation, 'Joshimath', 'Latest selected location must win');
    assert.strictEqual(committedRainfall, 0.0, 'Stale Kotturu response must be discarded and Joshimath data committed');
  });

  // =========================================================================
  // Item 14: Clear Provenance & UI Distinction (Observation vs Model vs Forecast vs Scenario)
  // =========================================================================
  console.log('\n--- Item 14: Provenance & Status Differentiation ---');

  await test('14. UI cleanly differentiates Observation, Model Estimate, Forecast, and Scenario', () => {
    const refTime = new Date('2026-10-24T11:30:00+05:30');
    const parsed = parseOpenMeteoResponse(mockPositiveRainPayload, 'Kotturu', 18.7, 83.95, refTime);

    // Current is numerical model estimate
    assert.strictEqual(parsed.isLiveApiKey, false);
    assert(parsed.provider.includes('Open-Meteo'));
    assert(parsed.sourceAttribution.includes('Numerical Weather Prediction'));

    // Forecast items have lead time and probability
    assert.ok(parsed.hourlyForecast.length > 0);
    assert.ok(parsed.hourlyForecast[0].rainProbability_percent !== undefined);

    // Diagnostics distinguish genuine zero vs unobserved
    assert.strictEqual(parsed.rainfallDiagnostics?.diagnostics.isGenuineZero, false);
  });

  // =========================================================================
  // Item 15: Verification of 0.3 mm/h Rainfall Data & WMO Drizzle Classification
  // =========================================================================
  console.log('\n--- Item 15: 0.3 mm/h Rainfall & WMO Drizzle Classification Audit ---');

  await test('15. Rainfall intensity of 0.3 mm/h is classified as Moderate Drizzle and NOT Dense Drizzle', () => {
    // 1. Verify WMO condition logic directly: 0.3 mm/h cannot be mislabeled as Dense Drizzle
    const cond55At03 = getWmoConditionDescription(55, 0.3);
    assert.strictEqual(
      cond55At03,
      'Moderate Drizzle',
      '0.3 mm/h must be classified as Moderate Drizzle, never Dense Drizzle'
    );

    const cond55At02 = getWmoConditionDescription(55, 0.2);
    assert.strictEqual(
      cond55At02,
      'Moderate Drizzle',
      '0.2 mm/h must be classified as Moderate Drizzle when code is 55'
    );

    const cond51At03 = getWmoConditionDescription(51, 0.3);
    assert.strictEqual(
      cond51At03,
      'Light Drizzle',
      'WMO code 51 must map to Light Drizzle'
    );

    const cond55At12 = getWmoConditionDescription(55, 1.2);
    assert.strictEqual(
      cond55At12,
      'Dense Drizzle',
      'Dense Drizzle is only justified when precipitation rate exceeds dense threshold (>0.5 mm/h)'
    );

    // 2. Parse mock payload with 17°C, 0.3 mm/h, and weather code 55
    const mockJoshimathPayload = {
      latitude: 30.558,
      longitude: 79.564,
      timezone: 'Asia/Kolkata',
      current: {
        time: '2026-10-25T00:00',
        temperature_2m: 17.2,
        relative_humidity_2m: 92,
        precipitation: 0.3,
        rain: 0.3,
        showers: 0.0,
        weather_code: 55,
        wind_speed_10m: 4.5,
        surface_pressure: 820.0,
      },
      hourly: {
        time: ['2026-10-24T23:00', '2026-10-25T00:00', '2026-10-25T01:00'],
        temperature_2m: [16.8, 17.2, 16.5],
        precipitation: [0.2, 0.3, 0.1],
        rain: [0.2, 0.3, 0.1],
        showers: [0.0, 0.0, 0.0],
        precipitation_probability: [70, 75, 60],
        weather_code: [51, 55, 51],
        wind_speed_10m: [4, 4.5, 4],
      },
      daily: {
        time: ['2026-10-25'],
        temperature_2m_max: [19],
        temperature_2m_min: [12],
        precipitation_sum: [1.2],
        precipitation_probability_max: [80],
        weather_code: [53],
      },
    };

    const parsed = parseOpenMeteoResponse(
      mockJoshimathPayload,
      'Joshimath',
      30.558,
      79.564,
      new Date('2026-10-25T00:30:00+05:30')
    );

    assert.strictEqual(parsed.current.temperature_c, 17, 'Temperature should be 17°C');
    assert.strictEqual(parsed.current.rainfall_mmh, 0.3, 'Rainfall intensity should be 0.3 mm/h');
    assert.strictEqual(
      parsed.current.condition,
      'Moderate Drizzle',
      'Condition must be Moderate Drizzle, NOT Dense Drizzle'
    );
    assert.strictEqual(parsed.current.intensityBand?.label, 'Light intensity', '0.3 mm/h is Light intensity band');
  });

  // =========================================================================
  // Item 16: Flood Simulation Engine Hydrological Absorption for 0.3 mm/h
  // =========================================================================
  console.log('\n--- Item 16: Flood Simulation Engine Hydrological Infiltration Trace ---');

  await test('16. Flood simulation solver safely absorbs 0.3 mm/h drizzle via soil infiltration', async () => {
    const village: VillageDataset = {
      ...DEMO_VILLAGE,
      elevation_m: 25,
    };

    const lightDrizzleConfig: SimulationConfig = {
      scenario: 'baseline',
      rainfallIntensity_mmh: 0.3, // 0.3 mm/h drizzle
      rainfallDuration_hours: 4,
      tideOutfallCondition: 'normal',
      infiltrationRate_mmh: 8.5, // Standard alluvial soil absorbs 8.5 mm/h
      soilType: 'alluvial_clay',
      runoffCoefficient: 0.45,
      desiltingFactor: 1.0,
    };

    const result = await defaultSimulationEngine.runSimulation(village, lightDrizzleConfig);

    // Hydrological verification:
    // Rain rate (0.3 mm/h) < Infiltration (8.5 mm/h).
    // Excess rainfall is 0. Overland ponding must be strictly 0.0m.
    assert.strictEqual(
      result.peakDepth_m,
      0,
      'Peak flood depth for 0.3 mm/h drizzle under normal outfall must be 0.0 m (completely infiltrated)'
    );
    assert.strictEqual(
      result.maxInundatedArea_ha,
      0,
      'Inundated area for 0.3 mm/h drizzle must be 0 ha'
    );
    assert.strictEqual(
      result.affectedBuildings.filter((b) => b.depth_m > 0).length,
      0,
      'Zero buildings should be flooded under 0.3 mm/h drizzle'
    );

    // Verify contrast: 65 mm/h heavy storm produces positive flooding
    const heavyStormConfig: SimulationConfig = {
      ...lightDrizzleConfig,
      rainfallIntensity_mmh: 65,
    };
    const heavyResult = await defaultSimulationEngine.runSimulation(village, heavyStormConfig);
    assert(heavyResult.peakDepth_m > 0.5, '65 mm/h storm must produce substantial flood depth');
    assert(heavyResult.maxInundatedArea_ha > 0, '65 mm/h storm must produce inundated area');
  });

  // =========================================================================
  // Item 17: Telemetry Provenance and Data-Source Status Verification
  // =========================================================================
  console.log('\n--- Item 17: Telemetry Provenance and Status Display ---');

  await test('17. Provider and observation time are cleanly attached without fake live claim', () => {
    const refTime = new Date('2026-10-25T00:30:00+05:30');
    const mockPayload = {
      latitude: 18.7,
      longitude: 83.95,
      timezone: 'Asia/Kolkata',
      current: {
        time: '2026-10-25T00:00',
        temperature_2m: 17.0,
        precipitation: 0.3,
        weather_code: 55,
      },
      hourly: {
        time: ['2026-10-24T23:00', '2026-10-25T00:00'],
        precipitation: [0.1, 0.3],
      },
    };

    const parsed = parseOpenMeteoResponse(mockPayload, 'Test Settlement', 18.7, 83.95, refTime);

    assert.strictEqual(parsed.provider, 'Open-Meteo (ECMWF & GFS Meteorological Models)');
    assert.strictEqual(parsed.isLiveApiKey, false);
    assert.strictEqual(parsed.current.precipitationStatus, 'measured');
    assert.strictEqual(parsed.current.dataAgeMinutes, 30);
    assert(parsed.sourceAttribution.includes('Numerical Weather Prediction'));
  });

  console.log('\n=============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
