import React, { useState } from 'react';
import {
  Waves,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Maximize2,
  Building2,
  Route,
  Droplets,
  Info,
} from 'lucide-react';
import type { SimulationResult, SimulationConfig } from '../../types/village';

export interface SimulationStatusCardProps {
  locationName: string;
  isSimulating: boolean;
  simulationResult: SimulationResult;
  simConfig: SimulationConfig;
  isFloodLayerVisible: boolean;
  onToggleFloodLayer: () => void;
  onShowFloodOnMap: () => void;
  onDismiss: () => void;
  isDismissed: boolean;
  onReopen: () => void;
  activeFloodHour?: number | null;
}

export const SimulationStatusCard: React.FC<SimulationStatusCardProps> = ({
  locationName,
  isSimulating,
  simulationResult,
  simConfig,
  isFloodLayerVisible,
  onToggleFloodLayer,
  onShowFloodOnMap,
  onDismiss,
  isDismissed,
  onReopen,
  activeFloodHour,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If dismissed, render an unobtrusive mini-chip button to reopen
  if (isDismissed) {
    return (
      <div className="pointer-events-auto">
        <button
          onClick={onReopen}
          className="bg-white/95 backdrop-blur-md border border-slate-200 hover:border-blue-400 rounded-xl px-3 py-1.5 shadow-md text-xs font-semibold text-slate-800 flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer"
          title="Click to view simulation status and results"
        >
          <Waves className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Simulation: {simulationResult.maxInundatedArea_ha > 0 ? `${simulationResult.maxInundatedArea_ha.toFixed(1)} ha` : 'Ready'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        </button>
      </div>
    );
  }

  const currentFrame =
    activeFloodHour !== null && activeFloodHour !== undefined && simulationResult.frames?.length
      ? simulationResult.frames.find((f) => f.hour === activeFloodHour) || simulationResult.frames[activeFloodHour]
      : null;

  const displayAreaHa = currentFrame ? currentFrame.inundatedArea_ha : simulationResult.maxInundatedArea_ha;
  const displayDepthM = currentFrame ? currentFrame.maxDepth_m : simulationResult.peakDepth_m;

  const isFailed = !isSimulating && simulationResult.maxInundatedArea_ha < 0;
  const isCompleted = !isSimulating && !isFailed;
  const hasInundation = displayAreaHa > 0;

  return (
    <div className="pointer-events-auto w-64 max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden text-xs text-slate-800 transition-all">
      {/* Header bar */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Status badge */}
          {isSimulating ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center gap-1 shrink-0">
              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
              Running
            </span>
          ) : isCompleted ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Completed
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1 shrink-0">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Failed
            </span>
          )}

          {/* Model label / Simulation tag */}
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 shrink-0"
            title="Hydrological simulation model estimate. Not an observed flood or statutory warning."
          >
            SIMULATION
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
          title="Dismiss card (Flood layer remains active on map)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main card body */}
      <div className="p-2.5 space-y-2">
        {/* Title & Location */}
        <div>
          <h4 className="font-bold text-slate-900 text-xs leading-tight flex items-center gap-1.5 truncate">
            <Waves className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Simulation: {locationName}</span>
          </h4>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
            {currentFrame ? `Step Hour ${currentFrame.hour}h · ` : ''}
            {simConfig.rainfallIntensity_mmh} mm/h · {simConfig.rainfallDuration_hours}h storm
          </div>
        </div>

        {/* Short Summary Grid: Inundated Area & Peak Depth */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">
              {currentFrame ? `Hour ${currentFrame.hour}h Area` : 'Flooded Area'}
            </span>
            <div className="font-extrabold text-blue-700 text-sm sm:text-base leading-tight mt-0.5">
              {isSimulating ? (
                <span className="text-slate-400 text-xs">Computing...</span>
              ) : hasInundation ? (
                `${displayAreaHa.toFixed(1)} ha`
              ) : (
                '0.0 ha (Nil)'
              )}
            </div>
            {hasInundation && (
              <span className="text-[9px] text-slate-400 font-mono">
                ({(displayAreaHa / 100).toFixed(2)} km²)
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">
              {currentFrame ? `Hour ${currentFrame.hour}h Depth` : 'Maximum Depth'}
            </span>
            <div className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight mt-0.5">
              {isSimulating ? (
                <span className="text-slate-400 text-xs">Computing...</span>
              ) : hasInundation ? (
                `${displayDepthM.toFixed(2)} m`
              ) : (
                '0.00 m'
              )}
            </div>
            {hasInundation && (
              <span className="text-[9px] text-slate-400 font-mono">
                ({Math.round(displayDepthM * 100)} cm)
              </span>
            )}
          </div>
        </div>

        {/* Action Controls: Show flood on map & Toggle details */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onShowFloodOnMap}
            disabled={isSimulating}
            className="flex-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            title="Enable flood layer and zoom camera to the simulated extent"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Show flood on map</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title={isExpanded ? 'Hide detailed statistics' : 'View detailed statistics'}
          >
            <span>{isExpanded ? 'Less' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Detailed Statistics Panel */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px] animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg">
                <Route className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Affected Roads:</span>
                  <span className="font-bold text-slate-800">
                    {(simulationResult.affectedRoads || []).filter((r) => r.depth_m > 0).length} of{' '}
                    {simulationResult.affectedRoads?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Flooded Dwellings:</span>
                  <span className="font-bold text-slate-800">
                    {(simulationResult.affectedBuildings || []).filter((b) => b.risk !== 'safe').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg space-y-1 text-[10px] text-slate-600">
              <div className="flex justify-between">
                <span>Total Rainfall Runoff:</span>
                <span className="font-semibold text-slate-900">{simulationResult.totalRainfall_mm || 0} mm</span>
              </div>
              <div className="flex justify-between">
                <span>Drainage Efficiency:</span>
                <span className="font-semibold text-emerald-700">
                  {simulationResult.drainageEfficiency_percent || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Farmland Submerged:</span>
                <span className="font-semibold text-amber-800">
                  {simulationResult.farmlandInundated_ha?.toFixed(1) || '0.0'} ha
                </span>
              </div>
            </div>

            {simulationResult.modelScopeNote && (
              <div className="text-[9.5px] text-slate-400 leading-tight">
                {simulationResult.modelScopeNote}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

