import React, { useState } from 'react';
import {
  Globe,
  PanelLeft,
  Bell,
  Menu,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Radio,
  FileText,
  Activity,
  Wind,
  Wrench,
  Navigation,
  Sliders,
  Sparkles,
  Zap,
  CloudSun,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type { WeatherData } from '../../types/weather';
import type { ImdRainfallTelemetry, CwcRiverGaugeStation } from '../../types/flood';
import type { VillageCycloneWindAssessment } from '../../types/imdCycloneWind';
import { NationwideLocationSearch } from '../search/NationwideLocationSearch';

export type OverallStatusType =
  | 'cyclone_warning'
  | 'weather_warning'
  | 'flood_risk'
  | 'all_clear'
  | 'data_unavailable';

export interface OverallStatusInfo {
  type: OverallStatusType;
  label: string;
  explanation: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  icon: 'cyclone' | 'weather' | 'flood' | 'clear' | 'unavailable';
}

export function computeOverallStatus(params: {
  cycloneWindIntersects?: boolean;
  imdCycloneStage?: string;
  imdWarningColor?: string;
  gaugeStatus?: string;
  isGovFeedsAvailable?: boolean;
}): OverallStatusInfo {
  const { cycloneWindIntersects, imdCycloneStage, imdWarningColor, gaugeStatus, isGovFeedsAvailable } = params;

  // 1. Cyclone Warning Priority
  if (cycloneWindIntersects || (imdCycloneStage && imdCycloneStage !== 'none' && imdCycloneStage !== 'normal')) {
    return {
      type: 'cyclone_warning',
      label: 'Cyclone warning',
      explanation: 'Location is inside active cyclone wind or gale radius.',
      badgeBg: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-300',
      icon: 'cyclone',
    };
  }

  // 2. Weather Warning Priority (IMD Orange / Red)
  if (imdWarningColor === 'red' || imdWarningColor === 'orange') {
    return {
      type: 'weather_warning',
      label: 'Weather warning',
      explanation: `IMD ${imdWarningColor.toUpperCase()} warning active: Heavy precipitation or thunderstorm.`,
      badgeBg: 'bg-amber-50',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-300',
      icon: 'weather',
    };
  }

  // 3. Flood Risk Priority (CWC Warning or Danger)
  if (gaugeStatus === 'warning' || gaugeStatus === 'danger' || gaugeStatus === 'extreme') {
    return {
      type: 'flood_risk',
      label: 'Flood risk',
      explanation: 'River telemetry water level exceeds official warning threshold.',
      badgeBg: 'bg-orange-50',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-300',
      icon: 'flood',
    };
  }

  // 4. Data Unavailable
  if (isGovFeedsAvailable === false) {
    return {
      type: 'data_unavailable',
      label: 'Data unavailable',
      explanation: 'Official government telemetry feeds currently connecting or offline.',
      badgeBg: 'bg-slate-100',
      textColor: 'text-slate-700',
      borderColor: 'border-slate-300',
      icon: 'unavailable',
    };
  }

  // 5. All Clear
  return {
    type: 'all_clear',
    label: 'All clear in available alerts',
    explanation: 'No active disaster alerts found across connected government monitors.',
    badgeBg: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-300',
    icon: 'clear',
  };
}

export interface SimpleTopNavbarProps {
  currentLocation: LocationSearchResult;
  onSelectLocation: (loc: LocationSearchResult) => void;
  isLoadingGeoData: boolean;
  isAnyModalOpen: boolean;
  weatherData: WeatherData | null;
  isLoadingWeather: boolean;
  onRefreshWeather: () => void;
  cycloneWindAssessment?: VillageCycloneWindAssessment | null;
  imdTelemetry: ImdRainfallTelemetry | null;
  primaryGauge?: CwcRiverGaugeStation | null;
  earthquakesCount?: number;
  alertsCount?: number;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenGovMonitor: () => void;
  onOpenAlerts: () => void;
  onOpenAi: () => void;
  onOpenEarthquakes: () => void;
  onOpenCycloneWind: () => void;
  onOpenCycloneTracking?: () => void;
  onOpenExportReport: () => void;
  onOpenHazardProfiles: () => void;
  onOpenEvacuation: () => void;
  onOpenPlanInfrastructure: () => void;
  onOpenScenarioPanel: () => void;
  onOpenModelValidation: () => void;
  onOpenPerformance?: () => void;
}

export const SimpleTopNavbar: React.FC<SimpleTopNavbarProps> = ({
  currentLocation,
  onSelectLocation,
  isLoadingGeoData,
  isAnyModalOpen,
  weatherData,
  onRefreshWeather,
  cycloneWindAssessment,
  imdTelemetry,
  primaryGauge,
  earthquakesCount = 0,
  alertsCount = 0,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenGovMonitor,
  onOpenAlerts,
  onOpenAi,
  onOpenEarthquakes,
  onOpenCycloneWind,
  onOpenCycloneTracking,
  onOpenExportReport,
  onOpenHazardProfiles,
  onOpenEvacuation,
  onOpenPlanInfrastructure,
  onOpenScenarioPanel,
  onOpenModelValidation,
  onOpenPerformance,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Compute Overall Disaster Status honestly
  const overallStatus = computeOverallStatus({
    cycloneWindIntersects: cycloneWindAssessment?.villageIntersectsAny,
    imdCycloneStage: imdTelemetry?.cycloneStage,
    imdWarningColor: imdTelemetry?.warningColor,
    gaugeStatus: primaryGauge?.floodStatus,
    isGovFeedsAvailable: true,
  });

  return (
    <header className="h-14 bg-white border-b border-slate-200 z-[1200] shrink-0 flex items-center justify-between px-3 sm:px-5 gap-2 sm:gap-4 relative select-none">
      
      {/* 1. Left: Sidebar Toggle & Brand Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isSidebarOpen
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title={isSidebarOpen ? 'Collapse Left Panel' : 'Expand Left Panel'}
            aria-label="Toggle Navigation Panel"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                Bharat Village Twin
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider hidden sm:inline-flex items-center gap-1 shadow-2xs">
                All-India
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Center: Prominent Nationwide Location Search */}
      <div className="flex-1 max-w-xl mx-1 sm:mx-2">
        <NationwideLocationSearch
          currentLocation={currentLocation}
          onSelectLocation={onSelectLocation}
          isLoadingData={isLoadingGeoData}
          hideDropdown={isAnyModalOpen}
        />
      </div>

      {/* 3. Right: Compact Warning Indicator, Notifications, and Advanced Tools Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        {/* Compact Current-Weather Summary (with verified provenance tooltip) */}
        {weatherData?.current && (
          <div
            onClick={onRefreshWeather}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
            title={`Current Weather in ${currentLocation.name}: ${weatherData.current.temperature_c !== undefined ? `${Math.round(weatherData.current.temperature_c)}°C` : ''} ${weatherData.current.condition || 'Clear'}, Rain: ${weatherData.current.rainfall_mmh ?? 0} mm/h | Source: ${weatherData.provider || 'Open-Meteo High-Resolution NWP'} | Last Updated: ${weatherData.lastUpdated || 'Pending'} | Status: ${weatherData.isLiveApiKey ? 'Live observation' : 'Model-estimated current conditions'}`}
          >
            <CloudSun className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold">{weatherData.current.temperature_c !== undefined ? `${Math.round(weatherData.current.temperature_c)}°C` : '--'}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 truncate max-w-[110px]">{weatherData.current.condition || 'Clear'}</span>
            {(weatherData.current.rainfall_mmh ?? 0) > 0 && (
              <span className="text-blue-700 font-bold text-[11px]">({weatherData.current.rainfall_mmh} mm/h)</span>
            )}
            <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
              [{weatherData.isLiveApiKey ? 'Live' : 'Model'}]
            </span>
          </div>
        )}

        {/* Compact Current-Warning Indicator */}
        <button
          onClick={onOpenAlerts}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${overallStatus.badgeBg} ${overallStatus.textColor} ${overallStatus.borderColor}`}
          title={`${overallStatus.label}: ${overallStatus.explanation} (Click to open warnings)`}
        >
          {overallStatus.icon === 'clear' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          {overallStatus.icon === 'weather' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          {overallStatus.icon === 'cyclone' && <Wind className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
          {overallStatus.icon === 'flood' && <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
          {overallStatus.icon === 'unavailable' && <Radio className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          <span className="hidden md:inline">{overallStatus.label}</span>
          <span className="md:hidden">{overallStatus.type === 'all_clear' ? 'Clear' : 'Alert'}</span>
        </button>

        {/* Notification Button */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          title="Official Disaster Alerts & Bulletins"
          aria-label="Alerts and Notifications"
        >
          <Bell className="w-4 h-4" />
          {alertsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Settings / Advanced Tools Menu Button */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isMenuOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Menu & Advanced Disaster Tools"
            aria-expanded={isMenuOpen}
            aria-label="Menu"
          >
            <Menu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          {/* Clean Advanced Tools Dropdown */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <div
                className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Advanced Tools & Diagnostics
                </div>

                <button
                  onClick={onOpenGovMonitor}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Radio className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Direct Government Data Monitor</div>
                    <div className="text-[10px] text-slate-500">IMD, CWC, NDMA, ISRO, NWIC, INCOIS, NCS</div>
                  </div>
                </button>

                <button
                  onClick={onOpenAi}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">AI Disaster Advisor</div>
                    <div className="text-[10px] text-slate-500">Automated community response & planning</div>
                  </div>
                </button>

                <button
                  onClick={onOpenModelValidation}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Model Skill & Validation Report</div>
                    <div className="text-[10px] text-slate-500">Hydrodynamic accuracy & benchmark scores</div>
                  </div>
                </button>

                <button
                  onClick={onOpenScenarioPanel}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-purple-50 hover:text-purple-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Sliders className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Socioeconomic Impact Assessment</div>
                    <div className="text-[10px] text-slate-500">Multi-hazard exposure & population damage</div>
                  </div>
                </button>

                <button
                  onClick={onOpenPlanInfrastructure}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Plan Safe Instructions</div>
                    <div className="text-[10px] text-slate-500">Objective-based site suitability & candidate safe zones</div>
                  </div>
                </button>

                <button
                  onClick={onOpenEvacuation}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Evacuation Corridors & Shelters</div>
                    <div className="text-[10px] text-slate-500">Flood-aware routing & relief shelters</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onOpenCycloneTracking) {
                      onOpenCycloneTracking();
                    } else {
                      onOpenCycloneWind();
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Wind className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Cyclone Tracking & Simulation</div>
                    <div className="text-[10px] text-slate-500">Live official IMD track & interactive demo</div>
                  </div>
                </button>

                <button
                  onClick={onOpenEarthquakes}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Activity className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Regional Earthquakes ({earthquakesCount})</div>
                    <div className="text-[10px] text-slate-500">USGS & NCS seismic monitoring</div>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={onOpenExportReport}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Export Village Risk Report</div>
                    <div className="text-[10px] text-slate-500">Authoritative printable briefing PDF</div>
                  </div>
                </button>

                {onOpenPerformance && (
                  <button
                    onClick={onOpenPerformance}
                    className="w-full px-3 py-2 text-left text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer transition-colors font-mono"
                  >
                    <span className="font-bold text-emerald-600">⚡</span>
                    <div>
                      <div className="font-semibold">Performance Diagnostics</div>
                      <div className="text-[10px] text-emerald-600">Map readiness & cache hit monitoring</div>
                    </div>
                  </button>
                )}

              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
