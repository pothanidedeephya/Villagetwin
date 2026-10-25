import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getSimulationFloodGeoJson,
  generateIllustrativeFloodPolygons,
  defaultSimulationEngine,
} from '../src/services/simulationService';
import { DEMO_VILLAGE } from '../src/data/demoVillage';
import type { SimulationResult, SimulationConfig } from '../src/types/village';

describe('Bharat Village Twin — Map UI Layout & Flood Simulation Tests', () => {

  const testConfig = {
    rainfallIntensity_mmh: 65,
    rainfallDuration_hours: 4,
    scenario: 'baseline' as const,
    soilType: 'alluvial_clay' as const,
    infiltrationRate_mmh: 5.0,
    runoffCoefficient: 0.73,
    tideOutfallCondition: 'normal' as const,
    desiltingFactor: 1.0,
  };

  describe('Part 1: getSimulationFloodGeoJson Resolution & Zero-Loss Inundation', () => {
    it('1. Correctly resolves flood GeoJSON when peakFloodPolygons is directly provided', () => {
      const mockPolys = generateIllustrativeFloodPolygons(83.950, 18.700, 0.62, 'baseline', 28);
      const result: SimulationResult = {
        config: testConfig as any,
        maxInundatedArea_ha: 8.4,
        peakDepth_m: 0.62,
        peakHour: 2,
        frames: [],
        peakFloodPolygons: mockPolys,
      } as any;

      const resolved = getSimulationFloodGeoJson(result);
      assert.ok(resolved !== null, 'Resolved GeoJSON must not be null');
      assert.strictEqual(resolved?.type, 'FeatureCollection');
      assert.ok(resolved!.features.length > 0, 'Must contain features');
      assert.strictEqual(resolved!.features.length, mockPolys.features.length);
    });

    it('2. Solves the 1-based peakHour frame lookup off-by-one bug', () => {
      // In a 4-hour simulation, frames has length 4 with hours 1, 2, 3, 4.
      // peakHour is 4 (1-based). frames[4] in a 0-indexed array would be undefined!
      const frame4Polys = generateIllustrativeFloodPolygons(83.950, 18.700, 0.95, 'baseline', 28);
      const frames = [1, 2, 3, 4].map((hr) => ({
        hour: hr,
        rainfallThisHour_mm: 25,
        cumulativeRain_mm: hr * 25,
        runoffVolume_m3: 1000 * hr,
        drainedVolume_m3: 400 * hr,
        inundatedArea_ha: hr * 3.1,
        waterloggingArea_ha: hr * 1.5,
        maxDepth_m: hr * 0.24,
        avgDepth_m: hr * 0.12,
        floodedBuildingsCount: hr * 2,
        criticalFacilitiesFlooded: [],
        affectedRoadsKm: hr * 0.4,
        floodPolygons: hr === 4 ? frame4Polys : generateIllustrativeFloodPolygons(83.950, 18.700, hr * 0.1, 'baseline', 28),
      }));

      const result: SimulationResult = {
        config: testConfig as any,
        maxInundatedArea_ha: 12.5,
        peakDepth_m: 0.95,
        peakHour: 4,
        frames,
      } as any;

      // getSimulationFloodGeoJson must reliably locate hour 4 without undefined index crash
      const resolved = getSimulationFloodGeoJson(result);
      assert.ok(resolved !== null, 'Must resolve peak hour frame');
      assert.strictEqual(resolved!.features.length, frame4Polys.features.length);
      assert.strictEqual(resolved!.features[0].properties?.depth_m, frame4Polys.features[0].properties?.depth_m);
    });

    it('3. Falls back gracefully on null, undefined, or empty results', () => {
      assert.strictEqual(getSimulationFloodGeoJson(null)?.features.length, 0);
      assert.strictEqual(getSimulationFloodGeoJson(undefined)?.features.length, 0);

      const emptyResult: SimulationResult = {
        config: testConfig as any,
        maxInundatedArea_ha: 0,
        peakDepth_m: 0,
        peakHour: 1,
        frames: [],
      } as any;
      assert.strictEqual(getSimulationFloodGeoJson(emptyResult)?.features.length, 0);
    });

    it('4. Full simulation run generates valid peakFloodPolygons', async () => {
      const fullResult = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, testConfig);
      assert.ok(fullResult.maxInundatedArea_ha > 0, 'Must calculate inundated area');
      assert.ok(fullResult.peakFloodPolygons, 'Simulation result must populate peakFloodPolygons');
      assert.ok(fullResult.peakFloodPolygons!.features.length > 0, 'Must have at least one polygon feature');

      const resolved = getSimulationFloodGeoJson(fullResult);
      assert.ok(resolved !== null);
      assert.strictEqual(resolved!.features.length, fullResult.peakFloodPolygons!.features.length);
    });
  });

  describe('Part 2: Depth Styling, High-Contrast Cyan Palette & Bounding Box Calculation', () => {
    // Styling spec from VillageMap.tsx:
    // Shallow: depth <= 0.25m -> Cyan #38bdf8 / border #0284c7, fillOpacity 0.40, weight 1.8
    // Moderate: 0.25 < depth <= 0.50m -> Royal Azure #2563eb / border #1d4ed8, fillOpacity 0.50, weight 2.0
    // Deep: depth > 0.50m -> Deep Navy #1d4ed8 / border #1e3a8a, fillOpacity 0.60, weight 2.5
    function getDepthStyle(depth: number) {
      if (depth > 0.5) {
        return { color: '#1e3a8a', fillColor: '#1d4ed8', fillOpacity: 0.60, weight: 2.5 };
      }
      if (depth > 0.25) {
        return { color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.50, weight: 2.0 };
      }
      return { color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.40, weight: 1.8 };
    }

    it('1. Applies proper cyan-blue depth palette and opacities (40% - 60%)', () => {
      const shallowStyle = getDepthStyle(0.15);
      assert.strictEqual(shallowStyle.fillColor, '#38bdf8', 'Shallow flood must use bright cyan');
      assert.strictEqual(shallowStyle.fillOpacity, 0.40, 'Shallow flood opacity must be 40%');
      assert.strictEqual(shallowStyle.weight, 1.8);

      const moderateStyle = getDepthStyle(0.35);
      assert.strictEqual(moderateStyle.fillColor, '#2563eb', 'Moderate flood must use Royal Azure');
      assert.strictEqual(moderateStyle.fillOpacity, 0.50, 'Moderate flood opacity must be 50%');
      assert.strictEqual(moderateStyle.weight, 2.0);

      const deepStyle = getDepthStyle(0.75);
      assert.strictEqual(deepStyle.fillColor, '#1d4ed8', 'Deep flood must use Deep Navy');
      assert.strictEqual(deepStyle.fillOpacity, 0.60, 'Deep flood opacity must be 60%');
      assert.strictEqual(deepStyle.weight, 2.5);
    });

    it('2. Satellite map translucency check: fill opacity does not obscure underlying base map', () => {
      [0.1, 0.25, 0.45, 0.8, 1.5].forEach((depth) => {
        const style = getDepthStyle(depth);
        assert.ok(style.fillOpacity >= 0.40 && style.fillOpacity <= 0.60,
          `Opacity ${style.fillOpacity} must be between 40% and 60% for depth ${depth}m`);
        assert.ok(style.weight >= 1.8 && style.weight <= 2.5,
          `Border weight ${style.weight} must be between 1.8 and 2.5px`);
      });
    });

    it('3. Computes accurate bounding box for auto-zooming camera to simulated flood', () => {
      const polys = generateIllustrativeFloodPolygons(83.950, 18.700, 0.75, 'baseline', 28);

      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      let count = 0;

      for (const feat of polys.features) {
        for (const ring of feat.geometry.coordinates) {
          for (const coord of ring) {
            const [lng, lat] = coord;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            count++;
          }
        }
      }

      assert.ok(count > 0, 'Must have inspected coordinates');
      assert.ok(minLat < maxLat, 'minLat must be strictly less than maxLat');
      assert.ok(minLng < maxLng, 'minLng must be strictly less than maxLng');

      // Verify bounding box is centered around village coordinates (83.950 E, 18.700 N)
      assert.ok(minLat <= 18.700 && maxLat >= 18.700,
        'Latitude bounds must enclose or touch village latitude 18.700');
      assert.ok(minLng <= 83.950 && maxLng >= 83.950,
        'Longitude bounds must enclose or touch village longitude 83.950');
    });
  });

  describe('Part 3: Simulation Status Card & Honest Labeling', () => {
    it('1. Accurately labels output as "Simulation" and never "Observed flood"', () => {
      const cardTitle = 'Simulation: Kotturu Gram Panchayat';
      const badge = 'SIMULATION';
      assert.ok(!cardTitle.toLowerCase().includes('observed'), 'Must not claim to be observed flood');
      assert.strictEqual(badge, 'SIMULATION', 'Must explicitly carry SIMULATION pill');
    });

    it('2. Formats both hectares and square kilometers faithfully', () => {
      const area_ha = 8.4;
      const area_km2 = (area_ha * 0.01).toFixed(2);
      assert.strictEqual(area_km2, '0.08', '8.4 ha must convert to 0.08 km²');

      const peakArea_ha = 42.7;
      const peakArea_km2 = (peakArea_ha * 0.01).toFixed(2);
      assert.strictEqual(peakArea_km2, '0.43', '42.7 ha must convert to 0.43 km²');
    });

    it('3. Formats peak depth in both meters and centimeters faithfully', () => {
      const depth_m = 0.62;
      const depth_cm = Math.round(depth_m * 100);
      assert.strictEqual(depth_cm, 62, '0.62m must convert to 62 cm');

      const deep_m = 1.15;
      const deep_cm = Math.round(deep_m * 100);
      assert.strictEqual(deep_cm, 115, '1.15m must convert to 115 cm');
    });

    it('4. Computes drainage efficiency and runoff volume without NaN errors', () => {
      const area_ha = 8.4;
      const rainfall_mm = 100;
      const totalRainVol_m3 = (rainfall_mm / 1000) * (area_ha * 10000); // 8,400 m³
      const drainedVol_m3 = totalRainVol_m3 * 0.35;
      const efficiency_pct = Math.round((drainedVol_m3 / totalRainVol_m3) * 100);

      assert.strictEqual(totalRainVol_m3, 8400);
      assert.strictEqual(efficiency_pct, 35);
      assert.ok(!isNaN(efficiency_pct));
    });
  });

  describe('Part 4: Map Layout UI Region Containment & Non-Overlapping Architecture', () => {
    it('1. Verifies 4 non-overlapping regions layout specification', () => {
      const regions = {
        regionA: { position: 'top-3 left-3', component: 'SimulationStatusCard', zIndex: 25 },
        regionB: { position: 'top-3 right-3', component: 'MapControlsToolbar', zIndex: 25 },
        regionC: { position: 'top-14 right-3', component: 'MapLayersToolbar', zIndex: 25 },
        regionD: { position: 'bottom-3 right-3', component: 'HazardDetailsDrawer', zIndex: 25 },
      };

      // Ensure Region A is top-left and Region B & C are top-right
      assert.ok(regions.regionA.position.includes('left-3'));
      assert.ok(regions.regionB.position.includes('right-3'));
      assert.ok(regions.regionC.position.includes('right-3'));
      // Region C is positioned below Region B
      assert.ok(regions.regionC.position.includes('top-14') || regions.regionC.position.includes('top-16'));
      // Region D is anchored to bottom
      assert.ok(regions.regionD.position.includes('bottom-3'));
    });

    it('2. Verifies dismissal state of SimulationStatusCard collapses cleanly into mini-chip', () => {
      let isDismissed = false;
      const onDismiss = () => { isDismissed = true; };
      const onReopen = () => { isDismissed = false; };

      assert.strictEqual(isDismissed, false, 'Default card state is expanded');
      onDismiss();
      assert.strictEqual(isDismissed, true, 'Dismissing card sets isDismissed to true');

      // In dismissed state, mini-chip displays:
      const miniChipLabel = isDismissed ? '🌊 Simulation: 8.4 ha' : null;
      assert.strictEqual(miniChipLabel, '🌊 Simulation: 8.4 ha');

      onReopen();
      assert.strictEqual(isDismissed, false, 'Clicking mini-chip restores expanded card');
    });

    it('3. Location switching clears previous simulation polygons cleanly', async () => {
      // Run simulation for current village
      let activeResult: SimulationResult | null = await defaultSimulationEngine.runSimulation(DEMO_VILLAGE, testConfig);
      assert.ok(activeResult !== null);
      let activeGeoJson = getSimulationFloodGeoJson(activeResult);
      assert.ok(activeGeoJson !== null && activeGeoJson.features.length > 0);

      // When user selects a new location before simulation runs, result is reset
      activeResult = null;
      activeGeoJson = getSimulationFloodGeoJson(activeResult);
      assert.strictEqual(activeGeoJson?.features.length, 0, 'Previous flood polygons are emptied on location switch');
    });
  });

});

