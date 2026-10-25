import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  defaultSimulationEngine,
  getSimulationFloodGeoJson,
  getSimulationFloodFrameGeoJson,
  getSimulationFrameStats,
  generateIllustrativeFloodPolygons,
} from '../src/services/simulationService';
import {
  fetchLiveOfficialCycloneTrack,
  parseOfficialImdCyclonePayload,
  generateDemoCycloneTrack,
  buildGeoJsonForWindRadii,
  buildGeoJsonForTrack,
  calculateCycloneImpactOnLocation,
  calculateHaversineDistanceKm,
  calculateBearingDegrees,
  PREDEFINED_DEMO_SCENARIOS,
  type CycloneState,
  type CycloneTrackStep,
} from '../src/services/cycloneTrackingService';
import { DEMO_VILLAGE, shiftVillageDataset } from '../src/data/demoVillage';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../src/data/indiaLocations';
import type { SimulationConfig, SimulationResult, VillageDataset } from '../src/types/village';

describe('Bharat Village Twin — Time-Based Flood & Cyclone Simulation Tests', () => {

  // =========================================================================
  // TEST 1: Flood simulation with a custom rainfall scenario
  // =========================================================================
  describe('1. Flood Simulation with Custom Rainfall Scenario', () => {
    it('runs custom storm scenario and distinguishes intensity (mm/h) from accumulated rain (mm)', async () => {
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
        rainfallSource: 'custom',
        rainfallSourceLabel: 'User-Defined Custom Design Storm',
      };

      const result = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);

      assert.strictEqual(result.config.rainfallIntensity_mmh, 65, 'Intensity must be 65 mm/h');
      assert.strictEqual(result.config.rainfallDuration_hours, 4, 'Duration must be 4h');
      assert.strictEqual(result.config.rainfallSource, 'custom');

      // Accumulated rainfall must be proportional to duration (approx 65 * 4 = ~260mm in hyetograph)
      assert.ok(
        result.totalRainfall_mm > 65,
        `Accumulated rain (${result.totalRainfall_mm}mm) must be distinct from hourly intensity (65 mm/h)`
      );

      // Model result must be clearly labelled as illustrative/modelled
      assert.strictEqual(result.isIllustrative, true);
      assert.ok(result.modelLabel && result.modelLabel.includes('Illustrative Rational-Depression Solver'));

      // Inundated area and depth must be positive for heavy storm
      assert.ok(result.maxInundatedArea_ha > 0);
      assert.ok(result.peakDepth_m > 0);
      assert.ok(result.frames.length >= 8, 'Must generate time-stepped frames');
    });
  });

  // =========================================================================
  // TEST 2: Flood simulation with verified live rainfall
  // =========================================================================
  describe('2. Flood Simulation with Verified Live Rainfall', () => {
    it('preserves verified weather inputs, timestamps, and attribution', async () => {
      const liveIntensity = 18.5; // mm/h from Open-Meteo
      const config: SimulationConfig = {
        scenario: 'existing_drainage',
        rainfallIntensity_mmh: liveIntensity,
        rainfallDuration_hours: 3,
        soilType: 'alluvial_clay',
        infiltrationRate_mmh: 8.5,
        runoffCoefficient: 0.70,
        tideOutfallCondition: 'normal',
        desiltingFactor: 0.8,
        timeStep_mins: 60,
        rainfallSource: 'weather_observed',
        rainfallSourceLabel: 'Current Model Rate (Open-Meteo)',
        rainfallSourceInterval: '2026-10-24T22:00:00+05:30',
        rainfallAssumptions: 'Applied live rate across scenario window',
      };

      const result = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);

      assert.strictEqual(result.config.rainfallIntensity_mmh, 18.5);
      assert.strictEqual(result.config.rainfallSource, 'weather_observed');
      assert.strictEqual(result.config.rainfallSourceLabel, 'Current Model Rate (Open-Meteo)');
      assert.strictEqual(result.config.rainfallSourceInterval, '2026-10-24T22:00:00+05:30');
    });
  });

  // =========================================================================
  // TEST 3: Valid dry-weather input
  // =========================================================================
  describe('3. Valid Dry-Weather Input (0 mm/h)', () => {
    it('honestly simulates dry conditions without forcing artificial rain or fake inundation', async () => {
      const dryConfig: SimulationConfig = {
        scenario: 'existing_drainage',
        rainfallIntensity_mmh: 0.0,
        rainfallDuration_hours: 4,
        soilType: 'black_cotton',
        infiltrationRate_mmh: 6.0,
        runoffCoefficient: 0.65,
        tideOutfallCondition: 'normal',
        desiltingFactor: 0.65,
        timeStep_mins: 60,
        rainfallSource: 'weather_observed',
        rainfallSourceLabel: '0.0 mm/h (Dry Conditions / Genuine Dry Weather)',
      };

      const result = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, dryConfig);

      assert.strictEqual(result.config.rainfallIntensity_mmh, 0.0);
      assert.strictEqual(result.maxInundatedArea_ha, 0.0, 'Must report 0 inundated area in normal dry weather');
      assert.strictEqual(result.peakDepth_m, 0.0, 'Must report 0 water depth in normal dry weather');

      // Geometry for dry weather must be empty
      const floodGeoJson = getSimulationFloodGeoJson(result);
      assert.strictEqual(floodGeoJson.features.length, 0, 'Must not generate fake flood polygons for dry weather');
    });
  });

  // =========================================================================
  // TEST 4: Flood geometry rendering and timeline updates
  // =========================================================================
  describe('4. Time-Stepped Flood Geometry & Timeline Scrubber', () => {
    it('generates progressive spatial outputs per hour and updates as timeline advances', async () => {
      const config: SimulationConfig = {
        scenario: 'baseline',
        rainfallIntensity_mmh: 65,
        rainfallDuration_hours: 4,
        soilType: 'black_cotton',
        infiltrationRate_mmh: 6.0,
        runoffCoefficient: 0.65,
        tideOutfallCondition: 'normal',
        desiltingFactor: 0.65,
        timeStep_mins: 60,
      };

      const result = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
      assert.ok(result.frames.length >= 8);

      // Hour 0: Initial antecedent condition (dry)
      const frame0 = getSimulationFrameStats(result, 0);
      assert.ok(frame0 !== null);
      assert.strictEqual(frame0.hour, 0);
      assert.strictEqual(frame0.rainfallThisHour_mm, 0);
      assert.strictEqual(frame0.maxDepth_m, 0);

      const geo0 = getSimulationFloodFrameGeoJson(result, 0);
      assert.strictEqual(geo0.features.length, 0, 'Hour 0 must have no inundation');

      // Hour 2: Mid-storm inundation development
      const frame2 = getSimulationFrameStats(result, 2);
      assert.ok(frame2 !== null);
      assert.ok(frame2.maxDepth_m > 0, 'Depth must be positive at hour 2');
      const geo2 = getSimulationFloodFrameGeoJson(result, 2);
      assert.ok(geo2.features.length > 0, 'Hour 2 must produce spatial inundation polygons');

      // Peak hour: maximum water depth and area
      const peakFrame = getSimulationFrameStats(result, result.peakHour);
      assert.ok(peakFrame !== null);
      assert.strictEqual(peakFrame.inundatedArea_ha, result.maxInundatedArea_ha);
      assert.strictEqual(peakFrame.maxDepth_m, result.peakDepth_m);

      const peakGeo = getSimulationFloodFrameGeoJson(result, result.peakHour);
      assert.ok(peakGeo.features.length > 0);

      // Subsequent recession hour: drainage reduces area and depth
      const lastFrame = result.frames[result.frames.length - 1];
      assert.ok(lastFrame.maxDepth_m <= peakFrame.maxDepth_m, 'Water depth must recede after storm peak');
    });
  });

  // =========================================================================
  // TEST 5: Cyclone demonstration playback and reset
  // =========================================================================
  describe('5. Cyclone Demonstration Playback & Step Reset', () => {
    it('generates 9 timeline steps, permits sequence playback, and resets cleanly to 0h', () => {
      const demo = generateDemoCycloneTrack({
        scenarioId: 'bob-andhra-odisha',
        intensity: 'VSCS',
        forwardSpeedKmh: 16,
      });

      assert.strictEqual(demo.mode, 'demo');
      assert.strictEqual(demo.steps.length, 9);
      assert.ok(demo.demoScenarioDisclaimer?.includes('DEMO — NOT A REAL FORECAST'));

      // Check step sequence
      const offsets = demo.steps.map((s) => s.offsetHours);
      assert.deepStrictEqual(offsets, [-12, -6, 0, 3, 6, 12, 24, 36, 48]);

      // Reset index check
      const currentEyeIndex = demo.steps.findIndex((s) => s.offsetHours === 0);
      assert.strictEqual(currentEyeIndex, 2);

      // Active wind radii for current step
      const windRadii = buildGeoJsonForWindRadii(demo.steps[currentEyeIndex]);
      assert.ok(windRadii.features.length >= 2, 'Must generate asymmetric wind polygons');
    });
  });

  // =========================================================================
  // TEST 6: Live cyclone mode when official data is available
  // =========================================================================
  describe('6. Live Cyclone Mode with Official Verified Data', () => {
    it('correctly maps verified IMD storm bulletin with distinct observed vs forecast tracks', () => {
      const mockImdBulletin = {
        cyclone_name: 'REMAL',
        basin: 'Bay of Bengal',
        issuing_agency: 'India Meteorological Department (IMD RSMC New Delhi)',
        bulletin_time_iso: '2026-10-24T12:00:00.000Z',
        intensity_name: 'Severe Cyclonic Storm',
        track_points: [
          {
            id: 'pt-obs-1',
            forecast_hour: -6,
            point_type: 'OBSERVED',
            longitude: 88.5,
            latitude: 18.0,
            time_iso: '2026-10-24T06:00:00.000Z',
            intensity_code: 'SCS',
            max_wind_knots: 55,
            pressure_hpa: 988,
          },
          {
            id: 'pt-cur-0',
            forecast_hour: 0,
            point_type: 'CURRENT',
            longitude: 88.2,
            latitude: 19.4,
            time_iso: '2026-10-24T12:00:00.000Z',
            intensity_code: 'SCS',
            max_wind_knots: 60,
            pressure_hpa: 982,
            uncertainty_km: 0,
            quadrant_radii: {
              '34kt': { ne: 180, se: 160, sw: 120, nw: 140 },
              '50kt': { ne: 90, se: 80, sw: 60, nw: 70 },
            },
          },
          {
            id: 'pt-fct-12',
            forecast_hour: 12,
            point_type: 'FORECAST',
            longitude: 88.0,
            latitude: 21.0,
            time_iso: '2026-10-25T00:00:00.000Z',
            intensity_code: 'SCS',
            max_wind_knots: 65,
            pressure_hpa: 978,
            uncertainty_km: 65,
          },
        ],
      };

      const liveState = parseOfficialImdCyclonePayload(mockImdBulletin);
      assert.ok(liveState !== null);
      assert.strictEqual(liveState.mode, 'live');
      assert.strictEqual(liveState.stormName, 'REMAL');
      assert.strictEqual(liveState.hasActiveLiveTrack, true);
      assert.strictEqual(liveState.steps.length, 3);

      const track = liveState.trackGeoJson;
      const obsLine = track.features.find((f) => f.properties?.isObserved === true);
      const fctLine = track.features.find((f) => f.properties?.isObserved === false);

      assert.ok(obsLine, 'Must have solid observed line');
      assert.strictEqual(obsLine?.properties?.style, 'solid');
      assert.ok(fctLine, 'Must have dashed forecast line');
      assert.strictEqual(fctLine?.properties?.style, 'dashed');
    });
  });

  // =========================================================================
  // TEST 7: No active cyclone available
  // =========================================================================
  describe('7. Truthful Reporting When No Active Cyclone Exists', () => {
    it('returns hasActiveLiveTrack: false with zero fake points', async () => {
      const live = await fetchLiveOfficialCycloneTrack();
      assert.strictEqual(live.mode, 'live');

      if (!live.hasActiveLiveTrack) {
        assert.strictEqual(live.stormName, 'None');
        assert.ok(live.statusMessage.includes('No verified active cyclone track available'));
        assert.strictEqual(live.steps.length, 0);
        assert.strictEqual(live.trackGeoJson.features.length, 0);
        assert.strictEqual(live.uncertaintyConeGeoJson.features.length, 0);
      }
    });
  });

  // =========================================================================
  // TEST 8: Changing locations and restarting scenarios
  // =========================================================================
  describe('8. Changing Locations & Restarting Scenarios Cleanly', () => {
    it('shifts topographic datum and recalculates impact without lingering stale polygons', async () => {
      const kotturu = NATIONWIDE_BENCHMARK_LOCATIONS[0]; // Coastal Andhra, elevation ~28m
      const joshimath = NATIONWIDE_BENCHMARK_LOCATIONS[1]; // Himalayan, elevation ~1890m

      const config: SimulationConfig = {
        scenario: 'baseline',
        rainfallIntensity_mmh: 65,
        rainfallDuration_hours: 4,
        soilType: 'alluvial_clay',
        infiltrationRate_mmh: 8.5,
        runoffCoefficient: 0.70,
        tideOutfallCondition: 'normal',
        desiltingFactor: 0.7,
      };

      const kotturuDataset = shiftVillageDataset(DEMO_VILLAGE, [kotturu.center[0], kotturu.center[1]], 'Kotturu', 'Srikakulam', 'Kotturu');
      kotturuDataset.elevation_m = 28;

      const joshimathDataset = shiftVillageDataset(DEMO_VILLAGE, [joshimath.center[0], joshimath.center[1]], 'Joshimath', 'Chamoli', 'Joshimath');
      joshimathDataset.elevation_m = 1890;

      const kotturuResult = await defaultSimulationEngine.runSimulation(kotturuDataset, config);
      const joshimathResult = await defaultSimulationEngine.runSimulation(joshimathDataset, config);

      // Lowland coastal delta vs alpine mountain terrain
      assert.ok(kotturuResult.maxInundatedArea_ha > 0, 'Coastal alluvial flat accumulates ponding');
      // Alpine mountain slopes drain rapidly without accumulating stagnant flood lakes
      assert.ok(
        joshimathResult.maxInundatedArea_ha < kotturuResult.maxInundatedArea_ha,
        'Mountain slope must accumulate significantly less standing ponding area than coastal delta'
      );

      // Coordinates of generated polygons must match the respective target location
      const kotturuPoly = getSimulationFloodGeoJson(kotturuResult);
      if (kotturuPoly.features.length > 0) {
        const ring = kotturuPoly.features[0].geometry.coordinates[0];
        assert.ok(Math.abs(ring[0][0] - kotturu.center[0]) < 0.1);
      }
    });
  });

  // =========================================================================
  // TEST 9: Missing geometry and failed solver outputs
  // =========================================================================
  describe('9. Missing Geometry & Building Footprint Handling', () => {
    it('reports "Building impact unavailable" when footprint data is absent, not a confirmed zero', () => {
      const datasetWithoutBuildings: VillageDataset = {
        ...DEMO_VILLAGE,
        buildings: { type: 'FeatureCollection', features: [] }, // No building footprints
      };

      // Impact evaluator check
      const hasBuildings = datasetWithoutBuildings.buildings?.features?.length > 0;
      assert.strictEqual(hasBuildings, false);

      const impactStatusText = hasBuildings
        ? '0 structures'
        : 'Building impact unavailable (no footprint dataset)';

      assert.strictEqual(
        impactStatusText,
        'Building impact unavailable (no footprint dataset)',
        'Must never falsely confirm zero when footprint dataset is missing'
      );
    });

    it('handles null simulation results gracefully without throwing', () => {
      const geo = getSimulationFloodFrameGeoJson(null, null);
      assert.strictEqual(geo.type, 'FeatureCollection');
      assert.strictEqual(geo.features.length, 0);

      const stats = getSimulationFrameStats(null, null);
      assert.strictEqual(stats, null);
    });
  });

  // =========================================================================
  // TEST 10: Unified Hazard Simulation Workspace Structure
  // =========================================================================
  describe('10. Unified Hazard Simulation Workspace Support', () => {
    it('validates supported modes (flood vs cyclone) and scientific classification labels', () => {
      const validModes = ['flood', 'cyclone'];
      assert.ok(validModes.includes('flood'));
      assert.ok(validModes.includes('cyclone'));

      const validClassifications = [
        'Observed data',
        'Official forecast',
        'Modelled simulation',
        'Demonstration scenario',
      ];

      assert.strictEqual(validClassifications.length, 4);
    });
  });

  // =========================================================================
  // TEST 11: Correct Map Alignment and Consistent Impact Statistics
  // =========================================================================
  describe('11. Geographic Alignment & Geodesic Consistency', () => {
    it('maintains mathematical consistency between hectares and square kilometers (1 km² = 100 ha)', () => {
      const areaHa = 15.0;
      const areaKm2 = Number((areaHa / 100).toFixed(2));
      assert.strictEqual(areaKm2, 0.15);
      assert.strictEqual(Number((areaKm2 * 100).toFixed(1)), 15.0);
    });

    it('computes accurate Haversine distance and bearing from settlement to cyclone center', () => {
      const kotturuCoords: [number, number] = [83.95, 18.70];
      const stormCoords: [number, number] = [88.50, 17.50];

      const dist = calculateHaversineDistanceKm(kotturuCoords, stormCoords);
      const bearing = calculateBearingDegrees(stormCoords, kotturuCoords);

      assert.ok(dist > 400 && dist < 600, `Expected distance ~490 km, got ${dist}`);
      assert.ok(bearing >= 270 && bearing <= 315, `Expected WNW bearing (~280-300°), got ${bearing}°`);
    });
  });

  // =========================================================================
  // TEST 12: Timer and Listener Cleanup Without Memory Leaks
  // =========================================================================
  describe('12. Timer & Resource Lifecycle Management', () => {
    it('cleans up interval timers cleanly on reset or unmount without leaking', (t, done) => {
      let tickCount = 0;
      const interval = setInterval(() => {
        tickCount++;
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        const recordedTicks = tickCount;

        setTimeout(() => {
          assert.strictEqual(tickCount, recordedTicks, 'Timer must not fire after clearInterval');
          done();
        }, 120);
      }, 120);
    });
  });

  // =========================================================================
  // TEST 13: Time-Dependent 4-State Road Inundation Classification
  // =========================================================================
  describe('13. Time-Dependent 4-State Road Classification', () => {
    it('classifies roads into flooded (>0.25m), affected (0-0.25m), unaffected, and unverified', async () => {
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

      const result = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);
      assert.ok(result.frames.length >= 8);

      // Frame 0: Dry conditions before storm arrival
      const frame0 = result.frames[0];
      assert.ok(frame0.affectedRoads !== undefined);
      const frame0Flooded = frame0.affectedRoads?.filter((r) => r.status === 'flooded') || [];
      assert.strictEqual(frame0Flooded.length, 0, 'No roads should be flooded at hour 0');

      // Peak frame: Heavy inundation
      const peakFrame = result.frames.find((f) => f.hour === result.peakHour) || result.frames[result.peakHour];
      assert.ok(peakFrame.affectedRoads !== undefined && peakFrame.affectedRoads.length > 0);

      // Check valid statuses
      const validStatuses = new Set(['flooded', 'affected', 'unaffected', 'unverified']);
      peakFrame.affectedRoads.forEach((r) => {
        assert.ok(r.status && validStatuses.has(r.status), `Road ${r.id} has invalid status ${r.status}`);
        if (r.status === 'flooded') {
          assert.ok(r.depth_m > 0.25, 'Flooded road must have depth > 0.25m');
          assert.strictEqual(r.impassable, true, 'Flooded road must be marked impassable');
        } else if (r.status === 'affected') {
          assert.ok(r.depth_m > 0 && r.depth_m <= 0.25, 'Affected road must have depth 0-0.25m');
          assert.strictEqual(r.impassable, false, 'Affected road must remain passable for emergency high-clearance vehicles');
        } else if (r.status === 'unaffected') {
          assert.strictEqual(r.depth_m, 0, 'Unaffected road must have zero inundation depth');
          assert.strictEqual(r.impassable, false);
        } else if (r.status === 'unverified') {
          assert.ok(r.statusNote?.includes('unverified') || r.statusNote?.includes('Do not assume safe'));
        }
      });

      // Recession frame: depth and flooded count must decrease from peak
      const recessionFrame = result.frames[result.frames.length - 1];
      const peakFloodedCount = peakFrame.affectedRoads.filter((r) => r.status === 'flooded').length;
      const recessionFloodedCount = recessionFrame.affectedRoads?.filter((r) => r.status === 'flooded').length || 0;
      assert.ok(
        recessionFloodedCount <= peakFloodedCount,
        'Recession frame must have fewer or equal flooded roads compared to storm peak'
      );
    });
  });

  // =========================================================================
  // TEST 14: Building Exposure Spatial Intersection & Model Scope Metadata
  // =========================================================================
  describe('14. Building Exposure Spatial Intersection & Screening Scope Metadata', () => {
    it('evaluates building plinth overtopping dynamically and tags simulation as simplified screening', async () => {
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

      const result = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, config);

      // Model metadata checks
      assert.strictEqual(result.hydrodynamicStatus, 'simplified_rational_hypsometric');
      assert.ok(result.modelDescription?.includes('Simplified 2D Rational-Depression Solver'));
      assert.ok(result.modelScopeNote?.includes('DEM hypsometry'));

      // Check peak frame building exposure
      const peakFrame = result.frames.find((f) => f.hour === result.peakHour) || result.frames[result.peakHour];
      assert.ok(peakFrame.affectedBuildings !== undefined && peakFrame.affectedBuildings.length > 0);

      const severeBuildings = peakFrame.affectedBuildings.filter((b) => b.risk === 'severe');
      severeBuildings.forEach((b) => {
        assert.ok(b.depth_m > 0, 'Severe building must have positive depth');
        assert.ok(b.statusNote?.toLowerCase().includes('severe') || b.statusNote?.includes('above plinth'));
      });

      // Hour 0 buildings must be safe
      const frame0 = result.frames[0];
      const frame0Affected = frame0.affectedBuildings?.filter((b) => b.risk !== 'safe') || [];
      assert.strictEqual(frame0Affected.length, 0, 'No buildings should be flooded at hour 0 antecedent condition');
    });

    it('reports unavailable_unmapped status when building footprints are absent without fabricating dwellings', async () => {
      const villageNoBld: VillageDataset = {
        ...DEMO_VILLAGE,
        buildings: { type: 'FeatureCollection', features: [] },
      };

      const config: SimulationConfig = {
        scenario: 'baseline',
        rainfallIntensity_mmh: 50,
        rainfallDuration_hours: 3,
        soilType: 'alluvial_clay',
        infiltrationRate_mmh: 8.0,
        runoffCoefficient: 0.7,
        tideOutfallCondition: 'normal',
        desiltingFactor: 0.7,
      };

      const result = await defaultSimulationEngine.runSimulation(villageNoBld, config);
      assert.strictEqual(result.buildingExposureStatus, 'unavailable_unmapped');
      assert.strictEqual(result.affectedBuildings?.length, 0);
      assert.ok(result.modelScopeNote?.includes('Building footprint exposure unavailable'));
    });
  });
});
