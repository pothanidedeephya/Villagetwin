import React, { useState } from 'react';
import {
  Info,
  ShieldCheck,
  AlertTriangle,
  Code2,
  Server,
  Layers,
  MapPin,
  Cpu,
  CheckCircle2,
  GitBranch,
  BookOpen,
  Globe,
  Settings,
} from 'lucide-react';
import { backendApiClient } from '../../services/backendApi';

export const AboutModelView: React.FC = () => {
  const [backendUrl, setBackendUrl] = useState(
    backendApiClient.isLiveBackendAvailable() ? backendApiClient.getBackendUrl() : 'http://localhost:8000/api/v1'
  );
  const [useBackend, setUseBackend] = useState(backendApiClient.isLiveBackendAvailable());
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveBackendConfig = () => {
    backendApiClient.setBackendUrl(backendUrl, useBackend);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
            Technical Specification & Disclaimers
          </span>
          <span className="text-xs text-slate-500">Andhra Pradesh Rural Disaster Resilience</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          About the Model, Scientific Limitations & Solver Architecture
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Hydrological assumptions, deltaic micro-topography constraints, data provenance, and FastAPI / EPA SWMM coupling specifications.
        </p>
      </div>

      {/* Prominent Scientific Disclaimer */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Scientific Disclaimer on Demonstration Model Outputs</span>
        </div>
        <p className="text-xs text-amber-950 leading-relaxed">
          The simulations generated in this initial prototype are produced by an illustrative client-side
          hydrological engine (based on modified Rational runoff and hypsometric depression storage)
          intended for demonstration, UI validation, and decision-workflow planning.
        </p>
        <p className="text-xs text-amber-950 font-medium leading-relaxed">
          <strong>Do not claim or treat simulated results as certified real-time measurements or validated hydraulic predictions.</strong>{' '}
          Accurate physical predictions require high-resolution DGPS / airborne LiDAR digital elevation models (DEM),
          calibrated soil permeability curves, and integration with a certified hydrodynamic solver (such as EPA SWMM or 2D shallow-water solvers).
        </p>
      </div>

      {/* Backend Integration Configuration Panel (Priority 4) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-600" />
              External FastAPI / EPA SWMM Backend Connection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect the application to a running Python backend executing EPA SWMM and 2D overland solvers.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-slate-100 text-slate-700">
            {useBackend ? 'Live Backend Armed' : 'Client Solver Mode'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enable-backend"
              checked={useBackend}
              onChange={(e) => setUseBackend(e.target.checked)}
              className="accent-purple-600 rounded"
            />
            <label htmlFor="enable-backend" className="font-semibold text-slate-800 cursor-pointer">
              Forward simulation requests to external FastAPI service
            </label>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">FastAPI Backend Base URL:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000/api/v1"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSaveBackendConfig}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
            {savedNotice && (
              <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">
                Settings saved!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Andhra Pradesh Deltaic Context */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-600" />
          The Andhra Pradesh Rural Flood Reality
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Rural villages in the Krishna and Godavari deltaic basins (such as Kotturu, Diviseema, and Bapatla)
          experience compounding flood hazards:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">Near-Zero Gradients (&lt;0.05%)</div>
            <p className="text-[11px] text-slate-600">
              Delta plains have virtually no hydraulic slope. Surface water cannot discharge quickly by
              gravity alone, causing prolonged waterlogging of houses and crop fields.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">Black Cotton Clay Siltation</div>
            <p className="text-[11px] text-slate-600">
              Vertisol / Black cotton soils quickly reach zero steady-state infiltration. Earthen swales
              accumulate alluvial silt and weeds, reducing conveyance by up to 70%.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">Bay of Bengal Tidal Backwater</div>
            <p className="text-[11px] text-slate-600">
              Cyclonic depressions push tidal surges upstream along drainage outfall creeks (Vagus),
              stopping gravity outlets and forcing water to back up into residential colonies.
            </p>
          </div>
        </div>
      </div>

      {/* SWMM 1D + 2D Overland Coupling Architecture */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          1D Pipe Network Coupled with 2D Overland Inundation
        </h2>

        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p>
            EPA SWMM alone solves 1D conduit networks (Saint-Venant dynamic wave routing). To achieve
            realistic street-by-street flood depth mapping, SWMM must be coupled to a 2D overland
            diffusion-wave or shallow-water solver:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                1D Drainage Network (EPA SWMM)
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-blue-950">
                <li>Underground RCC pipes and open masonry drains</li>
                <li>Culvert backwater effects and flap-gates</li>
                <li>Manning roughness $n = 0.015$ (concrete) to $0.025$ (swales)</li>
                <li>Junction head losses and surcharge backflow</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
              <div className="font-bold text-purple-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                2D Surface Water Inundation Solver
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-purple-950">
                <li>High-resolution DEM raster grid (1m to 5m cell size)</li>
                <li>2D Saint-Venant shallow-water or diffusion-wave equations</li>
                <li>Building plinth obstruction and street channeling</li>
                <li>Outputs water surface elevation (WSE) and velocity raster</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Integration Code Template */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              FastAPI + PySWMM Production Starter (server/main.py)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Python 3.11+ / PySWMM
          </span>
        </div>
        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono overflow-x-auto text-emerald-400">
{`from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import pyswmm
import numpy as np

app = FastAPI(title="Village Flood SWMM Solver API")

class SimulationPayload(BaseModel):
    village_id: str
    scenario: str
    intensity_mmh: float
    duration_hours: int
    drainage_features: list

@app.post("/api/v1/simulate")
async def trigger_simulation(payload: SimulationPayload):
    # 1. Build SWMM .inp input file dynamically from GeoJSON
    # 2. Run PySWMM hydraulic execution
    # 3. Couple junction overflow to 2D raster grid
    return {"job_id": f"job_{payload.village_id}_{payload.scenario}"}

@app.get("/api/v1/jobs/{job_id}/status")
async def check_status(job_id: str):
    return {"status": "completed", "progress": 100}`}
        </pre>
      </div>
    </div>
  );
};
