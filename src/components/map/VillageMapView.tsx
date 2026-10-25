import React, { useState } from 'react';
import { VillageMap } from './VillageMap';
import type { SimulationResult, VillageDataset } from '../../types/village';
import {
  MapPin,
  Waves,
  Play,
  Layers,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface VillageMapViewProps {
  dataset: VillageDataset;
  latestResult: SimulationResult;
  selectedFeature: any | null;
  onSelectFeature: (feature: any | null) => void;
  onOpenSimulation: () => void;
}

export const VillageMapView: React.FC<VillageMapViewProps> = ({
  dataset,
  latestResult,
  selectedFeature,
  onSelectFeature,
  onOpenSimulation,
}) => {
  const [showFloodOverlay, setShowFloodOverlay] = useState(true);

  // Peak frame flood polygons
  const peakFrame = latestResult.frames[latestResult.peakHour] || latestResult.frames[0];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-950">
      {/* Sleek, High-Efficiency Top Strip */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 py-1.5 flex items-center justify-between text-xs shrink-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-white text-xs sm:text-sm shrink-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{dataset.villageName}</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 text-[11px] hidden md:inline truncate">
            {dataset.district} Dist, {dataset.mandal} • Digital Twin Geographic Basemap
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/80 hidden lg:inline">
            Active: {latestResult.scenario.replace('_', ' ').toUpperCase()} (Peak H+{latestResult.peakHour})
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFloodOverlay(!showFloodOverlay)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showFloodOverlay
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
            }`}
            title="Toggle peak flood inundation extent on the map"
          >
            <Waves className="w-3 h-3" />
            <span className="hidden sm:inline">
              {showFloodOverlay ? 'Flood Inundation: Visible' : 'Flood Inundation: Hidden'}
            </span>
            <span className="sm:hidden">Flood</span>
          </button>

          <button
            onClick={onOpenSimulation}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Simulation</span>
          </button>
        </div>
      </div>

      {/* Full-Bleed High-Efficiency Google Maps Viewport */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <VillageMap
          dataset={dataset}
          activeFloodGeoJson={showFloodOverlay ? peakFrame.floodPolygons : undefined}
          scenarioName={`${latestResult.scenario.replace('_', ' ').toUpperCase()} (Peak H+${latestResult.peakHour})`}
          selectedFeature={selectedFeature}
          onSelectFeature={onSelectFeature}
        />
      </div>
    </div>
  );
};
