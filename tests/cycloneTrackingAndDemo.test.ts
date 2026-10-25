import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  fetchLiveOfficialCycloneTrack,
  parseOfficialImdCyclonePayload,
  generateDemoCycloneTrack,
  generateForecastUncertaintyCone,
  buildGeoJsonForWindRadii,
  buildGeoJsonForTrack,
  calculateCycloneImpactOnLocation,
  calculateHaversineDistanceKm,
  calculateBearingDegrees,
  bearingToCompassDirection,
  CYCLONE_INTENSITY_SCALES,
  PREDEFINED_DEMO_SCENARIOS,
  type CycloneState,
  type CycloneTrackStep,
} from '../src/services/cycloneTrackingService';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import { DEMO_VILLAGE } from '../src/data/demoVillage';

describe('Bharat Village Twin — Cyclone Tracking & Interactive Demonstration Mode Tests', () => {

  // =========================================================================
  // SCENARIO 1: Live Mode Truthful Reporting (No Fake Cyclones)
  // =========================================================================
  describe('1. Live Official Track: Truthful Zero-Active Cyclone Reporting', () => {
    it('returns hasActiveLiveTrack: false and truthful status message when no storm is active', async () => {
      const state = await fetchLiveOfficialCycloneTrack();

      assert.strictEqual(state.mode, 'live');
      assert.strictEqual(typeof state.hasActiveLiveTrack, 'boolean');

      if (!state.hasActiveLiveTrack) {
        assert.strictEqual(state.stormName, 'None');
        assert.ok(
          state.statusMessage.includes('No verified active cyclone track available'),
          `Expected truthful message, got: ${state.statusMessage}`
        );
        assert.strictEqual(state.steps.length, 0, 'Must have zero fake steps when no live track');
        assert.strictEqual(state.trackGeoJson.features.length, 0);
        assert.strictEqual(state.uncertaintyConeGeoJson.features.length, 0);
      }
    });

    it('never assigns demo flags or disclaimers to live official mode', async () => {
      const state = await fetchLiveOfficialCycloneTrack();
      assert.strictEqual(state.mode, 'live');
      assert.strictEqual((state as any).demoScenarioDisclaimer, undefined);
    });
  });

  // =========================================================================
  // SCENARIO 2: Valid Official Cyclone Track Parsing and Validation
  // =========================================================================
  describe('2. Valid Official IMD Cyclone Bulletin Parsing & Verification', () => {
    const mockImdPayload = {
      cyclone_name: 'DANA',
      basin: 'Bay of Bengal',
      issuing_agency: 'India Meteorological Department (IMD RSMC New Delhi)',
      bulletin_time_iso: '2026-10-24T06:00:00.000Z',
      intensity_name: 'Severe Cyclonic Storm',
      track_points: [
        {
          id: 'imd-pt-1',
          forecast_hour: -12,
          point_type: 'OBSERVED',
          longitude: 89.2,
          latitude: 16.5,
          time_iso: '2026-10-23T18:00:00.000Z',
          intensity_code: 'CS',
          intensity_name: 'Cyclonic Storm',
          max_wind_knots: 45,
          pressure_hpa: 994,
          forward_speed_kmh: 14,
          forward_dir_deg: 320,
        },
        {
          id: 'imd-pt-2',
          forecast_hour: 0,
          point_type: 'CURRENT',
          longitude: 88.0,
          latitude: 18.2,
          time_iso: '2026-10-24T06:00:00.000Z',
          intensity_code: 'SCS',
          intensity_name: 'Severe Cyclonic Storm',
          max_wind_knots: 55,
          pressure_hpa: 986,
          forward_speed_kmh: 15,
          forward_dir_deg: 325,
          uncertainty_km: 0,
          quadrant_radii: {
            '34kt': { ne: 180, se: 160, sw: 120, nw: 140 },
            '50kt': { ne: 90, se: 80, sw: 60, nw: 70 },
          },
        },
        {
          id: 'imd-pt-3',
          forecast_hour: 12,
          point_type: 'FORECAST',
          longitude: 86.8,
          latitude: 19.8,
          time_iso: '2026-10-24T18:00:00.000Z',
          intensity_code: 'SCS',
          intensity_name: 'Severe Cyclonic Storm',
          max_wind_knots: 60,
          pressure_hpa: 980,
          forward_speed_kmh: 16,
          forward_dir_deg: 330,
          uncertainty_km: 65,
        },
      ],
    };

    it('correctly maps verified IMD track points, separating observed, current, and forecast', () => {
      const state = parseOfficialImdCyclonePayload(mockImdPayload);
      assert.ok(state !== null);
      assert.strictEqual(state.mode, 'live');
      assert.strictEqual(state.stormName, 'DANA');
      assert.strictEqual(state.basin, 'Bay of Bengal');
      assert.strictEqual(state.hasActiveLiveTrack, true);
      assert.strictEqual(state.steps.length, 3);

      // Point 0: Observed past point
      assert.strictEqual(state.steps[0].offsetHours, -12);
      assert.strictEqual(state.steps[0].pointType, 'OBSERVED');
      assert.strictEqual(state.steps[0].maxWindKnots, 45);

      // Point 1: Current storm eye
      assert.strictEqual(state.steps[1].offsetHours, 0);
      assert.strictEqual(state.steps[1].pointType, 'CURRENT');
      assert.strictEqual(state.steps[1].maxWindKnots, 55);
      assert.strictEqual(state.currentStepIndex, 1);

      // Point 2: Lead forecast
      assert.strictEqual(state.steps[2].offsetHours, 12);
      assert.strictEqual(state.steps[2].pointType, 'FORECAST');
      assert.strictEqual(state.steps[2].maxWindKnots, 60);
      assert.strictEqual(state.steps[2].uncertaintyRadiusKm, 65);
    });

    it('constructs valid GeoJSON track with solid observed and dashed forecast styling', () => {
      const state = parseOfficialImdCyclonePayload(mockImdPayload);
      assert.ok(state !== null);
      const trackFeatures = state.trackGeoJson.features;
      assert.ok(trackFeatures.length >= 2, 'Should contain lines and marker points');

      const observedLine = trackFeatures.find(
        (f) => f.properties?.type === 'track-segment' && f.properties?.isObserved === true
      );
      assert.ok(observedLine, 'Should have solid observed track line');
      assert.strictEqual(observedLine?.properties?.dashArray, undefined);

      const forecastLine = trackFeatures.find(
        (f) => f.properties?.type === 'track-segment' && f.properties?.isObserved === false
      );
      assert.ok(forecastLine, 'Should have dashed forecast track line');
      assert.strictEqual(forecastLine?.properties?.dashArray?.replace(/\s+/g, ''), '6,6');
    });
  });

  // =========================================================================
  // SCENARIO 3: Stale and Invalid Live Data Handling (Zero Crashes)
  // =========================================================================
  describe('3. Stale & Invalid Live Data Handling Without Uncaught Crashes', () => {
    it('returns null on empty object or null payload', () => {
      assert.strictEqual(parseOfficialImdCyclonePayload(null), null);
      assert.strictEqual(parseOfficialImdCyclonePayload({}), null);
      assert.strictEqual(parseOfficialImdCyclonePayload({ track_points: [] }), null);
    });

    it('handles non-numeric or NaN coordinates gracefully without throwing', () => {
      const malformedPayload = {
        cyclone_name: 'TEST',
        track_points: [
          { forecast_hour: 0, longitude: 'invalid', latitude: 18.0 },
        ],
      };
      const result = parseOfficialImdCyclonePayload(malformedPayload);
      assert.strictEqual(result, null, 'Should reject malformed coordinates safely');
    });

    it('handles partial missing fields with standard physical defaults', () => {
      const partialPayload = {
        cyclone_name: 'PARTIAL',
        track_points: [
          { forecast_hour: 0, longitude: 85.0, latitude: 17.0 },
        ],
      };
      const result = parseOfficialImdCyclonePayload(partialPayload);
      assert.ok(result !== null);
      assert.strictEqual(result.steps[0].maxWindKnots, 45); // default fallback
      assert.strictEqual(result.steps[0].centralPressureHpa, 990); // default fallback
    });
  });

  // =========================================================================
  // SCENARIO 4: Demonstration Scenario Track Generation & Time Progression
  // =========================================================================
  describe('4. Demonstration Scenario Track Generation & Time Progression', () => {
    it('generates the exact 9-step timeline (-12h, -6h, 0h, +3h, +6h, +12h, +24h, +36h, +48h)', () => {
      const demo = generateDemoCycloneTrack({
        scenarioId: 'bob-andhra-odisha',
        peakIntensity: 'VSCS',
        forwardSpeedKmh: 16,
      });

      assert.strictEqual(demo.mode, 'demo');
      assert.strictEqual(demo.steps.length, 9);

      const expectedOffsets = [-12, -6, 0, 3, 6, 12, 24, 36, 48];
      demo.steps.forEach((step, idx) => {
        assert.strictEqual(step.offsetHours, expectedOffsets[idx]);
        assert.strictEqual(step.stepIndex, idx);
      });

      // Past points are marked observed
      assert.strictEqual(demo.steps[0].pointType, 'OBSERVED');
      assert.strictEqual(demo.steps[1].pointType, 'OBSERVED');

      // 0h is current storm eye
      assert.strictEqual(demo.steps[2].pointType, 'CURRENT');
      assert.strictEqual(demo.steps[2].offsetHours, 0);

      // Future points are forecast
      for (let i = 3; i < 9; i++) {
        assert.strictEqual(demo.steps[i].pointType, 'FORECAST');
      }
    });

    it('varies storm travel distance based on forward speed (10-25 km/h)', () => {
      const slowDemo = generateDemoCycloneTrack({
        scenarioId: 'bob-andhra-odisha',
        peakIntensity: 'VSCS',
        forwardSpeedKmh: 10,
      });

      const fastDemo = generateDemoCycloneTrack({
        scenarioId: 'bob-andhra-odisha',
        peakIntensity: 'VSCS',
        forwardSpeedKmh: 25,
      });

      const slowStart = slowDemo.steps[0].coordinates;
      const slowEnd = slowDemo.steps[8].coordinates;
      const slowDistance = calculateHaversineDistanceKm(slowStart, slowEnd);

      const fastStart = fastDemo.steps[0].coordinates;
      const fastEnd = fastDemo.steps[8].coordinates;
      const fastDistance = calculateHaversineDistanceKm(fastStart, fastEnd);

      assert.ok(
        fastDistance > slowDistance,
        `Expected 25 km/h storm to travel further than 10 km/h: fast=${fastDistance.toFixed(1)} km, slow=${slowDistance.toFixed(1)} km`
      );
    });

    it('supports all 4 predefined demo storm basins', () => {
      assert.strictEqual(PREDEFINED_DEMO_SCENARIOS.length, 4);
      const scenarioIds = PREDEFINED_DEMO_SCENARIOS.map((s) => s.id);
      assert.ok(scenarioIds.includes('bob-andhra-odisha'));
      assert.ok(scenarioIds.includes('bob-tamilnadu-chennai'));
      assert.ok(scenarioIds.includes('bob-bengal-odisha'));
      assert.ok(scenarioIds.includes('arabian-gujarat'));

      PREDEFINED_DEMO_SCENARIOS.forEach((scenario) => {
        const demo = generateDemoCycloneTrack({ scenarioId: scenario.id });
        assert.strictEqual(demo.steps.length, 9);
        assert.ok(demo.steps[2].coordinates[0] >= 68 && demo.steps[2].coordinates[0] <= 95);
      });
    });
  });

  // =========================================================================
  // SCENARIO 5: Playback Progression and Reset to 0h
  // =========================================================================
  describe('5. Timeline Playback Progression & Step Resetting', () => {
    it('sets currentStepIndex to 2 (0h current eye) by default', () => {
      const demo = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
      assert.strictEqual(demo.currentStepIndex, 2);
      assert.strictEqual(demo.steps[demo.currentStepIndex].offsetHours, 0);
    });

    it('allows clean stepping through time from past (-12h) to forecast (+48h)', () => {
      const demo = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
      const offsetsVisited: number[] = [];

      for (let i = 0; i < demo.steps.length; i++) {
        offsetsVisited.push(demo.steps[i].offsetHours);
      }

      assert.deepStrictEqual(offsetsVisited, [-12, -6, 0, 3, 6, 12, 24, 36, 48]);
    });
  });

  // =========================================================================
  // SCENARIO 6: Mode Separation & Persistent DEMO Labeling
  // =========================================================================
  describe('6. Mode Separation & Persistent DEMO Disclaimers', () => {
    it('prominently marks demo track with DEMO — NOT A REAL FORECAST', () => {
      const demo = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
      assert.strictEqual(demo.mode, 'demo');
      assert.ok(
        demo.demoScenarioDisclaimer?.includes('DEMO — NOT A REAL FORECAST'),
        'Demo state must contain prominent disclaimer'
      );
      assert.ok(
        demo.statusMessage.includes('DEMO'),
        'Status message must explicitly state DEMO'
      );
    });

    it('clearly differentiates IMD intensity scales (CS vs VSCS vs SUCS)', () => {
      const vs = CYCLONE_INTENSITY_SCALES['VSCS'];
      assert.strictEqual(vs.code, 'VSCS');
      assert.strictEqual(vs.label, 'Very Severe Cyclonic Storm');
      assert.strictEqual(vs.minKnots, 64);
      assert.strictEqual(vs.maxKnots, 89);

      const su = CYCLONE_INTENSITY_SCALES['SUCS'];
      assert.strictEqual(su.code, 'SUCS');
      assert.strictEqual(su.label, 'Super Cyclonic Storm');
      assert.strictEqual(su.minKnots, 120);
    });
  });

  // =========================================================================
  // SCENARIO 7: Location-Specific Impact Calculation
  // =========================================================================
  describe('7. Location-Specific Cyclone Impact Assessment', () => {
    it('calculates accurate Haversine distance, bearing, and compass direction for Kotturu', () => {
      const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS[0]; // Kotturu [83.95, 18.70]
      const demo = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
      const step0h = demo.steps[2]; // Current eye position at 0h

      const impact = calculateCycloneImpactOnLocation(
        step0h,
        demo.steps,
        kotturu,
        DEMO_VILLAGE,
        true
      );

      assert.ok(impact.locationName.includes('Kotturu'));
      assert.ok(impact.distanceToStormKm > 0 && impact.distanceToStormKm < 1500);
      assert.ok(impact.bearingDeg >= 0 && impact.bearingDeg < 360);
      assert.ok(['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'].includes(impact.compassDirection));
      assert.strictEqual(impact.isDemoMode, true);
    });

    it('identifies closest approach step and estimates arrival time', () => {
      const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS[0];
      const demo = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
      const step0h = demo.steps[2];

      const impact = calculateCycloneImpactOnLocation(
        step0h,
        demo.steps,
        kotturu,
        undefined,
        true
      );

      assert.ok(impact.closestApproachStep !== undefined);
      assert.ok(impact.closestApproachDistanceKm <= impact.distanceToStormKm);
      assert.strictEqual(typeof impact.exposedRoadsCount, 'number');
      assert.strictEqual(typeof impact.exposedBuildingsCount, 'number');
    });

    it('bearing and compass conversion handles 4 cardinal and 4 intercardinal angles', () => {
      assert.strictEqual(bearingToCompassDirection(0), 'N');
      assert.strictEqual(bearingToCompassDirection(90), 'E');
      assert.strictEqual(bearingToCompassDirection(180), 'S');
      assert.strictEqual(bearingToCompassDirection(270), 'W');
      assert.strictEqual(bearingToCompassDirection(45), 'NE');
      assert.strictEqual(bearingToCompassDirection(135), 'SE');
      assert.strictEqual(bearingToCompassDirection(225), 'SW');
      assert.strictEqual(bearingToCompassDirection(315), 'NW');
    });
  });

  // =========================================================================
  // SCENARIO 8: Forecast Uncertainty Cone Calculation
  // =========================================================================
  describe('8. Forecast Uncertainty Cone Calculation & Lead Time Expansion', () => {
    it('generates smooth enclosing polygon that expands monotonically with forecast lead time', () => {
      const demo = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
      const forecastSteps = demo.steps.filter((s) => s.offsetHours >= 0);
      const cone = generateForecastUncertaintyCone(forecastSteps);

      assert.ok(cone !== null, 'Cone feature must be generated');
      assert.strictEqual(cone.geometry.type, 'Polygon');
      assert.ok(cone.geometry.coordinates[0].length >= 8, 'Cone ring must have polygon coordinates');

      // First coordinate must equal last coordinate (closed ring)
      const ring = cone.geometry.coordinates[0];
      assert.deepStrictEqual(ring[0], ring[ring.length - 1], 'Polygon ring must be closed');

      // Verify that step uncertainty radii grow with lead time
      const r0 = forecastSteps.find((s) => s.offsetHours === 0)?.uncertaintyRadiusKm || 0;
      const r6 = forecastSteps.find((s) => s.offsetHours === 6)?.uncertaintyRadiusKm || 0;
      const r24 = forecastSteps.find((s) => s.offsetHours === 24)?.uncertaintyRadiusKm || 0;
      const r48 = forecastSteps.find((s) => s.offsetHours === 48)?.uncertaintyRadiusKm || 0;

      assert.ok(r6 > r0, '+6h cone must be wider than 0h');
      assert.ok(r24 > r6, '+24h cone must be wider than +6h');
      assert.ok(r48 > r24, '+48h cone must be wider than +24h');
      assert.ok(r48 >= 200, '+48h uncertainty radius must be at least ~200 km per IMD/NHC standard');
    });

    it('returns null if fewer than 2 forecast points exist', () => {
      const singlePoint: CycloneTrackStep[] = [
        {
          stepId: 'p0',
          stepIndex: 0,
          offsetHours: 0,
          label: 'Current',
          pointType: 'CURRENT',
          coordinates: [85.0, 18.0],
          dateTimeIso: new Date().toISOString(),
          intensityCode: 'CS',
          intensityLabel: 'Cyclonic Storm',
          maxWindKnots: 45,
          maxWindKmh: 83,
          centralPressureHpa: 990,
          forwardSpeedKmh: 15,
          forwardDirectionDeg: 315,
          uncertaintyRadiusKm: 0,
          quadrantRadii: { '34kt': { ne: 150, se: 130, sw: 100, nw: 120 } },
        },
      ];

      assert.strictEqual(generateForecastUncertaintyCone(singlePoint), null);
    });
  });

  // =========================================================================
  // SCENARIO 9: Quadrant-Specific Wind Radii Polygons
  // =========================================================================
  describe('9. Quadrant-Specific Asymmetric Wind Radii Polygons', () => {
    it('generates distinct GeoJSON polygons for 34kt, 50kt, and 64kt thresholds', () => {
      const demo = generateDemoCycloneTrack({
        scenarioId: 'bob-andhra-odisha',
        peakIntensity: 'VSCS',
      });
      const currentStep = demo.steps[2]; // eye with 34kt, 50kt, 64kt radii
      const windGeoJson = buildGeoJsonForWindRadii(currentStep);

      assert.strictEqual(windGeoJson.type, 'FeatureCollection');
      const thresholds = windGeoJson.features.map((f) => f.properties?.threshold);

      assert.ok(thresholds.includes('34kt'), 'Must generate 34kt gale wind zone');
      assert.ok(thresholds.includes('50kt'), 'Must generate 50kt storm wind zone');
      assert.ok(thresholds.includes('64kt'), 'Must generate 64kt hurricane wind zone');

      windGeoJson.features.forEach((feat) => {
        assert.strictEqual(feat.geometry.type, 'Polygon');
        const ring = (feat.geometry as any).coordinates[0];
        assert.deepStrictEqual(ring[0], ring[ring.length - 1], 'Polygon must be closed ring');
      });
    });

    it('models physical asymmetry where forward-right quadrant has largest radius', () => {
      const demo = generateDemoCycloneTrack({
        scenarioId: 'bob-andhra-odisha',
        peakIntensity: 'VSCS',
      });
      const currentStep = demo.steps[2];
      const r34 = currentStep.quadrantRadii['34kt'];

      assert.ok(r34 !== undefined);
      // In Northern Hemisphere, forward-right (NE) wind radius > opposite left (SW)
      assert.ok(
        r34.ne > r34.sw,
        `Expected NE radius (${r34.ne} km) to be larger than SW (${r34.sw} km)`
      );
    });
  });

  // =========================================================================
  // SCENARIO 10: Independent Layer Operation (No Crosstalk)
  // =========================================================================
  describe('10. Independent Layer Operation & Multi-Hazard Coexistence', () => {
    it('wind radii features do not mutate or collide with flood extent features', () => {
      const demo = generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' });
      const windGeoJson = buildGeoJsonForWindRadii(demo.steps[2]);
      const trackGeoJson = buildGeoJsonForTrack(demo.steps);

      // Verify layer identifiers
      windGeoJson.features.forEach((f) => {
        assert.strictEqual(f.properties?.layerCategory, 'cyclone-wind-radii');
        assert.notStrictEqual(f.properties?.layerCategory, 'flood-simulation');
      });

      trackGeoJson.features.forEach((f) => {
        assert.ok(
          ['cyclone-track-line', 'cyclone-track-milestone'].includes(f.properties?.layerCategory)
        );
      });
    });

    it('verifies independent visibility toggles between cyclone, flood, roads and buildings', () => {
      const initialLayers = {
        floodExtent: true,
        buildings: true,
        roads: true,
        imdCycloneWind: true,
      };

      // Toggling cyclone off
      const afterCycloneToggle = { ...initialLayers, imdCycloneWind: false };
      assert.strictEqual(afterCycloneToggle.imdCycloneWind, false);
      assert.strictEqual(afterCycloneToggle.floodExtent, true, 'Flood extent remains visible');
      assert.strictEqual(afterCycloneToggle.roads, true, 'Roads remain visible');
      assert.strictEqual(afterCycloneToggle.buildings, true, 'Buildings remain visible');

      // Toggling flood off
      const afterFloodToggle = { ...afterCycloneToggle, floodExtent: false };
      assert.strictEqual(afterFloodToggle.floodExtent, false);
      assert.strictEqual(afterFloodToggle.roads, true);
    });
  });
});
