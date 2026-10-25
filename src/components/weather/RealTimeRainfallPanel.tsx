import React, { useState } from 'react';
import {
  CloudRain,
  CloudSun,
  Droplets,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Waves,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
} from 'lucide-react';
import type { WeatherData, PrecipitationStatus } from '../../types/weather';
import type { LocationSearchResult } from '../../types/nationwide';
import { getRainfallIntensityBand } from '../../services/rainfallDataService';

export interface RealTimeRainfallPanelProps {
  weather: WeatherData | null;
  isLoading: boolean;
  onRefresh: () => void;
  currentLocation: LocationSearchResult;
  onApplyToSimulation?: (intensity_mmh: number) => void;
  className?: string;
}

export const RealTimeRainfallPanel: React.FC<RealTimeRainfallPanelProps> = ({
  weather,
  isLoading,
  onRefresh,
  currentLocation,
  onApplyToSimulation,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showForecastHours, setShowForecastHours] = useState<boolean>(false);

  // Current rainfall rate & status
  const currentRainfall = weather?.current?.rainfall_mmh ?? null;
  const precipStatus: PrecipitationStatus = weather?.current?.precipitationStatus ?? 'unavailable';
  const isUnavailable = !weather || precipStatus === 'unavailable';
  const isStale = weather?.providerStatus === 'stale' || (weather?.current?.dataAgeMinutes ?? 0) > 60;

  // 5-Tier Intensity Band
  const intensityBand = weather?.current?.intensityBand ?? getRainfallIntensityBand(currentRainfall, isUnavailable);

  // Past Accumulations (Last 1h, 3h, 6h, 24h)
  const past = weather?.pastRainfall || {
    last1h_mm: weather?.rainfallDiagnostics?.mostRecentCompletedHour?.accumulation_mm ?? 0,
    last3h_mm: 0,
    last6h_mm: 0,
    last24h_mm: 0,
    status: isUnavailable ? 'unavailable' : ('zero_dry' as PrecipitationStatus),
    sourceNotice: 'Historical hourly intervals',
  };

  // Next 6-24h forecast items
  const forecastHours = weather?.hourlyForecast || [];

  // Data status resolution
  const getDataStatus = () => {
    if (isLoading) {
      return {
        label: 'Updating Telemetry...',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />,
      };
    }
    if (isUnavailable) {
      return {
        label: 'Unavailable',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
        icon: <Radio className="w-3 h-3 text-slate-400" />,
      };
    }
    if (isStale) {
      return {
        label: 'Stale (>60m)',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: <Clock className="w-3 h-3 text-amber-600" />,
      };
    }
    if (weather.isLiveApiKey) {
      return {
        label: 'Live observation',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
      };
    }
    return {
      label: 'Model-estimated current conditions',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 font-semibold',
      icon: <CheckCircle2 className="w-3 h-3 text-sky-600" />,
    };
  };

  const statusInfo = getDataStatus();
  const hasRain = !isUnavailable && (currentRainfall ?? 0) > 0;

  return (
    <div
      className={`relative z-30 pointer-events-auto transition-all select-none ${className}`}
      role="region"
      aria-label="Real-time rainfall intensity panel"
    >
      {/* 1. Slim Compact Trigger Bar (Near Map Controls) */}
      <div className="flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md text-xs font-semibold text-slate-800">
        
        {/* Main Precipitation Indicator Pill */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            hasRain
              ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 shadow-2xs'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title={`Rainfall Intensity: ${isUnavailable ? 'Unavailable' : `${(currentRainfall ?? 0).toFixed(1)} mm/h`} | Source: ${weather?.provider || 'Open-Meteo High-Resolution NWP'} | Last Updated: ${weather?.lastUpdated || 'Pending'} | Status: ${statusInfo.label}`}
        >
          {hasRain ? (
            <CloudRain className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
          ) : isUnavailable ? (
            <Droplets className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <CloudSun className="w-3.5 h-3.5 text-amber-500" />
          )}

          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-xs">
              {isUnavailable ? 'Unavailable' : `${(currentRainfall ?? 0).toFixed(1)} mm/h`}
            </span>
            {!isUnavailable && (
              <span className={`text-[10px] hidden sm:inline px-1 py-0.2 rounded font-medium ${intensityBand.textColor}`}>
                · {intensityBand.label}
              </span>
            )}
          </div>

          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-slate-400 ml-0.5" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          )}
        </button>

        {/* Visible Data Source & Last-Updated Indicator Pill */}
        {weather && (
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-500 border-l border-slate-200 cursor-pointer hover:bg-slate-50 rounded-md transition-colors"
            title={`Data Source: ${weather.provider || 'Open-Meteo High-Resolution NWP'} · Status: ${statusInfo.label} · Last Updated: ${weather.lastUpdated || 'Pending'}`}
          >
            <span className="font-semibold text-slate-700 truncate max-w-[90px]">
              {weather.isLiveApiKey ? 'Live Gauge' : 'Open-Meteo'}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-[9.5px] text-slate-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span>{weather.lastUpdated || 'Live'}</span>
            </span>
          </div>
        )}

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          title="Refresh real-time precipitation telemetry"
          aria-label="Refresh rainfall data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* 2. Expanded Flyout Panel (Detailed Rainfall Analysis) */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-md border border-slate-200/95 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-800">
          
          {/* Header: Settlement & Telemetry Status */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Rainfall Intensity Telemetry</span>
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 leading-snug mt-0.5 truncate max-w-[200px] sm:max-w-[240px]">
                {currentLocation.name}
              </h4>
              <p className="text-[10px] text-slate-500">
                {currentLocation.district}, {currentLocation.state} · [{currentLocation.center[1].toFixed(3)}°N, {currentLocation.center[0].toFixed(3)}°E]
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-[9.5px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.badgeClass}`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {weather?.lastUpdated ? `Updated: ${weather.lastUpdated}` : 'Pending update'}
              </span>
            </div>
          </div>

          {/* Current Rate Card & Band Classification */}
          <div className={`p-2.5 rounded-xl border ${intensityBand.badgeBg} ${intensityBand.borderColor} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600">
                Instantaneous Rainfall Intensity
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${intensityBand.textColor} bg-white/80 border border-current`}>
                {intensityBand.label}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${hasRain ? 'text-blue-700' : 'text-slate-800'}`}>
                {isUnavailable ? 'Unavailable' : `${(currentRainfall ?? 0).toFixed(1)}`}
              </span>
              {!isUnavailable && <span className="text-xs font-bold text-slate-500">mm/h</span>}
            </div>

            <p className="text-[10px] text-slate-600 leading-tight">
              {intensityBand.conventionNotice}
            </p>
          </div>

          {/* Past Accumulation Windows (Non-Overlapping Hourly Sums) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>Precipitation Accumulation Windows</span>
              </span>
              <span className="text-[9px] text-slate-400 lowercase font-normal">(sum of completed intervals)</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Last 1h</span>
                <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                  {isUnavailable ? '—' : `${past.last1h_mm} mm`}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Last 3h</span>
                <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                  {isUnavailable ? '—' : `${past.last3h_mm} mm`}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Last 6h</span>
                <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                  {isUnavailable ? '—' : `${past.last6h_mm} mm`}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Last 24h</span>
                <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                  {isUnavailable ? '—' : `${past.last24h_mm} mm`}
                </span>
              </div>
            </div>
          </div>

          {/* Near-Term / Hourly Forecast Section (Next 6-24 Hours) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Hourly Forecast (Next 6–24 Hours)
              </span>
              <button
                type="button"
                onClick={() => setShowForecastHours(!showForecastHours)}
                className="text-[10px] text-blue-700 hover:underline cursor-pointer font-semibold"
              >
                {showForecastHours ? 'Hide' : 'Show details'}
              </button>
            </div>

            {/* Quick 1h/3h/6h Summary Cards with Accumulation, Rate & Window */}
            {weather?.rainfallDiagnostics?.nearTermForecast && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span className="font-semibold text-slate-600">Forecast Accumulation & Rate:</span>
                  <span className="font-mono text-[8px] text-slate-400">Total mm (avg mm/h)</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-700 font-medium">
                  {[
                    { label: 'Next 1h', data: weather.rainfallDiagnostics.nearTermForecast.next1h },
                    { label: 'Next 3h', data: weather.rainfallDiagnostics.nearTermForecast.next3h },
                    { label: 'Next 6h', data: weather.rainfallDiagnostics.nearTermForecast.next6h },
                  ].map(({ label, data }) => (
                    <div
                      key={label}
                      className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100 text-center flex flex-col justify-between"
                      title={`Window: ${data.timeRangeLabel} | Forecast Accumulation: ${data.rainfall_mm.toFixed(1)} mm | Average Intensity: ${data.rate_mmh.toFixed(1)} mm/h`}
                    >
                      <div className="flex items-center justify-between text-[8.5px] text-slate-500">
                        <span className="font-bold text-slate-700">{label}</span>
                        {typeof data.probability_percent === 'number' && data.probability_percent > 0 && (
                          <span className="text-[7.5px] font-mono text-blue-600 font-bold">{data.probability_percent}%</span>
                        )}
                      </div>
                      <div className="py-0.5">
                        <span className="text-xs font-black text-blue-950">{data.rainfall_mm.toFixed(1)}</span>
                        <span className="text-[8.5px] font-semibold text-blue-700 ml-0.5">mm</span>
                      </div>
                      <div className="text-[8px] text-slate-500 font-mono">
                        avg {data.rainfall_mm === 0 ? '0.0' : data.rate_mmh.toFixed(2)} mm/h
                      </div>
                      <div className="text-[7px] text-slate-400 font-mono truncate" title={data.timeRangeLabel || ''}>
                        {data.timeRangeLabel ? data.timeRangeLabel.split('(')[0].trim() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expandable 24-hour Scrubber / Strip */}
            {showForecastHours && forecastHours.length > 0 && (
              <div className="pt-1.5">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  {forecastHours.slice(0, 12).map((item, idx) => (
                    <div
                      key={idx}
                      className="shrink-0 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center w-14 space-y-0.5"
                    >
                      <div className="text-[9px] font-mono text-slate-500">{item.time}</div>
                      <div className={`font-bold text-[10px] ${item.rainfall_mm > 0 ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.rainfall_mm.toFixed(1)}
                      </div>
                      <div className="text-[8.5px] text-slate-400">mm</div>
                      {typeof item.rainProbability_percent === 'number' && item.rainProbability_percent > 0 && (
                        <div className="text-[8px] text-blue-600 font-mono">{item.rainProbability_percent}%</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-slate-400 text-right pt-0.5 font-mono">
                  Horizontal hourly forecast (up to 24h lead time)
                </div>
              </div>
            )}
          </div>

          {/* Simulation Binding Action (Requirement 4: Mode A) */}
          {onApplyToSimulation && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onApplyToSimulation(currentRainfall ?? 0)}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Pass current rainfall intensity into hydrological flood simulation engine"
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Simulate Inundation with {isUnavailable ? '0.0' : (currentRainfall ?? 0).toFixed(1)} mm/h Rain</span>
              </button>
            </div>
          )}

          {/* Provenance & Telemetry Integrity Footer (Requirements 6 & 7) */}
          <div className="pt-2 border-t border-slate-200/80 bg-slate-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl text-[9px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Data Source:</span>
              <span className="font-medium text-slate-900 truncate max-w-[200px]">
                {weather?.provider || 'Open-Meteo High-Resolution Global NWP'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Data Status:</span>
              <span className={`px-1.5 py-0.2 rounded font-semibold text-[8.5px] border ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Observation / Model Time:</span>
              <span className="font-mono text-slate-800">
                {weather?.observationTimeIso
                  ? `${new Date(weather.observationTimeIso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
                  : 'Latest operational model cycle'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Last Dashboard Update:</span>
              <span className="font-mono text-slate-800">
                {weather?.lastUpdated ? `${weather.lastUpdated} IST` : 'Pending sync'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Coordinates & Raw Field:</span>
              <span className="font-mono text-slate-600">
                [{currentLocation.center[1].toFixed(3)}°N, {currentLocation.center[0].toFixed(3)}°E] · cur.precipitation (mm/h)
              </span>
            </div>
            <div className="italic text-[8.5px] text-slate-400 pt-0.5 border-t border-slate-200/50">
              Hydrological note: Modelled flood extent depends on catchment topography, infiltration absorption, and channel drainage, not rainfall alone.
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

