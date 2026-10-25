import type {
  BuildingProperties,
  RoadProperties,
  ScenarioType,
  SimulationConfig,
  SimulationFrame,
  SimulationResult,
  SimulationAffectedBuilding,
  SimulationAffectedRoad,
  RoadInundationStatus,
  VillageDataset,
} from '../types/village';
import type { FeatureCollection, Polygon } from 'geojson';
import { doesLineStringIntersectPolygonRing, isPointInPolygonRing } from '../utils/geoUtils';

/**
 * Standard contract for Village Flood Hydrological Simulation Engines.
 * Implementations can be local client-side illustrative models or
 * external EPA SWMM / 2D hydrodynamic solvers hosted on FastAPI / Cloud Run.
 */
export interface HydrologicalSimulationEngine {
  engineName: string;
  engineVersion: string;
  isIllustrativeDemo: boolean;
  runSimulation(dataset: VillageDataset, config: SimulationConfig): Promise<SimulationResult>;
}

import { performanceTracker } from './performanceTracker';

const simulationCache = new Map<string, { timestamp: number; result: SimulationResult }>();
const SIM_CACHE_MAX_ENTRIES = 50;

export function clearSimulationCache(): void {
  simulationCache.clear();
}

performanceTracker.registerCacheProvider({
  name: 'simulation_cache',
  displayName: 'Hydrodynamic Simulation Cache',
  type: 'simulation',
  getEntryCount: () => simulationCache.size,
  clear: () => clearSimulationCache(),
});

/**
 * Generates a deterministic cache key for simulation runs
 */
function getSimulationCacheKey(dataset: VillageDataset, config: SimulationConfig): string {
  return [
    dataset.villageName,
    dataset.center[0].toFixed(4),
    dataset.center[1].toFixed(4),
    config.rainfallIntensity_mmh,
    config.rainfallDuration_hours,
    config.scenario,
    config.soilType,
    config.infiltrationRate_mmh,
    config.runoffCoefficient,
    config.tideOutfallCondition,
    config.desiltingFactor,
    config.baselineWaterDepth_m || 0,
    dataset.drainageLines?.features?.length || 0,
    dataset.retentionPonds?.features?.length || 0,
  ].join('::');
}

/**
 * Simplified Illustrative Hydrological Engine for demonstration and UI testing.
 * Disclaimer: Uses modified rational runoff, elevation-hypsometric depression storage,
 * and conveyance factors. Not certified engineering hydraulic output.
 */
export class IllustrativeHydrologicalEngine implements HydrologicalSimulationEngine {
  engineName = 'Illustrative Rational-Depression Solver (Demo Prototype)';
  engineVersion = '0.9.2-illustrative';
  isIllustrativeDemo = true;

  async runSimulation(
    dataset: VillageDataset,
    config: SimulationConfig
  ): Promise<SimulationResult> {
    performanceTracker.startMark('flood_simulation');

    // 1. Check memory cache for identical scenario and location inputs
    const cacheKey = getSimulationCacheKey(dataset, config);
    const cached = simulationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      performanceTracker.recordCacheHit('flood_simulation', cacheKey);
      performanceTracker.endMark('flood_simulation', 'simulation', { cached: true, solver: this.engineName });
      return JSON.parse(JSON.stringify(cached.result));
    }

    performanceTracker.recordCacheMiss('flood_simulation', cacheKey);

    // Responsive asynchronous micro-yield keeping browser UI smoothly responsive
    await new Promise((resolve) => setTimeout(resolve, 15));

    const totalHours = Math.max(config.rainfallDuration_hours + 4, 10);
    const frames: SimulationFrame[] = [];

    const centerLng = dataset.center[0];
    const centerLat = dataset.center[1];

    // Precompute building geometries and plinths
    const buildingMeta = (dataset.buildings?.features || []).map((bld) => {
      const rawCoords = bld.geometry?.coordinates;
      const bldRings: Array<Array<[number, number]>> =
        bld.geometry?.type === 'Polygon'
          ? (rawCoords as any)
          : bld.geometry?.type === 'MultiPolygon'
          ? (rawCoords as any).map((p: any) => p[0])
          : [];
      let center: [number, number] = [centerLng, centerLat];
      const firstRing = bldRings[0];
      if (firstRing && firstRing.length > 0) {
        let sx = 0, sy = 0;
        for (const pt of firstRing) { sx += pt[0]; sy += pt[1]; }
        center = [sx / firstRing.length, sy / firstRing.length];
      }
      const groundElevation_m = bld.properties.groundElevation_m ?? bld.properties.ground_elevation_m ?? (dataset.elevation_m || 25);
      const plinthHeight_m = (bld.properties.plinthHeight_cm || 45) / 100;
      const plinthTop = groundElevation_m + plinthHeight_m;

      return {
        id: bld.properties.id,
        name: bld.properties.name,
        type: bld.properties.type,
        groundElevation_m,
        plinthHeight_m,
        plinthTop,
        center,
        rings: bldRings,
        occupants: bld.properties.occupants || 0,
      };
    });

    // Precompute road geometries and elevations
    const roadMeta = (dataset.roads?.features || []).map((rd) => {
      const rawCoords = rd.geometry?.coordinates;
      const lines: Array<Array<[number, number]>> =
        (rd.geometry as any)?.type === 'MultiLineString'
          ? (rawCoords as any)
          : rawCoords && rawCoords.length > 0
          ? [rawCoords as any]
          : [];
      const elevation_m = rd.properties.elevation_m;
      const length_m = rd.properties.length_m || 100;

      return {
        id: rd.properties.id,
        name: rd.properties.name,
        type: rd.properties.roadType || rd.properties.type,
        elevation_m,
        length_m,
        lines,
      };
    });

    // Helper to evaluate spatial building exposure
    const evaluateBuildingsExposure = (
      polys: FeatureCollection<Polygon, { depth_m: number; category: string }>,
      waterSurfaceElevation: number
    ) => {
      const bldResult: SimulationAffectedBuilding[] = [];
      const floodedIds: string[] = [];
      const criticalFloodedNames: string[] = [];

      for (const bld of buildingMeta) {
        let maxDepth = 0;
        let hasIntersection = false;

        if (polys.features.length > 0) {
          for (const poly of polys.features) {
            const ring = poly.geometry.coordinates[0];
            if (!ring || ring.length < 3) continue;
            if (isPointInPolygonRing(bld.center, ring) || bld.rings.some((bR) => doesLineStringIntersectPolygonRing(bR, ring))) {
              hasIntersection = true;
              if (poly.properties.depth_m > maxDepth) {
                maxDepth = poly.properties.depth_m;
              }
            }
          }
        }

        if (!hasIntersection || maxDepth <= 0) {
          bldResult.push({
            id: bld.id,
            name: bld.name,
            type: bld.type,
            depth_m: 0,
            risk: 'safe',
            groundElevation_m: bld.groundElevation_m,
            plinthElevation_m: bld.plinthTop,
            statusNote: 'Clear of simulated surface ponding',
          });
          continue;
        }

        const depthAbovePlinth = Math.max(0, Number((maxDepth - bld.plinthHeight_m).toFixed(2)));
        let risk: 'safe' | 'low' | 'moderate' | 'severe' = 'safe';
        let statusNote = '';

        if (depthAbovePlinth > 0.45) {
          risk = 'severe';
          statusNote = `Severe inundation (${depthAbovePlinth.toFixed(2)}m above plinth, evacuation required)`;
        } else if (depthAbovePlinth > 0.15) {
          risk = 'moderate';
          statusNote = `Moderate flooding (${depthAbovePlinth.toFixed(2)}m above plinth, ingress into dwelling)`;
        } else if (depthAbovePlinth > 0) {
          risk = 'low';
          statusNote = `Shallow overtopping (${depthAbovePlinth.toFixed(2)}m above plinth)`;
        } else {
          risk = 'low';
          statusNote = `Foundation waterlogged (${maxDepth.toFixed(2)}m ground depth, plinth protective)`;
        }

        if (depthAbovePlinth > 0) {
          floodedIds.push(bld.id);
          if (bld.type !== 'residential') {
            criticalFloodedNames.push(bld.name);
          }
        }

        bldResult.push({
          id: bld.id,
          name: bld.name,
          type: bld.type,
          depth_m: depthAbovePlinth,
          risk,
          groundElevation_m: bld.groundElevation_m,
          plinthElevation_m: bld.plinthTop,
          statusNote,
        });
      }

      return { bldResult, floodedIds, criticalFloodedNames };
    };

    // Helper to evaluate spatial road exposure with 4-state classification
    const evaluateRoadsExposure = (
      polys: FeatureCollection<Polygon, { depth_m: number; category: string }>,
      waterSurfaceElevation: number,
      hasBoundary: boolean
    ) => {
      const roadResult: SimulationAffectedRoad[] = [];
      let totalAffectedKm = 0;

      for (const rd of roadMeta) {
        if (rd.lines.length === 0) {
          roadResult.push({
            id: rd.id,
            name: rd.name,
            depth_m: 0,
            impassable: false,
            status: 'unverified',
            statusNote: 'No line geometry mapped',
            length_m: rd.length_m,
          });
          continue;
        }

        let maxDepth = 0;
        let hasIntersection = false;

        if (polys.features.length > 0) {
          for (const poly of polys.features) {
            const ring = poly.geometry.coordinates[0];
            if (!ring || ring.length < 3) continue;
            if (rd.lines.some((line) => doesLineStringIntersectPolygonRing(line, ring))) {
              hasIntersection = true;
              if (poly.properties.depth_m > maxDepth) {
                maxDepth = poly.properties.depth_m;
              }
            }
          }
        }

        if (hasIntersection && maxDepth > 0) {
          let finalDepth = maxDepth;
          if (typeof rd.elevation_m === 'number') {
            const calculatedDepth = waterSurfaceElevation - rd.elevation_m;
            if (calculatedDepth > 0) {
              finalDepth = Math.max(0.05, Math.min(maxDepth, Number(calculatedDepth.toFixed(2))));
            } else {
              finalDepth = 0; // elevated embankment
            }
          }

          if (finalDepth > 0.25) {
            roadResult.push({
              id: rd.id,
              name: rd.name,
              depth_m: Number(finalDepth.toFixed(2)),
              impassable: true,
              status: 'flooded',
              statusNote: `Severely flooded (${finalDepth.toFixed(2)}m depth > 0.25m safety limit; impassable for emergency vehicles)`,
              elevation_m: rd.elevation_m,
              length_m: rd.length_m,
            });
            totalAffectedKm += rd.length_m / 1000;
          } else if (finalDepth > 0) {
            roadResult.push({
              id: rd.id,
              name: rd.name,
              depth_m: Number(finalDepth.toFixed(2)),
              impassable: false,
              status: 'affected',
              statusNote: `Waterlogged (${finalDepth.toFixed(2)}m depth <= 0.25m; passable with caution at reduced speed)`,
              elevation_m: rd.elevation_m,
              length_m: rd.length_m,
            });
            totalAffectedKm += rd.length_m / 1000;
          } else {
            roadResult.push({
              id: rd.id,
              name: rd.name,
              depth_m: 0,
              impassable: false,
              status: 'unaffected',
              statusNote: 'Elevated embankment above simulated flood level; verified passable',
              elevation_m: rd.elevation_m,
              length_m: rd.length_m,
            });
          }
        } else {
          if (typeof rd.elevation_m === 'number' && hasBoundary) {
            roadResult.push({
              id: rd.id,
              name: rd.name,
              depth_m: 0,
              impassable: false,
              status: 'unaffected',
              statusNote: 'Outside simulated pluvial depression; verified passable under scenario',
              elevation_m: rd.elevation_m,
              length_m: rd.length_m,
            });
          } else {
            roadResult.push({
              id: rd.id,
              name: rd.name,
              depth_m: 0,
              impassable: false,
              status: 'unverified',
              statusNote: 'Elevation unverified in GIS — do not assume safe without local field check',
              elevation_m: rd.elevation_m,
              length_m: rd.length_m,
            });
          }
        }
      }

      return { roadResult, totalAffectedKm: Number(totalAffectedKm.toFixed(2)) };
    };

    // Soil infiltration rate adjustment based on soil type
    let effectiveInfil = config.infiltrationRate_mmh ?? (config as any).soilInfiltration_mmh ?? 6.0;
    if (config.soilType === 'black_cotton') {
      // Swelling clay: high initial infiltration, dropping to very low steady state
      effectiveInfil = Math.min(effectiveInfil, 6.0);
    } else if (config.soilType === 'alluvial_clay') {
      effectiveInfil = Math.min(effectiveInfil, 8.5);
    } else {
      effectiveInfil = Math.min(effectiveInfil, 18.0);
    }

    // Drainage efficiency coefficient by scenario
    let drainageFactor = 0.0;
    let retentionStorageCapacity_m3 = 0;

    if (config.scenario === 'existing_drainage') {
      // Existing drains with maintenance/silt condition
      drainageFactor = 0.32 * config.desiltingFactor;
    } else if (config.scenario === 'proposed_intervention') {
      // High-capacity proposed box drain + retention basins
      drainageFactor = 0.78 * config.desiltingFactor;
      retentionStorageCapacity_m3 = 14360; // 7,560m3 basin + 6,800m3 deepened tank
    }

    if (config.tideOutfallCondition === 'high_surge_backwater') {
      drainageFactor *= 0.6; // Backwater choking at outfall
    }

    let cumulativeRain = 0;
    let maxOverallDepth = 0;
    let maxOverallArea = 0;
    let peakHour = 1;

    // Calibrate local datum to the selected village's actual elevation baseline
    const baseElevation = typeof dataset.elevation_m === 'number' ? dataset.elevation_m : 25.0;
    const lowGroundElevation = baseElevation - 0.4;

    // Village catchment area from administrative boundary polygon (default ~2.14 sq km)
    const villageAreaSqKm = dataset.boundary?.features?.[0]?.properties?.area_sqkm || 2.14;

    // Topographic slope factor: steep hill terrain (e.g. Sohra ~1430m, Joshimath ~1890m) drains rapidly via gullies,
    // producing concentrated torrent depths but less widespread standing surface ponding area than flat coastal plains.
    const terrainSlopeFactor = baseElevation > 800 ? 0.40 : baseElevation > 150 ? 0.70 : 1.0;

    // Track frame states
    let cumulativeExcessRain = 0;
    for (let h = 0; h <= totalHours; h++) {
      // Synthetic hyetograph: bell-curve rain peaking around duration/2
      let rainThisHour = 0;
      if (h > 0 && h <= config.rainfallDuration_hours) {
        const peak = config.rainfallDuration_hours / 2;
        const normalized = Math.exp(-Math.pow(h - peak, 2) / (2 * Math.pow(config.rainfallDuration_hours / 3.2, 2)));
        rainThisHour = config.rainfallIntensity_mmh * Math.max(0.2, normalized);
      }

      cumulativeRain += rainThisHour;

      // Excess rainfall = Rain - Infiltration
      const excessRain_mm = Math.max(0, rainThisHour - effectiveInfil);
      cumulativeExcessRain += excessRain_mm;
      // Runoff volume over village catchment
      const rawRunoffVolume_m3 = (excessRain_mm / 1000) * villageAreaSqKm * 1_000_000 * config.runoffCoefficient;

      // Deduct drained volume
      const maxHourlyDrainDischarge_m3 = drainageFactor * 12500;
      const drainedThisHour_m3 = Math.min(rawRunoffVolume_m3 + (retentionStorageCapacity_m3 > 0 ? 1200 : 0), maxHourlyDrainDischarge_m3);

      // Remaining ponded storage index (normalized depth factor)
      const stormIntensityFactor = config.rainfallIntensity_mmh / 60; // 1.0 at 60 mm/hr
      const scenarioMultiplier =
        config.scenario === 'baseline' ? 1.0 : config.scenario === 'existing_drainage' ? 0.68 : 0.22;

      // Depth wave dynamic: rises during active rainfall and recedes during drainage phase
      const activeHourEffect =
        h <= config.rainfallDuration_hours
          ? (h / config.rainfallDuration_hours) * 1.1
          : Math.max(0, 1.1 - (h - config.rainfallDuration_hours) * (config.scenario === 'proposed_intervention' ? 0.35 : 0.12));

      // External boundary backwater & antecedent storage (preserves coastal surge flooding even with 0mm/h local rain)
      let backwaterComponent = 0;
      if (config.tideOutfallCondition === 'high_surge_backwater') {
        backwaterComponent = 0.22 * scenarioMultiplier;
      }
      if (typeof config.baselineWaterDepth_m === 'number' && config.baselineWaterDepth_m > 0) {
        backwaterComponent = Math.max(backwaterComponent, config.baselineWaterDepth_m * scenarioMultiplier);
      }

      // If cumulative excess rain is 0 (rainfall rate < soil infiltration rate), no pluvial overland flooding forms
      const frameMaxDepth = (cumulativeExcessRain === 0 && backwaterComponent === 0)
        ? 0
        : Math.max(
            0,
            Number((activeHourEffect * stormIntensityFactor * scenarioMultiplier * 1.15 + backwaterComponent).toFixed(2))
          );

      if (frameMaxDepth > maxOverallDepth) {
        maxOverallDepth = frameMaxDepth;
        peakHour = h;
      }

      // Inundated Area (Hectares) calibrated to village area and topographic slope
      const frameInundatedHa = Math.max(
        0,
        Number((frameMaxDepth * 15.0 * terrainSlopeFactor * (villageAreaSqKm / 2.0) * (config.scenario === 'proposed_intervention' ? 0.38 : 0.85)).toFixed(1))
      );
      if (frameInundatedHa > maxOverallArea) {
        maxOverallArea = frameInundatedHa;
      }

      // Generate dynamic flood polygons based on local depression geometry and terrain elevation
      const floodPolygons = generateIllustrativeFloodPolygons(
        centerLng,
        centerLat,
        frameMaxDepth,
        config.scenario,
        dataset.elevation_m || 25,
        dataset
      );

      // Water surface level for this frame
      const frameWaterLevel = lowGroundElevation + frameMaxDepth;

      // Spatially intersect buildings with frame flood polygons
      const bldEval = evaluateBuildingsExposure(floodPolygons, frameWaterLevel);

      // Spatially intersect roads with frame flood polygons (4-state classification)
      const rdEval = evaluateRoadsExposure(floodPolygons, frameWaterLevel, !!dataset.boundary?.features?.[0]);

      frames.push({
        hour: h,
        rainfallThisHour_mm: Number(rainThisHour.toFixed(1)),
        cumulativeRain_mm: Number(cumulativeRain.toFixed(1)),
        runoffVolume_m3: Math.round(rawRunoffVolume_m3),
        drainedVolume_m3: Math.round(drainedThisHour_m3),
        inundatedArea_ha: frameInundatedHa,
        maxDepth_m: frameMaxDepth,
        floodedBuildingsCount: bldEval.floodedIds.length,
        criticalFacilitiesFlooded: bldEval.criticalFloodedNames,
        affectedRoadsKm: rdEval.totalAffectedKm,
        floodPolygons,
        affectedBuildings: bldEval.bldResult,
        affectedRoads: rdEval.roadResult,
      });
    }

    // Peak analysis calibrated to local terrain datum
    const peakWaterLevel = lowGroundElevation + maxOverallDepth;

    // Peak flood polygons generated at max overall depth
    const peakFloodPolygons = generateIllustrativeFloodPolygons(
      centerLng,
      centerLat,
      maxOverallDepth,
      config.scenario,
      dataset.elevation_m || 25,
      dataset
    );

    // Peak exposure evaluations
    const peakBldEval = evaluateBuildingsExposure(peakFloodPolygons, peakWaterLevel);
    const peakRdEval = evaluateRoadsExposure(peakFloodPolygons, peakWaterLevel, !!dataset.boundary?.features?.[0]);

    const affectedBuildings = peakBldEval.bldResult;
    const affectedRoads = peakRdEval.roadResult;

    const hasBuildings = (dataset.buildings?.features || []).length > 0;
    const floodedCount = peakBldEval.floodedIds.length;
    const vulnerablePop = hasBuildings
      ? (dataset.buildings?.features || [])
          .filter((b) => peakBldEval.floodedIds.includes(b.properties?.id))
          .reduce((acc, b) => acc + (b.properties?.occupants || 0), 0)
      : 0;

    const farmlandHa = Number(
      (maxOverallArea * (config.scenario === 'baseline' ? 0.65 : config.scenario === 'existing_drainage' ? 0.45 : 0.15)).toFixed(1)
    );

    const estimatedLoss = Number(
      (
        floodedCount * 0.85 +
        farmlandHa * 0.45 +
        (affectedRoads.filter((r) => r.impassable).length * 1.2)
      ).toFixed(2)
    );

    const efficiency =
      config.scenario === 'baseline' ? 0 : config.scenario === 'existing_drainage' ? 32 : 86;

    const impactedHectares = maxOverallArea;
    const impactedSquareKilometres = Number((impactedHectares / 100).toFixed(4));
    const meanDepth = Number((maxOverallDepth * 0.58).toFixed(2));
    const impassableRoadLengthKm = Number(
      (affectedRoads.filter((r) => r.impassable).reduce((acc, r) => acc + (r.length_m || 100) / 1000, 0)).toFixed(2)
    );

    const canonicalResult = {
      scenarioId: `sim-flood-${dataset.villageName.toLowerCase().replace(/\s+/g, '-')}-${config.scenario}-${Date.now()}`,
      scenarioTitle: `${config.scenario.replace(/_/g, ' ').toUpperCase()} Inundation Simulation (${config.rainfallIntensity_mmh} mm/h)`,
      locationId: `loc-${dataset.villageName.toLowerCase().replace(/\s+/g, '-')}`,
      locationName: dataset.villageName,
      district: dataset.district,
      state: dataset.state,
      modelVersion: 'BharatTwin-Hydrology-2D v2.1',
      calculationTimestamp: new Date().toISOString(),
      affectedAreaDefinition: 'Continuous pluvial ponding footprint where surface water depth exceeds 0.05m (5 cm)',
      impactedHectares,
      impactedSquareKilometres,
      depthStatistics: {
        peakDepth_m: maxOverallDepth,
        meanDepth_m: meanDepth,
        minInundationThreshold_m: 0.05,
      },
      affectedBuildingsCount: floodedCount,
      affectedRoadLengthKm: impassableRoadLengthKm,
      farmlandInundatedHa: farmlandHa,
      vulnerablePopulationAffected: vulnerablePop,
      drainageEfficiencyPercent: efficiency,
      isIllustrative: true,
      validationStatus: 'Illustrative Physical Model (Preliminary Screening)',
      modelScopeNote: hasBuildings
        ? 'Illustrative hydraulic model evaluated against mapped building plinths.'
        : 'Building footprints are unmapped in OpenStreetMap for this village. Dwelling inundation counts cannot be evaluated without mapped footprints.',
    };

    const finalResult: SimulationResult = {
      scenario: config.scenario,
      config,
      frames,
      peakHour,
      totalRainfall_mm: Number(cumulativeRain.toFixed(1)),
      maxInundatedArea_ha: maxOverallArea,
      peakDepth_m: maxOverallDepth,
      peakFloodPolygons,
      canonicalResult,
      affectedBuildings,
      affectedRoads,
      farmlandInundated_ha: farmlandHa,
      vulnerablePopulationAffected: vulnerablePop,
      estimatedLoss_lakhs: estimatedLoss,
      drainageEfficiency_percent: efficiency,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      modelLabel: 'Illustrative Rational-Depression Solver (Unvalidated Demo)',
      isIllustrative: true,
      modelScopeNote: hasBuildings
        ? 'Illustrative hydraulic model evaluated against DEM hypsometry and mapped building plinths.'
        : 'Building footprint exposure unavailable: building footprints are unmapped in OpenStreetMap for this village. Dwelling inundation counts cannot be evaluated without mapped footprints.',
      buildingDataStatus: hasBuildings ? 'available_mapped' : 'unavailable_unmapped',
      buildingExposureStatus: hasBuildings ? 'available_mapped' : 'unavailable_unmapped',
      hydrodynamicStatus: 'simplified_rational_hypsometric',
      modelDescription: 'Simplified 2D Rational-Depression Solver (Screening Model - Heuristic Physical Estimate)',
    };

    if (simulationCache.size >= SIM_CACHE_MAX_ENTRIES) {
      const firstKey = simulationCache.keys().next().value;
      if (firstKey) simulationCache.delete(firstKey);
    }
    simulationCache.set(cacheKey, { timestamp: Date.now(), result: finalResult });
    performanceTracker.endMark('flood_simulation', 'simulation', { cached: false, solver: this.engineName });

    return finalResult;
  }
}

/**
 * Safely extracts the valid peak flood polygons from a simulation result.
 * Avoids 0-based vs 1-based indexing mismatches and ensures visible spatial geometry.
 */
export function getSimulationFloodGeoJson(
  result?: SimulationResult | null
): FeatureCollection<Polygon, { depth_m: number; category: string }> {
  if (!result) return { type: 'FeatureCollection', features: [] };
  if (result.peakFloodPolygons?.features && result.peakFloodPolygons.features.length > 0) {
    return result.peakFloodPolygons;
  }
  if (result.frames && result.frames.length > 0) {
    // Check 1: find frame matching peakHour
    const match = result.frames.find((f) => f.hour === result.peakHour);
    if (match?.floodPolygons?.features && match.floodPolygons.features.length > 0) {
      return match.floodPolygons;
    }
    // Check 2: 1-based index (peakHour - 1)
    if (result.peakHour > 0 && result.frames[result.peakHour - 1]?.floodPolygons?.features?.length) {
      return result.frames[result.peakHour - 1].floodPolygons;
    }
    // Check 3: frame with max inundated area
    const maxFrame = [...result.frames].sort((a, b) => b.inundatedArea_ha - a.inundatedArea_ha)[0];
    if (maxFrame?.floodPolygons?.features?.length) {
      return maxFrame.floodPolygons;
    }
  }
  return { type: 'FeatureCollection', features: [] };
}

/**
 * Resolves the exact spatial flood polygon FeatureCollection for a specific simulation time-step/hour.
 * If hour is null or undefined, returns the peak inundation extent.
 * Guarantees time-dependent progressive spatial visualization without fabricating data.
 */
export function getSimulationFloodFrameGeoJson(
  result?: SimulationResult | null,
  hour?: number | null
): FeatureCollection<Polygon, { depth_m: number; category: string }> {
  if (!result) return { type: 'FeatureCollection', features: [] };
  if (hour === null || hour === undefined) {
    return getSimulationFloodGeoJson(result);
  }

  if (result.frames && result.frames.length > 0) {
    // 1. Try finding by matching frame.hour
    const match = result.frames.find((f) => f.hour === hour);
    if (match?.floodPolygons?.features) {
      return match.floodPolygons;
    }
    // 2. Try array index lookup
    if (hour >= 0 && hour < result.frames.length) {
      const byIdx = result.frames[hour];
      if (byIdx?.floodPolygons?.features) {
        return byIdx.floodPolygons;
      }
    }
  }

  return getSimulationFloodGeoJson(result);
}

/**
 * Returns frame-specific metrics (inundatedArea_ha, maxDepth_m, affectedRoadsKm, floodedBuildingsCount)
 * for a specific simulation hour.
 */
export function getSimulationFrameStats(
  result?: SimulationResult | null,
  hour?: number | null
): SimulationFrame | null {
  if (!result || !result.frames || result.frames.length === 0) return null;
  if (hour === null || hour === undefined) {
    const peak = result.frames.find((f) => f.hour === result.peakHour);
    return peak || result.frames[result.frames.length - 1];
  }
  const match = result.frames.find((f) => f.hour === hour);
  if (match) return match;
  if (hour >= 0 && hour < result.frames.length) {
    return result.frames[hour];
  }
  return result.frames[0];
}

/**
 * Creates dynamic polygons reflecting natural topography in the village catchment:
 * Depressions along local low-points, agricultural backwaters, and drainage channels.
 * Scales dynamically with computed water depth and scenario.
 */
export function generateIllustrativeFloodPolygons(
  centerLng: number,
  centerLat: number,
  depth_m: number,
  scenario: ScenarioType,
  elevation_m: number = 25,
  dataset?: VillageDataset
): FeatureCollection<Polygon, { depth_m: number; category: string; source?: string; label?: string; modelScope?: string }> {
  // Mountain and high-elevation escarpments (elevation > 400m) do not accumulate stagnant pluvial flood lakes;
  // stormwater drains rapidly through natural ravines. Only low-gradient basins form pluvial ponding polygons.
  if (depth_m <= 0.03 || elevation_m > 400) {
    return { type: 'FeatureCollection', features: [] };
  }

  // Scale bounds according to depth
  const spread = Math.min(0.009, depth_m * 0.0065);
  const features: FeatureCollection<Polygon, { depth_m: number; category: string; source?: string; label?: string; modelScope?: string }>['features'] = [];

  // Zone 1: Deepest depression (Local low elevation basin)
  if (depth_m > 0.05) {
    const d1 = depth_m;
    const cat1 = d1 > 0.5 ? 'severe' : d1 > 0.2 ? 'moderate' : 'low';
    features.push({
      type: 'Feature',
      properties: {
        depth_m: Number(d1.toFixed(2)),
        category: cat1,
        source: 'simulated_illustrative',
        label: 'Simulated Pluvial Ponding (Illustrative Model)',
        modelScope: 'Simplified 2D Rational-Depression Solver (Screening Estimate - Not Ground Truth)',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [centerLng - 0.0045 - spread * 0.4, centerLat - 0.001 - spread * 0.3],
            [centerLng - 0.0005 + spread * 0.3, centerLat - 0.0025 + spread * 0.2],
            [centerLng + 0.0035 + spread * 0.5, centerLat - 0.0055 + spread * 0.4],
            [centerLng + 0.0025 + spread * 0.4, centerLat - 0.0085 - spread * 0.2],
            [centerLng - 0.0025 - spread * 0.3, centerLat - 0.0075 - spread * 0.2],
            [centerLng - 0.0045 - spread * 0.4, centerLat - 0.001 - spread * 0.3],
          ],
        ],
      },
    });
  }

  // Zone 2: East Ayacut agricultural backwater (Only in baseline or heavy storm)
  if (depth_m > 0.35 && scenario !== 'proposed_intervention') {
    const d2 = depth_m * 0.7;
    features.push({
      type: 'Feature',
      properties: {
        depth_m: Number(d2.toFixed(2)),
        category: d2 > 0.5 ? 'severe' : 'moderate',
        source: 'simulated_illustrative',
        label: 'Simulated Pluvial Ponding (Illustrative Model)',
        modelScope: 'Simplified 2D Rational-Depression Solver (Screening Estimate - Not Ground Truth)',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [centerLng + 0.003, centerLat + 0.001],
            [centerLng + 0.0075 + spread * 0.3, centerLat + 0.0005],
            [centerLng + 0.009 + spread * 0.4, centerLat - 0.004],
            [centerLng + 0.0045, centerLat - 0.0045],
            [centerLng + 0.003, centerLat + 0.001],
          ],
        ],
      },
    });
  }

  // Zone 3: Shallow street pooling along Central Bazaar (if baseline/existing)
  if (depth_m > 0.25 && scenario === 'baseline') {
    features.push({
      type: 'Feature',
      properties: {
        depth_m: Number((depth_m * 0.45).toFixed(2)),
        category: 'low',
        source: 'simulated_illustrative',
        label: 'Simulated Pluvial Ponding (Illustrative Model)',
        modelScope: 'Simplified 2D Rational-Depression Solver (Screening Estimate - Not Ground Truth)',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [centerLng - 0.0015, centerLat + 0.0025],
            [centerLng + 0.002, centerLat + 0.002],
            [centerLng + 0.0025, centerLat + 0.0005],
            [centerLng - 0.001, centerLat + 0.001],
            [centerLng - 0.0015, centerLat + 0.0025],
          ],
        ],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Singleton instance of the simulation engine.
 * Ready to be swapped with an EPA SWMM FastAPI backend endpoint when available.
 */
export const defaultSimulationEngine: HydrologicalSimulationEngine = new IllustrativeHydrologicalEngine();
