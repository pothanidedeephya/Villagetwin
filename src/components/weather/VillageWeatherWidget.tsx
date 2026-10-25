import React, { useState } from 'react';
import {
  CloudSun,
  RefreshCw,
  Droplets,
  Wind,
  CloudRain,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Play,
  Calendar,
  Layers,
  Archive,
} from 'lucide-react';
import type { WeatherData, WeatherProviderStatus, SimulationRainfallMode } from '../../types/weather';

interface VillageWeatherWidgetProps {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onApplyWeatherRainfall?: (rainfall_mmh: number) => void;
  appliedRainfall?: number;
  rainfallMode?: SimulationRainfallMode;
  onSetRainfallMode?: (mode: SimulationRainfallMode, value_mmh?: number) => void;
  onRunSimulation?: () => void;
}

export const VillageWeatherWidget: React.FC<VillageWeatherWidgetProps> = ({
  weather,
  isLoading,
  error,
  onRefresh,
  onApplyWeatherRainfall,
  appliedRainfall,
  rainfallMode = 'custom',
  onSetRainfallMode,
  onRunSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'hourly' | 'daily'>('current');
  const [isExpanded, setIsExpanded] = useState(true);

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
  const isWeatherModeActive =
    rainfallMode === 'weather_observed' ||
    rainfallMode === 'weather_hourly_completed' ||
    rainfallMode === 'weather_forecast';

  // Strict Data Status
  const isDataStale =
    weather?.providerStatus === 'stale' ||
    (weather?.current.dataAgeMinutes !== undefined && weather.current.dataAgeMinutes > 60);
  const isDataUnavailable =
    !weather ||
    weather.providerStatus === 'auth_failed' ||
    weather.providerStatus === 'rate_limited' ||
    weather.providerStatus === 'provider_error' ||
    weather.current.precipitationStatus === 'unavailable';

  const dataStatusText: 'Live data' | 'Stale' | 'Unavailable' = isDataUnavailable
    ? 'Unavailable'
    : isDataStale
    ? 'Stale'
    : 'Live data';

  const isWeatherBlocked = isDataUnavailable || isDataStale;

  // Rainfall display value
  const rainfallIntensityDisplay =
    weather?.current.precipitationStatus === 'unavailable'
      ? 'Rainfall data unavailable'
      : weather?.current.precipitationStatus === 'unobserved'
      ? 'Rainfall measurement unavailable'
      : `${weather?.current.rainfall_mmh.toFixed(1)} mm/h`;

  const getStatusBadge = (status?: WeatherProviderStatus, providerName?: string) => {
    if (providerName?.includes('Open-Meteo')) {
      return (
        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          ● Open-Meteo Active
        </span>
      );
    }
    switch (status) {
      case 'connected':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ● Live Connected
          </span>
        );
      case 'auth_failed':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            ⚠ Auth Failed (HTTP 401)
          </span>
        );
      case 'rate_limited':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            ⚠ Rate Limited (HTTP 429)
          </span>
        );
      case 'provider_error':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            ⚠ Provider Error
          </span>
        );
      case 'stale':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            ⏱ Data Stale
          </span>
        );
      case 'key_missing':
      default:
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            ● Open Meteorological Mode
          </span>
        );
    }
  };

  if (error && !weather) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
        <div className="flex items-center justify-between text-slate-900 font-semibold">
          <span className="flex items-center gap-1.5 text-slate-800">
            <CloudSun className="w-3.5 h-3.5 text-slate-600" />
            <span>Local Weather Data</span>
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer transition-colors"
            title="Retry weather retrieval"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
          {error}
        </p>
        <button
          onClick={onRefresh}
          className="w-full py-1 text-center bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!weather && isLoading) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
        <span>Retrieving weather observations...</span>
      </div>
    );
  }

  if (!weather) return null;

  const currentRain = weather.current.rainfall_mmh;
  const diag = weather.rainfallDiagnostics;
  const completedHour = diag?.mostRecentCompletedHour;
  const nearTerm = diag?.nearTermForecast;

  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-lg overflow-hidden text-xs text-slate-700 transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2.5 flex items-center justify-between bg-white border-b border-slate-200 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <CloudSun className="w-4 h-4 text-blue-700 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
              <span>{weather.villageName} Weather</span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {weather.current.temperature_c}°C
              </span>
              {getStatusBadge(weather.providerStatus, weather.provider)}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {weather.current.condition} · Rain: {rainfallIntensityDisplay}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={isLoading}
            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded cursor-pointer transition-colors"
            title="Refresh weather data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-2.5">
          {/* Tabs: Current | Hourly | 3-Day */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded text-[11px] font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setActiveTab('hourly')}
              className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'hourly'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Hourly
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              3-Day
            </button>
          </div>

          {/* Tab 1: Current Observations */}
          {activeTab === 'current' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-blue-600" />
                    <span>Humidity</span>
                  </span>
                  <span className="font-semibold text-slate-800">
                    {weather.current.humidity_percent}%
                  </span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Wind className="w-3 h-3 text-slate-600" />
                    <span>Wind</span>
                  </span>
                  <span className="font-semibold text-slate-800">
                    {weather.current.windSpeed_kmh} km/h
                  </span>
                </div>

                {/* 3-Tier Rainfall Decomposition (Sections 2.A, 2.B, 2.C) */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs col-span-2 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                      <span>Rainfall Intensity Decomposition</span>
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        dataStatusText === 'Live data'
                          ? weather.current.precipitationStatus === 'zero_dry'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : dataStatusText === 'Stale'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      ● {weather.current.precipitationStatus === 'zero_dry' ? 'Genuine Dry Weather' : dataStatusText}
                    </span>
                  </div>

                  {/* Primary Intensity Heading */}
                  <div className="py-0.5">
                    <div className="text-xl font-mono font-bold text-blue-900 tracking-tight">
                      {rainfallIntensityDisplay}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium leading-tight">
                      {weather.current.precipitationLabel}
                    </div>
                  </div>

                  {/* 3 Sub-Panels: Tier A (Current), Tier B (Completed 1h), Tier C (Near-Term Forecast) */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100 text-[10px]">
                    {/* Tier A: Current Model Estimate */}
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-start justify-between gap-1">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 uppercase tracking-wider block text-[9px]">
                          Tier A: Current Model Estimate
                        </span>
                        <p className="text-slate-600">
                          Precipitation: <strong>{weather.current.rainfall_mmh.toFixed(1)} mm/h</strong> (Rain: {weather.current.rain_mmh ?? 0} mm/h)
                        </p>
                        <span className="text-[9px] text-slate-400 block">
                          Instantaneous numerical prediction interval · {weather.lastUpdated}
                        </span>
                      </div>
                      <span className="font-mono text-blue-700 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {weather.current.rainfall_mmh.toFixed(1)} mm/h
                      </span>
                    </div>

                    {/* Tier B: Most Recent Completed Hourly Value */}
                    {completedHour && (
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-start justify-between gap-1">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 uppercase tracking-wider block text-[9px]">
                            Tier B: Completed Hourly Interval ({completedHour.intervalLabel})
                          </span>
                          <p className="text-slate-600">
                            Accumulation: <strong>{completedHour.accumulation_mm.toFixed(1)} mm</strong> over 60 mins
                          </p>
                          <span className="text-[9px] text-slate-400 block italic">
                            Calculation: {completedHour.calculationNote}
                          </span>
                        </div>
                        <span className="font-mono text-blue-700 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          {completedHour.averageRate_mmh.toFixed(1)} mm/h
                        </span>
                      </div>
                    )}

                    {/* Tier C: Near-Term Forecast */}
                    {nearTerm && (
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-700 uppercase tracking-wider block text-[9px]">
                          Tier C: Near-Term Forecast (Next 1h, 3h, 6h)
                        </span>
                        <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
                          <div className="bg-white p-1 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block font-semibold">Next 1 Hour</span>
                            <span className="font-mono font-bold text-slate-800 text-[11px] block">
                              {nearTerm.next1h.rainfall_mm} mm
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              Rate: {nearTerm.next1h.rate_mmh} mm/h
                            </span>
                          </div>
                          <div className="bg-white p-1 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block font-semibold">Next 3 Hours</span>
                            <span className="font-mono font-bold text-slate-800 text-[11px] block">
                              {nearTerm.next3h.rainfall_mm} mm
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              Avg: {nearTerm.next3h.rate_mmh} mm/h
                            </span>
                          </div>
                          <div className="bg-white p-1 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block font-semibold">Next 6 Hours</span>
                            <span className="font-mono font-bold text-slate-800 text-[11px] block">
                              {nearTerm.next6h.rainfall_mm} mm
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              Avg: {nearTerm.next6h.rate_mmh} mm/h
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata and Safe Diagnostics Grid */}
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-600 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Provider:</span>
                      <span className="font-medium text-slate-800">{weather.provider}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Model:</span>
                      <span className="font-medium text-slate-800 truncate ml-2">
                        {diag?.diagnostics.modelName || 'ECMWF IFS & GFS Global Models'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Coordinates:</span>
                      <span className="font-mono text-slate-800">
                        {weather.coordinates[1].toFixed(4)}° N, {weather.coordinates[0].toFixed(4)}° E
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Timezone:</span>
                      <span className="text-slate-800">Asia/Kolkata (IST +05:30)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Timestamp:</span>
                      <span className="font-mono text-slate-800">{weather.lastUpdated}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Functional "Use Weather Rain in Simulation" Toggle & Mode Selector */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                {/* Blocked Data Alert Notice */}
                {isWeatherBlocked && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Automatic weather-driven simulation input is blocked (telemetry is{' '}
                      <strong>{dataStatusText.toLowerCase()}</strong>). Please select a custom design-storm scenario.
                    </span>
                  </div>
                )}

                {/* Master Toggle Bar */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <CloudRain className={`w-4 h-4 shrink-0 ${isWeatherModeActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-800 leading-tight">
                        Use weather rain in simulation
                      </div>
                      <div className="text-[9px] text-slate-500 truncate">
                        {isWeatherModeActive
                          ? `Connected: ${appliedRainfall ?? weather.current.rainfall_mmh} mm/h (${
                              rainfallMode === 'weather_hourly_completed'
                                ? 'Completed 1h'
                                : rainfallMode === 'weather_forecast'
                                ? 'Forecast'
                                : 'Current Model'
                            })`
                          : `Disabled: Custom storm scenario (${appliedRainfall ?? 65} mm/h)`}
                      </div>
                    </div>
                  </div>

                  {/* Accessible Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isWeatherModeActive}
                    onClick={() => {
                      if (isWeatherModeActive) {
                        onSetRainfallMode?.('custom', 65);
                      } else {
                        const targetRate = weather.current.rainfall_mmh;
                        onSetRainfallMode?.('weather_observed', targetRate);
                        if (onApplyWeatherRainfall) onApplyWeatherRainfall(targetRate);
                      }
                    }}
                    disabled={isWeatherBlocked}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                      isWeatherModeActive ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                    title={
                      isWeatherBlocked
                        ? `Weather rainfall is ${dataStatusText.toLowerCase()}. Automatic simulation input is blocked.`
                        : isWeatherModeActive
                        ? 'Click to disable weather rain and switch to custom storm scenario'
                        : 'Click to enable live weather rainfall in flood simulation'
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isWeatherModeActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Expanded Controls when Enabled */}
                {isWeatherModeActive ? (
                  <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-blue-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active Simulation Rainfall Input:</span>
                      </span>
                      <span className="font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {appliedRainfall ?? weather.current.rainfall_mmh} mm/h
                      </span>
                    </div>

                    {/* Mode Selector: Observed vs Completed 1h vs Forecast */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const rate = weather.current.rainfall_mmh;
                          onSetRainfallMode?.('weather_observed', rate);
                          if (onApplyWeatherRainfall) onApplyWeatherRainfall(rate);
                        }}
                        className={`p-1.5 rounded text-left border transition-all cursor-pointer ${
                          rainfallMode === 'weather_observed'
                            ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-500 text-blue-900'
                            : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="text-[10px] font-semibold">Current Model</div>
                        <div className="font-mono text-blue-700 text-[11px] font-bold mt-0.5">
                          {weather.current.rainfall_mmh.toFixed(1)} mm/h
                        </div>
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                          {weather.current.rainfall_mmh === 0 ? 'Dry / Clear' : 'Active rain'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const rate = completedHour?.averageRate_mmh ?? 0;
                          onSetRainfallMode?.('weather_hourly_completed', rate);
                          if (onApplyWeatherRainfall) onApplyWeatherRainfall(rate);
                        }}
                        className={`p-1.5 rounded text-left border transition-all cursor-pointer ${
                          rainfallMode === 'weather_hourly_completed'
                            ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-500 text-blue-900'
                            : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="text-[10px] font-semibold">Completed 1h</div>
                        <div className="font-mono text-blue-700 text-[11px] font-bold mt-0.5">
                          {(completedHour?.averageRate_mmh ?? 0).toFixed(1)} mm/h
                        </div>
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                          {completedHour?.intervalLabel || 'Past 60 mins'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const rate = nearTerm?.next1h.rate_mmh ?? forecastPeak.rate_mmh;
                          onSetRainfallMode?.('weather_forecast', rate);
                          if (onApplyWeatherRainfall) onApplyWeatherRainfall(rate);
                        }}
                        className={`p-1.5 rounded text-left border transition-all cursor-pointer ${
                          rainfallMode === 'weather_forecast'
                            ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-500 text-blue-900'
                            : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="text-[10px] font-semibold">Near Forecast</div>
                        <div className="font-mono text-blue-700 text-[11px] font-bold mt-0.5">
                          {(nearTerm?.next1h.rate_mmh ?? forecastPeak.rate_mmh).toFixed(1)} mm/h
                        </div>
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                          {nearTerm?.next1h.timeRangeLabel || 'Next 1-3h'}
                        </div>
                      </button>
                    </div>

                    {/* Solver Assumption Box */}
                    <div className="bg-white p-2 rounded border border-blue-100 text-[9.5px] text-slate-600 leading-relaxed">
                      <strong>Hydrological Solver Assumption:</strong> The selected rainfall rate ({appliedRainfall ?? weather.current.rainfall_mmh} mm/h) is applied as steady storm precipitation across the 4-hour scenario. Antecedent soil moisture and coastal surge conditions remain active.
                    </div>

                    {/* Quick Trigger Simulation with Weather Rain */}
                    {onRunSimulation && (
                      <button
                        type="button"
                        onClick={onRunSimulation}
                        className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Simulate Flood with Weather Rain ({appliedRainfall ?? weather.current.rainfall_mmh} mm/h)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      <span>Custom Design Storm: <strong>{appliedRainfall ?? 65} mm/h</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const targetRate = weather.current.rainfall_mmh;
                        onSetRainfallMode?.('weather_observed', targetRate);
                        if (onApplyWeatherRainfall) onApplyWeatherRainfall(targetRate);
                      }}
                      className="text-blue-700 hover:text-blue-800 font-semibold underline cursor-pointer"
                    >
                      Use Live Rain ({weather.current.rainfall_mmh.toFixed(1)} mm/h)
                    </button>
                  </div>
                )}

                {/* Section 6: Historical Telemetry Verification Policy */}
                <div className="p-2 bg-slate-100/70 border border-slate-200 rounded text-[9.5px] text-slate-600 flex items-start gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Official Telemetry Policy:</strong> Only rainfall observations verified against official Government of India records are admitted into the pipeline. Unverified historical observations are excluded and never mixed into live simulation inputs.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Hourly Forecast */}
          {activeTab === 'hourly' && (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {weather.hourlyForecast.length > 0 ? (
                weather.hourlyForecast.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1 px-1.5 bg-white rounded border border-slate-100 text-[11px]"
                  >
                    <span className="font-mono text-slate-500 w-12">{h.time}</span>
                    <span className="truncate flex-1 text-slate-700">{h.condition}</span>
                    <span className="font-mono font-semibold text-slate-800 w-10 text-right">
                      {h.temperature_c}°
                    </span>
                    <span className="font-mono text-blue-700 w-14 text-right">
                      {h.rainfall_mm}mm
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-500 text-center py-2">
                  Hourly forecast details not provided on standard tier.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: 3-Day Forecast */}
          {activeTab === 'daily' && (
            <div className="space-y-1">
              {weather.dailyForecast.length > 0 ? (
                weather.dailyForecast.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 bg-white rounded border border-slate-100 text-[11px]"
                  >
                    <span className="font-semibold text-slate-800 w-14">{d.dayName}</span>
                    <span className="truncate flex-1 text-slate-600">{d.condition}</span>
                    <div className="text-right font-mono">
                      <span className="text-slate-800 font-semibold">{d.maxTemp_c}°</span>
                      <span className="text-slate-400 text-[10px] ml-1">{d.minTemp_c}°</span>
                    </div>
                    <span className="font-mono text-blue-700 text-[10px] w-12 text-right">
                      {d.totalRainfall_mm}mm
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-500 text-center py-2">
                  Multi-day forecast unavailable.
                </div>
              )}
            </div>
          )}

          {/* Footer Metadata & Provenance */}
          <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="truncate" title={weather.sourceAttribution || weather.provider}>
                Source: {weather.provider}
              </span>
              <span className="font-mono shrink-0 ml-1">Updated {weather.lastUpdated}</span>
            </div>
          </div>

          {weather.notice && (
            <div className="text-[10px] p-2 rounded border leading-tight bg-white border-slate-200 text-slate-600">
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>{weather.notice}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
