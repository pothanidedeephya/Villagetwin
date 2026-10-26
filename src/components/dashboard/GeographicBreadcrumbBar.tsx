import React from 'react';
import {
  ChevronRight,
  MapPin,
  Compass,
  Globe,
  Mountain,
  Waves,
  Sun,
  Layers,
} from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';

export interface GeographicBreadcrumbBarProps {
  currentLocation: LocationSearchResult;
  onFitLocation?: () => void;
  compositeRiskScore?: number;
}

export const GeographicBreadcrumbBar: React.FC<GeographicBreadcrumbBarProps> = ({
  currentLocation,
  onFitLocation,
  compositeRiskScore,
}) => {
  const [lng, lat] = currentLocation.center || [83.95, 18.7];

  const getRegionIcon = () => {
    switch (currentLocation.regionCategory) {
      case 'himalayan':
        return <Mountain className="w-3 h-3 text-emerald-600" />;
      case 'coastal':
      case 'riverine':
      case 'island':
        return <Waves className="w-3 h-3 text-cyan-600" />;
      case 'drought_prone':
        return <Sun className="w-3 h-3 text-amber-600" />;
      default:
        return <Layers className="w-3 h-3 text-blue-600" />;
    }
  };

  const formatRegionLabel = (cat?: string) => {
    switch (cat) {
      case 'himalayan':
        return 'Himalayan Ridge';
      case 'coastal':
        return 'Coastal Delta';
      case 'riverine':
        return 'Riverine Basin';
      case 'drought_prone':
        return 'Arid Plains';
      case 'northeastern':
        return 'North-East Hill Tract';
      case 'island':
        return 'Riverine Island';
      default:
        return 'Alluvial Plains';
    }
  };

  return (
    <nav
      aria-label="Geographic Hierarchy Breadcrumb"
      className="bg-white border-b border-slate-200/90 px-3 sm:px-5 py-2 flex items-center justify-between text-xs text-slate-700 z-[1150] shrink-0 select-none overflow-x-auto shadow-2xs"
    >
      {/* 1. Left: Breadcrumb Trail (State > District > Mandal > Gram Panchayat) */}
      <ol className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        {/* National Level */}
        <li className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden xs:inline">India</span>
        </li>

        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />

        {/* State */}
        <li className="flex items-center text-slate-600 font-medium shrink-0">
          <span>{currentLocation.state || 'State'}</span>
        </li>

        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />

        {/* District */}
        <li className="flex items-center text-slate-600 font-medium shrink-0">
          <span className="truncate max-w-[120px] sm:max-w-none">{currentLocation.district || 'District'}</span>
        </li>

        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />

        {/* Mandal / Block / Tehsil */}
        {currentLocation.subdistrict && (
          <>
            <li className="flex items-center text-slate-600 font-medium shrink-0">
              <span className="truncate max-w-[120px] sm:max-w-none">{currentLocation.subdistrict}</span>
            </li>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />
          </>
        )}

        {/* Gram Panchayat / Village (Active) */}
        <li className="flex items-center shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs">
            <MapPin className="w-3 h-3 text-blue-600" />
            <span className="truncate max-w-[140px] sm:max-w-[220px]">
              {currentLocation.name}
            </span>
          </span>
        </li>
      </ol>

      {/* 2. Right: Geographic Metadata Pills & Fit Location Action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
        {/* Terrain / Region Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium">
          {getRegionIcon()}
          <span>{formatRegionLabel(currentLocation.regionCategory)}</span>
        </div>

        {/* Elevation ASL */}
        {currentLocation.elevation_m !== undefined && (
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono">
            <span className="text-slate-400">Alt:</span>
            <span>{currentLocation.elevation_m}m</span>
          </div>
        )}

        {/* Coordinates */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 font-mono bg-slate-50/80 px-2 py-0.5 rounded-md border border-slate-200/70">
          <span>{lat.toFixed(3)}°N</span>
          <span className="text-slate-300">,</span>
          <span>{lng.toFixed(3)}°E</span>
        </div>

        {/* Fit Map Boundary */}
        {onFitLocation && (
          <button
            type="button"
            onClick={onFitLocation}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 transition-colors shadow-2xs cursor-pointer"
            title={`Fit viewport to ${currentLocation.name}`}
          >
            <Compass className="w-3 h-3 text-blue-600" />
            <span className="hidden xs:inline">Fit Location</span>
          </button>
        )}
      </div>
    </nav>
  );
};

