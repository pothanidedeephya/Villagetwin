import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Info,
  X,
  Compass,
  Navigation,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Clock,
  Radio,
  Sliders,
  CheckCircle2,
  Route,
  Building2,
  HelpCircle,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import { CycloneCauseExplainer } from './CycloneCauseExplainer';
import {
  type CycloneState,
  type CycloneMode,
  type CycloneIntensityCode,
  CYCLONE_INTENSITY_SCALES,
  PREDEFINED_DEMO_SCENARIOS,
  generateDemoCycloneTrack,
  fetchLiveOfficialCycloneTrack,
  calculateCycloneImpactOnLocation,
  type CycloneLocationImpact,
  type CycloneTrackStep,
  buildGeoJsonForWindRadii,
} from '../../services/cycloneTrackingService';

export interface CycloneTrackingPanelProps {
  currentLocation: LocationSearchResult;
  dataset?: { roads?: { features: any[] }; buildings?: { features: any[] } };
  isOpen: boolean;
  onClose: () => void;
  onUpdateCycloneState: (state: CycloneState | null) => void;
  onZoomToStorm?: (coords: [number, number]) => void;
}

export const CycloneTrackingPanel: React.FC<CycloneTrackingPanelProps> = ({
  currentLocation,
  dataset,
  isOpen,
  onClose,
  onUpdateCycloneState,
  onZoomToStorm,
}) => {
  const [mode, setMode] = useState<CycloneMode>('demo');
  const [cycloneState, setCycloneState] = useState<CycloneState>(() =>
    generateDemoCycloneTrack({ scenarioId: 'bob-andhra-odisha' })
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState<number>(2000); // 2s per step
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('bob-andhra-odisha');
  const [selectedIntensity, setSelectedIntensity] = useState<CycloneIntensityCode>('VSCS');
  const [forwardSpeed, setForwardSpeed] = useState<number>(18);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [showCauseExplainer, setShowCauseExplainer] = useState<boolean>(true);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(3);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state upward to map whenever cycloneState changes
  useEffect(() => {
    if (isOpen) {
      onUpdateCycloneState(cycloneState);
    } else {
      onUpdateCycloneState(null);
    }
  }, [cycloneState, isOpen]);

  // Clean up timer on unmount or close
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Handle Play/Pause animation loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCycloneState((prev) => {
          if (!prev.steps || prev.steps.length === 0) return prev;
          const nextIndex = (prev.currentStepIndex + 1) % prev.steps.length;
          const updatedWindRadii = buildGeoJsonForWindRadii(prev.steps[nextIndex]);
          return {
            ...prev,
            currentStepIndex: nextIndex,
            windRadiiGeoJson: updatedWindRadii,
          };
        });
      }, playbackSpeedMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeedMs]);

  // Switch between Live and Demo modes
  const handleSwitchMode = async (newMode: CycloneMode) => {
    setIsPlaying(false);
    setMode(newMode);

    if (newMode === 'live') {
      setIsLoadingLive(true);
      const liveState = await fetchLiveOfficialCycloneTrack();
      setCycloneState(liveState);
      setIsLoadingLive(false);
    } else {
      const demoState = generateDemoCycloneTrack({
        scenarioId: selectedScenarioId,
        intensity: selectedIntensity,
        forwardSpeedKmh: forwardSpeed,
      });
      setCycloneState(demoState);
    }
  };

  // Switch demonstration scenario
  const handleSelectScenario = (scenId: string) => {
    setIsPlaying(false);
    setSelectedScenarioId(scenId);
    const updated = generateDemoCycloneTrack({
      scenarioId: scenId,
      intensity: selectedIntensity,
      forwardSpeedKmh: forwardSpeed,
    });
    setCycloneState(updated);
  };

  // Change demonstration intensity
  const handleChangeIntensity = (code: CycloneIntensityCode) => {
    setSelectedIntensity(code);
    const updated = generateDemoCycloneTrack({
      scenarioId: selectedScenarioId,
      intensity: code,
      forwardSpeedKmh: forwardSpeed,
    });
    setCycloneState(updated);
  };

  // Step timeline manually
  const handleSelectStep = (index: number) => {
    setIsPlaying(false);
    setCycloneState((prev) => {
      const step = prev.steps[index];
      return {
        ...prev,
        currentStepIndex: index,
        windRadiiGeoJson: buildGeoJsonForWindRadii(step),
      };
    });
  };

  // Reset scenario to start
  const handleResetTimeline = () => {
    setIsPlaying(false);
    const resetIdx = cycloneState.steps.findIndex((s) => s.offsetHours === 0) || 0;
    setCycloneState((prev) => ({
      ...prev,
      currentStepIndex: resetIdx >= 0 ? resetIdx : 0,
      windRadiiGeoJson: buildGeoJsonForWindRadii(prev.steps[resetIdx >= 0 ? resetIdx : 0]),
    }));
  };

  if (!isOpen) return null;

  const currentStep: CycloneTrackStep | null =
    cycloneState.steps && cycloneState.steps[cycloneState.currentStepIndex]
      ? cycloneState.steps[cycloneState.currentStepIndex]
      : null;

  // Compute location-specific impact for current time step
  const locationImpact: CycloneLocationImpact | null = currentStep
    ? calculateCycloneImpactOnLocation(
        currentStep,
        cycloneState.steps,
        currentLocation,
        dataset,
        mode === 'demo'
      )
    : null;

  return (
    <div className="absolute top-16 right-3 sm:right-4 z-40 w-80 sm:w-96 max-w-[calc(100vw-24px)] max-h-[calc(100vh-80px)] flex flex-col bg-white/95 backdrop-blur-md border border-slate-200/95 rounded-2xl shadow-2xl text-xs text-slate-800 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto overflow-hidden">
      
      {/* 1. Header & Mode Switcher */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/90 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Wind className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                Cyclone Tracking
              </h3>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                North Indian Ocean · IMD Model & Tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer transition-colors"
            title="Close Cyclone Tool"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Pill Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
          <button
            onClick={() => handleSwitchMode('live')}
            className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'live'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>Live Official Track</span>
          </button>

          <button
            onClick={() => handleSwitchMode('demo')}
            className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'demo'
                ? 'bg-white text-orange-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-orange-600" />
            <span>Demonstration</span>
          </button>
        </div>
      </div>

      {/* 2. Persistent DEMO Banner (When in Demonstration Mode) */}
      {mode === 'demo' && (
        <div className="bg-amber-500 text-slate-950 px-3 py-1 font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-between shrink-0 shadow-xs select-none">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 fill-slate-950 text-amber-500 shrink-0" />
            <span>DEMO — NOT A REAL FORECAST</span>
          </span>
          <span className="text-[9px] bg-slate-950 text-amber-400 px-1.5 py-0.2 rounded font-mono">
            SIMULATION
          </span>
        </div>
      )}

      {/* 3. Scrollable Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* A. LIVE MODE: Empty vs Active Cyclone State */}
        {mode === 'live' && (
          <div className="space-y-2.5">
            {isLoadingLive ? (
              <div className="p-6 text-center text-slate-500 space-y-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Querying official IMD RSMC cyclone bulletin feed...</p>
              </div>
            ) : !cycloneState.hasActiveLiveTrack ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-xs">No Verified Active Cyclone Track</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  India Meteorological Department (RSMC New Delhi) reports normal atmospheric conditions across the Bay of Bengal and Arabian Sea. No named cyclonic storm is currently active nationwide.
                </p>
                <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Source: IMD National Cyclone Warning Centre</span>
                  <button
                    onClick={() => handleSwitchMode('demo')}
                    className="font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    Open Demo Scenario →
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-800">
                      Official Storm: {cycloneState.stormName}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-0.5">
                      {currentStep?.intensityLabel || 'Cyclonic Storm'}
                    </h4>
                  </div>
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded border border-red-300">
                    IMD ACTIVE
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  Agency: {cycloneState.issuingAgency}
                </div>
              </div>
            )}
          </div>
        )}

        {/* B. DEMO MODE: Configuration Controls */}
        {mode === 'demo' && (
          <div className="space-y-2.5">
            {/* Scenario Track Selector */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Illustrative Scenario Track
              </label>
              <select
                value={selectedScenarioId}
                onChange={(e) => handleSelectScenario(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-medium focus:outline-blue-600"
              >
                {PREDEFINED_DEMO_SCENARIOS.map((scen) => (
                  <option key={scen.id} value={scen.id}>
                    {scen.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Intensity Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Demonstration Intensity
                </label>
                <select
                  value={selectedIntensity}
                  onChange={(e) => handleChangeIntensity(e.target.value as CycloneIntensityCode)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-medium focus:outline-blue-600"
                >
                  <option value="CS">Cyclonic Storm (62-88 km/h)</option>
                  <option value="SCS">Severe CS (89-117 km/h)</option>
                  <option value="VSCS">Very Severe CS (118-165 km/h)</option>
                  <option value="ESCS">Extremely Severe CS (166+ km/h)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Forward Speed
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  {[12, 18, 24].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setForwardSpeed(spd);
                        const updated = generateDemoCycloneTrack({
                          scenarioId: selectedScenarioId,
                          intensity: selectedIntensity,
                          forwardSpeedKmh: spd,
                        });
                        setCycloneState(updated);
                      }}
                      className={`flex-1 py-1 rounded text-center font-medium transition-all cursor-pointer ${
                        forwardSpeed === spd
                          ? 'bg-white text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {spd}k/h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Timeline Controls (Common to Demo & Active Live) */}
        {cycloneState.steps && cycloneState.steps.length > 0 && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>Storm Progression Timeline</span>
              </span>

              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono">
                {currentStep?.label}
              </span>
            </div>

            {/* Step Pills Scrubber */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {cycloneState.steps.map((step, idx) => {
                const isSelected = idx === cycloneState.currentStepIndex;
                const isCurrent = step.offsetHours === 0;

                return (
                  <button
                    key={step.stepId}
                    onClick={() => handleSelectStep(idx)}
                    className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>

            {/* Play / Pause / Reset Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-white" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-white" />
                      <span>Play Simulation</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetTimeline}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  title="Reset to 0h / Current"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {currentStep && onZoomToStorm && (
                <button
                  onClick={() => onZoomToStorm(currentStep.coordinates)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                  title="Zoom map to cyclone center"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>Locate Eye</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5. Why is this Cyclone Forming? Explainer & 5-Stage Lifecycle */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            type="button"
            onClick={() => setShowCauseExplainer(!showCauseExplainer)}
            className="w-full p-2.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 hover:bg-blue-100/60 flex items-center justify-between text-left text-xs font-bold text-slate-800 cursor-pointer border-b border-slate-200/70 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Why is this cyclone forming?</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-blue-700 font-semibold hidden sm:inline">Science & Lifecycle</span>
              {showCauseExplainer ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
          </button>

          {showCauseExplainer && (
            <div className="p-2.5 bg-slate-50/30">
              <CycloneCauseExplainer
                mode={mode}
                currentStep={currentStep}
                currentLocation={currentLocation}
                activeStageIndex={activeStageIndex}
                onSelectStageIndex={(stageIdx) => {
                  setActiveStageIndex(stageIdx);
                  // In demo mode, step to the illustrative step corresponding to stage
                  if (mode === 'demo' && cycloneState.steps && cycloneState.steps.length > 0) {
                    const targetIdx = Math.min(
                      Math.floor((stageIdx / 4) * (cycloneState.steps.length - 1)),
                      cycloneState.steps.length - 1
                    );
                    handleSelectStep(targetIdx);
                  }
                }}
                compact={true}
              />
            </div>
          )}
        </div>

        {/* 6. Selected Location Impact Summary */}
        {locationImpact && (
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Impact at {currentLocation.name}</span>
              </span>

              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                  locationImpact.isInsideWindRadii
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {locationImpact.isInsideWindRadii
                  ? `${locationImpact.highestWindThresholdInside} Wind Zone`
                  : 'Outside Major Radii'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">Distance to Eye</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {locationImpact.distanceToStormKm} km
                </span>
                <span className="text-[10px] text-slate-500 block">({locationImpact.compassDirection} of center)</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">Wind at Location</span>
                <span className={`font-extrabold text-sm ${locationImpact.highestWindSpeedKmh > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                  {locationImpact.highestWindSpeedKmh > 0 ? `~${locationImpact.highestWindSpeedKmh} km/h` : '< 50 km/h'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {locationImpact.isInsideWindRadii ? 'Gale / Storm' : 'Moderate'}
                </span>
              </div>
            </div>

            {/* Exposed Infrastructure (if inside wind field) */}
            {locationImpact.isInsideWindRadii && locationImpact.exposedRoadsCount > 0 && (
              <div className="p-2 rounded-lg bg-red-50/60 border border-red-200 text-[11px] text-red-950 space-y-1">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Route className="w-3 h-3 text-amber-700" />
                    <span>Exposed Roads:</span>
                  </span>
                  <span className="font-bold">{locationImpact.exposedRoadsCount} segments ({locationImpact.exposedRoadsLengthKm} km)</span>
                </div>
                {locationImpact.exposedBuildingsCount > 0 && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-700" />
                      <span>Exposed Buildings:</span>
                    </span>
                    <span className="font-bold">{locationImpact.exposedBuildingsCount} structures</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10.5px] text-slate-600 leading-snug">
              {locationImpact.summaryText}
            </p>
          </div>
        )}

        {/* 6. Wind Intensity & Track Legend */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Map Legend & Radii
          </span>

          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
              <span>34kt (63 k/h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
              <span>50kt (93 k/h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-900 shrink-0" />
              <span>64kt (118 k/h)</span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-slate-800" />
              <span>Observed Track</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 border-b border-dashed border-red-600" />
              <span>Forecast Track</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-200/60 border border-red-400 rounded-xs" />
              <span>Uncertainty Cone</span>
            </span>
          </div>
        </div>

        {/* 7. Expandable Technical Details */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <span>Technical Details & Coordinates</span>
            {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechnicalDetails && (
            <div className="p-2.5 bg-white space-y-2 text-[10px] text-slate-600">
              {currentStep && (
                <div className="space-y-1 font-mono">
                  <div><strong>Center:</strong> {currentStep.coordinates[1]}°N, {currentStep.coordinates[0]}°E</div>
                  <div><strong>Central Pressure:</strong> {currentStep.centralPressureHpa} hPa</div>
                  <div><strong>Max Wind:</strong> {currentStep.maxWindKnots} kt ({currentStep.maxWindKmh} km/h)</div>
                  <div><strong>Forward Direction:</strong> {currentStep.forwardDirectionDeg}° ({currentStep.forwardSpeedKmh} km/h)</div>
                  <div><strong>Uncertainty Radius:</strong> ±{currentStep.uncertaintyRadiusKm} km</div>
                </div>
              )}

              <div className="pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">
                Official source: India Meteorological Department RSMC New Delhi · National Cyclone Warning Centre (NCWC).
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

