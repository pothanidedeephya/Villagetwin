import React, { useState } from 'react';
import {
  Route,
  X,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ShieldCheck,
  ArrowRight,
  Info,
  Layers,
  MapPin,
  Sliders,
} from 'lucide-react';
import type { VillageDataset, SimulationResult } from '../../types/village';
import type { LocationSearchResult } from '../../types/nationwide';
import { calculateFloodAwareEvacuationRoutes } from '../../services/floodDataService';
import type { FloodAwareEvacuationRoute } from '../../types/flood';

interface EvacuationRouteModalProps {
  location: LocationSearchResult;
  dataset: VillageDataset;
  simulationResult: SimulationResult;
  onClose: () => void;
  onLocateRouteOnMap?: (route: FloodAwareEvacuationRoute) => void;
}

export const EvacuationRouteModal: React.FC<EvacuationRouteModalProps> = ({
  location,
  dataset,
  simulationResult,
  onClose,
  onLocateRouteOnMap,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('evac-route-primary');
  const [closureThreshold, setClosureThreshold] = useState<number>(0.25); // Default 25cm

  // Dynamically compute flood-aware evacuation routes using the road network and active flood depth simulation
  const routes = calculateFloodAwareEvacuationRoutes(dataset, simulationResult, closureThreshold);
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const totalRoads = dataset.roads.features.length;
  const blockedCount = dataset.roads.features.filter((r) => {
    const depth = simulationResult.affectedRoads.find((ar) => ar.id === r.properties.id)?.depth_m || 0;
    return depth > closureThreshold;
  }).length;
  const passableCount = totalRoads - blockedCount;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="relative z-10 bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] text-slate-800 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Flood-Aware Evacuation Route & Life-Safety Planner
              </h3>
              <p className="text-[11px] text-slate-500">
                {location.displayName} — Real road network matched against 2D simulated flood levels ({simulationResult.config.rainfallIntensity_mmh} mm/h)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Metric Ribbon */}
        <div className="p-3 bg-slate-100/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Mapped Roads</span>
            <span className="text-base font-bold text-slate-900">{totalRoads} Segments</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Passable Corridors</span>
            <span className="text-base font-bold text-emerald-600">{passableCount} Roads (&le;{Math.round(closureThreshold * 100)}cm)</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Impassable / Submerged</span>
            <span className="text-base font-bold text-red-600">{blockedCount} Roads (&gt;{Math.round(closureThreshold * 100)}cm)</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Refuge Destination</span>
            <span className="text-xs font-bold text-blue-700 truncate block mt-0.5">
              {activeRoute?.destinationName || 'Elevated Shelter'}
            </span>
          </div>
        </div>

        {/* Threshold Selection Ribbon */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold">Road Inundation Closure Threshold:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { val: 0.15, label: '15 cm (Pedestrians / Bikes)' },
              { val: 0.25, label: '25 cm (Ambulance / 4-Wheelers)' },
              { val: 0.45, label: '45 cm (Emergency Trucks / Tractors)' },
            ].map((th) => (
              <button
                key={th.val}
                onClick={() => setClosureThreshold(th.val)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  closureThreshold === th.val
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Corridor Selection Buttons */}
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            {routes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedRouteId(c.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedRouteId === c.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          {/* Active Route Overview Card */}
          {activeRoute && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{activeRoute.name}</h4>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    <strong>Origin:</strong> {activeRoute.originName} &rarr; <strong>Destination:</strong> {activeRoute.destinationName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      activeRoute.isPassable
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {activeRoute.clearanceStatus}
                  </span>
                  {onLocateRouteOnMap && (
                    <button
                      onClick={() => onLocateRouteOnMap(activeRoute)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Locate on Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Total Distance</span>
                  <span className="font-bold text-slate-800 font-mono">{activeRoute.totalDistance_m} m</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Walking Time</span>
                  <span className="font-bold text-blue-700 font-mono">~{activeRoute.estimatedWalkingMinutes} mins</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Submerged Length</span>
                  <span className="font-bold text-amber-700 font-mono">{activeRoute.submergedDistance_m} m</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Destination Elevation</span>
                  <span className="font-bold text-emerald-700 font-mono">+{activeRoute.destinationElevation_m}m AMSL</span>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Step-by-Step Life-Safety Routing Directives:
                </span>
                <ul className="space-y-1">
                  {activeRoute.instructions.map((inst, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safety Caveats */}
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
                <span className="font-bold text-[10px] uppercase tracking-wide flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Engineering Caveats & Operational Rules:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-900/80">
                  {activeRoute.safetyCaveats.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Road Segment Submergence Audit Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Village Road Corridors & Simulated Water Depth Status</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Road Name</th>
                    <th className="p-2.5">Type & Surface</th>
                    <th className="p-2.5">Elevation</th>
                    <th className="p-2.5">Modeled Water Depth</th>
                    <th className="p-2.5">Accessibility Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRoute?.segments.map((rd) => (
                    <tr key={rd.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-2 font-medium text-slate-900">{rd.name}</td>
                      <td className="p-2 text-slate-500">
                        {rd.roadType} ({rd.surface})
                      </td>
                      <td className="p-2 font-mono text-slate-700">{rd.elevation_m}m</td>
                      <td className="p-2 font-mono font-bold">
                        {rd.floodDepth_m > 0 ? (
                          <span className={rd.status === 'blocked' ? 'text-red-600' : 'text-amber-600'}>
                            {rd.floodDepth_m}m ({Math.round(rd.floodDepth_m * 100)} cm)
                          </span>
                        ) : (
                          <span className="text-emerald-600">Dry (0.0m)</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rd.status === 'blocked'
                              ? 'bg-red-100 text-red-800'
                              : rd.status === 'caution'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rd.status === 'blocked'
                            ? `Blocked (>${Math.round(closureThreshold * 100)}cm)`
                            : rd.status === 'caution'
                            ? 'Caution (Shallow)'
                            : 'Clear Access'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Road closure threshold currently set to &gt;{Math.round(closureThreshold * 100)}cm standing water.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Planner
          </button>
        </div>
      </div>
    </div>
  );
};
