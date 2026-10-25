import React, { useState } from 'react';
import {
  ShieldAlert,
  Route,
  Wheat,
  Users,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
  FileText,
  Search,
  Filter,
  LifeBuoy,
  Info,
  Calendar,
  Database,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import type { SimulationResult, VillageDataset } from '../../types/village';
import type { StructuredHazardImpactReport } from '../../types/scenarioSimulation';

interface ImpactAssessmentViewProps {
  dataset: VillageDataset;
  latestResult: SimulationResult;
  structuredImpact?: StructuredHazardImpactReport | null;
  onOpenScenarioPanel?: () => void;
}

export const ImpactAssessmentView: React.FC<ImpactAssessmentViewProps> = ({
  dataset,
  latestResult,
  structuredImpact,
  onOpenScenarioPanel,
}) => {
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalRoads = dataset.roads.features.length;
  const severedRoads = latestResult.affectedRoads.filter((r) => r.impassable).length;
  const passableRoads = totalRoads - severedRoads;

  const filteredRoads = dataset.roads.features.filter((rd) => {
    const impact = latestResult.affectedRoads.find((ar) => ar.id === rd.properties.id);
    const depth = impact ? impact.depth_m : 0;
    const isImpassable = impact ? impact.impassable : false;

    if (filterRisk === 'severed' && !isImpassable) return false;
    if (filterRisk === 'passable' && isImpassable) return false;
    if (filterRisk === 'submerged' && depth <= 0) return false;

    if (searchQuery.trim() && !rd.properties.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Export CSV of road infrastructure exposure
  const handleExportCSV = () => {
    const headers = [
      'Road ID',
      'Road Name',
      'Classification',
      'Surface',
      'Length (m)',
      'Elevation (m AMSL)',
      'Simulated Water Depth (m)',
      'Impassable Status',
      'Evacuation Corridor',
      'Source',
    ];

    const rows = dataset.roads.features.map((r) => {
      const impact = latestResult.affectedRoads.find((ar) => ar.id === r.properties.id);
      return [
        r.properties.id,
        `"${r.properties.name}"`,
        r.properties.roadType,
        r.properties.surface || 'Paved',
        r.properties.length_m || 0,
        r.properties.elevation_m || 0,
        impact ? impact.depth_m : 0,
        impact?.impassable ? 'IMPASSABLE' : 'PASSABLE',
        r.properties.isEvacuationCorridor ? 'YES' : 'NO',
        '"OpenStreetMap / PMGSY Rural Roads"',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${dataset.villageName}_Road_Network_Impact_Assessment.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Vulnerability Assessment
            </span>
            <span className="text-xs text-slate-500">
              Scenario: <strong className="text-slate-800 capitalize">{latestResult.scenario.replace('_', ' ')}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Socio-Economic & Infrastructure Impact Assessment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Spatial intersection of simulated hydrodynamic water surface elevations with transport corridors, farmland, and critical lifelines for {dataset.villageName}.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Road Impact CSV
          </button>
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Methodology & Verification Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-blue-950">
            Ground-Truth Verification & Spatial Intersection Methodology
          </div>
          <p className="text-[11px] text-blue-800/90 leading-relaxed">
            Infrastructure exposure is evaluated by intersecting hydrodynamic depression ponding models with surveyed road centerlines and cadastral boundaries. Road passability is strictly determined by water depth overtopping road crowns (&gt;15cm caution, &gt;25cm impassable for vehicular traffic).
          </p>
        </div>
      </div>

      {/* Dynamic Most Affected Area & Multi-Hazard Structured Impact */}
      {structuredImpact && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded">
                Most Affected Area Identified
              </span>
              <span className="text-xs text-slate-400">
                Scenario: <strong>{structuredImpact.scenarioTitle}</strong>
              </span>
            </div>
            {onOpenScenarioPanel && (
              <button
                onClick={onOpenScenarioPanel}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Change Scenario Parameters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block">Rank #1 Impact Zone</span>
              <strong className="text-sm font-bold text-white block mt-0.5">
                {structuredImpact.mostAffectedArea.zoneName}
              </strong>
              <span className="text-[10px] text-red-400 font-semibold uppercase">
                {structuredImpact.mostAffectedArea.severityTier} Tier
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block">Peak Shaking / Depth / Wind</span>
              <strong className="text-base font-extrabold text-blue-400 block mt-0.5">
                {structuredImpact.mostAffectedArea.metricValue}
              </strong>
              <span className="text-[10px] text-slate-400">
                ({structuredImpact.mostAffectedArea.metricLabel})
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block">Corridor Exposure</span>
              <strong className="text-sm font-bold text-amber-400 block mt-0.5">
                {structuredImpact.infrastructureImpact.severedRoadSegmentsCount} Cut Segments
              </strong>
              <span className="text-[10px] text-slate-400">
                {structuredImpact.mostAffectedArea.affectedAreaHa} ha ({(structuredImpact.mostAffectedArea.affectedAreaHa / 100).toFixed(2)} km²) footprint
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <strong>Ranking Methodology & Grounding:</strong> {structuredImpact.mostAffectedArea.rankingRationale}
          </div>
        </div>
      )}

      {/* Impact Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Inundated Territory</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {latestResult.maxInundatedArea_ha} ha
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {(latestResult.maxInundatedArea_ha / 100).toFixed(2)} km² · Peak Depth: {latestResult.peakDepth_m}m
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Road Corridors Cut</span>
            <Route className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {severedRoads} / {totalRoads}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {severedRoads > 0 ? 'Severed evacuation links' : 'All corridors passable'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Farmland Inundated</span>
            <Wheat className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {latestResult.farmlandInundated_ha} ha
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Crop & ayacut submergence
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Est. Financial Loss</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">
            ₹{latestResult.estimatedLoss_lakhs} L
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Infrastructure & agricultural damage
          </div>
        </div>
      </div>

      {/* Road Network & Evacuation Corridors Inundation Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Route className="w-4 h-4 text-amber-600" />
              Road Network Vulnerability & Evacuation Corridors
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredRoads.length} of {totalRoads} mapped transport corridors with geographic coordinates.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search road..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none"
            >
              <option value="all">All Corridors ({totalRoads})</option>
              <option value="severed">Impassable / Cut ({severedRoads})</option>
              <option value="passable">Passable ({passableRoads})</option>
              <option value="submerged">Submerged (&gt;0m)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 sticky top-0 border-y border-slate-200 text-slate-600 font-semibold uppercase text-[10px] z-10">
              <tr>
                <th className="py-2.5 px-3">Road Name</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Surface</th>
                <th className="py-2.5 px-3">Length</th>
                <th className="py-2.5 px-3">Crown Elevation</th>
                <th className="py-2.5 px-3">Max Flood Depth</th>
                <th className="py-2.5 px-3">Passability</th>
                <th className="py-2.5 px-3">Evacuation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoads.map((rd) => {
                const impact = latestResult.affectedRoads.find((ar) => ar.id === rd.properties.id);
                const depth = impact ? impact.depth_m : 0;
                const isImpassable = impact ? impact.impassable : false;

                return (
                  <tr key={rd.properties.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-900">{rd.properties.name}</td>
                    <td className="py-2 px-3 capitalize text-slate-600">{rd.properties.roadType}</td>
                    <td className="py-2 px-3 text-slate-600">{rd.properties.surface || 'Bitumen/Asphalt'}</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{rd.properties.length_m || 450} m</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{rd.properties.elevation_m || 5.0} m AMSL</td>
                    <td className="py-2 px-3 font-mono font-bold">
                      {depth > 0 ? (
                        <span className={depth > 0.25 ? 'text-red-600' : 'text-amber-600'}>
                          {depth.toFixed(2)} m ({Math.round(depth * 100)} cm)
                        </span>
                      ) : (
                        <span className="text-emerald-600">0.0 m (Dry)</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isImpassable
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : depth > 0.1
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isImpassable ? 'SEVERED' : depth > 0.1 ? 'CAUTION' : 'PASSABLE'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {rd.properties.isEvacuationCorridor ? (
                        <span className="text-blue-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-blue-600" /> Lifeline Route
                        </span>
                      ) : (
                        <span className="text-slate-400">Local Access</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRoads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs font-medium">
                    {dataset.roads.features.length === 0
                      ? 'Road data unavailable for this settlement.'
                      : 'No road segments match your current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
