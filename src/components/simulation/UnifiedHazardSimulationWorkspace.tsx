import React, { useState, useEffect, useRef } from 'react';
import {
  Waves,
  Wind,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  CloudRain,
  MapPin,
  Clock,
  ShieldCheck,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Info,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Radio,
  ExternalLink,
  Compass,
  HelpCircle,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type { SimulationConfig, SimulationResult, SimulationFrame } from '../../types/village';
import type { SimulationRainfallMode, WeatherData } from '../../types/weather';
import { CycloneCauseExplainer } from '../cyclone/CycloneCauseExplainer';
import {
  getSimulationFloodFrameGeoJson,
  getSimulationFrameStats,
} from '../../services/simulationService';
import {
  type CycloneState,
  type CycloneMode,
  type CycloneIntensityCode,
  CYCLONE_INTENSITY_SCALES,
  PREDEFINED_DEMO_SCENARIOS,
  generateDemoCycloneTrack,
  fetchLiveOfficialCycloneTrack,
  calculateCycloneImpactOnLocation,
  buildGeoJsonForWindRadii,
} from '../../services/cycloneTrackingService';
import { SharedHazardTimeline } from './SharedHazardTimeline';

export interface UnifiedHazardSimulationWorkspaceProps {
  currentLocation: LocationSearchResult;
  dataset?: {
    villageName?: string;
    elevation_m?: number;
    roads?: { features: any[] };
    buildings?: { features: any[] };
  };
  // Weather info
  weather: WeatherData | null;
  isLoadingWeather?: boolean;
  // Flood Simulation State & Handlers
  simConfig: SimulationConfig;
  onUpdateSimConfig: (config: SimulationConfig) => void;
  rainfallMode: SimulationRainfallMode;
  onSetRainfallMode: (mode: SimulationRainfallMode, value_mmh?: number) => void;
  onRunFloodSimulation: (config: SimulationConfig) => Promise<void>;
  isFloodSimulating: boolean;
  floodResult: SimulationResult | null;
  activeFloodHour: number | null;
  onSelectFloodHour: (hour: number | null) => void;
  isFloodPlaying: boolean;
  onToggleFloodPlay: () => void;
  onResetFlood: () => void;
  onZoomInundation?: () => void;
  onOpenEvacuation?: () => void;
  // Cyclone Simulation State & Handlers
  cycloneState: CycloneState | null;
  onUpdateCycloneState: (state: CycloneState | null) => void;
  onZoomToStorm?: (coords: [number, number]) => void;
  // Active Workspace Mode (default 'flood')
  initialMode?: 'flood' | 'cyclone';
  onModeChange?: (mode: 'flood' | 'cyclone') => void;
}

export const UnifiedHazardSimulationWorkspace: React.FC<UnifiedHazardSimulationWorkspaceProps> = ({
  currentLocation,
  dataset,
  weather,
  isLoadingWeather = false,
  simConfig,
  onUpdateSimConfig,
  rainfallMode,
  onSetRainfallMode,
  onRunFloodSimulation,
  isFloodSimulating,
  floodResult,
  activeFloodHour,
  onSelectFloodHour,
  isFloodPlaying,
  onToggleFloodPlay,
  onResetFlood,
  onZoomInundation,
  onOpenEvacuation,
  cycloneState,
  onUpdateCycloneState,
  onZoomToStorm,
  initialMode = 'flood',
  onModeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'flood' | 'cyclone'>(initialMode);
  const [isAdvancedFloodOpen, setIsAdvancedFloodOpen] = useState(false);
  const [isAdvancedCycloneOpen, setIsAdvancedCycloneOpen] = useState(false);
  const [showCauseExplainer, setShowCauseExplainer] = useState<boolean>(true);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(3);

  // Sync mode with parent if callback exists
  const handleTabSwitch = (mode: 'flood' | 'cyclone') => {
    setActiveTab(mode);
    if (onModeChange) onModeChange(mode);
  };

  // --------------------------------------------------------------------------
  // FLOOD SIMULATION HELPERS & METRICS
  // --------------------------------------------------------------------------
  const currentRainRate = weather?.current?.rainfall_mmh ?? 0;
  const forecastPeakRate = Math.max(
    0,
    weather?.rainfallDiagnostics?.nearTermForecast?.next1h?.rate_mmh ?? 0,
    ...(weather?.hourlyForecast?.slice(0, 6).map((h) => h.rainfall_mmh ?? h.rainfall_mm) || [0])
  );
  const isWeatherMode =
    rainfallMode === 'weather_observed' ||
    rainfallMode === 'weather_hourly_completed' ||
    rainfallMode === 'weather_forecast';

  const durationOptions = [1, 3, 6, 12, 24];
  const rainPresets = [
    { label: 'Light Shower', value: 15 },
    { label: 'Heavy Rain', value: 40 },
    { label: 'Extreme Storm', value: 65 },
  ];

  const handleSelectRainSource = (mode: 'weather' | 'forecast' | 'custom') => {
    if (mode === 'weather') {
      onSetRainfallMode('weather_observed', currentRainRate);
      onUpdateSimConfig({
        ...simConfig,
        rainfallIntensity_mmh: currentRainRate,
        rainfallSource: 'weather_observed',
      });
    } else if (mode === 'forecast') {
      onSetRainfallMode('weather_forecast', forecastPeakRate);
      onUpdateSimConfig({
        ...simConfig,
        rainfallIntensity_mmh: forecastPeakRate,
        rainfallSource: 'weather_forecast',
      });
    } else {
      onSetRainfallMode('custom', 65);
      onUpdateSimConfig({
        ...simConfig,
        rainfallIntensity_mmh: 65,
        rainfallSource: 'custom',
      });
    }
  };

  const handleSelectPreset = (value: number) => {
    onSetRainfallMode('custom', value);
    onUpdateSimConfig({
      ...simConfig,
      rainfallIntensity_mmh: value,
      rainfallSource: 'custom',
    });
  };

  const handleSelectDuration = (hours: number) => {
    onUpdateSimConfig({
      ...simConfig,
      rainfallDuration_hours: hours,
    });
  };

  // Resolve current active frame statistics
  const currentFloodFrame: SimulationFrame | null = floodResult
    ? getSimulationFrameStats(floodResult, activeFloodHour)
    : null;

  const totalFloodFrames = floodResult?.frames?.length || 0;
  const effectiveFloodHour = currentFloodFrame ? currentFloodFrame.hour : activeFloodHour ?? 0;
  const floodAreaHa = currentFloodFrame ? currentFloodFrame.inundatedArea_ha : (floodResult?.maxInundatedArea_ha || 0);
  const floodAreaKm2 = (floodAreaHa / 100).toFixed(2);
  const currentDepthM = currentFloodFrame ? currentFloodFrame.maxDepth_m : (floodResult?.peakDepth_m || 0);

  // Buildings data availability check (per PART 5: missing buildings must result in "Building impact unavailable", not confirmed zero)
  const hasBuildingFootprints = !!(dataset?.buildings?.features && dataset.buildings.features.length > 0);
  const buildingExposureText = hasBuildingFootprints
    ? `${currentFloodFrame?.floodedBuildingsCount ?? 0} structures`
    : 'Building impact unavailable (no footprint dataset)';

  const hasRoadsData = !!(dataset?.roads?.features && dataset.roads.features.length > 0);
  const activeFrameRoads = currentFloodFrame?.affectedRoads ?? (floodResult?.affectedRoads || []);
  const floodedRoadCount = activeFrameRoads.filter((r) => r.status === 'flooded' || r.depth_m > 0.25).length;
  const affectedRoadCount = activeFrameRoads.filter((r) => r.status === 'affected' || (r.depth_m > 0 && r.depth_m <= 0.25)).length;
  const roadExposureText = hasRoadsData
    ? floodedRoadCount > 0
      ? `${floodedRoadCount} severed (${currentFloodFrame?.affectedRoadsKm ?? 0} km)`
      : affectedRoadCount > 0
      ? `${affectedRoadCount} waterlogged (${currentFloodFrame?.affectedRoadsKm ?? 0} km)`
      : `${currentFloodFrame?.affectedRoadsKm ?? 0} km affected`
    : 'Road impact unavailable';

  const hasFloodResult = !!(
    floodResult &&
    floodResult.timestamp &&
    floodResult.timestamp !== 'Computing...' &&
    floodResult.timestamp !== 'Calculating inundation...'
  );

  // --------------------------------------------------------------------------
  // CYCLONE SIMULATION STATE & CONTROLS
  // --------------------------------------------------------------------------
  const [cycloneMode, setCycloneMode] = useState<CycloneMode>('demo');
  const [selectedDemoScenarioId, setSelectedDemoScenarioId] = useState<string>('bob-andhra-odisha');
  const [demoIntensity, setDemoIntensity] = useState<CycloneIntensityCode>('VSCS');
  const [demoForwardSpeed, setDemoForwardSpeed] = useState<number>(16);
  const [isLoadingLiveCyclone, setIsLoadingLiveCyclone] = useState<boolean>(false);
  const [isCyclonePlaying, setIsCyclonePlaying] = useState<boolean>(false);
  const cyclonePlayIntervalRef = useRef<any>(null);

  // Initialize or reload demonstration track
  const handleLoadDemoScenario = (scenarioId: string, intensity: CycloneIntensityCode, speed: number) => {
    const demo = generateDemoCycloneTrack({
      scenarioId,
      peakIntensity: intensity,
      forwardSpeedKmh: speed,
    });
    onUpdateCycloneState(demo);
  };

  // Initialize cyclone state if absent
  useEffect(() => {
    if (!cycloneState && activeTab === 'cyclone') {
      handleLoadDemoScenario(selectedDemoScenarioId, demoIntensity, demoForwardSpeed);
    }
  }, [activeTab]);

  // Cyclone play timer
  useEffect(() => {
    if (isCyclonePlaying && cycloneState && cycloneState.steps.length > 0) {
      cyclonePlayIntervalRef.current = setInterval(() => {
        onUpdateCycloneState({
          ...cycloneState,
          currentStepIndex: (cycloneState.currentStepIndex + 1) % cycloneState.steps.length,
          windRadiiGeoJson: buildGeoJsonForWindRadii(
            cycloneState.steps[(cycloneState.currentStepIndex + 1) % cycloneState.steps.length]
          ),
        });
      }, 1000);
    } else {
      if (cyclonePlayIntervalRef.current) clearInterval(cyclonePlayIntervalRef.current);
    }

    return () => {
      if (cyclonePlayIntervalRef.current) clearInterval(cyclonePlayIntervalRef.current);
    };
  }, [isCyclonePlaying, cycloneState]);

  // Switch Cyclone mode (Live vs Demo)
  const handleSwitchCycloneMode = async (mode: CycloneMode) => {
    setCycloneMode(mode);
    setIsCyclonePlaying(false);

    if (mode === 'live') {
      setIsLoadingLiveCyclone(true);
      try {
        const live = await fetchLiveOfficialCycloneTrack();
        onUpdateCycloneState(live);
      } finally {
        setIsLoadingLiveCyclone(false);
      }
    } else {
      handleLoadDemoScenario(selectedDemoScenarioId, demoIntensity, demoForwardSpeed);
    }
  };

  const currentCycloneStep =
    cycloneState && cycloneState.steps.length > 0
      ? cycloneState.steps[cycloneState.currentStepIndex]
      : null;

  const cycloneLocationImpact = (currentCycloneStep && cycloneState)
    ? calculateCycloneImpactOnLocation(
        currentCycloneStep,
        cycloneState.steps,
        currentLocation,
        dataset,
        cycloneState.mode === 'demo'
      )
    : null;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-slate-800">
      {/* 1. Header & Workspace Mode Switcher */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/80 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Simulate Hazard Workspace</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 font-mono">
            Interactive GIS
          </span>
        </div>

        {/* 2-Mode Tab Switcher (Flood vs Cyclone) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabSwitch('flood')}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'flood'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Flood Simulation</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('cyclone')}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'cyclone'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Cyclone Simulation</span>
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 p-3 space-y-3.5 overflow-y-auto">

        {/* Target Location Card (Shared across modes) */}
        <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/60 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Target Settlement</span>
            </div>
            <div className="text-xs font-extrabold text-slate-900 truncate mt-0.5">
              {currentLocation.name}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {currentLocation.district}, {currentLocation.state} · Elevation: ~{currentLocation.elevation_m || 25}m
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold capitalize shrink-0">
            {currentLocation.adminLevel.replace('_', ' ')}
          </span>
        </div>

        {/* ================================================================= */}
        {/* MODE 1: FLOOD SIMULATION WORKSPACE                                */}
        {/* ================================================================= */}
        {activeTab === 'flood' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            
            {/* Step A: Rainfall Source Selection */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rainfall Input</span>
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {simConfig.rainfallIntensity_mmh} mm/h
                </span>
              </div>

              {/* Weather vs Forecast vs Custom Toggle */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectRainSource('weather')}
                  className={`py-1.5 px-1.5 rounded-md font-medium text-center transition-all cursor-pointer ${
                    rainfallMode === 'weather_observed' || rainfallMode === 'weather_hourly_completed'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Use live Open-Meteo precipitation rate (preserves true dry weather 0 mm/h without forcing fake rain)"
                >
                  Live ({currentRainRate.toFixed(1)} mm/h)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRainSource('forecast')}
                  className={`py-1.5 px-1.5 rounded-md font-medium text-center transition-all cursor-pointer ${
                    rainfallMode === 'weather_forecast'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Use peak forecasted rainfall intensity from NWP model"
                >
                  Forecast ({forecastPeakRate.toFixed(1)} mm/h)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRainSource('custom')}
                  className={`py-1.5 px-1.5 rounded-md font-medium text-center transition-all cursor-pointer ${
                    rainfallMode === 'custom'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Configure custom design-storm rainfall intensity"
                >
                  Custom
                </button>
              </div>

              {/* Custom Presets & Precision Slider */}
              {rainfallMode === 'custom' && (
                <div className="pt-1 space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {rainPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
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

                  <div className="pt-0.5">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>Intensity Range</span>
                      <span className="font-mono">{simConfig.rainfallIntensity_mmh} mm/h</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="140"
                      step="5"
                      value={simConfig.rainfallIntensity_mmh}
                      onChange={(e) => handleSelectPreset(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      aria-label="Rainfall intensity slider"
                    />
                  </div>
                </div>
              )}

              {/* Live Weather-Driven Telemetry & Completed Interval Accumulations */}
              {(rainfallMode === 'weather_observed' || rainfallMode === 'weather_hourly_completed') && weather?.pastRainfall && (
                <div className="pt-1.5 space-y-1 text-[11px] bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-700">Observed / Modelled Intensity:</span>
                    <span className="font-bold text-blue-700">
                      {currentRainRate.toFixed(1)} mm/h ({weather.current.intensityBand?.label || 'Normal'})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-[9px] pt-0.5">
                    <div className="bg-white p-1 rounded border border-blue-200">
                      <div className="text-slate-400 uppercase font-semibold">Past 1h</div>
                      <div className="font-bold text-slate-800">{weather.pastRainfall.last1h_mm} mm</div>
                    </div>
                    <div className="bg-white p-1 rounded border border-blue-200">
                      <div className="text-slate-400 uppercase font-semibold">Past 3h</div>
                      <div className="font-bold text-slate-800">{weather.pastRainfall.last3h_mm} mm</div>
                    </div>
                    <div className="bg-white p-1 rounded border border-blue-200">
                      <div className="text-slate-400 uppercase font-semibold">Past 6h</div>
                      <div className="font-bold text-slate-800">{weather.pastRainfall.last6h_mm} mm</div>
                    </div>
                    <div className="bg-white p-1 rounded border border-blue-200">
                      <div className="text-slate-400 uppercase font-semibold">Past 24h</div>
                      <div className="font-bold text-slate-800">{weather.pastRainfall.last24h_mm} mm</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Forecast Peak Telemetry & Near-Term Windows */}
              {rainfallMode === 'weather_forecast' && weather?.rainfallDiagnostics?.nearTermForecast && (
                <div className="pt-1.5 space-y-1 text-[11px] bg-sky-50/60 p-2 rounded-lg border border-sky-100">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-700">Forecast Storm Loading:</span>
                    <span className="font-bold text-sky-800">
                      Peak {forecastPeakRate.toFixed(1)} mm/h ({weather.hourlyForecast?.[0]?.time || 'Next hours'})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-[9px] pt-0.5">
                    <div className="bg-white p-1 rounded border border-sky-200">
                      <div className="text-slate-400 uppercase font-semibold">Next 1h Accum</div>
                      <div className="font-bold text-blue-900">{weather.rainfallDiagnostics.nearTermForecast.next1h.rainfall_mm} mm</div>
                      <div className="text-[8px] text-slate-500 font-mono">avg {weather.rainfallDiagnostics.nearTermForecast.next1h.rainfall_mm === 0 ? '0.0' : weather.rainfallDiagnostics.nearTermForecast.next1h.rate_mmh.toFixed(2)} mm/h</div>
                    </div>
                    <div className="bg-white p-1 rounded border border-sky-200">
                      <div className="text-slate-400 uppercase font-semibold">Next 3h Accum</div>
                      <div className="font-bold text-blue-900">{weather.rainfallDiagnostics.nearTermForecast.next3h.rainfall_mm} mm</div>
                      <div className="text-[8px] text-slate-500 font-mono">avg {weather.rainfallDiagnostics.nearTermForecast.next3h.rainfall_mm === 0 ? '0.0' : weather.rainfallDiagnostics.nearTermForecast.next3h.rate_mmh.toFixed(2)} mm/h</div>
                    </div>
                    <div className="bg-white p-1 rounded border border-sky-200">
                      <div className="text-slate-400 uppercase font-semibold">Next 6h Accum</div>
                      <div className="font-bold text-blue-900">{weather.rainfallDiagnostics.nearTermForecast.next6h.rainfall_mm} mm</div>
                      <div className="text-[8px] text-slate-500 font-mono">avg {weather.rainfallDiagnostics.nearTermForecast.next6h.rainfall_mm === 0 ? '0.0' : weather.rainfallDiagnostics.nearTermForecast.next6h.rate_mmh.toFixed(2)} mm/h</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Source Classification Tag */}
              <div className="text-[10px] text-slate-500 pt-0.5 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Input Tag:</span>
                {rainfallMode === 'weather_forecast' ? (
                  <span className="text-sky-700 font-medium">
                    NWP Forecast Peak Loading ({simConfig.rainfallIntensity_mmh} mm/h)
                  </span>
                ) : isWeatherMode ? (
                  <span className="text-emerald-700 font-medium">
                    Verified Open-Meteo Model Data ({currentRainRate === 0 ? 'Dry-weather 0.0 mm/h' : `${currentRainRate} mm/h`})
                  </span>
                ) : (
                  <span className="text-indigo-700 font-medium">
                    User-Defined Design Storm ({simConfig.rainfallIntensity_mmh} mm/h)
                  </span>
                )}
              </div>
            </div>

            {/* Step B: Rainfall Duration */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rainfall Duration</span>
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {simConfig.rainfallDuration_hours} hours
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {durationOptions.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSelectDuration(h)}
                    className={`py-1.5 text-center rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      simConfig.rainfallDuration_hours === h
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-slate-500 font-mono">
                Total Rainfall Volume: {simConfig.rainfallIntensity_mmh * simConfig.rainfallDuration_hours} mm accumulated
              </div>
            </div>

            {/* Step C: Expandable Advanced Catchment & Drainage Parameters */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAdvancedFloodOpen(!isAdvancedFloodOpen)}
                className="w-full p-2.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Advanced Catchment & Drainage Settings</span>
                </span>
                {isAdvancedFloodOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isAdvancedFloodOpen && (
                <div className="p-3 bg-white space-y-2.5 text-xs text-slate-700 border-t border-slate-200 animate-in fade-in">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-800 block mb-1">
                      Drainage Infrastructure Condition:
                    </label>
                    <select
                      value={simConfig.scenario}
                      onChange={(e) => onUpdateSimConfig({ ...simConfig, scenario: e.target.value as any })}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option value="baseline">Baseline (Unlined, Natural Depression Ponding)</option>
                      <option value="existing_drainage">Existing Silted Box Drains (Standard Maintenance)</option>
                      <option value="proposed_intervention">Proposed Desilted Drains + Retention Basins</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-800 block mb-1">
                      Soil Type & Steady-State Infiltration:
                    </label>
                    <select
                      value={simConfig.soilType}
                      onChange={(e) =>
                        onUpdateSimConfig({
                          ...simConfig,
                          soilType: e.target.value as any,
                          infiltrationRate_mmh:
                            e.target.value === 'black_cotton' ? 6.0 : e.target.value === 'alluvial_clay' ? 8.5 : 18.0,
                        })
                      }
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option value="black_cotton">Black Cotton Clay (High swelling, 6.0 mm/h)</option>
                      <option value="alluvial_clay">Alluvial Coastal Clay (Moderate, 8.5 mm/h)</option>
                      <option value="sandy_loam">Sandy Loam / Red Soil (High infiltration, 18.0 mm/h)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-800 block mb-1">
                      Outfall & Coastal Surge Condition:
                    </label>
                    <select
                      value={simConfig.tideOutfallCondition}
                      onChange={(e) => onUpdateSimConfig({ ...simConfig, tideOutfallCondition: e.target.value as any })}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option value="normal">Normal Gravity Outfall (Free Drainage)</option>
                      <option value="high_surge_backwater">High Surge / Tidal Backwater (Choked Outfall)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Step D: Run Button */}
            <button
              type="button"
              onClick={() => onRunFloodSimulation(simConfig)}
              disabled={isFloodSimulating}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {isFloodSimulating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing 2D Inundation & Hydrology...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    Run Flood Simulation ({simConfig.rainfallIntensity_mmh} mm/h · {simConfig.rainfallDuration_hours}h)
                  </span>
                </>
              )}
            </button>

            {/* Time-Stepped Map Visualization & Shared Timeline (Visible when result exists) */}
            {hasFloodResult && floodResult.frames && floodResult.frames.length > 0 && (
              <div className="space-y-3 pt-1">
                <SharedHazardTimeline
                  hazardType="flood"
                  currentStepIndex={effectiveFloodHour}
                  totalSteps={totalFloodFrames}
                  stepLabel={`Hour ${effectiveFloodHour}h: ${
                    effectiveFloodHour === floodResult.peakHour ? 'Peak Inundation Window' : 'Progressive Pluvial Flow'
                  }`}
                  subLabel={`Rain: ${currentFloodFrame?.rainfallThisHour_mm || 0} mm/h · Water Depth: ${
                    currentDepthM > 0 ? `${currentDepthM.toFixed(2)}m` : '0.00m'
                  } · Area: ${floodAreaHa} ha`}
                  sourceClassification="simulation"
                  isPlaying={isFloodPlaying}
                  onTogglePlay={onToggleFloodPlay}
                  onStepChange={(hourIdx) => onSelectFloodHour(hourIdx)}
                  onReset={onResetFlood}
                />

                {/* Frame-Specific Results Card */}
                <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        {effectiveFloodHour === floodResult.peakHour
                          ? `Peak Simulation Result (${currentLocation.name})`
                          : `Time-Step Hour ${effectiveFloodHour}h Spatial Result`}
                      </span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold px-1.5 py-0.5 rounded bg-blue-100">
                      MODELLED SIMULATION
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Flooded Area</span>
                      <span className="text-sm font-extrabold text-blue-700">{floodAreaHa} ha</span>
                      <span className="text-[10px] text-slate-500 block">({floodAreaKm2} km²)</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Water Depth</span>
                      <span className="text-sm font-extrabold text-slate-900">{currentDepthM.toFixed(2)}m</span>
                      <span className="text-[10px] text-slate-500 block">Max standing depth</span>
                    </div>
                  </div>

                  {/* Exposure Statistics (per PART 5: missing buildings must result in "Building impact unavailable") */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Affected Roads:</span>
                      <span className="font-semibold text-rose-700">{roadExposureText}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Inundated Buildings:</span>
                      <span
                        className={`font-semibold ${
                          hasBuildingFootprints ? 'text-rose-700' : 'text-slate-500 italic'
                        }`}
                      >
                        {buildingExposureText}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {onZoomInundation && (
                      <button
                        type="button"
                        onClick={onZoomInundation}
                        className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        title="Zoom map camera to simulated flood boundary"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Zoom Area</span>
                      </button>
                    )}

                    {onOpenEvacuation && (
                      <button
                        type="button"
                        onClick={onOpenEvacuation}
                        className={`py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer ${
                          !onZoomInundation ? 'col-span-2' : ''
                        }`}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Safe Evac Routes</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Model Limitations & Scope */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-700 flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-500" />
                    <span>Hydrological Model Scope & Limitations</span>
                  </div>
                  <p className="leading-relaxed">
                    2D pluvial depression solver calculates water accumulation from elevation hypsometry, soil
                    infiltration curves, and drainage conveyance. For riverine flood levels, monitor official CWC river
                    telemetry stations.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* MODE 2: CYCLONE SIMULATION WORKSPACE                             */}
        {/* ================================================================= */}
        {activeTab === 'cyclone' && (
          <div className="space-y-3 animate-in fade-in duration-150">

            {/* Mode Switcher: Live Official Track vs Demonstration Scenario */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/70 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-600" />
                <span>Operating Mode</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchCycloneMode('live')}
                  className={`py-1.5 px-2 rounded-md font-bold text-center transition-all cursor-pointer ${
                    cycloneMode === 'live'
                      ? 'bg-white text-rose-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Query verified active cyclone bulletins from IMD RSMC New Delhi"
                >
                  Live Official Track
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchCycloneMode('demo')}
                  className={`py-1.5 px-2 rounded-md font-bold text-center transition-all cursor-pointer ${
                    cycloneMode === 'demo'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Interactive demonstration cyclone scenario with custom track, forward speed, and wind radii"
                >
                  Demonstration Mode
                </button>
              </div>

              {/* High-Contrast Persistent Disclaimer for Demonstration Mode */}
              {cycloneMode === 'demo' && (
                <div className="bg-amber-500 text-slate-950 border border-amber-600 px-3 py-1.5 rounded-lg text-center font-black text-[10.5px] uppercase tracking-wider shadow-sm animate-pulse">
                  DEMO — NOT A REAL FORECAST
                </div>
              )}
            </div>

            {/* Demonstration Scenario Controls */}
            {cycloneMode === 'demo' && (
              <div className="border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-800 block mb-1">
                    Select Illustrative Storm Track:
                  </label>
                  <select
                    value={selectedDemoScenarioId}
                    onChange={(e) => {
                      setSelectedDemoScenarioId(e.target.value);
                      handleLoadDemoScenario(e.target.value, demoIntensity, demoForwardSpeed);
                    }}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  >
                    {PREDEFINED_DEMO_SCENARIOS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.basin})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-800 block mb-1">Peak Intensity:</label>
                    <select
                      value={demoIntensity}
                      onChange={(e) => {
                        const code = e.target.value as CycloneIntensityCode;
                        setDemoIntensity(code);
                        handleLoadDemoScenario(selectedDemoScenarioId, code, demoForwardSpeed);
                      }}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                    >
                      <option value="CS">Cyclonic Storm (CS, 62-88 km/h)</option>
                      <option value="SCS">Severe CS (SCS, 89-117 km/h)</option>
                      <option value="VSCS">Very Severe CS (VSCS, 118-166 km/h)</option>
                      <option value="ESCS">Extremely Severe CS (ESCS, 167-221 km/h)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-800 block mb-1">Forward Speed:</label>
                    <select
                      value={demoForwardSpeed}
                      onChange={(e) => {
                        const spd = Number(e.target.value);
                        setDemoForwardSpeed(spd);
                        handleLoadDemoScenario(selectedDemoScenarioId, demoIntensity, spd);
                      }}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                    >
                      <option value="12">12 km/h (Slow translation)</option>
                      <option value="16">16 km/h (Standard forward speed)</option>
                      <option value="22">22 km/h (Fast translation)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Live Official Track Loading or Empty Status */}
            {cycloneMode === 'live' && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2 text-xs">
                {isLoadingLiveCyclone ? (
                  <div className="py-4 text-center space-y-1">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-rose-600" />
                    <div className="font-bold text-slate-800">Querying Official IMD Cyclone Feeds...</div>
                    <div className="text-[10px] text-slate-500">Connecting to RSMC New Delhi bulletin registry</div>
                  </div>
                ) : !cycloneState?.hasActiveLiveTrack ? (
                  <div className="text-center py-2 space-y-1">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto" />
                    <div className="font-bold text-slate-900">No Verified Active Cyclone Track Available</div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      India Meteorological Department (IMD RSMC New Delhi) reports no active tropical cyclone in the
                      North Indian Ocean (Bay of Bengal or Arabian Sea) today.
                    </p>
                    <div className="text-[9.5px] text-slate-400 font-mono pt-1">
                      Source: IMD RSMC New Delhi Official Cyclone Bulletin Feed
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="font-bold text-rose-900">Active Official Storm: {cycloneState.stormName}</div>
                    <div className="text-[11px] text-slate-700">Issuing Agency: {cycloneState.issuingAgency}</div>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Controller for Cyclone Track */}
            {cycloneState && cycloneState.steps.length > 0 && (
              <div className="space-y-3">
                <SharedHazardTimeline
                  hazardType="cyclone"
                  currentStepIndex={cycloneState.currentStepIndex}
                  totalSteps={cycloneState.steps.length}
                  stepLabels={cycloneState.steps.map((s) => s.label)}
                  stepLabel={`${currentCycloneStep?.label || 'Step'}: ${currentCycloneStep?.intensityLabel || ''}`}
                  subLabel={`Max Winds: ${currentCycloneStep?.maxWindKmh || 0} km/h (${
                    currentCycloneStep?.maxWindKnots || 0
                  } kt) · Pressure: ${currentCycloneStep?.centralPressureHpa || 990} hPa`}
                  sourceClassification={cycloneMode === 'demo' ? 'demo' : 'forecast'}
                  isPlaying={isCyclonePlaying}
                  onTogglePlay={() => setIsCyclonePlaying(!isCyclonePlaying)}
                  onStepChange={(stepIdx) => {
                    setIsCyclonePlaying(false);
                    onUpdateCycloneState({
                      ...cycloneState,
                      currentStepIndex: stepIdx,
                      windRadiiGeoJson: buildGeoJsonForWindRadii(cycloneState.steps[stepIdx]),
                    });
                  }}
                  onReset={() => {
                    setIsCyclonePlaying(false);
                    const zeroIdx = cycloneState.steps.findIndex((s) => s.offsetHours === 0);
                    const resetIdx = zeroIdx >= 0 ? zeroIdx : 0;
                    onUpdateCycloneState({
                      ...cycloneState,
                      currentStepIndex: resetIdx,
                      windRadiiGeoJson: buildGeoJsonForWindRadii(cycloneState.steps[resetIdx]),
                    });
                  }}
                />

                {/* Location-Specific Cyclone Impact Card */}
                {cycloneLocationImpact && (
                  <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Wind className="w-4 h-4 text-rose-600" />
                        <span>Settlement Exposure ({currentLocation.name})</span>
                      </span>
                      <span
                        className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          cycloneMode === 'demo'
                            ? 'bg-amber-500 text-slate-950 border border-amber-600'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {cycloneMode === 'demo' ? 'DEMO SIMULATION' : 'OFFICIAL FORECAST'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Distance to Eye</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {cycloneLocationImpact.distanceToStormKm} km
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Direction: {cycloneLocationImpact.compassDirection}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Wind Envelope</span>
                        <span
                          className={`text-sm font-extrabold ${
                            cycloneLocationImpact.isInsideWindRadii ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {cycloneLocationImpact.highestWindThresholdInside !== 'none'
                            ? `${cycloneLocationImpact.highestWindThresholdInside} Zone`
                            : 'Outside radii'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {cycloneLocationImpact.highestWindSpeedKmh > 0
                            ? `${cycloneLocationImpact.highestWindSpeedKmh} km/h winds`
                            : 'Normal winds'}
                        </span>
                      </div>
                    </div>

                    {/* Infrastructure exposure inside swath */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Closest Approach:</span>
                        <span className="font-semibold text-slate-900">
                          ~{cycloneLocationImpact.closestApproachDistanceKm} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Roads in Swath:</span>
                        <span className="font-semibold text-rose-700">
                          {hasRoadsData
                            ? `${cycloneLocationImpact.exposedRoadsCount} segments`
                            : 'Road impact unavailable'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Buildings in Swath:</span>
                        <span
                          className={`font-semibold ${
                            hasBuildingFootprints ? 'text-rose-700' : 'text-slate-500 italic'
                          }`}
                        >
                          {buildingExposureText}
                        </span>
                      </div>
                    </div>

                    {/* Locate Eye Action */}
                    {onZoomToStorm && currentCycloneStep && (
                      <button
                        type="button"
                        onClick={() => onZoomToStorm(currentCycloneStep.coordinates)}
                        className="w-full py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-rose-600" />
                        <span>Center Map on Cyclone Eye</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Cyclone Cause Explainer & 5-Stage Lifecycle */}
                <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setShowCauseExplainer(!showCauseExplainer)}
                    className="w-full p-2.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 hover:bg-blue-100/60 flex items-center justify-between text-left text-xs font-bold text-slate-800 cursor-pointer border-b border-slate-200/70 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Why is this cyclone forming?</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-blue-700 font-semibold hidden sm:inline">Science & Lifecycle</span>
                      {showCauseExplainer ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {showCauseExplainer && (
                    <div className="p-2.5 bg-slate-50/30">
                      <CycloneCauseExplainer
                        mode={cycloneMode}
                        currentStep={currentCycloneStep}
                        currentLocation={currentLocation}
                        activeStageIndex={activeStageIndex}
                        onSelectStageIndex={(stageIdx) => {
                          setActiveStageIndex(stageIdx);
                          if (cycloneMode === 'demo' && cycloneState.steps && cycloneState.steps.length > 0) {
                            const targetIdx = Math.min(
                              Math.floor((stageIdx / 4) * (cycloneState.steps.length - 1)),
                              cycloneState.steps.length - 1
                            );
                            setIsCyclonePlaying(false);
                            onUpdateCycloneState({
                              ...cycloneState,
                              currentStepIndex: targetIdx,
                              windRadiiGeoJson: buildGeoJsonForWindRadii(cycloneState.steps[targetIdx]),
                            });
                          }
                        }}
                        compact={true}
                      />
                    </div>
                  )}
                </div>

                {/* Asymmetric Radii & Intensity Legend */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Wind-Intensity Radii Legend:</span>
                    <span className="text-[9px] text-slate-400 font-mono">Northern Hemisphere Asymmetry</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <div className="p-1 rounded bg-orange-50 border border-orange-200 text-orange-950 font-medium">
                      <div className="font-bold">34 kt (Gale)</div>
                      <div className="text-[9px] text-orange-700">63 km/h</div>
                    </div>
                    <div className="p-1 rounded bg-red-50 border border-red-200 text-red-950 font-medium">
                      <div className="font-bold">50 kt (Storm)</div>
                      <div className="text-[9px] text-red-700">93 km/h</div>
                    </div>
                    <div className="p-1 rounded bg-rose-100 border border-rose-300 text-rose-950 font-medium">
                      <div className="font-bold">64 kt (Hurricane)</div>
                      <div className="text-[9px] text-rose-800">118+ km/h</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
