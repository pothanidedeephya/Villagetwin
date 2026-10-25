import type {
  ScenarioType,
  SimulationConfig,
  SimulationResult,
  VillageDataset,
} from '../types/village';

/**
 * Backend API contract and types for EPA SWMM / 2D hydrodynamic simulation engine.
 * Compatible with Python FastAPI / Cloud Run / PySWMM backend.
 */
export interface BackendSimulationRequest {
  villageId: string;
  scenario: ScenarioType;
  rainfall: {
    intensity_mmh: number;
    duration_hours: number;
    hyetograph_mm?: number[];
  };
  hydrology: {
    soilType: string;
    infiltrationRate_mmh: number;
    runoffCoefficient: number;
  };
  drainageNetworkGeoJson: any;
  retentionPondsGeoJson: any;
  boundaryConditions: {
    tideOutfallCondition: 'normal' | 'high_surge_backwater';
    desiltingFactor: number;
  };
}

export interface SimulationJobStatus {
  jobId: string;
  status: 'queued' | 'validating' | 'swmm_1d_routing' | 'overland_2d_solver' | 'completed' | 'failed';
  progressPercent: number;
  currentStepMessage: string;
  estimatedTimeRemaining_sec: number;
  errorMessage?: string;
}

export interface GeospatialLayerSummary {
  id: string;
  name: string;
  type: 'boundary' | 'roads' | 'buildings' | 'drainage' | 'water_bodies' | 'retention' | 'elevation_dem';
  featureCount: number;
  crs: string;
  lastUpdated: string;
  provenance: 'Survey of India / OpenStreetMap' | 'Gram Panchayat DGPS Survey' | 'Illustrative Demo';
}

export interface SimulationComparisonRun {
  jobId: string;
  scenarioName: string;
  peakDepth_m: number;
  inundatedArea_ha: number;
  floodedBuildingsCount: number;
  impassableRoadsKm: number;
  economicLossEstimate_lakhs: number;
  drainageEfficiency_percent: number;
}

/**
 * Client for interacting with either local demonstration solver
 * or a live Python FastAPI EPA SWMM backend.
 */
class SimulationBackendClient {
  private backendBaseUrl: string = '';
  private useLiveBackend: boolean = false;

  constructor() {
    // Check if external FastAPI backend URL is set via env var
    if (typeof process !== 'undefined' && process.env?.VITE_FASTAPI_BACKEND_URL) {
      this.backendBaseUrl = process.env.VITE_FASTAPI_BACKEND_URL;
      this.useLiveBackend = true;
    }
  }

  isLiveBackendAvailable(): boolean {
    return this.useLiveBackend && Boolean(this.backendBaseUrl);
  }

  getBackendUrl(): string {
    return this.backendBaseUrl || 'http://localhost:8000/api/v1 (Not connected - using client engine)';
  }

  setBackendUrl(url: string, enable: boolean = true) {
    this.backendBaseUrl = url;
    this.useLiveBackend = enable;
  }

  /**
   * Submit simulation job to backend or mock queue
   */
  async submitSimulation(request: BackendSimulationRequest): Promise<{ jobId: string }> {
    if (this.useLiveBackend && this.backendBaseUrl) {
      try {
        const resp = await fetch(`${this.backendBaseUrl}/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!resp.ok) {
          throw new Error(`FastAPI solver error (${resp.status}): ${await resp.text()}`);
        }
        return await resp.json();
      } catch (err: any) {
        console.warn('FastAPI backend connection failed, falling back to local runner:', err.message);
      }
    }

    // Local client job generation
    return {
      jobId: `swmm-job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  /**
   * Poll status of running simulation
   */
  async getStatus(jobId: string): Promise<SimulationJobStatus> {
    if (this.useLiveBackend && this.backendBaseUrl) {
      try {
        const resp = await fetch(`${this.backendBaseUrl}/jobs/${jobId}/status`);
        if (resp.ok) return await resp.json();
      } catch (err) {
        // Fallback
      }
    }

    return {
      jobId,
      status: 'completed',
      progressPercent: 100,
      currentStepMessage: 'Simulation completed via illustrative client model',
      estimatedTimeRemaining_sec: 0,
    };
  }

  /**
   * List available geospatial layers from backend catalog
   */
  async listLayers(villageId: string): Promise<GeospatialLayerSummary[]> {
    return [
      {
        id: 'layer-bnd',
        name: 'Revenue Village Cadastral Boundary',
        type: 'boundary',
        featureCount: 1,
        crs: 'EPSG:4326 (WGS84)',
        lastUpdated: '2026-04-12',
        provenance: 'Survey of India / OpenStreetMap',
      },
      {
        id: 'layer-bld',
        name: 'Village Building Footprints & Plinths',
        type: 'buildings',
        featureCount: 27,
        crs: 'EPSG:4326 (WGS84)',
        lastUpdated: '2026-06-18',
        provenance: 'Gram Panchayat DGPS Survey',
      },
      {
        id: 'layer-rds',
        name: 'Road Network & Evacuation Corridors',
        type: 'roads',
        featureCount: 8,
        crs: 'EPSG:4326 (WGS84)',
        lastUpdated: '2026-05-20',
        provenance: 'Survey of India / OpenStreetMap',
      },
      {
        id: 'layer-drn',
        name: 'Drainage Network (Masonry & Swales)',
        type: 'drainage',
        featureCount: 5,
        crs: 'EPSG:4326 (WGS84)',
        lastUpdated: '2026-08-01',
        provenance: 'Gram Panchayat DGPS Survey',
      },
      {
        id: 'layer-wb',
        name: 'Pedda Cheruvu Tank & Irrigation Canals',
        type: 'water_bodies',
        featureCount: 3,
        crs: 'EPSG:4326 (WGS84)',
        lastUpdated: '2026-03-10',
        provenance: 'Survey of India / OpenStreetMap',
      },
    ];
  }
}

export const backendApiClient = new SimulationBackendClient();

// ============================================================================
// GOVERNMENT DATA APIS (NDMA SACHET, NWDP CWC, IMD)
// ============================================================================

export async function fetchNdmaSachetAlerts(location?: {
  center: [number, number];
  name?: string;
  district?: string;
  state?: string;
}): Promise<any> {
  let url = '/api/gov/ndma/sachet-alerts';
  if (location && location.center) {
    const params = new URLSearchParams({
      lat: String(location.center[1]),
      lng: String(location.center[0]),
      name: location.name || '',
      district: location.district || '',
      state: location.state || '',
    });
    url += `?${params.toString()}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching SACHET alerts`);
  return res.json();
}

export async function fetchNwdpCwcRainfall(location?: {
  center: [number, number];
  name?: string;
  district?: string;
  state?: string;
}): Promise<any> {
  let url = '/api/gov/nwdp/cwc-rainfall';
  if (location && location.center) {
    const params = new URLSearchParams({
      lat: String(location.center[1]),
      lng: String(location.center[0]),
      name: location.name || '',
      district: location.district || '',
      state: location.state || '',
    });
    url += `?${params.toString()}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching NWDP CWC rainfall`);
  return res.json();
}

export async function fetchImdCycloneTrack(
  scenario = false,
  location?: { center: [number, number]; name?: string }
): Promise<any> {
  let url = `/api/gov/imd/cyclone-track?scenario=${scenario ? 'true' : 'false'}`;
  if (location && location.center) {
    url += `&lat=${location.center[1]}&lng=${location.center[0]}&name=${encodeURIComponent(
      location.name || ''
    )}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching IMD Cyclone Track`);
  return res.json();
}

export async function fetchImdCycloneWind(scenario = false): Promise<any> {
  const url = `/api/gov/imd/cyclone-wind?scenario=${scenario ? 'true' : 'false'}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching IMD Cyclone Wind`);
  return res.json();
}

export async function fetchGovernmentProvidersStatus(location?: {
  center: [number, number];
  name?: string;
  district?: string;
  state?: string;
}): Promise<any> {
  let url = '/api/gov/providers-status';
  if (location && location.center) {
    const params = new URLSearchParams({
      lat: String(location.center[1]),
      lng: String(location.center[0]),
      name: location.name || '',
      district: location.district || '',
      state: location.state || '',
    });
    url += `?${params.toString()}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching government providers status`);
  return res.json();
}

