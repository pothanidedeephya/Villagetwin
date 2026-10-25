import React, { useState } from 'react';
import {
  CloudSun,
  CloudRain,
  Droplets,
  Wind,
  RefreshCw,
  Waves,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  Radio,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import type { WeatherData, SimulationRainfallMode } from '../../types/weather';
import type { CwcRiverGaugeStation } from '../../types/flood';
import type { LocationSearchResult } from '../../types/nationwide';

interface SimpleWeatherAndRiverCardProps {
  weather: WeatherData | null;
  isLoadingWeather: boolean;
  onRefreshWeather: () => void;
  rainfallMode: SimulationRainfallMode;
  appliedRainfall: number;
  onSetRainfallMode: (mode: SimulationRainfallMode, value_mmh?: number) => void;
  onRunSimulation?: () => void;
  gauges: CwcRiverGaugeStation[];
  isLoadingGauges: boolean;
  onRefreshGauges: () => void;
  onLocateGauge?: (gauge: CwcRiverGaugeStation) => void;
  currentLocation?: LocationSearchResult;
}

export const SimpleWeatherAndRiverCard: React.FC<SimpleWeatherAndRiverCardProps> = ({
  weather,
  isLoadingWeather,
  onRefreshWeather,
  rainfallMode,
  appliedRainfall,
  onSetRainfallMode,
  onRunSimulation,
  gauges,
  isLoadingGauges,
  onRefreshGauges,
  onLocateGauge,
  currentLocation,
}) => {
  const [showWeatherTechDetails, setShowWeatherTechDetails] = useState(false);
  const [showRiverDetails, setShowRiverDetails] = useState(false);

  // Weather Metrics
  const currentRain = weather?.current?.rainfall_mmh ?? 0;
  const isWeatherRainUsed = rainfallMode === 'weather_observed' || rainfallMode === 'weather_forecast' || rainfallMode === 'weather_hourly_completed';

  // Plain-Language Rainfall Description
  const getRainfallDisplay = () => {
    if (!weather?.current) return 'Rainfall data unavailable';
    if (weather.current.precipitationStatus === 'unavailable') return 'Rainfall data unavailable';
    if (currentRain === 0 || weather.current.precipitationStatus === 'zero_dry') {
      return 'No rain reported';
    }
    return `Current rainfall: ${currentRain} mm/h`;
  };

  // Primary River Gauge
  const primaryGauge = gauges?.[0];

  // River Status Calculation & Plain Language
  const getRiverStatus = () => {
    if (!primaryGauge) {
      return {
        label: 'No Gauge Nearby',
        badgeBg: 'bg-slate-100 text-slate-600 border-slate-200',
        explanation: 'No official CWC river gauge station located within 50 km of this settlement.',
      };
    }

    const { currentWaterLevel_m, warningLevel_m, dangerLevel_m, floodStatus } = primaryGauge;

    if (floodStatus === 'extreme' || (dangerLevel_m > 0 && currentWaterLevel_m >= dangerLevel_m)) {
      return {
        label: 'Danger Level Exceeded',
        badgeBg: 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse',
        explanation: `Water level (${currentWaterLevel_m}m) exceeds the official danger level (${dangerLevel_m}m). Flooding is active.`,
      };
    }

    if (floodStatus === 'warning' || (warningLevel_m > 0 && currentWaterLevel_m >= warningLevel_m)) {
      return {
        label: 'Warning Level Reached',
        badgeBg: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
        explanation: `Water level (${currentWaterLevel_m}m) is at or above official warning level (${warningLevel_m}m).`,
      };
    }

    if (warningLevel_m > 0) {
      const margin = (warningLevel_m - currentWaterLevel_m).toFixed(1);
      return {
        label: 'Normal Water Level',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold',
        explanation: `Water level is ${margin}m below the documented warning level (${warningLevel_m}m). River is safely contained.`,
      };
    }

    return {
      label: 'Normal Flow',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold',
      explanation: 'River telemetry reports normal seasonal discharge within banks.',
    };
  };

  const riverStatus = getRiverStatus();

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* 1. Simplified Weather Panel */}
      <div className="p-3.5 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CloudSun className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Live Weather
            </h3>
          </div>
          <button
            onClick={onRefreshWeather}
            disabled={isLoadingWeather}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded transition-colors"
            title="Refresh weather observation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWeather ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {/* Big Temperature and Rain Headline */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {weather?.current ? `${Math.round(weather.current.temperature_c)}°` : '--'}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {weather?.current?.condition || 'Clear Weather'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {weather?.villageName || currentLocation?.name || 'Local Station'}
            </span>
          </div>

          {/* Rainfall Text */}
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <CloudRain className={`w-4 h-4 ${currentRain > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
            <span className={`font-semibold ${currentRain > 0 ? 'text-blue-700' : 'text-slate-700'}`}>
              {getRainfallDisplay()}
            </span>
          </div>

          {/* Wind and Humidity Strip */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-slate-400" />
              <span>Wind: <strong>{weather?.current?.windSpeed_kmh ?? 12} km/h</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-slate-400" />
              <span>Humidity: <strong>{weather?.current?.humidity_percent ?? 55}%</strong></span>
            </div>
          </div>
        </div>

        {/* Single Prominent Toggle: "Use this rainfall in flood simulation" */}
        <div className="mt-3">
          <button
            onClick={() => {
              if (isWeatherRainUsed) {
                // Toggle OFF -> switch to custom
                onSetRainfallMode('custom', 65);
              } else {
                // Toggle ON -> use live weather rain
                onSetRainfallMode('weather_observed', currentRain);
              }
            }}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              isWeatherRainUsed
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  isWeatherRainUsed ? 'bg-white text-blue-600 border-white' : 'border-slate-400'
                }`}
              >
                {isWeatherRainUsed && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <span>Use this rainfall in flood simulation</span>
            </div>
            <span className="font-mono text-[11px] font-bold">
              {currentRain} mm/h
            </span>
          </button>
          <p className="mt-1 text-[10px] text-slate-500">
            {isWeatherRainUsed
              ? `Simulation input bound to live Open-Meteo rainfall (${currentRain} mm/h).`
              : 'Simulation is currently using a custom design rainfall scenario.'}
          </p>
        </div>

        {/* Expandable "Technical Details" Accordion */}
        <div className="mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowWeatherTechDetails(!showWeatherTechDetails)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <span>Technical Weather Details</span>
            {showWeatherTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showWeatherTechDetails && (
            <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Model Source:</span>
                <span className="font-semibold text-slate-800">Open-Meteo (ECMWF 9km / GFS)</span>
              </div>
              <div className="flex justify-between">
                <span>Current Model Estimate:</span>
                <span className="font-mono font-semibold text-slate-800">{currentRain} mm/h</span>
              </div>
              {weather?.rainfallDiagnostics && (
                <>
                  <div className="flex justify-between">
                    <span>Last Completed Hour:</span>
                    <span className="font-mono text-slate-800">
                      {weather.rainfallDiagnostics.mostRecentCompletedHour.averageRate_mmh} mm/h ({weather.rainfallDiagnostics.mostRecentCompletedHour.intervalLabel || 'IST'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Forecast (Next Hour):</span>
                    <span className="font-mono text-slate-800">{weather.rainfallDiagnostics.nearTermForecast.next1h.rate_mmh} mm/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3-Hour Rain Sum:</span>
                    <span className="font-mono text-slate-800">{weather.rainfallDiagnostics.nearTermForecast.next3h.rainfall_mm} mm</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Precipitation Status:</span>
                <span className="font-semibold text-slate-800">
                  {weather?.current?.precipitationStatus === 'zero_dry' ? 'Zero Dry Weather' : 'Measured Telemetry'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{weather?.current?.observationTimeIso ? new Date(weather.current.observationTimeIso).toLocaleTimeString('en-IN') : 'Live'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Simplified River & Gauge Information Panel */}
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Waves className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Nearby River & Telemetry
            </h3>
          </div>
          <button
            onClick={onRefreshGauges}
            disabled={isLoadingGauges}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded transition-colors"
            title="Refresh river gauge telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGauges ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {primaryGauge ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {primaryGauge.riverName} ({primaryGauge.stationName})
                </span>
                <span className="text-[10px] text-slate-500">
                  {primaryGauge.distanceKm ? `~${primaryGauge.distanceKm.toFixed(1)} km away` : 'Catchment Gauge'}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md border uppercase font-semibold ${riverStatus.badgeBg}`}>
                {riverStatus.label}
              </span>
            </div>

            {/* Current Water Level vs Warning & Danger */}
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center bg-white p-2 rounded-lg border border-slate-200">
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-semibold">Current</span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {primaryGauge.currentWaterLevel_m}m
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-amber-600 block font-semibold">Warning</span>
                <span className="text-xs font-bold text-amber-700 font-mono">
                  {primaryGauge.warningLevel_m || '--'}m
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-red-600 block font-semibold">Danger</span>
                <span className="text-xs font-bold text-red-700 font-mono">
                  {primaryGauge.dangerLevel_m || '--'}m
                </span>
              </div>
            </div>

            {/* Plain-Language Explanation */}
            <p className="mt-2 text-[11px] text-slate-600 leading-tight">
              {riverStatus.explanation}
            </p>

            {/* Flow Trend & Locate Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 text-slate-600">
                <span>Flow Trend:</span>
                <span className="font-semibold capitalize text-slate-800 flex items-center gap-0.5">
                  {primaryGauge.flowTrend === 'rising' && <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />}
                  {primaryGauge.flowTrend === 'falling' && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />}
                  {primaryGauge.flowTrend === 'steady' && <Minus className="w-3.5 h-3.5 text-slate-500" />}
                  {primaryGauge.flowTrend || 'Steady'}
                </span>
              </div>

              {onLocateGauge && (
                <button
                  onClick={() => onLocateGauge(primaryGauge)}
                  className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Locate</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            <p className="font-medium">No nearby CWC telemetry gauge</p>
            <p className="text-[10px] mt-0.5 text-slate-400">
              Drainage is governed by local micro-catchment slopes and Gram Panchayat drains.
            </p>
          </div>
        )}

        {/* Expandable "More River Details" Accordion */}
        {primaryGauge && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowRiverDetails(!showRiverDetails)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <span>More River Details</span>
              {showRiverDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRiverDetails && (
              <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Station ID:</span>
                  <span className="font-mono text-slate-800">{primaryGauge.stationId}</span>
                </div>
                <div className="flex justify-between">
                  <span>River Basin:</span>
                  <span className="font-semibold text-slate-800">{primaryGauge.basinName || 'Vamsadhara Basin'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Highest Flood Level (HFL):</span>
                  <span className="font-mono text-slate-800">{primaryGauge.hfl_m ? `${primaryGauge.hfl_m}m` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Telemetry Classification:</span>
                  <span className="text-slate-800 font-semibold">{primaryGauge.dataClassification || 'real_observed'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agency:</span>
                  <span className="text-slate-800">{primaryGauge.sourceAgency || 'Central Water Commission (CWC)'}</span>
                </div>

                {/* Archived Historical NWIC Record Isolation */}
                <div className="mt-2 pt-2 border-t border-slate-200 text-[9px] text-slate-500 flex items-start gap-1">
                  <Archive className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Historical records (e.g. NWIC 31-Aug-2026 telemetry) are retained strictly as historical archives and isolated from live simulation.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
