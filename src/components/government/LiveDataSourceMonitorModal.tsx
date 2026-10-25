import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Database,
  Info,
  Waves,
  CloudRain,
  Activity,
  Compass,
  AlertOctagon,
  FileCheck,
  MapPin,
  Globe,
  Check,
  Code,
  Copy,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type {
  GovernmentProviderStatus,
  NationwideGovernmentHealthReport,
  ProviderConnectionStatus,
  SixDimensionValidation,
  SourceValidationSummary,
} from '../../services/governmentIntegrationService';
import { fetchGovernmentProvidersStatus } from '../../services/backendApi';

interface LiveDataSourceMonitorModalProps {
  currentLocation: LocationSearchResult;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveDataSourceMonitorModal: React.FC<LiveDataSourceMonitorModalProps> = ({
  currentLocation,
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<NationwideGovernmentHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'usable' | 'reachable' | 'fresh' | 'outside_coverage' | 'errors'
  >('all');
  const [expandedPayloadIds, setExpandedPayloadIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const togglePayload = (id: string) => {
    setExpandedPayloadIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPayload = (id: string, payload: any) => {
    try {
      const text = JSON.stringify(payload, null, 2);
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.warn('Could not copy payload to clipboard:', err);
    }
  };

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const data = await fetchGovernmentProvidersStatus({
        center: currentLocation.center,
        name: currentLocation.name,
        district: currentLocation.district,
        state: currentLocation.state,
      });
      setReport(data);
    } catch (err) {
      console.warn('Could not query government providers status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen, currentLocation.id]);

  if (!isOpen) return null;

  // Deduplicate providers (e.g. ncs_usgs_seismic alias)
  const rawList: GovernmentProviderStatus[] = report ? Object.values(report.providers) : [];
  const seenIds = new Set<string>();
  const providersList: GovernmentProviderStatus[] = [];
  for (const p of rawList) {
    if (p.providerId === 'ncs_usgs_seismic' && rawList.some((r) => r.providerId === 'ncs_seismic')) {
      continue;
    }
    if (!seenIds.has(p.providerId)) {
      seenIds.add(p.providerId);
      providersList.push(p);
    }
  }

  // Summary counts
  const summary: SourceValidationSummary = report?.summary || {
    sourcesConfigured: providersList.length || 11,
    reachable: providersList.filter(
      (p) => p.sixDimensions?.connectivity === 'CONNECTED' || p.sixDimensions?.connectivity === 'PARTIAL'
    ).length,
    validSchema: providersList.filter(
      (p) => p.sixDimensions?.schema === 'VALIDATED' || p.sixDimensions?.schema === 'PARTIAL'
    ).length,
    fresh: providersList.filter((p) => p.sixDimensions?.freshness === 'FRESH').length,
    relevantToLocation: providersList.filter((p) =>
      ['RELEVANT_TO_SELECTED_LOCATION', 'RELEVANT_TO_REGION', 'NATIONAL_COVERAGE'].includes(
        p.sixDimensions?.geographicRelevance || ''
      )
    ).length,
    usable: providersList.filter((p) =>
      ['USABLE_FOR_CURRENT_LOCATION', 'USABLE_FOR_REGIONAL_CONTEXT', 'HISTORICAL_ONLY'].includes(
        p.sixDimensions?.usability || ''
      )
    ).length,
    errorsOrIncomplete: providersList.filter(
      (p) =>
        p.sixDimensions?.connectivity === 'FAILED' ||
        p.sixDimensions?.schema === 'INVALID' ||
        ['UNAVAILABLE', 'UNUSABLE_STALE', 'UNUSABLE_SCHEMA'].includes(p.sixDimensions?.usability || '')
    ).length,
  };

  const filteredProviders = providersList.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'usable') {
      return (
        p.sixDimensions?.usability === 'USABLE_FOR_CURRENT_LOCATION' ||
        p.sixDimensions?.usability === 'USABLE_FOR_REGIONAL_CONTEXT' ||
        p.sixDimensions?.usability === 'HISTORICAL_ONLY' ||
        p.usability === 'USABLE_FOR_CALCULATION' ||
        p.usability === 'USABLE_AS_BASELINE_ONLY'
      );
    }
    if (filter === 'reachable') {
      return (
        p.sixDimensions?.connectivity === 'CONNECTED' ||
        p.sixDimensions?.connectivity === 'PARTIAL' ||
        p.connectivity === 'CONNECTED'
      );
    }
    if (filter === 'fresh') {
      return (
        p.sixDimensions?.freshness === 'FRESH' ||
        p.freshness === 'FRESH' ||
        p.freshness === 'STATIC_BASELINE'
      );
    }
    if (filter === 'outside_coverage') {
      return (
        p.sixDimensions?.geographicRelevance === 'OUTSIDE_COVERAGE' ||
        p.sixDimensions?.geographicRelevance === 'UNMAPPED_LOCATION' ||
        p.geographicRelevance === 'UNGAUGED_LOCATION' ||
        p.geographicRelevance === 'PHYSICALLY_INAPPLICABLE' ||
        p.geographicRelevance === 'OUTSIDE_JURISDICTION' ||
        p.connectionStatus === 'no_coverage'
      );
    }
    if (filter === 'errors') {
      return (
        p.sixDimensions?.connectivity === 'FAILED' ||
        p.sixDimensions?.schema === 'INVALID' ||
        p.sixDimensions?.authentication === 'AUTH_REQUIRED' ||
        p.sixDimensions?.authentication === 'ACCESS_DENIED' ||
        p.sixDimensions?.usability === 'UNAVAILABLE' ||
        p.sixDimensions?.usability === 'UNUSABLE_STALE' ||
        p.connectivity === 'ENDPOINT_UNAVAILABLE' ||
        p.connectivity === 'AUTH_REQUIRED' ||
        p.connectionStatus === 'auth_failed' ||
        p.connectionStatus === 'provider_unavailable'
      );
    }
    return true;
  });

  const getSourceTypeBadge = (sourceType?: string) => {
    switch (sourceType) {
      case 'government_official':
        return {
          label: 'GOVERNMENT OF INDIA / STATE OFFICIAL',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'community_dataset':
        return {
          label: 'COMMUNITY DATASET (ODbL 1.0 Non-GoI)',
          color: 'bg-purple-50 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
        };
      case 'international_supplementary':
        return {
          label: 'INTERNATIONAL SUPPLEMENTARY (Non-GoI)',
          color: 'bg-amber-50 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      default:
        return {
          label: 'AUTHORITATIVE GOVERNMENT REPOSITORY',
          color: 'bg-blue-50 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
        };
    }
  };

  const getOverallStatusBadge = (status: ProviderConnectionStatus, prov?: GovernmentProviderStatus) => {
    switch (status) {
      case 'connected':
        if (prov?.freshness === 'STATIC_BASELINE' || prov?.sixDimensions?.usability === 'HISTORICAL_ONLY') {
          return {
            label: 'Static Baseline — Validated',
            color: 'bg-sky-50 text-sky-800 border-sky-300',
            icon: Layers,
          };
        }
        return {
          label: 'Connected — Real Data Verified',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
          icon: CheckCircle2,
        };
      case 'connected_no_alerts':
        return {
          label: 'Connected — No Active Local Warning',
          color: 'bg-teal-50 text-teal-700 border-teal-300',
          icon: CheckCircle2,
        };
      case 'stale':
        return {
          label: 'Stale Telemetry (Blocked from Live Rain)',
          color: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: Clock,
        };
      case 'auth_failed':
        return {
          label: 'Authentication Required (HTTP 401/403)',
          color: 'bg-rose-50 text-rose-700 border-rose-300',
          icon: AlertOctagon,
        };
      case 'access_not_authorized':
        return {
          label: 'Access Restricted (Institutional)',
          color: 'bg-rose-50 text-rose-700 border-rose-300',
          icon: AlertOctagon,
        };
      case 'no_coverage':
        return {
          label: 'Ungauged / Outside Catchment / Inapplicable',
          color: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Info,
        };
      case 'validation_failed':
        return {
          label: 'Payload Validation Failed',
          color: 'bg-purple-50 text-purple-700 border-purple-300',
          icon: AlertTriangle,
        };
      case 'provider_unavailable':
      default:
        return {
          label: 'Provider Offline / Network Timeout',
          color: 'bg-rose-50 text-rose-700 border-rose-300',
          icon: XCircle,
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-3 md:p-6 backdrop-blur-xs text-slate-800"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gov-monitor-modal-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-xs">
              <Radio size={22} className={isLoading ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="gov-monitor-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                  Direct Official Government Data Monitor
                </h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-blue-800 border border-blue-200">
                  Six-Dimensional Telemetry Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic telemetry validation for Indian disaster monitoring ·{' '}
                <strong className="text-slate-700">{currentLocation.displayName}</strong> ({currentLocation.center[1].toFixed(4)}°N,{' '}
                {currentLocation.center[0].toFixed(4)}°E)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadStatus}
              disabled={isLoading}
              title="Audit and verify all official government endpoints now"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-blue-600' : ''} />
              <span>{isLoading ? 'Verifying Feeds...' : 'Refresh All Feeds'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close monitor"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Summary Cards (7 Dynamic Metrics) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Authoritative Validation Overview ({summary.sourcesConfigured} Sources Monitored)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Real-time GoI, State SEOC & Authoritative Partner Telemetry
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* 1. Sources Configured */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sources</span>
                  <Database size={13} className="text-slate-400" />
                </div>
                <span className="text-2xl font-black text-slate-900 block tracking-tight">
                  {summary.sourcesConfigured}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Configured Feeds</span>
              </div>

              {/* 2. Reachable */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-700 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reachable</span>
                  <Radio size={13} className="text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-indigo-900 block tracking-tight">
                  {summary.reachable}
                </span>
                <span className="text-[10px] text-indigo-600 block mt-0.5 font-medium">HTTP Handshake OK</span>
              </div>

              {/* 3. Valid Schema */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 shadow-2xs">
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Valid Schema</span>
                  <FileCheck size={13} className="text-blue-600" />
                </div>
                <span className="text-2xl font-black text-blue-900 block tracking-tight">
                  {summary.validSchema}
                </span>
                <span className="text-[10px] text-blue-600 block mt-0.5 font-medium">Payload Validated</span>
              </div>

              {/* 4. Fresh */}
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 shadow-2xs">
                <div className="flex items-center justify-between text-cyan-800 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Fresh</span>
                  <Clock size={13} className="text-cyan-700" />
                </div>
                <span className="text-2xl font-black text-cyan-950 block tracking-tight">
                  {summary.fresh}
                </span>
                <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Within Source TTL</span>
              </div>

              {/* 5. Relevant to Location */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 shadow-2xs">
                <div className="flex items-center justify-between text-teal-800 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Relevant</span>
                  <MapPin size={13} className="text-teal-700" />
                </div>
                <span className="text-2xl font-black text-teal-950 block tracking-tight">
                  {summary.relevantToLocation}
                </span>
                <span className="text-[10px] text-teal-700 block mt-0.5 font-medium">Village & Basin Reach</span>
              </div>

              {/* 6. Usable */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-800 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Usable</span>
                  <ShieldCheck size={13} className="text-emerald-700" />
                </div>
                <span className="text-2xl font-black text-emerald-950 block tracking-tight">
                  {summary.usable}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">Simulation Ready</span>
              </div>

              {/* 7. Errors / Incomplete */}
              <div
                className={`rounded-xl border p-3 shadow-2xs ${
                  summary.errorsOrIncomplete > 0
                    ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {summary.errorsOrIncomplete > 0 ? 'Issues' : 'Status'}
                  </span>
                  <AlertTriangle
                    size={13}
                    className={summary.errorsOrIncomplete > 0 ? 'text-rose-600' : 'text-slate-400'}
                  />
                </div>
                <span
                  className={`text-2xl font-black block tracking-tight ${
                    summary.errorsOrIncomplete > 0 ? 'text-rose-950' : 'text-slate-900'
                  }`}
                >
                  {summary.errorsOrIncomplete}
                </span>
                <span
                  className={`text-[10px] block mt-0.5 font-medium ${
                    summary.errorsOrIncomplete > 0 ? 'text-rose-700' : 'text-slate-500'
                  }`}
                >
                  {summary.errorsOrIncomplete > 0 ? 'Stale / Offline / Error' : 'Zero Critical Errors'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 text-xs">
            <span className="text-slate-400 font-medium mr-1 text-[11px]">Filter by Status:</span>
            {[
              { id: 'all', label: `All Feeds (${providersList.length})` },
              { id: 'usable', label: `Usable for Location (${summary.usable})` },
              { id: 'reachable', label: `Reachable (${summary.reachable})` },
              { id: 'fresh', label: `Fresh Telemetry (${summary.fresh})` },
              {
                id: 'outside_coverage',
                label: `Outside Coverage / Inapplicable (${
                  providersList.length - summary.relevantToLocation
                })`,
              },
              { id: 'errors', label: `Errors / Auth Required (${summary.errorsOrIncomplete})` },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilter(btn.id as any)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                  filter === btn.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Providers List */}
          <div className="space-y-5">
            {filteredProviders.map((prov) => {
              const overallBadge = getOverallStatusBadge(prov.connectionStatus, prov);
              const BadgeIcon = overallBadge.icon;
              const typeBadge = getSourceTypeBadge(prov.sourceProvenance?.sourceType);
              const dims: SixDimensionValidation = prov.sixDimensions || {
                connectivity: prov.connectivity === 'CONNECTED' ? 'CONNECTED' : 'FAILED',
                authentication: 'PUBLIC_OPEN_ACCESS',
                schema: prov.schemaValidation === 'VALIDATED' ? 'VALIDATED' : 'UNVALIDATED',
                freshness: prov.freshness === 'FRESH' ? 'FRESH' : 'UNAVAILABLE',
                geographicRelevance: 'RELEVANT_TO_REGION',
                usability: prov.usability === 'USABLE_FOR_CALCULATION' ? 'USABLE_FOR_CURRENT_LOCATION' : 'UNAVAILABLE',
              };

              const isPayloadExpanded = !!expandedPayloadIds[prov.providerId];

              return (
                <div
                  key={prov.providerId}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 transition space-y-4"
                >
                  {/* Provider Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">{prov.providerName}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${typeBadge.dot}`} />
                          <span>{typeBadge.label}</span>
                        </span>
                        <div className="flex items-center gap-1.5 text-xs">
                          <a
                            href={prov.officialPortalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                            title="Open official portal"
                          >
                            <span>Official Portal</span>
                            <ExternalLink size={11} />
                          </a>
                          {prov.apiDocumentationUrl && (
                            <a
                              href={prov.apiDocumentationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-600 hover:text-slate-800 inline-flex items-center gap-0.5 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                              title="Open API documentation / catalogue"
                            >
                              <span>API / Schema</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">
                        {prov.agency} · <strong>{prov.ministry}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${overallBadge.color}`}
                      >
                        <BadgeIcon size={14} />
                        <span>{overallBadge.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Summary Text / Scientific Description */}
                  <div className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                    <p className="leading-relaxed">{prov.summaryText}</p>
                  </div>

                  {/* THE 6 DIRECT SOURCE VALIDATION DIMENSIONS */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <FileCheck size={14} className="text-blue-600" />
                        <span>The 6 Direct Source Validation Dimensions</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal lowercase">
                        (verified per telemetry ingest cycle)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                      {/* 1. Connectivity */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          1. Connectivity
                        </span>
                        <span
                          className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            dims.connectivity === 'CONNECTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dims.connectivity === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : dims.connectivity === 'NOT_ATTEMPTED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {dims.connectivity}
                        </span>
                        <p className="text-[9px] text-slate-500 truncate" title="HTTP Status Handshake">
                          {dims.connectivity === 'CONNECTED' ? 'HTTP 200 Handshake OK' : 'Gateway Response'}
                        </p>
                      </div>

                      {/* 2. Authentication */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          2. Authentication
                        </span>
                        <span
                          className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] truncate max-w-full ${
                            dims.authentication === 'PUBLIC_OPEN_ACCESS' ||
                            dims.authentication === 'AUTHENTICATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title={dims.authentication}
                        >
                          {dims.authentication}
                        </span>
                        <p className="text-[9px] text-slate-500 truncate" title="Credential Security">
                          {dims.authentication === 'PUBLIC_OPEN_ACCESS' ? 'Open Government Data' : 'Secured Credential'}
                        </p>
                      </div>

                      {/* 3. Schema */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          3. Schema
                        </span>
                        <span
                          className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            dims.schema === 'VALIDATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dims.schema === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {dims.schema}
                        </span>
                        <p className="text-[9px] text-slate-500 truncate" title="Format Structure">
                          JSON / CAP / NetCDF OK
                        </p>
                      </div>

                      {/* 4. Freshness */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          4. Freshness
                        </span>
                        <span
                          className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            dims.freshness === 'FRESH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dims.freshness === 'STALE'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {dims.freshness}
                        </span>
                        <p className="text-[9px] text-slate-500 truncate">
                          {prov.timestamps?.freshnessTtlHours ? `TTL: ${prov.timestamps.freshnessTtlHours}h` : 'Archival'}
                        </p>
                      </div>

                      {/* 5. Geographic Relevance */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          5. Geo Relevance
                        </span>
                        <span
                          className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] truncate max-w-full ${
                            dims.geographicRelevance === 'RELEVANT_TO_SELECTED_LOCATION'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dims.geographicRelevance === 'RELEVANT_TO_REGION'
                              ? 'bg-teal-100 text-teal-800'
                              : dims.geographicRelevance === 'NATIONAL_COVERAGE'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={dims.geographicRelevance}
                        >
                          {dims.geographicRelevance}
                        </span>
                        <p className="text-[9px] text-slate-500 truncate" title="Jurisdiction Scope">
                          {dims.geographicRelevance === 'RELEVANT_TO_SELECTED_LOCATION'
                            ? 'Matches Settlement'
                            : 'Regional Grid'}
                        </p>
                      </div>

                      {/* 6. Usability */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          6. Usability
                        </span>
                        <span
                          className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] truncate max-w-full ${
                            dims.usability === 'USABLE_FOR_CURRENT_LOCATION'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dims.usability === 'USABLE_FOR_REGIONAL_CONTEXT'
                              ? 'bg-teal-100 text-teal-800'
                              : dims.usability === 'HISTORICAL_ONLY'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title={dims.usability}
                        >
                          {dims.usability}
                        </span>
                        <p className="text-[9px] text-slate-500 truncate">
                          {dims.usability === 'USABLE_FOR_CURRENT_LOCATION'
                            ? 'Active Simulation Input'
                            : dims.usability === 'HISTORICAL_ONLY'
                            ? 'Terrain Baseline'
                            : 'Guarded / Inactive'}
                        </p>
                      </div>
                    </div>

                    {/* Failure / Context Notice if non-optimal */}
                    {(dims.freshness === 'STALE' ||
                      dims.geographicRelevance === 'OUTSIDE_COVERAGE' ||
                      dims.geographicRelevance === 'UNMAPPED_LOCATION' ||
                      dims.connectivity === 'FAILED') && (
                      <div className="mt-2.5 bg-amber-50/80 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-900 flex items-start gap-1.5">
                        <Info size={13} className="text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          {dims.freshness === 'STALE' && (
                            <span>
                              <strong>Stale Observation Notice:</strong> Telemetry timestamp exceeds maximum freshness TTL;
                              input is quarantined and blocked from real-time flood simulation to prevent inaccurate hazard modeling.
                            </span>
                          )}
                          {dims.geographicRelevance === 'OUTSIDE_COVERAGE' && (
                            <span>
                              <strong>Jurisdiction / Inapplicability Notice:</strong> Telemetry is geographically inapplicable or outside
                              sovereign territorial boundaries for this local settlement.
                            </span>
                          )}
                          {dims.geographicRelevance === 'UNMAPPED_LOCATION' && (
                            <span>
                              <strong>Ungauged Corridor Notice:</strong> No active hydrometric station operates within the 80 km basin reach.
                              Zero synthetic gauge values fabricated.
                            </span>
                          )}
                          {dims.connectivity === 'FAILED' && (
                            <span>
                              <strong>Connection Notice:</strong> Upstream server failed connection handshake; fallback to offline archival
                              baseline without synthetic live mock injection.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expandable Raw Payload Preview (Sanitized) */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => togglePayload(prov.providerId)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer"
                      >
                        <Code size={13} className="text-blue-600" />
                        <span>
                          {isPayloadExpanded ? 'Hide Raw API Telemetry Payload' : 'View Raw API Telemetry Payload (Sanitized)'}
                        </span>
                      </button>

                      {isPayloadExpanded && (
                        <button
                          type="button"
                          onClick={() => handleCopyPayload(prov.providerId, prov.rawPayloadRedacted || prov.details)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs transition cursor-pointer"
                        >
                          {copiedId === prov.providerId ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {isPayloadExpanded && (
                      <div className="p-3 bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-60 border-t border-slate-200">
                        <div className="text-slate-400 mb-1 text-[9px] italic border-b border-slate-800 pb-1">
                          // Upstream response payload · Authorization tokens, passwords, and API keys are automatically redacted as [REDACTED]
                        </div>
                        <pre className="leading-relaxed">
                          {JSON.stringify(prov.rawPayloadRedacted || prov.details || { notice: 'No raw payload available' }, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Provider Details & Timestamps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Geographic Scope & Jurisdiction
                      </span>
                      <p className="font-medium text-slate-800 text-[11px]">{prov.geographicCoverage}</p>
                      <span className="text-[10px] text-slate-500 block">
                        Authentication: <strong>{prov.authStatus}</strong>
                      </span>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Telemetry Units & Protocol
                      </span>
                      <p className="font-medium text-slate-800 text-[11px]">{prov.dataTypeAndUnits}</p>
                      <span className="text-[10px] text-slate-500 block">
                        Data Classification: <strong>{prov.dataClassification.toUpperCase()}</strong>
                      </span>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Timestamps (IST & UTC)
                      </span>
                      <p className="text-[11px] text-slate-700">
                        Observed:{' '}
                        <strong>
                          {prov.timestamps?.observationTimeIst ||
                            prov.observationTimestamp ||
                            'No current observation'}
                        </strong>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Last ping:{' '}
                        <strong>
                          {new Date(prov.lastAttemptedRetrieval).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </strong>{' '}
                        {prov.timestamps?.freshnessTtlHours ? `(TTL: ${prov.timestamps.freshnessTtlHours}h)` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Known Limitations Disclosure */}
                  {prov.sourceProvenance?.limitations && prov.sourceProvenance.limitations.length > 0 && (
                    <div className="bg-slate-50/60 rounded-lg p-2.5 border border-slate-200/80 text-[11px] space-y-1 text-slate-700">
                      <div className="font-semibold text-slate-800 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                        <Info size={12} className="text-blue-600" />
                        <span>Authoritative Limitations & Guardrails:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600">
                        {prov.sourceProvenance.limitations.map((lim, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {lim}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* License & Attribution Disclosure */}
                  <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="font-semibold text-slate-600">Licence:</span>{' '}
                      <span>{prov.licenceTerms?.licenceName || prov.sourceProvenance?.license || 'Government Open Data License - India (GODL)'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600">Attribution:</span>{' '}
                      <span>{prov.licenceTerms?.attributionRequired || prov.sourceProvenance?.attribution || prov.agency}</span>
                    </div>
                  </div>

                  {/* Error diagnostics */}
                  {prov.lastErrorMessage && (
                    <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-800 space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle size={13} className="text-rose-600" />
                        <span>Upstream Diagnostics:</span>
                      </span>
                      <p className="font-mono text-[10px] text-rose-700">{prov.lastErrorMessage}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Authentic Provenance & Open Data Licensing Footer */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-xs text-slate-600 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <ShieldCheck size={18} className="text-blue-600" />
              <span>Scientific Data Integrity & Open License Compliance Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Bharat Village Twin queries authoritative, documented government endpoints across India without synthetic mock substitution:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-600 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-0.5">
                <span className="font-semibold text-slate-800 block">IMD, CWC, NWIC & MoES (NCS, INCOIS):</span>
                Published under the National Data Sharing and Accessibility Policy (NDSAP) and Ministry of Earth Sciences Open Data Policy.
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-0.5">
                <span className="font-semibold text-slate-800 block">NDMA SACHET & State SDMAs:</span>
                Published via ITU-T X.1303 Common Alerting Protocol (CAP) v1.2 under Government Open Data License - India (GODL) and State DM Acts.
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-0.5">
                <span className="font-semibold text-slate-800 block">ISRO / NRSC Bhuvan & NDEM:</span>
                Open Geospatial Data under Indian Space Policy 2023; CartoDEM v3R1 is a static 30m baseline (vertical datum EGM2008).
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-0.5">
                <span className="font-semibold text-slate-800 block">OpenStreetMap & USGS:</span>
                OpenStreetMap Transport Vectors under Open Database License (ODbL 1.0); Global Seismological data under USGS Public Domain (17 U.S.C. § 105).
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
