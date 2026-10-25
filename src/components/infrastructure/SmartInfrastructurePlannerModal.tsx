import React from 'react';
import {
  Wrench,
  X,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  Users,
  Compass,
  Building,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { InfrastructureIntervention, InfrastructurePlanSummary } from '../../types/infrastructure';
import { calculateInfrastructureSummary } from '../../services/infrastructureService';

interface SmartInfrastructurePlannerModalProps {
  interventions: InfrastructureIntervention[];
  villagePopulation?: number;
  onToggleIntervention: (id: string) => void;
  onLocateIntervention: (intervention: InfrastructureIntervention) => void;
  onClose: () => void;
  onOpenAiAdvisory: () => void;
}

export const SmartInfrastructurePlannerModal: React.FC<SmartInfrastructurePlannerModalProps> = ({
  interventions,
  villagePopulation,
  onToggleIntervention,
  onLocateIntervention,
  onClose,
  onOpenAiAdvisory,
}) => {
  const summary: InfrastructurePlanSummary = calculateInfrastructureSummary(interventions, villagePopulation);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Smart Infrastructure Planning & Mitigation Catalog
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-hazard resilient engineering interventions, cost-benefit appraisal, and scheme convergence
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metric Ribbon */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100/70 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Selected Outlay</span>
            <div className="text-base sm:text-lg font-bold text-slate-900">
              ₹{summary.selectedBudgetLakhs} L
              <span className="text-xs font-normal text-slate-400 ml-1">/ ₹{summary.totalBudgetLakhs} L</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {summary.activeInterventionsCount} of {summary.totalInterventionsCount} measures enabled
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Protected Population</span>
            <div className="text-base sm:text-lg font-bold text-blue-600">
              {summary.netProtectedPopulation.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">
              {villagePopulation && villagePopulation > 0
                ? `~${Math.min(100, Math.round((summary.netProtectedPopulation / villagePopulation) * 100))}% of village secured`
                : 'Projected direct beneficiary coverage'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Risk Reduction Index</span>
            <div className="text-base sm:text-lg font-bold text-emerald-600">
              -{summary.compositeRiskReductionPercent}%
            </div>
            <span className="text-[10px] text-slate-500">Average hazard mitigation</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Benefit-Cost Ratio (BCR)</span>
            <div className="text-base sm:text-lg font-bold text-purple-600">
              {summary.averageBCR}:1
            </div>
            <span className="text-[10px] text-slate-500">High economic viability</span>
          </div>
        </div>

        {/* Interventions List */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
          {interventions.map((item) => {
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.isEnabled
                    ? 'bg-blue-50/20 border-blue-200/80 shadow-xs'
                    : 'bg-slate-50/50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.isEnabled}
                      onChange={() => onToggleIntervention(item.id)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          BCR: {item.benefitCostRatio}:1
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 text-xs">{item.description}</p>
                      
                      {/* Technical Specs Strip */}
                      <div className="mt-2 text-[11px] bg-white p-2 rounded-lg border border-slate-200/70 text-slate-600">
                        <span className="font-semibold text-slate-800">Engineering Specs: </span>
                        <span>{item.technicalSpecs}</span>
                      </div>

                      {/* Metadata tags */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                        <span>Lead Agency: <strong className="text-slate-700">{item.leadAgency}</strong></span>
                        <span>·</span>
                        <span>Design Lifespan: <strong className="text-slate-700">{item.lifespanYears} Years</strong></span>
                        <span>·</span>
                        <span>Execution: <strong className="text-slate-700">{item.timelineMonths} Months</strong></span>
                        <span>·</span>
                        <span>Mitigates: <strong className="text-blue-700">{item.hazardsMitigated.join(', ')}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">₹{item.estimatedCostLakhs} L</div>
                    <div className="text-[11px] text-emerald-700 font-medium">-{item.riskReductionPercent}% Risk</div>
                    <div className="text-[10px] text-slate-500">{item.populationProtected.toLocaleString()} protected</div>
                    <button
                      onClick={() => {
                        onLocateIntervention(item);
                        onClose();
                      }}
                      className="mt-2 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer ml-auto"
                    >
                      <Compass className="w-3 h-3 text-blue-600" />
                      <span>Locate</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80">
          <div className="text-[11px] text-slate-500">
            Compliant with SDRF & 15th Finance Commission Disaster Risk Reduction guidelines
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onOpenAiAdvisory();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Generate AI Infrastructure Appraisal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
