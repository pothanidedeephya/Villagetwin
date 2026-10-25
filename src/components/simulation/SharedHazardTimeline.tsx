import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Clock,
  Waves,
  Wind,
  AlertTriangle,
  Info,
} from 'lucide-react';

export interface SharedHazardTimelineProps {
  hazardType: 'flood' | 'cyclone';
  // Common step info
  currentStepIndex: number;
  totalSteps: number;
  stepLabels?: string[];
  stepLabel: string;
  subLabel?: string;
  sourceClassification: 'observed' | 'forecast' | 'simulation' | 'demo';
  // Playback state
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepChange: (index: number) => void;
  onReset: () => void;
  // Visual options
  compact?: boolean;
  className?: string;
  playbackSpeedMs?: number;
}

export const SharedHazardTimeline: React.FC<SharedHazardTimelineProps> = ({
  hazardType,
  currentStepIndex,
  totalSteps,
  stepLabels,
  stepLabel,
  subLabel,
  sourceClassification,
  isPlaying,
  onTogglePlay,
  onStepChange,
  onReset,
  compact = false,
  className = '',
}) => {
  // Classification badge helper
  const getBadge = () => {
    switch (sourceClassification) {
      case 'observed':
        return {
          text: 'Observed Data',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      case 'forecast':
        return {
          text: 'Official Forecast',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'simulation':
        return {
          text: 'Modelled Simulation',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        };
      case 'demo':
      default:
        return {
          text: 'DEMO — NOT A REAL FORECAST',
          badgeClass: 'bg-amber-500 text-slate-950 border-amber-600 font-black tracking-wider',
        };
    }
  };

  const badge = getBadge();
  const maxIdx = Math.max(0, totalSteps - 1);

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < maxIdx) {
      onStepChange(currentStepIndex + 1);
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 p-1.5 bg-slate-900/90 text-white backdrop-blur-md rounded-xl border border-slate-700/80 shadow-lg text-xs ${className}`}
        role="region"
        aria-label="Compact simulation timeline"
      >
        <button
          type="button"
          onClick={onReset}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Reset to initial time"
          aria-label="Reset simulation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
            isPlaying ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
          title={isPlaying ? 'Pause animation' : 'Play animation'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        <div className="flex-1 min-w-[120px] flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-200 truncate">{stepLabel}</span>
            <span className="font-mono text-slate-400">{currentStepIndex + 1}/{totalSteps}</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxIdx}
            step="1"
            value={currentStepIndex}
            onChange={(e) => onStepChange(Number(e.target.value))}
            className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
            aria-label="Simulation timeline progress"
          />
        </div>

        <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase shrink-0 ${badge.badgeClass}`}>
          {badge.text}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2.5 ${className}`}
      role="region"
      aria-label="Hazard simulation timeline controller"
    >
      {/* Header bar: Source Tag & Mode icon */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          {hazardType === 'flood' ? (
            <Waves className="w-4 h-4 text-blue-600" />
          ) : (
            <Wind className="w-4 h-4 text-rose-600" />
          )}
          <span>Timeline Controller</span>
        </div>
        <span className={`text-[9.5px] px-2 py-0.5 rounded border font-semibold uppercase tracking-wider ${badge.badgeClass}`}>
          {badge.text}
        </span>
      </div>

      {/* Main Time Readout */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs text-slate-900 truncate">
              {stepLabel}
            </div>
            {subLabel && (
              <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                {subLabel}
              </div>
            )}
          </div>
        </div>

        {/* Step counter */}
        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 block font-mono">Step</span>
          <span className="text-xs font-bold font-mono text-slate-700">
            {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Slider Scrubber */}
      <div className="space-y-1 pt-0.5">
        <input
          type="range"
          min="0"
          max={maxIdx}
          step="1"
          value={currentStepIndex}
          onChange={(e) => onStepChange(Number(e.target.value))}
          className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer transition-all"
          aria-label="Timeline scrubber"
        />

        {/* Step Tick Pills if provided */}
        {stepLabels && stepLabels.length > 0 && (
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-0.5">
            {stepLabels.map((lbl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onStepChange(idx)}
                className={`hover:text-blue-600 transition-colors cursor-pointer ${
                  currentStepIndex === idx ? 'text-blue-700 font-black' : ''
                }`}
                title={`Jump to step: ${lbl}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Playback Controls Row */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset to beginning"
            aria-label="Reset simulation"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex <= 0}
            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
            title="Previous step"
            aria-label="Previous step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentStepIndex >= maxIdx}
            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
            title="Next step"
            aria-label="Next step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          className={`py-1 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

