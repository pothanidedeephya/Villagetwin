import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  X,
  Layers,
  Clock,
  Globe,
  Server,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  performanceTracker,
  PerformanceSnapshot,
  ApiTelemetryEvent,
  MapLayerDiagnostic,
} from '../../services/performanceTracker';

interface PerformanceDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerBenchmark?: () => void;
}

export const PerformanceDiagnosticsModal: React.FC<PerformanceDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onTriggerBenchmark,
}) => {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>(() => performanceTracker.getSnapshot());
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'layers'>('overview');
  const [apiFilter, setApiFilter] = useState<'all' | 'browser' | 'provider'>('all');
  const [cacheClearFeedback, setCacheClearFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSnapshot(performanceTracker.getSnapshot());
    const unsub = performanceTracker.subscribe(() => {
      setSnapshot(performanceTracker.getSnapshot());
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearCaches = () => {
    const { clearedProvidersCount, clearedEntriesCount } = performanceTracker.clearAllApplicationCaches();
    setSnapshot(performanceTracker.getSnapshot());
    setCacheClearFeedback(`Cleared ${clearedEntriesCount} entries across ${clearedProvidersCount} in-memory caches.`);
    setTimeout(() => setCacheClearFeedback(null), 4000);
  };

  const filteredApiEvents = snapshot.recentApiEvents.filter((ev) => {
    if (apiFilter === 'browser') return ev.type === 'browser_to_backend';
    if (apiFilter === 'provider') return ev.type === 'external_provider';
    return true;
  });

  const totalApiEvents = snapshot.recentApiEvents.length;
  const successfulApiEvents = snapshot.recentApiEvents.filter((e) => e.success).length;
  const failedApiEvents = snapshot.recentApiEvents.filter((e) => !e.success).length;
  const avgApiLatency =
    totalApiEvents > 0
      ? (snapshot.recentApiEvents.reduce((acc, e) => acc + e.durationMs, 0) / totalApiEvents).toFixed(1)
      : '0.0';

  const renderedLayersCount = snapshot.mapLayers.filter((l) => l.status === 'rendered').length;
  const hiddenLayersCount = snapshot.mapLayers.filter((l) => l.status === 'hidden').length;
  const emptyLayersCount = snapshot.mapLayers.filter((l) => l.status === 'empty_unmapped').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span>Performance & Telemetry Diagnostics</span>
                <span className="text-[10px] font-mono bg-blue-900/70 text-blue-300 border border-blue-700/60 px-1.5 py-0.2 rounded">
                  DEV TOOL
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Live metrics, layer latency, caching efficiency, and solver benchmarks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close diagnostics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-4 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 font-medium cursor-pointer transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Solver
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-2 font-medium cursor-pointer transition-colors border-b-2 ${
              activeTab === 'api'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            API Durations ({snapshot.recentApiEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`pb-2 font-medium cursor-pointer transition-colors border-b-2 ${
              activeTab === 'layers'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Map Layers ({snapshot.mapLayers.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Startup Time</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">
                    {snapshot.appStartupMs !== null ? `${snapshot.appStartupMs} ms` : 'Measuring...'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Navigation & DOM
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Map Ready</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">
                    {snapshot.mapReadyMs !== null ? `${snapshot.mapReadyMs} ms` : 'Mounting...'}
                  </div>
                  <div className="text-[10px] text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Basemap Initialized
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Latest Sim Time</div>
                  <div className="text-lg font-black text-blue-600 mt-0.5">
                    {snapshot.latestSimulationMs !== null ? `${snapshot.latestSimulationMs} ms` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1 truncate" title={snapshot.latestSimulationSolver || 'Not executed yet'}>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">{snapshot.latestSimulationSolver || 'Not executed yet'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Cache Hit Ratio</div>
                  <div className="text-lg font-black text-emerald-600 mt-0.5">
                    {snapshot.cacheHitRatio !== null ? `${snapshot.cacheHitRatio}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {snapshot.cacheHits + snapshot.cacheMisses > 0
                      ? `${snapshot.cacheHits} hits / ${snapshot.cacheMisses} misses`
                      : 'No lookups yet'}
                  </div>
                </div>
              </div>

              {/* Memory & Cache Management */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                <div className="font-semibold text-blue-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    Spatial & Simulation Memory Caches ({snapshot.totalCacheEntries} cached entries)
                  </span>
                  <button
                    onClick={handleClearCaches}
                    className="px-2.5 py-1 bg-white border border-blue-300 hover:bg-blue-100/60 rounded-lg text-[11px] font-semibold text-blue-700 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear Caches
                  </button>
                </div>

                {cacheClearFeedback && (
                  <div className="p-2 bg-emerald-100/80 border border-emerald-300 text-emerald-900 rounded-lg text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{cacheClearFeedback}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Hydrological elevation baselines, building plinth elevations, identical rainfall scenarios, and roadway tiles are memoized in memory to eliminate redundant spatial calculations.
                </p>

                {/* Cache Providers Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {snapshot.cacheBreakdown.map((cache, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white border border-blue-100 rounded-lg">
                      <span className="font-medium text-slate-700 text-[11px]">{cache.name}</span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                        {cache.count} entries
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benchmark Trigger */}
              {onTriggerBenchmark && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={onTriggerBenchmark}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Run Verification Benchmark</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-3">
              {/* API Summary Ribbon */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Requests</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">{totalApiEvents}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 font-semibold uppercase">Successful</div>
                  <div className="text-sm font-black text-emerald-700 mt-0.5">{successfulApiEvents}</div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-600 font-semibold uppercase">Errors / Aborts</div>
                  <div className="text-sm font-black text-rose-700 mt-0.5">{failedApiEvents}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-600 font-semibold uppercase">Avg Latency</div>
                  <div className="text-sm font-black text-blue-700 mt-0.5">{avgApiLatency} ms</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                  Live API Telemetry Feed
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setApiFilter('all')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                      apiFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({totalApiEvents})
                  </button>
                  <button
                    onClick={() => setApiFilter('browser')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                      apiFilter === 'browser'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Backend /api/*
                  </button>
                  <button
                    onClick={() => setApiFilter('provider')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                      apiFilter === 'provider'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    External Providers
                  </button>
                </div>
              </div>

              {/* Requests List */}
              {filteredApiEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl">
                  No API requests captured for this filter yet. Perform a search or zoom to trigger telemetry.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredApiEvents.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-[11px] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            req.method === 'POST' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {req.method}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            req.status >= 200 && req.status < 400
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status === 0 ? 'NET_ERR' : req.status}
                        </span>
                        <span className="font-mono text-slate-700 truncate" title={req.endpoint}>
                          {req.endpoint}
                        </span>
                        {req.type === 'external_provider' ? (
                          <span className="px-1 py-0.2 rounded text-[9px] bg-amber-50 text-amber-700 font-semibold border border-amber-200 shrink-0 flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" /> Provider
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 rounded text-[9px] bg-blue-50 text-blue-700 font-semibold border border-blue-200 shrink-0 flex items-center gap-0.5">
                            <Server className="w-2.5 h-2.5" /> Local
                          </span>
                        )}
                        {req.cached && (
                          <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-semibold shrink-0">
                            CACHED
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900 shrink-0 font-mono">
                        {req.durationMs} ms
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="space-y-3">
              {/* Layers Summary Ribbon */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Registered Layers</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">{snapshot.mapLayers.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 font-semibold uppercase">Rendered Active</div>
                  <div className="text-sm font-black text-emerald-700 mt-0.5">{renderedLayersCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-600 font-semibold uppercase">Empty / Unmapped</div>
                  <div className="text-sm font-black text-amber-700 mt-0.5">{emptyLayersCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Hidden / Off</div>
                  <div className="text-sm font-black text-slate-600 mt-0.5">{hiddenLayersCount}</div>
                </div>
              </div>

              <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                Authoritative Map Engine Layer Inventory
              </div>

              {/* Layers List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {snapshot.mapLayers.map((layer: MapLayerDiagnostic) => (
                  <div
                    key={layer.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs space-y-1.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 truncate">{layer.name}</span>
                        <span className="text-[9px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded shrink-0">
                          {layer.id}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shrink-0">
                          {layer.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {layer.status === 'rendered' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Rendered
                          </span>
                        )}
                        {layer.status === 'hidden' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                            Hidden
                          </span>
                        )}
                        {layer.status === 'empty_unmapped' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Empty / Unmapped
                          </span>
                        )}
                        {layer.status === 'loading' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            Loading...
                          </span>
                        )}
                        {layer.status === 'error' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/60">
                      <div className="flex items-center gap-3">
                        <span>Source: <strong className="text-slate-700">{layer.source}</strong></span>
                        <span>Features: <strong className="text-slate-700">{layer.featureCount}</strong></span>
                      </div>
                      <div>
                        Latency: <strong className="text-slate-900 font-mono">
                          {layer.renderDurationMs !== null ? `${layer.renderDurationMs} ms` : '—'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Bharat Village Twin Performance Engine v2.4</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
