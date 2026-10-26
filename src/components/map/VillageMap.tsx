import React, { useEffect, useRef, useState, useMemo, useId, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection, Polygon, LineString } from 'geojson';
import type {
  VillageDataset,
  DrainageProperties,
  RetentionPondProperties,
} from '../../types/village';
import type { HazardType, HazardAssessment } from '../../types/hazard';
import type { InfrastructureIntervention } from '../../types/infrastructure';
import {
  Search,
  X,
  Building,
  Building2,
  Waves,
  Compass,
  AlertTriangle,
  Droplets,
  MapPin,
  Route,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Info,
  Activity,
  ExternalLink,
  Plus,
  Check,
  Layers,
  RefreshCw,
  Landmark,
  ShieldAlert,
  Navigation,
  Wind,
  Loader2,
} from 'lucide-react';
import type { EarthquakeEvent } from '../../types/earthquake';
import type { InfrastructureCandidateSite, LocationSearchResult } from '../../types/nationwide';
import { searchIndiaLocations } from '../../services/geospatialService';
import type { CwcRiverGaugeStation, TerrainHydrologyData, FloodAwareEvacuationRoute } from '../../types/flood';
import type { DynamicHazardImpactZone } from '../../services/hazardImpactBoundaryService';
import type { RoutePlanningResult } from '../../types/navigation';
import type { ParsedImdCycloneWindData } from '../../types/imdCycloneWind';
import type { CycloneState } from '../../services/cycloneTrackingService';
import {
  buildGaugeMarkerHtml,
  calculateMarkerEdgePlacement,
} from '../../utils/gaugeLabelFormatter';
import { SimulationStatusCard } from '../simulation/SimulationStatusCard';
import { SharedHazardTimeline } from '../simulation/SharedHazardTimeline';
import type { SimulationResult, SimulationConfig } from '../../types/village';
import type { WeatherData } from '../../types/weather';
import { RealTimeRainfallPanel } from '../weather/RealTimeRainfallPanel';
import { performanceTracker } from '../../services/performanceTracker';
import {
  fetchRoadsForViewport,
  classifyHighway,
  type ViewportBounds,
} from '../../services/nationwideRoadService';

export interface VillageMapCameraAction {
  type: 'fit_village' | 'locate_buildings' | 'recenter' | 'pan_to' | 'fit_bounds';
  coordinates?: [number, number];
  bounds?: [[number, number], [number, number]];
  zoom?: number;
  timestamp: number;
}

export interface VillageMapProps {
  dataset: VillageDataset;
  currentLocation?: LocationSearchResult;
  onSelectLocation?: (location: LocationSearchResult) => void;
  activeFloodGeoJson?: FeatureCollection<Polygon, { depth_m: number; category: string }>;
  scenarioName?: string;
  selectedFeature?: any | null;
  onSelectFeature?: (feature: any | null) => void;
  // Official IMD Cyclone Wind Warning & Interactive Tracking
  imdCycloneWindData?: ParsedImdCycloneWindData | null;
  onOpenCycloneWindDetails?: () => void;
  cycloneState?: CycloneState | null;
  onOpenCycloneTracking?: () => void;
  // Multi-Hazard and Infrastructure
  activeHazardPolygons?: FeatureCollection<Polygon, any>;
  dynamicHazardImpactZone?: DynamicHazardImpactZone | null;
  activeHazard?: HazardType;
  activeHazardDetail?: HazardAssessment;
  smartInterventions?: InfrastructureIntervention[];
  onSelectIntervention?: (intervention: InfrastructureIntervention) => void;
  candidateSites?: InfrastructureCandidateSite[];
  onSelectCandidateSite?: (site: InfrastructureCandidateSite) => void;
  // Real-Time USGS Earthquakes
  earthquakes?: EarthquakeEvent[];
  selectedEarthquake?: EarthquakeEvent | null;
  onSelectEarthquake?: (eq: EarthquakeEvent | null) => void;
  // Real Flood Telemetry & Hydrology
  cwcGauges?: CwcRiverGaugeStation[];
  terrainHydrology?: TerrainHydrologyData;
  activeEvacuationRoute?: FloodAwareEvacuationRoute | null;
  affectedRoads?: Array<{ id: string; name: string; depth_m: number; impassable: boolean }>;
  onSelectCwcGauge?: (gauge: CwcRiverGaugeStation) => void;
  // Drawing mode for Drainage Planner
  isDrawingMode?: boolean;
  drawingType?: 'drain' | 'retention';
  onAddDrawnFeature?: (coordinates: [number, number][], type: 'drain' | 'retention') => void;
  proposedDrainsOverride?: FeatureCollection<LineString, DrainageProperties>;
  proposedPondsOverride?: FeatureCollection<Polygon, RetentionPondProperties>;
  // Beginner-friendly mode
  simpleMode?: boolean;
  mapType?: 'roadmap' | 'satellite';
  onMapTypeChange?: (mapType: 'roadmap' | 'satellite') => void;
  cameraAction?: VillageMapCameraAction;
  onFitVillage?: () => void;
  onLocateBuildings?: () => void;
  hideOverlays?: boolean;
  activeView?: string;
  // Google Maps-Style Navigation
  navigationResult?: RoutePlanningResult | null;
  activeNavigationRouteId?: string;
  onSelectNavigationRoute?: (routeId: string) => void;
  isNavigationOpen?: boolean;
  onToggleNavigation?: () => void;
  isMapPickingActive?: 'origin' | 'destination' | null;
  onMapClickCoordinate?: (coords: [number, number]) => void;
  // Simulation Status & Config
  simulationResult?: SimulationResult;
  simConfig?: SimulationConfig;
  isSimulating?: boolean;
  onRunSimulation?: () => void;
  // Time-stepped Animation & Timeline Props (Part 4)
  activeFloodHour?: number | null;
  onSelectFloodHour?: (hour: number | null) => void;
  isFloodPlaying?: boolean;
  onToggleFloodPlay?: () => void;
  onResetFlood?: () => void;
  isCyclonePlaying?: boolean;
  onToggleCyclonePlay?: () => void;
  onSelectCycloneStep?: (stepIndex: number) => void;
  onResetCyclone?: () => void;
  activeSimulationHazard?: 'flood' | 'cyclone';
  // Real-Time Rainfall & Weather Telemetry
  weatherData?: WeatherData | null;
  isLoadingWeather?: boolean;
  onRefreshWeather?: () => void;
  onApplyRainfallToSimulation?: (intensity_mmh: number) => void;
}

import { toLatLng, isValidIndiaCoordinate, doesLineStringIntersectPolygonRing } from '../../utils/geoUtils';
export { toLatLng, isValidIndiaCoordinate, doesLineStringIntersectPolygonRing };

export const VillageMap: React.FC<VillageMapProps> = ({
  dataset,
  currentLocation,
  onSelectLocation,
  activeFloodGeoJson,
  simulationResult,
  simConfig,
  isSimulating = false,
  onRunSimulation,
  scenarioName,
  selectedFeature,
  onSelectFeature,
  imdCycloneWindData,
  onOpenCycloneWindDetails,
  cycloneState,
  onOpenCycloneTracking,
  activeHazardPolygons,
  dynamicHazardImpactZone,
  activeHazard,
  activeHazardDetail,
  smartInterventions = [],
  onSelectIntervention,
  candidateSites = [],
  onSelectCandidateSite,
  earthquakes = [],
  selectedEarthquake = null,
  onSelectEarthquake,
  cwcGauges = [],
  terrainHydrology,
  activeEvacuationRoute = null,
  affectedRoads = [],
  onSelectCwcGauge,
  isDrawingMode = false,
  drawingType = 'drain',
  onAddDrawnFeature,
  proposedDrainsOverride,
  proposedPondsOverride,
  simpleMode = false,
  mapType: externalMapType,
  onMapTypeChange,
  cameraAction,
  onFitVillage,
  onLocateBuildings,
  hideOverlays = false,
  activeView = 'main',
  navigationResult = null,
  activeNavigationRouteId = 'route-flood-aware',
  onSelectNavigationRoute,
  isNavigationOpen = false,
  onToggleNavigation,
  isMapPickingActive = null,
  onMapClickCoordinate,
  activeFloodHour,
  onSelectFloodHour,
  isFloodPlaying = false,
  onToggleFloodPlay,
  onResetFlood,
  isCyclonePlaying = false,
  onToggleCyclonePlay,
  onSelectCycloneStep,
  onResetCyclone,
  activeSimulationHazard = 'flood',
  weatherData,
  isLoadingWeather = false,
  onRefreshWeather,
  onApplyRainfallToSimulation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Map initialization recovery state (Requirement 12)
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Generate unique container DOM ID per instance to prevent ID collisions
  const uniqueInstanceId = useId();
  const containerId = `village-twin-leaflet-map-${uniqueInstanceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const handleRetryMap = () => {
    setMapInitError(null);
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (err) {
        console.warn('Error during map cleanup before retry:', err);
      }
      mapRef.current = null;
    }
    const c = containerRef.current;
    if (c && (c as any)._leaflet_id) {
      delete (c as any)._leaflet_id;
    }
    setRetryCount((prev) => prev + 1);
  };

  // Basemap switcher: 'roadmap' (OpenStreetMap) vs 'satellite' (Esri World Imagery + labels, default satellite)
  const [internalMapType, setInternalMapType] = useState<'roadmap' | 'satellite'>('satellite');
  const mapType = externalMapType !== undefined ? externalMapType : internalMapType;
  const setMapType = (nextType: 'roadmap' | 'satellite') => {
    setInternalMapType(nextType);
    if (onMapTypeChange) onMapTypeChange(nextType);
  };

  // Unified Location & Infrastructure Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState<LocationSearchResult[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchReqIdRef = useRef<number>(0);
  const searchItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);

  // Layer visibility controls — Clean geographic basemap by default without unrequested overlays
  const [visibleLayers, setVisibleLayers] = useState({
    floodExtent: true,        // Active flood simulation output (when present)
    buildings: true,          // Building footprints
    roads: true,              // Base road network (OpenStreetMap / NHAI)
    drainageExisting: true,   // Existing natural drainage & channels
    drainageProposed: false,  // Proposed infrastructure planning (only when active)
    retentionPonds: false,    // Proposed retention ponds (only when active)
    waterBodies: true,        // Rivers, lakes, tanks
    boundary: true,           // Administrative cadastral boundary
    impactZone: false,        // Hazard impact overlays (only when hazard active or toggled)
    earthquakes: false,       // Seismicity markers (only when earthquake hazard active or toggled)
    candidateSites: false,    // Planning candidate sites (only when planning feature active)
    cwcGauges: true,          // Official CWC telemetry river gauges
    flowPaths: false,         // DEM flow accumulation paths (only when toggled/simulated)
    evacRoute: false,         // Evacuation corridor (only when evacuation planning active)
    imdCycloneWind: false,    // IMD Cyclone wind radii (only when cyclone active)
  });

  // Individual selectable IMD Wind Warning threshold sub-layers
  const [visibleWindThresholds, setVisibleWindThresholds] = useState<Record<string, boolean>>({
    '27kt': true,
    '34kt': true,
    '50kt': true,
    '64kt': true,
  });

  const toggleWindThreshold = (threshold: string) => {
    setVisibleWindThresholds((prev) => ({ ...prev, [threshold]: !prev[threshold] }));
  };

  const toggleLayer = (layerKey: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Drawing mode points buffer
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);

  // Searchable features
  const searchableFeatures = useMemo(() => {
    const list: Array<{ id: string; name: string; type: string; coords: { lat: number; lng: number } }> = [];
    if (!dataset) return list;
    try {
      if (Array.isArray(dataset.buildings?.features)) {
        dataset.buildings.features.forEach((b) => {
          const ring = b.geometry?.coordinates?.[0];
          const coord = ring?.[0];
          if (coord && coord.length >= 2) {
            const [lat, lng] = toLatLng(coord as [number, number]);
            if (isFinite(lat) && isFinite(lng)) {
              list.push({
                id: b.properties?.id || Math.random().toString(),
                name: b.properties?.name || 'Building',
                type: b.properties?.type || 'Structure',
                coords: { lat, lng },
              });
            }
          }
        });
      }
      if (Array.isArray(dataset.roads?.features)) {
        dataset.roads.features.forEach((r) => {
          const coords = r.geometry?.coordinates;
          const coord = Array.isArray(coords?.[0])
            ? typeof coords[0][0] === 'number'
              ? coords[0]
              : (coords[0] as any)[0]
            : undefined;
          if (coord && coord.length >= 2) {
            const [lat, lng] = toLatLng(coord as [number, number]);
            if (isFinite(lat) && isFinite(lng)) {
              list.push({
                id: r.properties?.id || Math.random().toString(),
                name: r.properties?.name || 'Road',
                type: r.properties?.roadType || 'Road',
                coords: { lat, lng },
              });
            }
          }
        });
      }
    } catch (err) {
      console.warn('Error calculating searchable features:', err);
    }
    return list;
  }, [dataset]);

  // Local dataset features (streets, tanks, ponds in current village)
  const localFeatureResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return searchableFeatures
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 4);
  }, [searchQuery, searchableFeatures]);

  // Combined flat list for keyboard navigation and rendering
  const combinedSearchResults = useMemo(() => {
    const combined: Array<
      | { kind: 'location'; data: LocationSearchResult; key: string }
      | { kind: 'feature'; data: (typeof searchableFeatures)[0]; key: string }
    > = [];

    locationSearchResults.forEach((loc) => {
      combined.push({ kind: 'location', data: loc, key: `loc-${loc.id}` });
    });

    localFeatureResults.forEach((feat) => {
      combined.push({ kind: 'feature', data: feat, key: `feat-${feat.id}` });
    });

    return combined;
  }, [locationSearchResults, localFeatureResults]);

  // Debounced search effect with async request-id guard
  useEffect(() => {
    const clean = searchQuery.trim();
    if (!clean) {
      setLocationSearchResults([]);
      setIsSearchingLocation(false);
      setSearchSelectedIndex(-1);
      return;
    }

    const currentReqId = ++searchReqIdRef.current;
    setIsSearchingLocation(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchIndiaLocations(clean);
        if (searchReqIdRef.current === currentReqId) {
          setLocationSearchResults(results.slice(0, 7));
          setIsSearchingLocation(false);
          setSearchSelectedIndex(-1);
        }
      } catch (err) {
        if (searchReqIdRef.current === currentReqId) {
          setLocationSearchResults([]);
          setIsSearchingLocation(false);
        }
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => (prev < combinedSearchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchSelectedIndex >= 0 && combinedSearchResults[searchSelectedIndex]) {
        handleSelectSearchItem(combinedSearchResults[searchSelectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
    }
  };

  // Keep highlighted search item scrolled into view
  useEffect(() => {
    if (searchSelectedIndex >= 0 && searchItemsRef.current[searchSelectedIndex]) {
      searchItemsRef.current[searchSelectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [searchSelectedIndex]);

  const handleSelectSearchItem = (
    item: { kind: 'location'; data: LocationSearchResult } | { kind: 'feature'; data: (typeof searchableFeatures)[0] }
  ) => {
    if (item.kind === 'location') {
      if (onSelectLocation) {
        onSelectLocation(item.data);
      }
      if (item.data.center && mapRef.current) {
        const [lng, lat] = item.data.center;
        mapRef.current.setView([lat, lng], 16, { animate: true });
      }
    } else {
      if (mapRef.current) {
        mapRef.current.setView([item.data.coords.lat, item.data.coords.lng], 18, { animate: true });
      }
    }
    setSearchQuery('');
    setIsSearchOpen(false);
    setSearchSelectedIndex(-1);
  };

  // Basemap & tile provider error notice state
  const [tileNotice, setTileNotice] = useState<string | null>(null);
  const tileErrorCountRef = useRef<number>(0);
  const fallbackActiveRef = useRef<boolean>(false);
  const [mapZoom, setMapZoom] = useState<number>(16);
  const [mapViewportRev, setMapViewportRev] = useState<number>(0);
  const [viewportRoads, setViewportRoads] = useState<Array<any>>([]);
  const [isRoadsLoading, setIsRoadsLoading] = useState<boolean>(false);
  const [roadsStatus, setRoadsStatus] = useState<'loading' | 'available' | 'unmapped' | 'error'>('loading');
  const [roadsProvider, setRoadsProvider] = useState<string>('OpenStreetMap / National Roadways');
  const [totalRoadsCount, setTotalRoadsCount] = useState<number>(0);
  const roadReqIdRef = useRef<number>(0);
  const [isSimCardDismissed, setIsSimCardDismissed] = useState<boolean>(false);
  const [showHazardDetails, setShowHazardDetails] = useState<boolean>(false);
  const candidateMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Layer groups refs
  const currentBasemapTypeRef = useRef<'roadmap' | 'satellite' | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryGroupRef = useRef<L.LayerGroup | null>(null);
  const waterGroupRef = useRef<L.LayerGroup | null>(null);
  const retentionGroupRef = useRef<L.LayerGroup | null>(null);
  const roadsGroupRef = useRef<L.LayerGroup | null>(null);
  const drainageGroupRef = useRef<L.LayerGroup | null>(null);
  const buildingsGroupRef = useRef<L.LayerGroup | null>(null);
  const floodGroupRef = useRef<L.LayerGroup | null>(null);
  const hazardGroupRef = useRef<L.LayerGroup | null>(null);
  const impactZoneGroupRef = useRef<L.LayerGroup | null>(null);
  const cycloneWindGroupRef = useRef<L.LayerGroup | null>(null);
  const interventionsGroupRef = useRef<L.LayerGroup | null>(null);
  const candidateGroupRef = useRef<L.LayerGroup | null>(null);
  const earthquakesGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingGroupRef = useRef<L.LayerGroup | null>(null);
  const cwcGaugesGroupRef = useRef<L.LayerGroup | null>(null);
  const flowPathsGroupRef = useRef<L.LayerGroup | null>(null);
  const evacRouteGroupRef = useRef<L.LayerGroup | null>(null);
  const navRouteGroupRef = useRef<L.LayerGroup | null>(null);
  const selectedLocationMarkerGroupRef = useRef<L.LayerGroup | null>(null);

  // Safe Leaflet size invalidation that guards against zero/collapsed DOM container dimensions
  const safeInvalidateSize = useCallback((map: L.Map | null) => {
    if (!map) return;
    try {
      const container = map.getContainer();
      if (!container) return;
      if (container.clientWidth > 50 && container.clientHeight > 50) {
        map.invalidateSize({ debounceMoveend: true });
      }
    } catch (err) {
      console.warn('[Leaflet Map] safeInvalidateSize caught:', err);
    }
  }, []);

  // Basemap setup helper: guarantees exactly ONE active base tile layer without CORS blocks
  const setupBasemap = (map: L.Map, type: 'roadmap' | 'satellite') => {
    try {
      // If the requested base layer is already attached and active, do not disturb or recreate it
      if (
        currentBasemapTypeRef.current === type &&
        tileLayerRef.current &&
        map.hasLayer(tileLayerRef.current) &&
        !fallbackActiveRef.current
      ) {
        return;
      }

      // Cleanly remove previous base tile layer (ensures exactly ONE base layer is active)
      if (tileLayerRef.current) {
        if (map.hasLayer(tileLayerRef.current)) {
          map.removeLayer(tileLayerRef.current);
        }
        tileLayerRef.current = null;
      }

      // Reset error counter and fallback state for newly requested layer
      tileErrorCountRef.current = 0;
      fallbackActiveRef.current = false;
      setTileNotice(null);

      if (type === 'satellite') {
        const satelliteTile = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            minZoom: 1,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, Maxar, Earthstar Geographics',
            keepBuffer: 6,
            updateWhenIdle: false,
            updateWhenZooming: false,
            pane: 'tilePane',
          }
        );

        satelliteTile.on('tileload', () => {
          tileErrorCountRef.current = 0;
        });

        satelliteTile.on('tileerror', (err) => {
          tileErrorCountRef.current += 1;
          console.warn('[Leaflet Basemap] Tile loading error on Esri Satellite:', err);
          if (tileErrorCountRef.current >= 4 && !fallbackActiveRef.current) {
            fallbackActiveRef.current = true;
            console.warn('[Leaflet Basemap] Esri Satellite unreachable. Seamlessly activating resilient fallback basemap...');
            setTileNotice('Satellite tile provider unreachable. Displaying resilient standard basemap.');
            if (mapRef.current && tileLayerRef.current) {
              mapRef.current.removeLayer(tileLayerRef.current);
              const fallbackLayer = L.tileLayer(
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                {
                  maxZoom: 19,
                  minZoom: 1,
                  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
                  keepBuffer: 6,
                  pane: 'tilePane',
                }
              ).addTo(mapRef.current);
              tileLayerRef.current = fallbackLayer;
            }
          }
        });

        satelliteTile.addTo(map);
        tileLayerRef.current = satelliteTile;
      } else {
        const osmTile = L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            minZoom: 1,
            subdomains: ['a', 'b', 'c'],
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
            keepBuffer: 6,
            updateWhenIdle: false,
            updateWhenZooming: false,
            pane: 'tilePane',
          }
        );

        osmTile.on('tileload', () => {
          tileErrorCountRef.current = 0;
        });

        osmTile.on('tileerror', (err) => {
          tileErrorCountRef.current += 1;
          console.warn('[Leaflet Basemap] Tile loading error on OpenStreetMap:', err);
          if (tileErrorCountRef.current >= 4 && !fallbackActiveRef.current) {
            fallbackActiveRef.current = true;
            console.warn('[Leaflet Basemap] Standard OSM tiles unreachable. Activating resilient Carto fallback...');
            setTileNotice('Standard map service unreachable. Displaying resilient Carto fallback basemap.');
            if (mapRef.current && tileLayerRef.current) {
              mapRef.current.removeLayer(tileLayerRef.current);
              const fallbackLayer = L.tileLayer(
                'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                {
                  maxZoom: 19,
                  minZoom: 1,
                  subdomains: ['a', 'b', 'c', 'd'],
                  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                  keepBuffer: 6,
                  pane: 'tilePane',
                }
              ).addTo(mapRef.current);
              tileLayerRef.current = fallbackLayer;
            }
          }
        });

        osmTile.addTo(map);
        tileLayerRef.current = osmTile;
      }

      currentBasemapTypeRef.current = type;

      // Trigger immediate tile layout check
      safeInvalidateSize(map);
    } catch (err) {
      console.warn('[Leaflet Basemap] Error setting up basemap:', err);
    }
  };

  // 1. Initialize Leaflet Map once per valid container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    try {
      setMapInitError(null);

      // Defend against "Map container is already initialized" error during remount or StrictMode
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      const [lat, lng] = toLatLng(dataset?.center || [83.950, 18.700]);
      const initialZoom = currentLocation?.adminLevel === 'country'
        ? 5
        : currentLocation?.adminLevel === 'state_ut'
        ? 7
        : currentLocation?.adminLevel === 'district'
        ? 10
        : currentLocation?.adminLevel === 'taluk_tehsil'
        ? 13
        : 16;
      const map = L.map(container, {
        center: [lat, lng],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Set up deterministic Leaflet map panes with defined z-indices for visual layer stacking
      const ensurePane = (paneName: string, zIndex: number) => {
        if (!map.getPane(paneName)) {
          const p = map.createPane(paneName);
          p.style.zIndex = String(zIndex);
        }
      };

      ensurePane('villageBoundaryPane', 410);
      ensurePane('hazardOverlayPane', 420);
      ensurePane('floodOverlayPane', 430);
      ensurePane('waterBodiesPane', 440);
      ensurePane('flowPathsPane', 442);
      ensurePane('retentionPondsPane', 445);
      ensurePane('roadsPane', 450);
      ensurePane('evacRoutePane', 455);
      ensurePane('navRoutePane', 458);
      ensurePane('drainagePane', 460);
      ensurePane('buildingsPane', 470);
      ensurePane('cwcGaugesPane', 620);

      // Create layer groups
      boundaryGroupRef.current = L.layerGroup().addTo(map);
      floodGroupRef.current = L.layerGroup().addTo(map);
      hazardGroupRef.current = L.layerGroup().addTo(map);
      impactZoneGroupRef.current = L.layerGroup().addTo(map);
      cycloneWindGroupRef.current = L.layerGroup().addTo(map);
      waterGroupRef.current = L.layerGroup().addTo(map);
      retentionGroupRef.current = L.layerGroup().addTo(map);
      roadsGroupRef.current = L.layerGroup().addTo(map);
      drainageGroupRef.current = L.layerGroup().addTo(map);
      buildingsGroupRef.current = L.layerGroup().addTo(map);
      interventionsGroupRef.current = L.layerGroup().addTo(map);
      candidateGroupRef.current = L.layerGroup().addTo(map);
      earthquakesGroupRef.current = L.layerGroup().addTo(map);
      drawingGroupRef.current = L.layerGroup().addTo(map);
      cwcGaugesGroupRef.current = L.layerGroup().addTo(map);
      flowPathsGroupRef.current = L.layerGroup().addTo(map);
      evacRouteGroupRef.current = L.layerGroup().addTo(map);
      navRouteGroupRef.current = L.layerGroup().addTo(map);
      selectedLocationMarkerGroupRef.current = L.layerGroup().addTo(map);

      // Immediately setup basemap so the map is never blank
      setupBasemap(map, mapType);

      mapRef.current = map;
      performanceTracker.markMapReady();

      // Track zoom level and viewport changes for dynamic clustering & edge containment
      map.on('zoomend', () => {
        try {
          setMapZoom(map.getZoom());
          setMapViewportRev((r) => r + 1);
        } catch (e) {}
      });

      map.on('moveend', () => {
        try {
          setMapViewportRev((r) => r + 1);
        } catch (e) {}
      });

      // Clear active selection on popup close
      map.on('popupclose', () => {
        onSelectFeature?.(null);
        onSelectEarthquake?.(null);
      });

      // Wire zoom button inside custom Leaflet popups
      map.on('popupopen', (e) => {
        const popupEl = e.popup.getElement();
        if (!popupEl) return;
        const zoomBtn = popupEl.querySelector('.bvt-zoom-btn');
        if (zoomBtn) {
          zoomBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const zLat = parseFloat(zoomBtn.getAttribute('data-lat') || '0');
            const zLng = parseFloat(zoomBtn.getAttribute('data-lng') || '0');
            if (isFinite(zLat) && isFinite(zLng)) {
              map.setView([zLat, zLng], 17.5, { animate: true });
            }
          });
        }
      });

      // Trigger multiple layout/size checks to guarantee tiles load when container finishes painting
      map.whenReady(() => {
        safeInvalidateSize(map);
      });
    } catch (err: any) {
      console.error('[Leaflet Map] Map initialization failed:', err);
      setMapInitError(err?.message || 'Failed to initialize Leaflet map container.');
    }

    const t1 = setTimeout(() => safeInvalidateSize(mapRef.current), 50);
    const t2 = setTimeout(() => safeInvalidateSize(mapRef.current), 200);
    const t3 = setTimeout(() => safeInvalidateSize(mapRef.current), 600);

    // Continuous container resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
          safeInvalidateSize(mapRef.current);
        }
      }
    });
    resizeObserver.observe(container);

    // Window resize handler
    const handleWindowResize = () => {
      safeInvalidateSize(mapRef.current);
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      try {
        if (mapRef.current) {
          mapRef.current.remove();
        }
      } catch (err) {
        console.warn('[Leaflet Map] Error removing map instance:', err);
      }
      mapRef.current = null;
      currentBasemapTypeRef.current = null;
      tileLayerRef.current = null;
      if (container && (container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
    };
  }, [retryCount]);

  // 2. Basemap Switcher (OpenStreetMap vs Esri Satellite + Labels)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setupBasemap(map, mapType);
  }, [mapType]);

  // Invalidate map size safely whenever returning to 'main' view
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (activeView === 'main' || !activeView) {
      requestAnimationFrame(() => {
        safeInvalidateSize(mapRef.current);
      });
      const t1 = setTimeout(() => {
        safeInvalidateSize(mapRef.current);
      }, 100);
      return () => clearTimeout(t1);
    }
  }, [activeView]);

  // 3. Authoritative Camera Navigation Engine for Selected Location & Administrative Boundaries
  const navigateToLocation = useCallback((loc?: LocationSearchResult | null, explicitZoom?: number) => {
    const map = mapRef.current;
    if (!map || !loc) return;

    // 1. Validate geographic coordinates
    const [cLng, cLat] = loc.center || [NaN, NaN];
    if (!isValidIndiaCoordinate(cLat, cLng)) {
      console.warn(`[Navigation] Invalid coordinates for ${loc.name}: [${cLng}, ${cLat}]`);
      setTileNotice(`Navigation unavailable: Invalid geographic coordinates for ${loc.name}`);
      return;
    }

    const adminLevel = loc.adminLevel;
    const hasValidBBox =
      loc.boundingBox &&
      loc.boundingBox.length === 4 &&
      loc.boundingBox[1] < loc.boundingBox[3] &&
      loc.boundingBox[0] < loc.boundingBox[2] &&
      isValidIndiaCoordinate(loc.boundingBox[1], loc.boundingBox[0]) &&
      isValidIndiaCoordinate(loc.boundingBox[3], loc.boundingBox[2]);

    try {
      if (adminLevel === 'country') {
        map.setView([22.5937, 78.9629], explicitZoom ?? 5, { animate: true });
      } else if (hasValidBBox) {
        const [minLng, minLat, maxLng, maxLat] = loc.boundingBox;
        let maxZoom = 16.5;
        if (adminLevel === 'state_ut') maxZoom = 7.5;
        else if (adminLevel === 'district') maxZoom = 10.5;
        else if (adminLevel === 'taluk_tehsil') maxZoom = 13;
        else if ((adminLevel as string) === 'town' || (adminLevel as string) === 'city') maxZoom = 14.5;
        else maxZoom = 16.5;

        map.fitBounds([[minLat, minLng], [maxLat, maxLng]], {
          padding: [35, 35],
          maxZoom: explicitZoom ?? maxZoom,
          animate: true,
        });
      } else {
        let zoom = 15.5;
        if (adminLevel === 'state_ut') zoom = 7;
        else if (adminLevel === 'district') zoom = 10;
        else if (adminLevel === 'taluk_tehsil') zoom = 12.5;
        else if ((adminLevel as string) === 'town' || (adminLevel as string) === 'city') zoom = 14;
        else zoom = 15.5;

        map.setView([cLat, cLng], explicitZoom ?? zoom, { animate: true });
      }
      safeInvalidateSize(map);
    } catch (err) {
      console.warn('[Navigation] Map navigation error:', err);
    }
  }, [safeInvalidateSize]);

  // Navigate map whenever currentLocation changes
  useEffect(() => {
    if (!currentLocation) return;
    navigateToLocation(currentLocation);
  }, [currentLocation?.id, navigateToLocation]);

  // 4. Handle Camera Actions (Fit Village, Locate Buildings, Recenter, Pan To, Fit Bounds)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraAction) return;

    try {
      if (cameraAction.type === 'fit_village' || cameraAction.type === 'recenter') {
        navigateToLocation(currentLocation, cameraAction.zoom);
      } else if (cameraAction.type === 'fit_bounds' && cameraAction.bounds) {
        map.fitBounds(cameraAction.bounds, {
          padding: [40, 40],
          maxZoom: cameraAction.zoom || 16.5,
          animate: true,
        });
      } else if (cameraAction.type === 'pan_to' && cameraAction.coordinates) {
        const [lat, lng] = toLatLng(cameraAction.coordinates);
        if (isValidIndiaCoordinate(lat, lng)) {
          map.setView([lat, lng], cameraAction.zoom || 15.5, { animate: true });
        }
      } else if (cameraAction.type === 'locate_buildings') {
        if (!visibleLayers.buildings) {
          setVisibleLayers((prev) => ({ ...prev, buildings: true }));
        }
        if (dataset.buildings?.features && dataset.buildings.features.length > 0) {
          const allPoints: [number, number][] = [];
          dataset.buildings.features.forEach((b) => {
            const rawCoords = b.geometry?.coordinates;
            if (rawCoords) {
              const rings: Array<any> =
                (b.geometry as any)?.type === 'MultiPolygon' ? (rawCoords as any) : [rawCoords[0]];
              rings.forEach((r) => {
                if (Array.isArray(r)) {
                  r.forEach((c: any) => {
                    if (Array.isArray(c) && c.length >= 2) {
                      const [lat, lng] = toLatLng(c as [number, number]);
                      if (isFinite(lat) && isFinite(lng)) {
                        allPoints.push([lat, lng]);
                      }
                    }
                  });
                }
              });
            }
          });
          if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true });
          } else if (currentLocation) {
            navigateToLocation(currentLocation);
          }
        } else {
          setTileNotice(`No mapped building footprints available for ${dataset.villageName}.`);
        }
      }

      safeInvalidateSize(map);
    } catch (err) {
      console.warn('Error handling camera action:', err);
    }
  }, [cameraAction?.type, cameraAction?.timestamp, navigateToLocation, currentLocation, dataset]);

  // Close any open popups when location/village changes
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      try {
        map.closePopup();
      } catch (e) {}
    }
  }, [dataset.villageName, dataset.center]);

  // 5. Invalidate Size when entering/exiting fullscreen, modal changes, or active hazard switch
  // Adjust layout without clearing tiles when UI layout changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    requestAnimationFrame(() => {
      safeInvalidateSize(mapRef.current);
    });
    const t1 = setTimeout(() => {
      safeInvalidateSize(mapRef.current);
    }, 100);
    const t2 = setTimeout(() => {
      safeInvalidateSize(mapRef.current);
    }, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen, hideOverlays]);

  // 6. Render Official Gram Panchayat Administrative Cadastral Boundary (Subtle, neutral reference layer)
  useEffect(() => {
    const group = boundaryGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.boundary) {
      performanceTracker.updateMapLayer({ id: 'boundary', visible: false, status: 'hidden' });
      return;
    }

    const features = dataset.boundary?.features || [];
    if (features.length === 0) {
      performanceTracker.updateMapLayer({ id: 'boundary', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      let count = 0;
      features.forEach((feat) => {
        const ring = feat.geometry?.coordinates?.[0];
        if (!ring || ring.length < 3) return;
        const latLngs = ring
          .map((c) => toLatLng(c as [number, number]))
          .filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
        if (latLngs.length < 3) return;

        // Subtle, neutral cadastral boundary: dashed slate outline, negligible fill, distinct from any hazard area
        const isSelected = selectedFeature && selectedFeature.category === 'boundary';
        const poly = L.polygon(latLngs, {
          color: isSelected ? '#1e3a8a' : '#475569',
          weight: isSelected ? 3.0 : 1.6,
          dashArray: '6, 4',
          opacity: isSelected ? 1 : 0.85,
          fillColor: isSelected ? '#3b82f6' : '#64748b',
          fillOpacity: isSelected ? 0.08 : 0.02,
          pane: 'villageBoundaryPane',
        });
        if (isSelected) poly.bringToFront();

        const gpName = feat.properties?.name || `${dataset.villageName} Revenue Survey Boundary`;

        poly.bindTooltip(
          `<div class="p-1 font-sans text-xs" style="width: 100%; box-sizing: border-box;">
            <div class="font-bold text-slate-800 flex items-center gap-1" style="word-break: normal; white-space: normal;">🏛️ Official Gram Panchayat Administrative Boundary</div>
            <div class="text-[11px] text-slate-600 mt-0.5" style="word-break: normal; white-space: normal;">${gpName}</div>
            <div class="text-[10px] text-slate-500 italic mt-0.5 border-t border-slate-200 pt-0.5" style="word-break: normal; white-space: normal;">Statutory cadastral jurisdiction (Survey of India / LGD). Stable reference; NOT a hazard exposure zone.</div>
          </div>`,
          { sticky: false, direction: 'top', className: 'cadastral-boundary-tooltip' }
        );

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          mapRef.current?.closePopup();
          if (poly.getTooltip()) poly.closeTooltip();
          onSelectFeature?.({
            category: 'boundary',
            properties: {
              ...feat.properties,
              title: 'Official Gram Panchayat Administrative Cadastral Boundary',
              subtitle: 'Survey of India / Local Government Directory (LGD) Jurisdiction',
              notes: 'Statutory administrative revenue boundary. Distinct reference layer; does NOT represent flood or hazard exposure.',
            },
            geometry: feat.geometry,
            coordinates: [e.latlng.lng, e.latlng.lat],
          });
        });

        group.addLayer(poly);
        count++;
      });
      performanceTracker.recordLayerDuration('boundary', performance.now() - t0, count);
    } catch (err) {
      console.warn('Error rendering boundary:', err);
      performanceTracker.updateMapLayer({ id: 'boundary', status: 'error', error: String(err) });
    }
  }, [dataset.boundary, visibleLayers.boundary, dataset.villageName, selectedFeature]);

  // 6a. Render Authoritative Selected Settlement Marker Pin on Map
  useEffect(() => {
    const group = selectedLocationMarkerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!currentLocation?.center) return;
    const [cLng, cLat] = currentLocation.center;
    if (!isValidIndiaCoordinate(cLat, cLng)) return;

    try {
      const locIcon = L.divIcon({
        className: 'custom-selected-location-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
            <div style="background: #1d4ed8; color: #ffffff; font-weight: 700; font-size: 11px; padding: 2.5px 8px; border-radius: 9999px; white-space: nowrap; border: 1.5px solid #ffffff; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
              <span style="font-size: 12px;">📍</span>
              <span>${currentLocation.name}</span>
            </div>
            <div style="width: 2px; height: 6px; background: #1d4ed8;"></div>
            <div style="width: 7px; height: 7px; border-radius: 50%; background: #1d4ed8; border: 1.5px solid #ffffff;"></div>
          </div>
        `,
        iconSize: [140, 34],
        iconAnchor: [70, 34],
      });
      const marker = L.marker([cLat, cLng], { icon: locIcon, pane: 'markerPane', zIndexOffset: 800 });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 4px; min-width: 190px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">📍 ${currentLocation.name}</div>
          <div style="color: #64748b; font-size: 11px;">
            ${currentLocation.subdistrict ? currentLocation.subdistrict + ', ' : ''}${currentLocation.district ? currentLocation.district + ', ' : ''}${currentLocation.state}
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-family: monospace; font-size: 10px; color: #475569;">
            Center: ${cLat.toFixed(4)}°N, ${cLng.toFixed(4)}°E<br/>
            Elevation: ~${currentLocation.elevation_m || 25}m AMSL<br/>
            Admin Level: ${currentLocation.adminLevel.replace('_', ' ')}<br/>
            Source: ${currentLocation.source || 'Official Gazetteer'}
          </div>
        </div>
      `);
      group.addLayer(marker);
    } catch (err) {
      console.warn('Error rendering selected location marker:', err);
    }
  }, [currentLocation]);

  // 6b. Render Dynamic, Hazard-Aware Impact Boundary & Exposure Zones
  useEffect(() => {
    const group = impactZoneGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.impactZone) {
      performanceTracker.updateMapLayer({ id: 'impactZone', visible: false, status: 'hidden' });
      return;
    }

    const features = dynamicHazardImpactZone?.features?.features || [];
    if (features.length === 0) {
      performanceTracker.updateMapLayer({ id: 'impactZone', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      let count = 0;
      features.forEach((feat) => {
        if (!feat.geometry?.coordinates) return;
        const ring = feat.geometry.coordinates[0];
        if (!ring || ring.length < 3) return;
        const latLngs = ring
          .map((c) => toLatLng(c as [number, number]))
          .filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
        if (latLngs.length < 3) return;

        const props = feat.properties;
        const isSelected =
          selectedFeature &&
          (selectedFeature.category === 'hazard_impact_zone' || selectedFeature.category === 'hazard_zone') &&
          ((props.id && selectedFeature.properties?.id === props.id) ||
            selectedFeature.properties?.zoneName === props.zoneName ||
            (props.intensityLabel && selectedFeature.properties?.intensityLabel === props.intensityLabel));

        const poly = L.polygon(latLngs, {
          color: isSelected ? '#0f172a' : (props.strokeColor || props.color),
          weight: isSelected ? 3.5 : (props.weight || 1.8),
          dashArray: isSelected ? undefined : props.dashArray,
          opacity: isSelected ? 1 : 0.9,
          fillColor: props.color,
          fillOpacity: isSelected ? Math.min(0.48, (props.fillOpacity ?? 0.22) + 0.18) : (props.fillOpacity ?? 0.22),
          pane: 'hazardOverlayPane',
        });
        if (isSelected) {
          poly.bringToFront();
        }

        const metricsHtml = props.metrics
          ? Object.entries(props.metrics)
              .map(
                ([k, v]) =>
                  `<div style="display: flex; justify-content: space-between; font-size: 10px; gap: 8px;"><span style="color: #64748b;">${k}:</span><span style="font-family: monospace; font-weight: 600; color: #0f172a;">${v}</span></div>`
              )
              .join('')
          : '';

        poly.bindTooltip(
          `<div class="p-1.5 font-sans text-xs" style="width: 100%; box-sizing: border-box;">
            <div class="flex items-center gap-1.5 font-bold text-slate-800">
              <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" style="background-color: ${props.color}"></span>
              <span style="white-space: normal; word-break: normal;">${props.intensityLabel || props.zoneName}</span>
            </div>
            <div class="text-[11px] text-slate-600 mt-1 leading-snug" style="white-space: normal; word-break: normal;">${props.description}</div>
            ${metricsHtml ? `<div class="mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5">${metricsHtml}</div>` : ''}
            <div class="mt-1.5 pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
              <span>Basis: ${props.dataConfidence}</span>
              <span>Area: ${props.areaHa} ha</span>
            </div>
          </div>`,
          { sticky: false, direction: 'top', className: 'hazard-impact-tooltip' }
        );

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          mapRef.current?.closePopup();
          if (poly.getTooltip()) poly.closeTooltip();
          onSelectFeature?.({
            category: 'hazard_impact_zone',
            properties: props,
            geometry: feat.geometry,
            coordinates: [e.latlng.lng, e.latlng.lat],
          });
        });

        group.addLayer(poly);
        count++;
      });
      performanceTracker.recordLayerDuration('impactZone', performance.now() - t0, count);
    } catch (err) {
      console.warn('Error rendering dynamic hazard impact zone:', err);
      performanceTracker.updateMapLayer({ id: 'impactZone', status: 'error', error: String(err) });
    }
  }, [dynamicHazardImpactZone, visibleLayers.impactZone, selectedFeature]);

  // 6c. Render Official IMD Cyclone Wind Warning & Interactive Cyclone Tracking
  useEffect(() => {
    const group = cycloneWindGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.imdCycloneWind) {
      performanceTracker.updateMapLayer({ id: 'imdCycloneWind', visible: false, status: 'hidden' });
      return;
    }

    const t0 = performance.now();
    try {
      let featureCount = 0;

      // Case 1: Interactive Cyclone Tracking Mode (Live or Demo Scenario)
      if (cycloneState && cycloneState.steps && cycloneState.steps.length > 0) {
        const isDemo = cycloneState.mode === 'demo';

        // A. Uncertainty Cone
        if (cycloneState.uncertaintyConeGeoJson?.features?.length > 0) {
          const coneLayer = L.geoJSON(cycloneState.uncertaintyConeGeoJson as any, {
            style: {
              color: '#ef4444',
              weight: 1.5,
              dashArray: '4, 4',
              fillColor: '#fca5a5',
              fillOpacity: 0.20,
              pane: 'hazardOverlayPane',
            },
            onEachFeature: (feature, layer) => {
              layer.bindTooltip(
                `<div class="p-1.5 font-sans text-xs">
                  <div class="font-bold text-red-700">Forecast Uncertainty Cone</div>
                  <div class="text-[10px] text-slate-600">Envelope of potential storm center deviation over time</div>
                  ${isDemo ? '<div class="text-[9px] text-amber-700 font-bold mt-0.5">DEMO SCENARIO</div>' : ''}
                </div>`,
                { sticky: true }
              );
            },
          });
          group.addLayer(coneLayer);
        }

        // B. Wind Radii Polygons at current step
        if (cycloneState.windRadiiGeoJson?.features?.length > 0) {
          const windLayer = L.geoJSON(cycloneState.windRadiiGeoJson as any, {
            style: (feature) => {
              const props = feature?.properties || {};
              return {
                color: props.strokeColor || '#ea580c',
                weight: props.weight || 2,
                fillColor: props.fillColor || '#f97316',
                fillOpacity: props.fillOpacity || 0.28,
                pane: 'hazardOverlayPane',
              };
            },
            onEachFeature: (feature, polyLayer) => {
              const props = feature?.properties || {};
              polyLayer.bindTooltip(
                `<div class="p-2 font-sans text-xs" style="max-width: 220px;">
                  <div class="flex items-center gap-1.5 font-bold text-slate-800">
                    <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" style="background-color: ${props.fillColor}"></span>
                    <span>${isDemo ? '[DEMO] ' : ''}${props.label}</span>
                  </div>
                  <div class="text-[10.5px] text-slate-600 mt-1">Sustained wind threshold: ~${props.speedKmh} km/h</div>
                  <div class="text-[9px] text-slate-400 mt-1">${isDemo ? 'Illustrative Scenario Radii' : 'Official IMD Radii'}</div>
                </div>`,
                { sticky: true }
              );

              polyLayer.on('click', (e: any) => {
                L.DomEvent.stopPropagation(e);
                onSelectFeature?.({
                  category: 'hazard_impact_zone',
                  properties: {
                    ...props,
                    zoneName: `${isDemo ? '[DEMO SCENARIO] ' : 'IMD Cyclone: '}${props.label}`,
                    intensityLabel: `${props.speedKmh} km/h Wind Zone`,
                    scientificBasis: isDemo ? 'Interactive Demonstration Scenario — Not a Real Warning' : 'Official IMD Cyclone Advisory',
                    dataConfidence: isDemo ? 'Illustrative Demo Track' : 'Official IMD RSMC Telemetry',
                  },
                  coordinates: [e.latlng.lng, e.latlng.lat],
                });
              });
            },
          });
          group.addLayer(windLayer);
        }

        // C. Trajectory Track (Solid observed, dashed forecast)
        if (cycloneState.trackGeoJson?.features?.length > 0) {
          const trackLayer = L.geoJSON(cycloneState.trackGeoJson as any, {
            style: (feature) => {
              const props = feature?.properties || {};
              if (feature?.geometry?.type === 'LineString') {
                return {
                  color: props.color || '#dc2626',
                  weight: props.weight || 3,
                  dashArray: props.dashArray || undefined,
                  opacity: 0.85,
                  pane: 'hazardOverlayPane',
                };
              }
              return {};
            },
            pointToLayer: (feature, latlng) => {
              const props = feature.properties || {};
              const isCurrent = props.pointType === 'CURRENT';
              if (isCurrent) return L.circleMarker(latlng, { radius: 0 }); // handled by custom eye marker below

              return L.circleMarker(latlng, {
                radius: 4.5,
                fillColor: props.pointType === 'OBSERVED' ? '#1e293b' : '#dc2626',
                color: '#ffffff',
                weight: 1.5,
                fillOpacity: 0.9,
                pane: 'hazardOverlayPane',
              });
            },
            onEachFeature: (feature, layer) => {
              if (feature.geometry.type === 'Point') {
                const props = feature.properties || {};
                layer.bindTooltip(
                  `<div class="p-1 font-sans text-xs">
                    <span class="font-bold text-slate-800">${props.label}: ${props.intensity}</span>
                    <div class="text-[10px] text-slate-600">${props.windKmh} km/h (${props.windKnots} kt) · ${props.pressureHpa} hPa</div>
                  </div>`,
                  { sticky: true }
                );
              }
            },
          });
          group.addLayer(trackLayer);
        }

        // D. Current Storm Eye Center Marker
        const currentStep = cycloneState.steps[cycloneState.currentStepIndex];
        if (currentStep) {
          const [eyeLon, eyeLat] = currentStep.coordinates;
          const eyeIcon = L.divIcon({
            className: 'cyclone-eye-icon',
            html: `
              <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(220, 38, 38, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #dc2626; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; font-size: 14px;">
                  🌀
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const eyeMarker = L.marker([eyeLat, eyeLon], { icon: eyeIcon, pane: 'markerPane' });
          eyeMarker.bindTooltip(
            `<div class="p-1.5 font-sans text-xs">
              <div class="font-bold text-slate-900">${cycloneState.stormName} (${currentStep.intensityLabel})</div>
              <div class="text-[10.5px] text-slate-700">Max Wind: ${currentStep.maxWindKmh} km/h (${currentStep.maxWindKnots} kt)</div>
              <div class="text-[10px] text-slate-500">Pressure: ${currentStep.centralPressureHpa} hPa · Forward: ${currentStep.forwardSpeedKmh} km/h</div>
              ${isDemo ? '<div class="text-[9px] text-amber-700 font-bold mt-0.5">DEMONSTRATION TRACK</div>' : ''}
            </div>`,
            { permanent: false }
          );

          eyeMarker.on('click', () => {
            onSelectFeature?.({
              category: 'hazard_impact_zone',
              properties: {
                zoneName: `${isDemo ? '[DEMO] ' : ''}Cyclone Center: ${cycloneState.stormName}`,
                intensityLabel: `${currentStep.intensityLabel} (${currentStep.maxWindKmh} km/h)`,
                scientificBasis: isDemo ? 'Interactive Demonstration Model' : 'Official IMD Center Observation',
                dataConfidence: isDemo ? 'Demo Track Scenario' : 'Verified IMD Cyclone Center Fix',
              },
              coordinates: [eyeLon, eyeLat],
            });
          });

          group.addLayer(eyeMarker);
        }

        return;
      }

      // Case 2: Fallback to existing static imdCycloneWindData MultiPolygons
      if (
        imdCycloneWindData?.geoJsonFeatureCollection?.features &&
        imdCycloneWindData.geoJsonFeatureCollection.features.length > 0
      ) {
        const geoJsonLayer = L.geoJSON(imdCycloneWindData.geoJsonFeatureCollection as any, {
          filter: (feature: any) => {
            const tKey = feature?.properties?.threshold;
            if (tKey && visibleWindThresholds[tKey] === false) return false;
            return true;
          },
          style: (feature) => {
            const props = feature?.properties || {};
            return {
              color: props.strokeColor || '#ea580c',
              weight: 2,
              dashArray: props.dashArray || undefined,
              opacity: 0.9,
              fillColor: props.color || '#f97316',
              fillOpacity: props.fillOpacity || 0.28,
              pane: 'hazardOverlayPane',
            };
          },
          onEachFeature: (feature, polyLayer) => {
            const props = feature.properties || {};
            const isDemo = imdCycloneWindData.connectionStatus === 'BENCHMARK_SCENARIO' || props.isDemonstration;
            polyLayer.bindTooltip(
              `<div class="p-2 font-sans text-xs" style="max-width: 250px;">
                <div class="flex items-center gap-1.5 font-bold text-slate-800">
                  <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" style="background-color: ${props.color}"></span>
                  <span>${isDemo ? '[BENCHMARK / TEST DATA] ' : ''}${props.threshold} (${props.kmh} km/h)</span>
                </div>
                <div class="text-[11px] font-semibold text-slate-700 mt-0.5">${props.categoryLabel}</div>
                <div class="text-[10px] text-slate-600 mt-1 leading-snug">${props.description}</div>
                <div class="mt-1.5 pt-1 border-t border-slate-200 flex justify-between text-[9px] text-slate-400">
                  <span>Threshold Area: ${props.totalAreaKm2} km²</span>
                  <span>${isDemo ? 'BENCHMARK FIXTURE' : 'Source: IMD RSMC'}</span>
                </div>
              </div>`,
              { sticky: true, className: 'hazard-impact-tooltip' }
            );

            polyLayer.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              onSelectFeature?.({
                category: 'hazard_impact_zone',
                properties: {
                  ...props,
                  zoneName: `${isDemo ? '[BENCHMARK / TEST DATA] ' : 'IMD Cyclone Wind Warning: '}${props.threshold} (${props.kmh} km/h)`,
                  intensityLabel: props.categoryLabel,
                  scientificBasis: isDemo
                    ? 'Benchmark / Test Data — Not a Current Official Warning'
                    : 'Official IMD Cyclone Wind Warning MultiPolygon Feed (api.imd.gov.in/api/v1/cyclone_wind)',
                  dataConfidence: isDemo ? 'Benchmark Test Fixture (Demo)' : 'Official Verified Live Geometry',
                  areaHa: Math.round((props.totalAreaKm2 || 0) * 100),
                },
                geometry: feature.geometry,
                coordinates: [e.latlng.lng, e.latlng.lat],
              });
            });
          },
        });

        group.addLayer(geoJsonLayer);
        featureCount += imdCycloneWindData.geoJsonFeatureCollection?.features?.length || 0;
      }

      if (featureCount === 0) {
        performanceTracker.updateMapLayer({ id: 'imdCycloneWind', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      } else {
        performanceTracker.recordLayerDuration('imdCycloneWind', performance.now() - t0, featureCount);
      }
    } catch (err) {
      console.warn('Error rendering Cyclone Wind / Track layer:', err);
      performanceTracker.updateMapLayer({ id: 'imdCycloneWind', status: 'error', error: String(err) });
    }
  }, [cycloneState, imdCycloneWindData, visibleLayers.imdCycloneWind, visibleWindThresholds]);

  // 7. Render Water Bodies
  useEffect(() => {
    const group = waterGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.waterBodies) {
      performanceTracker.updateMapLayer({ id: 'waterBodies', visible: false, status: 'hidden' });
      return;
    }

    const features = dataset.waterBodies?.features || [];
    if (features.length === 0) {
      performanceTracker.updateMapLayer({ id: 'waterBodies', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      let count = 0;
      features.forEach((wb) => {
        const ring = wb.geometry?.coordinates?.[0];
        if (!ring || ring.length < 3) return;
        const latLngs = ring
          .map((c) => toLatLng(c as [number, number]))
          .filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
        if (latLngs.length < 3) return;

        const poly = L.polygon(latLngs, {
          color: '#0284c7',
          weight: 1.5,
          opacity: 0.9,
          fillColor: '#0ea5e9',
          fillOpacity: 0.35,
          pane: 'waterBodiesPane',
        });

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectFeature?.({
            category: 'water_body',
            properties: wb.properties,
            geometry: wb.geometry,
            coordinates: [e.latlng.lng, e.latlng.lat],
          });
        });

        group.addLayer(poly);
        count++;
      });
      performanceTracker.recordLayerDuration('waterBodies', performance.now() - t0, count);
    } catch (err) {
      console.warn('Error rendering water bodies:', err);
      performanceTracker.updateMapLayer({ id: 'waterBodies', status: 'error', error: String(err) });
    }
  }, [dataset.waterBodies, visibleLayers.waterBodies]);

  // 8. Render Retention Ponds
  useEffect(() => {
    const group = retentionGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.retentionPonds) {
      performanceTracker.updateMapLayer({ id: 'retentionPonds', visible: false, status: 'hidden' });
      return;
    }

    const activePonds = proposedPondsOverride || dataset.retentionPonds;
    const features = activePonds?.features || [];
    if (features.length === 0) {
      performanceTracker.updateMapLayer({ id: 'retentionPonds', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      let count = 0;
      features.forEach((rp) => {
        const ring = rp.geometry?.coordinates?.[0];
        if (!ring || ring.length < 3) return;
        const latLngs = ring
          .map((c) => toLatLng(c as [number, number]))
          .filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
        if (latLngs.length < 3) return;

        const poly = L.polygon(latLngs, {
          color: '#059669',
          weight: 2,
          opacity: 0.9,
          fillColor: '#10b981',
          fillOpacity: 0.35,
          pane: 'retentionPondsPane',
        });

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectFeature?.({
            category: 'retention_pond',
            properties: rp.properties,
            geometry: rp.geometry,
            coordinates: [e.latlng.lng, e.latlng.lat],
          });
        });

        group.addLayer(poly);
        count++;
      });
      performanceTracker.recordLayerDuration('retentionPonds', performance.now() - t0, count);
    } catch (err) {
      console.warn('Error rendering retention ponds:', err);
      performanceTracker.updateMapLayer({ id: 'retentionPonds', status: 'error', error: String(err) });
    }
  }, [dataset.retentionPonds, proposedPondsOverride, visibleLayers.retentionPonds]);

  // 8.5 Viewport-driven nationwide road network loader
  useEffect(() => {
    if (!visibleLayers.roads) {
      setViewportRoads([]);
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds || !bounds.isValid()) return;

    const reqId = ++roadReqIdRef.current;
    const abortController = new AbortController();

    const vpBounds: ViewportBounds = {
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    };

    fetchRoadsForViewport(vpBounds, map.getZoom(), abortController.signal)
      .then((res) => {
        if (reqId === roadReqIdRef.current && res?.roads?.features) {
          setViewportRoads(res.roads.features);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[VillageMap] Viewport roads fetch warning:', err);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [visibleLayers.roads, mapViewportRev, mapZoom]);

  // 9. Render Roads Network
  useEffect(() => {
    const group = roadsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.roads) {
      performanceTracker.updateMapLayer({ id: 'roads', visible: false, status: 'hidden' });
      return;
    }

    const datasetFeatures = dataset.roads?.features || [];
    const roadMap = new Map<string, any>();

    // Register local dataset roads
    datasetFeatures.forEach((rd: any) => {
      const id = rd.properties?.id || `ds_${rd.properties?.name || ''}_${Math.random()}`;
      roadMap.set(id, rd);
    });

    // Register viewport roads
    viewportRoads.forEach((rd: any) => {
      const id = rd.properties?.id || `vp_${rd.properties?.name || ''}_${rd.geometry?.coordinates?.[0]?.[0]}`;
      if (!roadMap.has(id)) {
        roadMap.set(id, rd);
      }
    });

    const allRoads = Array.from(roadMap.values());
    if (allRoads.length === 0) {
      performanceTracker.updateMapLayer({ id: 'roads', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {

      allRoads.forEach((rd) => {
        const rawCoords = rd.geometry?.coordinates;
        if (!rawCoords || rawCoords.length < 2) return;

        const lines: Array<Array<[number, number]>> =
          (rd.geometry as any)?.type === 'MultiLineString'
            ? (rawCoords as any).map((line: any) =>
                line
                  .map((c: any) => toLatLng(c as [number, number]))
                  .filter(([lat, lng]: [number, number]) => isFinite(lat) && isFinite(lng))
              )
            : [
                rawCoords
                  .map((c: any) => toLatLng(c as [number, number]))
                  .filter(([lat, lng]: [number, number]) => isFinite(lat) && isFinite(lng)),
              ];

        lines.forEach((latLngs) => {
          if (latLngs.length < 2) return;
          const highwayClass = classifyHighway(rd.properties?.highway, rd.properties?.roadType);
          const isNational =
            highwayClass === 'national_highway' ||
            rd.properties?.roadType?.includes('National') ||
            rd.properties?.highway === 'trunk' ||
            rd.properties?.highway === 'motorway';
          const isState =
            highwayClass === 'state_highway' ||
            rd.properties?.roadType?.includes('State') ||
            rd.properties?.highway === 'primary';
          const isMajor =
            highwayClass === 'major_road' ||
            rd.properties?.roadType?.includes('District') ||
            rd.properties?.roadType?.includes('Arterial') ||
            rd.properties?.highway === 'secondary';
          const isBund = rd.properties?.roadType?.includes('Bund') || rd.properties?.roadType?.includes('Embankment');
          const isTrack =
            highwayClass === 'track_service' ||
            rd.properties?.roadType?.includes('Track') ||
            rd.properties?.roadType?.includes('Agricultural');

          // 1. Evaluate road hazard status from simulation results and active hazard overlays
          let roadStatus: 'passable' | 'caution' | 'severed' = 'passable';
          let hazardDepth_m: number | undefined = undefined;

          // Check canonical simulation affected roads
          const simMatch = affectedRoads.find((ar) => ar.id === rd.properties?.id);
          if (simMatch) {
            if (simMatch.impassable) {
              roadStatus = 'severed';
              hazardDepth_m = simMatch.depth_m;
            } else if (simMatch.depth_m > 0) {
              roadStatus = 'caution';
              hazardDepth_m = simMatch.depth_m;
            }
          }

          // Check spatial intersection with active multi-hazard overlays if present
          if (activeHazardPolygons?.features && activeHazardPolygons.features.length > 0) {
            const rawLine = (rd.geometry as any)?.type === 'LineString' ? (rd.geometry.coordinates as any) : rawCoords[0];
            if (Array.isArray(rawLine) && rawLine.length >= 2) {
              for (const poly of activeHazardPolygons.features) {
                const ring = poly.geometry?.coordinates?.[0];
                if (ring && ring.length >= 3 && doesLineStringIntersectPolygonRing(rawLine, ring)) {
                  const props = poly.properties || {};
                  if (
                    props.tier === 'extreme' ||
                    (props.surge_m || 0) > 0.3 ||
                    (props.windSpeed_kmh || 0) >= 130 ||
                    (props.depth_m || 0) > 0.25
                  ) {
                    roadStatus = 'severed';
                    hazardDepth_m = props.depth_m || props.surge_m;
                  } else if (roadStatus !== 'severed') {
                    roadStatus = 'caution';
                    hazardDepth_m = props.depth_m || props.surge_m;
                  }
                }
              }
            }
          }

          // 2. Cartographic styling based on physical hierarchy & status
          let color = '#64748b'; // default slate for passable rural roads
          let weight = 2.2;
          let dashArray: string | undefined = undefined;

          if (roadStatus === 'severed') {
            color = '#dc2626'; // Red alert for severed roads
            weight = isNational ? 4.0 : isState ? 3.5 : 3.0;
            dashArray = '8, 6';
          } else if (roadStatus === 'caution') {
            color = '#f59e0b'; // Amber warning for waterlogged roads
            weight = isNational ? 3.6 : isState ? 3.2 : 2.8;
            dashArray = '6, 4';
          } else {
            // Authentic cartographic road styling (clearly distinct from calculated navigation routes)
            if (isNational) {
              color = '#b45309'; // Classic amber/gold ochre for National Highways (NHAI)
              weight = 2.8;
            } else if (isState) {
              color = '#2563eb'; // High-contrast cobalt blue for State Highways (PWD)
              weight = 2.4;
            } else if (isMajor) {
              color = '#0284c7'; // Sky/arterial blue for major district & connecting corridors
              weight = 2.0;
            } else if (isBund) {
              color = '#059669'; // Emerald for canal bunds/embankments
              weight = 1.8;
            } else if (isTrack) {
              color = '#94a3b8'; // Muted slate for rural & agricultural tracks
              weight = 1.4;
              dashArray = '5, 5';
            } else {
              color = '#64748b'; // Slate gray for local village roads & streets
              weight = 1.6;
            }
          }

          // Subtle casing for contrast on imagery
          if (roadStatus === 'severed') {
            const casing = L.polyline(latLngs, {
              color: '#450a0a',
              weight: weight + 1.8,
              opacity: 0.85,
              pane: 'roadsPane',
              interactive: false,
            });
            group.addLayer(casing);
          } else if (isNational || isState) {
            const casing = L.polyline(latLngs, {
              color: '#1e293b',
              weight: weight + 1.2,
              opacity: 0.5,
              pane: 'roadsPane',
              interactive: false,
            });
            group.addLayer(casing);
          }

          const line = L.polyline(latLngs, {
            color,
            weight,
            dashArray,
            opacity: 0.95,
            pane: 'roadsPane',
          });

          // Interactive Tooltip distinguishing Base Road from Evacuation Lifelines
          const isVettedEvac = Boolean(rd.properties?.isEvacuationCorridor);
          const networkBadge = isVettedEvac
            ? `<span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:1px 5px; border-radius:3px; font-weight:700; font-size:9px;">★ VETTED EVACUATION CORRIDOR</span>`
            : `<span style="display:inline-block; background:#f1f5f9; color:#475569; padding:1px 5px; border-radius:3px; font-weight:600; font-size:9px;">BASE ROAD NETWORK</span>`;

          const statusBadge =
            roadStatus === 'severed'
              ? `<div style="display:inline-flex; align-items:center; gap:4px; background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px; margin-bottom:3px;">⛔ IMPASSABLE / SEVERED</div>`
              : roadStatus === 'caution'
              ? `<div style="display:inline-flex; align-items:center; gap:4px; background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px; margin-bottom:3px;">⚠️ CAUTION — PARTIALLY WATERLOGGED</div>`
              : `<div style="display:inline-flex; align-items:center; gap:4px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px; margin-bottom:3px;">✓ PASSABLE</div>`;

          const detailNote =
            roadStatus === 'severed'
              ? `<span style="color:#b91c1c; font-size:10px; font-weight:600; display:block;">Water Depth: ${typeof hazardDepth_m === 'number' ? hazardDepth_m + 'm' : '>0.25m'} · Route Blocked</span>`
              : roadStatus === 'caution'
              ? `<span style="color:#b45309; font-size:10px; font-weight:600; display:block;">Water Depth: ${typeof hazardDepth_m === 'number' ? hazardDepth_m + 'm' : '≤0.25m'} · High-Clearance Vehicles Only</span>`
              : `<span style="color:#15803d; font-size:10px; font-weight:600; display:block;">Passable Road · Dry / Unaffected</span>`;

          line.bindTooltip(
            `<div style="font-family: system-ui, sans-serif; font-size: 11px; line-height: 1.35; padding: 3px;">
              ${statusBadge}
              <div style="margin-bottom:2px;">${networkBadge}</div>
              <strong style="color: #0f172a; display: block;">${rd.properties?.name || 'Road Corridor'}</strong>
              ${detailNote}
              <span style="color: #64748b; font-size: 10px; display: block;">${rd.properties?.roadType || 'Road'} · ${rd.properties?.surface || 'Paved'}${rd.properties?.length_m ? ' · ' + rd.properties.length_m + 'm' : ''}</span>
            </div>`,
            { sticky: true, opacity: 0.95 }
          );

          line.on('mouseover', () => {
            line.setStyle({ weight: weight + 1.5, opacity: 1 });
          });

          line.on('mouseout', () => {
            line.setStyle({ weight, opacity: 0.95 });
          });

          line.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectFeature?.({
              category: 'road',
              properties: {
                ...rd.properties,
                status: roadStatus,
                hazardDepth_m,
              },
              geometry: rd.geometry,
              coordinates: [e.latlng.lng, e.latlng.lat],
            });
          });

          group.addLayer(line);
        });
      });
      performanceTracker.recordLayerDuration('roads', performance.now() - t0, allRoads.length);
    } catch (err) {
      console.warn('Error rendering roads:', err);
      performanceTracker.updateMapLayer({ id: 'roads', status: 'error', error: String(err) });
    }
  }, [dataset.roads, viewportRoads, visibleLayers.roads, affectedRoads, activeHazardPolygons, onSelectFeature]);

  // 10. Render Drainage Lines
  useEffect(() => {
    const group = drainageGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.drainageExisting) {
      performanceTracker.updateMapLayer({ id: 'drainageExisting', visible: false, status: 'hidden' });
    }
    if (!visibleLayers.drainageProposed) {
      performanceTracker.updateMapLayer({ id: 'drainageProposed', visible: false, status: 'hidden' });
    }

    const activeDrains = proposedDrainsOverride || dataset.drainageLines;
    const allDrains = activeDrains?.features || [];

    const existingFeatures = allDrains.filter((d) => d.properties?.status !== 'proposed');
    const proposedFeatures = allDrains.filter((d) => d.properties?.status === 'proposed');

    if (visibleLayers.drainageExisting && existingFeatures.length === 0) {
      performanceTracker.updateMapLayer({ id: 'drainageExisting', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
    }
    if (visibleLayers.drainageProposed && proposedFeatures.length === 0) {
      performanceTracker.updateMapLayer({ id: 'drainageProposed', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
    }

    if ((!visibleLayers.drainageExisting || existingFeatures.length === 0) &&
        (!visibleLayers.drainageProposed || proposedFeatures.length === 0)) {
      return;
    }

    const t0 = performance.now();
    let renderedExisting = 0;
    let renderedProposed = 0;

    try {
      allDrains.forEach((dr) => {
        const isProposed = dr.properties?.status === 'proposed';
        if (isProposed && !visibleLayers.drainageProposed) return;
        if (!isProposed && !visibleLayers.drainageExisting) return;

        const rawCoords = dr.geometry?.coordinates;
        if (!rawCoords || rawCoords.length < 2) return;

        const lines: Array<Array<[number, number]>> =
          (dr.geometry as any)?.type === 'MultiLineString'
            ? (rawCoords as any).map((line: any) =>
                line
                  .map((c: any) => toLatLng(c as [number, number]))
                  .filter(([lat, lng]: [number, number]) => isFinite(lat) && isFinite(lng))
              )
            : [
                rawCoords
                  .map((c) => toLatLng(c as [number, number]))
                  .filter(([lat, lng]) => isFinite(lat) && isFinite(lng)),
              ];

        lines.forEach((latLngs) => {
          if (latLngs.length < 2) return;
          const line = L.polyline(latLngs, {
            color: isProposed ? '#9333ea' : '#059669',
            weight: 3.5,
            opacity: 0.95,
            dashArray: isProposed ? '6, 6' : undefined,
            pane: 'drainagePane',
          });

          line.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectFeature?.({
              category: 'drainage',
              properties: dr.properties,
              geometry: dr.geometry,
              coordinates: [e.latlng.lng, e.latlng.lat],
            });
          });

          group.addLayer(line);
          if (isProposed) {
            renderedProposed++;
          } else {
            renderedExisting++;
          }
        });
      });

      const elapsed = performance.now() - t0;
      if (visibleLayers.drainageExisting && renderedExisting > 0) {
        performanceTracker.recordLayerDuration('drainageExisting', elapsed / 2, renderedExisting);
      }
      if (visibleLayers.drainageProposed && renderedProposed > 0) {
        performanceTracker.recordLayerDuration('drainageProposed', elapsed / 2, renderedProposed);
      }
    } catch (err) {
      console.warn('Error rendering drainage lines:', err);
      if (visibleLayers.drainageExisting) performanceTracker.updateMapLayer({ id: 'drainageExisting', status: 'error', error: String(err) });
      if (visibleLayers.drainageProposed) performanceTracker.updateMapLayer({ id: 'drainageProposed', status: 'error', error: String(err) });
    }
  }, [dataset.drainageLines, proposedDrainsOverride, visibleLayers.drainageExisting, visibleLayers.drainageProposed]);

  // 11. Render Building Footprints
  useEffect(() => {
    const group = buildingsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.buildings) {
      performanceTracker.updateMapLayer({ id: 'buildings', visible: false, status: 'hidden' });
      return;
    }

    const features = dataset.buildings?.features || [];
    if (features.length === 0) {
      performanceTracker.updateMapLayer({ id: 'buildings', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      features.forEach((bld) => {
        const rawCoords = bld.geometry?.coordinates;
        if (!rawCoords) return;

        const rings: Array<Array<any>> =
          (bld.geometry as any)?.type === 'MultiPolygon'
            ? (rawCoords as any).map((poly: any) => poly[0])
            : [rawCoords[0]];

        rings.forEach((ring) => {
          if (!ring || ring.length < 3) return;
          const latLngs = ring
            .map((c: any) => toLatLng(c as [number, number]))
            .filter(([lat, lng]: [number, number]) => isFinite(lat) && isFinite(lng));
          if (latLngs.length < 3) return;

          const bType = (bld.properties as Record<string, any> | undefined)?.type;
          const isCritical = Boolean(bType && ['school', 'clinic', 'panchayat', 'water_facility'].includes(bType));
          const color =
            bType === 'school'
              ? '#4f46e5'
              : bType === 'clinic'
              ? '#ef4444'
              : bType === 'panchayat'
              ? '#d97706'
              : bType === 'water_facility'
              ? '#0284c7'
              : bType === 'agriculture'
              ? '#16a34a'
              : bType === 'religious'
              ? '#9333ea'
              : bType === 'commercial'
              ? '#ea580c'
              : '#475569';

          const poly = L.polygon(latLngs, {
            color: isCritical ? '#0f172a' : '#1e293b',
            weight: isCritical ? 2 : 1.5,
            fillColor: color,
            fillOpacity: 0.5,
            pane: 'buildingsPane',
          });

          const center = poly.getBounds().getCenter();
          const props: Record<string, any> = (bld.properties as Record<string, any>) || {};
          const bName: string = props.name || 'Building Footprint';
          const bId: string = String(props.osm_id || props.osmId || props.id || 'N/A');
          const bTypeLabel: string = String(props.type || props.building_use || 'General').toUpperCase();
          const groundElev = props.ground_elevation_m !== undefined
            ? `${props.ground_elevation_m}m`
            : props.groundElevation_m !== undefined
            ? `${props.groundElevation_m}m`
            : props.elevation_m !== undefined
            ? `${props.elevation_m}m`
            : 'N/A';
          const plinthElev = props.plinth_elevation_m !== undefined
            ? `${props.plinth_elevation_m}m`
            : props.plinthElevation_m !== undefined
            ? `${props.plinthElevation_m}m`
            : 'N/A';
          const plinthHeight = props.plinth_height_m !== undefined
            ? `${props.plinth_height_m}m`
            : props.plinthHeight_cm !== undefined
            ? `${(props.plinthHeight_cm / 100).toFixed(2)}m`
            : '0.45m';
          const occupants = props.occupants ?? props.occupancy ?? '—';
          const construction: string = props.construction || props.structure || props.constructionType || 'Masonry / RCC';
          const isSynthetic = Boolean(props.isSynthetic || props.source?.includes('Demo') || props.source?.includes('Synthetic'));
          const provenanceLabel = isSynthetic
            ? 'Synthetic Demo Placeholder (Illustrative)'
            : String(props.source || props.provenance || 'OpenStreetMap Building Footprints');

          const popupHtml = `
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; padding: 2px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: ${isSynthetic ? '#f3e8ff' : '#e2e8f0'}; color: ${isSynthetic ? '#6b21a8' : '#0f172a'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isSynthetic ? '#d8b4fe' : '#cbd5e1'};">
                  ${isSynthetic ? 'DEMO PLACEHOLDER' : bTypeLabel}
                </span>
                <span style="font-size: 10px; color: #64748b; font-family: monospace;">ID: ${bId}</span>
              </div>
              <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.25;">
                ${bName}
              </h4>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; font-size: 11px;">
                <div><span style="color: #64748b;">Ground Elev:</span> <strong style="color: #0f172a;">${groundElev}</strong></div>
                <div><span style="color: #64748b;">Plinth Elev:</span> <strong style="color: #0f172a;">${plinthElev}</strong></div>
                <div><span style="color: #64748b;">Plinth Ht:</span> <strong style="color: #0f172a;">${plinthHeight}</strong></div>
                <div><span style="color: #64748b;">Occupants:</span> <strong style="color: #0f172a;">${occupants}</strong></div>
                <div style="grid-column: span 2;"><span style="color: #64748b;">Construction:</span> <span style="color: #334155; font-weight: 500;">${construction}</span></div>
                <div style="grid-column: span 2; font-size: 10px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 3px; margin-top: 2px;">
                  <span>Source:</span> <strong style="color: ${isSynthetic ? '#7e22ce' : '#334155'};">${provenanceLabel}</strong>
                </div>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="bvt-zoom-btn" data-lat="${center.lat}" data-lng="${center.lng}" style="width: 100%; padding: 4px 8px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Zoom to building
                </button>
              </div>
            </div>
          `;

          poly.bindPopup(popupHtml, {
            autoPan: false,
            closeButton: true,
            className: 'bvt-compact-popup',
            maxWidth: 320,
            minWidth: 260,
          });

          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectFeature?.({
              category: 'building',
              properties: bld.properties,
              geometry: bld.geometry,
              coordinates: [e.latlng.lng, e.latlng.lat],
            });
          });

          group.addLayer(poly);
        });
      });
      performanceTracker.recordLayerDuration('buildings', performance.now() - t0, features.length);
    } catch (err) {
      console.warn('Error rendering buildings:', err);
      performanceTracker.updateMapLayer({ id: 'buildings', status: 'error', error: String(err) });
    }
  }, [dataset.buildings, visibleLayers.buildings]);

  // 12. Render Flood Inundation Depth Overlays (Translucent, Visible Cyan-Blue Depth Palette)
  useEffect(() => {
    const group = floodGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.floodExtent) {
      performanceTracker.updateMapLayer({ id: 'floodExtent', visible: false, status: 'hidden' });
      return;
    }

    const features = activeFloodGeoJson?.features || [];
    if (features.length === 0) {
      performanceTracker.updateMapLayer({ id: 'floodExtent', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      features.forEach((feat) => {
        if (!feat.geometry?.coordinates) return;

        // Support both Polygon and MultiPolygon geometry formats
        const geom = feat.geometry as any;
        const rings: Array<any> =
          geom?.type === 'MultiPolygon'
            ? geom.coordinates.map((poly: any) => poly[0])
            : geom?.type === 'Polygon'
            ? [geom.coordinates[0]]
            : [];

        rings.forEach((ring) => {
          if (!ring || ring.length < 3) return;
          const latLngs = ring
            .map((c: any) => toLatLng(c as [number, number]))
            .filter(([lat, lng]: [number, number]) => isFinite(lat) && isFinite(lng));
          if (latLngs.length < 3) return;

          const depth = feat.properties?.depth_m ?? 0.5;
          const isDeep = depth > 0.5;
          const isModerate = depth > 0.25 && depth <= 0.5;

          // Water Depth Palette: Distinct cyan-blue palette ensuring satellite imagery and roads remain visible
          // Deep (> 0.5m): Deep navy azure #1e3a8a / #1d4ed8
          // Moderate (0.25 - 0.5m): Clear royal water blue #2563eb
          // Shallow (<= 0.25m): Cyan water #0284c7 / #38bdf8
          const strokeColor = isDeep ? '#1e3a8a' : isModerate ? '#1d4ed8' : '#0284c7';
          const fillColor = isDeep ? '#1d4ed8' : isModerate ? '#2563eb' : '#38bdf8';
          const fillOpacity = isDeep ? 0.60 : isModerate ? 0.50 : 0.40;
          const weight = isDeep ? 2.5 : isModerate ? 2.0 : 1.8;

          const poly = L.polygon(latLngs, {
            color: strokeColor,
            weight,
            opacity: 0.9,
            fillColor,
            fillOpacity,
            pane: 'floodOverlayPane',
          });

          const floodPopupHtml = `
            <div style="width: 100%; box-sizing: border-box; font-family: inherit;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; padding-right: 20px;">
                <span style="width: 10px; height: 10px; border-radius: 9999px; background-color: ${fillColor}; flex-shrink: 0;"></span>
                <h4 style="font-size: 12px; font-weight: 700; color: #0f172a; margin: 0;">
                  Simulated Inundation Extent (${feat.properties?.category?.toUpperCase() || 'FLOOD'})
                </h4>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; background: #f0f9ff; border: 1px solid #bae6fd; padding: 4px 6px; border-radius: 4px;">
                <span style="color: #0369a1; font-weight: 600;">Water Depth:</span>
                <span style="font-weight: 800; color: #0284c7;">${depth.toFixed(2)} m (${Math.round(depth * 100)} cm)</span>
              </div>
              <div style="font-size: 10px; color: #475569; line-height: 1.4;">
                Physical pluvial ponding footprint based on local topographic depressions and infiltration rate.
              </div>
            </div>
          `;
          poly.bindPopup(floodPopupHtml, {
            maxWidth: 300,
            minWidth: 240,
            className: 'bvt-compact-popup',
            autoPan: false,
          });

          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectFeature?.({
              category: 'flood_inundation',
              properties: {
                name: `Simulated Inundation Zone (${feat.properties?.category?.toUpperCase() || 'FLOOD'})`,
                waterDepth_m: depth,
                description: `Peak simulated water depth: ${depth.toFixed(2)}m (${Math.round(depth * 100)} cm). Ingress risk depends on local building plinth heights.`,
              },
              coordinates: [e.latlng.lng, e.latlng.lat],
            });
          });

          group.addLayer(poly);
        });
      });
      performanceTracker.recordLayerDuration('floodExtent', performance.now() - t0, features.length);
    } catch (err) {
      console.warn('Error rendering flood inundation overlay:', err);
      performanceTracker.updateMapLayer({ id: 'floodExtent', status: 'error', error: String(err) });
    }
  }, [activeFloodGeoJson, visibleLayers.floodExtent]);

  // 13. Render Active Multi-Hazard Polygons (Only when specific physical hazard polygon exists)
  useEffect(() => {
    const group = hazardGroupRef.current;
    if (!group) return;
    group.clearLayers();

    try {
      if (!activeHazardPolygons?.features || activeHazardPolygons.features.length === 0) return;

      activeHazardPolygons.features.forEach((feat) => {
        if (!feat.geometry?.coordinates) return;
        const ring = feat.geometry.coordinates[0];
        if (!ring || ring.length < 3) return;
        const latLngs = ring
          .map((c) => toLatLng(c as [number, number]))
          .filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
        if (latLngs.length < 3) return;

        const level = feat.properties?.riskLevel;
        const color =
          level === 'very_high'
            ? '#ef4444'
            : level === 'high'
            ? '#f97316'
            : level === 'moderate'
            ? '#eab308'
            : '#10b981';

        const isSelected =
          selectedFeature &&
          (selectedFeature.category === 'hazard_impact_zone' || selectedFeature.category === 'hazard_zone') &&
          (selectedFeature.properties?.zoneName === (feat.properties?.zoneName || feat.properties?.intensityLabel));

        const poly = L.polygon(latLngs, {
          color: isSelected ? '#0f172a' : color,
          weight: isSelected ? 3.5 : 1.5,
          opacity: isSelected ? 1 : 0.7,
          fillColor: color,
          fillOpacity: isSelected ? Math.min(0.48, (level === 'very_high' ? 0.25 : level === 'high' ? 0.18 : 0.14) + 0.18) : (level === 'very_high' ? 0.25 : level === 'high' ? 0.18 : 0.14),
          pane: 'hazardOverlayPane',
        });
        if (isSelected) poly.bringToFront();

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          mapRef.current?.closePopup();
          if (poly.getTooltip()) poly.closeTooltip();
          onSelectFeature?.({
            category: 'hazard_impact_zone',
            properties: {
              zoneName: feat.properties?.zoneName || feat.properties?.intensityLabel || 'Physical Hazard Zone',
              hazardType: feat.properties?.hazardType || activeHazard,
              tier: feat.properties?.riskLevel || 'moderate',
              intensityLabel: feat.properties?.intensityLabel || 'Risk Zone',
              description: feat.properties?.description || 'Active physical hazard risk zone.',
              color,
              dataConfidence: 'Calibrated Physical Model',
              areaHa: feat.properties?.areaHa || undefined,
              metrics: feat.properties?.metrics || undefined,
              scientificBasis: feat.properties?.scientificBasis || undefined,
            },
            coordinates: [e.latlng.lng, e.latlng.lat],
          });
        });

        group.addLayer(poly);
      });
    } catch (err) {
      console.warn('Error rendering multi-hazard polygons:', err);
    }
  }, [activeHazardPolygons, activeHazard, dataset.villageName, selectedFeature]);

  // 14. Render Unified Infrastructure Candidate Sites with Spatial Clustering at Low Zoom
  useEffect(() => {
    const candidateGroup = candidateGroupRef.current;
    const interventionsGroup = interventionsGroupRef.current;
    if (interventionsGroup) interventionsGroup.clearLayers();
    if (!candidateGroup) return;
    candidateGroup.clearLayers();
    candidateMarkersRef.current.clear();

    if (!visibleLayers.candidateSites) {
      performanceTracker.updateMapLayer({ id: 'candidateSites', visible: false, status: 'hidden' });
      return;
    }

    if (!candidateSites || candidateSites.length === 0) {
      performanceTracker.updateMapLayer({ id: 'candidateSites', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      const map = mapRef.current;
      const currentZoom = map ? map.getZoom() : mapZoom;

      // Filter valid coordinates within Indian sub-continent bounds
      const validSites = candidateSites.filter((site) => {
        if (!site.candidateCoordinates) return false;
        const [lat, lng] = toLatLng(site.candidateCoordinates);
        return isFinite(lat) && isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
      });

      if (validSites.length === 0) {
        performanceTracker.updateMapLayer({ id: 'candidateSites', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
        return;
      }

      // Spatial Clustering at low zoom levels (zoom < 12)
      if (currentZoom < 12 && validSites.length > 1) {
        const sumLat = validSites.reduce((acc, s) => acc + toLatLng(s.candidateCoordinates)[0], 0);
        const sumLng = validSites.reduce((acc, s) => acc + toLatLng(s.candidateCoordinates)[1], 0);
        const avgLat = sumLat / validSites.length;
        const avgLng = sumLng / validSites.length;

        const clusterHtml = `
          <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 5px; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); cursor: pointer;" title="Cluster of ${validSites.length} Candidate Sites in ${dataset.villageName}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3" fill="currentColor"/></svg>
            <span>${validSites.length} Sites (${dataset.villageName})</span>
          </div>
        `;
        const clusterIcon = L.divIcon({
          html: clusterHtml,
          className: 'custom-candidate-cluster',
          iconSize: [140, 28],
          iconAnchor: [70, 14],
        });
        const clusterMarker = L.marker([avgLat, avgLng], { icon: clusterIcon });
        clusterMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          map?.setView([avgLat, avgLng], 14, { animate: true });
        });
        candidateGroup.addLayer(clusterMarker);
        return;
      }

      // Individual Candidate Site markers (zoom >= 12)
      validSites.forEach((site) => {
        const [lat, lng] = toLatLng(site.candidateCoordinates);
        const scoreBg = site.suitabilityScore >= 90 ? '#059669' : site.suitabilityScore >= 80 ? '#2563eb' : '#d97706';

        const siteHtml = `
          <div style="background-color: ${scoreBg}; color: white; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.35); cursor: pointer;" title="${site.title || 'Site'} (Rank #${site.rank || 1} · Score: ${site.suitabilityScore || 0}/100)">
            <span style="transform: rotate(45deg); font-weight: 800; font-size: 11px; margin-top: -2px; margin-left: -2px;">#${site.rank || 1}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          html: siteHtml,
          className: 'custom-candidate-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        });

        const popupContent = `
          <div class="bvt-popup-container" style="font-family: system-ui, -apple-system, sans-serif; padding: 10px 12px; width: 100%; box-sizing: border-box; font-size: 11px; color: #1e293b;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
              <span style="background-color: ${scoreBg}; color: #ffffff; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 9999px;">
                Rank #${site.rank || 1} · Score ${site.suitabilityScore || 0}/100
              </span>
              <span style="font-size: 12px; font-weight: 800; color: #0f172a;">₹${site.estimatedCostLakhs || 0}L</span>
            </div>
            <div style="font-size: 9px; font-weight: 700; color: #b45309; text-transform: uppercase; margin-bottom: 2px;">
              Illustrative Planning Candidate
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              ${site.title || 'Candidate Infrastructure Site'}
            </h4>
            <div style="font-size: 10px; font-family: monospace; color: #475569; margin-bottom: 5px; background: #f8fafc; padding: 2px 5px; border-radius: 4px; border: 1px solid #e2e8f0;">
              ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E (${site.elevation_m || 0}m AMSL)
            </div>
            <p style="margin: 0 0 5px 0; font-size: 11px; color: #334155; line-height: 1.35;">
              <strong>Purpose:</strong> ${site.justification || site.infrastructureType || 'Mitigation'}
            </p>
            <div style="font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-bottom: 5px; display: flex; justify-content: space-between;">
              <span>Beneficiaries: <strong style="color: #0f172a;">${(site.expectedBeneficiaries || 0).toLocaleString()}</strong></span>
              <span>Mitigates: <strong style="color: #0f172a;">${site.hazardsIdentified?.join(', ') || 'Multi-hazard'}</strong></span>
            </div>
            ${
              site.scoreBreakdown
                ? `<div style="font-size: 9px; color: #475569; background: #f1f5f9; padding: 3px 5px; border-radius: 4px; margin-bottom: 5px; line-height: 1.3;">
                    <strong>MCDA Scores:</strong> Hazard ${site.scoreBreakdown.hazardMitigation?.score || 0}/30 · Access ${site.scoreBreakdown.accessibility?.score || 0}/25 · Terrain ${site.scoreBreakdown.terrainSuitability?.score || 0}/20
                  </div>`
                : ''
            }
            ${
              site.evidenceDatasets && site.evidenceDatasets.length > 0
                ? `<div style="font-size: 9px; color: #64748b; margin-bottom: 3px;">
                    <strong>Sources:</strong> ${Array.isArray(site.evidenceDatasets) ? site.evidenceDatasets.join(', ') : site.evidenceDatasets}
                  </div>`
                : ''
            }
            ${
              site.fieldVerificationNeeded && site.fieldVerificationNeeded.length > 0
                ? `<div style="font-size: 9px; color: #9a3412; background: #fff7ed; padding: 3px 5px; border-radius: 3px; border: 1px solid #ffedd5; margin-bottom: 6px;">
                    <strong>Verification Needed:</strong> ${Array.isArray(site.fieldVerificationNeeded) ? site.fieldVerificationNeeded.join('; ') : site.fieldVerificationNeeded}
                  </div>`
                : ''
            }
            <div style="display: flex; gap: 6px; margin-top: 6px;">
              <button class="bvt-zoom-btn" data-lat="${lat}" data-lng="${lng}" style="width: 100%; padding: 4px 8px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Zoom to location
              </button>
            </div>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon: customIcon });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          mapRef.current?.closePopup();
          onSelectFeature?.({
            category: 'candidate_site',
            properties: site,
            coordinates: [lng, lat],
          });
          onSelectCandidateSite?.(site);
        });

        candidateMarkersRef.current.set(site.id, marker);
        candidateGroup.addLayer(marker);
      });
      performanceTracker.recordLayerDuration('candidateSites', performance.now() - t0, validSites.length);
    } catch (err) {
      console.warn('Error rendering candidate sites:', err);
      performanceTracker.updateMapLayer({ id: 'candidateSites', status: 'error', error: String(err) });
    }
  }, [candidateSites, visibleLayers.candidateSites, dataset.villageName, mapZoom]);

  // 15. Render Real-Time USGS Earthquakes with Clustering at Low Zoom
  useEffect(() => {
    const group = earthquakesGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.earthquakes) {
      performanceTracker.updateMapLayer({ id: 'earthquakes', visible: false, status: 'hidden' });
      return;
    }

    const shouldShow = activeHazard === 'earthquake' || selectedEarthquake !== null;
    if (!shouldShow || !earthquakes || earthquakes.length === 0) {
      performanceTracker.updateMapLayer({ id: 'earthquakes', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      const map = mapRef.current;
      const currentZoom = map ? map.getZoom() : mapZoom;

      const validQuakes = earthquakes.filter(
        (eq) => isFinite(eq.latitude) && isFinite(eq.longitude)
      );

      if (validQuakes.length === 0) {
        performanceTracker.updateMapLayer({ id: 'earthquakes', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
        return;
      }

      // Spatial Clustering at low zoom levels (zoom < 7)
      if (currentZoom < 7 && validQuakes.length > 1) {
        const clusters: Array<{ lats: number[]; lngs: number[]; quakes: typeof validQuakes }> = [];
        validQuakes.forEach((eq) => {
          let placed = false;
          for (const cl of clusters) {
            const cLat = cl.lats.reduce((a, b) => a + b, 0) / cl.lats.length;
            const cLng = cl.lngs.reduce((a, b) => a + b, 0) / cl.lngs.length;
            if (Math.hypot(cLat - eq.latitude, cLng - eq.longitude) < 1.5) {
              cl.lats.push(eq.latitude);
              cl.lngs.push(eq.longitude);
              cl.quakes.push(eq);
              placed = true;
              break;
            }
          }
          if (!placed) {
            clusters.push({ lats: [eq.latitude], lngs: [eq.longitude], quakes: [eq] });
          }
        });

        clusters.forEach((cl) => {
          const avgLat = cl.lats.reduce((a, b) => a + b, 0) / cl.lats.length;
          const avgLng = cl.lngs.reduce((a, b) => a + b, 0) / cl.lngs.length;

          if (cl.quakes.length > 1) {
            const maxMag = Math.max(...cl.quakes.map((q) => (typeof q.mag === 'number' && isFinite(q.mag) ? q.mag : 0)));
            const clusterColor = maxMag >= 6.0 ? '#dc2626' : maxMag >= 4.5 ? '#ea580c' : '#d97706';
            const clusterHtml = `
              <div style="background-color: ${clusterColor}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; border: 2px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.35); cursor: pointer;" title="${cl.quakes.length} Earthquakes (Max M${maxMag > 0 ? maxMag.toFixed(1) : '—'})">
                ${cl.quakes.length}
              </div>
            `;
            const clusterMarker = L.marker([avgLat, avgLng], {
              icon: L.divIcon({ html: clusterHtml, className: 'quake-cluster', iconSize: [34, 34], iconAnchor: [17, 17] }),
            });
            clusterMarker.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              map?.setView([avgLat, avgLng], Math.min(currentZoom + 2, 8), { animate: true });
            });
            group.addLayer(clusterMarker);
          } else {
            // Single quake in cluster
            const eq = cl.quakes[0];
            const mag = typeof eq.mag === 'number' && isFinite(eq.mag) ? eq.mag : 0;
            const color = mag >= 6.0 ? '#dc2626' : mag >= 4.5 ? '#ea580c' : mag >= 3.0 ? '#d97706' : '#059669';
            const size = Math.max(22, Math.min(34, Math.round(mag * 5.5)));
            const quakeHtml = `
              <div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; opacity: 0.9; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: ${size > 26 ? '11px' : '9px'}; cursor: pointer;">
                ${mag > 0 ? mag.toFixed(1) : '—'}
              </div>
            `;
            const marker = L.marker([eq.latitude, eq.longitude], {
              icon: L.divIcon({ html: quakeHtml, className: 'custom-quake-marker', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
            });
            marker.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              map?.setView([eq.latitude, eq.longitude], 8, { animate: true });
            });
            group.addLayer(marker);
          }
        });
        return;
      }

      // Individual Earthquakes (zoom >= 7)
      validQuakes.forEach((eq) => {
        const lat = eq.latitude;
        const lng = eq.longitude;
        const mag = typeof eq.mag === 'number' && isFinite(eq.mag) ? eq.mag : 0;
        const color = mag >= 6.0 ? '#dc2626' : mag >= 4.5 ? '#ea580c' : mag >= 3.0 ? '#d97706' : '#059669';
        const size = Math.max(22, Math.min(36, Math.round(mag * 5.5)));

        const quakeHtml = `
          <div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; opacity: 0.9; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: ${size > 26 ? '11px' : '9px'}; cursor: pointer;">
            ${mag > 0 ? mag.toFixed(1) : '—'}
          </div>
        `;

        const customIcon = L.divIcon({
          html: quakeHtml,
          className: 'custom-quake-marker',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2],
        });

        const popupContent = `
          <div class="bvt-popup-container" style="font-family: system-ui, -apple-system, sans-serif; padding: 10px 12px; width: 100%; box-sizing: border-box; font-size: 11px; color: #1e293b;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
              <span style="background-color: ${color}; color: #ffffff; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 9999px;">
                M ${mag > 0 ? mag.toFixed(1) : '—'} Earthquake
              </span>
              <span style="font-size: 10px; font-weight: 600; color: #64748b;">${eq.depthKm ? `${eq.depthKm.toFixed(1)} km depth` : 'Shallow'}</span>
            </div>
            <div style="font-size: 9px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 3px;">
              Live USGS Seismicity Feed
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              ${eq.place || 'Unknown Seismicity Event'}
            </h4>
            <div style="font-size: 10px; font-family: monospace; color: #475569; margin-bottom: 5px; background: #f8fafc; padding: 2px 5px; border-radius: 4px; border: 1px solid #e2e8f0;">
              ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
            </div>
            ${eq.time ? `<div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">Recorded: ${new Date(eq.time).toUTCString()}</div>` : ''}
            <div style="display: flex; gap: 6px; margin-top: 6px;">
              <button class="bvt-zoom-btn" data-lat="${lat}" data-lng="${lng}" style="width: 100%; padding: 4px 8px; background: #dc2626; color: #ffffff; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Zoom to location
              </button>
            </div>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon: customIcon });
        marker.bindPopup(popupContent, {
          autoPan: false,
          closeButton: true,
          className: 'bvt-compact-popup',
          maxWidth: 320,
          minWidth: 250,
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectFeature?.({
            category: 'earthquake',
            properties: {
              ...eq,
              name: `M ${mag > 0 ? mag.toFixed(1) : '—'} Earthquake — ${eq.place || 'Unknown'}`,
            },
            coordinates: [lng, lat],
          });
          onSelectEarthquake?.(eq);
        });

        group.addLayer(marker);
      });
      performanceTracker.recordLayerDuration('earthquakes', performance.now() - t0, validQuakes.length);
    } catch (err) {
      console.warn('Error rendering earthquakes:', err);
      performanceTracker.updateMapLayer({ id: 'earthquakes', status: 'error', error: String(err) });
    }
  }, [earthquakes, visibleLayers.earthquakes, activeHazard, dataset.villageName, mapZoom]);

  // 16. Interactive Drawing Mode Listener
  useEffect(() => {
    const map = mapRef.current;
    const group = drawingGroupRef.current;
    if (!map || !group) return;

    if (!isDrawingMode) {
      group.clearLayers();
      setDrawPoints([]);
      return;
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const newPt: [number, number] = [e.latlng.lng, e.latlng.lat];
      setDrawPoints((prev) => {
        const next = [...prev, newPt];
        group.clearLayers();

        // Render point circles
        next.forEach(([lng, lat]) => {
          const ptCircle = L.circleMarker([lat, lng], {
            radius: 5,
            color: '#ec4899',
            fillColor: '#ffffff',
            fillOpacity: 1,
            weight: 2,
          });
          group.addLayer(ptCircle);
        });

        // Render line or polygon preview
        const latLngs = next.map(([lng, lat]) => [lat, lng] as [number, number]);
        if (drawingType === 'drain' && latLngs.length > 1) {
          const line = L.polyline(latLngs, { color: '#ec4899', weight: 3, dashArray: '4, 4' });
          group.addLayer(line);
        } else if (drawingType === 'retention' && latLngs.length > 2) {
          const poly = L.polygon(latLngs, { color: '#ec4899', fillColor: '#f472b6', fillOpacity: 0.35, weight: 2 });
          group.addLayer(poly);
        }

        return next;
      });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingMode, drawingType]);

  const finishDrawing = () => {
    if (drawPoints.length < (drawingType === 'drain' ? 2 : 3)) return;
    onAddDrawnFeature?.(drawPoints, drawingType);
    setDrawPoints([]);
    drawingGroupRef.current?.clearLayers();
  };

  const cancelDrawing = () => {
    setDrawPoints([]);
    drawingGroupRef.current?.clearLayers();
  };

  // 17. Render Central Water Commission (CWC) River Gauge Telemetry with Responsive Contained Labels
  useEffect(() => {
    const group = cwcGaugesGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.cwcGauges) {
      performanceTracker.updateMapLayer({ id: 'cwcGauges', visible: false, status: 'hidden' });
      return;
    }

    if (!Array.isArray(cwcGauges) || cwcGauges.length === 0) {
      performanceTracker.updateMapLayer({ id: 'cwcGauges', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      const map = mapRef.current;
      const currentZoom = map ? map.getZoom() : mapZoom;
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
      const viewportSize = map ? map.getSize() : null;

      cwcGauges.forEach((gauge) => {
        if (!gauge.coordinates || gauge.coordinates.length < 2) return;
        const [lat, lng] = toLatLng([gauge.coordinates[1], gauge.coordinates[0]]);
        if (!isFinite(lat) || !isFinite(lng)) return;

        const isDanger = gauge.floodStatus === 'danger' || gauge.floodStatus === 'extreme';
        const isWarning = gauge.floodStatus === 'warning';
        const statusColor = isDanger ? '#dc2626' : isWarning ? '#d97706' : '#2563eb';
        const statusLabel =
          gauge.floodStatus === 'extreme'
            ? 'MAJOR FLOOD / EXTREME'
            : gauge.floodStatus === 'danger'
            ? 'ABOVE DANGER'
            : gauge.floodStatus === 'warning'
            ? 'ABOVE WARNING'
            : 'NORMAL FLOW';

        // Calculate viewport edge placement to prevent label clipping at screen borders
        const containerPoint = map ? map.latLngToContainerPoint([lat, lng]) : null;
        const edgePlacement = calculateMarkerEdgePlacement(containerPoint, viewportSize);

        // Crowding detection: check if mobile, zoomed out, or multiple gauges within close screen proximity
        const isCrowded =
          isMobile ||
          currentZoom < 10 ||
          (cwcGauges.length > 1 &&
            cwcGauges.some((other) => {
              if (other === gauge || !other.coordinates || other.coordinates.length < 2) return false;
              const [oLat, oLng] = toLatLng([other.coordinates[1], other.coordinates[0]]);
              const dist = Math.hypot(lat - oLat, lng - oLng);
              return dist < 0.12; // ~12-14 km proximity
            }) &&
            currentZoom < 12);

        // Build robust, strictly contained HTML with preferred 3-tier or compact layout
        const markerHtml = buildGaugeMarkerHtml({
          stationName: gauge.stationName,
          riverName: gauge.riverName,
          currentWaterLevel_m: gauge.currentWaterLevel_m,
          floodStatus: gauge.floodStatus,
          isCompact: isCrowded,
          edgePlacement,
        });

        // Anchor zero-size container directly to coordinates; wrapper centers beacon dot on exact lat/lng
        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'cwc-gauge-marker',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          popupAnchor: edgePlacement === 'edge-top' ? [0, 18] : [0, isCrowded ? -38 : -54],
        });

        const popupContent = `
          <div class="bvt-popup-container" style="font-family: system-ui, -apple-system, sans-serif; padding: 10px 12px; width: 100%; box-sizing: border-box; font-size: 11px; color: #1e293b;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="background: ${statusColor}; color: #ffffff; font-weight: 800; font-size: 9px; padding: 2px 7px; border-radius: 9999px; text-transform: uppercase;">
                ${statusLabel}
              </span>
              <span style="font-size: 10px; color: #64748b; font-weight: 600;">${gauge.distanceKm} km away</span>
            </div>
            <h4 style="margin: 0 0 3px 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.25;">
              ${gauge.stationName} River Gauge
            </h4>
            <div style="font-size: 10px; color: #0369a1; font-weight: 600; margin-bottom: 8px;">
              River: ${gauge.riverName} · Basin: ${gauge.basinName}
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #64748b;">Current Level:</span>
                <span style="font-weight: 700; color: ${statusColor};">${gauge.currentWaterLevel_m.toFixed(2)} m</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #64748b;">Warning Mark:</span>
                <span style="font-weight: 600; color: #d97706;">${gauge.warningLevel_m.toFixed(2)} m</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #64748b;">Danger Mark:</span>
                <span style="font-weight: 600; color: #dc2626;">${gauge.dangerLevel_m.toFixed(2)} m</span>
              </div>
              ${
                gauge.hfl_m
                  ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #64748b;">Highest Flood Level (HFL):</span>
                <span style="font-weight: 600; color: #7f1d1d;">${gauge.hfl_m.toFixed(2)} m</span>
              </div>`
                  : ''
              }
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Discharge Rate:</span>
                <span style="font-weight: 600; color: #0284c7;">${gauge.discharge_m3s ? `${gauge.discharge_m3s.toLocaleString()} m³/s` : 'Stage Only'}</span>
              </div>
            </div>
            <div style="font-size: 9px; color: #64748b; margin-bottom: 8px; line-height: 1.3;">
              Source: ${gauge.sourceAgency} Telemetry Network.
            </div>
            <a href="${gauge.sourceUrl || 'https://ffs.india-water.gov.in/'}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background: #0284c7; color: #ffffff; text-decoration: none; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 10px;">
              View CWC Telemetry Portal ↗
            </a>
          </div>
        `;

        const marker = L.marker([lat, lng], {
          icon: customIcon,
          pane: 'cwcGaugesPane',
        });
        marker.bindPopup(popupContent, { maxWidth: 300, minWidth: 240, className: 'bvt-compact-popup' });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectFeature?.({
            category: 'cwc_gauge',
            properties: gauge,
            coordinates: [lng, lat],
          });
          onSelectCwcGauge?.(gauge);
        });

        group.addLayer(marker);
      });
      performanceTracker.recordLayerDuration('cwcGauges', performance.now() - t0, cwcGauges.length);
    } catch (err) {
      console.warn('Error rendering CWC river gauges:', err);
      performanceTracker.updateMapLayer({ id: 'cwcGauges', status: 'error', error: String(err) });
    }
  }, [cwcGauges, visibleLayers.cwcGauges, mapZoom, mapViewportRev]);

  // 18. Render DEM Terrain Hydrology Flow Accumulation, Depressions & Bottlenecks
  useEffect(() => {
    const group = flowPathsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.flowPaths) {
      performanceTracker.updateMapLayer({ id: 'flowPaths', visible: false, status: 'hidden' });
      return;
    }

    if (!terrainHydrology) {
      performanceTracker.updateMapLayer({ id: 'flowPaths', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    let totalFeatures = 0;
    try {

      // 1. Flow Accumulation Pathways
      if (terrainHydrology.flowAccumulationLines?.features) {
        terrainHydrology.flowAccumulationLines.features.forEach((feat) => {
          const coords = feat.geometry?.coordinates;
          if (!coords || coords.length < 2) return;
          const latLngs = coords.map((c) => toLatLng(c as [number, number]));
          const flowProps = feat.properties || ({} as any);

          const polyline = L.polyline(latLngs, {
            color: '#0284c7',
            weight: Math.min(Math.max((flowProps.accumulationCells || 100) / 250, 2), 4.5),
            opacity: 0.85,
            dashArray: '5, 4',
            pane: 'flowPathsPane',
          });

          const popupContent = `
            <div class="bvt-popup-container" style="font-family: system-ui, -apple-system, sans-serif; padding: 8px 10px; max-width: 250px; font-size: 11px; color: #1e293b;">
              <div style="font-size: 9px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 3px;">
                DEM Hydrological Overland Flow Path
              </div>
              <div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">Runoff Concentration Vector</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
                <span style="color: #64748b;">Slope:</span>
                <span style="font-weight: 600;">${(flowProps.slope_deg || 1.2).toFixed(1)}°</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
                <span style="color: #64748b;">Estimated Peak Flow:</span>
                <span style="font-weight: 600; color: #0369a1;">${(flowProps.estimatedPeakDischarge_m3s || 3.5).toFixed(2)} m³/s</span>
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px;">
                Derived via ${terrainHydrology.demSource || 'Copernicus 30m'} D8 flow accumulation model.
              </div>
            </div>
          `;
          polyline.bindPopup(popupContent, { maxWidth: 260, className: 'bvt-compact-popup' });
          group.addLayer(polyline);
        });
      }

      // 2. Terrain Depression / Ponding Sinks
      if (terrainHydrology.depressionNodes?.features) {
        terrainHydrology.depressionNodes.features.forEach((nodeFeat) => {
          const ptCoord = nodeFeat.geometry?.coordinates;
          if (!ptCoord || ptCoord.length < 2) return;
          const [lat, lng] = toLatLng([ptCoord[0], ptCoord[1]]);
          const props = nodeFeat.properties || ({} as any);
          const radius = Math.min(Math.max((props.depth_m || 0.5) * 6, 6), 14);

          const circle = L.circleMarker([lat, lng], {
            radius,
            color: '#0369a1',
            fillColor: '#38bdf8',
            fillOpacity: 0.6,
            weight: 2,
            pane: 'flowPathsPane',
          });

          const popupContent = `
            <div class="bvt-popup-container" style="font-family: system-ui, -apple-system, sans-serif; padding: 8px 10px; max-width: 240px; font-size: 11px; color: #1e293b;">
              <div style="font-size: 9px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 2px;">
                Natural Terrain Depression
              </div>
              <div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">Ponding Sink #${props.id || '1'}</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
                <span style="color: #64748b;">Max Depth:</span>
                <span style="font-weight: 600;">${(props.depth_m || 0).toFixed(2)} m</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
                <span style="color: #64748b;">Storage Volume:</span>
                <span style="font-weight: 600; color: #0369a1;">${(props.storageCapacity_m3 || 0).toLocaleString()} m³</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span style="color: #64748b;">Elevation:</span>
                <span style="font-weight: 600;">${(props.elevation_m || 0).toFixed(1)} m</span>
              </div>
            </div>
          `;
          circle.bindPopup(popupContent, { maxWidth: 250, className: 'bvt-compact-popup' });
          group.addLayer(circle);
        });
      }

      // 3. Drainage Bottlenecks
      if (terrainHydrology.bottlenecks) {
        terrainHydrology.bottlenecks.forEach((b) => {
          const [lat, lng] = toLatLng([b.coordinates[0], b.coordinates[1]]);
          const isHigh = b.chokeRatio >= 2.0;
          const bColor = isHigh ? '#dc2626' : '#d97706';

          const markerIcon = L.divIcon({
            html: `
              <div style="background: ${bColor}; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-weight: 900; font-size: 11px;">
                !
              </div>
            `,
            className: 'bottleneck-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const marker = L.marker([lat, lng], { icon: markerIcon, pane: 'flowPathsPane' });
          const popupContent = `
            <div class="bvt-popup-container" style="font-family: system-ui, -apple-system, sans-serif; padding: 8px 10px; max-width: 260px; font-size: 11px; color: #1e293b;">
              <span style="background: ${bColor}; color: #ffffff; font-weight: 800; font-size: 9px; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;">
                ${isHigh ? 'High' : 'Moderate'} Choke (${b.chokeRatio.toFixed(1)}x)
              </span>
              <div style="font-weight: 700; font-size: 12px; margin-top: 4px; margin-bottom: 4px;">${b.title}</div>
              <div style="color: #64748b; font-size: 10px; margin-bottom: 4px;">Location: ${b.roadOrWaterwayName}</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
                <span style="color: #64748b;">Current Capacity:</span>
                <span style="font-weight: 600; color: #dc2626;">${b.currentCapacity_m3s} m³/s</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px;">
                <span style="color: #64748b;">Required:</span>
                <span style="font-weight: 600; color: #dc2626;">${b.requiredCapacity_m3s} m³/s</span>
              </div>
              <div style="font-size: 10px; color: #334155; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 4px 6px;">
                <strong>Recommended:</strong> ${b.mitigationRecommendation}
              </div>
            </div>
          `;
          marker.bindPopup(popupContent, { maxWidth: 280, className: 'bvt-compact-popup' });
          group.addLayer(marker);
        });
      }

      totalFeatures = (terrainHydrology.flowAccumulationLines?.features?.length || 0) +
        (terrainHydrology.depressionNodes?.features?.length || 0) +
        (terrainHydrology.bottlenecks?.length || 0);

      performanceTracker.recordLayerDuration('flowPaths', performance.now() - t0, totalFeatures);
    } catch (err) {
      console.warn('Error rendering terrain hydrology:', err);
      performanceTracker.updateMapLayer({ id: 'flowPaths', status: 'error', error: String(err) });
    }
  }, [terrainHydrology, visibleLayers.flowPaths]);

  // 19. Render Flood-Aware Evacuation Route
  useEffect(() => {
    const group = evacRouteGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers.evacRoute) {
      performanceTracker.updateMapLayer({ id: 'evacRoute', visible: false, status: 'hidden' });
      return;
    }

    if (!activeEvacuationRoute) {
      performanceTracker.updateMapLayer({ id: 'evacRoute', visible: true, status: 'empty_unmapped', featureCount: 0, renderDurationMs: 0 });
      return;
    }

    const t0 = performance.now();
    try {
      const segments = activeEvacuationRoute.segments || [];
      const allCoords: [number, number][] = [];

      segments.forEach((seg) => {
        if (!seg.coordinates || seg.coordinates.length < 2) return;
        const latLngs = seg.coordinates.map((c) => toLatLng(c));
        latLngs.forEach((ll) => allCoords.push(ll));

        const segColor = seg.status === 'passable' ? '#10b981' : seg.status === 'caution' ? '#f59e0b' : '#ef4444';

        // High contrast casing
        const underlay = L.polyline(latLngs, {
          color: '#ffffff',
          weight: 8,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'evacRoutePane',
        });
        group.addLayer(underlay);

        // Segment polyline
        const segLine = L.polyline(latLngs, {
          color: segColor,
          weight: 5,
          opacity: 0.95,
          dashArray: seg.status === 'passable' ? undefined : '6, 6',
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'evacRoutePane',
        });
        group.addLayer(segLine);
      });

      const isPassable = activeEvacuationRoute.isPassable;
      const routeColor = isPassable ? '#10b981' : activeEvacuationRoute.clearanceStatus.includes('Caution') ? '#f59e0b' : '#ef4444';

      const popupContent = `
        <div class="bvt-popup-container" style="font-family: system-ui, -apple-system, sans-serif; padding: 10px 12px; max-width: 270px; font-size: 11px; color: #1e293b;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
            <span style="background: ${routeColor}; color: white; font-weight: 800; font-size: 9px; padding: 2px 7px; border-radius: 9999px; text-transform: uppercase;">
              ${activeEvacuationRoute.clearanceStatus}
            </span>
            <span style="font-size: 10px; font-weight: 600; color: #64748b;">
              ${(activeEvacuationRoute.totalDistance_m / 1000).toFixed(2)} km
            </span>
          </div>
          <h4 style="margin: 0 0 3px 0; font-size: 12px; font-weight: 700; color: #0f172a;">
            ${activeEvacuationRoute.name}
          </h4>
          <div style="font-size: 10px; color: #059669; font-weight: 600; margin-bottom: 6px;">
            Safe Destination: ${activeEvacuationRoute.destinationName} (${activeEvacuationRoute.destinationElevation_m.toFixed(1)}m elev)
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #64748b;">Walking Time:</span>
              <span style="font-weight: 700;">${activeEvacuationRoute.estimatedWalkingMinutes} mins</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Max Water Depth:</span>
              <span style="font-weight: 700; color: ${activeEvacuationRoute.maxFloodDepth_m > 0.15 ? '#ef4444' : '#10b981'};">
                ${activeEvacuationRoute.maxFloodDepth_m.toFixed(2)} m
              </span>
            </div>
          </div>
          <div style="font-size: 9px; color: #64748b;">
            Dynamic road graph routing avoiding flood depths above threshold (${(activeEvacuationRoute.roadClosureThreshold_m * 100).toFixed(0)}cm).
          </div>
        </div>
      `;

      if (allCoords.length > 0) {
        // Destination Marker
        const destCoord = allCoords[allCoords.length - 1];
        const shelterIcon = L.divIcon({
          html: `
            <div style="background: #10b981; color: white; padding: 3px 6px; border-radius: 6px; font-weight: 800; font-size: 10px; display: flex; align-items: center; gap: 3px; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">
              <span>🛡️ Safe Shelter</span>
            </div>
          `,
          className: 'shelter-marker',
          iconSize: [95, 22],
          iconAnchor: [47, 11],
        });
        const shelterMarker = L.marker(destCoord, { icon: shelterIcon, pane: 'evacRoutePane' });
        shelterMarker.bindPopup(popupContent, { maxWidth: 280, className: 'bvt-compact-popup' });
        group.addLayer(shelterMarker);

        // Fit map to route bounds
        if (mapRef.current && allCoords.length > 1) {
          const bounds = L.latLngBounds(allCoords);
          mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
        }
      }
      performanceTracker.recordLayerDuration('evacRoute', performance.now() - t0, segments.length);
    } catch (err) {
      console.warn('Error rendering evacuation route:', err);
      performanceTracker.updateMapLayer({ id: 'evacRoute', status: 'error', error: String(err) });
    }
  }, [activeEvacuationRoute, visibleLayers.evacRoute]);

  // 20. Render Google Maps-Style Navigation Routes (Alternatives, Active Route, Flooded Segments, A/B Markers)
  useEffect(() => {
    const group = navRouteGroupRef.current;
    if (!group) return;
    group.clearLayers();

    try {
      if (!navigationResult || !navigationResult.routes || navigationResult.routes.length === 0) return;

      const activeRoute =
        navigationResult.routes.find((r) => r.id === activeNavigationRouteId) || navigationResult.routes[0];

      // 1. Render Alternative Routes (subtle gray lines, clickable to switch)
      navigationResult.routes.forEach((route) => {
        if (route.id === activeRoute.id || !route.coordinates || route.coordinates.length < 2) return;
        const altLatLngs = route.coordinates.map((c) => toLatLng(c));

        // Subtle underlay
        const altUnderlay = L.polyline(altLatLngs, {
          color: '#ffffff',
          weight: 6,
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'navRoutePane',
        });
        group.addLayer(altUnderlay);

        // Dashed alternative polyline
        const altLine = L.polyline(altLatLngs, {
          color: '#64748b',
          weight: 4,
          opacity: 0.75,
          dashArray: '6, 6',
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'navRoutePane',
        });

        altLine.on('click', () => {
          onSelectNavigationRoute?.(route.id);
        });

        altLine.bindTooltip(
          `Alternative: ${route.title} (${(route.totalDistance_m / 1000).toFixed(2)} km, ${route.estimatedDrivingMinutes} min) · Click to select`,
          { sticky: true, className: 'bvt-compact-tooltip' }
        );

        group.addLayer(altLine);
      });

      // 2. Render Active Selected Route (Google Maps style: thick white casing + signature blue polyline)
      if (activeRoute.coordinates && activeRoute.coordinates.length >= 2) {
        const activeLatLngs = activeRoute.coordinates.map((c) => toLatLng(c));

        const activeUnderlay = L.polyline(activeLatLngs, {
          color: '#ffffff',
          weight: 8,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'navRoutePane',
        });
        group.addLayer(activeUnderlay);

        const routeColor = activeRoute.isPassable ? '#2563eb' : '#ef4444';
        const activeLine = L.polyline(activeLatLngs, {
          color: routeColor,
          weight: 5,
          opacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'navRoutePane',
        });
        group.addLayer(activeLine);

        // 3. Highlight any flooded segments along active route (red/amber dashed overlay)
        if (activeRoute.affectedSegments && activeRoute.affectedSegments.length > 0) {
          activeRoute.affectedSegments.forEach((seg) => {
            if (!seg.coordinates || seg.coordinates.length < 2) return;
            const floodLatLngs = seg.coordinates.map((c) => toLatLng(c));
            const floodLine = L.polyline(floodLatLngs, {
              color: seg.impassable ? '#ef4444' : '#f59e0b',
              weight: 7,
              opacity: 1.0,
              dashArray: '6, 6',
              lineCap: 'round',
              lineJoin: 'round',
              pane: 'navRoutePane',
            });
            floodLine.bindTooltip(
              `⚠️ Submerged Segment: ${seg.roadName} (Water Depth: ${seg.depth_m.toFixed(2)}m) · ${
                seg.impassable ? 'IMPASSABLE' : 'CAUTION'
              }`,
              { sticky: true, className: 'bvt-compact-tooltip' }
            );
            group.addLayer(floodLine);
          });
        }

        // 4. Origin Marker ("A" in Green Pin)
        const originLatLng = toLatLng(navigationResult.origin.coordinates);
        const originIcon = L.divIcon({
          html: `
            <div style="background: #10b981; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
              A
            </div>
          `,
          className: 'nav-origin-marker',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const originMarker = L.marker(originLatLng, { icon: originIcon, pane: 'navRoutePane' });
        originMarker.bindPopup(`<b>Starting Point (A):</b><br/>${navigationResult.origin.name}`, {
          className: 'bvt-compact-popup',
        });
        group.addLayer(originMarker);

        // 5. Destination Marker ("B" in Red Pin)
        const destLatLng = toLatLng(navigationResult.destination.coordinates);
        const destIcon = L.divIcon({
          html: `
            <div style="background: #ef4444; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
              B
            </div>
          `,
          className: 'nav-dest-marker',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const destMarker = L.marker(destLatLng, { icon: destIcon, pane: 'navRoutePane' });
        destMarker.bindPopup(
          `<b>Destination (B):</b><br/>${navigationResult.destination.name}<br/><b>Distance:</b> ${(
            activeRoute.totalDistance_m / 1000
          ).toFixed(2)} km<br/><b>Est. Driving Time:</b> ${activeRoute.estimatedDrivingMinutes} mins<br/><b>Status:</b> ${
            activeRoute.clearanceStatus
          }`,
          { className: 'bvt-compact-popup' }
        );
        group.addLayer(destMarker);

        // 6. Fit Bounds smoothly to the active route
        if (mapRef.current && activeLatLngs.length > 1) {
          const bounds = L.latLngBounds(activeLatLngs);
          mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate: true });
        }
      }
    } catch (err) {
      console.warn('Error rendering navigation routes:', err);
    }
  }, [navigationResult, activeNavigationRouteId, onSelectNavigationRoute]);

  // 21. Map coordinate picking when user selects "Click on map"
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapPickingActive) return;

    const container = containerRef.current;
    if (container) container.style.cursor = 'crosshair';

    const handlePickClick = (e: L.LeafletMouseEvent) => {
      onMapClickCoordinate?.([Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6))]);
    };

    map.on('click', handlePickClick);
    return () => {
      map.off('click', handlePickClick);
      if (container) container.style.cursor = '';
    };
  }, [isMapPickingActive, onMapClickCoordinate]);

  const handleShowFloodOnMap = useCallback(() => {
    // 1. Ensure flood extent layer is visible
    setVisibleLayers((prev) => ({ ...prev, floodExtent: true }));

    // 2. Compute bounds from activeFloodGeoJson or simulationResult
    const floodData = activeFloodGeoJson || simulationResult?.peakFloodPolygons;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let count = 0;

    if (floodData?.features && floodData.features.length > 0) {
      for (const feature of floodData.features) {
        const geom = feature.geometry as any;
        if (!geom) continue;
        const rings: Array<any> =
          geom?.type === 'MultiPolygon'
            ? geom.coordinates.flat(1)
            : geom?.type === 'Polygon'
            ? geom.coordinates
            : [];
        for (const ring of rings) {
          if (!Array.isArray(ring)) continue;
          for (const coord of ring) {
            if (!Array.isArray(coord) || coord.length < 2) continue;
            const [lat, lng] = toLatLng(coord as [number, number]);
            if (isFinite(lat) && isFinite(lng)) {
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              count++;
            }
          }
        }
      }
    }

    if (count > 0 && minLat <= maxLat && minLng <= maxLng && mapRef.current) {
      const bounds = L.latLngBounds([[minLat, minLng], [maxLat, maxLng]]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
    } else if (dataset.center && mapRef.current) {
      const [lat, lng] = toLatLng(dataset.center);
      if (isFinite(lat) && isFinite(lng)) {
        mapRef.current.setView([lat, lng], 16, { animate: true });
      }
    }
  }, [activeFloodGeoJson, simulationResult, dataset.center]);

  const handleFitVillage = useCallback(() => {
    if (onFitVillage) {
      onFitVillage();
      return;
    }
    const ring = dataset.boundary?.features?.[0]?.geometry?.coordinates?.[0];
    if (ring && ring.length > 2) {
      const points = ring
        .map((c) => toLatLng(c as [number, number]))
        .filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
      if (points.length > 2 && mapRef.current) {
        const bounds = L.latLngBounds(points);
        mapRef.current.fitBounds(bounds, { padding: [40, 40], animate: true });
        return;
      }
    }
    if (dataset.center && mapRef.current) {
      const [lat, lng] = toLatLng(dataset.center);
      if (isFinite(lat) && isFinite(lng)) {
        mapRef.current.setView([lat, lng], 16, { animate: true });
      }
    }
  }, [onFitVillage, dataset.boundary, dataset.center]);

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      className={`relative w-full h-full overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''
      }`}
    >
      {/* Clean, Non-Overlapping Responsive Map UI Layout (Parts 1 & 3) */}
      {!simpleMode && (
        <div
          className={`absolute inset-0 z-[1050] p-3 flex flex-col justify-between pointer-events-none transition-all duration-150 ${
            hideOverlays ? 'opacity-0 invisible pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden={hideOverlays}
        >
          {/* Persistent Demonstration Mode Watermark */}
          {cycloneState?.mode === 'demo' && visibleLayers.imdCycloneWind && (
            <div className="pointer-events-auto self-center mb-1 bg-amber-500/95 text-slate-950 border border-amber-600 px-3.5 py-1 rounded-full shadow-lg text-[11px] font-black tracking-wider flex items-center gap-2 backdrop-blur-md animate-pulse uppercase">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>DEMO CYCLONE SCENARIO — NOT A REAL FORECAST</span>
            </div>
          )}

          {/* Non-blocking Tile Fallback Notice */}
          {tileNotice && (
            <div className="pointer-events-auto self-center mb-1 bg-amber-950/95 text-amber-200 border border-amber-600/80 px-3 py-1.5 rounded-xl shadow-lg text-[11px] flex items-center gap-2 backdrop-blur-md animate-fade-in">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{tileNotice}</span>
              <button
                onClick={() => setTileNotice(null)}
                className="text-amber-400 hover:text-white ml-1 p-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* TOP ZONE: Region A (Top-Left), Search (Top-Center), Regions B & C (Top-Right) */}
          <div className="flex flex-col gap-2 w-full pointer-events-none">
            <div className="flex items-start justify-between gap-2.5 w-full pointer-events-none">
              
              {/* REGION A: Top-Left Simulation Status Card */}
              <div className="flex flex-col items-start gap-1.5 pointer-events-auto shrink-0 z-30">
                {simulationResult && (
                  <SimulationStatusCard
                    locationName={currentLocation?.name || dataset.villageName}
                    isSimulating={isSimulating}
                    simulationResult={simulationResult}
                    simConfig={
                      simConfig || {
                        scenario: 'existing_drainage',
                        rainfallIntensity_mmh: 65,
                        rainfallDuration_hours: 4,
                        soilType: 'black_cotton',
                        infiltrationRate_mmh: 6.0,
                        runoffCoefficient: 0.65,
                        tideOutfallCondition: 'normal',
                        desiltingFactor: 0.65,
                        timeStep_mins: 60,
                      }
                    }
                    isFloodLayerVisible={visibleLayers.floodExtent}
                    onToggleFloodLayer={() => toggleLayer('floodExtent')}
                    onShowFloodOnMap={handleShowFloodOnMap}
                    onDismiss={() => setIsSimCardDismissed(true)}
                    isDismissed={isSimCardDismissed}
                    onReopen={() => setIsSimCardDismissed(false)}
                    activeFloodHour={activeFloodHour}
                  />
                )}
              </div>

              {/* TOP RIGHT: Floating Controls Group, Real-Time Rainfall Panel & Layers Panel */}
              <div className="relative flex flex-col items-end gap-1.5 pointer-events-auto shrink-0 z-30">
                <div className="flex items-center gap-1.5">
                  {/* Real-Time Rainfall Intensity & Weather Panel (Near Map Controls) */}
                  <RealTimeRainfallPanel
                    weather={weatherData || null}
                    isLoading={isLoadingWeather}
                    onRefresh={onRefreshWeather || (() => {})}
                    currentLocation={
                      currentLocation || {
                        id: 'default-loc',
                        name: dataset.villageName,
                        displayName: dataset.villageName,
                        adminLevel: 'village',
                        state: dataset.state,
                        district: dataset.district,
                        center: dataset.center,
                        boundingBox: [
                          dataset.center[0] - 0.05,
                          dataset.center[1] - 0.05,
                          dataset.center[0] + 0.05,
                          dataset.center[1] + 0.05,
                        ],
                        source: 'Master Gazetteer',
                        regionCategory: 'plains',
                      }
                    }
                    onApplyToSimulation={onApplyRainfallToSimulation}
                  />

                  {/* Control Group */}
                  <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-1 shadow-md text-xs font-semibold text-slate-700">
                  {/* Map / Satellite Toggle */}
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                    <button
                      onClick={() => setMapType('roadmap')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        mapType === 'roadmap'
                          ? 'bg-slate-800 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Map
                    </button>
                    <button
                      onClick={() => setMapType('satellite')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        mapType === 'satellite'
                          ? 'bg-slate-800 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sat
                    </button>
                  </div>

                  {/* Fit to selected location */}
                  <button
                    onClick={handleFitVillage}
                    className="px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-slate-100 flex items-center gap-1 transition-all cursor-pointer"
                    title="Fit map boundary to selected location"
                  >
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline text-xs">Fit</span>
                  </button>

                  {/* Layers flyout button */}
                  <button
                    onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLayersPanelOpen
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-blue-700 hover:bg-slate-100'
                    }`}
                    title="Toggle Map Layers"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="text-xs">Layers</span>
                  </button>

                  {/* Fullscreen toggle */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                      isFullscreen
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

                {/* Organized Vertical Layers Flyout Panel */}
                {isLayersPanelOpen && (
                  <div className="w-64 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-2.5 text-xs text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col gap-1.5 z-40">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 px-1">
                      <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        Map Layers
                      </span>
                      <button
                        onClick={() => setIsLayersPanelOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto pr-0.5">
                      {/* 1. Flood Extent */}
                      <button
                        onClick={() => toggleLayer('floodExtent')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.floodExtent
                            ? 'bg-blue-50 text-blue-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Waves className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Flood Extent</span>
                        </span>
                        {activeFloodGeoJson?.features && activeFloodGeoJson.features.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                            {activeFloodGeoJson.features.length}
                          </span>
                        )}
                      </button>

                      {/* 2. Road Network */}
                      <button
                        onClick={() => toggleLayer('roads')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.roads
                            ? 'bg-amber-50 text-amber-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Route className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Road Network</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                          {dataset.roads?.features?.length || 0}
                        </span>
                      </button>

                      {/* 3. Building Footprints */}
                      <button
                        onClick={() => toggleLayer('buildings')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.buildings
                            ? 'bg-indigo-50 text-indigo-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Building Footprints</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">
                          {dataset.buildings?.features?.length || 0}
                        </span>
                      </button>

                      {/* 4. River Gauges */}
                      <button
                        onClick={() => toggleLayer('cwcGauges')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.cwcGauges
                            ? 'bg-sky-50 text-sky-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>River Gauges (CWC)</span>
                        </span>
                        {Array.isArray(cwcGauges) && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold">
                            {cwcGauges.length}
                          </span>
                        )}
                      </button>

                      {/* 5. Hazard Zones / Earthquakes */}
                      <button
                        onClick={() => toggleLayer('earthquakes')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.earthquakes
                            ? 'bg-rose-50 text-rose-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Hazard Zones / Seismicity</span>
                        </span>
                        {earthquakes.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                            {earthquakes.length}
                          </span>
                        )}
                      </button>

                      {/* 6. Infrastructure Sites */}
                      <button
                        onClick={() => toggleLayer('candidateSites')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.candidateSites
                            ? 'bg-emerald-50 text-emerald-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Infrastructure Sites</span>
                        </span>
                        {candidateSites.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                            {candidateSites.length}
                          </span>
                        )}
                      </button>

                      {/* 7. Flow Paths */}
                      <button
                        onClick={() => toggleLayer('flowPaths')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.flowPaths
                            ? 'bg-teal-50 text-teal-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Waves className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Flow Paths (Overland)</span>
                        </span>
                      </button>

                      {/* 8. Evacuation Routes */}
                      <button
                        onClick={() => toggleLayer('evacRoute')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.evacRoute
                            ? 'bg-purple-50 text-purple-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Route className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Evacuation Routes</span>
                        </span>
                      </button>

                      {/* 9. Cyclone Track & Wind Zones */}
                      <button
                        onClick={() => toggleLayer('imdCycloneWind')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          visibleLayers.imdCycloneWind
                            ? 'bg-rose-50 text-rose-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Wind className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Cyclone & Wind Zones</span>
                        </span>
                        {onOpenCycloneTracking && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCycloneTracking();
                            }}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline ml-1 cursor-pointer"
                            title="Open Cyclone Tracking & Simulation Control Panel"
                          >
                            Track/Sim
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawing Mode Active Notice Bar */}
            {isDrawingMode && (
              <div className="self-center max-w-full pointer-events-auto">
                <div className="bg-pink-900 text-white px-4 py-2 rounded-xl shadow-2xl border border-pink-700 text-xs flex items-center gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
                    <span className="font-semibold">
                      Drawing Mode ({drawingType === 'drain' ? 'Proposed Drain Line' : 'Retention Pond Basin'}):
                    </span>
                    <span className="text-pink-200">Click on the map to add alignment points ({drawPoints.length} added).</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={finishDrawing}
                      disabled={drawPoints.length < (drawingType === 'drain' ? 2 : 3)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Finish
                    </button>
                    <button
                      onClick={cancelDrawing}
                      disabled={drawPoints.length === 0}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM ZONE: Region D (Bottom Status Area) */}
          <div className="flex items-end justify-between gap-3 w-full pointer-events-none mt-auto">
            {/* Map Legend (Bottom-Left) */}
            <div
              className={`pointer-events-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-xs max-w-xs sm:w-76 text-slate-800 transition-all duration-150`}
            >
              <div
                onClick={() => setLegendExpanded(!legendExpanded)}
                className="p-2.5 flex items-center justify-between font-bold text-slate-900 cursor-pointer bg-slate-50 border-b border-slate-100"
              >
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>Map Legend & Layers</span>
                </div>
                {legendExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </div>
              {legendExpanded && (
                <div className="p-3 space-y-2 max-h-[240px] overflow-y-auto pr-2 text-slate-600 text-[11px]">
                  <div className="pb-1.5 border-b border-slate-100">
                    <div className="font-semibold text-slate-800 mb-1">Simulated Flood Water Depth:</div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
                      <div className="bg-sky-100 border border-sky-300 text-sky-800 py-0.5 rounded">0.05 - 0.25m</div>
                      <div className="bg-blue-100 border border-blue-400 text-blue-800 py-0.5 rounded">0.25 - 0.50m</div>
                      <div className="bg-indigo-100 border border-indigo-400 text-indigo-900 py-0.5 rounded">&gt;0.50m</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 bg-slate-700 rounded-xs" />
                      <span>Houses & Buildings (Individual Plinth Vectors)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-amber-700 rounded" />
                      <span>National Highways (NHAI / Survey of India)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-blue-600 rounded" />
                      <span>State Highways & Arterials (PWD)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-slate-500 rounded" />
                      <span>Village Roads & Local Streets</span>
                    </div>
                    {navigationResult && navigationResult.routes.length > 0 && (
                      <div className="flex items-center gap-2 bg-blue-50 p-1 rounded border border-blue-200">
                        <div className="w-4 h-1.5 bg-blue-600 rounded border border-white" />
                        <span className="font-semibold text-blue-900">Calculated Navigation Route (Active)</span>
                      </div>
                    )}
                    {activeEvacuationRoute && (
                      <div className="flex items-center gap-2 bg-emerald-50 p-1 rounded border border-emerald-200">
                        <div className="w-4 h-1.5 bg-emerald-600 rounded border border-white" />
                        <span className="font-semibold text-emerald-900">Evacuation Route Corridor (Active)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-emerald-600 rounded" />
                      <span>Existing Drainage Line (Solid)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 border-t-2 border-dashed border-purple-600" />
                      <span>Proposed Box Drains (Dashed)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white" />
                      <span>Real USGS Seismicity Markers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white text-white text-[9px] flex items-center justify-center font-bold">
                        #1
                      </div>
                      <span>Illustrative Candidate Infrastructure Sites</span>
                    </div>
                  </div>
                  {imdCycloneWindData && imdCycloneWindData.geoJsonFeatureCollection?.features?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="font-semibold text-slate-800 mb-1 flex items-center justify-between">
                        <span>IMD Cyclone Wind Radii:</span>
                        <span className="text-[9px] text-orange-600 font-bold uppercase">Active Radii</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => toggleWindThreshold('27kt')}
                          className={`flex items-center gap-1.5 p-1 rounded-md border text-left cursor-pointer transition-colors ${
                            visibleWindThresholds['27kt'] !== false
                              ? 'border-amber-300 bg-amber-50/70 text-slate-900 font-semibold'
                              : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-xs border border-amber-600 shrink-0" style={{ backgroundColor: '#fbbf24' }} />
                          <span className="truncate">27kt (50 km/h)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWindThreshold('34kt')}
                          className={`flex items-center gap-1.5 p-1 rounded-md border text-left cursor-pointer transition-colors ${
                            visibleWindThresholds['34kt'] !== false
                              ? 'border-orange-300 bg-orange-50/70 text-slate-900 font-semibold'
                              : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-xs border border-orange-700 shrink-0" style={{ backgroundColor: '#f97316' }} />
                          <span className="truncate">34kt (63 km/h)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* REGION D: Compact Expandable Hazard Details Panel */}
            {activeHazard && (
              <div className="pointer-events-auto flex flex-col items-end z-20">
                {showHazardDetails && (
                  <div className="mb-2 p-3 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 rounded-2xl shadow-2xl text-[11px] max-w-sm animate-in fade-in duration-150 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <span className="font-bold text-slate-100 uppercase tracking-wider text-[10px]">
                        Hazard Scientific Details
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono">Calibrated Model</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[10.5px]">
                      {activeHazard === 'flood'
                        ? 'Hydrological Catchment Ponding Model calibrated to local elevation depressions and infiltration rates.'
                        : activeHazard === 'cyclone'
                        ? 'Official IMD Coastal Surge & Wind Exposure Corridor.'
                        : activeHazard === 'earthquake'
                        ? 'Regional IS 1893:2016 Seismic Zone with real-time USGS seismicity telemetry.'
                        : 'Authoritative multi-hazard risk assessment.'}
                    </p>
                    {dynamicHazardImpactZone?.isApplicable && (
                      <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 font-mono text-[10px] text-amber-300 flex justify-between">
                        <span>Impact Boundary:</span>
                        <span>
                          {dynamicHazardImpactZone.totalImpactAreaHa} ha (
                          {(dynamicHazardImpactZone.totalImpactAreaHa / 100).toFixed(2)} km²)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setShowHazardDetails((prev) => !prev)}
                  className="bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg text-[11px] flex items-center gap-2 cursor-pointer transition-all"
                  title="Click to view scientific hazard details"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />
                  <span className="font-semibold capitalize text-slate-200">
                    {activeHazard === 'flood' ? 'Riverine Flood' : activeHazard}
                  </span>
                  {dynamicHazardImpactZone?.isApplicable && (
                    <span className="text-[10px] text-amber-300 font-mono pl-1.5 border-l border-slate-700">
                      {dynamicHazardImpactZone.totalImpactAreaHa} ha
                    </span>
                  )}
                  <span className="text-slate-400 ml-0.5">
                    {showHazardDetails ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaflet Map DOM Element - Positioned absolute inset-0 to reliably guarantee 100% computed width & height */}
      <div
        ref={containerRef}
        id={containerId}
        style={{ width: '100%', height: '100%' }}
        className={`absolute inset-0 w-full h-full z-0 bg-slate-100 ${
          hideOverlays ? 'pointer-events-none select-none' : ''
        }`}
        tabIndex={hideOverlays ? -1 : undefined}
      />

      {/* Map Initialization Error Recovery Screen (Requirement 12) */}
      {mapInitError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 text-white p-6 backdrop-blur-sm">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
          <h3 className="text-sm font-bold text-slate-100 mb-1">Map Initialization Failed</h3>
          <p className="text-xs text-slate-300 mb-4 max-w-sm text-center leading-relaxed">
            {mapInitError}
          </p>
          <button
            onClick={handleRetryMap}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Map</span>
          </button>
        </div>
      )}

      {/* Floating Bottom-Left: Map Legend */}
      {!simpleMode && (
        <div
          className={`absolute bottom-3 left-3 z-20 pointer-events-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-xs max-w-xs sm:w-76 text-slate-800 transition-all duration-150 ${
            hideOverlays ? 'opacity-0 invisible pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden={hideOverlays}
        >
          <div
            onClick={() => setLegendExpanded(!legendExpanded)}
            className="p-2.5 flex items-center justify-between font-bold text-slate-900 cursor-pointer bg-slate-50 border-b border-slate-100"
          >
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Map Legend & Layers</span>
            </div>
            {legendExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
          {legendExpanded && (
            <div className="p-3 space-y-2 max-h-[240px] overflow-y-auto pr-2 text-slate-600 text-[11px]">
              <div className="pb-1.5 border-b border-slate-100">
                <div className="font-semibold text-slate-800 mb-1">Flood Water Depth:</div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-medium">
                  <div className="bg-blue-100 border border-blue-200 text-blue-800 py-0.5 rounded">0.05 - 0.2m</div>
                  <div className="bg-amber-100 border border-amber-200 text-amber-800 py-0.5 rounded">0.2 - 0.5m</div>
                  <div className="bg-red-100 border border-red-200 text-red-800 py-0.5 rounded">&gt;0.5m</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-slate-700 rounded-xs" />
                  <span>Houses & Buildings (Individual Plinth Vectors)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-amber-500 rounded" />
                  <span>Village Road Corridors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-emerald-600 rounded" />
                  <span>Existing Drainage Line (Solid)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 border-t-2 border-dashed border-purple-600" />
                  <span>Proposed Box Drains (Dashed)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white" />
                  <span>Real USGS Seismicity Markers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white text-white text-[9px] flex items-center justify-center font-bold">
                    #1
                  </div>
                  <span>Illustrative Candidate Infrastructure Sites</span>
                </div>
              </div>
              {imdCycloneWindData && imdCycloneWindData.geoJsonFeatureCollection?.features?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="font-semibold text-slate-800 mb-1 flex items-center justify-between">
                    <span>IMD Cyclone Wind Radii (Selectable):</span>
                    <span className="text-[9px] text-orange-600 font-bold uppercase">Click to toggle</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => toggleWindThreshold('27kt')}
                      className={`flex items-center gap-1.5 p-1 rounded-md border text-left cursor-pointer transition-colors ${
                        visibleWindThresholds['27kt'] !== false
                          ? 'border-amber-300 bg-amber-50/70 text-slate-900 font-semibold'
                          : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                      }`}
                      title="Toggle 27kt (50 km/h) Squally Wind Corridor"
                    >
                      <div className="w-3 h-3 rounded-xs border border-amber-600 shrink-0" style={{ backgroundColor: '#fbbf24' }} />
                      <span className="truncate">27kt (50 km/h)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWindThreshold('34kt')}
                      className={`flex items-center gap-1.5 p-1 rounded-md border text-left cursor-pointer transition-colors ${
                        visibleWindThresholds['34kt'] !== false
                          ? 'border-orange-300 bg-orange-50/70 text-slate-900 font-semibold'
                          : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                      }`}
                      title="Toggle 34kt (63 km/h) Gale-Force Wind Corridor"
                    >
                      <div className="w-3 h-3 rounded-xs border border-orange-700 shrink-0" style={{ backgroundColor: '#f97316' }} />
                      <span className="truncate">34kt (63 km/h)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWindThreshold('50kt')}
                      className={`flex items-center gap-1.5 p-1 rounded-md border text-left cursor-pointer transition-colors ${
                        visibleWindThresholds['50kt'] !== false
                          ? 'border-red-300 bg-red-50/70 text-slate-900 font-semibold'
                          : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                      }`}
                      title="Toggle 50kt (93 km/h) Storm-Force Wind Corridor"
                    >
                      <div className="w-3 h-3 rounded-xs border border-red-700 shrink-0" style={{ backgroundColor: '#dc2626' }} />
                      <span className="truncate">50kt (93 km/h)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWindThreshold('64kt')}
                      className={`flex items-center gap-1.5 p-1 rounded-md border text-left cursor-pointer transition-colors ${
                        visibleWindThresholds['64kt'] !== false
                          ? 'border-red-950 bg-red-100/70 text-slate-900 font-semibold'
                          : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                      }`}
                      title="Toggle 64kt (118 km/h) Hurricane-Force Wind Corridor"
                    >
                      <div className="w-3 h-3 rounded-xs border border-red-950 shrink-0" style={{ backgroundColor: '#7f1d1d' }} />
                      <span className="truncate">64kt (118 km/h)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Candidate Site Inspector (Responsive Card) */}
      {selectedFeature && selectedFeature.category === 'candidate_site' && !hideOverlays && (
        <div className="fixed bottom-3 inset-x-3 sm:bottom-auto sm:inset-x-auto sm:absolute sm:top-14 sm:right-3 z-30 pointer-events-auto w-auto sm:w-88 max-w-[calc(100vw-24px)] max-h-[48vh] sm:max-h-[calc(100%-80px)] overflow-y-auto bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl shadow-2xl p-4 text-xs text-slate-800 animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] text-white bg-emerald-600 font-mono">
                  Rank #{selectedFeature.properties?.rank || 1} Candidate
                </span>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                  Illustrative Planning Estimate
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                {selectedFeature.properties?.title || selectedFeature.properties?.name}
              </h3>
            </div>
            <button
              onClick={() => onSelectFeature?.(null)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-[11px] max-h-72 overflow-y-auto pr-1">
            {/* Purpose & Infrastructure Type */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Purpose & Type:</span>
              <p className="text-slate-700 font-medium">
                {selectedFeature.properties?.infrastructureType || 'Disaster Risk Mitigation Infrastructure'}
              </p>
              {selectedFeature.properties?.justification && (
                <p className="text-slate-500 mt-0.5 text-[10px] leading-relaxed">
                  {selectedFeature.properties.justification}
                </p>
              )}
            </div>

            {/* Actual Coordinates & Elevation */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono text-[10px]">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Coordinates</span>
                <span className="font-semibold text-slate-800">
                  {selectedFeature.coordinates
                    ? `${selectedFeature.coordinates[1].toFixed(5)}°N, ${selectedFeature.coordinates[0].toFixed(5)}°E`
                    : selectedFeature.properties?.candidateCoordinates
                    ? `${selectedFeature.properties.candidateCoordinates[1].toFixed(5)}°N, ${selectedFeature.properties.candidateCoordinates[0].toFixed(5)}°E`
                    : 'Coordinates unindexed'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Elevation Clearance</span>
                <span className="font-semibold text-slate-800">
                  {selectedFeature.properties?.elevation_m ?? '--'}m AMSL
                </span>
              </div>
            </div>

            {/* Cost Assumptions & Beneficiaries */}
            <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-[10px]">
              <div>
                <span className="text-blue-600 block text-[9px] uppercase font-bold">Est. Capital Outlay</span>
                <span className="font-bold text-blue-900 text-xs">
                  ₹{selectedFeature.properties?.estimatedCostLakhs ?? '--'} Lakhs
                </span>
              </div>
              <div>
                <span className="text-blue-600 block text-[9px] uppercase font-bold">Est. Beneficiaries</span>
                <span className="font-bold text-blue-900 text-xs">
                  {selectedFeature.properties?.expectedBeneficiaries
                    ? `${selectedFeature.properties.expectedBeneficiaries.toLocaleString()} persons`
                    : '--'}
                </span>
              </div>
            </div>

            {/* Ranking Criteria Breakdown */}
            {selectedFeature.properties?.scoreBreakdown && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  MCDA Ranking Criteria (Score: {selectedFeature.properties.scoreBreakdown.compositeTotal}/100):
                </span>
                <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-600">
                  <span className="bg-slate-50 border p-1 rounded">Hazard: <strong>{selectedFeature.properties.scoreBreakdown.hazardMitigation?.score}/30</strong></span>
                  <span className="bg-slate-50 border p-1 rounded">Access: <strong>{selectedFeature.properties.scoreBreakdown.accessibility?.score}/25</strong></span>
                  <span className="bg-slate-50 border p-1 rounded">Terrain: <strong>{selectedFeature.properties.scoreBreakdown.terrainSuitability?.score}/20</strong></span>
                </div>
              </div>
            )}

            {/* Evidence Data Sources */}
            {selectedFeature.properties?.evidenceDatasets && (
              <div className="text-[10px]">
                <span className="text-slate-400 uppercase font-bold block text-[9px]">Data Sources:</span>
                <span className="text-slate-600">
                  {Array.isArray(selectedFeature.properties.evidenceDatasets)
                    ? selectedFeature.properties.evidenceDatasets.join(', ')
                    : selectedFeature.properties.evidenceDatasets}
                </span>
              </div>
            )}

            {/* Field Verification Requirements */}
            {selectedFeature.properties?.fieldVerificationNeeded && (
              <div className="text-[10px] bg-amber-50/60 border border-amber-200/60 p-1.5 rounded text-amber-900">
                <span className="font-bold text-[9px] uppercase block text-amber-800">Ground-Truthing Required:</span>
                <span>
                  {Array.isArray(selectedFeature.properties.fieldVerificationNeeded)
                    ? selectedFeature.properties.fieldVerificationNeeded.join('; ')
                    : selectedFeature.properties.fieldVerificationNeeded}
                </span>
              </div>
            )}

            {/* Explicit Zoom to Location Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  const coords = selectedFeature.coordinates || selectedFeature.properties?.candidateCoordinates;
                  if (coords) {
                    const [lat, lng] = toLatLng(coords);
                    mapRef.current?.setView([lat, lng], 17.5, { animate: true });
                  }
                }}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Zoom to location</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Administrative Boundary Inspector */}
      {selectedFeature && selectedFeature.category === 'boundary' && !hideOverlays && (
        <div className="fixed bottom-3 inset-x-3 sm:bottom-auto sm:inset-x-auto sm:absolute sm:top-14 sm:right-3 z-30 pointer-events-auto w-auto sm:w-88 max-w-[calc(100vw-24px)] max-h-[48vh] sm:max-h-[calc(100%-80px)] overflow-y-auto bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl shadow-2xl p-4 text-xs text-slate-800 animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Administrative Cadastre
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1">
                {selectedFeature.properties?.name || `${dataset.villageName} Revenue Village Boundary`}
              </h4>
            </div>
            <button
              onClick={() => onSelectFeature?.(null)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2.5 space-y-2 text-[11px] text-slate-600">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                🏛️ Official Gram Panchayat Administrative Boundary
              </p>
              <p className="mt-1 text-[10px] text-slate-600 leading-relaxed">
                Statutory jurisdiction boundary from the Survey of India / Local Government Directory (LGD).
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-700 bg-amber-50/80 border border-amber-200/60 p-2 rounded-lg">
                <strong className="text-amber-900">Stable Cadastral Layer:</strong> This boundary marks the administrative territory and does <em>not</em> represent flood inundation, storm surge, or multi-hazard exposure limits.
              </div>
            </div>
            {selectedFeature.properties?.area_sqkm && (
              <div className="flex justify-between items-center text-[11px] px-1">
                <span className="text-slate-500">Cadastral Area:</span>
                <span className="font-semibold text-slate-900">{selectedFeature.properties.area_sqkm} sq km</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Dynamic Hazard Impact Zone Inspector */}
      {selectedFeature && (selectedFeature.category === 'hazard_impact_zone' || selectedFeature.category === 'hazard_zone') && !hideOverlays && (
        <div
          data-testid="hazard-detail-panel"
          data-hazard-name={selectedFeature.properties?.zoneName || selectedFeature.properties?.intensityLabel}
          className="fixed bottom-3 inset-x-3 sm:bottom-auto sm:inset-x-auto sm:absolute sm:top-14 sm:right-3 z-30 pointer-events-auto w-auto sm:w-96 max-w-[calc(100vw-24px)] max-h-[48vh] sm:max-h-[calc(100%-80px)] overflow-y-auto bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl shadow-2xl p-4 text-xs text-slate-800 animate-in fade-in duration-150"
        >
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: selectedFeature.properties?.color || '#dc2626' }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {selectedFeature.properties?.tier?.toUpperCase() || selectedFeature.properties?.riskLevel?.toUpperCase() || 'HIGH'} Hazard Zone
                </span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded">
                  Dynamic Impact Boundary
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                {selectedFeature.properties?.zoneName || selectedFeature.properties?.intensityLabel}
              </h4>
            </div>
            <button
              onClick={() => onSelectFeature?.(null)}
              data-testid="hazard-detail-close-btn"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2.5 space-y-2 text-[11px] text-slate-600 max-h-72 overflow-y-auto pr-1">
            <p className="text-slate-700 leading-relaxed">{selectedFeature.properties?.description}</p>
            {selectedFeature.properties?.metrics && Object.keys(selectedFeature.properties.metrics).length > 0 && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Physical / Hydrological Metrics
                </span>
                {Object.entries(selectedFeature.properties.metrics).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">{k}:</span>
                    <span className="font-mono font-semibold text-slate-800">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-slate-100">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="block text-[9px] text-slate-400 uppercase font-semibold">Impact Area</span>
                <span className="font-bold text-slate-800 text-xs">{selectedFeature.properties?.areaHa ?? '--'} ha</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="block text-[9px] text-slate-400 uppercase font-semibold">Model Basis</span>
                <span className="font-bold text-slate-800 text-xs truncate block" title={selectedFeature.properties?.dataConfidence}>
                  {selectedFeature.properties?.dataConfidence ?? 'Calibrated Model'}
                </span>
              </div>
            </div>
            {selectedFeature.properties?.scientificBasis && (
              <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <strong>Methodology:</strong> {selectedFeature.properties.scientificBasis}
              </p>
            )}
            {selectedFeature.properties?.sourceNotice && (
              <p className="text-[10px] text-slate-500 italic">
                {selectedFeature.properties.sourceNotice}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Cyclone Timeline Controller on Map (when cyclone active) */}
      {!hideOverlays &&
        activeSimulationHazard === 'cyclone' &&
        cycloneState &&
        cycloneState.steps &&
        cycloneState.steps.length > 0 &&
        visibleLayers.imdCycloneWind && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1040] pointer-events-auto max-w-[94vw] w-auto animate-in fade-in duration-150">
            <SharedHazardTimeline
              hazardType="cyclone"
              compact={true}
              currentStepIndex={cycloneState.currentStepIndex}
              totalSteps={cycloneState.steps.length}
              stepLabel={`Cyclone ${cycloneState.stormName}: ${cycloneState.steps[cycloneState.currentStepIndex]?.label}`}
              sourceClassification={cycloneState.mode === 'demo' ? 'demo' : 'forecast'}
              isPlaying={isCyclonePlaying}
              onTogglePlay={() => onToggleCyclonePlay?.()}
              onStepChange={(idx) => onSelectCycloneStep?.(idx)}
              onReset={() => onResetCyclone?.()}
            />
          </div>
        )}

    </div>
  );
};
 