import React, { useState } from 'react';
import {
  Waves,
  Play,
  Loader2,
  CloudRain,
  MapPin,
  Clock,
  ShieldCheck,
  Navigation,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Maximize2,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type { SimulationConfig, SimulationResult } from '../../types/village';
import type { SimulationRainfallMode, WeatherData } from '../../types/weather';

interface SimpleFloodSimulationPanelProps {
  currentLocation: LocationSearchResult;
  simConfig: SimulationConfig;
  onUpdateConfig: (config: SimulationConfig) => void;
  rainfallMode: SimulationRainfallMode;
  onSetRainfallMode: (mode: SimulationRainfallMode, value_mmh?: number) => void;
  weather: WeatherData | null;
  onRunSimulation: (config: SimulationConfig) => Promise<void>;
  isSimulating: boolean;
  latestResult: SimulationResult | null;
  onOpenEvacuation: () => void;
  onZoomInundation?: () => void;
}

export const SimpleFloodSimulationPanel: React.FC<SimpleFloodSimulationPanelProps> = ({
  currentLocation,
  simConfig,
  onUpdateConfig,
  rainfallMode,
  onSetRainfallMode,
  weather,
  onRunSimulation,
  isSimulating,
  latestResult,
  onOpenEvacuation,
  onZoomInundation,
}) => {
  const currentRain = weather?.current?.rainfall_mmh ?? 0;
  const isWeatherMode =
    rainfallMode === 'weather_observed' ||
    rainfallMode === 'weather_hourly_completed' ||
    rainfallMode === 'weather_forecast';

  const durationOptions = [1, 3, 6, 12, 24];

  // Presets for custom rainfall
  const rainPresets = [
    { label: 'Light Shower', value: 15 },
    { label: 'Heavy Rain', value: 40 },
    { label: 'Extreme Storm', value: 65 },
  ];

  const handleSelectRainSource = (mode: 'weather' | 'custom') => {
    if (mode === 'weather') {
      onSetRainfallMode('weather_observed', currentRain);
      onUpdateConfig({
        ...simConfig,
        rainfallIntensity_mmh: currentRain,
      });
    } else {
      onSetRainfallMode('custom', 65);
      onUpdateConfig({
        ...simConfig,
        rainfallIntensity_mmh: 65,
      });
    }
  };

  const handleSelectPreset = (value: number) => {
    onSetRainfallMode('custom', value);
    onUpdateConfig({
      ...simConfig,
      rainfallIntensity_mmh: value,
    });
  };

  const handleSelectDuration = (hours: number) => {
    onUpdateConfig({
      ...simConfig,
      rainfallDuration_hours: hours,
    });
  };

  const hasResult = !!(latestResult && latestResult.timestamp && latestResult.timestamp !== 'Computing...' && latestResult.timestamp !== 'Calculating inundation...');
  const canonical = latestResult?.canonicalResult;
  const areaHa = canonical ? canonical.impactedHectares : (latestResult?.maxInundatedArea_ha || 0);
  const areaKm2 = canonical ? canonical.impactedSquareKilometres : (areaHa / 100).toFixed(2);
  const peakDepth = canonical ? canonical.depthStatistics.peakDepth_m : (latestResult?.peakDepth_m || 0);

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-slate-200 bg-slate-50/70 shrink-0">
        <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
          <Waves className="w-4 h-4 text-blue-600" />
          <span>Simulate a Flood</span>
        </h2>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Run 2D hydrological inundation models in 4 easy steps
        </p>
      </div>

      <div className="p-3.5 space-y-4 flex-1">
        {/* Step 1: Confirm Location */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
              1
            </span>
            <span>Target Location</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="font-semibold text-slate-900 truncate">
              {currentLocation.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-medium capitalize">
              {currentLocation.adminLevel.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {currentLocation.district}, {currentLocation.state} · Elevation: ~{currentLocation.elevation_m || 25}m
          </p>
        </div>

        {/* Step 2: Rainfall Input */}
        <div className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                2
              </span>
              <span>Choose Rainfall Input</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700">
              {simConfig.rainfallIntensity_mmh} mm/h
            </span>
          </div>

          {/* Toggle Weather vs Custom */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => handleSelectRainSource('weather')}
              className={`py-1.5 px-2 rounded-md font-medium text-center transition-all cursor-pointer ${
                isWeatherMode
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Weather ({currentRain} mm/h)
            </button>
            <button
              onClick={() => handleSelectRainSource('custom')}
              className={`py-1.5 px-2 rounded-md font-medium text-center transition-all cursor-pointer ${
                !isWeatherMode
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Scenario
            </button>
          </div>

          {/* Custom Presets */}
          {!isWeatherMode && (
            <div className="mt-2.5 space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {rainPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`py-1 px-1.5 text-center rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      simConfig.rainfallIntensity_mmh === preset.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>{preset.label}</div>
                    <div className="text-[10px] font-mono text-slate-500">{preset.value} mm/h</div>
                  </button>
                ))}
              </div>

              {/* Slider for precision */}
              <div className="pt-1">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={simConfig.rainfallIntensity_mmh}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    handleSelectPreset(val);
                  }}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Duration Selector */}
        <div className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                3
              </span>
              <span>Rainfall Duration</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700">
              {simConfig.rainfallDuration_hours} hours
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {durationOptions.map((hours) => (
              <button
                key={hours}
                onClick={() => handleSelectDuration(hours)}
                className={`py-1.5 text-center rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  simConfig.rainfallDuration_hours === hours
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Run Simulation Button */}
        <div>
          <button
            onClick={() => onRunSimulation(simConfig)}
            disabled={isSimulating}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Simulating Flood & Hydrology...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Simulate Flood ({simConfig.rainfallIntensity_mmh} mm/h · {simConfig.rainfallDuration_hours}h)</span>
              </>
            )}
          </button>
        </div>

        {/* Live Computing Feedback State (Requirement Part 2, Item 10) */}
        {isSimulating && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs text-blue-800 space-y-1 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
            <div className="font-bold">Calculating 2D Flood Inundation...</div>
            <div className="text-[11px] text-blue-600">
              Computing water flow, soil infiltration, and drainage conveyance for {currentLocation.name}.
            </div>
          </div>
        )}

        {/* Case A: Simulation Completed with ZERO Inundation (Requirement Part 2, Item 12) */}
        {!isSimulating && hasResult && areaHa === 0 && (
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Simulation Completed: No Inundation Calculated</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-snug">
              No inundation calculated for this scenario in <strong>{currentLocation.name}</strong>. Rainfall of {simConfig.rainfallIntensity_mmh} mm/h was safely absorbed by soil infiltration ({simConfig.infiltrationRate_mmh || 6} mm/h) or conveyed by local drainage channels.
            </p>
            <div className="text-[10px] text-slate-500 font-mono">
              Inputs: {simConfig.rainfallIntensity_mmh} mm/h · {simConfig.rainfallDuration_hours}h duration · Location: {currentLocation.name}
            </div>
          </div>
        )}

        {/* Case B: Simulation Completed with POSITIVE Inundation */}
        {!isSimulating && hasResult && areaHa > 0 && (
          <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Simulation Results ({currentLocation.name})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {latestResult?.timestamp || 'Just now'}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Flood Area</span>
                <span className="text-sm font-extrabold text-blue-700">
                  {areaHa} ha
                </span>
                <span className="text-[10px] text-slate-500 block">({areaKm2} km²)</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Peak Depth</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {peakDepth}m
                </span>
                <span className="text-[10px] text-slate-500 block">Max water level</span>
              </div>
            </div>

            {/* At-Risk Infrastructure */}
            <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span>Vulnerable Roads:</span>
                <span className="font-semibold text-rose-700">
                  {latestResult?.affectedRoads?.length || 0} segments
                </span>
              </div>
              <div className="flex justify-between">
                <span>Inundated Buildings:</span>
                <span className="font-semibold text-rose-700">
                  {latestResult?.affectedBuildings?.length || 0} structures
                </span>
              </div>
            </div>

            {/* Action Buttons: Zoom to Flood Area & Safe Evacuation Routes */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {onZoomInundation && (
                <button
                  type="button"
                  onClick={onZoomInundation}
                  className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-colors"
                  title="Zoom map camera to actual flood inundation boundary"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Zoom Area</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenEvacuation}
                className={`py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-colors ${
                  !onZoomInundation ? 'col-span-2' : ''
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Safe Routes</span>
              </button>
            </div>

            {/* Scientific Disclaimer */}
            <p className="text-[9px] text-slate-500 italic text-center">
              * Simulated scenario calculation based on digital elevation and hydrology models, not an observed real-time flood.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
