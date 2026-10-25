import React from 'react';
import {
  Waves,
  CloudRain,
  Wind,
  Sun,
  Flame,
  Activity,
  Mountain,
  Droplet,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  X,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type { HazardType, MultiHazardSummary, RiskLevel, EvidenceClassificationLabel } from '../../types/hazard';
import { VillageWeatherWidget } from '../weather/VillageWeatherWidget';
import type { WeatherData } from '../../types/weather';

interface HazardNavigationSidebarProps {
  activeHazard: HazardType;
  onSelectHazard: (hazard: HazardType) => void;
  hazardSummary: MultiHazardSummary;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  weatherData: WeatherData | null;
  isLoadingWeather: boolean;
  weatherError: string | null;
  onRefreshWeather: () => void;
  onApplyWeatherRainfall: (rainfall_mmh: number) => void;
  appliedRainfall: number;
  onOpenFullMatrix: () => void;
}

interface HazardItemDef {
  type: HazardType;
  label: string;
  plainDesc: string;
  icon: React.ReactNode;
}

interface HazardGroupDef {
  groupId: string;
  groupTitle: string;
  items: HazardItemDef[];
}

const HAZARD_GROUPS: HazardGroupDef[] = [
  {
    groupId: 'flood_water',
    groupTitle: 'Flood & Waterlogging',
    items: [
      {
        type: 'flood',
        label: 'Riverine Flood',
        plainDesc: 'Alluvial floodplain overflow during peak river discharge',
        icon: <Waves className="w-4 h-4 text-blue-600" />,
      },
      {
        type: 'waterlogging',
        label: 'Pluvial Waterlogging',
        plainDesc: 'Stormwater pooling in low-gradient local depressions',
        icon: <CloudRain className="w-4 h-4 text-cyan-600" />,
      },
    ],
  },
  {
    groupId: 'severe_weather',
    groupTitle: 'Severe Weather',
    items: [
      {
        type: 'cyclone',
        label: 'Cyclonic Storm Surge',
        plainDesc: 'Coastal marine storm surge and high-velocity wind squalls',
        icon: <Wind className="w-4 h-4 text-teal-600" />,
      },
      {
        type: 'heatwave',
        label: 'Extreme Heatwave',
        plainDesc: 'Severe thermal stress index (IMD / WBGT criteria)',
        icon: <Sun className="w-4 h-4 text-amber-600" />,
      },
      {
        type: 'wildfire',
        label: 'Forest Fringe Wildfire',
        plainDesc: 'Dry-season woodland biomass combustion perimeter',
        icon: <Flame className="w-4 h-4 text-orange-600" />,
      },
    ],
  },
  {
    groupId: 'seismic_coastal',
    groupTitle: 'Seismic & Coastal Hazards',
    items: [
      {
        type: 'earthquake',
        label: 'Earthquake Seismicity',
        plainDesc: 'BIS IS 1893:2016 seismic zone ground shaking & fault lines',
        icon: <Activity className="w-4 h-4 text-rose-600" />,
      },
      {
        type: 'landslide',
        label: 'Hill Slope Instability',
        plainDesc: 'Active slope creep, regolith detachment & rockfall',
        icon: <Mountain className="w-4 h-4 text-amber-700" />,
      },
      {
        type: 'tsunami',
        label: 'Coastal Tsunami Ingress',
        plainDesc: 'Marine seismic sea wave runup along intertidal coastlines',
        icon: <Waves className="w-4 h-4 text-indigo-600" />,
      },
    ],
  },
  {
    groupId: 'environmental',
    groupTitle: 'Environmental & Agro-Climatic',
    items: [
      {
        type: 'drought',
        label: 'Agricultural Drought',
        plainDesc: 'Cumulative monsoon rainfall deficit & CGWB aquifer stress',
        icon: <Droplet className="w-4 h-4 text-yellow-600" />,
      },
    ],
  },
];

export const HazardNavigationSidebar: React.FC<HazardNavigationSidebarProps> = ({
  activeHazard,
  onSelectHazard,
  hazardSummary,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  weatherData,
  isLoadingWeather,
  weatherError,
  onRefreshWeather,
  onApplyWeatherRainfall,
  appliedRainfall,
  onOpenFullMatrix,
}) => {
  const getRiskBadge = (level: RiskLevel | undefined) => {
    switch (level) {
      case 'very_high':
        return (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
            Very High
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
            High
          </span>
        );
      case 'moderate':
        return (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Moderate
          </span>
        );
      case 'low':
      default:
        return (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getEvidenceBadge = (evidenceType: EvidenceClassificationLabel | undefined) => {
    switch (evidenceType) {
      case 'Official observation or warning':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0" title="Official observation or warning">
            Official
          </span>
        );
      case 'Forecast':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 shrink-0" title="Official numerical forecast">
            Forecast
          </span>
        );
      case 'Modelled estimate':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0" title="Modelled hydrodynamic / geospatial estimate">
            Modelled
          </span>
        );
      case 'Preliminary screening':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 shrink-0" title="Preliminary statutory screening">
            Screening
          </span>
        );
      case 'Illustrative demo':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0" title="Illustrative demo scenario">
            Demo
          </span>
        );
      case 'Insufficient data':
      default:
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0" title="Insufficient ground data">
            Data Gap
          </span>
        );
    }
  };

  if (isCollapsed) {
    return (
      <aside className="hidden md:flex flex-col w-14 bg-white border-r border-slate-200 h-full shrink-0 z-30 items-center py-3 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer mb-3"
          title="Expand Hazard Navigation"
        >
          <PanelLeft className="w-5 h-5 text-blue-600" />
        </button>

        <div className="flex-1 overflow-y-auto space-y-2 flex flex-col items-center w-full px-1 scrollbar-none">
          {HAZARD_GROUPS.flatMap((g) => g.items).map((item) => {
            const isSelected = activeHazard === item.type;
            const assessment = hazardSummary.assessments[item.type];
            return (
              <button
                key={item.type}
                onClick={() => onSelectHazard(item.type)}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={`${item.label} (${assessment?.riskLevel?.toUpperCase() || 'LOW'})`}
              >
                {item.icon}
                {assessment?.riskLevel === 'very_high' && !isSelected && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 top-14 bg-slate-900/40 backdrop-blur-2xs z-40 animate-fade-in"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 top-14 z-40 w-72 sm:w-80 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 md:static md:translate-x-0 shrink-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Multi-Hazard Navigation</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select hazard to view spatial exposure
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCollapse}
              className="hidden md:inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Hazard Groups List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {HAZARD_GROUPS.map((group) => (
            <div key={group.groupId} className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
                {group.groupTitle}
              </span>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isSelected = activeHazard === item.type;
                  const assessment = hazardSummary.assessments[item.type];
                  const confidence = assessment?.provenance?.confidenceLevel || 'Indicative';

                  return (
                    <button
                      key={item.type}
                      onClick={() => {
                        onSelectHazard(item.type);
                        onCloseMobile();
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-600 text-slate-900 shadow-2xs ring-1 ring-blue-600/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold text-slate-900 text-xs truncate">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {assessment?.officialWarning?.alertStage && assessment.officialWarning.alertStage !== 'no_warning' ? (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                Active Alert
                              </span>
                            ) : null}
                            {getRiskBadge(assessment?.baselineSusceptibility?.level || assessment?.riskLevel)}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                          {item.plainDesc}
                        </p>

                        {/* Real-time official agency status pill */}
                        {assessment?.officialWarning?.alertStage && assessment.officialWarning.alertStage !== 'no_warning' ? (
                          <div className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 font-medium truncate">
                            <strong>{assessment.officialWarning.agency}:</strong> {assessment.officialWarning.warningTitle}
                          </div>
                        ) : item.type === 'tsunami' ? (
                          <div className="text-[10px] text-emerald-800 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200 mt-1 font-medium">
                            INCOIS ITEWC: No Tsunami Threat
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-slate-100/80 text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getEvidenceBadge(assessment?.evidence?.evidenceType)}
                            <span className="text-slate-500 font-medium truncate">
                              Score: <strong className="text-slate-700 font-semibold">{assessment?.scientificScore ?? 0}</strong>/100
                            </span>
                          </div>
                          {assessment?.primaryMetricValue && (
                            <span className="text-slate-600 font-medium truncate font-mono text-[9px] bg-slate-50 px-1 py-0.5 rounded border border-slate-200">
                              {assessment.primaryMetricValue}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Integrated Weather Widget */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1.5">
              Live Weather & Precipitation
            </span>
            <VillageWeatherWidget
              weather={weatherData}
              isLoading={isLoadingWeather}
              error={weatherError}
              onRefresh={onRefreshWeather}
              onApplyWeatherRainfall={onApplyWeatherRainfall}
              appliedRainfall={appliedRainfall}
            />
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <button
            onClick={onOpenFullMatrix}
            className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Multi-Hazard Risk Matrix</span>
          </button>
        </div>
      </aside>
    </>
  );
};
