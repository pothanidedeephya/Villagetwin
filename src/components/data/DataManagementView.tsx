import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Layers,
  Database,
  Building,
  Route,
  Waves,
  MapPin,
  RefreshCw,
  Info,
  Server,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { VillageDataset } from '../../types/village';
import { DEMO_VILLAGE } from '../../data/demoVillage';

interface DataManagementViewProps {
  dataset: VillageDataset;
  onUpdateDataset: (dataset: VillageDataset) => void;
  onResetToDemo: () => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  dataset,
  onUpdateDataset,
  onResetToDemo,
}) => {
  const [uploadCategory, setUploadCategory] = useState<
    'buildings' | 'roads' | 'boundary' | 'waterBodies' | 'drainageLines'
  >('buildings');
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isLoadingDbStatus, setIsLoadingDbStatus] = useState(false);

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const fetchDbStatus = async () => {
    setIsLoadingDbStatus(true);
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch DB status:', err);
    } finally {
      setIsLoadingDbStatus(false);
    }
  };

  // Handle GeoJSON File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Basic GeoJSON validation
        if (!parsed || parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
          throw new Error(
            'Invalid GeoJSON: Root must be a FeatureCollection containing a "features" array.'
          );
        }

        if (parsed.features.length === 0) {
          throw new Error('FeatureCollection is empty (0 features detected).');
        }

        // Apply to corresponding category
        const updated = { ...dataset };
        if (uploadCategory === 'buildings') {
          updated.buildings = parsed;
        } else if (uploadCategory === 'roads') {
          updated.roads = parsed;
        } else if (uploadCategory === 'boundary') {
          updated.boundary = parsed;
          // Recenter to first coordinate if available
          const firstCoord = parsed.features[0]?.geometry?.coordinates?.[0]?.[0];
          if (firstCoord && Array.isArray(firstCoord) && firstCoord.length >= 2) {
            updated.center = [firstCoord[0], firstCoord[1]];
          }
        } else if (uploadCategory === 'waterBodies') {
          updated.waterBodies = parsed;
        } else if (uploadCategory === 'drainageLines') {
          updated.drainageLines = parsed;
        }

        onUpdateDataset(updated);
        setUploadStatus({
          type: 'success',
          message: `Successfully ingested ${parsed.features.length} features into '${uploadCategory}'. Map updated!`,
        });
      } catch (err: any) {
        setUploadStatus({
          type: 'error',
          message: err.message || 'Failed to parse JSON file.',
        });
      }
    };

    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Export full village package as JSON
  const handleExportFullDataset = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${dataset.villageName.replace(/\s+/g, '_')}_DigitalTwin_GIS.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Spatial Data & GIS Layer Ingestion
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Import and validate local GeoJSON datasets from QGIS, Google Earth, or DGPS village drone surveys.
        </p>
      </div>

      {/* Database Architecture & Persistent Storage Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Database & Spatial Layer Engine
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    dbStatus?.connected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {dbStatus?.provider === 'supabase_direct_pg'
                    ? 'Supabase PostgreSQL (Direct)'
                    : dbStatus?.provider === 'supabase_js_client'
                    ? 'Supabase Client (REST / PostgREST)'
                    : 'Zero-Config Persistent Storage'}
                </span>
                {dbStatus?.postgisEnabled && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    PostGIS 3.0+
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {dbStatus?.message || 'Loading database connection status...'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchDbStatus}
            disabled={isLoadingDbStatus}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Refresh database connectivity & counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDbStatus ? 'animate-spin text-blue-600' : ''}`} />
            <span>Verify Connection</span>
          </button>
        </div>

        {/* Live Table Counts */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Managed Schema Entities (11 Tables with PostGIS & RLS)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            {[
              { name: 'locations', count: dbStatus?.recordCounts?.locations ?? 0, desc: 'Villages & Regions' },
              { name: 'historical_disasters', count: dbStatus?.recordCounts?.historicalDisasters ?? 0, desc: 'Empirical Records' },
              { name: 'weather_obs', count: dbStatus?.recordCounts?.weatherObservations ?? 0, desc: 'Observations' },
              { name: 'weather_forecasts', count: dbStatus?.recordCounts?.weatherForecastSnapshots ?? 0, desc: 'Snapshots' },
              { name: 'geospatial_assets', count: dbStatus?.recordCounts?.geospatialAssets ?? 0, desc: 'Spatial Layers' },
              { name: 'risk_assessments', count: dbStatus?.recordCounts?.riskAssessments ?? 0, desc: 'Multi-Hazard' },
              { name: 'simulation_runs', count: dbStatus?.recordCounts?.simulationRuns ?? 0, desc: 'Flood Runs' },
              { name: 'infrastructure_recs', count: dbStatus?.recordCounts?.infrastructureRecommendations ?? 0, desc: 'Recommendations' },
              { name: 'alerts', count: dbStatus?.recordCounts?.alerts ?? 0, desc: 'Warnings & Notices' },
              { name: 'user_preferences', count: dbStatus?.recordCounts?.userPreferences ?? 0, desc: 'Subscriptions' },
              { name: 'notif_history', count: dbStatus?.recordCounts?.notificationHistory ?? 0, desc: 'Delivery Logs' },
            ].map((tbl, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
                <span className="font-mono text-[10px] text-slate-600 truncate">{tbl.name}</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-slate-900">{tbl.count}</span>
                  <span className="text-[9px] text-slate-400 truncate ml-1">{tbl.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dataset Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="font-bold text-slate-900 text-sm">
              Active Dataset: {dataset.villageName}
            </h3>
            <span className="text-xs text-slate-400">
              ({dataset.district} Dist, {dataset.state})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Center Coordinates: {dataset.center[0]}, {dataset.center[1]} • Estimated Population:{' '}
            {dataset.totalPopulation.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetToDemo}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Demonstration Data
          </button>
          <button
            onClick={handleExportFullDataset}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Bundle (.json)
          </button>
        </div>
      </div>

      {/* Layer Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {[
          {
            label: 'Boundary Features',
            count: dataset.boundary.features.length,
            icon: MapPin,
            color: 'text-slate-600',
          },
          {
            label: 'Building Footprints',
            count: dataset.buildings.features.length,
            icon: Building,
            color: 'text-indigo-600',
          },
          {
            label: 'Road Corridors',
            count: dataset.roads.features.length,
            icon: Route,
            color: 'text-amber-600',
          },
          {
            label: 'Water Bodies & Canals',
            count: dataset.waterBodies.features.length,
            icon: Waves,
            color: 'text-sky-600',
          },
          {
            label: 'Drainage Lines',
            count: dataset.drainageLines.features.length,
            icon: Layers,
            color: 'text-purple-600',
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">{item.label}</span>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="text-xl font-bold text-slate-900">{item.count}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Active features</div>
            </div>
          );
        })}
      </div>

      {/* Upload & Ingestion Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            Import Custom GeoJSON Layer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the target layer type, then upload your `.geojson` or `.json` file.
          </p>
        </div>

        {/* Layer Target Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'buildings', label: 'Building Footprints' },
            { id: 'roads', label: 'Roads & Streets' },
            { id: 'boundary', label: 'Village Boundary' },
            { id: 'waterBodies', label: 'Water Bodies & Canals' },
            { id: 'drainageLines', label: 'Drainage Network' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setUploadCategory(cat.id as any)}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                uploadCategory === cat.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Drag & Drop / File Input Box */}
        <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <FileCode className="w-6 h-6" />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-800">
              Click to select or drag a GeoJSON file
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Supports WGS84 (EPSG:4326) `.geojson` or `.json` FeatureCollection
            </div>
          </div>
          <input
            type="file"
            accept=".geojson,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Status Message */}
        {uploadStatus.type && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              uploadStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Expected Schema Guidance */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-600">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            Recommended GeoJSON Properties
          </div>
          <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
            <li>
              <strong>Buildings:</strong> <code>name</code>, <code>type</code> (residential, school,
              clinic, etc.), <code>groundElevation_m</code> (AMSL), <code>plinthHeight_cm</code>,{' '}
              <code>occupants</code>.
            </li>
            <li>
              <strong>Roads:</strong> <code>name</code>, <code>roadType</code>,{' '}
              <code>elevation_m</code>, <code>isEvacuationCorridor</code> (boolean),{' '}
              <code>length_m</code>.
            </li>
            <li>
              <strong>Drainage:</strong> <code>name</code>, <code>type</code>, <code>status</code>{' '}
              (existing / proposed), <code>width_m</code>, <code>depth_m</code>,{' '}
              <code>capacity_m3s</code>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
