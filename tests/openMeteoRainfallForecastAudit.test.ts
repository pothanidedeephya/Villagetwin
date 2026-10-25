/**
 * Comprehensive Open-Meteo Rainfall Intensity and Forecast Audit Test Suite
 *
 * Covers reported real-world field telemetry cases across India:
 * 1. Joshimath (Uttarakhand): current 0 mm/h; next 1h 0.4 mm; next 3h 0.5 mm; next 6h 0.5 mm
 * 2. Govind Nagar (Andaman & Nicobar): current 0 mm/h; next 1h 0 mm; next 3h 0 mm; next 6h 4.8 mm
 * 3. Kusheshwar Asthan (Bihar): all reported values 0.0 (genuine dry weather)
 * 4. Majuli (Assam): all reported values 0.0 (genuine dry weather)
 * 5. Guduru (Andhra Pradesh): current 0 mm/h; next 1h 0.2 mm; next 3h 0.2 mm; next 6h 0.2 mm
 *
 * Verifications:
 * - Raw Open-Meteo response logging & coordinate verification
 * - Non-decreasing accumulations over increasing intervals [Next 1h <= Next 3h <= Next 6h]
 * - Average intensity calculation [avg mm/h = accum_mm / hours]
 * - Non-double-counting and exact start-end timestamp formatting (e.g. 14:00 - 17:00 IST)
 * - Safe decoupling of current intensity (0.0 mm/h) from upcoming forecast rain
 * - Zero preservation without fallback fabrication
 * - Hydrological flood solver execution with forecast loading vs custom design storms
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
  parseOpenMeteoResponse,
  buildOpenMeteoForecastUrl,
  type OpenMeteoApiResponse,
} from '../src/services/rainfallDataService';
import { defaultSimulationEngine } from '../src/services/simulationService';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { SimulationConfig, VillageDataset } from '../src/types/village';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Open-Meteo Rainfall & Forecast Audit');
console.log(' Telemetry Audit for Joshimath, Govind Nagar, Kusheshwar Asthan, Assam, Guduru');
console.log('=============================================================\n');

// Helper to create synthetic 24-hour Open-Meteo response with exact hour indices
function createSyntheticOpenMeteoResponse(params: {
  lat: number;
  lng: number;
  baseDate: string; // '2026-10-25'
  currentHour: number; // 14 -> '2026-10-25T14:00'
  currentPrecip: number;
  currentRain: number;
  currentShowers: number;
  hourlyPrecipByOffsetFromCurrent: Record<number, number>; // offset 0 is current hour, 1 is next 1h, etc.
  wmoCode?: number;
}): OpenMeteoApiResponse {
  const times: string[] = [];
  const precipArr: number[] = [];
  const rainArr: number[] = [];
  const probArr: number[] = [];

  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0');
    times.push(`${params.baseDate}T${hh}:00`);
    const offset = h - params.currentHour;
    const precip = params.hourlyPrecipByOffsetFromCurrent[offset] ?? 0.0;
    precipArr.push(precip);
    rainArr.push(precip);
    probArr.push(precip > 0 ? 80 : 5);
  }

  const currentHh = String(params.currentHour).padStart(2, '0');

  return {
    latitude: params.lat,
    longitude: params.lng,
    generationtime_ms: 0.12,
    utc_offset_seconds: 19800, // +05:30 Asia/Kolkata
    timezone: 'Asia/Kolkata',
    timezone_abbreviation: 'IST',
    elevation: 100,
    current: {
      time: `${params.baseDate}T${currentHh}:00`,
      interval: 900,
      temperature_2m: 22.5,
      relative_humidity_2m: 78,
      apparent_temperature: 22.5,
      precipitation: params.currentPrecip,
      rain: params.currentRain,
      showers: params.currentShowers,
      weather_code: params.wmoCode ?? 3,
      wind_speed_10m: 12.0,
      wind_direction_10m: 180,
    },
    hourly: {
      time: times,
      temperature_2m: new Array(24).fill(22),
      relative_humidity_2m: new Array(24).fill(75),
      precipitation: precipArr,
      rain: rainArr,
      showers: new Array(24).fill(0),
      weather_code: new Array(24).fill(params.wmoCode ?? 3),
      wind_speed_10m: new Array(24).fill(10),
      precipitation_probability: probArr,
    },
  };
}

// -----------------------------------------------------------------------------
// Case 1: Joshimath (Chamoli, Uttarakhand - Himalayan Terrain)
// Telemetry: current 0 mm/h; next 1h 0.4 mm; next 3h 0.5 mm; next 6h 0.5 mm
// -----------------------------------------------------------------------------
test('Case 1: Joshimath - Frontal rain arriving in next 1h (0.4mm), tapering off (0.5mm 3h/6h)', () => {
  const joshimathCoords: [number, number] = [30.558, 79.564]; // [lat, lng]
  const mockApi = createSyntheticOpenMeteoResponse({
    lat: joshimathCoords[0],
    lng: joshimathCoords[1],
    baseDate: '2026-10-25',
    currentHour: 10,
    currentPrecip: 0.0,
    currentRain: 0.0,
    currentShowers: 0.0,
    hourlyPrecipByOffsetFromCurrent: {
      // Offset 0 (10:00 completed interval): 0 mm
      0: 0.0,
      // Offset 1 (10:00 - 11:00): 0.4 mm
      1: 0.4,
      // Offset 2 (11:00 - 12:00): 0.1 mm -> Sum for 3h = 0.4 + 0.1 + 0.0 = 0.5 mm
      2: 0.1,
      // Offset 3 (12:00 - 13:00): 0.0 mm
      3: 0.0,
      // Offset 4 (13:00 - 14:00): 0.0 mm
      4: 0.0,
      // Offset 5 (14:00 - 15:00): 0.0 mm
      5: 0.0,
      // Offset 6 (15:00 - 16:00): 0.0 mm -> Sum for 6h = 0.5 mm
      6: 0.0,
    },
  });

  const parsed = parseOpenMeteoResponse(
    mockApi,
    'Joshimath (Chamoli, Uttarakhand)',
    joshimathCoords[0],
    joshimathCoords[1]
  );

  // 1. Verify Current Intensity is 0.0 mm/h without confusing with forecast
  assert.strictEqual(parsed.current.rainfall_mmh, 0.0, 'Joshimath current rainfall intensity must be strictly 0 mm/h');
  assert.strictEqual(parsed.current.precipitationStatus, 'zero_dry', 'Current status must be zero_dry');

  // 2. Verify Near-Term Forecast Accumulation (mm)
  const nf = parsed.rainfallDiagnostics?.nearTermForecast;
  assert.ok(nf, 'Near-term forecast must be populated');
  assert.strictEqual(nf.next1h.rainfall_mm, 0.4, 'Next 1h accumulation must be 0.4 mm');
  assert.strictEqual(nf.next3h.rainfall_mm, 0.5, 'Next 3h accumulation must be 0.5 mm');
  assert.strictEqual(nf.next6h.rainfall_mm, 0.5, 'Next 6h accumulation must be 0.5 mm');

  // 3. Verify Non-Decreasing Property: Next 1h <= Next 3h <= Next 6h
  assert.ok(nf.next1h.rainfall_mm <= nf.next3h.rainfall_mm, 'Next 1h <= Next 3h');
  assert.ok(nf.next3h.rainfall_mm <= nf.next6h.rainfall_mm, 'Next 3h <= Next 6h');

  // 4. Verify Average Rates (mm/h)
  assert.strictEqual(nf.next1h.rate_mmh, 0.4, 'Next 1h avg rate = 0.4 mm / 1h = 0.4 mm/h');
  assert.strictEqual(nf.next3h.rate_mmh, 0.17, 'Next 3h avg rate = 0.5 mm / 3h = 0.17 mm/h (preserves precision)');
  assert.strictEqual(nf.next6h.rate_mmh, 0.08, 'Next 6h avg rate = 0.5 mm / 6h = 0.08 mm/h (preserves precision)');

  // 5. Verify Timestamp Intervals (Starting from current hour 10:00)
  assert.strictEqual(nf.next1h.timeRangeLabel, '10:00 - 11:00 IST (1h accumulation)');
  assert.strictEqual(nf.next3h.timeRangeLabel, '10:00 - 13:00 IST (3h accumulation)');
  assert.strictEqual(nf.next6h.timeRangeLabel, '10:00 - 16:00 IST (6h accumulation)');
});

// -----------------------------------------------------------------------------
// Case 2: Govind Nagar, Andaman & Nicobar Islands (Tropical Maritime)
// Telemetry: current 0 mm/h; next 1h 0 mm; next 3h 0 mm; next 6h 4.8 mm
// -----------------------------------------------------------------------------
test('Case 2: Govind Nagar - Delayed squall band arriving in hours 4-6 (4.8mm total in 6h)', () => {
  const govindNagarCoords: [number, number] = [11.980, 93.010];
  const mockApi = createSyntheticOpenMeteoResponse({
    lat: govindNagarCoords[0],
    lng: govindNagarCoords[1],
    baseDate: '2026-10-25',
    currentHour: 8,
    currentPrecip: 0.0,
    currentRain: 0.0,
    currentShowers: 0.0,
    hourlyPrecipByOffsetFromCurrent: {
      0: 0.0,
      1: 0.0, // 08:00 - 09:00: 0 mm
      2: 0.0, // 09:00 - 10:00: 0 mm
      3: 0.0, // 10:00 - 11:00: 0 mm -> Next 3h = 0.0 mm
      4: 1.2, // 11:00 - 12:00: 1.2 mm
      5: 2.4, // 12:00 - 13:00: 2.4 mm
      6: 1.2, // 13:00 - 14:00: 1.2 mm -> Sum = 4.8 mm in 6h
    },
  });

  const parsed = parseOpenMeteoResponse(
    mockApi,
    'Govind Nagar (Andaman & Nicobar Islands)',
    govindNagarCoords[0],
    govindNagarCoords[1]
  );

  assert.strictEqual(parsed.current.rainfall_mmh, 0.0, 'Govind Nagar current rain must be 0 mm/h');
  const nf = parsed.rainfallDiagnostics?.nearTermForecast;
  assert.ok(nf, 'Near-term forecast must be populated');

  // Accumulation progression
  assert.strictEqual(nf.next1h.rainfall_mm, 0.0, 'Next 1h is 0.0 mm');
  assert.strictEqual(nf.next3h.rainfall_mm, 0.0, 'Next 3h is 0.0 mm');
  assert.strictEqual(nf.next6h.rainfall_mm, 4.8, 'Next 6h is 4.8 mm');

  // Non-decreasing property holds strictly
  assert.ok(nf.next1h.rainfall_mm <= nf.next3h.rainfall_mm);
  assert.ok(nf.next3h.rainfall_mm <= nf.next6h.rainfall_mm);

  // Average rate
  assert.strictEqual(nf.next6h.rate_mmh, 0.8, 'Next 6h avg rate = 4.8 mm / 6h = 0.8 mm/h');
  assert.strictEqual(nf.next6h.timeRangeLabel, '08:00 - 14:00 IST (6h accumulation)');
});

// -----------------------------------------------------------------------------
// Case 3: Kusheshwar Asthan, Bihar (Gangetic Plain)
// Telemetry: all reported values zero
// -----------------------------------------------------------------------------
test('Case 3: Kusheshwar Asthan - Genuine dry weather across all intervals', () => {
  const kusheshwarCoords: [number, number] = [25.820, 86.150];
  const mockApi = createSyntheticOpenMeteoResponse({
    lat: kusheshwarCoords[0],
    lng: kusheshwarCoords[1],
    baseDate: '2026-10-25',
    currentHour: 15,
    currentPrecip: 0.0,
    currentRain: 0.0,
    currentShowers: 0.0,
    hourlyPrecipByOffsetFromCurrent: {
      0: 0.0,
      1: 0.0,
      2: 0.0,
      3: 0.0,
      4: 0.0,
      5: 0.0,
      6: 0.0,
    },
  });

  const parsed = parseOpenMeteoResponse(
    mockApi,
    'Kusheshwar Asthan (Bihar)',
    kusheshwarCoords[0],
    kusheshwarCoords[1]
  );

  assert.strictEqual(parsed.current.rainfall_mmh, 0.0, 'Current rain is 0 mm/h');
  assert.strictEqual(parsed.current.precipitationStatus, 'zero_dry', 'Status must be zero_dry');
  assert.strictEqual(parsed.pastRainfall?.last1h_mm, 0.0, 'Past 1h is 0.0 mm');
  assert.strictEqual(parsed.pastRainfall?.last3h_mm, 0.0, 'Past 3h is 0.0 mm');
  assert.strictEqual(parsed.pastRainfall?.last6h_mm, 0.0, 'Past 6h is 0.0 mm');
  assert.strictEqual(parsed.pastRainfall?.last24h_mm, 0.0, 'Past 24h is 0.0 mm');

  const nf = parsed.rainfallDiagnostics?.nearTermForecast;
  assert.ok(nf, 'Forecast exists');
  assert.strictEqual(nf.next1h.rainfall_mm, 0.0, 'Next 1h is 0.0 mm');
  assert.strictEqual(nf.next3h.rainfall_mm, 0.0, 'Next 3h is 0.0 mm');
  assert.strictEqual(nf.next6h.rainfall_mm, 0.0, 'Next 6h is 0.0 mm');
  assert.strictEqual(nf.next1h.rate_mmh, 0.0, 'Next 1h rate is 0.0 mm/h');
});

// -----------------------------------------------------------------------------
// Case 4: Majuli, Assam (Brahmaputra Flood Basin)
// Telemetry: all reported values zero
// -----------------------------------------------------------------------------
test('Case 4: Majuli, Assam - Verified dry post-monsoon conditions', () => {
  const majuliCoords: [number, number] = [26.963, 94.161];
  const mockApi = createSyntheticOpenMeteoResponse({
    lat: majuliCoords[0],
    lng: majuliCoords[1],
    baseDate: '2026-10-25',
    currentHour: 18,
    currentPrecip: 0.0,
    currentRain: 0.0,
    currentShowers: 0.0,
    hourlyPrecipByOffsetFromCurrent: {},
  });

  const parsed = parseOpenMeteoResponse(
    mockApi,
    'Majuli Riverine Island (Assam)',
    majuliCoords[0],
    majuliCoords[1]
  );

  assert.strictEqual(parsed.current.rainfall_mmh, 0.0);
  assert.strictEqual(parsed.current.precipitationStatus, 'zero_dry');
  assert.strictEqual(parsed.villageName, 'Majuli Riverine Island (Assam)');
  assert.strictEqual(parsed.rainfallDiagnostics?.nearTermForecast?.next1h.rainfall_mm, 0.0);
  assert.strictEqual(parsed.rainfallDiagnostics?.nearTermForecast?.next3h.rainfall_mm, 0.0);
  assert.strictEqual(parsed.rainfallDiagnostics?.nearTermForecast?.next6h.rainfall_mm, 0.0);
});

// -----------------------------------------------------------------------------
// Case 5: Guduru, Andhra Pradesh (Coastal Floodplain)
// Telemetry: current 0 mm/h; hourly forecast: [0.1, 0, 0, 1.9, 2.9, 0.9] mm
// Next 1h: 0.1 mm | Next 3h: 0.1 mm (avg 0.03 mm/h) | Next 6h: 5.8 mm (avg 0.97 mm/h)
// -----------------------------------------------------------------------------
test('Case 5: Guduru - [0.1, 0, 0, 1.9, 2.9, 0.9] mm precision rate validation', () => {
  const guduruCoords: [number, number] = [14.150, 79.850];
  const mockApi = createSyntheticOpenMeteoResponse({
    lat: guduruCoords[0],
    lng: guduruCoords[1],
    baseDate: '2026-10-25',
    currentHour: 14,
    currentPrecip: 0.0,
    currentRain: 0.0,
    currentShowers: 0.0,
    hourlyPrecipByOffsetFromCurrent: {
      0: 0.0,
      1: 0.1, // 14:00 - 15:00: 0.1 mm
      2: 0.0, // 15:00 - 16:00: 0.0 mm
      3: 0.0, // 16:00 - 17:00: 0.0 mm -> Next 3h = 0.1 mm
      4: 1.9, // 17:00 - 18:00: 1.9 mm
      5: 2.9, // 18:00 - 19:00: 2.9 mm
      6: 0.9, // 19:00 - 20:00: 0.9 mm -> Next 6h sum = 0.1 + 0 + 0 + 1.9 + 2.9 + 0.9 = 5.8 mm
    },
  });

  const parsed = parseOpenMeteoResponse(
    mockApi,
    'Guduru (Andhra Pradesh)',
    guduruCoords[0],
    guduruCoords[1]
  );

  assert.strictEqual(parsed.current.rainfall_mmh, 0.0, 'Guduru current rain is strictly 0 mm/h');
  const nf = parsed.rainfallDiagnostics?.nearTermForecast;
  assert.ok(nf);

  // Exact accumulations
  assert.strictEqual(nf.next1h.rainfall_mm, 0.1, 'Next 1h is 0.1 mm');
  assert.strictEqual(nf.next3h.rainfall_mm, 0.1, 'Next 3h is 0.1 mm');
  assert.strictEqual(nf.next6h.rainfall_mm, 5.8, 'Next 6h is 5.8 mm');

  // Precision rates: small positive rates must NEVER display as 0 mm/h
  assert.strictEqual(nf.next1h.rate_mmh, 0.1, 'Next 1h avg rate = 0.1 mm / 1h = 0.1 mm/h');
  assert.strictEqual(nf.next3h.rate_mmh, 0.03, 'Next 3h avg rate = 0.1 mm / 3h = 0.03 mm/h (NOT 0 mm/h)');
  assert.notStrictEqual(nf.next3h.rate_mmh, 0.0, 'Small positive rate must not be prematurely rounded down to 0.0');
  assert.strictEqual(nf.next6h.rate_mmh, 0.97, 'Next 6h avg rate = 5.8 mm / 6h = 0.97 mm/h (NOT 1 mm/h)');

  assert.strictEqual(nf.next1h.timeRangeLabel, '14:00 - 15:00 IST (1h accumulation)');
  assert.strictEqual(nf.next3h.timeRangeLabel, '14:00 - 17:00 IST (3h accumulation)');
  assert.strictEqual(nf.next6h.timeRangeLabel, '14:00 - 20:00 IST (6h accumulation)');
});

// -----------------------------------------------------------------------------
// Case 6: URL Builder Dynamic Coordinates Verification
// -----------------------------------------------------------------------------
test('Case 6: buildOpenMeteoForecastUrl strictly targets requested lat/lng', () => {
  const urlJoshimath = buildOpenMeteoForecastUrl(30.558, 79.564);
  assert.ok(urlJoshimath.includes('latitude=30.5580'), 'Joshimath latitude included');
  assert.ok(urlJoshimath.includes('longitude=79.5640'), 'Joshimath longitude included');
  assert.ok(urlJoshimath.includes('timezone=Asia%2FKolkata') || urlJoshimath.includes('timezone=Asia/Kolkata'));

  const urlGovind = buildOpenMeteoForecastUrl(11.980, 93.010);
  assert.ok(urlGovind.includes('latitude=11.9800'), 'Govind Nagar latitude included');
  assert.ok(urlGovind.includes('longitude=93.0100'), 'Govind Nagar longitude included');
});

// -----------------------------------------------------------------------------
// Case 7: Hydrological Flood Simulation Solver Coupling
// Verifies solver execution when driving with:
// (A) Forecast peak rainfall (e.g. Govind Nagar 4.8 mm in squall)
// (B) Custom design storm (e.g. 65 mm/h extreme monsoon cloudburst)
// -----------------------------------------------------------------------------
test('Case 7: Flood Simulation Engine accepts Forecast Peak vs Custom Design Storm', async () => {
  const village: VillageDataset = {
    ...DEMO_VILLAGE,
    elevation_m: 12.0,
  };

  // Scenario A: Forecast Peak Driven (4.8 mm/h storm over 3 hours)
  const forecastConfig: SimulationConfig = {
    scenario: 'baseline',
    rainfallIntensity_mmh: 4.8, // from nearTermForecast
    rainfallDuration_hours: 3,
    tideOutfallCondition: 'normal',
    infiltrationRate_mmh: 6.0, // Infiltration exceeds 4.8 mm/h
    soilType: 'alluvial_clay',
    runoffCoefficient: 0.45,
    desiltingFactor: 1.0,
    rainfallSource: 'weather_forecast',
  };

  const resultForecast = await defaultSimulationEngine.runSimulation(village, forecastConfig);
  // Because 4.8 mm/h < 6.0 mm/h infiltration, overland flood depth is 0.0m
  assert.strictEqual(
    resultForecast.peakDepth_m,
    0.0,
    'Forecast peak of 4.8 mm/h is safely absorbed by 6.0 mm/h soil infiltration'
  );

  // Scenario B: User-defined Custom Design Storm (65 mm/h cloudburst)
  const customConfig: SimulationConfig = {
    scenario: 'baseline',
    rainfallIntensity_mmh: 65.0, // High cloudburst
    rainfallDuration_hours: 4,
    tideOutfallCondition: 'normal',
    infiltrationRate_mmh: 6.0,
    soilType: 'alluvial_clay',
    runoffCoefficient: 0.45,
    desiltingFactor: 1.0,
    rainfallSource: 'custom',
  };

  const resultCustom = await defaultSimulationEngine.runSimulation(village, customConfig);
  // Excess rainfall = 65 - 6 = 59 mm/h generates substantial pluvial ponding
  assert.ok(
    resultCustom.peakDepth_m > 0.15,
    `Custom 65 mm/h storm creates significant inundation (peak depth: ${resultCustom.peakDepth_m}m)`
  );
  assert.ok(
    resultCustom.maxInundatedArea_ha > 0,
    `Inundated area must be positive (area: ${resultCustom.maxInundatedArea_ha} ha)`
  );
});

console.log('All test specifications configured for openMeteoRainfallForecastAudit.test.ts');
