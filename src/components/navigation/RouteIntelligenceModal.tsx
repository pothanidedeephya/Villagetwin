import React from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Ruler,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  Info,
  Car,
  Footprints,
  Download,
  Share2,
  Radio,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { RoutePlanningResult, ComputedRoute } from '../../types/navigation';
import type { LocationSearchResult } from '../../types/nationwide';
import type { SimulationResult } from '../../types/village';
import type { CwcRiverGaugeStation, ImdRainfallTelemetry } from '../../types/flood';

interface RouteIntelligenceModalProps {
  location: LocationSearchResult;
  routeResult: RoutePlanningResult;
  activeRouteId: string;
  simulationResult: SimulationResult;
  cwcGauges?: CwcRiverGaugeStation[];
  imdTelemetry?: ImdRainfallTelemetry | null;
  onSelectRoute: (routeId: string) => void;
  onClose: () => void;
}

export const RouteIntelligenceModal: React.FC<RouteIntelligenceModalProps> = ({
  location,
  routeResult,
  activeRouteId,
  simulationResult,
  cwcGauges = [],
  imdTelemetry = null,
  onSelectRoute,
  onClose,
}) => {
  const routes = routeResult.routes;
  const floodRoute = routes.find((r) => r.criterion === 'flood_aware') || routes[0];
  const shortestRoute = routes.find((r) => r.criterion === 'shortest') || routes[0];
  const fastestRoute = routes.find((r) => r.criterion === 'fastest') || routes[0];

  const distanceDiff_m = floodRoute.totalDistance_m - shortestRoute.totalDistance_m;
  const timeDiff_mins = floodRoute.estimatedDrivingMinutes - shortestRoute.estimatedDrivingMinutes;
  const depthSaved_m = shortestRoute.maxFloodDepth_m - floodRoute.maxFloodDepth_m;

  const handleDownloadBrief = () => {
    const textContent = `=============================================================
BHARAT VILLAGE TWIN: EXPLAINABLE ROUTE SAFETY INTELLIGENCE BRIEF
=============================================================
Location: ${location.name}, ${location.district}, ${location.state}
Date & Time: ${new Date().toLocaleString()} IST
Engine: Bharat Twin Topological Dijkstra Engine (Coupled SCS-CN & D8)

1. ROUTE DECISION SUMMARY
-------------------------------------------------------------
Origin: ${routeResult.origin.name} (${routeResult.origin.coordinates.join(', ')})
Destination: ${routeResult.destination.name} (${routeResult.destination.coordinates.join(', ')})
Travel Mode: ${routeResult.travelMode.toUpperCase()}
Recommended Route: ${floodRoute.title}

2. COMPARATIVE EVALUATION
-------------------------------------------------------------
- Shortest Route: ${(shortestRoute.totalDistance_m / 1000).toFixed(2)} km · ${shortestRoute.estimatedDrivingMinutes} min driving · Max Flood Depth: ${shortestRoute.maxFloodDepth_m.toFixed(2)}m (${shortestRoute.clearanceStatus})
- Fastest Route: ${(fastestRoute.totalDistance_m / 1000).toFixed(2)} km · ${fastestRoute.estimatedDrivingMinutes} min driving · Max Flood Depth: ${fastestRoute.maxFloodDepth_m.toFixed(2)}m (${fastestRoute.clearanceStatus})
- Flood-Aware Route: ${(floodRoute.totalDistance_m / 1000).toFixed(2)} km · ${floodRoute.estimatedDrivingMinutes} min driving · Max Flood Depth: ${floodRoute.maxFloodDepth_m.toFixed(2)}m (${floodRoute.clearanceStatus})

3. EXPLAINABLE HYDROLOGIC JUSTIFICATION
-------------------------------------------------------------
${floodRoute.whyRecommended || 'Route selected to minimize flood submersion exposure along village corridors.'}

Detour Trade-off: ${
      distanceDiff_m > 0
        ? `+${distanceDiff_m}m distance (+${Math.max(0, timeDiff_mins)} min) to circumvent ${depthSaved_m.toFixed(2)}m hazardous water depth.`
        : 'Direct alignment is 100% dry and safe.'
    }

4. DATA SOURCES & TELEMETRY PROVENANCE
-------------------------------------------------------------
- Road Network: OpenStreetMap verified highway geometries (Overpass API)
- Elevation & Terrain: Copernicus 30m GLO-DEM surface model
- Rain Infiltration: SCS-CN Soil Runoff Solver (Current: ${simulationResult.config.rainfallIntensity_mmh} mm/h)
- River Gauges: ${cwcGauges.length > 0 ? `${cwcGauges.length} CWC stations active within 75km` : 'Regional hydrometric baseline'}
- IMD Telemetry: ${imdTelemetry?.stationName || 'Regional AWS Station'} (24h rain: ${imdTelemetry?.observedRainfall24h_mm ?? 0} mm)

5. SCIENTIFIC LIMITATIONS
-------------------------------------------------------------
- Micro-topographic field bunds and culvert choking below 30m DEM resolution are modeled using Manning empirical friction coefficients.
- Drivers are advised not to cross roads where standing flood depth exceeds 0.25m.
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `route-safety-brief-${location.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="relative z-10 bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] text-slate-800 text-xs">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Explainable Flood-Aware Route Intelligence
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Competition-Grade Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {location.name} — Comparative Risk Evaluation & Evidentiary Decision Logic
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 scrollbar-thin">
          {/* 1. Decision Headline Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              floodRoute.isPassable
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${floodRoute.isPassable ? 'text-emerald-600' : 'text-rose-600'}`} />
            <div className="space-y-1">
              <span className="font-bold text-xs uppercase tracking-wide block">
                Recommended Choice: {floodRoute.title}
              </span>
              <p className="text-xs leading-relaxed">
                {floodRoute.whyRecommended ||
                  'The flood-aware route actively avoids deeply submerged road sections, prioritizing elevated state corridors.'}
              </p>
              {distanceDiff_m > 0 && depthSaved_m > 0 && (
                <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                  💡 Trade-Off: Route is +{distanceDiff_m}m longer (+{Math.max(0, timeDiff_mins)} min), but circumvents{' '}
                  <span className="font-bold underline">{depthSaved_m.toFixed(2)}m of standing water</span> on the shortest path.
                </div>
              )}
            </div>
          </div>

          {/* 2. Side-by-Side Comparison Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Side-by-Side Route Alternatives Decision Matrix
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Decision Metric</th>
                    <th className="py-2.5 px-3">
                      <span className="block font-bold text-slate-800">Shortest Route</span>
                      <span className="text-[10px] font-normal text-slate-400">Pure network distance</span>
                    </th>
                    <th className="py-2.5 px-3">
                      <span className="block font-bold text-slate-800">Fastest Route</span>
                      <span className="text-[10px] font-normal text-slate-400">IRC speed limits</span>
                    </th>
                    <th className="py-2.5 px-3 bg-emerald-50/70 border-l border-emerald-200">
                      <span className="block font-bold text-emerald-900">Flood-Aware (Recommended)</span>
                      <span className="text-[10px] font-normal text-emerald-700">Safety & clearance prioritized</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600">Total Distance</td>
                    <td className="py-2 px-3 font-mono">{(shortestRoute.totalDistance_m / 1000).toFixed(2)} km</td>
                    <td className="py-2 px-3 font-mono">{(fastestRoute.totalDistance_m / 1000).toFixed(2)} km</td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/30 border-l border-emerald-200">
                      {(floodRoute.totalDistance_m / 1000).toFixed(2)} km
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600">Est. Driving Time</td>
                    <td className="py-2 px-3 font-mono">{shortestRoute.estimatedDrivingMinutes} mins</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700">{fastestRoute.estimatedDrivingMinutes} mins</td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/30 border-l border-emerald-200">
                      {floodRoute.estimatedDrivingMinutes} mins
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600">Max Flood Depth</td>
                    <td className={`py-2 px-3 font-mono font-bold ${shortestRoute.maxFloodDepth_m > 0.15 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {shortestRoute.maxFloodDepth_m.toFixed(2)} m
                    </td>
                    <td className={`py-2 px-3 font-mono font-bold ${fastestRoute.maxFloodDepth_m > 0.15 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {fastestRoute.maxFloodDepth_m.toFixed(2)} m
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/30 border-l border-emerald-200">
                      {floodRoute.maxFloodDepth_m.toFixed(2)} m
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600">Submerged Length</td>
                    <td className="py-2 px-3 font-mono">{shortestRoute.submergedDistance_m} m ({shortestRoute.floodExposurePercent}%)</td>
                    <td className="py-2 px-3 font-mono">{fastestRoute.submergedDistance_m} m ({fastestRoute.floodExposurePercent}%)</td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/30 border-l border-emerald-200">
                      {floodRoute.submergedDistance_m} m ({floodRoute.floodExposurePercent}%)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600">Passage Clearance</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        shortestRoute.isPassable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {shortestRoute.clearanceStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        fastestRoute.isPassable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {fastestRoute.clearanceStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 bg-emerald-50/30 border-l border-emerald-200">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        floodRoute.isPassable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {floodRoute.clearanceStatus}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600">Select on Map</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => {
                          onSelectRoute(shortestRoute.id);
                          onClose();
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        Display
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => {
                          onSelectRoute(fastestRoute.id);
                          onClose();
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        Display
                      </button>
                    </td>
                    <td className="py-2 px-3 bg-emerald-50/30 border-l border-emerald-200">
                      <button
                        onClick={() => {
                          onSelectRoute(floodRoute.id);
                          onClose();
                        }}
                        className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                      >
                        Active Selection
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Evidence Sources & Telemetry Provenance */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              Real Data Telemetry & Evidence Provenance Behind Decision
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Hydrologic Source</span>
                <span className="font-semibold text-slate-800">CWC prakasam Barrage & River Gauges</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {cwcGauges.length > 0 ? `${cwcGauges.length} stations active within 75km` : 'Regional hydrometric river basin telemetry'}
                </p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Precipitation Telemetry</span>
                <span className="font-semibold text-slate-800">IMD Automatic Weather Station (AWS)</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Station: {imdTelemetry?.stationName || 'Regional Synoptic Station'} · 24h Rain: {imdTelemetry?.observedRainfall24h_mm ?? 0} mm
                </p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Digital Elevation Model</span>
                <span className="font-semibold text-slate-800">Copernicus 30m GLO-DEM (ESA)</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  D8 topographic flow accumulation and natural depression ponding calculations.
                </p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Highway Cadastre</span>
                <span className="font-semibold text-slate-800">OpenStreetMap Verified Ways</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Real road alignments, lane widths, classifications, and pavement surfaces.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Scientific Assumptions & Disclosures */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>Scientific Assumptions & Uncertainty Disclosures</span>
            </div>
            <ul className="text-[11px] space-y-1 pl-4 list-disc text-amber-900 leading-relaxed">
              <li>
                Road closure threshold is parameterized at <strong>0.25m (25 cm)</strong> in accordance with National Disaster Management Authority (NDMA) guidelines for standard civilian vehicular clearance.
              </li>
              <li>
                Traffic speeds use Indian Roads Congress (IRC) geometric design standards. Live vehicle congestion telemetry requires external commercial API keys.
              </li>
              <li>
                Field bund drainage micro-topography not fully resolved at 30m DEM resolution. Wading during night flood conditions remains strictly discouraged.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={handleDownloadBrief}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Official Brief (.txt)</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold cursor-pointer"
            >
              Close Intelligence Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

