import React, { useState } from 'react';
import {
  X,
  Navigation,
  ChevronUp,
  ChevronDown,
  Waves,
  Activity,
  Building2,
  Route,
  Wrench,
  AlertTriangle,
  Info,
  Maximize2,
} from 'lucide-react';

export interface ContextualBottomPanelProps {
  selectedFeature: any | null;
  onClose: () => void;
  onZoomTo?: (coords: [number, number]) => void;
  onOpenDetailsModal?: (modalType: string) => void;
}

export const ContextualBottomPanel: React.FC<ContextualBottomPanelProps> = ({
  selectedFeature,
  onClose,
  onZoomTo,
  onOpenDetailsModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!selectedFeature) return null;

  const category = selectedFeature.category || 'feature';
  const properties = selectedFeature.properties || {};
  const coordinates = selectedFeature.coordinates;

  // Extract human-friendly metadata based on feature category
  let badgeLabel = 'Selected Feature';
  let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
  let Icon = Info;
  let title = properties.name || properties.title || 'Feature Details';
  let metrics: Array<{ label: string; value: string; highlight?: boolean }> = [];

  if (category === 'cwc_gauge') {
    badgeLabel = 'River Telemetry Gauge';
    badgeColor = 'bg-cyan-100 text-cyan-800 border-cyan-200';
    Icon = Waves;
    title = properties.stationName || 'CWC River Gauge';
    metrics = [
      { label: 'River', value: properties.river || 'Vamsadhara' },
      { label: 'Current Level', value: properties.currentWaterLevel_m !== undefined ? `${properties.currentWaterLevel_m.toFixed(2)} m` : 'N/A', highlight: true },
      { label: 'Warning Threshold', value: properties.warningLevel_m !== undefined ? `${properties.warningLevel_m.toFixed(2)} m` : '37.0 m' },
      { label: 'Danger Threshold', value: properties.dangerLevel_m !== undefined ? `${properties.dangerLevel_m.toFixed(2)} m` : '38.5 m' },
    ];
  } else if (category === 'building') {
    badgeLabel = 'Building Footprint';
    badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
    Icon = Building2;
    title = properties.name || `Building (${properties.type || 'Structure'})`;
    metrics = [
      { label: 'Type', value: (properties.type || 'Residential').toUpperCase() },
      { label: 'Ground Elev', value: properties.groundElevation_m !== undefined ? `${properties.groundElevation_m} m` : 'N/A' },
      { label: 'Plinth Height', value: properties.plinthHeight_cm !== undefined ? `${properties.plinthHeight_cm} cm` : 'N/A' },
      { label: 'Occupancy', value: properties.estimatedOccupants !== undefined ? `${properties.estimatedOccupants} persons` : 'N/A' },
    ];
  } else if (category === 'road') {
    badgeLabel = 'Road Segment';
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
    Icon = Route;
    title = properties.name || 'Road Network Link';
    metrics = [
      { label: 'Classification', value: properties.type || 'Panchayat Road' },
      { label: 'Inundation Depth', value: properties.waterDepth_m !== undefined ? `${properties.waterDepth_m.toFixed(2)} m` : '0.00 m', highlight: properties.waterDepth_m > 0 },
      { label: 'Passability', value: properties.impassable ? 'Impassable' : 'Passable', highlight: properties.impassable },
      { label: 'Segment Length', value: properties.length_m ? `${Math.round(properties.length_m)} m` : 'N/A' },
    ];
  } else if (category === 'flood_inundation' || category === 'simulation_result') {
    badgeLabel = 'Simulated Flood Extent';
    badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
    Icon = Waves;
    title = properties.name || 'Simulated Inundation Zone';
    metrics = [
      { label: 'Water Depth', value: properties.waterDepth_m !== undefined ? `${properties.waterDepth_m.toFixed(2)} m` : 'N/A', highlight: true },
      { label: 'Scenario', value: properties.scenario || 'Design Storm (65 mm/h)' },
      { label: 'Peak Hour', value: properties.peakHour !== undefined ? `Hour ${properties.peakHour}` : 'Hour 4' },
      { label: 'Model', value: '2D Hydrodynamics' },
    ];
  } else if (category === 'smart_intervention' || category === 'candidate_site') {
    badgeLabel = 'Infrastructure Site';
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    Icon = Wrench;
    title = properties.name || properties.title || 'Safe Site';
    metrics = [
      { label: 'Purpose', value: properties.category || properties.type || 'Civil Asset' },
      { label: 'Suitability', value: properties.suitabilityScore ? `${properties.suitabilityScore}/100` : 'High', highlight: true },
      { label: 'Elevation', value: properties.elevation_m ? `${properties.elevation_m} m` : 'Elevated' },
      { label: 'Priority', value: properties.priority || 'High' },
    ];
  } else if (category === 'earthquake') {
    badgeLabel = 'USGS / NCS Earthquake';
    badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
    Icon = Activity;
    title = properties.title || `M ${properties.magnitude} Earthquake`;
    metrics = [
      { label: 'Magnitude', value: `M ${properties.magnitude}`, highlight: true },
      { label: 'Depth', value: `${properties.depth_km} km` },
      { label: 'Distance', value: properties.distance_km ? `${Math.round(properties.distance_km)} km` : 'Regional' },
      { label: 'Agency', value: properties.source || 'USGS / NCS' },
    ];
  } else if (category === 'hazard_impact_zone' || category === 'hazard_zone') {
    badgeLabel = 'Hazard Impact Zone';
    badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
    Icon = AlertTriangle;
    title = properties.zoneName || 'Dynamic Hazard Area';
    metrics = [
      { label: 'Hazard', value: (properties.hazardType || 'Multi-Hazard').toUpperCase() },
      { label: 'Risk Level', value: (properties.riskLevel || 'High').toUpperCase(), highlight: true },
      { label: 'Exposed Population', value: properties.exposedPopulation ? `${properties.exposedPopulation}` : 'N/A' },
      { label: 'Study Scope', value: properties.scope || 'Gram Panchayat' },
    ];
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl animate-in slide-in-from-bottom duration-200 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-3 sm:p-3.5 text-xs text-slate-800">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Icon className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                  {badgeLabel}
                </span>
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate mt-0.5">
                {title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {coordinates && onZoomTo && (
              <button
                onClick={() => onZoomTo(coordinates)}
                className="px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                title="Zoom to location"
              >
                <Navigation className="w-3 h-3 text-blue-600" />
                <span className="hidden sm:inline">Zoom</span>
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 pt-2 border-t border-slate-100">
          {metrics.map((m, idx) => (
            <div key={idx} className="p-1.5 bg-slate-50/80 rounded-lg border border-slate-100/80">
              <div className="text-[10px] text-slate-500 truncate">{m.label}</div>
              <div className={`text-xs font-bold mt-0.5 truncate ${m.highlight ? 'text-blue-700' : 'text-slate-800'}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Expanded Technical Details */}
        {isExpanded && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 animate-in fade-in">
            {properties.description && (
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                {properties.description}
              </p>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>GeoJSON ID: {properties.id || properties.osm_id || 'N/A'}</span>
              <span>Coordinates: {coordinates ? `${coordinates[1].toFixed(4)}°N, ${coordinates[0].toFixed(4)}°E` : 'Polygon feature'}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
