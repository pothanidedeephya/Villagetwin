import React from 'react';
import {
  X,
  Printer,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Building2,
  Users,
  Route,
  Database,
  Calendar,
  Layers,
  Compass,
} from 'lucide-react';
import type { StructuredHazardImpactReport } from '../../types/scenarioSimulation';

interface StructuredImpactReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: StructuredHazardImpactReport | null;
  onFocusZone?: (coords: [number, number]) => void;
}

export const StructuredImpactReportModal: React.FC<StructuredImpactReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onFocusZone,
}) => {
  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${report.locationName}_${report.hazardType}_Impact_Report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                SIMULATED SCENARIO REPORT
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Model: {report.modelVersion} · {new Date(report.calculatedAt).toLocaleTimeString()}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{report.scenarioTitle}</span>
              <span className="text-slate-400 font-normal">· {report.locationName}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download structured JSON report"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm">
          
          {/* Scientific Disclaimer Banner */}
          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <strong className="block text-amber-950 font-bold">Authoritative Grounding Notice</strong>
              <p className="text-[11px] text-amber-900/90">{report.isHypotheticalNotice}</p>
            </div>
          </div>

          {/* Section: Most Affected Area Highlight */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Dynamic Most Affected Area</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  report.mostAffectedArea.severityTier === 'extreme'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : report.mostAffectedArea.severityTier === 'high'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  Rank #{report.mostAffectedArea.severityRank} ({report.mostAffectedArea.severityTier})
                </span>
              </h3>
              {report.mostAffectedArea.canDistinguish && onFocusZone && (
                <button
                  onClick={() => {
                    onFocusZone(report.mostAffectedArea.centerCoordinates);
                    onClose();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Locate Zone on Map</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Identified Zone</span>
                <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                  {report.mostAffectedArea.zoneName}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Ranking Metric</span>
                <strong className="text-sm font-bold text-blue-700 block mt-0.5">
                  {report.mostAffectedArea.metricValue}
                </strong>
                <span className="text-[10px] text-slate-400">({report.mostAffectedArea.metricLabel})</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Affected Footprint</span>
                <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                  {report.mostAffectedArea.affectedAreaHa} ha
                </strong>
                <span className="text-[10px] text-slate-400">({report.mostAffectedArea.affectedAreaKm2} km²)</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
              <strong>Ranking Rationale:</strong> {report.mostAffectedArea.rankingRationale}
            </p>
          </div>

          {/* PILLAR A: GEOGRAPHIC IMPACT */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">A</span>
              <span>Geographic Impact</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Study Area Extent</span>
                <strong className="text-base font-bold text-slate-900">{report.geographicImpact.totalStudyAreaKm2} km²</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Modelled Affected Area</span>
                <strong className="text-base font-bold text-slate-900">{report.geographicImpact.estimatedAffectedAreaKm2} km²</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Territory Affected</span>
                <strong className="text-base font-bold text-blue-700">{report.geographicImpact.percentageAreaAffected}%</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Spatial Zones Count</span>
                <strong className="text-base font-bold text-slate-900">{report.geographicImpact.affectedZonesCount} Zones</strong>
              </div>
            </div>

            {report.geographicImpact.impactSeverityByZone.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5">Zone Name</th>
                      <th className="p-2.5">Severity Tier</th>
                      <th className="p-2.5">Area (km²)</th>
                      <th className="p-2.5">% of Affected</th>
                      <th className="p-2.5">Key Metric</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {report.geographicImpact.impactSeverityByZone.map((z) => (
                      <tr key={z.zoneId} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{z.zoneName}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              z.tier === 'extreme'
                                ? 'bg-red-100 text-red-800'
                                : z.tier === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {z.tier}
                          </span>
                        </td>
                        <td className="p-2.5">{z.areaKm2} km²</td>
                        <td className="p-2.5">{z.percentageOfAffected}%</td>
                        <td className="p-2.5 font-bold text-slate-700">{z.primaryMetric}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PILLAR B: BUILDINGS */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">B</span>
              <span>Buildings & Structural Exposure</span>
            </h3>

            {report.buildingImpact.dataStatus === 'unavailable_unmapped' ? (
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                    Building Footprints: DATA UNAVAILABLE / UNMAPPED
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {report.buildingImpact.notes}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Mapped Buildings</span>
                  <strong className="text-base font-bold text-slate-900">{report.buildingImpact.totalMappedBuildings}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">In Inundation Envelope</span>
                  <strong className="text-base font-bold text-red-700">{report.buildingImpact.buildingsInImpactZone}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Percentage Exposed</span>
                  <strong className="text-base font-bold text-red-700">{report.buildingImpact.percentageBuildingsExposed}%</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Unknown Typology</span>
                  <strong className="text-base font-bold text-slate-600">{report.buildingImpact.unknownStructuralVulnerabilityCount}</strong>
                </div>
              </div>
            )}
          </div>

          {/* PILLAR C: POPULATION */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">C</span>
              <span>Population Demographics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Study Population</span>
                <strong className="text-base font-bold text-slate-900">{report.populationImpact.totalStudyPopulation.toLocaleString()} residents</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Modelled Exposed Population</span>
                <strong className="text-base font-bold text-purple-700">
                  {report.populationImpact.estimatedExposedPopulation !== null
                    ? `~${report.populationImpact.estimatedExposedPopulation.toLocaleString()} residents`
                    : 'DATA UNAVAILABLE'}
                </strong>
                <span className="text-[10px] text-slate-400">
                  ({report.populationImpact.percentageExposed}% of settlement)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Census Data Provenance</span>
                <strong className="text-xs font-bold text-slate-800 block mt-0.5">{report.populationImpact.dataSource}</strong>
                <span className="text-[10px] text-slate-400">Ref: {report.populationImpact.referenceYear} ({report.populationImpact.resolution})</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              * Note: {report.populationImpact.methodologyNote}
            </p>
          </div>

          {/* PILLAR D: ROADS & INFRASTRUCTURE */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">D</span>
              <span>Roads & Evacuation Infrastructure</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Mapped Road Network</span>
                <strong className="text-base font-bold text-slate-900">{report.infrastructureImpact.totalRoadLengthKm} km</strong>
                <span className="text-[10px] text-slate-400">({report.infrastructureImpact.totalRoadsMapped} segments)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Intersecting Impact Zone</span>
                <strong className="text-base font-bold text-amber-700">{report.infrastructureImpact.intersectingRoadLengthKm} km</strong>
                <span className="text-[10px] text-slate-400">({report.infrastructureImpact.percentageRoadsExposed}%)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Impassable / Cut Corridors</span>
                <strong className="text-base font-bold text-rose-700">
                  {report.infrastructureImpact.severedRoadSegmentsCount} Corridors
                </strong>
                <span className="text-[10px] text-slate-400">(&gt;0.25m depth)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Evacuation Accessibility</span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                  report.infrastructureImpact.evacuationRouteAccessibility === 'fully_accessible'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {report.infrastructureImpact.evacuationRouteAccessibility.replace('_', ' ')}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              <strong>Evacuation Network Assessment:</strong> {report.infrastructureImpact.evacuationAccessibilityNote}
            </p>
          </div>

          {/* PILLAR E: UNCERTAINTY & DATA COVERAGE */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">E</span>
              <span>Model Assumptions & Uncertainty Coverage</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 text-xs block">Data Sources & Cadastral Feeds:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                  {report.uncertaintyAndCoverage.dataSources.map((ds, idx) => (
                    <li key={idx}>{ds}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 text-xs block">Documented Model Assumptions:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                  {report.uncertaintyAndCoverage.modelAssumptions.map((asmp, idx) => (
                    <li key={idx}>{asmp}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">Validation Status: {report.uncertaintyAndCoverage.validationStatus}</span>
              </div>
              <span className="font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-slate-300">
                Confidence: {report.uncertaintyAndCoverage.confidenceTier}
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-mono text-[11px]">
            Location ID: {report.locationId} · Scenario ID: {report.scenarioId}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
};

