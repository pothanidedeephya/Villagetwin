import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Info,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type { WeatherData } from '../../types/weather';
import {
  generateTenDayOutlook,
  type TenDayOutlookReport,
  type TenDayHazardTrajectory,
} from '../../services/tenDayOutlookService';

interface TenDayRiskOutlookModalProps {
  location: LocationSearchResult;
  weather?: WeatherData | null;
  onClose: () => void;
}

export const TenDayRiskOutlookModal: React.FC<TenDayRiskOutlookModalProps> = ({
  location,
  weather,
  onClose,
}) => {
  const [outlookReport, setOutlookReport] = useState<TenDayOutlookReport | null>(null);
  const [activeHazardKey, setActiveHazardKey] = useState<string>('flood');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  useEffect(() => {
    // Generate authoritative 10-day prognostic report for active location
    const report = generateTenDayOutlook(location, weather);
    setOutlookReport(report);
  }, [location, weather]);

  if (!outlookReport) return null;

  const activeTrajectory: TenDayHazardTrajectory | undefined =
    outlookReport.trajectories[activeHazardKey] || outlookReport.trajectories['flood'];

  const selectedDay = activeTrajectory?.days[selectedDayIndex] || activeTrajectory?.days[0];

  const getRiskBadge = (cat: string) => {
    switch (cat) {
      case 'Severe':
        return 'bg-red-600 text-white border-red-600';
      case 'High':
        return 'bg-orange-500 text-white border-orange-500';
      case 'Moderate':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  const getSourceTypePill = (type: string, isOfficial: boolean) => {
    if (isOfficial) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          Official Government Warning
        </span>
      );
    }
    switch (type) {
      case 'meteorological_forecast':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-blue-50 text-blue-800 border border-blue-200">
            NWP Numerical Meteorological Forecast
          </span>
        );
      case 'hydrologic_model':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-purple-50 text-purple-800 border border-purple-200">
            Digital Twin Hydrologic Calculation
          </span>
        );
      case 'seismic_hazard_model':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-800 border border-slate-300">
            Probabilistic Seismic Hazard Baseline
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700">
            Diagnostic Assessment
          </span>
        );
    }
  };

  const hazardTabs = [
    { key: 'flood', label: 'Flood & Drainage' },
    { key: 'cyclone', label: 'Cyclone & Wind' },
    { key: 'heatwave', label: 'Heatwave' },
    { key: 'landslide', label: 'Landslide' },
    { key: 'drought', label: 'Drought' },
    { key: 'earthquake', label: 'Earthquake (Baseline)' },
    { key: 'tsunami', label: 'Tsunami (Run-up)' },
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative z-10 bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">
                Rolling 10-Day Multi-Hazard Risk Outlook
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {location.displayName} · Model Run: {new Date(outlookReport.generatedAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hazard Selector Pills */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs shrink-0">
          {hazardTabs.map((tab) => {
            const isSelected = activeHazardKey === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveHazardKey(tab.key);
                  setSelectedDayIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Scientific Methodology & Invariant Disclaimer */}
          <div
            className={`p-3 rounded-xl border text-[11px] space-y-1 ${
              activeTrajectory.isPredictableOverTenDays
                ? 'bg-blue-50/60 border-blue-200 text-blue-950'
                : 'bg-amber-50/70 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Methodology & Predictability Standard</span>
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-600">
                {activeTrajectory.isPredictableOverTenDays ? 'Forecastable Horizon' : 'Event-Driven / Static Baseline'}
              </span>
            </div>
            <p className="leading-snug">{activeTrajectory.scientificMethodology}</p>
            <div className="text-[10px] text-slate-500 pt-0.5">
              Source Attribution: {activeTrajectory.provenanceSource}
            </div>
          </div>

          {/* 10-Day Timeline Cards Strip */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
              Select Day from 10-Day Projection (Day 1 - Day 10)
            </span>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {activeTrajectory.days.map((day, idx) => {
                const isSelected = selectedDayIndex === idx;
                return (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[74px] ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/30 font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 font-medium">{day.dayName}</span>
                    <span className="text-xs font-bold text-slate-800">D+{day.dayNumber}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border mt-1 w-full truncate ${getRiskBadge(
                        day.riskCategory
                      )}`}
                    >
                      {day.riskCategory}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail Card */}
          {selectedDay && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Day {selectedDay.dayNumber} ({selectedDay.dayName}, {selectedDay.date})
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getRiskBadge(
                        selectedDay.riskCategory
                      )}`}
                    >
                      {selectedDay.riskCategory} Risk
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono mt-0.5 block">
                    Key Metric: {selectedDay.primaryMetric}
                  </span>
                </div>

                <div>
                  {getSourceTypePill(selectedDay.sourceType, selectedDay.isOfficialWarning)}
                </div>
              </div>

              {/* Evidence Summary */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                  Evidence & Meteorological/Geophysical Rationale:
                </span>
                <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedDay.evidenceSummary}
                </p>
              </div>

              {/* Uncertainty Limitations */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                  Scientific Uncertainty & Quality Limits:
                </span>
                <p className="text-[11px] text-slate-600 italic bg-slate-50/60 p-2 rounded-lg border border-slate-100">
                  {selectedDay.uncertaintyNotes}
                </p>
              </div>

              {/* Recommended Preparedness Actions */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-700 block mb-1.5">
                  Mandated Gram Panchayat & Community Preparedness Actions:
                </span>
                <ul className="space-y-1">
                  {selectedDay.recommendedActions.map((act, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[11px] text-slate-700 bg-white p-1.5 rounded border border-slate-100"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Adheres to NDMA Disaster Risk Reduction frameworks. No fabricated probabilities.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close Outlook
          </button>
        </div>
      </div>
    </div>
  );
};
