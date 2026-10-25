import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  ShieldCheck,
  AlertTriangle,
  Filter,
  Search,
  ExternalLink,
  Calendar,
  Building,
  Users,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import type { DbHistoricalDisaster } from '../../db/schema';
import type { LocationSearchResult } from '../../types/nationwide';

interface HistoricalDisasterDashboardModalProps {
  currentLocation: LocationSearchResult;
  onClose: () => void;
}

export const HistoricalDisasterDashboardModal: React.FC<HistoricalDisasterDashboardModalProps> = ({
  currentLocation,
  onClose,
}) => {
  const [disasters, setDisasters] = useState<DbHistoricalDisaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHazard, setSelectedHazard] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterByCurrentLoc, setFilterByCurrentLoc] = useState<boolean>(false);

  useEffect(() => {
    fetchDisasters();
  }, [selectedHazard, selectedState, selectedConfidence, filterByCurrentLoc]);

  const fetchDisasters = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHazard !== 'all') params.set('hazardType', selectedHazard);
      if (selectedConfidence !== 'all') params.set('confidenceLevel', selectedConfidence);
      if (filterByCurrentLoc) {
        params.set('state', currentLocation.state);
      } else if (selectedState !== 'all') {
        params.set('state', selectedState);
      }
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/disasters/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDisasters(data.disasters || []);
      }
    } catch (err) {
      console.warn('Failed to load historical disasters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDisasters();
  };

  // Aggregate statistics across filtered disasters
  const totalFatalities = disasters.reduce((sum, d) => sum + (d.fatalities || 0), 0);
  const totalHouses = disasters.reduce((sum, d) => sum + (d.damagedHouses || 0), 0);
  const totalLossCrores = disasters.reduce((sum, d) => sum + (d.economicLossCrores || 0), 0);
  const confirmedCount = disasters.filter((d) => d.confidenceLevel === 'confirmed').length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative z-10 bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">
                Historical Disaster & Loss Registry (All-India)
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Verified Records from NDMA, IMD, BMTPC & GSI Disaster Atlases
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

        {/* Filters Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Toggle: Filter to current location */}
            <button
              onClick={() => setFilterByCurrentLoc(!filterByCurrentLoc)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterByCurrentLoc
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>In {currentLocation.state}</span>
            </button>

            {/* Hazard Filter */}
            <select
              value={selectedHazard}
              onChange={(e) => setSelectedHazard(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Hazards</option>
              <option value="flood">Flood</option>
              <option value="cyclone">Cyclone</option>
              <option value="earthquake">Earthquake</option>
              <option value="tsunami">Tsunami</option>
              <option value="landslide">Landslide</option>
              <option value="heatwave">Heatwave</option>
              <option value="drought">Drought</option>
            </select>

            {/* Confidence Filter */}
            <select
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Quality Tiers</option>
              <option value="confirmed">Confirmed Records</option>
              <option value="estimated">Estimated Impacts</option>
              <option value="incomplete">Incomplete / Partial</option>
            </select>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search event, district, citation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs w-52 focus:bg-white focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Recorded Events
              </span>
              <span className="text-lg font-bold text-slate-900">{disasters.length}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {confirmedCount} confirmed records
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Documented Fatalities
              </span>
              <span className="text-lg font-bold text-red-700">
                {totalFatalities.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Official casualty count</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Damaged Dwellings
              </span>
              <span className="text-lg font-bold text-blue-700">
                {totalHouses > 0 ? totalHouses.toLocaleString() : 'Documented in reports'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Pucca & Kutcha structures</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Economic Losses
              </span>
              <span className="text-lg font-bold text-amber-700">
                ₹{totalLossCrores > 0 ? totalLossCrores.toLocaleString() : 'Documented'} Cr
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">State PDNA reports</span>
            </div>
          </div>

          {/* List of Verified Historical Events */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold border-b border-slate-200 pb-1.5">
              <span>Recorded Empirical Disasters ({disasters.length})</span>
              <span>Data Provenance & Scientific Citation</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Querying historical disaster registry...</span>
              </div>
            ) : disasters.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-700">No matching disaster records found.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Try adjusting the hazard or location filter to view records across other states.
                </p>
              </div>
            ) : (
              disasters.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2 shadow-2xs"
                >
                  {/* Title & Quality Badge */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.eventName}</span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {item.hazardType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-slate-800">
                          {item.district}, {item.state}
                        </span>
                        {item.villageName && <span>· {item.villageName}</span>}
                        <span>· Event Date: {item.eventDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          item.confidenceLevel === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.confidenceLevel === 'estimated'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {item.confidenceLevel === 'confirmed'
                          ? 'Confirmed Empirical Record'
                          : item.confidenceLevel === 'estimated'
                          ? 'Post-Disaster Estimate'
                          : 'Partial Documentation'}
                      </span>
                    </div>
                  </div>

                  {/* Magnitude / Intensity */}
                  {item.observedMagnitude && (
                    <div className="text-[11px] font-mono text-slate-800 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                      <span className="font-bold text-slate-600">Observed Magnitude: </span>
                      <span>{item.observedMagnitude}</span>
                    </div>
                  )}

                  {/* Documented Damage Figures Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Affected Population</span>
                      <span className="font-semibold text-slate-800">
                        {item.affectedPopulation !== null && item.affectedPopulation !== undefined
                          ? item.affectedPopulation.toLocaleString()
                          : 'Unavailable in record'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">Fatalities</span>
                      <span className="font-semibold text-red-700">
                        {item.fatalities !== null && item.fatalities !== undefined
                          ? item.fatalities.toLocaleString()
                          : 'None documented'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">Damaged Dwellings</span>
                      <span className="font-semibold text-slate-800">
                        {item.damagedHouses !== null && item.damagedHouses !== undefined
                          ? item.damagedHouses.toLocaleString()
                          : 'Unavailable in record'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">Documented Loss</span>
                      <span className="font-semibold text-amber-800">
                        {item.economicLossCrores !== null && item.economicLossCrores !== undefined
                          ? `₹${item.economicLossCrores.toLocaleString()} Crores`
                          : 'Unavailable in record'}
                      </span>
                    </div>
                  </div>

                  {/* Source Citation & Provenance */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-start justify-between gap-2 text-[10px] text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">Source: </span>
                      <span>{item.source}</span>
                      <p className="italic text-slate-500 mt-0.5">{item.sourceCitation}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Strict Standard: Missing damage metrics are labeled as unavailable rather than approximated.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close Registry
          </button>
        </div>
      </div>
    </div>
  );
};
