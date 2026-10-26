import React, { useState } from 'react';
import {
  Waves,
  CloudRain,
  Wind,
  Activity,
  LifeBuoy,
  Mountain,
  Sun,
  Flame,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Info,
  Radio,
  Clock,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Navigation,
  Zap,
} from 'lucide-react';
import type { HazardType, MultiHazardSummary, HazardAssessment, RiskLevel } from '../../types/hazard';
import type { VillageCycloneWindAssessment } from '../../types/imdCycloneWind';
import type { ImdRainfallTelemetry, CwcRiverGaugeStation } from '../../types/flood';
import type { ParsedNdmaSachetAlert } from '../../services/ndmaSachetService';
import {
  formatExpiryDateTime,
  formatSachetWarning,
  translateIndicAlertTextToEnglish,
  translateIndicAreaDescriptionToEnglish,
} from '../../services/alertTranslationService';

export type SimpleHazardStatus =
  | 'active_warning'
  | 'elevated_risk'
  | 'no_active_warning'
  | 'historical_risk'
  | 'data_unavailable'
  | 'not_applicable';

interface HazardCardConfig {
  id: string;
  type: HazardType;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const HAZARD_CARDS: HazardCardConfig[] = [
  { id: 'flood', type: 'flood', label: 'Flood', sublabel: 'Riverine overflow & inundation', icon: Waves },
  { id: 'heavy_rain', type: 'waterlogging', label: 'Heavy Rain', sublabel: 'Extreme precipitation & downpour', icon: CloudRain },
  { id: 'cyclone', type: 'cyclone', label: 'Cyclone', sublabel: 'Tropical storm & coastal gale', icon: Wind },
  { id: 'earthquake', type: 'earthquake', label: 'Earthquake', sublabel: 'Seismic tremors & ground motion', icon: Activity },
  { id: 'tsunami', type: 'tsunami', label: 'Tsunami', sublabel: 'Oceanic wave run-up', icon: LifeBuoy },
  { id: 'landslide', type: 'landslide', label: 'Landslide', sublabel: 'Slope failure & debris flow', icon: Mountain },
  { id: 'drought', type: 'drought', label: 'Drought', sublabel: 'Soil moisture & rain deficit', icon: Sun },
  { id: 'heatwave', type: 'heatwave', label: 'Heatwave', sublabel: 'Extreme ambient temperature', icon: Flame },
  { id: 'waterlogging', type: 'waterlogging', label: 'Waterlogging', sublabel: 'Urban/village ponding & blocked drains', icon: Droplets },
];

export function deriveSimpleHazardStatus(
  assessment?: HazardAssessment | null,
  locationContext?: { district?: string; state?: string; name?: string }
): {
  status: SimpleHazardStatus;
  statusLabel: string;
  badgeClass: string;
  headline: string;
  safetySentence: string;
  affectedArea: string;
  warningLevel: string;
  issuedBy: string;
  validUntil: string;
  explanation: string;
  recommendedAction: string;
  source: string;
  updatedTime: string;
  moreDetails?: {
    technicalSummary?: string;
    bulletinIdentifier?: string;
    issuedAt?: string;
    sourceUrl?: string;
    originalLanguageText?: string;
    originalLanguageName?: string;
  };
} {
  const locName = locationContext?.name || 'Local settlement';
  const locDistrict = locationContext?.district || 'District';
  const locState = locationContext?.state || 'State';
  const defaultArea = `${locName}, ${locDistrict}, ${locState}`;

  if (!assessment) {
    const headline = 'Latest warning could not be verified';
    const safetySentence =
      'We could not confirm the latest warning for this location. Check official disaster-management updates.';
    return {
      status: 'data_unavailable',
      statusLabel: 'Data unavailable',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      headline,
      safetySentence,
      affectedArea: defaultArea,
      warningLevel: 'Unverified · Data unavailable',
      issuedBy: 'Official feeds connecting',
      validUntil: 'Telemetry offline',
      explanation: safetySentence,
      recommendedAction: 'Check official local disaster-management updates and panchayat bulletins.',
      source: 'Government Feeds (Connecting / Ungauged)',
      updatedTime: 'Unavailable',
    };
  }

  // 1. Physically Not Applicable Check
  if (assessment.isGeographicallyApplicable === false) {
    const headline = 'Hazard not applicable to local terrain';
    const safetySentence =
      assessment.applicabilityRationale ||
      'This hazard is physically inapplicable to local terrain and geography. No emergency action is required.';
    return {
      status: 'not_applicable',
      statusLabel: 'Not applicable',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      headline,
      safetySentence,
      affectedArea: defaultArea,
      warningLevel: 'Not applicable · Terrain verified',
      issuedBy: assessment.provenance?.source || 'Geological Survey of India / Scientific Baselines',
      validUntil: 'Static terrain baseline',
      explanation: safetySentence,
      recommendedAction: 'No hazard mitigation required for this physical factor.',
      source: assessment.provenance?.source || 'Geological Survey of India / Scientific Baselines',
      updatedTime: 'Verified Static Terrain Baseline',
    };
  }

  // 2. Active Government Warning (IMD / CWC / NDMA)
  const alert = assessment.officialWarning;
  if (alert?.alertStage && alert.alertStage !== 'no_warning') {
    const rawArea = alert.geographicCoverage || `${locDistrict}, ${locState}`;
    const cleanArea = translateIndicAreaDescriptionToEnglish(rawArea, defaultArea);
    const agency =
      alert.agency === 'IMD'
        ? 'India Meteorological Department (IMD)'
        : alert.agency === 'CWC'
        ? 'Central Water Commission (CWC)'
        : alert.agency || 'Government Disaster Management Authority';
    const validUntilFormatted = formatExpiryDateTime(alert.validUntil);

    let headline = 'Official warning in effect — follow instructions';
    let safetySentence =
      alert.officialInstructions?.[0] ||
      alert.advisoryText ||
      'Follow official advisories and evacuation instructions from local authorities.';

    const hType = (assessment.hazardType || '').toLowerCase();
    if (hType === 'flood') {
      headline = 'Flood warning — avoid flooded areas';
      safetySentence =
        'Flooding has been indicated by the applicable official warning. Avoid flooded roads and follow local authorities instructions.';
    } else if (hType === 'cyclone') {
      headline = 'Cyclone warning — follow official instructions';
      safetySentence =
        'A cyclone warning applies to the stated area. Follow the latest official advisory and evacuation instructions from local authorities.';
    } else if (hType === 'waterlogging') {
      headline = 'Heavy rain possible — stay alert';
      safetySentence =
        'Heavy rain may affect the area during the stated forecast period. Follow official updates and avoid crossing flooded roads or streams.';
    }

    const warningLevel = `${alert.alertStage.charAt(0).toUpperCase() + alert.alertStage.slice(1).toLowerCase()} · ${alert.warningColor ? alert.warningColor.toUpperCase() : 'Active'}`;

    return {
      status: 'active_warning',
      statusLabel: 'Active warning',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold animate-pulse',
      headline,
      safetySentence,
      affectedArea: cleanArea,
      warningLevel,
      issuedBy: agency,
      validUntil: validUntilFormatted,
      explanation: safetySentence,
      recommendedAction:
        alert.officialInstructions?.[0] ||
        alert.advisoryText ||
        'Avoid flooded roads, secure loose structures, and follow instructions from local authorities.',
      source: `${alert.agency} Authoritative Bulletin`,
      updatedTime: alert.issuedAt ? formatExpiryDateTime(alert.issuedAt) : 'Live Broadcast',
      moreDetails: {
        bulletinIdentifier: alert.bulletinNumber,
        issuedAt: alert.issuedAt ? formatExpiryDateTime(alert.issuedAt) : undefined,
        technicalSummary: alert.advisoryText || 'Official early warning broadcast from authorized national centre.',
        sourceUrl: alert.agency === 'IMD' ? 'https://mausam.imd.gov.in/' : alert.agency === 'CWC' ? 'https://ffs.india-water.gov.in/' : 'https://sachet.ndma.gov.in/',
      },
    };
  }

  // 3. Elevated Live Threat (Derived from recent telemetry or pluvial model)
  if (assessment.activeThreat?.level === 'high' || assessment.activeThreat?.level === 'very_high') {
    const isFlood = assessment.hazardType === 'flood' || assessment.hazardType === 'waterlogging';
    const headline = isFlood
      ? 'Flood risk elevated — avoid low-lying areas'
      : 'Elevated hazard risk — stay alert';
    const safetySentence =
      assessment.activeThreat.summary ||
      'The selected rainfall or telemetry scenario indicates elevated risk. This is a simulation/model estimate, not confirmation of an actual flood.';

    return {
      status: 'elevated_risk',
      statusLabel: 'Elevated risk',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
      headline,
      safetySentence,
      affectedArea: defaultArea,
      warningLevel: `Elevated · ${assessment.activeThreat.threatLabel || 'High'}`,
      issuedBy: `${assessment.modelledImpact?.modelEngine || '2D Hydrodynamic Pluvial Model'} / Live Telemetry`,
      validUntil: assessment.currentObservation?.observedAt
        ? formatExpiryDateTime(assessment.currentObservation.observedAt)
        : 'Recent Run',
      explanation: safetySentence,
      recommendedAction: 'Review emergency supplies, inspect local drainage channels, and monitor official updates.',
      source: `${assessment.modelledImpact?.modelEngine || '2D Hydrodynamic Pluvial Model'} / Live Telemetry`,
      updatedTime: assessment.currentObservation?.observedAt
        ? formatExpiryDateTime(assessment.currentObservation.observedAt)
        : 'Recent Run',
      moreDetails: {
        technicalSummary: assessment.activeThreat.summary || 'Hydraulic catchment calculation based on local digital elevation model.',
      },
    };
  }

  // 4. Data Missing / Incomplete
  if (assessment.evidence?.dataCompleteness === 'missing') {
    const headline = 'Latest warning could not be verified';
    const safetySentence =
      'We could not confirm the latest warning for this location. Check official disaster-management updates.';

    return {
      status: 'data_unavailable',
      statusLabel: 'Data unavailable',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      headline,
      safetySentence,
      affectedArea: defaultArea,
      warningLevel: 'Unverified · Data incomplete',
      issuedBy: 'Authoritative telemetry station unobserved / offline',
      validUntil: 'Telemetry Missing',
      explanation: safetySentence,
      recommendedAction: 'Consult district emergency operation center (DEOC) or local Gram Panchayat bulletins.',
      source: 'Authoritative telemetry station unobserved / offline',
      updatedTime: 'Telemetry Missing',
    };
  }

  // 5. Long-Term Historical Baseline Susceptibility (Atlas Score)
  // Crucial: Separated from active warnings!
  const baselineLevel = assessment.baselineSusceptibility?.level || assessment.riskLevel;
  if (baselineLevel === 'very_high' || baselineLevel === 'high') {
    const headline = 'Historical susceptibility — standard preparedness';
    const safetySentence = `Long-term atlas susceptibility is ${baselineLevel.replace('_', ' ')}. No active warning found today.`;

    return {
      status: 'historical_risk',
      statusLabel: 'Historical risk',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
      headline,
      safetySentence,
      affectedArea: defaultArea,
      warningLevel: `Historical risk · ${baselineLevel.toUpperCase()}`,
      issuedBy: assessment.baselineSusceptibility?.authoritativeStandard || 'NDMA National Multi-Hazard Atlas',
      validUntil: 'Atlas baseline reference (No active emergency)',
      explanation: safetySentence,
      recommendedAction: 'Maintain standard seasonal awareness. No immediate emergency evacuation required today.',
      source: `${assessment.baselineSusceptibility?.authoritativeStandard || 'NDMA National Multi-Hazard Atlas'}`,
      updatedTime: 'Atlas Baseline Reference',
      moreDetails: {
        technicalSummary:
          assessment.baselineSusceptibility?.rationale ||
          `Long-term geographical exposure derived from national hazard atlas (${assessment.baselineSusceptibility?.authoritativeStandard || 'NDMA/BMTPC'}).`,
      },
    };
  }

  // 6. Clean / Normal
  const headline = 'No applicable official warning found';
  const safetySentence =
    'No applicable active warning was found in the available data. This does not guarantee that conditions are safe.';

  return {
    status: 'no_active_warning',
    statusLabel: 'No active warning found',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    headline,
    safetySentence,
    affectedArea: defaultArea,
    warningLevel: 'Normal · No active warning',
    issuedBy: assessment.provenance?.source || 'IMD / CWC / INCOIS Telemetry',
    validUntil: 'Current observation window',
    explanation: safetySentence,
    recommendedAction: 'Normal daily activities. Keep standard family disaster preparedness kit accessible.',
    source: `${assessment.provenance?.source || 'IMD / CWC / INCOIS Telemetry'}`,
    updatedTime: 'Monitors reporting normal flow/weather',
    moreDetails: {
      technicalSummary: 'Connected government telemetry stations and early warning feeds report readings within normal operating thresholds.',
    },
  };
}

interface SimpleHazardSelectorProps {
  hazardSummary: MultiHazardSummary;
  activeHazard: HazardType;
  onSelectHazard: (hazard: HazardType) => void;
  onOpenFullProfiles: () => void;
  cycloneWindAssessment?: VillageCycloneWindAssessment | null;
  imdTelemetry?: ImdRainfallTelemetry | null;
  gauges?: CwcRiverGaugeStation[];
  sachetAlerts?: ParsedNdmaSachetAlert[];
  onFocusWarning?: (hazard: HazardType, assessment: HazardAssessment) => void;
  onFocusCoordinates?: (coords: [number, number], label?: string) => void;
  onOpenCycloneTracking?: () => void;
  onSwitchToSimulate?: (hazard?: 'flood' | 'cyclone') => void;
}

export const SimpleHazardSelector: React.FC<SimpleHazardSelectorProps> = ({
  hazardSummary,
  activeHazard,
  onSelectHazard,
  onOpenFullProfiles,
  cycloneWindAssessment,
  imdTelemetry,
  gauges,
  sachetAlerts = [],
  onFocusWarning,
  onFocusCoordinates,
  onOpenCycloneTracking,
  onSwitchToSimulate,
}) => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const locContext = {
    district: hazardSummary.district,
    state: hazardSummary.villageName,
    name: hazardSummary.villageName,
  };

  // Filter active, non-expired location-specific SACHET alerts
  const activeLocalSachetAlerts = (sachetAlerts || []).filter(
    (a) => !a.isExpired && a.isApplicableToLocation
  );

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
            <span>Hazard Profiles</span>
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Select a hazard to inspect risk and highlight map layer
          </p>
        </div>
        <button
          onClick={onOpenFullProfiles}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
          title="Open scientific hazard assessment matrix"
        >
          <span>Full Matrix</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">

        {/* 1. Active NDMA SACHET Bulletins for this Location (if any) */}
        {activeLocalSachetAlerts.map((rawAlert) => {
          const sachetWarning = formatSachetWarning(rawAlert);
          const isCardExpanded = expandedCardId === sachetWarning.id;
          const isLightning = sachetWarning.hazardType === 'lightning';

          return (
            <div
              key={sachetWarning.id}
              className="p-3 rounded-xl border border-red-300 bg-red-50/50 shadow-2xs text-xs space-y-2 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-red-600 text-white shadow-2xs">
                  {isLightning ? <Zap className="w-4 h-4 fill-white" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-800">
                      Official Warning
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{sachetWarning.validUntil}</span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 mt-0.5 leading-snug">
                    {sachetWarning.headline}
                  </h3>
                  <p className="text-slate-700 text-[11px] mt-1 leading-relaxed">
                    {sachetWarning.safetySentence}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-red-200/60 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (rawAlert.centroid && onFocusCoordinates) {
                      onFocusCoordinates([rawAlert.centroid[1], rawAlert.centroid[0]], sachetWarning.headline);
                    }
                  }}
                  className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>View on Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedCardId(isCardExpanded ? null : sachetWarning.id)}
                  className="text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>{isCardExpanded ? 'Less' : 'Details'}</span>
                  {isCardExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {isCardExpanded && (
                <div className="p-2.5 bg-white/90 rounded-lg border border-red-200 text-[11px] space-y-1 text-slate-700">
                  <div><strong>Affected area:</strong> {sachetWarning.affectedArea}</div>
                  <div><strong>Warning level:</strong> {sachetWarning.warningLevel}</div>
                  <div><strong>Issued by:</strong> {sachetWarning.issuedBy}</div>
                  <div><strong>Valid until:</strong> {sachetWarning.validUntil}</div>
                  {sachetWarning.sourceUrl && (
                    <div className="pt-1">
                      <a href={sachetWarning.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-[10px]">
                        <span>Official Portal</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 2. Compact 9-Hazard Directory */}
        <div className="space-y-1.5">
          {HAZARD_CARDS.map((card) => {
            const assessment = hazardSummary.assessments[card.type];
            const item = deriveSimpleHazardStatus(assessment, locContext);
            const isSelected = activeHazard === card.type;
            const IconComponent = card.icon;

            return (
              <div
                key={card.id}
                className={`rounded-xl border transition-all text-xs overflow-hidden ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                {/* Clickable Header Row */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectHazard(card.type);
                    if (assessment && onFocusWarning) {
                      onFocusWarning(card.type, assessment);
                    }
                  }}
                  className="w-full text-left p-2.5 pb-1.5 flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.status === 'active_warning'
                          ? 'bg-red-600 text-white shadow-2xs'
                          : item.status === 'elevated_risk'
                          ? 'bg-amber-500 text-white'
                          : item.status === 'historical_risk'
                          ? 'bg-blue-600 text-white'
                          : item.status === 'no_active_warning'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 leading-tight">
                        {card.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {card.sublabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${item.badgeClass}`}>
                      {item.statusLabel}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-blue-600' : ''}`} />
                  </div>
                </button>

                {/* Description snippet */}
                <div className="px-2.5 pb-2 text-[11px] text-slate-600 leading-snug line-clamp-2">
                  {item.safetySentence || assessment?.baselineSusceptibility?.rationale || card.sublabel}
                </div>

                {/* Quick Actions Row */}
                <div className="px-2.5 py-1.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectHazard(card.type);
                        if (assessment && onFocusWarning) {
                          onFocusWarning(card.type, assessment);
                        }
                      }}
                      className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-blue-50 transition-colors"
                      title={`View ${card.label} on map`}
                    >
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>View on Map</span>
                    </button>

                    {(card.type === 'flood' || card.type === 'cyclone') && onSwitchToSimulate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwitchToSimulate(card.type === 'flood' ? 'flood' : 'cyclone');
                        }}
                        className="font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-cyan-50 transition-colors"
                        title={`Simulate ${card.label}`}
                      >
                        <Waves className="w-3 h-3 text-cyan-600" />
                        <span>Simulate</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onSelectHazard('' as any);
                      } else {
                        onSelectHazard(card.type);
                      }
                    }}
                    className="text-slate-500 hover:text-slate-800 font-medium py-0.5 px-1.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    {isSelected ? 'Less' : 'Details'}
                  </button>
                </div>

                {/* Only the Selected Hazard Expands its Details */}
                {isSelected && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-white space-y-2.5 text-xs text-slate-700 animate-in fade-in duration-150">
                    {/* Active Warning Section (if warning is active) */}
                    {item.status === 'active_warning' ? (
                      <div className="p-2.5 rounded-lg bg-red-50/70 border border-red-200 space-y-1.5">
                        <div className="font-bold text-red-900 text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{item.headline}</span>
                        </div>
                        <p className="text-slate-800 text-[11px] leading-relaxed">
                          {item.safetySentence}
                        </p>
                        <div className="pt-1.5 border-t border-red-200/60 space-y-0.5 text-[11px]">
                          <div><span className="font-semibold text-slate-900">Affected area:</span> {item.affectedArea}</div>
                          <div><span className="font-semibold text-slate-900">Warning level:</span> {item.warningLevel}</div>
                          <div><span className="font-semibold text-slate-900">Issued by:</span> {item.issuedBy}</div>
                          <div><span className="font-semibold text-slate-900">Valid until:</span> <span className="font-mono">{item.validUntil}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] space-y-1">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{item.headline}</span>
                        </div>
                        <p className="text-slate-600 leading-snug">
                          {item.safetySentence}
                        </p>
                      </div>
                    )}

                    {/* Baseline Susceptibility / Forecast (Clearly Separated) */}
                    {assessment?.baselineSusceptibility && (
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Historical Atlas Baseline
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Susceptibility Tier:</span>
                          <span className="font-bold uppercase text-slate-900">
                            {assessment.baselineSusceptibility.level.replace('_', ' ')} (Score: {assessment.baselineSusceptibility.score}/100)
                          </span>
                        </div>
                        <div className="text-slate-600 text-[10px] leading-relaxed mt-0.5">
                          {assessment.baselineSusceptibility.rationale}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono pt-0.5">
                          Source: {assessment.baselineSusceptibility.authoritativeStandard}
                        </div>
                      </div>
                    )}

                    {/* Cyclone Tool Shortcut */}
                    {card.type === 'cyclone' && onOpenCycloneTracking && (
                      <button
                        type="button"
                        onClick={onOpenCycloneTracking}
                        className="w-full mt-2 py-1.5 px-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        title="Open cyclone track, timeline controller & demonstration mode"
                      >
                        <Wind className="w-3.5 h-3.5" />
                        <span>Track Cyclone & Demonstration Mode</span>
                      </button>
                    )}

                    {/* Quick Action Footer */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (assessment && onFocusWarning) {
                            onFocusWarning(card.type, assessment);
                          }
                        }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Navigation className="w-3 h-3 text-blue-600" />
                        <span>Focus on Map</span>
                      </button>

                      <button
                        type="button"
                        onClick={onOpenFullProfiles}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Evidence Matrix</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

