import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Compass, X, Globe, Sparkles } from 'lucide-react';
import type { LocationSearchResult } from '../../types/nationwide';
import { searchIndiaLocations } from '../../services/geospatialService';
import { NATIONWIDE_BENCHMARK_LOCATIONS } from '../../data/indiaLocations';
import {
  ALL_INDIA_NATIONAL_LOCATION,
  ALL_INDIAN_STATES_AND_UTS,
  stateToLocationResult,
} from '../../data/indiaAdministrativeHierarchy';

interface NationwideLocationSearchProps {
  currentLocation: LocationSearchResult;
  onSelectLocation: (location: LocationSearchResult) => void;
  isLoadingData?: boolean;
  hideDropdown?: boolean;
}

export const NationwideLocationSearch: React.FC<NationwideLocationSearchProps> = ({
  currentLocation,
  onSelectLocation,
  isLoadingData = false,
  hideDropdown = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchReqIdRef = useRef<number>(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Automatically close dropdown if a modal becomes active
  useEffect(() => {
    if (hideDropdown) {
      setIsOpen(false);
    }
  }, [hideDropdown]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global escape key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Keep highlighted item scrolled into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Search debouncing with race-condition guard
  useEffect(() => {
    if (!query.trim()) {
      setResults([
        ALL_INDIA_NATIONAL_LOCATION,
        ...NATIONWIDE_BENCHMARK_LOCATIONS,
        ...ALL_INDIAN_STATES_AND_UTS.slice(0, 8).map(stateToLocationResult),
      ]);
      setSelectedIndex(-1);
      setIsSearching(false);
      return;
    }

    const currentReqId = ++searchReqIdRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const items = await searchIndiaLocations(query);
        if (searchReqIdRef.current === currentReqId) {
          setResults(items);
          setIsSearching(false);
          setSelectedIndex(-1);
        }
      } catch (err) {
        if (searchReqIdRef.current === currentReqId) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'country':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'state_ut':
        return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'district':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'taluk_tehsil':
        return 'bg-teal-100 text-teal-700 border border-teal-200';
      case 'gram_panchayat':
      case 'village':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'coordinates':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const handleSelect = (loc: LocationSearchResult) => {
    onSelectLocation(loc);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (results.length > 0) {
        e.preventDefault();
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          {isLoadingData ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!hideDropdown) {
              setIsOpen(true);
              if (!query) {
                setResults([
                  ALL_INDIA_NATIONAL_LOCATION,
                  ...NATIONWIDE_BENCHMARK_LOCATIONS,
                  ...ALL_INDIAN_STATES_AND_UTS.slice(0, 8).map(stateToLocationResult),
                ]);
              }
            }
          }}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-expanded={isOpen && !hideDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          placeholder="Search a village, town, district or state…"
          className="w-full pl-9 pr-8 py-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([
                ALL_INDIA_NATIONAL_LOCATION,
                ...NATIONWIDE_BENCHMARK_LOCATIONS,
                ...ALL_INDIAN_STATES_AND_UTS.slice(0, 8).map(stateToLocationResult),
              ]);
              setSelectedIndex(-1);
            }}
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Results - Guaranteed high z-index & solid background */}
      {isOpen && !hideDropdown && (
        <div
          role="listbox"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-1.5 w-[360px] sm:w-[420px] md:w-full min-w-[320px] max-w-[calc(100vw-24px)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[1100] overflow-hidden text-xs max-h-96 flex flex-col animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Quick Region Benchmark Filter Strip */}
          <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] text-slate-500 shrink-0">
            <button
              onClick={() => handleSelect(ALL_INDIA_NATIONAL_LOCATION)}
              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
              title="All-India National Multi-Hazard Digital Twin Overview"
            >
              <span>🇮🇳</span>
              <span>All-India</span>
            </button>
            <span className="font-semibold text-slate-600 uppercase px-0.5">Regions:</span>
            {NATIONWIDE_BENCHMARK_LOCATIONS.slice(0, 6).map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelect(b)}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
              >
                {b.name.split(' ')[0]} ({b.state})
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-[300px]">
            {isSearching ? (
              <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Searching nationwide gazetteer & coordinates...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((loc, idx) => {
                const isCurrent = loc.id === currentLocation.id;
                const isHighlighted = idx === selectedIndex;
                return (
                  <button
                    key={loc.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    onClick={() => handleSelect(loc)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    role="option"
                    aria-selected={isCurrent || isHighlighted}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-blue-100/70 text-blue-900'
                        : isCurrent
                        ? 'bg-blue-50/60 font-medium text-slate-900'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 text-xs whitespace-normal break-words">{loc.name}</span>
                        <span className={`text-[9px] uppercase font-bold font-mono px-1.5 py-0.2 rounded ${getBadgeStyle(loc.adminLevel)}`}>
                          {loc.adminLevel.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize">
                          · {loc.regionCategory}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5 whitespace-normal break-words leading-tight">
                        {loc.subdistrict ? `${loc.subdistrict}, ` : ''}{loc.district}, {loc.state}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {loc.center[1].toFixed(4)}°N, {loc.center[0].toFixed(4)}°E · Elev: ~{loc.elevation_m || 25}m AMSL
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-slate-400">
                No matching Indian village, tehsil, or district found for "{query}".
                <div className="text-[11px] text-slate-500 mt-1">
                  Tip: You can also enter exact coordinates (e.g. <code>16.212, 80.842</code>).
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center shrink-0">
            Nationwide Gazetteer: Resolves villages, Gram Panchayats, tehsils, and coordinates across India.
          </div>
        </div>
      )}
    </div>
  );
};
