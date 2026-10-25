import React, { useState } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  Waves,
  LifeBuoy,
  Wind,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type {
  MultiHazardSimulationType,
  SimulationAreaScope,
  FloodScenarioParams,
  TsunamiScenarioParams,
  CycloneScenarioParams,
  EarthquakeScenarioParams,
  StructuredHazardImpactReport,
} from '../../types/scenarioSimulation';
import type { WeatherData } from '../../types/weather';

interface ScenarioControlPanelProps {
  currentLocation: LocationSearchResult;
  activeHazard: MultiHazardSimulationType;
  onChangeHazard: (hazard: MultiHazardSimulationType) => void;
  onRunSimulation: (
    hazard: MultiHazardSimulationType,
    params: FloodScenarioParams | TsunamiScenarioParams | CycloneScenarioParams | EarthquakeScenarioParams,
    scope: SimulationAreaScope
  ) => Promise<void>;
  isSimulating: boolean;
  impactReport: StructuredHazardImpactReport | null;
  onFocusZone?: (coords: [number, number]) => void;
  onOpenFullReport?: () => void;
  weather?: WeatherData | null;
}

export const ScenarioControlPanel: React.FC<ScenarioControlPanelProps> = ({
  currentLocation,
  activeHazard,
  onChangeHazard,
  onRunSimulation,
  isSimulating,
  impactReport,
  onFocusZone,
  onOpenFullReport,
  weather,
}) => {
  // Area scope
  const [scope, setScope] = useState<SimulationAreaScope>('village_boundary');
  const [rainfallSource, setRainfallSource] = useState<'custom' | 'weather_observed' | 'weather_forecast'>('custom');

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

  // Flood parameters
  const [floodParams, setFloodParams] = useState<FloodScenarioParams>({
    rainfallIntensity_mmh: 65,
    duration_hours: 4,
    drainageCondition: 'normal',
    tideOutfallCondition: 'normal',
    designStormType: '25_year',
  });

  // Tsunami parameters
  const [tsunamiParams, setTsunamiParams] = useState<TsunamiScenarioParams>({
    earthquakeMagnitude_Mw: 8.8,
    ruptureDistance_km: 180,
    maxRunupHeight_m: 4.5,
  });

  // Cyclone parameters
  const [cycloneParams, setCycloneParams] = useState<CycloneScenarioParams>({
    stormCategory: 'Cat 3',
    maxSustainedWind_kmh: 165,
    stormSurge_m: 3.2,
    radiusMaxWinds_km: 30,
    trackAzimuth_deg: 295,
    forwardSpeed_kmh: 18,
  });

  // Earthquake parameters
  const [earthquakeParams, setEarthquakeParams] = useState<EarthquakeScenarioParams>({
    hypotheticalMagnitude_Mw: 6.8,
    hypocenterDepth_km: 15,
    epicentralDistance_km: 35,
    localSoilType: 'soft_alluvium',
  });

  const handleRun = () => {
    let params: any = floodParams;
    if (activeHazard === 'tsunami') params = tsunamiParams;
    if (activeHazard === 'cyclone') params = cycloneParams;
    if (activeHazard === 'earthquake') params = earthquakeParams;

    onRunSimulation(activeHazard, params, scope);
  };

  const handleReset = () => {
    setFloodParams({
      rainfallIntensity_mmh: 65,
      duration_hours: 4,
      drainageCondition: 'normal',
      tideOutfallCondition: 'normal',
      designStormType: '25_year',
    });
    setTsunamiParams({
      earthquakeMagnitude_Mw: 8.8,
      ruptureDistance_km: 180,
      maxRunupHeight_m: 4.5,
    });
    setCycloneParams({
      stormCategory: 'Cat 3',
      maxSustainedWind_kmh: 165,
      stormSurge_m: 3.2,
      radiusMaxWinds_km: 30,
      trackAzimuth_deg: 295,
      forwardSpeed_kmh: 18,
    });
    setEarthquakeParams({
      hypotheticalMagnitude_Mw: 6.8,
      hypocenterDepth_km: 15,
      epicentralDistance_km: 35,
      localSoilType: 'soft_alluvium',
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col text-slate-800">
      {/* Header */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
              Scenario Control Panel
              <span className="text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded uppercase">
                Simulated Scenarios
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Hypothetical hazard parameters calibrated to {currentLocation.name} ({currentLocation.elevation_m || 25}m AMSL)
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800"
          title="Reset to location baseline defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Hazard Selector Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/70 p-1 gap-1">
        {[
          { id: 'flood', label: 'Flood', icon: Waves },
          { id: 'tsunami', label: 'Tsunami', icon: LifeBuoy },
          { id: 'cyclone', label: 'Cyclone', icon: Wind },
          { id: 'earthquake', label: 'Earthquake', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeHazard === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeHazard(tab.id as MultiHazardSimulationType)}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scenario Parameters Form */}
      <div className="p-3.5 sm:p-4 space-y-3.5 text-xs">
        
        {/* FLOOD CONTROLS */}
        {activeHazard === 'flood' && (
          <div className="space-y-3">
            {/* Rainfall Source Tabs if Weather Data is Available */}
            {weather && (
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setRainfallSource('custom');
                    setFloodParams({ ...floodParams, rainfallIntensity_mmh: 65 });
                  }}
                  className={`py-1 px-1.5 rounded font-semibold text-center transition-all cursor-pointer ${
                    rainfallSource === 'custom'
                      ? 'bg-white text-blue-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Custom Storm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRainfallSource('weather_observed');
                    setFloodParams({ ...floodParams, rainfallIntensity_mmh: weather.current.rainfall_mmh });
                  }}
                  disabled={weather.current.precipitationStatus === 'unobserved'}
                  className={`py-1 px-1.5 rounded font-semibold text-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    rainfallSource === 'weather_observed'
                      ? 'bg-white text-blue-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live Rain ({weather.current.rainfall_mmh} mm/h)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRainfallSource('weather_forecast');
                    setFloodParams({ ...floodParams, rainfallIntensity_mmh: forecastPeak.rate_mmh });
                  }}
                  disabled={!weather.hourlyForecast || weather.hourlyForecast.length === 0}
                  className={`py-1 px-1.5 rounded font-semibold text-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    rainfallSource === 'weather_forecast'
                      ? 'bg-white text-blue-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Forecast Peak ({forecastPeak.rate_mmh} mm/h)
                </button>
              </div>
            )}

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>
                  Rainfall Intensity{' '}
                  {rainfallSource !== 'custom' && (
                    <span className="text-[10px] text-blue-600 font-normal">
                      ({rainfallSource === 'weather_observed' ? 'Live Weather Observation' : 'Forecast Peak'})
                    </span>
                  )}
                </span>
                <span className="text-blue-700 font-bold">{floodParams.rainfallIntensity_mmh} mm/h</span>
              </div>

              {rainfallSource === 'custom' ? (
                <>
                  <input
                    type="range"
                    min="20"
                    max="140"
                    step="5"
                    value={floodParams.rainfallIntensity_mmh}
                    onChange={(e) =>
                      setFloodParams({ ...floodParams, rainfallIntensity_mmh: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>20 mm/h (Moderate)</span>
                    <span>65 mm/h (Severe)</span>
                    <span>140 mm/h (Cloudburst)</span>
                  </div>
                </>
              ) : (
                <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-slate-600">
                  <div className="font-semibold text-blue-900 flex items-center justify-between">
                    <span>{rainfallSource === 'weather_observed' ? 'Real-Time Measured Precipitation' : 'Forecast Model Peak'}</span>
                    <span className="font-mono">{floodParams.rainfallIntensity_mmh} mm/h</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {rainfallSource === 'weather_observed'
                      ? `${weather?.provider} · Observed at ${weather?.lastUpdated || 'Station'}`
                      : `Expected peak rate at ${forecastPeak.time} · Next 24h trajectory`}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Rainfall Duration</label>
                <select
                  value={floodParams.duration_hours}
                  onChange={(e) => setFloodParams({ ...floodParams, duration_hours: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value={2}>2 Hours (Flash pulse)</option>
                  <option value={4}>4 Hours (Standard convective)</option>
                  <option value={8}>8 Hours (Prolonged monsoonal)</option>
                  <option value={24}>24 Hours (Design storm)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Drainage Maintenance</label>
                <select
                  value={floodParams.drainageCondition}
                  onChange={(e) =>
                    setFloodParams({ ...floodParams, drainageCondition: e.target.value as any })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="improved">Clean / Desilted (High Capacity)</option>
                  <option value="normal">Normal Operational State</option>
                  <option value="silted">Silted / Weeds (Choked 50%)</option>
                  <option value="blocked">Blocked / Backwater Surcharge</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TSUNAMI CONTROLS */}
        {activeHazard === 'tsunami' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Offshore Wave Run-Up Height</span>
                <span className="text-blue-700 font-bold">{tsunamiParams.maxRunupHeight_m} m AMSL</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="12.0"
                step="0.5"
                value={tsunamiParams.maxRunupHeight_m}
                onChange={(e) =>
                  setTsunamiParams({ ...tsunamiParams, maxRunupHeight_m: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1.0m (Minor Surge)</span>
                <span>4.5m (2004 Sumatra Analog)</span>
                <span>12.0m (Extreme Runup)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Megathrust Magnitude</label>
                <select
                  value={tsunamiParams.earthquakeMagnitude_Mw}
                  onChange={(e) =>
                    setTsunamiParams({ ...tsunamiParams, earthquakeMagnitude_Mw: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value={7.8}>Mw 7.8 (Moderate tsunami potential)</option>
                  <option value={8.5}>Mw 8.5 (Major tsunamigenic)</option>
                  <option value={8.8}>Mw 8.8 (2004 Sumatra analog)</option>
                  <option value={9.2}>Mw 9.2 (Basin-wide deluge)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Rupture Distance</label>
                <select
                  value={tsunamiParams.ruptureDistance_km}
                  onChange={(e) =>
                    setTsunamiParams({ ...tsunamiParams, ruptureDistance_km: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value={90}>90 km (Nearshore trench)</option>
                  <option value={180}>180 km (Regional subduction)</option>
                  <option value={450}>450 km (Far-field propagation)</option>
                </select>
              </div>
            </div>

            {(currentLocation.elevation_m || 25) > 15 && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Inland Topography Notice:</strong> {currentLocation.name} is at {currentLocation.elevation_m}m AMSL. The simulation will physically enforce marine wave decay and report <em>NOT APPLICABLE / NO MODELLED EXPOSURE</em> if elevation exceeds the wave crest.
                </span>
              </div>
            )}
          </div>
        )}

        {/* CYCLONE CONTROLS */}
        {activeHazard === 'cyclone' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Peak Sustained Wind Speed</span>
                <span className="text-blue-700 font-bold">{cycloneParams.maxSustainedWind_kmh} km/h</span>
              </div>
              <input
                type="range"
                min="90"
                max="240"
                step="5"
                value={cycloneParams.maxSustainedWind_kmh}
                onChange={(e) =>
                  setCycloneParams({ ...cycloneParams, maxSustainedWind_kmh: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>90 km/h (Cyclonic Storm)</span>
                <span>165 km/h (Very Severe)</span>
                <span>240 km/h (Super Cyclone)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Storm Category</label>
                <select
                  value={cycloneParams.stormCategory}
                  onChange={(e) =>
                    setCycloneParams({
                      ...cycloneParams,
                      stormCategory: e.target.value as any,
                      maxSustainedWind_kmh:
                        e.target.value === 'Cat 5'
                          ? 230
                          : e.target.value === 'Cat 4'
                          ? 190
                          : e.target.value === 'Cat 3'
                          ? 165
                          : e.target.value === 'Cat 2'
                          ? 130
                          : 105,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="Cat 1">Category 1 (90-120 km/h)</option>
                  <option value="Cat 2">Category 2 (120-150 km/h)</option>
                  <option value="Cat 3">Category 3 (150-180 km/h)</option>
                  <option value="Cat 4">Category 4 (180-210 km/h)</option>
                  <option value="Cat 5">Category 5 (210+ km/h)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Coastal Surge Height</label>
                <select
                  value={cycloneParams.stormSurge_m}
                  onChange={(e) => setCycloneParams({ ...cycloneParams, stormSurge_m: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value={1.5}>1.5m (Moderate surge)</option>
                  <option value={3.2}>3.2m (Severe surge ingress)</option>
                  <option value={5.0}>5.0m (Extreme inundation)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* EARTHQUAKE CONTROLS */}
        {activeHazard === 'earthquake' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Hypothetical Magnitude</span>
                <span className="text-blue-700 font-bold">Mw {earthquakeParams.hypotheticalMagnitude_Mw}</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="8.4"
                step="0.1"
                value={earthquakeParams.hypotheticalMagnitude_Mw}
                onChange={(e) =>
                  setEarthquakeParams({
                    ...earthquakeParams,
                    hypotheticalMagnitude_Mw: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Mw 5.0 (Moderate)</span>
                <span>Mw 6.8 (Strong)</span>
                <span>Mw 8.4 (Great Fault Rupture)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Epicentral Distance</label>
                <select
                  value={earthquakeParams.epicentralDistance_km}
                  onChange={(e) =>
                    setEarthquakeParams({
                      ...earthquakeParams,
                      epicentralDistance_km: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value={10}>10 km (Near-fault directivity)</option>
                  <option value={35}>35 km (Regional rupture)</option>
                  <option value={90}>90 km (Distant plate margin)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Local Site Geology</label>
                <select
                  value={earthquakeParams.localSoilType}
                  onChange={(e) =>
                    setEarthquakeParams({
                      ...earthquakeParams,
                      localSoilType: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="soft_alluvium">Soft Alluvial Silt (1.45x Amplification)</option>
                  <option value="stiff_soil">Stiff Sandy Clay (1.15x)</option>
                  <option value="hard_rock">Hard Bedrock (0.90x No Amplification)</option>
                </select>
              </div>
            </div>

            <div className="p-2.5 bg-slate-100 rounded-xl text-[10px] text-slate-500 leading-relaxed">
              <strong>Ground Shaking Disclaimer:</strong> Earthquakes cannot be predicted in advance. Ground motion (PGA & MMI) is calculated using empirical Atkinson-Boore attenuation functions based on BIS IS 1893:2016 statutory zonation.
            </div>
          </div>
        )}

        {/* Study Area Scope Selector */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-slate-600 font-semibold mb-1 text-[11px]">Simulation Extent</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'village_boundary', label: 'Cadastral Boundary' },
              { id: 'radius_2km', label: '2 km Radius Buffer' },
              { id: 'radius_5km', label: '5 km Catchment' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setScope(item.id as SimulationAreaScope)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                  scope === item.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Run Simulation */}
        <div className="pt-1">
          <button
            onClick={handleRun}
            disabled={isSimulating}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              isSimulating
                ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
            }`}
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Location-Specific Simulation...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Scenario Simulation</span>
              </>
            )}
          </button>
        </div>

        {/* MOST AFFECTED AREA RESULT HIGHLIGHT */}
        {impactReport && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Simulation Output
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {impactReport.modelVersion}
              </span>
            </div>

            {/* Most Affected Area Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-900 text-xs truncate">
                  {impactReport.mostAffectedArea.zoneName}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                    impactReport.mostAffectedArea.severityTier === 'extreme'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : impactReport.mostAffectedArea.severityTier === 'high'
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  Rank #{impactReport.mostAffectedArea.severityRank} {impactReport.mostAffectedArea.severityTier}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-base font-extrabold text-blue-700">
                  {impactReport.mostAffectedArea.metricValue}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({impactReport.mostAffectedArea.metricLabel})
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-snug">
                {impactReport.mostAffectedArea.rankingRationale}
              </p>

              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/80">
                <span>
                  Affected: <strong>{impactReport.mostAffectedArea.affectedAreaHa} ha</strong>
                </span>
                <span>
                  Severed Corridors: <strong>{impactReport.mostAffectedArea.exposedRoadsCount}</strong>
                </span>
                {onFocusZone && (
                  <button
                    onClick={() => onFocusZone(impactReport.mostAffectedArea.centerCoordinates)}
                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Focus Map</span>
                  </button>
                )}
              </div>
            </div>

            {/* Key Metric Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Study Area Impacted</span>
                <strong className="text-slate-900 font-bold">
                  {impactReport.geographicImpact.estimatedAffectedAreaKm2} km² ({impactReport.geographicImpact.percentageAreaAffected}%)
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Exposed Roads</span>
                <strong className="text-slate-900 font-bold">
                  {impactReport.infrastructureImpact.intersectingRoadLengthKm} km ({impactReport.infrastructureImpact.severedRoadSegmentsCount} severed)
                </strong>
              </div>
            </div>

            {/* Full Report Link */}
            {onOpenFullReport && (
              <button
                onClick={onOpenFullReport}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Full Structured Impact Report</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

