import React, { useState } from 'react';
import {
  Sliders,
  X,
  Play,
  Layers,
  CloudRain,
  Clock,
  Waves,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Info,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { ScenarioType, SimulationConfig, SimulationResult, VillageDataset } from '../../types/village';
import { defaultSimulationEngine } from '../../services/simulationService';
import type { WeatherData, SimulationRainfallMode } from '../../types/weather';

interface SimulationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SimulationConfig;
  onUpdateConfig: (newConfig: SimulationConfig) => void;
  onRunSimulation: (configToRun: SimulationConfig) => Promise<void>;
  isSimulating: boolean;
  dataset: VillageDataset;
  latestResult: SimulationResult;
  liveWeatherRainfall?: number;
  weatherProvider?: string;
  weather?: WeatherData | null;
  rainfallMode?: SimulationRainfallMode;
  onSetRainfallMode?: (mode: SimulationRainfallMode, value_mmh?: number) => void;
}

export const SimulationSettingsModal: React.FC<SimulationSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onRunSimulation,
  isSimulating,
  dataset,
  latestResult,
  liveWeatherRainfall,
  weatherProvider,
  weather,
  rainfallMode = 'custom',
  onSetRainfallMode,
}) => {
  const [localConfig, setLocalConfig] = useState<SimulationConfig>(config);
  const [activeRainfallSource, setActiveRainfallSource] = useState<SimulationRainfallMode>(rainfallMode);
  const [comparisonResult, setComparisonResult] = useState<{
    baseline: SimulationResult;
    proposed: SimulationResult;
  } | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Compute upcoming forecast peak rain rate (mm/h)
  const getForecastPeak = (): { rate_mmh: number; time: string } => {
    if (!weather?.hourlyForecast || weather.hourlyForecast.length === 0) {
      return { rate_mmh: 0, time: 'Next 24h' };
    }
    let maxRate = 0;
    let maxTime = weather.hourlyForecast[0].time;
    for (const h of weather.hourlyForecast) {
      const rate = h.rainfall_mmh ?? (h.rainfall_mm ? Number((h.rainfall_mm / 3).toFixed(1)) : 0);
      if (rate > maxRate) {
        maxRate = rate;
        maxTime = h.time;
      }
    }
    return { rate_mmh: maxRate, time: maxTime };
  };

  const forecastPeak = getForecastPeak();

  if (!isOpen) return null;

  const handleScenarioChange = (scenario: ScenarioType) => {
    const updated = { ...localConfig, scenario };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const handleRainfallChange = (val: number, source: SimulationRainfallMode = 'custom') => {
    setActiveRainfallSource(source);
    onSetRainfallMode?.(source, val);
    const updated = {
      ...localConfig,
      rainfallIntensity_mmh: val,
      rainfallSource: source,
      rainfallSourceLabel:
        source === 'weather_observed'
          ? `Observed (${weather?.provider || 'OpenWeather'})`
          : source === 'weather_forecast'
          ? `Forecast Peak (${weather?.provider || 'OpenWeather'})`
          : 'Custom Design Storm',
    };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const handleDurationChange = (val: number) => {
    const updated = { ...localConfig, rainfallDuration_hours: val };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const handleApplyAndRun = async () => {
    await onRunSimulation(localConfig);
    onClose();
  };

  const handleRunComparison = async () => {
    setIsComparing(true);
    try {
      const baseConfig: SimulationConfig = { ...localConfig, scenario: 'baseline' };
      const propConfig: SimulationConfig = { ...localConfig, scenario: 'proposed_intervention' };

      const [baseRes, propRes] = await Promise.all([
        defaultSimulationEngine.runSimulation(dataset, baseConfig),
        defaultSimulationEngine.runSimulation(dataset, propConfig),
      ]);

      setComparisonResult({ baseline: baseRes, proposed: propRes });
    } catch (err) {
      console.error('Comparison calculation failed:', err);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative z-10 bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-fade-in flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Flood Simulation Settings & Scenarios
              </h3>
              <p className="text-xs text-slate-500">
                Adjust storm parameters, compare baseline vs interventions, and recalculate water depths
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Scientific Disclaimer Pill */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Demonstration Solver Notice:</strong> Calculations use a hypsometric
              Rational-Depression model for {dataset.villageName}. Results dynamically reflect rainfall
              volume, duration, and topography. Not certified engineering hydraulic output.
            </div>
          </div>

          {/* 1. Scenario Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 text-xs block">
              1. Drainage Scenario Selection
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Baseline */}
              <button
                type="button"
                onClick={() => handleScenarioChange('baseline')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  localConfig.scenario === 'baseline'
                    ? 'border-red-500 bg-red-50/70 text-red-950 ring-2 ring-red-400/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Baseline</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-red-200/60 text-red-800 rounded font-semibold">
                    0% Drainage
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  No engineered drains. Unmitigated overland waterlogging.
                </p>
              </button>

              {/* Existing Drainage */}
              <button
                type="button"
                onClick={() => handleScenarioChange('existing_drainage')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  localConfig.scenario === 'existing_drainage'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-400/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Existing Drains</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-200/60 text-blue-800 rounded font-semibold">
                    32% Efficiency
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Current traditional drains with partial silting condition.
                </p>
              </button>

              {/* Proposed Smart Drainage */}
              <button
                type="button"
                onClick={() => handleScenarioChange('proposed_intervention')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  localConfig.scenario === 'proposed_intervention'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-400/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Proposed Plan</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200/60 text-emerald-800 rounded font-semibold">
                    86% Efficiency
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  RCC box conduit network & retention basin storage.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Rainfall Intensity Selector & Modes */}
          <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-blue-600" />
                <span>Simulation Rainfall Input</span>
              </span>
              <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {localConfig.rainfallIntensity_mmh} mm/hr
              </span>
            </div>

            {/* Mode Switching Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => handleRainfallChange(localConfig.rainfallIntensity_mmh || 65, 'custom')}
                className={`py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer ${
                  activeRainfallSource === 'custom'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Design Storm
              </button>

              <button
                type="button"
                onClick={() => {
                  const rate = weather?.current.rainfall_mmh ?? 0;
                  handleRainfallChange(rate, 'weather_observed');
                }}
                disabled={
                  weather?.current.precipitationStatus === 'unobserved' ||
                  weather?.current.precipitationStatus === 'unavailable'
                }
                className={`py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeRainfallSource === 'weather_observed'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Weather ({weather?.current.rainfall_mmh ?? 0} mm/h)
              </button>

              <button
                type="button"
                onClick={() => {
                  const rate = forecastPeak.rate_mmh;
                  handleRainfallChange(rate, 'weather_forecast');
                }}
                disabled={!weather?.hourlyForecast || weather.hourlyForecast.length === 0}
                className={`py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeRainfallSource === 'weather_forecast'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Forecast Peak ({forecastPeak.rate_mmh} mm/h)
              </button>
            </div>

            {/* Custom Mode Controls */}
            {activeRainfallSource === 'custom' && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-100">
                <input
                  type="range"
                  min="20"
                  max="160"
                  step="5"
                  value={localConfig.rainfallIntensity_mmh}
                  onChange={(e) => handleRainfallChange(Number(e.target.value), 'custom')}
                  className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Moderate Monsoon', val: 35 },
                    { label: 'Heavy Storm', val: 65 },
                    { label: 'Severe Downpour', val: 95 },
                    { label: 'Cloudburst / Cyclone', val: 130 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => handleRainfallChange(p.val, 'custom')}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                        localConfig.rainfallIntensity_mmh === p.val
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label} ({p.val} mm/h)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Weather Observation Details */}
            {activeRainfallSource === 'weather_observed' && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] space-y-1 animate-in fade-in duration-100">
                <div className="font-semibold text-blue-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-blue-700" />
                    <span>Real-Time Weather Observation: {weather?.current.rainfall_mmh ?? 0} mm/h</span>
                  </span>
                  <span className="font-mono bg-white text-blue-800 px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                    Active Input
                  </span>
                </div>
                <p className="text-[10px] text-slate-600">
                  {weather?.current.precipitationLabel || (weather?.current.rainfall_mmh === 0 ? '0.0 mm/h (Dry Weather / Clear Skies)' : `${weather?.current.rainfall_mmh} mm/h`)}
                </p>
                <div className="text-[9px] text-slate-500 flex items-center justify-between pt-1 border-t border-blue-100">
                  <span>Source: {weather?.provider || weatherProvider || 'OpenWeatherMap'}</span>
                  <span>Observed: {weather?.lastUpdated || 'Current'} ({weather?.current.dataAgeMinutes ?? 0} min ago)</span>
                </div>
              </div>
            )}

            {/* Forecast Peak Details */}
            {activeRainfallSource === 'weather_forecast' && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] space-y-1 animate-in fade-in duration-100">
                <div className="font-semibold text-blue-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-blue-700" />
                    <span>Atmospheric Forecast Peak: {forecastPeak.rate_mmh} mm/h</span>
                  </span>
                  <span className="font-mono bg-white text-blue-800 px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                    Active Input
                  </span>
                </div>
                <p className="text-[10px] text-slate-600">
                  Expected peak precipitation rate at {forecastPeak.time} based on 24-hour meteorological model trajectory.
                </p>
                <div className="text-[9px] text-slate-500 flex items-center justify-between pt-1 border-t border-blue-100">
                  <span>Provider: {weather?.provider || 'OpenWeather / ECMWF'}</span>
                  <span>Forecast Horizon: Next 24 Hours</span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-500 italic leading-snug">
              Notice on Data Distinction: Weather rainfall represents observational or forecasted meteorological input. Simulated flood extents and depths are generated by the illustrative hydraulic model, not real-time emergency hazard predictions.
            </p>
          </div>

          {/* 3. Storm Duration Slider & Presets */}
          <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Storm Duration</span>
              </span>
              <span className="text-sm font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {localConfig.rainfallDuration_hours} Hours
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={localConfig.rainfallDuration_hours}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: '2h Flash Flood', val: 2 },
                { label: '4h Standard Storm', val: 4 },
                { label: '6h Heavy Monsoonal', val: 6 },
                { label: '10h Prolonged Cyclone', val: 10 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleDurationChange(p.val)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                    localConfig.rainfallDuration_hours === p.val
                      ? 'bg-purple-600 text-white border-purple-600 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Soil & Environmental Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Catchment Soil Characteristic
              </label>
              <select
                value={localConfig.soilType}
                onChange={(e) => {
                  const updated = {
                    ...localConfig,
                    soilType: e.target.value as any,
                  };
                  setLocalConfig(updated);
                  onUpdateConfig(updated);
                }}
                className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
              >
                <option value="black_cotton">Black Cotton Clay (High swelling, low infiltration)</option>
                <option value="alluvial_clay">Deltaic Alluvial Silt/Clay</option>
                <option value="red_sandy_loam">Red Sandy Loam (Higher infiltration)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Outfall / Backwater Condition
              </label>
              <select
                value={localConfig.tideOutfallCondition}
                onChange={(e) => {
                  const updated = {
                    ...localConfig,
                    tideOutfallCondition: e.target.value as any,
                  };
                  setLocalConfig(updated);
                  onUpdateConfig(updated);
                }}
                className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
              >
                <option value="normal">Normal Gravity Outflow (Free outfall)</option>
                <option value="high_surge_backwater">High Tide / River Surge Choking (40% backwater)</option>
              </select>
            </div>
          </div>

          {/* 5. Compare Scenarios Button & Results */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scenario Comparison Engine</span>
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Evaluate Baseline (No drains) vs Proposed Smart Infrastructure for {localConfig.rainfallIntensity_mmh} mm/h rain
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunComparison}
                disabled={isComparing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
              >
                {isComparing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Compare Now</span>
              </button>
            </div>

            {comparisonResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700 text-center">
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">Max Depth</span>
                  <div className="text-xs font-bold text-red-400">
                    {comparisonResult.baseline.peakDepth_m}m →{' '}
                    <span className="text-emerald-400">{comparisonResult.proposed.peakDepth_m}m</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    -
                    {Math.round(
                      ((comparisonResult.baseline.peakDepth_m - comparisonResult.proposed.peakDepth_m) /
                        (comparisonResult.baseline.peakDepth_m || 1)) *
                        100
                    )}
                    %
                  </span>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">Inundated Area</span>
                  <div className="text-xs font-bold text-red-400">
                    {comparisonResult.baseline.maxInundatedArea_ha}ha →{' '}
                    <span className="text-emerald-400">{comparisonResult.proposed.maxInundatedArea_ha}ha</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    -
                    {Math.round(
                      ((comparisonResult.baseline.maxInundatedArea_ha -
                        comparisonResult.proposed.maxInundatedArea_ha) /
                        (comparisonResult.baseline.maxInundatedArea_ha || 1)) *
                        100
                    )}
                    %
                  </span>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">Impassable Roads</span>
                  <div className="text-xs font-bold text-red-400">
                    {comparisonResult.baseline.affectedRoads.filter((r) => r.impassable).length} →{' '}
                    <span className="text-emerald-400">
                      {comparisonResult.proposed.affectedRoads.filter((r) => r.impassable).length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300">Corridors cleared</span>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">Avoided Loss</span>
                  <div className="text-xs font-bold text-emerald-400">
                    ₹
                    {(
                      comparisonResult.baseline.estimatedLoss_lakhs -
                      comparisonResult.proposed.estimatedLoss_lakhs
                    ).toFixed(1)}{' '}
                    Lakhs
                  </div>
                  <span className="text-[10px] text-slate-300">Net economic saving</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="text-[11px] text-slate-500">
            Last simulated:{' '}
            <strong className="text-slate-800 font-mono">
              {latestResult.timestamp || 'Not run yet'}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyAndRun}
              disabled={isSimulating}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {isSimulating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              <span>Apply & Run Simulation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
