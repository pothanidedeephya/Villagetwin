import React, { useState } from 'react';
import {
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Navigation,
  ChevronDown,
  ChevronUp,
  MapPin,
  Waves,
  ArrowRight,
  ShieldAlert,
  Radio,
  ExternalLink,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type { WeatherData } from '../../types/weather';
import type { CwcRiverGaugeStation, ImdRainfallTelemetry } from '../../types/flood';
import type { ParsedNdmaSachetAlert } from '../../services/ndmaSachetService';
import type { VillageCycloneWindAssessment } from '../../types/imdCycloneWind';
import type { MultiHazardSummary } from '../../types/hazard';
import { formatSachetWarning, formatHazardAssessmentWarning } from '../../services/alertTranslationService';
import type { OverallStatusInfo } from '../dashboard/SimpleTopNavbar';

interface SimpleOverviewTabProps {
  currentLocation: LocationSearchResult;
  weather: WeatherData | null;
  isLoadingWeather: boolean;
  onRefreshWeather: () => void;
  primaryGauge?: CwcRiverGaugeStation | null;
  onLocateGauge?: (gauge: CwcRiverGaugeStation) => void;
  sachetAlerts?: ParsedNdmaSachetAlert[];
  cycloneWindAssessment?: VillageCycloneWindAssessment | null;
  imdTelemetry?: ImdRainfallTelemetry | null;
  hazardSummary?: MultiHazardSummary | null;
  overallStatus: OverallStatusInfo;
  onSwitchToHazards: () => void;
  onSwitchToSimulate: () => void;
  onOpenAlertsModal: () => void;
  onFocusWarning?: (coords: [number, number], title: string) => void;
}

export const SimpleOverviewTab: React.FC<SimpleOverviewTabProps> = ({
  currentLocation,
  weather,
  isLoadingWeather,
  onRefreshWeather,
  primaryGauge,
  onLocateGauge,
  sachetAlerts = [],
  cycloneWindAssessment,
  imdTelemetry,
  hazardSummary,
  overallStatus,
  onSwitchToHazards,
  onSwitchToSimulate,
  onOpenAlertsModal,
  onFocusWarning,
}) => {
  const [isWarningExpanded, setIsWarningExpanded] = useState(false);
  const [isWeatherDetailsExpanded, setIsWeatherDetailsExpanded] = useState(false);

  // Weather extraction
  const temp = weather?.current?.temperature_c !== undefined ? Math.round(weather.current.temperature_c) : null;
  const condition = weather?.current?.condition || 'Clear';
  const rainfall = weather?.current?.rainfall_mmh ?? 0;
  const windSpeed = weather?.current?.windSpeed_kmh !== undefined ? Math.round(weather.current.windSpeed_kmh) : null;
  const humidity = weather?.current?.humidity_percent !== undefined ? Math.round(weather.current.humidity_percent) : null;
  const weatherSource = weather?.provider || 'Open-Meteo (ECMWF/GFS)';
  const lastUpdated = weather?.observationTimeIso
    ? new Date(weather.observationTimeIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'Recent';

  // Find most relevant active official alert (if any)
  const activeSachet = sachetAlerts.find((a) => {
    const sLower = a.severity?.toLowerCase() || '';
    return sLower.includes('warning') || sLower.includes('alert') || sLower.includes('severe');
  });

  const highestHazardType = hazardSummary?.highestRiskHazards?.[0];
  const highestAssessment = highestHazardType ? hazardSummary.assessments[highestHazardType] : null;

  const activeWarning = activeSachet
    ? formatSachetWarning(activeSachet)
    : highestHazardType && highestAssessment?.officialWarning?.alertStage && highestAssessment.officialWarning?.alertStage !== 'no_warning'
    ? formatHazardAssessmentWarning(
        highestHazardType,
        highestAssessment,
        currentLocation
      )
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3 text-xs bg-slate-50/50">
      
      {/* 1. Location Banner */}
      <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                {currentLocation.district ? `${currentLocation.district}, ` : ''}
                {currentLocation.state}
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
              {currentLocation.name}
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px]">
              Elev ~{currentLocation.elevation_m || 25}m
            </span>
          </div>
        </div>

        {/* Short explanation of current location risk */}
        <p className="text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100 leading-relaxed">
          {overallStatus.explanation}
        </p>
      </div>

      {/* 2. Most Relevant Official Warning Card */}
      {activeWarning ? (
        <div className="p-3 rounded-xl border border-red-300 bg-red-50/60 shadow-xs space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800">
                Official Alert · {activeWarning.warningLevel}
              </span>
              <h3 className="font-bold text-xs text-slate-900 mt-0.5 leading-snug">
                {activeWarning.headline}
              </h3>
            </div>
          </div>

          <p className="text-slate-800 text-[11px] leading-relaxed bg-white/70 p-2 rounded-lg border border-red-200/50">
            {activeWarning.safetySentence}
          </p>

          <div className="space-y-1 text-[11px] text-slate-700 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Affected Area:</span>
              <span className="font-medium text-slate-900 truncate max-w-[170px]">{activeWarning.affectedArea}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Issued By:</span>
              <span className="font-medium text-slate-900">{activeWarning.issuedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Valid Until:</span>
              <span className="font-mono text-slate-900">{activeWarning.validUntil}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-red-200/60 text-xs">
            <button
              onClick={() => {
                if (currentLocation.center && onFocusWarning) {
                  onFocusWarning([currentLocation.center[1], currentLocation.center[0]], activeWarning.headline);
                }
              }}
              className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
            >
              <Navigation className="w-3 h-3 text-blue-600" />
              <span>View on map</span>
            </button>
            <button
              onClick={() => setIsWarningExpanded(!isWarningExpanded)}
              className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-0.5 cursor-pointer"
            >
              <span>{isWarningExpanded ? 'Less' : 'More details'}</span>
              {isWarningExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {isWarningExpanded && activeWarning.moreDetails && (
            <div className="p-2 bg-white rounded-lg border border-red-200 text-[10px] space-y-1 mt-2 text-slate-600">
              {activeWarning.moreDetails.bulletinIdentifier && (
                <div>Bulletin: <span className="font-mono text-slate-800">{activeWarning.moreDetails.bulletinIdentifier}</span></div>
              )}
              {activeWarning.moreDetails.originalLanguageText && (
                <div className="pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Original Dispatch ({activeWarning.moreDetails.originalLanguageName || 'Local'}):</span>
                  <p className="mt-0.5 text-slate-600 italic">{activeWarning.moreDetails.originalLanguageText}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">All clear in available alerts</div>
              <div className="text-[11px] text-slate-500">No active emergency warnings in effect</div>
            </div>
          </div>
          <button
            onClick={onSwitchToHazards}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
          >
            <span>Hazards</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 3. Current Weather Conditions Card */}
      <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
            <CloudSun className="w-4 h-4 text-blue-600" />
            <span>Current Weather</span>
          </div>
          <button
            onClick={onRefreshWeather}
            disabled={isLoadingWeather}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer transition-colors"
            title="Refresh Weather"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingWeather ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {weather ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-slate-500 text-[10px]">Temperature</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{temp !== null ? `${temp}°C` : '—'}</div>
                <div className="text-[10px] text-slate-600 capitalize truncate">{condition}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-slate-500 text-[10px]">Rainfall</div>
                <div className="text-sm font-bold text-blue-700 mt-0.5">
                  {weather.current.precipitationStatus === 'unavailable'
                    ? 'Unavailable'
                    : `${rainfall.toFixed(1)} mm/h`}
                </div>
                <div className="text-[10px] text-slate-600 truncate" title={weather.current.intensityBand?.label}>
                  {weather.current.intensityBand?.label || (rainfall > 0 ? 'Precipitation' : 'No rain')}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-slate-500 text-[10px]">Wind Speed</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{windSpeed !== null ? `${windSpeed} km/h` : '—'}</div>
                <div className="text-[10px] text-slate-600">{humidity !== null ? `${humidity}% hum` : 'Normal'}</div>
              </div>
            </div>

            {weather.pastRainfall && (
              <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-[9px] text-slate-600">
                <div>1h: <strong className="text-slate-800">{weather.pastRainfall.last1h_mm}mm</strong></div>
                <div>3h: <strong className="text-slate-800">{weather.pastRainfall.last3h_mm}mm</strong></div>
                <div>6h: <strong className="text-slate-800">{weather.pastRainfall.last6h_mm}mm</strong></div>
                <div>24h: <strong className="text-slate-800">{weather.pastRainfall.last24h_mm}mm</strong></div>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="truncate">Source: {weatherSource}</span>
              <span className="shrink-0">Updated: {lastUpdated}</span>
            </div>
          </>
        ) : (
          <div className="text-center py-3 text-slate-400 text-xs">
            {isLoadingWeather ? 'Loading weather data...' : 'Weather telemetry unavailable'}
          </div>
        )}
      </div>

      {/* 4. Verified River Gauge Card */}
      {primaryGauge ? (
        <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Waves className="w-4 h-4 text-cyan-600" />
              <span className="truncate">{primaryGauge.stationName}</span>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                primaryGauge.floodStatus === 'extreme' || primaryGauge.floodStatus === 'danger'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : primaryGauge.floodStatus === 'warning'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {primaryGauge.floodStatus || 'Normal'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-slate-500 text-[10px]">Current Water Level</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {primaryGauge.currentWaterLevel_m !== undefined ? `${primaryGauge.currentWaterLevel_m.toFixed(2)} m` : 'Data offline'}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">{primaryGauge.riverName || 'River Vamsadhara'}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-slate-500 text-[10px]">Thresholds</div>
              <div className="text-[11px] font-medium text-slate-700 mt-0.5">
                Warning: <strong className="text-amber-700">{primaryGauge.warningLevel_m ?? 37.0}m</strong>
              </div>
              <div className="text-[11px] font-medium text-slate-700">
                Danger: <strong className="text-red-700">{primaryGauge.dangerLevel_m ?? 38.5}m</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-[10px] text-slate-500">Official CWC National Telemetry</span>
            {onLocateGauge && (
              <button
                onClick={() => onLocateGauge(primaryGauge)}
                className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Navigation className="w-3 h-3 text-blue-600" />
                <span>Locate gauge</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
          <Waves className="w-4 h-4 text-slate-400 shrink-0" />
          <span>No verified river gauges within 25 km of this location.</span>
        </div>
      )}

      {/* 5. Quick Call-to-Action to Simulate */}
      <button
        onClick={onSwitchToSimulate}
        className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-xs"
      >
        <Waves className="w-3.5 h-3.5" />
        <span>Run Flood Simulation for this Location</span>
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
      </button>

    </div>
  );
};
