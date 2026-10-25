import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Pause,
  Clock,
  CloudRain,
  Sliders,
  ShieldAlert,
  Droplets,
  AlertTriangle,
  Home,
  CheckCircle2,
  HelpCircle,
  Eye,
  Info,
  FastForward,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import type {
  ScenarioType,
  SimulationConfig,
  SimulationFrame,
  SimulationResult,
  VillageDataset,
} from '../../types/village';
import { defaultSimulationEngine } from '../../services/simulationService';
import { backendApiClient } from '../../services/backendApi';
import { VillageMap } from '../map/VillageMap';

interface SimulationViewProps {
  dataset: VillageDataset;
  latestResult: SimulationResult;
  onUpdateResult: (result: SimulationResult) => void;
  selectedFeature: any | null;
  onSelectFeature: (feature: any | null) => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  dataset,
  latestResult,
  onUpdateResult,
  selectedFeature,
  onSelectFeature,
}) => {
  // Config state
  const [scenario, setScenario] = useState<ScenarioType>(latestResult.scenario);
  const [rainfallIntensity, setRainfallIntensity] = useState<number>(
    latestResult.config.rainfallIntensity_mmh
  );
  const [duration, setDuration] = useState<number>(
    latestResult.config.rainfallDuration_hours
  );
  const [soilType, setSoilType] = useState<SimulationConfig['soilType']>(
    latestResult.config.soilType
  );
  const [infiltrationRate, setInfiltrationRate] = useState<number>(
    latestResult.config.infiltrationRate_mmh
  );
  const [runoffCoeff, setRunoffCoeff] = useState<number>(
    latestResult.config.runoffCoefficient
  );
  const [tideOutfall, setTideOutfall] = useState<SimulationConfig['tideOutfallCondition']>(
    latestResult.config.tideOutfallCondition
  );
  const [desiltingFactor, setDesiltingFactor] = useState<number>(
    latestResult.config.desiltingFactor
  );

  // Playback state & speed controls
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5x, 1x, 2x, 4x
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(latestResult.peakHour);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [computationStage, setComputationStage] = useState<string>('');

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Baseline comparison state
  const [baselineResult, setBaselineResult] = useState<SimulationResult | null>(null);
  const [showComparisonDrawer, setShowComparisonDrawer] = useState<boolean>(false);

  // Handle Preset Storms
  const applyPreset = (preset: 'moderate' | 'cyclone' | 'cloudburst') => {
    if (preset === 'moderate') {
      setRainfallIntensity(35);
      setDuration(4);
      setRunoffCoeff(0.45);
    } else if (preset === 'cyclone') {
      setRainfallIntensity(70);
      setDuration(6);
      setRunoffCoeff(0.65);
      setTideOutfall('high_surge_backwater');
    } else if (preset === 'cloudburst') {
      setRainfallIntensity(110);
      setDuration(3);
      setRunoffCoeff(0.75);
    }
  };

  // Input Validation
  const validateInputs = (): boolean => {
    const errors: string[] = [];
    if (rainfallIntensity < 10 || rainfallIntensity > 250) {
      errors.push('Rainfall intensity must be between 10 and 250 mm/hr.');
    }
    if (duration < 1 || duration > 24) {
      errors.push('Storm duration must be between 1 and 24 hours.');
    }
    if (infiltrationRate < 0.5 || infiltrationRate > 80) {
      errors.push('Soil infiltration rate must be within 0.5 to 80 mm/hr.');
    }
    if (runoffCoeff < 0.1 || runoffCoeff > 0.95) {
      errors.push('Runoff coefficient must be between 0.1 and 0.95.');
    }
    if (!dataset.boundary || dataset.boundary.features.length === 0) {
      errors.push('Village boundary dataset is missing.');
    }
    if (!dataset.buildings || dataset.buildings.features.length === 0) {
      errors.push('Building footprints dataset is missing.');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Run Hydrological Simulation Workflow
  const handleRunSimulation = async () => {
    if (!validateInputs()) return;

    setIsComputing(true);
    setComputationStage('Validating Spatial & Hydraulic Boundaries...');
    await new Promise((r) => setTimeout(r, 200));

    setComputationStage('Calculating Precipitation Hyetograph & SCS-CN Infiltration...');
    await new Promise((r) => setTimeout(r, 250));

    setComputationStage('Simulating Drainage Channel Conveyance & Outfall Routing...');
    await new Promise((r) => setTimeout(r, 250));

    setComputationStage('Generating 2D Depression Ponding & Plinth Intersections...');

    const config: SimulationConfig = {
      scenario,
      rainfallIntensity_mmh: rainfallIntensity,
      rainfallDuration_hours: duration,
      soilType,
      infiltrationRate_mmh: infiltrationRate,
      runoffCoefficient: runoffCoeff,
      tideOutfallCondition: tideOutfall,
      desiltingFactor,
      timeStep_mins: 60,
    };

    try {
      const result = await defaultSimulationEngine.runSimulation(dataset, config);
      onUpdateResult(result);

      // If running intervention scenario, also generate baseline with identical rainfall for honest comparison!
      if (scenario !== 'baseline') {
        const baselineConfig: SimulationConfig = {
          ...config,
          scenario: 'baseline',
        };
        const baseRes = await defaultSimulationEngine.runSimulation(dataset, baselineConfig);
        setBaselineResult(baseRes);
      } else {
        setBaselineResult(null);
      }

      setActiveFrameIndex(0);
      setIsRunning(true);
    } catch (err: any) {
      console.error('Simulation execution error:', err);
      setValidationErrors([err.message || 'Simulation engine failed']);
    } finally {
      setIsComputing(false);
      setComputationStage('');
    }
  };

  // Timeline auto-advance animation with speed multiplier
  useEffect(() => {
    if (!isRunning) return;

    // Base interval 1200ms divided by playbackSpeed
    const intervalMs = Math.max(250, Math.round(1200 / playbackSpeed));

    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => {
        if (prev >= latestResult.frames.length - 1) {
          setIsRunning(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isRunning, playbackSpeed, latestResult.frames.length]);

  const currentFrame: SimulationFrame =
    latestResult.frames[activeFrameIndex] || latestResult.frames[0];

  const scenarioDescriptions = {
    baseline: {
      name: 'Scenario A: Baseline (No Drainage)',
      desc: 'All runoff accumulates naturally in depressions without engineered drainage outlets.',
      badge: 'bg-red-100 text-red-800 border-red-300',
    },
    existing_drainage: {
      name: 'Scenario B: Existing Drainage Channels',
      desc: 'Current masonry side drains and earthen swales subject to siltation.',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    proposed_intervention: {
      name: 'Scenario C: Proposed High-Cap Box Drains & Retention',
      desc: 'Upgraded 1.6m RCC box drain discharging to Chinna Vagu, plus 7,500m³ sponge basin.',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Banner Notice & Validation Warnings */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="font-semibold text-slate-200">
            Village Hydrological Simulation Engine
          </span>
          <span className="text-slate-500 hidden md:inline">|</span>
          <span className="text-amber-400 hidden md:inline font-medium">
            Illustrative Model (Client Prototype — EPA SWMM backend contract prepared)
          </span>
        </div>
        <div className="flex items-center gap-3">
          {baselineResult && (
            <button
              onClick={() => setShowComparisonDrawer(!showComparisonDrawer)}
              className="text-xs bg-purple-900/60 hover:bg-purple-900 text-purple-200 border border-purple-500/50 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Compare Baseline vs Intervention
            </button>
          )}
          <span className="text-slate-400 text-[11px]">
            Catchment: <span className="text-slate-200">{dataset.villageName}</span>
          </span>
        </div>
      </div>

      {/* Main Split Layout: Left Controls (380px), Right Interactive Map & Timeline */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Config Panel */}
        <div className="w-full lg:w-[390px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Storm & Terrain Hydraulic Inputs
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Identical storm parameters applied across baseline and intervention scenarios.
            </p>
          </div>

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="bg-red-950/80 border border-red-700/80 rounded-xl p-3 text-xs text-red-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-4 h-4" /> Input Validation Error
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Scenario Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Infrastructure Scenario:</span>
              <span className="text-[10px] text-blue-400">Select to test</span>
            </label>
            {(['baseline', 'existing_drainage', 'proposed_intervention'] as ScenarioType[]).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                  scenario === s
                    ? 'bg-blue-950/80 border-blue-500 shadow-md text-white'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{scenarioDescriptions[s].name}</span>
                  {scenario === s && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {scenarioDescriptions[s].desc}
                </div>
              </button>
            ))}
          </div>

          {/* Storm Presets */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              <span>AP Storm Presets:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => applyPreset('moderate')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-center text-[11px]"
              >
                Monsoon
                <br />
                <span className="text-[9px] text-slate-400">35 mm/h</span>
              </button>
              <button
                onClick={() => applyPreset('cyclone')}
                className="p-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 border border-blue-600/50 text-blue-200 text-center text-[11px]"
              >
                Cyclone Surge
                <br />
                <span className="text-[9px] text-blue-300">70 mm/h</span>
              </button>
              <button
                onClick={() => applyPreset('cloudburst')}
                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/60 border border-red-600/50 text-red-200 text-center text-[11px]"
              >
                Cloudburst
                <br />
                <span className="text-[9px] text-red-300">110 mm/h</span>
              </button>
            </div>
          </div>

          {/* Rainfall Intensity & Duration Sliders */}
          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Peak Rainfall Intensity:</span>
                <span className="font-bold text-cyan-400">{rainfallIntensity} mm/hr</span>
              </div>
              <input
                type="range"
                min="15"
                max="150"
                step="5"
                value={rainfallIntensity}
                onChange={(e) => setRainfallIntensity(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Storm Duration:</span>
                <span className="font-bold text-cyan-400">{duration} Hours</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Soil Infiltration & Drainage Boundary */}
          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Soil Classification (Infiltration):
              </label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as SimulationConfig['soilType'])}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
              >
                <option value="black_cotton">Black Cotton Clay (Regur - Very Low Infiltration)</option>
                <option value="alluvial_clay">Krishna Alluvial Clay (Low-Medium Infiltration)</option>
                <option value="red_sandy_loam">Red Sandy Loam (Higher Infiltration)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Runoff Coeff. (C):</label>
                <input
                  type="number"
                  min="0.2"
                  max="0.9"
                  step="0.05"
                  value={runoffCoeff}
                  onChange={(e) => setRunoffCoeff(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Drain Siltation:</label>
                <select
                  value={desiltingFactor}
                  onChange={(e) => setDesiltingFactor(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-white"
                >
                  <option value="0.35">Choked (35%)</option>
                  <option value="0.65">Partly Silted (65%)</option>
                  <option value="1.0">Desilted (100%)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Outfall Creek Condition:</label>
              <select
                value={tideOutfall}
                onChange={(e) => setTideOutfall(e.target.value as SimulationConfig['tideOutfallCondition'])}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="normal">Free Gravity Outfall (Normal Creek)</option>
                <option value="high_surge_backwater">Tidal / Creek Storm Surge Backwater</option>
              </select>
            </div>
          </div>

          {/* Action Button & Computation Progress */}
          <div className="pt-2">
            <button
              onClick={handleRunSimulation}
              disabled={isComputing}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              {isComputing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Solving Hydraulics...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Run Hydrological Simulation
                </>
              )}
            </button>

            {isComputing && (
              <div className="mt-2 text-[11px] text-cyan-300 font-mono text-center animate-pulse">
                {computationStage}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Interactive Map + Timeline Scrubber + Instant Metrics */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Top Live Metric Ticker */}
          <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 p-3 flex items-center justify-between gap-2 overflow-x-auto z-10 shrink-0 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Timeline:</span>
                <div className="text-white font-bold text-sm">
                  Hour {currentFrame.hour} of {latestResult.frames.length - 1}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Water Depth:</span>
                <div
                  className={`font-bold text-sm ${
                    currentFrame.maxDepth_m > 0.5
                      ? 'text-red-400'
                      : currentFrame.maxDepth_m > 0.2
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {currentFrame.maxDepth_m} m ({Math.round(currentFrame.maxDepth_m * 100)} cm)
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Flooded Buildings:
                </span>
                <div className="text-white font-bold text-sm">
                  {currentFrame.floodedBuildingsCount} structures
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Inundated Area:
                </span>
                <div className="text-white font-bold text-sm">
                  {currentFrame.inundatedArea_ha} Hectares
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Impassable Roads:
                </span>
                <div className="text-white font-bold text-sm">{currentFrame.affectedRoadsKm} km</div>
              </div>
            </div>

            {/* Quick Status Tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-slate-300">
                {currentFrame.hour <= latestResult.config.rainfallDuration_hours
                  ? 'Storm Influx Active'
                  : 'Recession & Drainage Phase'}
              </span>
            </div>
          </div>

          {/* Interactive Map Canvas */}
          <div className="flex-1 relative">
            <VillageMap
              dataset={dataset}
              activeFloodGeoJson={currentFrame.floodPolygons}
              scenarioName={scenarioDescriptions[latestResult.scenario].name}
              selectedFeature={selectedFeature}
              onSelectFeature={onSelectFeature}
            />
          </div>

          {/* Baseline vs Intervention Comparison Drawer (when active) */}
          {showComparisonDrawer && baselineResult && (
            <div className="absolute top-14 right-3 z-30 w-80 sm:w-96 bg-slate-950/95 backdrop-blur-md border border-purple-500/50 rounded-2xl shadow-2xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-right-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Identical Storm Impact Comparison
                </div>
                <button
                  onClick={() => setShowComparisonDrawer(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="text-[11px] text-slate-300">
                Rainfall inputs identical: {latestResult.config.rainfallIntensity_mmh} mm/h for{' '}
                {latestResult.config.rainfallDuration_hours} hrs.
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <span className="text-slate-400 font-medium text-left">Metric</span>
                  <span className="text-red-400 font-bold">Baseline</span>
                  <span className="text-emerald-400 font-bold">Intervention</span>
                </div>

                <div className="grid grid-cols-3 gap-2 px-2 py-1 text-center border-b border-slate-800/60">
                  <span className="text-slate-300 text-left">Flooded Homes</span>
                  <span className="text-red-400 font-bold">
                    {baselineResult.affectedBuildings.filter((b) => b.depth_m > 0).length}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {latestResult.affectedBuildings.filter((b) => b.depth_m > 0).length} (
                    {Math.round(
                      ((baselineResult.affectedBuildings.filter((b) => b.depth_m > 0).length -
                        latestResult.affectedBuildings.filter((b) => b.depth_m > 0).length) /
                        (baselineResult.affectedBuildings.filter((b) => b.depth_m > 0).length || 1)) *
                        100
                    )}
                    % reduction)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 px-2 py-1 text-center border-b border-slate-800/60">
                  <span className="text-slate-300 text-left">Peak Water Depth</span>
                  <span className="text-red-400 font-mono">{baselineResult.peakDepth_m} m</span>
                  <span className="text-emerald-400 font-mono">{latestResult.peakDepth_m} m</span>
                </div>

                <div className="grid grid-cols-3 gap-2 px-2 py-1 text-center border-b border-slate-800/60">
                  <span className="text-slate-300 text-left">Inundated Area</span>
                  <span className="text-red-400 font-mono">{baselineResult.maxInundatedArea_ha} ha</span>
                  <span className="text-emerald-400 font-mono">{latestResult.maxInundatedArea_ha} ha</span>
                </div>

                <div className="grid grid-cols-3 gap-2 px-2 py-1 text-center">
                  <span className="text-slate-300 text-left">Impassable Roads</span>
                  <span className="text-red-400 font-bold">
                    {baselineResult.affectedRoads.filter((r) => r.impassable).length}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {latestResult.affectedRoads.filter((r) => r.impassable).length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Interactive Timeline Scrubber with Speed Controls (Priority 5) */}
          <div className="bg-slate-950/95 border-t border-slate-800 p-3 z-10 shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Playback Controls & Speed */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                  title={isRunning ? 'Pause' : 'Play Timeline'}
                >
                  {isRunning ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsRunning(false);
                    setActiveFrameIndex(0);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Rewind to Start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Speed Multiplier Controls (0.5x, 1x, 2x, 4x) */}
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 ml-2">
                  {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-300 font-mono ml-2 font-bold">
                  H+{currentFrame.hour}:00
                </div>
              </div>

              {/* Slider Scrubber */}
              <div className="flex-1 w-full sm:max-w-xl px-2">
                <input
                  type="range"
                  min="0"
                  max={latestResult.frames.length - 1}
                  value={activeFrameIndex}
                  onChange={(e) => {
                    setIsRunning(false);
                    setActiveFrameIndex(Number(e.target.value));
                  }}
                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Start (T=0)</span>
                  <span className="text-cyan-400">Peak Flood (H+{latestResult.peakHour})</span>
                  <span>Recession (H+{latestResult.frames.length - 1})</span>
                </div>
              </div>

              {/* Step info */}
              <div className="text-xs text-slate-400 hidden lg:block text-right">
                <div>Storm Rate: {currentFrame.rainfallThisHour_mm} mm/h</div>
                <div className="text-[10px] text-slate-500">
                  Cumulative Rain: {currentFrame.cumulativeRain_mm} mm
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
