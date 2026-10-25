import React, { useState } from 'react';
import { Clock, CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import type { DataFreshnessStatus, DatasetProvenanceMeta } from '../../types/flood';

interface DataFreshnessBadgeProps {
  status: DataFreshnessStatus;
  ageMinutes?: number;
  provenance?: DatasetProvenanceMeta;
  label?: string;
  className?: string;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  status,
  ageMinutes = 15,
  provenance,
  label,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  let dotColor = 'bg-emerald-500';
  let statusText = 'Fresh';

  if (status === 'delayed') {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
    dotColor = 'bg-amber-500';
    statusText = 'Delayed';
  } else if (status === 'stale' || status === 'unavailable') {
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
    dotColor = 'bg-rose-500';
    statusText = status === 'unavailable' ? 'Unavailable' : 'Stale';
  }

  const ageText = ageMinutes < 60 ? `${ageMinutes}m ago` : `${(ageMinutes / 60).toFixed(1)}h ago`;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer select-none ${badgeColor}`}
        title="Click to view data freshness and provenance"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${dotColor}`} />
        <span>{label ? `${label}: ` : ''}{statusText}</span>
        <span className="text-[10px] opacity-75 font-mono">({ageText})</span>
      </button>

      {/* Provenance Detail Popover */}
      {showTooltip && provenance && (
        <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-80 bg-slate-900 text-white rounded-xl shadow-2xl p-3.5 z-50 text-xs border border-slate-700 animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Data Freshness & Provenance
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                status === 'fresh'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : status === 'delayed'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}
            >
              {statusText}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-200">
            <div>
              <span className="text-slate-400">Authoritative Source:</span>
              <div className="font-semibold text-white mt-0.5">{provenance.sourceAgency}</div>
            </div>

            {provenance.observationTime && (
              <div className="flex justify-between">
                <span className="text-slate-400">Observation Time:</span>
                <span className="font-mono text-slate-300">
                  {new Date(provenance.observationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-400">Last Retrieval:</span>
              <span className="font-mono text-emerald-300">
                {new Date(provenance.lastSuccessfulRetrievalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({ageText})
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Update Cadence:</span>
              <span className="text-slate-300 text-right">{provenance.updateCadence}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Measurement Units:</span>
              <span className="font-mono text-sky-300">{provenance.units}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Quality Indicator:</span>
              <span className="capitalize text-slate-300">{provenance.qualityIndicator.replace(/_/g, ' ')}</span>
            </div>

            {provenance.warningNotice && (
              <div className="mt-2 p-2 bg-amber-950/80 border border-amber-800/80 rounded-lg text-amber-200 text-[10px] flex items-start gap-1.5 leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{provenance.warningNotice}</span>
              </div>
            )}

            {provenance.sourceUrl && (
              <div className="pt-2 mt-2 border-t border-slate-800 text-center">
                <a
                  href={provenance.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 text-[11px] font-medium"
                >
                  Verify at Official Portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

