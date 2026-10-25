import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Settings,
  History,
  Mail,
  Smartphone,
  Info,
  Clock,
  RotateCcw,
  Check,
  Building,
  Radio,
  ExternalLink,
  MapPin,
  Activity,
  Zap,
  Navigation,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DbAlert, DbUserNotificationPreference, DbNotificationHistory } from '../../db/schema';
import type { LocationSearchResult } from '../../types/nationwide';
import type { NdmaSachetFeedResponse, ParsedNdmaSachetAlert } from '../../services/ndmaSachetService';
import { formatSachetWarning } from '../../services/alertTranslationService';

interface AlertsNotificationCenterModalProps {
  currentLocation: LocationSearchResult;
  onClose: () => void;
  onAlertsCountChange?: (count: number) => void;
  onLocateCoordinates?: (coords: [number, number]) => void;
}

export const AlertsNotificationCenterModal: React.FC<AlertsNotificationCenterModalProps> = ({
  currentLocation,
  onClose,
  onAlertsCountChange,
  onLocateCoordinates,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'sachet' | 'preferences' | 'history'>('alerts');
  const [alerts, setAlerts] = useState<DbAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [preferences, setPreferences] = useState<DbUserNotificationPreference | null>(null);
  const [history, setHistory] = useState<DbNotificationHistory[]>([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // NDMA SACHET Live CAP Feed State
  const [sachetResponse, setSachetResponse] = useState<NdmaSachetFeedResponse | null>(null);
  const [isLoadingSachet, setIsLoadingSachet] = useState(false);
  const [sachetViewMode, setSachetViewMode] = useState<'location' | 'national'>('location');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
    fetchPreferences();
    fetchHistory();
    fetchSachetAlerts();
  }, [currentLocation.id]);

  const fetchSachetAlerts = async () => {
    setIsLoadingSachet(true);
    try {
      const [lng, lat] = currentLocation.center;
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        district: currentLocation.district || '',
        state: currentLocation.state || '',
        name: currentLocation.name || '',
      });
      const res = await fetch(`/api/gov/ndma/sachet-alerts?${params.toString()}`);
      if (res.ok) {
        const data: NdmaSachetFeedResponse = await res.json();
        setSachetResponse(data);
      }
    } catch (err) {
      console.warn('Failed to fetch NDMA SACHET alerts:', err);
    } finally {
      setIsLoadingSachet(false);
    }
  };

  const fetchAlerts = async () => {
    setIsLoadingAlerts(true);
    try {
      const res = await fetch('/api/alerts?status=active');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        if (onAlertsCountChange) {
          onAlertsCountChange(data.alerts?.length || 0);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch alerts:', err);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences?userId=current-session-user');
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/notifications/history?userId=current-session-user');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.warn('Failed to load notification history:', err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        if (onAlertsCountChange) {
          onAlertsCountChange(Math.max(0, alerts.length - 1));
        }
      }
    } catch (err) {
      console.warn('Acknowledge alert error:', err);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;
    setIsSavingPrefs(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Save preferences error:', err);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'emergency':
        return 'bg-red-600 text-white border-red-600';
      case 'warning':
        return 'bg-orange-600 text-white border-orange-600';
      case 'watch':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-200';
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative z-10 bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">
                Disaster Warning & Notification Center
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Official NDMA/IMD Bulletins & Digital Twin Real-Time Threshold Triggers
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

        {/* Navigation Tabs */}
        <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-2 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'alerts'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Active Warnings ({alerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sachet')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'sachet'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>
              NDMA SACHET Live CAP ({sachetResponse ? sachetResponse.locationAlertsCount : 0})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'preferences'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Notification Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Delivery Audit Log ({history.length})</span>
          </button>
        </div>

        {/* Tab 1: Active Warnings */}
        {activeTab === 'alerts' && (
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 text-xs">
            {isLoadingAlerts ? (
              <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Scanning active alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800">No Active Emergency Alerts</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  All monitored atmospheric and hydrologic parameters are within safe operating limits.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2.5"
                >
                  {/* Warning Tier & Distinction Badge */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {alert.hazardType}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{alert.title}</h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>
                          Area: {alert.district}, {alert.state}
                        </span>
                        <span>· Valid: {new Date(alert.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* MANDATORY PROMINENT LABEL: Official vs Internal Model */}
                    <div className="shrink-0">
                      {alert.isOfficialWarning ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          Official Government Warning
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-1 shadow-2xs">
                          <Info className="w-3.5 h-3.5 text-purple-700" />
                          Internal Digital Twin Model Assessment
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body description */}
                  <p className="text-xs text-slate-800 leading-relaxed bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    {alert.description}
                  </p>

                  {/* Evidence Metrics */}
                  {alert.evidenceMetrics && (
                    <div className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 flex flex-wrap gap-3">
                      {Object.entries(alert.evidenceMetrics).map(([k, v]) => (
                        <span key={k}>
                          <strong className="text-slate-800">{k}:</strong> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Source Attribution & Acknowledge Action */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">Source: </span>
                      <span>{alert.source}</span>
                    </div>

                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3 text-slate-600" />
                      <span>Acknowledge</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: NDMA SACHET Live CAP Feed */}
        {activeTab === 'sachet' && (
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 text-xs">
            {/* Real Government Source Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    National Disaster Management Authority (NDMA) — SACHET CAP Feed
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Live nationwide Common Alerting Protocol telemetry · Filtered for {currentLocation.name} ({currentLocation.district}, {currentLocation.state})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setSachetViewMode('location')}
                    className={`px-2 py-1 rounded cursor-pointer ${
                      sachetViewMode === 'location'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    This Village ({sachetResponse?.locationAlertsCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSachetViewMode('national')}
                    className={`px-2 py-1 rounded cursor-pointer ${
                      sachetViewMode === 'national'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All India Active ({sachetResponse?.activeNationalAlertsCount || 0})
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fetchSachetAlerts}
                  disabled={isLoadingSachet}
                  title="Poll latest CAP warnings"
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoadingSachet ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
            </div>

            {isLoadingSachet ? (
              <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Polling live NDMA SACHET CAP feed...</span>
              </div>
            ) : (() => {
              const displayAlerts =
                sachetViewMode === 'location'
                  ? sachetResponse?.alertsForSelectedLocation || []
                  : sachetResponse?.allActiveNationalAlerts || [];

              if (displayAlerts.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-bold text-slate-800">
                      {sachetViewMode === 'location'
                        ? `Zero Active SACHET Warnings in ${currentLocation.name}`
                        : 'No Active Severe Alerts in Current National Feed Window'}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      {sachetViewMode === 'location'
                        ? `The NDMA SACHET Common Alerting Protocol reports normal conditions within a 75 km perimeter of ${currentLocation.name} (${currentLocation.district}, ${currentLocation.state}).`
                        : 'Official CAP feed checked with status code 200.'}
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Target Centroid: [{currentLocation.center[0].toFixed(3)}, {currentLocation.center[1].toFixed(3)}] · Endpoint: https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {displayAlerts.map((alert: ParsedNdmaSachetAlert) => {
                    const warning = formatSachetWarning(alert);
                    const isExpanded = expandedAlertId === alert.id;
                    const isLightning = warning.hazardType === 'lightning';

                    return (
                      <div
                        key={alert.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-2.5 transition-all text-xs"
                      >
                        {/* Header with Icon and Headline */}
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              alert.severityColor === 'red'
                                ? 'bg-red-600 text-white shadow-2xs'
                                : alert.severityColor === 'yellow'
                                ? 'bg-amber-500 text-white'
                                : 'bg-orange-500 text-white'
                            }`}
                          >
                            {isLightning ? <Zap className="w-4 h-4 fill-white" /> : <AlertTriangle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-slate-900 leading-snug">
                              {warning.headline}
                            </h3>
                            <p className="text-slate-700 text-xs mt-1 leading-relaxed">
                              {warning.safetySentence}
                            </p>
                          </div>
                        </div>

                        {/* Structured Metadata Fields */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-700">
                          <div>
                            <span className="font-bold text-slate-900">Affected area: </span>
                            <span className="text-slate-700">{warning.affectedArea}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Warning level: </span>
                            <span className="text-slate-700">{warning.warningLevel}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Issued by: </span>
                            <span className="text-slate-700">{warning.issuedBy}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Valid until: </span>
                            <span className="text-slate-700 font-mono text-[11px]">{warning.validUntil}</span>
                          </div>
                        </div>

                        {/* Action Controls: [View on Map] · [More Details] */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (alert.centroid && onLocateCoordinates) {
                                  onLocateCoordinates([alert.centroid[1], alert.centroid[0]]);
                                }
                              }}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>View on Map</span>
                            </button>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                              className="font-semibold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>More Details</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {alert.distanceToVillageKm !== undefined && (
                              <span className="text-[10px] text-blue-700 font-medium">
                                {alert.distanceToVillageKm.toFixed(1)} km away
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                alert.severityColor === 'red'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : alert.severityColor === 'yellow'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Details: Original Language Text & Technical Parameters */}
                        {isExpanded && (
                          <div className="mt-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1.5 text-slate-600 animate-in fade-in">
                            {warning.moreDetails.originalLanguageText && (
                              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
                                <span className="font-bold block text-[10px] uppercase text-amber-800">
                                  Original Text ({warning.moreDetails.originalLanguageName || 'Indic Script'}):
                                </span>
                                <p className="font-serif italic text-xs mt-0.5">
                                  "{warning.moreDetails.originalLanguageText}"
                                </p>
                              </div>
                            )}
                            {warning.moreDetails.technicalSummary && (
                              <div>
                                <span className="font-bold text-slate-700 block">Technical Details:</span>
                                <p className="text-slate-600 text-[10px] leading-relaxed">
                                  {warning.moreDetails.technicalSummary}
                                </p>
                              </div>
                            )}
                            <div className="pt-1 border-t border-slate-200 flex justify-end">
                              <a
                                href={warning.sourceUrl || 'https://sachet.ndma.gov.in/'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 text-[10px]"
                              >
                                <span>sachet.ndma.gov.in</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 2: Notification Preferences */}
        {activeTab === 'preferences' && preferences && (
          <form onSubmit={handleSavePreferences} className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 text-[11px]">
              <span className="font-bold block mb-0.5">Automated Alert Delivery:</span>
              Configure which locations, hazard categories, and delivery channels will trigger emergency bulletins for your Gram Panchayat or disaster coordination cell.
            </div>

            {/* Minimum Severity */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block">
                Minimum Alert Severity Trigger:
              </label>
              <select
                value={preferences.minSeverity}
                onChange={(e) =>
                  setPreferences({ ...preferences, minSeverity: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs cursor-pointer font-medium"
              >
                <option value="info">Info & Meteorological Advisories</option>
                <option value="advisory">Advisory Level</option>
                <option value="watch">Watch / Moderate Hazard</option>
                <option value="warning">Warning / Severe Hazard Only</option>
                <option value="emergency">Emergency / Red Alert Only</option>
              </select>
            </div>

            {/* Monitored Hazards */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block">Monitored Hazards:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['flood', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'heatwave', 'drought'].map(
                  (hazard) => {
                    const isChecked = preferences.monitoredHazardTypes.includes(hazard);
                    return (
                      <label
                        key={hazard}
                        className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...preferences.monitoredHazardTypes, hazard]
                              : preferences.monitoredHazardTypes.filter((h) => h !== hazard);
                            setPreferences({ ...preferences, monitoredHazardTypes: updated });
                          }}
                          className="accent-blue-600 rounded"
                        />
                        <span className="capitalize">{hazard}</span>
                      </label>
                    );
                  }
                )}
              </div>
            </div>

            {/* Delivery Channels */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800 block">Configured Delivery Channels:</span>

              {/* In-App Notifications */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                    <span>In-App Dashboard Alerts (Standard Default)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Real-time visual notifications and unread badge in top navigation bar.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.inAppEnabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, inAppEnabled: e.target.checked })
                  }
                  className="accent-blue-600 scale-125 cursor-pointer"
                />
              </div>

              {/* Email Notifications */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-600" />
                      <span>Email Delivery (Optional Integration)</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Transmits full bulletin text and spatial coordinate payload.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, emailEnabled: e.target.checked })
                    }
                    className="accent-blue-600 scale-125 cursor-pointer"
                  />
                </div>
                {preferences.emailEnabled && (
                  <input
                    type="email"
                    placeholder="officer@panchayat.gov.in"
                    value={preferences.emailAddress || ''}
                    onChange={(e) =>
                      setPreferences({ ...preferences, emailAddress: e.target.value })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                )}
              </div>

              {/* SMS Notifications */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                      <span>SMS Mobile Alert (Optional Telecom Integration)</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Transmits concise 160-character early warning dispatch to frontline emergency responders.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.smsEnabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, smsEnabled: e.target.checked })
                    }
                    className="accent-blue-600 scale-125 cursor-pointer"
                  />
                </div>
                {preferences.smsEnabled && (
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={preferences.phoneNumber || ''}
                    onChange={(e) =>
                      setPreferences({ ...preferences, phoneNumber: e.target.value })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-between">
              {saveSuccess ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Preferences Saved Successfully
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">Settings persist across app sessions.</span>
              )}
              <button
                type="submit"
                disabled={isSavingPrefs}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              >
                {isSavingPrefs ? 'Saving...' : 'Save Notification Preferences'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Delivery History Log */}
        {activeTab === 'history' && (
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Recorded Notification Dispatches ({history.length})
            </span>
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No Notifications Dispatched Yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When alert conditions trigger, dispatch logs with channel and timestamp will appear here.
                </p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.channel === 'in_app'
                          ? 'bg-blue-50 text-blue-700'
                          : item.channel === 'email'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {item.channel.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-slate-700">{item.alertId}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        item.deliveryStatus === 'delivered' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {item.deliveryStatus}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.deliveredAt).toLocaleTimeString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close Notification Center
          </button>
        </div>
      </div>
    </div>
  );
};
