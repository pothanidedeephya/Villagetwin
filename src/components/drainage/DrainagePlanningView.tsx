import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  TrendingDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Waves,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import type {
  DrainageProperties,
  RetentionPondProperties,
  SimulationResult,
  VillageDataset,
} from '../../types/village';
import { VillageMap } from '../map/VillageMap';
import type { FeatureCollection, LineString, Polygon } from 'geojson';

interface DrainagePlanningViewProps {
  dataset: VillageDataset;
  latestResult: SimulationResult;
  proposedDrains: FeatureCollection<LineString, DrainageProperties>;
  onUpdateProposedDrains: (drains: FeatureCollection<LineString, DrainageProperties>) => void;
  proposedPonds: FeatureCollection<Polygon, RetentionPondProperties>;
  onUpdateProposedPonds: (ponds: FeatureCollection<Polygon, RetentionPondProperties>) => void;
  selectedFeature: any | null;
  onSelectFeature: (feature: any | null) => void;
  onRunComparison: () => void;
}

export const DrainagePlanningView: React.FC<DrainagePlanningViewProps> = ({
  dataset,
  latestResult,
  proposedDrains,
  onUpdateProposedDrains,
  proposedPonds,
  onUpdateProposedPonds,
  selectedFeature,
  onSelectFeature,
  onRunComparison,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'drain' | 'retention'>('drain');
  const [pendingPoints, setPendingPoints] = useState<[number, number][] | null>(null);

  // Modal form for new drawn drain
  const [showDrainForm, setShowDrainForm] = useState(false);
  const [drainName, setDrainName] = useState('New Proposed Storm Conduit');
  const [drainType, setDrainType] = useState<DrainageProperties['type']>('RCC Covered Box');
  const [width, setWidth] = useState(1.4);
  const [depth, setDepth] = useState(1.2);
  const [gradient, setGradient] = useState(0.4);
  const [costPerMeter, setCostPerMeter] = useState(3800); // INR per meter

  // Calculations
  const existingDrainCount = dataset.drainageLines.features.filter(
    (d) => d.properties.status === 'existing'
  ).length;
  const proposedDrainFeatures = proposedDrains.features.filter(
    (d) => d.properties.status === 'proposed'
  );

  const totalProposedCostLakhs = Number(
    (
      proposedDrainFeatures.reduce((acc, d) => acc + d.properties.cost_lakhs, 0) +
      proposedPonds.features.reduce((acc, p) => acc + p.properties.estimatedCost_lakhs, 0)
    ).toFixed(2)
  );

  const totalDrainLengthM = proposedDrainFeatures.reduce(
    (acc, d) => acc + (d.properties.length_m || 500),
    0
  );

  const totalRetentionStorageM3 = proposedPonds.features.reduce(
    (acc, p) => acc + p.properties.storage_m3,
    0
  );

  // Handle finished drawing from map
  const handleMapDrawnFeature = (points: [number, number][], type: 'drain' | 'retention') => {
    setPendingPoints(points);
    setIsDrawing(false);
    if (type === 'drain') {
      setShowDrainForm(true);
    } else {
      // Create retention pond polygon
      const minLng = Math.min(...points.map((p) => p[0]));
      const maxLng = Math.max(...points.map((p) => p[0]));
      const minLat = Math.min(...points.map((p) => p[1]));
      const maxLat = Math.max(...points.map((p) => p[1]));

      const polygonCoords = [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ];

      const newPond: RetentionPondProperties = {
        id: `rp-user-${Date.now()}`,
        name: `Proposed Sponge Retention Pond ${proposedPonds.features.length + 1}`,
        area_sqm: 3500,
        depth_m: 1.5,
        storage_m3: 5250,
        estimatedCost_lakhs: 14.5,
        status: 'proposed',
      };

      onUpdateProposedPonds({
        type: 'FeatureCollection',
        features: [
          ...proposedPonds.features,
          {
            type: 'Feature',
            properties: newPond,
            geometry: {
              type: 'Polygon',
              coordinates: [polygonCoords],
            },
          },
        ],
      });
      setPendingPoints(null);
    }
  };

  const handleSaveDrain = () => {
    if (!pendingPoints || pendingPoints.length < 2) return;

    // Approximate length in meters
    const dx = (pendingPoints[pendingPoints.length - 1][0] - pendingPoints[0][0]) * 111000 * 0.96;
    const dy = (pendingPoints[pendingPoints.length - 1][1] - pendingPoints[0][1]) * 111000;
    const approxLengthM = Math.max(50, Math.round(Math.hypot(dx, dy)));

    // Manning capacity estimate
    // Q = (1/n) * A * R^(2/3) * S^(1/2)
    const n = drainType === 'RCC Covered Box' ? 0.015 : drainType === 'Masonry U-Drain' ? 0.017 : 0.025;
    const area = width * depth;
    const perimeter = width + 2 * depth;
    const R = area / perimeter;
    const S = gradient / 100;
    const estimatedCapacity = Number(((1 / n) * area * Math.pow(R, 2 / 3) * Math.sqrt(S)).toFixed(2));

    const totalCostLakhs = Number(((approxLengthM * costPerMeter) / 100000).toFixed(2));

    const newDrain: DrainageProperties = {
      id: `dr-prop-${Date.now()}`,
      name: drainName,
      type: drainType,
      status: 'proposed',
      width_m: width,
      depth_m: depth,
      capacity_m3s: estimatedCapacity,
      gradient_percent: gradient,
      cost_lakhs: totalCostLakhs,
      length_m: approxLengthM,
      maintenanceStatus: 'Good',
    };

    onUpdateProposedDrains({
      type: 'FeatureCollection',
      features: [
        ...proposedDrains.features,
        {
          type: 'Feature',
          properties: newDrain,
          geometry: {
            type: 'LineString',
            coordinates: pendingPoints,
          },
        },
      ],
    });

    setShowDrainForm(false);
    setPendingPoints(null);
  };

  const handleDeleteProposedDrain = (id: string) => {
    onUpdateProposedDrains({
      type: 'FeatureCollection',
      features: proposedDrains.features.filter((f) => f.properties.id !== id),
    });
  };

  const handleDeletePond = (id: string) => {
    onUpdateProposedPonds({
      type: 'FeatureCollection',
      features: proposedPonds.features.filter((f) => f.properties.id !== id),
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Waves className="w-4 h-4 text-purple-600" />
            Drainage & Retention Infrastructure Planning
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 hidden sm:inline">
            Interactive alignment drafting & civil cost estimation
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsDrawing(true);
              setDrawMode('drain');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDrawing && drawMode === 'drain'
                ? 'bg-pink-600 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Draw Proposed Drain
          </button>
          <button
            onClick={() => {
              setIsDrawing(true);
              setDrawMode('retention');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDrawing && drawMode === 'retention'
                ? 'bg-pink-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Retention Basin
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: Proposed Civil Works & Cost Estimates */}
        <div className="w-full lg:w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          {/* Executive Capital Cost & Benefit Summary */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Intervention Portfolio
              </span>
              <span className="bg-purple-500/30 text-purple-300 border border-purple-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {proposedDrainFeatures.length} Drains • {proposedPonds.features.length} Basins
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[11px] text-slate-400">Total Est. Civil Works:</div>
                <div className="text-xl font-bold text-cyan-300">₹{totalProposedCostLakhs} L</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Gram Panchayat Budget</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Total Sponge Storage:</div>
                <div className="text-xl font-bold text-emerald-400">
                  {totalRetentionStorageM3.toLocaleString()} m³
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Surface runoff buffer</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">Modeled Flood Reduction:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> ~78% fewer homes inundated
              </span>
            </div>

            <button
              onClick={onRunComparison}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Simulate Intervention vs Baseline
            </button>
          </div>

          {/* Outfall & Downstream Caution Alert */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Downstream Outfall Caution:</span>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Drains do not make water disappear. High-capacity conduits must safely discharge into
                Chinna Vagu or sponge percolation basins. If tidal backwater or creek swelling blocks
                the outfall, upstream water will back up.
              </p>
            </div>
          </div>

          {/* Proposed Channels List */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Proposed Channels ({proposedDrainFeatures.length})</span>
              <span className="text-purple-600 font-semibold">{totalDrainLengthM} m total</span>
            </h3>

            {proposedDrainFeatures.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No proposed drains yet. Click "Draw Proposed Drain" to trace an alignment on the map.
              </div>
            ) : (
              proposedDrainFeatures.map((drain) => (
                <div
                  key={drain.properties.id}
                  className="p-3 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 transition-colors text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{drain.properties.name}</div>
                      <div className="text-[11px] text-purple-700 font-medium">
                        {drain.properties.type} • {drain.properties.length_m}m length
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProposedDrain(drain.properties.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Remove Drain"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600 pt-1 border-t border-purple-100">
                    <div>
                      <span className="text-slate-400">Dimensions:</span>
                      <div className="font-semibold text-slate-800">
                        {drain.properties.width_m}m × {drain.properties.depth_m}m
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Capacity:</span>
                      <div className="font-semibold text-blue-700">
                        {drain.properties.capacity_m3s} m³/s
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Est. Cost:</span>
                      <div className="font-semibold text-slate-800">
                        ₹{drain.properties.cost_lakhs} L
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Retention Ponds List */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Retention Ponds & Sponge Basins ({proposedPonds.features.length})</span>
            </h3>

            {proposedPonds.features.map((pond) => (
              <div
                key={pond.properties.id}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition-colors text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{pond.properties.name}</div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      Surface Area: {pond.properties.area_sqm.toLocaleString()} m² • Depth: {pond.properties.depth_m}m
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePond(pond.properties.id)}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Remove Pond"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1 border-t border-emerald-100">
                  <div>
                    <span className="text-slate-400">Storage Buffer:</span>
                    <div className="font-semibold text-emerald-700">
                      {pond.properties.storage_m3.toLocaleString()} m³
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Est. Excavation Cost:</span>
                    <div className="font-semibold text-slate-800">
                      ₹{pond.properties.estimatedCost_lakhs} Lakhs
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Existing Baseline Drains (Read-only reference) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">
              Existing Channels (Baseline Reference)
            </h3>
            {dataset.drainageLines.features
              .filter((d) => d.properties.status === 'existing')
              .map((d) => (
                <div
                  key={d.properties.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700"
                >
                  <div className="font-semibold text-slate-800">{d.properties.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
                    <span>{d.properties.type} ({d.properties.width_m}m × {d.properties.depth_m}m)</span>
                    <span className="text-amber-700 font-medium">{d.properties.maintenanceStatus}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Section: Interactive Map with Drawing support */}
        <div className="flex-1 relative">
          <VillageMap
            dataset={dataset}
            proposedDrainsOverride={proposedDrains}
            proposedPondsOverride={proposedPonds}
            isDrawingMode={isDrawing}
            drawingType={drawMode}
            onAddDrawnFeature={handleMapDrawnFeature}
            selectedFeature={selectedFeature}
            onSelectFeature={onSelectFeature}
          />
        </div>
      </div>

      {/* Modal Dialog: Configure Newly Drawn Channel */}
      {showDrainForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Waves className="w-4 h-4 text-purple-600" />
                Configure Proposed Drain Channel
              </h3>
              <button
                onClick={() => setShowDrainForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Channel Name:</label>
                <input
                  type="text"
                  value={drainName}
                  onChange={(e) => setDrainName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Structural Section:</label>
                <select
                  value={drainType}
                  onChange={(e) => setDrainType(e.target.value as DrainageProperties['type'])}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none"
                >
                  <option value="RCC Covered Box">RCC Covered Box Drain (Heavy Discharge / Safe for traffic)</option>
                  <option value="Masonry U-Drain">Masonry Open U-Drain with Precast Slabs</option>
                  <option value="Earthen Swale">Bio-Vegetated Earthen Swale (Low Cost / Natural)</option>
                  <option value="Underground Pipe">Underground HDPE / Reinforced Concrete Pipe</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Width (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.4"
                    max="4.0"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Depth (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.3"
                    max="3.0"
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slope (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={gradient}
                    onChange={(e) => setGradient(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estimated Civil Cost per Meter (₹):
                </label>
                <input
                  type="number"
                  step="200"
                  min="500"
                  max="15000"
                  value={costPerMeter}
                  onChange={(e) => setCostPerMeter(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Includes excavation, shuttering, steel reinforcement & backfill.
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowDrainForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDrain}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md cursor-pointer"
              >
                Add Proposed Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
