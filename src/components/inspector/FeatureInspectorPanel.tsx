import React from 'react';
import {
  X,
  MapPin,
  Route,
  Waves,
  Activity,
  Compass,
  AlertTriangle,
  Droplets,
  ExternalLink,
  ShieldAlert,
  Database,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import type { HazardAssessment } from '../../types/hazard';

export interface InspectorFeature {
  category:
    | 'road'
    | 'water_body'
    | 'drainage'
    | 'retention_pond'
    | 'flood_inundation'
    | 'hazard_zone'
    | 'smart_intervention'
    | 'candidate_site'
    | 'earthquake'
    | 'boundary'
    | 'active_hazard';
  properties: any;
  geometry?: any;
  coordinates?: [number, number]; // [lng, lat]
}

interface FeatureInspectorPanelProps {
  feature: InspectorFeature | null;
  activeHazardDetail?: HazardAssessment;
  villageName: string;
  onClose: () => void;
  onLocateOnMap?: (coords: [number, number]) => void;
  onOpenInfrastructureModal?: () => void;
  onOpenSimulationModal?: () => void;
}

export const FeatureInspectorPanel: React.FC<FeatureInspectorPanelProps> = ({
  feature,
  activeHazardDetail,
  villageName,
  onClose,
  onLocateOnMap,
  onOpenInfrastructureModal,
  onOpenSimulationModal,
}) => {
  if (!feature) return null;

  const { category, properties, coordinates } = feature;

  // Resolve Category Badge & Header
  const getCategoryMeta = () => {
    switch (category) {
      case 'road':
        return {
          label: 'Road Transport Corridor',
          color: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Route className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'water_body':
        return {
          label: 'Catchment Water Body',
          color: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          icon: <Waves className="w-3.5 h-3.5 text-cyan-600" />,
        };
      case 'drainage':
        return {
          label: 'Stormwater Drainage Channel',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <Droplets className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'retention_pond':
        return {
          label: 'Percolation Basin / Pond',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <Droplets className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'flood_inundation':
        return {
          label: 'Simulated Inundation Zone',
          color: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Waves className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'hazard_zone':
        return {
          label: 'Multi-Hazard Risk Zone',
          color: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'smart_intervention':
        return {
          label: 'Planned Engineering Asset',
          color: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />,
        };
      case 'candidate_site':
        return {
          label: `Rank #${properties.rank || 1} Candidate Site`,
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <Compass className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'earthquake':
        return {
          label: 'USGS Seismicity Event',
          color: 'bg-red-50 text-red-800 border-red-200',
          icon: <Activity className="w-3.5 h-3.5 text-red-600" />,
        };
      case 'boundary':
        return {
          label: 'Administrative Survey Boundary',
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: <MapPin className="w-3.5 h-3.5 text-slate-600" />,
        };
      case 'active_hazard':
      default:
        return {
          label: 'National Hazard Assessment',
          color: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />,
        };
    }
  };

  const meta = getCategoryMeta();

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-84 sm:w-96 z-40 bg-white border-l border-slate-200 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-150 text-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${meta.color}`}
            >
              {meta.icon}
              <span>{meta.label}</span>
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug truncate" title={properties.name || properties.title}>
            {properties.name || properties.title || 'Feature Details'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {villageName} Digital Twin Workspace
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs divide-y divide-slate-100">
        
        {/* Coordinates Strip */}
        {coordinates && (
          <div className="pb-3 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            <div className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-mono text-[11px] text-slate-800">
                {coordinates[1].toFixed(5)}° N, {coordinates[0].toFixed(5)}° E
              </span>
            </div>
            {onLocateOnMap && (
              <button
                onClick={() => onLocateOnMap(coordinates)}
                className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
              >
                Center Map
              </button>
            )}
          </div>
        )}

        {/* Feature-Specific Parameters */}
        <div className="pt-3 space-y-2">
          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
            Physical Attributes & Metrics
          </h4>

          {category === 'road' && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Classification</span>
                <span className="font-semibold text-slate-800">{properties.roadType}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Length</span>
                <span className="font-semibold text-slate-800">{properties.length_m} meters</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Surface Material</span>
                <span className="font-semibold text-slate-800">{properties.surface || 'Asphalt/Concrete'}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Evacuation Corridor</span>
                <span className="font-semibold text-blue-700">{properties.isEvacuationCorridor ? 'Designated Route' : 'Local Access'}</span>
              </div>
            </div>
          )}

          {category === 'flood_inundation' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-blue-50/60 p-2 rounded border border-blue-100">
                  <span className="text-blue-600 block text-[10px]">Peak Water Depth</span>
                  <span className="font-bold text-blue-900 text-sm">
                    {properties.waterDepth_m} m ({Math.round(properties.waterDepth_m * 100)} cm)
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Severity Tier</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {properties.waterDepth_m > 0.5 ? 'Severe (>50cm)' : properties.waterDepth_m > 0.2 ? 'Moderate (20-50cm)' : 'Low (<20cm)'}
                  </span>
                </div>
              </div>
              {properties.description && (
                <p className="text-slate-600 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200/80 leading-relaxed">
                  {properties.description}
                </p>
              )}
            </div>
          )}

          {category === 'candidate_site' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-emerald-50/60 p-2 rounded border border-emerald-100">
                  <span className="text-emerald-700 block text-[10px]">Suitability Score</span>
                  <span className="font-bold text-emerald-900 text-sm">{properties.suitabilityScore} / 100</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Estimated Cost</span>
                  <span className="font-bold text-slate-900 text-sm">₹{properties.estimatedCostLakhs} Lakhs</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Beneficiaries</span>
                  <span className="font-semibold text-slate-800">~{properties.expectedBeneficiaries?.toLocaleString()} persons</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Site Elevation</span>
                  <span className="font-semibold text-slate-800">{properties.elevation_m} m AMSL</span>
                </div>
              </div>
              {properties.justification && (
                <p className="text-slate-700 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                  {properties.justification}
                </p>
              )}
            </div>
          )}

          {category === 'smart_intervention' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-purple-50 p-2 rounded border border-purple-100">
                  <span className="text-purple-700 block text-[10px]">Risk Reduction</span>
                  <span className="font-bold text-purple-900 text-sm">-{properties.riskReductionPercent}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Estimated Cost</span>
                  <span className="font-bold text-slate-900 text-sm">₹{properties.estimatedCostLakhs} L</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Benefit-Cost Ratio</span>
                  <span className="font-semibold text-emerald-700">{properties.benefitCostRatio} : 1.0</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Lifespan</span>
                  <span className="font-semibold text-slate-800">{properties.lifespanYears} years</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 block mb-0.5">Engineering Specifications</span>
                <span className="font-mono text-slate-800">{properties.technicalSpecs}</span>
              </div>
            </div>
          )}

          {category === 'earthquake' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-rose-50 p-2 rounded border border-rose-100">
                  <span className="text-rose-700 block text-[10px]">Magnitude</span>
                  <span className="font-bold text-rose-900 text-sm">M {properties.mag?.toFixed(1)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Focal Depth</span>
                  <span className="font-semibold text-slate-800">{properties.depthKm} km</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Distance to Village</span>
                  <span className="font-semibold text-blue-700">
                    {properties.distanceKm !== null && properties.distanceKm !== undefined ? `${properties.distanceKm} km` : 'Calculated'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Event Epoch</span>
                  <span className="font-semibold text-slate-800">{new Date(properties.time).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              {properties.url && (
                <div className="pt-1">
                  <a
                    href={properties.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold"
                  >
                    <span>View Official USGS Seismicity Bulletin</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {category === 'hazard_zone' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-rose-50 p-2 rounded border border-rose-100">
                  <span className="text-rose-700 block text-[10px]">Assessed Risk Level</span>
                  <span className="font-bold text-rose-900 uppercase">{properties.riskLevel}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Hazard Family</span>
                  <span className="font-semibold text-slate-800 capitalize">{properties.hazardType}</span>
                </div>
              </div>
              {properties.description && (
                <p className="text-slate-700 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                  {properties.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Data Provenance & Source Attribution */}
        <div className="pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wide">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Data Provenance & Scientific Basis</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Source Provider:</span>
              <span className="font-semibold text-slate-800 text-right">
                {category === 'earthquake'
                  ? 'USGS Earthquake Hazards Program'
                  : category === 'candidate_site' || category === 'smart_intervention'
                  ? 'GSI Terrain Analysis & CPWD Schedule of Rates'
                  : category === 'flood_inundation'
                  ? 'Dynamic Catchment Hydrological Solver'
                  : 'OpenStreetMap & Survey of India'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Classification:</span>
              <span className="font-medium text-slate-700">
                {category === 'earthquake'
                  ? 'Real-Time Measured Observation'
                  : category === 'flood_inundation'
                  ? 'Calibrated Simulation Output'
                  : category === 'candidate_site'
                  ? 'Multi-Criteria Decision Analysis'
                  : 'Georeferenced Vector Dataset'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Spatial Precision:</span>
              <span className="font-mono text-slate-700">Sub-village catchment (30m)</span>
            </div>
          </div>
        </div>

        {/* Scientific Limitations & Assumptions */}
        <div className="pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] uppercase tracking-wide">
            <Info className="w-3.5 h-3.5 text-amber-600" />
            <span>Assumptions & Operational Limitations</span>
          </div>
          <div className="bg-amber-50/60 rounded-lg p-2.5 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
            {category === 'candidate_site' ? (
              <p>
                Candidate infrastructure rankings and budgets represent planning-level estimates. Ground geotechnical borehole investigation, structural design review by state PWD, and Gram Panchayat land acquisition clearance are required prior to DPR sanctions.
              </p>
            ) : category === 'flood_inundation' ? (
              <p>
                Hydraulic inundation is modeled using a rational-depression solver calibrated to CartoDEM elevation and rainfall intensity. Local micro-embankments, unmapped field bunds, and roadside culverts may alter localized flow paths.
              </p>
            ) : (
              <p>
                Geospatial geometries reflect verified OpenStreetMap and administrative surveys. Unmapped features are explicitly identified and never synthetically fabricated.
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Footer */}
        <div className="pt-3 flex items-center gap-2">
          {category === 'candidate_site' && onOpenInfrastructureModal && (
            <button
              onClick={onOpenInfrastructureModal}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>Compare All Candidate Sites</span>
            </button>
          )}
          {category === 'flood_inundation' && onOpenSimulationModal && (
            <button
              onClick={onOpenSimulationModal}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Adjust Storm Scenario</span>
            </button>
          )}
        </div>

      </div>
    </aside>
  );
};
