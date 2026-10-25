import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Compass,
  ArrowRight,
  TrendingDown,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileCheck,
  Building,
  Loader2,
  Shield,
  Navigation,
  Droplets,
  Activity,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { InfrastructureCandidateSite, LocationSearchResult } from '../../types/nationwide';
import type { MultiHazardSummary } from '../../types/hazard';
import type { SimulationResult } from '../../types/village';
import type { RoutePlanningResult } from '../../types/navigation';
import type { CwcRiverGaugeStation } from '../../types/flood';
import type { WeatherData } from '../../types/weather';
import {
  PlanningObjective,
  PlanSafeStatus,
  PLANNING_OBJECTIVES,
  PlanSafeReport,
  PlanSafeCandidateSite,
  runPlanSafeWorkflow,
} from '../../services/planSafeInstructionsService';

interface CandidateInfrastructureModalProps {
  location: LocationSearchResult;
  candidates?: InfrastructureCandidateSite[];
  multiHazardSummary: MultiHazardSummary;
  activeHazard?: string;
  simulationResult?: SimulationResult | null;
  navigationResult?: RoutePlanningResult | null;
  cwcGauges?: CwcRiverGaugeStation[] | null;
  weatherData?: WeatherData | null;
  onCandidatesUpdated?: (newCandidates: InfrastructureCandidateSite[]) => void;
  onLocateCandidate: (candidate: InfrastructureCandidateSite) => void;
  onClose: () => void;
  onOpenAiAppraisal: () => void;
}

export const CandidateInfrastructureModal: React.FC<CandidateInfrastructureModalProps> = ({
  location,
  candidates: initialCandidates = [],
  multiHazardSummary,
  activeHazard = 'Floods & Waterlogging',
  simulationResult,
  navigationResult,
  cwcGauges,
  weatherData,
  onCandidatesUpdated,
  onLocateCandidate,
  onClose,
  onOpenAiAppraisal,
}) => {
  const [selectedObjective, setSelectedObjective] = useState<PlanningObjective>('flood_shelter');
  const [report, setReport] = useState<PlanSafeReport | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [showDataAudit, setShowDataAudit] = useState<boolean>(false);
  const [showLimitations, setShowLimitations] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically execute the Plan Safe workflow on mount or when objective changes
  useEffect(() => {
    executeWorkflow(selectedObjective);
  }, [location.id, selectedObjective]);

  const executeWorkflow = async (objective: PlanningObjective) => {
    setIsExecuting(true);
    setError(null);
    setProgressStage('Stage 1/5: Resolving village boundaries & cadastral extent...');

    try {
      // Step simulated progression for UX transparency
      await new Promise((r) => setTimeout(r, 120));
      setProgressStage('Stage 2/5: Ingesting elevation DEM, OSM road network & CWC telemetry...');
      await new Promise((r) => setTimeout(r, 150));
      setProgressStage('Stage 3/5: Evaluating objective-specific criteria & hydraulic clearances...');
      await new Promise((r) => setTimeout(r, 150));
      setProgressStage('Stage 4/5: Running critical safety checks & MCDA score normalization...');

      const result = await runPlanSafeWorkflow({
        location,
        objective,
        activeHazard,
        simulationResult,
        navigationResult,
        cwcGauges,
        weatherData,
      });

      setProgressStage('Stage 5/5: Compiling actionable report & field verification checklists...');
      await new Promise((r) => setTimeout(r, 100));

      setReport(result);
      if (result.candidates.length > 0) {
        setSelectedCandidateId(result.candidates[0].id);
      }

      // Propagate candidate markers to App & Map
      if (onCandidatesUpdated && result.candidates.length > 0) {
        onCandidatesUpdated(result.candidates);
      }
    } catch (err: any) {
      console.error('Plan Safe Workflow error:', err);
      setError(err.message || 'Failed to complete Plan Safe Instructions workflow.');
    } finally {
      setIsExecuting(false);
      setProgressStage('');
    }
  };

  const activeCandidate: PlanSafeCandidateSite | undefined =
    report?.candidates.find((c) => c.id === selectedCandidateId) || report?.candidates[0];

  const getStatusBadge = (status: PlanSafeStatus) => {
    switch (status) {
      case 'DATA VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            DATA VERIFIED
          </span>
        );
      case 'PRELIMINARY SCREENING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Info className="w-3 h-3 text-blue-600" />
            PRELIMINARY SCREENING
          </span>
        );
      case 'REQUIRES REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            REQUIRES REVIEW
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <X className="w-3 h-3 text-rose-600" />
            REJECTED
          </span>
        );
      case 'UNABLE TO ASSESS':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            UNABLE TO ASSESS
          </span>
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Plan Safe Instructions & Infrastructure Intelligence
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Settlement: <strong className="text-slate-800">{location.displayName}</strong> · District: {location.district}, {location.state} (~{location.elevation_m || 25}m AMSL)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Objective Selector Bar */}
        <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Objective:</span>
            
            <button
              onClick={() => setSelectedObjective('flood_shelter')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                selectedObjective === 'flood_shelter'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Flood Shelters</span>
            </button>

            <button
              onClick={() => setSelectedObjective('evacuation_route')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                selectedObjective === 'evacuation_route'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Evacuation Routes</span>
            </button>

            <button
              onClick={() => setSelectedObjective('drainage_management')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                selectedObjective === 'drainage_management'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>Drainage & Outfalls</span>
            </button>

            <button
              onClick={() => setSelectedObjective('health_resilience')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                selectedObjective === 'health_resilience'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Health Resilience</span>
            </button>

            <button
              onClick={() => setSelectedObjective('community_asset')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                selectedObjective === 'community_asset'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Community Assets</span>
            </button>
          </div>

          <button
            onClick={() => executeWorkflow(selectedObjective)}
            disabled={isExecuting}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors text-xs shrink-0"
          >
            {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Re-evaluate</span>
          </button>
        </div>

        {/* Progress Bar (Visible while evaluating) */}
        {isExecuting && (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-semibold text-blue-900 block">{progressStage}</span>
              <div className="w-full bg-blue-200 h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Executive Report Summary Banner */}
        {report && (
          <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Report Status:</span>
              {getStatusBadge(report.overallStatus)}
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">
                Objective: <strong>{report.objectiveMeta.title}</strong>
              </span>
              {report.criticalSafetyConstraintsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  {report.criticalSafetyConstraintsCount} Disqualified by Safety Constraints
                </span>
              )}
            </div>

            <button
              onClick={() => setShowDataAudit(!showDataAudit)}
              className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Data Sources Audit ({report.dataQualityChecks.length})</span>
              {showDataAudit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* Data Quality & Provenance Drawer (Collapsible) */}
        {showDataAudit && report && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs overflow-x-auto animate-in slide-in-from-top-2 duration-150">
            <div className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Data Provenance, Sensor Freshness & Coverage Audit:</span>
              <span className="text-[10px] text-slate-500 font-normal">Retrieved: {new Date(report.generatedAt).toLocaleTimeString()}</span>
            </div>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2">Geospatial Layer</th>
                  <th className="py-1 px-2">Source Agency / Model</th>
                  <th className="py-1 px-2">Resolution / Detail</th>
                  <th className="py-1 px-2">Status</th>
                  <th className="py-1 pl-2">Coverage / Notes</th>
                </tr>
              </thead>
              <tbody>
                {report.dataQualityChecks.map((check, i) => (
                  <tr key={i} className="border-b border-slate-200/60 hover:bg-white">
                    <td className="py-1.5 pr-2 font-medium text-slate-800">{check.layer}</td>
                    <td className="py-1.5 px-2 text-slate-600">{check.source}</td>
                    <td className="py-1.5 px-2 font-mono text-slate-500">{check.resolutionOrDetail}</td>
                    <td className="py-1.5 px-2">{getStatusBadge(check.status)}</td>
                    <td className="py-1.5 pl-2 text-slate-500 max-w-xs truncate">{check.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => executeWorkflow(selectedObjective)}
              className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold hover:bg-rose-700 cursor-pointer text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content Area: Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden text-xs">
          
          {/* Left Column: Ranked Candidate Sites */}
          <div className="w-full md:w-80 border-r border-slate-200 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Ranked Candidates ({report?.candidates.length || 0})
              </span>
              <span className="text-[10px] text-slate-400">Sorted by MCDA</span>
            </div>

            {report?.candidates.map((c) => {
              const isSelected = activeCandidate?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCandidateId(c.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : c.isDisqualified
                      ? 'bg-rose-50 text-slate-800 border-rose-200 hover:border-rose-300'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      Rank #{c.rank}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        isSelected ? 'text-white' : c.isDisqualified ? 'text-rose-700' : 'text-blue-700'
                      }`}
                    >
                      {c.suitabilityScore}/100 Score
                    </span>
                  </div>

                  <div className="font-bold text-xs truncate">{c.title}</div>
                  
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/50">
                    <span className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {c.infrastructureType}
                    </span>
                    <span className="text-[10px]">
                      {c.isDisqualified ? (
                        <span className="font-bold text-rose-600 bg-rose-100/80 px-1 py-0.2 rounded">DISQUALIFIED</span>
                      ) : (
                        <span className={`font-semibold ${isSelected ? 'text-white' : 'text-emerald-700'}`}>₹{c.estimatedCostLakhs} L</span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}

            {(!report || report.candidates.length === 0) && !isExecuting && (
              <div className="p-4 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                <Compass className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <span className="font-semibold block">No Candidates Feasible</span>
                <span className="text-[10px]">Try switching objectives or running a hydrodynamic simulation.</span>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Candidate Appraisal & Directives */}
          {activeCandidate && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              
              {/* Critical Safety Alert Banner (if Disqualified) */}
              {activeCandidate.isDisqualified && (
                <div className="p-3.5 bg-rose-50 border-l-4 border-rose-600 rounded-r-xl text-rose-950 space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Critical Safety Failure Override</span>
                  </div>
                  <p className="text-xs font-semibold text-rose-800">
                    {activeCandidate.disqualifyingReason}
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1">
                    <strong>NDMA Safety Mandate:</strong> A high mathematical score cannot override a life-safety failure. This candidate is marked <strong>REJECTED</strong> and must not be prioritized for implementation without major structural mitigation.
                  </p>
                </div>
              )}

              {/* Candidate Title & Key Stats Header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      Rank #{activeCandidate.rank} Candidate
                    </span>
                    {getStatusBadge(activeCandidate.evaluationStatus)}
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    Coords: {activeCandidate.candidateCoordinates[1]}°N, {activeCandidate.candidateCoordinates[0]}°E
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{activeCandidate.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{activeCandidate.justification}</p>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Ground Elevation</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {activeCandidate.elevation_m}m AMSL
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Est. Capital Outlay</span>
                    <span className="font-bold text-blue-700 text-xs">
                      ₹{activeCandidate.estimatedCostLakhs} Lakhs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Beneficiaries</span>
                    <span className="font-bold text-emerald-700 text-xs">
                      {activeCandidate.expectedBeneficiaries.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Source-Derived Measurements Table */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Source-Derived Physical Measurements</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(activeCandidate.measurements).map(([key, m]) => (
                    <div key={key} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">{m.name}</span>
                      <div className="font-bold text-slate-900 text-xs mt-0.5">
                        {m.value} {m.unit}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 italic">Source: {m.source}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transparent Multi-Criteria Ranking Formula & Weight Breakdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>MCDA Objective-Specific Criteria & Weights</span>
                  </h4>
                  <span className="font-bold text-blue-700 text-xs font-mono">
                    Total: {activeCandidate.suitabilityScore} / 100
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeCandidate.criteriaEvaluations.map((c) => (
                    <div key={c.id}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="font-medium text-slate-700">
                          {c.name} ({(c.weight * 100).toFixed(0)}% weight)
                        </span>
                        <span className="font-bold font-mono text-slate-900">
                          {c.normalizedScore} / 100 (Weighted: +{c.weightedScore})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${c.normalizedScore}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block italic">{c.rationale}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-[10px] font-mono text-slate-600">
                  <strong>Ranking Formula:</strong> {activeCandidate.rankingFormula}
                </div>
              </div>

              {/* Critical Safety Constraints Audit */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Critical Safety Constraint Verifications</span>
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  {activeCandidate.safetyChecks.map((sc, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg border flex items-start justify-between gap-2 ${
                        sc.passed
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        {sc.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold">{sc.name}</span>
                          <span className="block text-[10px] text-slate-500">{sc.evidence}</span>
                          {sc.actionRequired && (
                            <span className="block text-[10px] font-bold text-rose-700 mt-0.5">
                              Action Required: {sc.actionRequired}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${sc.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {sc.passed ? 'PASSED' : 'VIOLATION'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mandated Field Surveys & Next Actions */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950">
                <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Mandated Pre-Tender Field Verification Surveys</span>
                </h4>
                <ul className="space-y-1 text-amber-900/90 text-[11px]">
                  {activeCandidate.fieldVerificationNeeded.map((fv, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{fv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                <button
                  onClick={() => {
                    onLocateCandidate(activeCandidate);
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>Locate Candidate on Map</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenAiAppraisal();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Generate Full AI Appraisal Brief</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Compact Important Limitations Section (Mandated Disclaimer) */}
        <div className="px-5 py-2 bg-amber-50/70 border-t border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Important limitations:</strong> Heuristic screening estimates based on Copernicus 30m Global DEM & OSM proximity. Field cadastral ground-truthing and geotechnical boreholes required before civil tender.
            </span>
          </div>
          <button
            onClick={() => setShowLimitations(!showLimitations)}
            className="text-amber-800 hover:text-amber-950 font-bold text-[10px] shrink-0 cursor-pointer ml-2"
          >
            {showLimitations ? 'Less' : 'Details'}
          </button>
        </div>

        {showLimitations && (
          <div className="px-5 py-2 bg-amber-50/90 border-t border-amber-200/80 text-[10px] text-amber-900 space-y-1">
            <p>• Satellite DEM resolution (30m) does not resolve micro-ditches or building plinth details.</p>
            <p>• OpenStreetMap indicates road geometry only; does not establish legal Right-of-Way (RoW) or PWD ownership.</p>
            <p>• Official High Flood Level (HFL) bench-marks must be confirmed with the local Executive Engineer (Irrigation/Water Resources).</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>NDMA National Disaster Management Guidelines compliant spatial decision support</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-medium cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
