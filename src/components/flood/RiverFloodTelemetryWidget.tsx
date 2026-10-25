import React, { useState, useEffect } from 'react';
import {
  Waves,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Compass,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Droplets,
  CloudRain,
  ShieldCheck,
  Clock,
  Radio,
  MapPin,
} from 'lucide-react';
import type { CwcRiverGaugeStation, ImdRainfallTelemetry, DatasetProvenanceMeta, DataFreshnessStatus } from '../../types/flood';
import { DataFreshnessBadge } from './DataFreshnessBadge';

interface RiverFloodTelemetryWidgetProps {
  gauges: CwcRiverGaugeStation[];
  imdTelemetry: ImdRainfallTelemetry | null;
  location?: {
    center: [number, number];
    name?: string;
    district?: string;
    state?: string;
  };
  isLoading?: boolean;
  onRefresh?: () => void;
  onLocateGauge?: (gauge: CwcRiverGaugeStation) => void;
  onOpenEvacuation?: () => void;
  onOpenValidation?: () => void;
  freshnessStatus?: DataFreshnessStatus;
  lastSuccessfulRetrieval?: string;
}

export const RiverFloodTelemetryWidget: React.FC<RiverFloodTelemetryWidgetProps> = ({
  gauges,
  imdTelemetry,
  location,
  isLoading = false,
  onRefresh,
  onLocateGauge,
  onOpenEvacuation,
  onOpenValidation,
  freshnessStatus = 'fresh',
  lastSuccessfulRetrieval,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [nwdpData, setNwdpData] = useState<any>(null);
  const [isLoadingNwdp, setIsLoadingNwdp] = useState(false);
  const primaryGauge = gauges?.[0];

  useEffect(() => {
    if (location?.center) {
      setIsLoadingNwdp(true);
      const [lng, lat] = location.center;
      fetch(
        `/api/gov/nwdp/cwc-rainfall?lat=${lat}&lng=${lng}&district=${encodeURIComponent(
          location.district || ''
        )}&state=${encodeURIComponent(location.state || '')}`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.nearestStation) {
            setNwdpData(data);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingNwdp(false));
    }
  }, [location?.center?.[0], location?.center?.[1]]);

  if (!primaryGauge && !imdTelemetry) {
    return null;
  }

  const warningColorClass =
    imdTelemetry?.warningColor === 'red'
      ? 'bg-red-500/10 text-red-700 border-red-300'
      : imdTelemetry?.warningColor === 'orange'
      ? 'bg-orange-500/10 text-orange-700 border-orange-300'
      : imdTelemetry?.warningColor === 'yellow'
      ? 'bg-amber-500/10 text-amber-700 border-amber-300'
      : 'bg-emerald-500/10 text-emerald-700 border-emerald-300';

  const gaugeStatusClass =
    primaryGauge?.floodStatus === 'extreme' || primaryGauge?.floodStatus === 'danger'
      ? 'bg-red-100 text-red-800 border-red-300'
      : primaryGauge?.floodStatus === 'warning'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  const waterLevelPct = primaryGauge
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((primaryGauge.currentWaterLevel_m - (primaryGauge.warningLevel_m - 2.0)) /
              (primaryGauge.dangerLevel_m - (primaryGauge.warningLevel_m - 2.0) || 1)) *
              100
          )
        )
      )
    : 0;

  const ageMinutes = lastSuccessfulRetrieval
    ? Math.max(0, Math.round((Date.now() - new Date(lastSuccessfulRetrieval).getTime()) / 60000))
    : 15;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden text-xs">
      {/* Header */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-[11px] leading-tight">
              Verified River & Rainfall Telemetry
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <DataFreshnessBadge status={freshnessStatus} ageMinutes={ageMinutes} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh hourly authoritative feeds"
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* 1. IMD Synoptic Warning Section */}
          {imdTelemetry && (
            <div className={`p-2.5 rounded-lg border ${warningColorClass} space-y-1.5`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5" />
                  {imdTelemetry.warningTitle}
                </span>
                <span className="text-[10px] font-mono font-semibold">
                  {imdTelemetry.observedRainfall24h_mm} mm/24h
                </span>
              </div>
              <p className="text-[11px] leading-snug">{imdTelemetry.advisoryText}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span>QPF 24h: <strong>{imdTelemetry.qpf24h_mm} mm</strong></span>
                <span>Normal: {imdTelemetry.normalRainfall_mm} mm ({imdTelemetry.departurePercent > 0 ? `+${imdTelemetry.departurePercent}%` : `${imdTelemetry.departurePercent}%`})</span>
              </div>
            </div>
          )}

          {/* 2. Nearest CWC River Gauge Station */}
          {primaryGauge ? (
            <div className="space-y-2 border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                    <span>{primaryGauge.stationName}</span>
                    <span className="text-[9px] text-slate-400 font-normal">
                      ({primaryGauge.distanceKm.toFixed(1)} km away)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    River: {primaryGauge.riverName} ({primaryGauge.basinName})
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${gaugeStatusClass}`}
                >
                  {primaryGauge.floodStatus}
                </span>
              </div>

              {/* Water Level Gauge Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-medium text-slate-600">
                  <span>Level: <strong>{primaryGauge.currentWaterLevel_m.toFixed(2)}m</strong></span>
                  <span className="text-slate-400">Danger: {primaryGauge.dangerLevel_m.toFixed(2)}m</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-500 ${
                      primaryGauge.currentWaterLevel_m >= primaryGauge.dangerLevel_m
                        ? 'bg-red-500'
                        : primaryGauge.currentWaterLevel_m >= primaryGauge.warningLevel_m
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${waterLevelPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>Warning: {primaryGauge.warningLevel_m.toFixed(1)}m</span>
                  <span>HFL: {primaryGauge.hfl_m.toFixed(1)}m</span>
                </div>
              </div>

              {/* Flow Trend & Discharge Rate */}
              <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-slate-200/60">
                <div className="flex items-center gap-1">
                  <span>Trend:</span>
                  {primaryGauge.flowTrend === 'rising' ? (
                    <span className="text-red-600 font-semibold flex items-center">
                      <ArrowUpRight className="w-3 h-3" /> Rising
                    </span>
                  ) : primaryGauge.flowTrend === 'falling' ? (
                    <span className="text-emerald-600 font-semibold flex items-center">
                      <ArrowDownRight className="w-3 h-3" /> Falling
                    </span>
                  ) : (
                    <span className="text-slate-600 flex items-center">
                      <Minus className="w-3 h-3" /> Steady
                    </span>
                  )}
                </div>
                <span>Discharge: <strong>{primaryGauge.discharge_m3s ? `${primaryGauge.discharge_m3s.toLocaleString()} m³/s` : 'Stage Only'}</strong></span>
              </div>

              {/* Action Buttons: Locate on Map & Evac Routes & Validation */}
              <div className="flex items-center gap-1.5 pt-1">
                {onLocateGauge && (
                  <button
                    onClick={() => onLocateGauge(primaryGauge)}
                    className="flex-1 py-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Compass className="w-3 h-3 text-blue-600" />
                    <span>Locate Gauge</span>
                  </button>
                )}
                {onOpenEvacuation && (
                  <button
                    onClick={onOpenEvacuation}
                    className="flex-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-[10px] font-semibold text-blue-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3 h-3 text-blue-600" />
                    <span>Evac Routes</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2 bg-slate-50 text-slate-500 rounded text-[11px] text-center">
              No verified matching station available.
            </div>
          )}

          {/* 3. National Water Data Portal (NWDP / CWC) Hourly Telemetry Station */}
          {nwdpData?.nearestStation && (
            <div className="space-y-2 border border-blue-200 rounded-lg p-2.5 bg-blue-50/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>CWC Telemetry: {nwdpData.nearestStation.station}</span>
                    <span className="text-[9px] text-slate-500 font-normal">
                      ({nwdpData.nearestStation.distanceKm.toFixed(1)} km away)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600">
                    River: {nwdpData.nearestStation.river} · Basin: {nwdpData.nearestStation.basin}
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                    !nwdpData.nearestStation.hasVerifiedRainfall
                      ? 'bg-slate-100 text-slate-600 border-slate-300'
                      : nwdpData.nearestStation.isStale
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                  title={nwdpData.nearestStation.observationStatusDescription}
                >
                  {!nwdpData.nearestStation.hasVerifiedRainfall
                    ? 'Rainfall Unavailable'
                    : nwdpData.nearestStation.isStale
                    ? 'Historical Log'
                    : 'Live Observation'}
                </span>
              </div>

              {nwdpData.nearestStation.hasVerifiedRainfall && nwdpData.nearestStation.latestObservation ? (
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2 rounded border border-blue-100">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Observation Record:</span>
                    <span className="font-bold text-slate-800">
                      {nwdpData.nearestStation.latestObservation.hourlyRainfallMm} mm/h
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate" title={nwdpData.nearestStation.observationStatusDescription}>
                      {nwdpData.nearestStation.latestObservation.dataAcquisitionTime}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">
                      {nwdpData.nearestStation.isStale ? '(Historical record)' : '(Observed zero)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Peak Observed in 2026:</span>
                    <span className="font-bold text-blue-700">
                      {nwdpData.nearestStation.peakObservation?.hourlyRainfallMm ?? 0} mm/h
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      {nwdpData.nearestStation.peakObservation?.dataAcquisitionTime}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">
                      Coordinates: {nwdpData.nearestStation.latitude.toFixed(2)}°N, {nwdpData.nearestStation.longitude.toFixed(2)}°E
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-2.5 rounded border border-blue-100 text-[10px] space-y-1.5">
                  <p className="text-slate-700 font-medium leading-relaxed">
                    Historical rainfall observations are currently unavailable for verification.
                  </p>
                  <div className="text-[9px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 border-t border-slate-100">
                    <span>Station: <strong className="text-slate-700 font-semibold">{nwdpData.nearestStation.station}</strong></span>
                    <span>·</span>
                    <span>River: <strong className="text-slate-700 font-semibold">{nwdpData.nearestStation.river}</strong></span>
                    <span>·</span>
                    <span>Coordinates: <strong className="text-slate-700 font-semibold">{nwdpData.nearestStation.latitude.toFixed(2)}°N, {nwdpData.nearestStation.longitude.toFixed(2)}°E</strong></span>
                  </div>
                </div>
              )}

              <div className="text-[9px] text-slate-500 flex items-center justify-between pt-0.5">
                <span className="text-slate-400">
                  Official source: National Water Data Portal (NWDP / CWC)
                </span>
                <a
                  href="https://nwdp.nwic.gov.in/en/dataset/rainfall-cwc-telemetry-hourly"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                >
                  <span>nwdp.nwic.gov.in</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {/* Model Validation & Scientific Accuracy Trigger Button */}
          {onOpenValidation && (
            <button
              onClick={onOpenValidation}
              className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-semibold text-emerald-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scientific Validation Report & Skill Scores</span>
            </button>
          )}

          {/* Official Source Provenance Footer */}
          <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>CWC & IMD Official Feeds</span>
            <a
              href="https://ffs.india-water.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <span>ffs.india-water.gov.in</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
