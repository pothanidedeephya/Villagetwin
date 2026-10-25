import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  ArrowUpDown,
  Car,
  Footprints,
  ShieldCheck,
  Clock,
  Ruler,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  Layers,
  CheckCircle2,
  AlertCircle,
  Crosshair,
  ExternalLink,
  Radio,
} from 'lucide-react';
import type {
  NavigationPoint,
  TravelMode,
  RouteCriterion,
  ComputedRoute,
  RoutePlanningResult,
} from '../../types/navigation';

interface GoogleMapsNavigationPanelProps {
  availablePOIs: NavigationPoint[];
  routeResult: RoutePlanningResult | null;
  activeRouteId: string;
  travelMode: TravelMode;
  isLoading: boolean;
  isMapPickingActive: 'origin' | 'destination' | null;
  selectedOrigin?: NavigationPoint | null;
  selectedDestination?: NavigationPoint | null;
  onSelectOrigin: (point: NavigationPoint) => void;
  onSelectDestination: (point: NavigationPoint) => void;
  onSelectTravelMode: (mode: TravelMode) => void;
  onSelectRoute: (routeId: string) => void;
  onCalculateRoute: () => void;
  onClearRoute?: () => void;
  onStartMapPick: (target: 'origin' | 'destination') => void;
  onOpenRouteIntelligence?: () => void;
  onClose: () => void;
}

export const GoogleMapsNavigationPanel: React.FC<GoogleMapsNavigationPanelProps> = ({
  availablePOIs,
  routeResult,
  activeRouteId,
  travelMode,
  isLoading,
  isMapPickingActive,
  selectedOrigin,
  selectedDestination,
  onSelectOrigin,
  onSelectDestination,
  onSelectTravelMode,
  onSelectRoute,
  onCalculateRoute,
  onClearRoute,
  onStartMapPick,
  onOpenRouteIntelligence,
  onClose,
}) => {
  const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState(false);
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const [isStepsExpanded, setIsStepsExpanded] = useState(true);
  const [isTrafficInfoOpen, setIsTrafficInfoOpen] = useState(false);

  const activeRoute = routeResult?.routes.find((r) => r.id === activeRouteId) || routeResult?.routes[0];
  const origin = selectedOrigin !== undefined ? selectedOrigin : (routeResult?.origin || null);
  const destination = selectedDestination !== undefined ? selectedDestination : (routeResult?.destination || null);

  const handleSwap = () => {
    if (origin && destination) {
      onSelectOrigin(destination);
      onSelectDestination(origin);
    }
  };

  return (
    <div className="absolute top-3 left-3 z-[1000] w-[340px] sm:w-[390px] max-h-[calc(100%-24px)] flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 text-xs animate-slide-in-left">
      {/* 1. Header with Google Maps Navigation Branding */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs">
            <Navigation className="w-3.5 h-3.5 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-xs tracking-wide">Bharat Navigation & Routing</h3>
            <p className="text-[10px] text-slate-300">Google Maps-Style · Flood-Aware Engine</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Close Navigation Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-3 scrollbar-thin">
        {/* 2. Mode Selector: Driving vs Walking */}
        <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => onSelectTravelMode('driving')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              travelMode === 'driving'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Driving</span>
          </button>
          <button
            onClick={() => onSelectTravelMode('walking')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              travelMode === 'walking'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walking</span>
          </button>
        </div>

        {/* 3. Origin & Destination Inputs with Swap */}
        <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
          {/* Origin Row */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-emerald-600 bg-white shrink-0 ml-1" />
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsOriginDropdownOpen(!isOriginDropdownOpen);
                    setIsDestDropdownOpen(false);
                  }}
                  className="w-full text-left py-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-900 font-medium truncate flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{origin?.name || 'Choose Starting Point'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onStartMapPick('origin')}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isMapPickingActive === 'origin'
                    ? 'bg-blue-600 text-white border-blue-600 animate-pulse'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Click on map to select origin coordinates"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Origin Dropdown Menu */}
            {isOriginDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {availablePOIs.map((poi) => (
                  <button
                    key={poi.id}
                    onClick={() => {
                      onSelectOrigin(poi);
                      setIsOriginDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-800 transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900 truncate">{poi.name}</div>
                      {poi.description && (
                        <div className="text-[10px] text-slate-500 line-clamp-1">{poi.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button Connector */}
          <div className="flex items-center justify-between px-1">
            <div className="w-0.5 h-3 bg-slate-300 ml-2" />
            <button
              onClick={handleSwap}
              className="p-1 rounded-full bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors cursor-pointer shadow-2xs"
              title="Reverse Origin & Destination"
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <div className="flex-1" />
          </div>

          {/* Destination Row */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-600 shrink-0 ml-1 shadow-2xs" />
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsDestDropdownOpen(!isDestDropdownOpen);
                    setIsOriginDropdownOpen(false);
                  }}
                  className="w-full text-left py-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-900 font-medium truncate flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{destination?.name || 'Choose Destination'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onStartMapPick('destination')}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isMapPickingActive === 'destination'
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Click on map to select destination coordinates"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Destination Dropdown Menu */}
            {isDestDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {availablePOIs.map((poi) => (
                  <button
                    key={poi.id}
                    onClick={() => {
                      onSelectDestination(poi);
                      setIsDestDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-800 transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900 truncate">{poi.name}</div>
                      {poi.description && (
                        <div className="text-[10px] text-slate-500 line-clamp-1">{poi.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Pick Helper Banner */}
        {isMapPickingActive && (
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between animate-pulse">
            <span className="font-medium text-[11px]">
              Click anywhere on the map to set <strong>{isMapPickingActive}</strong>.
            </span>
            <button
              onClick={() => onStartMapPick(isMapPickingActive)}
              className="text-xs font-bold text-blue-700 underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* 4. Action: Calculate Route / Clear Route */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCalculateRoute}
            disabled={isLoading || !origin || !destination}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Calculating Safe Routes...' : routeResult ? 'Recalculate Route' : 'Calculate Routes'}</span>
          </button>
          {routeResult && onClearRoute && (
            <button
              onClick={onClearRoute}
              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer text-xs"
              title="Clear Route & Map Markers"
            >
              Clear
            </button>
          )}
        </div>

        {/* Empty State Banner (Shown before route is requested) */}
        {!routeResult && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
            <Navigation className="w-5 h-5 mx-auto mb-1 text-slate-400 stroke-1" />
            <p className="font-semibold text-slate-700 text-[11px]">No Active Navigation Route</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Select origin and destination above, then click <strong>Calculate Routes</strong>. No route lines appear until requested.
            </p>
          </div>
        )}

        {/* Error / Disconnected Network Banner */}
        {routeResult && routeResult.routes.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Route Calculation Failed</span>
            </div>
            <p className="text-[10.5px] mt-1 leading-snug">
              {routeResult.notice || 'No traversable road corridors exist between selected points.'}
            </p>
          </div>
        )}

        {/* 5. Route Alternatives Tabs */}
        {routeResult && routeResult.routes.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
              <span>Route Alternatives ({routeResult.routes.length}):</span>
              <span className="text-[10px] text-slate-400">Select to display on map</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {routeResult.routes.map((route) => {
                const isSelected = route.id === activeRouteId;
                const isDry = route.submergedDistance_m === 0;
                return (
                  <button
                    key={route.id}
                    onClick={() => onSelectRoute(route.id)}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-500'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded ${
                        route.criterion === 'flood_aware'
                          ? 'bg-emerald-100 text-emerald-800'
                          : route.criterion === 'fastest'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {route.criterion === 'flood_aware' ? 'Safe' : route.criterion === 'fastest' ? 'Fast' : 'Short'}
                      </span>
                      {isDry ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-xs">
                      {travelMode === 'driving' ? `${route.estimatedDrivingMinutes}m` : `${route.estimatedWalkingMinutes}m`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(route.totalDistance_m / 1000).toFixed(2)} km
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Compare Routes & Safety Intelligence Button */}
            {onOpenRouteIntelligence && (
              <button
                type="button"
                onClick={onOpenRouteIntelligence}
                className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Compare Alternatives & Safety Evidence</span>
              </button>
            )}

            {/* 6. Active Route Detail Card */}
            {activeRoute && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{activeRoute.title}</span>
                      {activeRoute.isRecommended && (
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                          Recommended
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{activeRoute.summary}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeRoute.isPassable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {activeRoute.clearanceStatus}
                  </span>
                </div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block">Est. Time</span>
                    <span className="text-sm font-extrabold text-blue-700">
                      {travelMode === 'driving' ? `${activeRoute.estimatedDrivingMinutes} min` : `${activeRoute.estimatedWalkingMinutes} min`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block">Distance</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {(activeRoute.totalDistance_m / 1000).toFixed(2)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block">Flood Risk</span>
                    <span className={`text-sm font-extrabold ${
                      activeRoute.submergedDistance_m === 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {activeRoute.submergedDistance_m === 0 ? '0% Dry' : `${activeRoute.maxFloodDepth_m.toFixed(2)}m`}
                    </span>
                  </div>
                </div>

                {/* Hydrologic Justification Banner */}
                {activeRoute.whyRecommended && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    activeRoute.isPassable
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}>
                    <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${
                      activeRoute.isPassable ? 'text-emerald-600' : 'text-rose-600'
                    }`} />
                    <p className="text-[11px] leading-relaxed">
                      {activeRoute.whyRecommended}
                    </p>
                  </div>
                )}

                {/* Traffic Status Ribbon */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-600" />
                    <div>
                      <span className="font-semibold text-slate-800">Traffic Condition:</span>
                      <span className="text-slate-500 ml-1">Standard IRC Flow</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTrafficInfoOpen(!isTrafficInfoOpen)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Provenance
                  </button>
                </div>

                {/* Traffic Provenance Disclosure Drawer */}
                {isTrafficInfoOpen && (
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-600 leading-relaxed space-y-1">
                    <span className="font-bold text-slate-800 block">Live Traffic Telemetry Provenance:</span>
                    <p>{activeRoute.traffic.message}</p>
                    <div className="text-slate-400">
                      Engine: {activeRoute.routingEngine} · Evaluated: {new Date(activeRoute.traffic.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Turn-by-Turn Steps Accordion */}
                <div className="border-t border-slate-200 pt-2">
                  <button
                    onClick={() => setIsStepsExpanded(!isStepsExpanded)}
                    className="w-full flex items-center justify-between text-slate-700 font-semibold hover:text-slate-900 py-1 cursor-pointer"
                  >
                    <span>Turn-by-Turn Directions ({activeRoute.steps.length} steps)</span>
                    {isStepsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isStepsExpanded && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeRoute.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg border flex items-start gap-2 ${
                            step.status === 'impassable'
                              ? 'bg-rose-50 border-rose-200 text-rose-950'
                              : step.status === 'caution'
                              ? 'bg-amber-50 border-amber-200 text-amber-950'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5 ${
                            step.status === 'impassable'
                              ? 'bg-rose-600 text-white'
                              : step.status === 'caution'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium leading-snug">{step.instruction}</p>
                            {step.distance_m > 0 && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>{step.distance_m}m</span>
                                <span>•</span>
                                <span>{step.roadType}</span>
                                {step.floodDepth_m > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-700 font-semibold">
                                      Water: {step.floodDepth_m.toFixed(2)}m
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Footer Status */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
        <span>Verified OSM Road Topology</span>
        <span>IRC Speed Parameters</span>
      </div>
    </div>
  );
};

