import React, { useState } from 'react';
import {
  Thermometer,
  Droplets,
  Gauge,
  Wind,
  RotateCw,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Compass,
  Layers,
  Waves,
} from 'lucide-react';
import {
  type CycloneMode,
  type CycloneTrackStep,
} from '../../services/cycloneTrackingService';
import {
  type CycloneFormationAssessment,
  type FormationStage,
  CYCLONE_FORMATION_STAGES,
  evaluateCycloneFormationFactors,
  getCauseTrackImpactBreakdown,
} from '../../services/cycloneFormationService';
import type { LocationSearchResult } from '../../types/nationwide';

export interface CycloneCauseExplainerProps {
  mode: CycloneMode;
  currentStep?: CycloneTrackStep | null;
  currentLocation?: LocationSearchResult | null;
  activeStageIndex?: number;
  onSelectStageIndex?: (stageIdx: number) => void;
  compact?: boolean;
}

export const CycloneCauseExplainer: React.FC<CycloneCauseExplainerProps> = ({
  mode,
  currentStep,
  currentLocation,
  activeStageIndex = 3, // Defaults to Stage 4 (Vortex Intensification) if active storm
  onSelectStageIndex,
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<'causes' | 'lifecycle' | 'pillars'>('causes');
  const [showAdvancedScience, setShowAdvancedScience] = useState<boolean>(false);

  // Evaluate physical environmental factors
  const assessment: CycloneFormationAssessment = evaluateCycloneFormationFactors(
    mode,
    currentStep,
    null // live weather if provided
  );

  const selectedStage: FormationStage =
    CYCLONE_FORMATION_STAGES[activeStageIndex] || CYCLONE_FORMATION_STAGES[0];

  const breakdown = getCauseTrackImpactBreakdown(
    mode,
    currentStep,
    currentLocation,
    null
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'favourable':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'marginal':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'unfavourable':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'unavailable':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getFactorIcon = (id: string) => {
    switch (id) {
      case 'sst':
        return <Thermometer className="w-3.5 h-3.5 text-rose-600" />;
      case 'moisture':
        return <Droplets className="w-3.5 h-3.5 text-blue-600" />;
      case 'disturbance':
        return <Gauge className="w-3.5 h-3.5 text-purple-600" />;
      case 'wind_shear':
        return <Wind className="w-3.5 h-3.5 text-teal-600" />;
      case 'coriolis':
        return <RotateCw className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs text-slate-800">
      
      {/* 1. Explainer Header & Tab Selector */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <span className="text-base">🌪️</span>
            <span>Cyclone Science & Cause Explainer</span>
          </div>

          <span
            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
              mode === 'demo'
                ? 'bg-amber-100 text-amber-900 border-amber-400 font-mono'
                : 'bg-blue-100 text-blue-900 border-blue-300'
            }`}
          >
            {mode === 'demo' ? 'DEMO EXPLAINER' : 'OFFICIAL METEOROLOGY'}
          </span>
        </div>

        {/* Tab Selector Pills */}
        <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold text-center">
          <button
            type="button"
            onClick={() => setActiveTab('causes')}
            className={`py-1 px-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'causes'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Why It Forms
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lifecycle')}
            className={`py-1 px-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'lifecycle'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5-Stage Lifecycle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pillars')}
            className={`py-1 px-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'pillars'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cause vs Track vs Impact
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT */}
      <div className="p-3 space-y-3">
        
        {/* ================================================================= */}
        {/* TAB 1: ENVIRONMENTAL CAUSES (WHY CYCLONES FORM)                    */}
        {/* ================================================================= */}
        {activeTab === 'causes' && (
          <div className="space-y-2.5">
            {/* Overall Environmental Assessment Banner */}
            <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="font-bold text-slate-900 text-xs">Environmental Genesis Potential:</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {assessment.overallSuitability}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 mt-1 leading-snug">
                  {assessment.suitabilitySummary}
                </p>
              </div>
            </div>

            {/* List of 5 Environmental Factors */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Primary Thermodynamic & Dynamic Requirements
              </span>

              {assessment.factors.map((factor) => (
                <div
                  key={factor.id}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      {getFactorIcon(factor.id)}
                      <span>{factor.name}</span>
                    </div>

                    <span
                      className={`text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${getStatusBadge(
                        factor.status
                      )}`}
                    >
                      {factor.status === 'unavailable' ? 'Data Unavailable' : factor.status}
                    </span>
                  </div>

                  {/* Factor Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-white p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        {mode === 'demo' ? 'Modelled Value' : 'Measured Value'}
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {factor.measuredValue !== null
                          ? `${factor.measuredValue} ${factor.unit}`
                          : 'Data unavailable'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Favourable Threshold
                      </span>
                      <span className="font-semibold text-slate-700">
                        {factor.thresholdFavourable}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-600 leading-snug">
                    {factor.statusExplanation}
                  </p>

                  <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                    <span className="truncate max-w-[200px]">Source: {factor.source}</span>
                    {factor.timestamp && <span>{factor.timestamp.split('T')[0]}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Scientific disclaimer notice */}
            <div className="p-2 bg-slate-100 rounded-lg text-[10px] text-slate-600 leading-tight">
              <strong>Meteorological Notice:</strong> Cyclogenesis is probabilistic. The presence of favorable ocean and atmospheric conditions does not guarantee storm formation, nor does it predict the exact timing of development.
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: 5-STAGE FORMATION LIFECYCLE (STEPPER)                      */}
        {/* ================================================================= */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-600">
              Select a stage to explore how tropical disturbances develop into organized cyclonic storms:
            </div>

            {/* Stage Selector Pills (1 to 5) */}
            <div className="grid grid-cols-5 gap-1 text-center">
              {CYCLONE_FORMATION_STAGES.map((stg, idx) => {
                const isSelected = idx === activeStageIndex;
                return (
                  <button
                    key={stg.stageNumber}
                    type="button"
                    onClick={() => onSelectStageIndex?.(idx)}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm">{stg.illustrativeIcon}</span>
                    <span className="text-[10px] font-bold font-mono">Stage {stg.stageNumber}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Card */}
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>{selectedStage.illustrativeIcon}</span>
                    <span>{selectedStage.title}</span>
                  </h4>
                  <p className="text-[10.5px] text-blue-700 font-semibold mt-0.5">
                    {selectedStage.subtitle}
                  </p>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                  {selectedStage.stageNumber} of 5
                </span>
              </div>

              {/* Short explanation in English */}
              <p className="text-xs text-slate-800 leading-snug bg-white p-2.5 rounded-lg border border-slate-200">
                {selectedStage.shortExplanation}
              </p>

              {/* Typical Meteorological Values */}
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Typical Pressure</span>
                  <span className="font-mono font-bold text-slate-900">{selectedStage.typicalPressureHpa}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Typical Winds</span>
                  <span className="font-mono font-bold text-slate-900">{selectedStage.typicalWindsKmh}</span>
                </div>
              </div>

              {/* Key Meteorological Factors */}
              <div>
                <span className="text-[9.5px] uppercase font-bold text-slate-500 block mb-1">
                  Key Physics in Play:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedStage.keyMeteoFactors.map((fact, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800 text-[10px] font-medium"
                    >
                      ✓ {fact}
                    </span>
                  ))}
                </div>
              </div>

              {/* Previous / Next Stepper Buttons */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                <button
                  type="button"
                  disabled={activeStageIndex <= 0}
                  onClick={() => onSelectStageIndex?.(Math.max(0, activeStageIndex - 1))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  ← Previous Stage
                </button>
                <button
                  type="button"
                  disabled={activeStageIndex >= CYCLONE_FORMATION_STAGES.length - 1}
                  onClick={() =>
                    onSelectStageIndex?.(Math.min(CYCLONE_FORMATION_STAGES.length - 1, activeStageIndex + 1))
                  }
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 cursor-pointer flex items-center gap-1"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: CAUSE VS. TRACK VS. IMPACT SEPARATION                      */}
        {/* ================================================================= */}
        {activeTab === 'pillars' && (
          <div className="space-y-3">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10.5px] text-amber-950 leading-snug">
              <strong>Scientific Principle:</strong> A cyclone assessment must never confuse <em>environmental cause</em> (why a storm develops), <em>trajectory track</em> (where it moves), and <em>localized impact</em> (what damage it causes).
            </div>

            {/* Pillar 1: CAUSE */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>{breakdown.cause.title}</span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-snug">{breakdown.cause.description}</p>
              <div className="space-y-1 pt-1">
                {breakdown.cause.items.map((item, idx) => (
                  <div key={idx} className="bg-white p-1.5 rounded border border-slate-200 text-[10px]">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{item.label}</span>
                      <span className="text-purple-700">{item.value}</span>
                    </div>
                    <div className="text-slate-500 text-[9.5px] mt-0.5">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pillar 2: TRACK */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>{breakdown.track.title}</span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-snug">{breakdown.track.description}</p>
              <div className="space-y-1 pt-1">
                {breakdown.track.items.map((item, idx) => (
                  <div key={idx} className="bg-white p-1.5 rounded border border-slate-200 text-[10px]">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{item.label}</span>
                      <span className="text-blue-700">{item.value}</span>
                    </div>
                    <div className="text-slate-500 text-[9.5px] mt-0.5">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pillar 3: IMPACT */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>{breakdown.impact.title}</span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-snug">{breakdown.impact.description}</p>
              <div className="p-1.5 bg-rose-50 border border-rose-200 rounded text-[9.5px] text-rose-900 font-semibold leading-tight">
                {breakdown.impact.disclaimer}
              </div>
              <div className="space-y-1 pt-1">
                {breakdown.impact.items.map((item, idx) => (
                  <div key={idx} className="bg-white p-1.5 rounded border border-slate-200 text-[10px]">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{item.label}</span>
                      <span className="text-rose-700 font-semibold">{item.value}</span>
                    </div>
                    <div className="text-slate-500 text-[9.5px] mt-0.5">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Expandable Advanced Scientific Details */}
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowAdvancedScience(!showAdvancedScience)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 hover:text-slate-900 py-1 cursor-pointer"
          >
            <span>Advanced Dynamic & Thermodynamic Equations</span>
            {showAdvancedScience ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvancedScience && (
            <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-700 space-y-2 leading-relaxed">
              <div>
                <strong className="text-slate-900 block">1. Gray’s Cyclogenesis Parameter (Dynamic Potential):</strong>
                <code>P_cyclone = (f) × (vorticity + 5) × (1 / (S_z + 3)) × E × H × (T - 26)</code>
                <p className="mt-0.5 text-slate-600">
                  Where <code>f</code> is the Coriolis parameter, <code>S_z</code> is vertical wind shear between 850 and 200 hPa, <code>E</code> is ocean thermal energy, and <code>H</code> is mid-tropospheric relative humidity.
                </p>
              </div>

              <div>
                <strong className="text-slate-900 block">2. Coriolis Vorticity Requirement:</strong>
                <code>f = 2 × Ω × sin(φ)</code>
                <p className="mt-0.5 text-slate-600">
                  Near the equator (φ &lt; 5°), <code>f ≈ 0</code>. Without sufficient planetary vorticity, air flows directly across isobars into the low-pressure center, filling the depression before a rotational vortex can organize.
                </p>
              </div>

              <div>
                <strong className="text-slate-900 block">3. Latent Heat Thermodynamic Engine:</strong>
                <p className="text-slate-600">
                  Condensation releases latent heat (L_v ≈ 2.5 × 10⁶ J/kg), warming the mid-to-upper troposphere and establishing the warm-core characteristic that distinguishes tropical cyclones from mid-latitude cold-core frontal storms.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

