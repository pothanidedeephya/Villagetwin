import React, { useState } from 'react';
import {
  X,
  Wind,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Layers,
  MapPin,
  Compass,
  FileCheck,
  RefreshCw,
  Info,
  Building,
  Navigation,
  Sparkles,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type { RoadProperties, BuildingProperties } from '../../types/village';
import {
  CYCLONE_WIND_THRESHOLDS,
  type CycloneWindThreshold,
  type ParsedImdCycloneWindData,
  type VillageCycloneWindAssessment,
} from '../../types/imdCycloneWind';

interface ImdCycloneWindModalProps {
  currentLocation: LocationSearchResult;
  cycloneWindData: ParsedImdCycloneWindData | null;
  assessment: VillageCycloneWindAssessment | null;
  isLoading?: boolean;
  onRefreshLive: () => void;
  onLoadScenario: () => void;
  onClose: () => void;
}

export const ImdCycloneWindModal: React.FC<ImdCycloneWindModalProps> = ({
  currentLocation,
  cycloneWindData,
  assessment,
  isLoading = false,
  onRefreshLive,
  onLoadScenario,
  onClose,
}) => {
  const [selectedThreshold, setSelectedThreshold] = useState<CycloneWindThreshold>('34kt');

  const connStatus = cycloneWindData?.connectionStatus || 'AUTHENTICATION_REQUIRED';
  const isScenario = connStatus === 'BENCHMARK_SCENARIO';
  const isAuthRequired = connStatus === 'AUTHENTICATION_REQUIRED';
  const isNoWarning = connStatus === 'CONNECTED_NO_ACTIVE_WARNING';
  const isConnectedActive = connStatus === 'CONNECTED_ACTIVE';

  const thresholds: CycloneWindThreshold[] = ['27kt', '34kt', '50kt', '64kt'];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-scale-up">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-600 text-white shadow-xs">
              <Wind className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  IMD Cyclone Wind Warning (27kt - 64kt)
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isConnectedActive
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : isScenario
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : isNoWarning
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {isConnectedActive
                    ? 'Official IMD Live Stream'
                    : isScenario
                    ? 'Benchmark / Test Data — Not a Current Official Warning'
                    : isNoWarning
                    ? 'Live: Zero Active Cyclones'
                    : 'Auth Required (HTTP 401)'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official MultiPolygon Wind Radii · Endpoint: api.imd.gov.in/api/v1/cyclone_wind
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-600">
          {/* Connection Status & Live API Polling Banner */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isScenario
                ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                : isAuthRequired
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : isNoWarning
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : 'bg-red-50/90 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isScenario ? (
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              ) : isAuthRequired ? (
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : isNoWarning ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block text-slate-900">
                  {isScenario
                    ? 'Benchmark / Test Data — Not a Current Official Warning'
                    : isAuthRequired
                    ? 'Official IMD wind-warning geometry unavailable — authentication required.'
                    : isNoWarning
                    ? 'Official IMD Feed Polled: No Active Cyclone Warnings'
                    : cycloneWindData?.message}
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isScenario
                    ? 'Isolated benchmark test fixture using verified historical Bay of Bengal wind-radii geometries. Click "Poll Live API" to query real-time official warnings without test data fallback.'
                    : isAuthRequired
                    ? 'HTTP 401 Unauthorized returned by https://api.imd.gov.in/api/v1/cyclone_wind. Set IMD_API_KEY and IMD_BEARER_TOKEN in server environment to enable live polling. Zero synthetic fallback substituted.'
                    : cycloneWindData?.authNotice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={onRefreshLive}
                disabled={isLoading}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Poll Live API</span>
              </button>

              <button
                onClick={onLoadScenario}
                disabled={isLoading}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isScenario ? 'Reload Scenario' : 'Load Benchmark Scenario'}</span>
              </button>
            </div>
          </div>

          {/* Location-Specific Assessment Banner */}
          {assessment && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-slate-800 text-sm">
                    {assessment.locationName} ({currentLocation.district}, {currentLocation.state})
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    assessment.villageIntersectsAny
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}
                >
                  {assessment.villageIntersectsAny
                    ? `Exposed to ${assessment.highestExposedThreshold} (${assessment.highestExposedSpeedKmh} km/h)`
                    : 'Clear of Wind Warning Radii'}
                </span>
              </div>

              {/* Assessment Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Village Center</span>
                  <span
                    className={`font-bold text-xs ${
                      assessment.centerStatus === 'INSIDE_CORRIDOR' ? 'text-red-600' : 'text-slate-800'
                    }`}
                  >
                    {assessment.centerStatus === 'INSIDE_CORRIDOR' ? 'Inside Corridor' : 'Outside Radii'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {assessment.boundaryStatus === 'INTERSECTS' ? 'Boundary Overlaps' : 'Boundary Clear'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Max Overlap Area</span>
                  <span className="font-bold text-orange-600 text-xs">
                    {assessment.thresholdAssessments.find((t) => t.boundaryIntersects)?.boundaryOverlapAreaKm2 || 0} km²
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {assessment.thresholdAssessments.find((t) => t.boundaryIntersects)?.boundaryOverlapRatioPercent || 0}% of village
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Exposed Roads</span>
                  {assessment.roadsDataStatus === 'DATA_UNAVAILABLE' ? (
                    <span className="font-semibold text-slate-400 text-xs italic block mt-0.5">
                      Data unavailable
                    </span>
                  ) : (
                    <>
                      <span className="font-bold text-slate-800 text-xs">
                        {assessment.uniqueExposedRoadLengthKm} km
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {assessment.uniqueExposedRoadSegmentsCount} of {assessment.totalVillageRoadsCount} segments
                      </span>
                    </>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Mapped Buildings</span>
                  {assessment.buildingsDataStatus === 'DATA_UNAVAILABLE' ? (
                    <span className="font-semibold text-slate-400 text-xs italic block mt-0.5">
                      Data unavailable
                    </span>
                  ) : (
                    <>
                      <span className="font-bold text-slate-800 text-xs">
                        {assessment.uniqueExposedBuildingsCount} structures
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {assessment.uniqueExposedBuildingsCount} of {assessment.totalVillageBuildingsCount} mapped
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Benchmark Geographic Context Alert */}
              {isScenario && (
                <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Benchmark Scenario Notice:</strong> This benchmark test scenario uses verified historical Bay of Bengal wind-radii geometries located at approximately 16.5°N, 80.8°E (Coastal Andhra Pradesh corridor). Nationwide settlements outside this specific corridor (such as {currentLocation.name}) will accurately calculate as outside radii.
                  </p>
                </div>
              )}

              {/* Nuance Disclaimer Alert */}
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  {assessment.officialNuanceDisclaimer}
                </p>
              </div>
            </div>
          )}

          {/* Official 4-Tier Wind Radii Breakdown */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Official IMD Wind Warning MultiPolygon Thresholds
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {thresholds.map((tKey) => {
                const meta = CYCLONE_WIND_THRESHOLDS[tKey];
                const validated = cycloneWindData?.polygons[tKey];
                const locAssessment = assessment?.thresholdAssessments.find((a) => a.threshold === tKey);
                const isSelected = selectedThreshold === tKey;

                return (
                  <div
                    key={tKey}
                    onClick={() => setSelectedThreshold(tKey)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-800 bg-slate-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="font-bold text-slate-900 text-xs">
                          {tKey} ({meta.kmh} km/h)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {meta.beaufortScale}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-700 mt-1">
                      {meta.categoryLabel}
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      {meta.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">
                        Geometry: {validated ? `${validated.totalAreaKm2} km²` : 'Not In Feed'}
                      </span>
                      <span
                        className={`font-bold ${
                          locAssessment?.boundaryIntersects
                            ? 'text-orange-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {locAssessment?.boundaryIntersects
                          ? `${locAssessment.boundaryOverlapRatioPercent}% Village Overlap`
                          : 'No Overlap'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Threshold Specific Guidance */}
          {selectedThreshold && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Recommended Standard Operating Procedure (SOP) · {selectedThreshold} ({CYCLONE_WIND_THRESHOLDS[selectedThreshold].kmh} km/h)
              </span>
              <p className="text-[11px] text-slate-700">
                {CYCLONE_WIND_THRESHOLDS[selectedThreshold].recommendedAction}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Retrieved: {new Date(cycloneWindData?.retrievedAt || Date.now()).toLocaleTimeString()}</span>
            <span>·</span>
            <a
              href="https://api.imd.gov.in/public/api_reference.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>IMD API Spec</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

