import React, { useState, useEffect } from 'react';
import {
  Activity,
  Waves,
  RefreshCw,
  AlertCircle,
  Filter,
  Search,
  Database,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Info,
  X,
  Compass,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import type { EarthquakeEvent, EarthquakeFeedResponse } from '../../types/earthquake';
import {
  fetchLiveEarthquakes,
  syncEarthquakesToDatabase,
  getMagnitudeStyle,
  formatRelativeTime,
} from '../../services/earthquakeService';

interface EarthquakeMonitorModalProps {
  currentLocation: LocationSearchResult;
  onClose: () => void;
  onSelectEarthquakeOnMap?: (eq: EarthquakeEvent) => void;
}

export const EarthquakeMonitorModal: React.FC<EarthquakeMonitorModalProps> = ({
  currentLocation,
  onClose,
  onSelectEarthquakeOnMap,
}) => {
  const [events, setEvents] = useState<EarthquakeEvent[]>([]);
  const [feedMetadata, setFeedMetadata] = useState<EarthquakeFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Filters
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [minMag, setMinMag] = useState<number>(2.5);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(2500);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'magnitude' | 'distance'>('distance');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Coordinates of selected village
  const hasVillageCoords =
    Boolean(currentLocation?.center) &&
    typeof currentLocation.center[1] === 'number' &&
    typeof currentLocation.center[0] === 'number' &&
    !isNaN(currentLocation.center[1]) &&
    !isNaN(currentLocation.center[0]);

  const villageLat = hasVillageCoords ? currentLocation.center[1] : undefined;
  const villageLng = hasVillageCoords ? currentLocation.center[0] : undefined;

  const loadEarthquakes = async () => {
    setIsLoading(true);
    setError(null);
    setSyncMessage(null);
    try {
      const data = await fetchLiveEarthquakes({
        timeRange,
        minMag,
        lat: villageLat,
        lng: villageLng,
        maxDistanceKm: maxDistanceKm > 0 ? maxDistanceKm : undefined,
        searchQuery: searchQuery.trim() || undefined,
        sortBy,
        limit: 150,
      });
      setEvents(data.events || []);
      setFeedMetadata(data);
      setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live earthquake data from USGS.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEarthquakes();
  }, [timeRange, minMag, maxDistanceKm, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEarthquakes();
  };

  const handleSyncToDatabase = async () => {
    if (events.length === 0) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncEarthquakesToDatabase(events);
      setSyncMessage(result.message);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Quick stats
  const strongestQuake = events.length > 0
    ? [...events].sort((a, b) => b.mag - a.mag)[0]
    : null;

  const nearestQuake = events.length > 0 && hasVillageCoords
    ? [...events].filter(e => e.distanceKm !== null).sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999))[0]
    : null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative z-10 bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <Waves className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Real-Time Earthquake Hazards Monitor
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  Live USGS Feed
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span>
                  Source: USGS Earthquake Hazards Program (Instrumental Observations)
                </span>
                {lastRefreshedAt && (
                  <span>· Updated: {lastRefreshedAt} IST</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadEarthquakes}
              disabled={isLoading}
              title="Refresh live USGS data"
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scientific Fact & Non-Predictability Banner */}
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-950">Scientific Note:</span>{' '}
            Earthquakes cannot be predicted in time, location, or exact magnitude. This feed provides real-time instrumental observations recorded by global seismograph stations. Recorded events are maintained distinctly from the platform&apos;s predictive flood simulations and meteorological models.
          </div>
        </div>

        {/* Selected Village Reference Bar */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Active Location:</span>
            <span className="font-semibold text-slate-900">{currentLocation.name}</span>
            <span className="text-slate-500">({currentLocation.district}, {currentLocation.state})</span>
            {hasVillageCoords ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-[10px] font-mono text-slate-700 ml-1">
                {currentLocation.center[1].toFixed(3)}°N, {currentLocation.center[0].toFixed(3)}°E
              </span>
            ) : (
              <span className="text-amber-700 italic text-[11px] ml-1">
                (No coordinates available; distances cannot be computed)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToDatabase}
              disabled={isSyncing || events.length === 0}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Database className="w-3 h-3" />
              <span>{isSyncing ? 'Syncing...' : 'Persist to Database'}</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-blue-500 hover:text-blue-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
          {/* Time Range */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Time:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="day">Past 24 Hours</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>

          {/* Min Magnitude */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Min Magnitude:</span>
            <select
              value={minMag}
              onChange={(e) => setMinMag(parseFloat(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value={0}>All Magnitudes</option>
              <option value={2.5}>M 2.5+</option>
              <option value={4.0}>M 4.0+</option>
              <option value={5.0}>M 5.0+ (Significant)</option>
              <option value={6.0}>M 6.0+ (Strong)</option>
            </select>
          </div>

          {/* Max Distance from Village */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Distance from Village:</span>
            <select
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(parseFloat(e.target.value))}
              disabled={!hasVillageCoords}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value={250}>Within 250 km</option>
              <option value={500}>Within 500 km</option>
              <option value={1000}>Within 1,000 km</option>
              <option value={2500}>Within 2,500 km (Regional)</option>
              <option value={5000}>Within 5,000 km</option>
              <option value={0}>Worldwide (All)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="distance" disabled={!hasVillageCoords}>Closest to Village</option>
              <option value="recent">Most Recent</option>
              <option value="magnitude">Highest Magnitude</option>
            </select>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[160px] flex items-center">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Filter location (e.g. India, Hindu Kush, Nepal)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
            </div>
          </form>
        </div>

        {/* Statistical Overview Pills */}
        <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-medium">Filtered Events</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {events.length}
              <span className="text-[10px] text-slate-400 font-normal ml-1">
                (of {feedMetadata?.totalInFeed || 0} in feed)
              </span>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-medium">Strongest Quake</div>
            <div className="text-sm font-bold text-red-600 mt-0.5 truncate">
              {strongestQuake ? `M ${strongestQuake.mag.toFixed(1)}` : 'None'}
              <span className="text-[10px] text-slate-600 font-normal ml-1 truncate">
                {strongestQuake ? `· ${strongestQuake.place.split(',')[0]}` : ''}
              </span>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-medium">Nearest to Village</div>
            <div className="text-sm font-bold text-blue-600 mt-0.5 truncate">
              {nearestQuake?.distanceKm !== null && nearestQuake?.distanceKm !== undefined
                ? `${nearestQuake.distanceKm} km`
                : (hasVillageCoords ? 'No quakes in radius' : 'Coordinates needed')}
              <span className="text-[10px] text-slate-600 font-normal ml-1">
                {nearestQuake ? `(M ${nearestQuake.mag})` : ''}
              </span>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-medium">Data Provenance</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
              <span>USGS Feed v1.0</span>
              <a
                href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 ml-auto"
                title="View USGS API Documentation"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto">
          {isLoading && (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <div className="text-sm font-medium text-slate-700">Fetching real earthquake observations from USGS...</div>
              <div className="text-xs text-slate-400 mt-1">Grounded directly in USGS Global Seismographic Network</div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
              <div className="font-semibold flex items-center gap-2 text-sm text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Error loading USGS earthquake feed
              </div>
              <p className="mt-1.5">{error}</p>
              <button
                onClick={loadEarthquakes}
                className="mt-3 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer text-xs font-medium"
              >
                Retry Request
              </button>
            </div>
          )}

          {!isLoading && !error && events.length === 0 && (
            <div className="py-16 text-center">
              <Waves className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-medium text-slate-700">No earthquakes matched the selected criteria</div>
              <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Try widening the distance filter (e.g. Within 2,500 km or Worldwide) or lowering the minimum magnitude.
              </div>
              <button
                onClick={() => {
                  setMinMag(0);
                  setMaxDistanceKm(0);
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Reset Filters to Worldwide
              </button>
            </div>
          )}

          {!isLoading && !error && events.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {events.map((eq) => {
                const style = getMagnitudeStyle(eq.mag);
                return (
                  <div
                    key={eq.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Mag chip, intensity, relative time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 border ${style.badgeBg} ${style.textColor} ${style.borderColor}`}
                          >
                            <Waves className="w-3 h-3" />
                            M {eq.mag.toFixed(1)}
                          </span>
                          <span className="text-[11px] font-medium text-slate-600">
                            {style.intensityLabel}
                          </span>
                          {eq.tsunami === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              Tsunami Flag
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatRelativeTime(eq.time)}
                        </span>
                      </div>

                      {/* Title / Place */}
                      <div className="mt-2 text-xs font-bold text-slate-900 leading-snug">
                        {eq.place}
                      </div>

                      {/* Distance from Selected Village (only when coordinates exist) */}
                      <div className="mt-1 flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                        {eq.distanceKm !== null && eq.distanceKm !== undefined ? (
                          <span className="font-semibold text-blue-700">
                            {eq.distanceKm} km from {currentLocation.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            Distance unavailable (village unmapped)
                          </span>
                        )}
                      </div>

                      {/* Technical Specs: Depth, Coords, Event Time */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                        <div>
                          <span className="text-slate-400">Focal Depth:</span>{' '}
                          <span className="font-semibold text-slate-700">{eq.depthKm} km</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Coordinates:</span>{' '}
                          <span className="font-mono text-slate-700">
                            {eq.latitude.toFixed(2)}°, {eq.longitude.toFixed(2)}°
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Event Time:</span>{' '}
                          <span className="text-slate-700">
                            {new Date(eq.time).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Status:</span>{' '}
                          <span className="capitalize text-slate-700 font-medium">
                            {eq.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={eq.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline font-medium"
                      >
                        <span>USGS Event #{eq.id}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      {onSelectEarthquakeOnMap && (
                        <button
                          onClick={() => {
                            onSelectEarthquakeOnMap(eq);
                            onClose();
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Compass className="w-3 h-3 text-blue-600" />
                          <span>Locate on Map</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>USGS GeoJSON Feed: Operational</span>
            <span>·</span>
            <span className="text-slate-400">
              Coverage: Global Real-Time Network (ANSS / NEIC)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg cursor-pointer text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
