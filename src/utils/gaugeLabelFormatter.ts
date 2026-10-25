/**
 * River Gauge Map Label Formatting & Geometry Utilities
 * Bharat Village Twin — Nationwide Flood & Hydrological Monitoring
 * 
 * Provides robust parsing, containment formatting, responsive layout modes,
 * and edge-aware positioning for CWC and State WRD river hydrometric gauges.
 */

export interface FormattedGaugeParts {
  /** Clean primary station name without parenthetical qualifications */
  primaryName: string;
  /** Extracted sub-location or reach qualification in parens, e.g. "(Hiramandalam / Kotturu)" */
  subLocation: string | null;
  /** Formatted stage level text, e.g. "35.8 m" */
  stageText: string;
  /** Compact one-line representation, e.g. "Gotta Barrage · 35.8 m" */
  compactLabel: string;
  /** Full official station name */
  fullName: string;
}

/**
 * Splits and formats a gauge station name into primary name and sub-location/reach.
 * Handles patterns such as:
 * - "Gotta Barrage (Hiramandalam / Kotturu)" -> primary: "Gotta Barrage", sub: "(Hiramandalam / Kotturu)"
 * - "Joshimath / Vishnuprayag Confluence" -> primary: "Joshimath", sub: "(Vishnuprayag Confluence)"
 * - "Bandar Canal Tidal Outfall (Guduru)" -> primary: "Bandar Canal Tidal Outfall", sub: "(Guduru)"
 * - "Prakasam Barrage (Vijayawada)" -> primary: "Prakasam Barrage", sub: "(Vijayawada)"
 * - "Bund Garden" -> primary: "Bund Garden", sub: null
 */
export function parseGaugeStationName(stationName: string, currentWaterLevel_m?: number): FormattedGaugeParts {
  const safeName = (stationName || 'River Gauge Station').trim();
  const stageNum = typeof currentWaterLevel_m === 'number' && isFinite(currentWaterLevel_m) ? currentWaterLevel_m : null;
  const stageText = stageNum !== null ? `${stageNum.toFixed(1)} m` : '— m';

  let primaryName = safeName;
  let subLocation: string | null = null;

  // Pattern 1: Station Name followed by parenthetical location e.g. "Gotta Barrage (Hiramandalam / Kotturu)"
  const parenMatch = safeName.match(/^([^(]+?)\s*(\([^)]+\))\s*$/);
  if (parenMatch) {
    primaryName = parenMatch[1].trim();
    subLocation = parenMatch[2].trim();
  } else {
    // Pattern 2: Slash-separated confluence/reach e.g. "Joshimath / Vishnuprayag Confluence"
    const slashMatch = safeName.match(/^([^/]+?)\s*\/\s*(.+)$/);
    if (slashMatch) {
      primaryName = slashMatch[1].trim();
      subLocation = `(${slashMatch[2].trim()})`;
    }
  }

  // Format compact label: e.g. "Gotta Barrage · 35.8 m"
  // If primary name is very long (> 20 chars), truncate slightly for compact badge safety
  const compactName = primaryName.length > 20 ? `${primaryName.slice(0, 18).trim()}…` : primaryName;
  const compactLabel = `${compactName} · ${stageText}`;

  return {
    primaryName,
    subLocation,
    stageText,
    compactLabel,
    fullName: safeName,
  };
}

export type MarkerEdgePlacement = 'normal' | 'edge-top' | 'edge-left' | 'edge-right';

/**
 * Determines whether a gauge marker's container pixel coordinates are close to the map viewport edges.
 * Used to flip or shift the label so that it stays completely inside the visible viewport
 * and does not cover top map controls or clip at screen borders.
 */
export function calculateMarkerEdgePlacement(
  containerPoint: { x: number; y: number } | null | undefined,
  viewportSize: { x: number; y: number } | null | undefined,
  options: { topThreshold?: number; sideThreshold?: number } = {}
): MarkerEdgePlacement {
  if (!containerPoint || !viewportSize) return 'normal';

  const topThreshold = options.topThreshold ?? 75; // px from top edge
  const sideThreshold = options.sideThreshold ?? 90; // px from left/right edge

  // Near top edge of map viewport: flip label below the pin
  if (containerPoint.y < topThreshold) {
    return 'edge-top';
  }

  // Near left edge: shift label towards the right
  if (containerPoint.x < sideThreshold) {
    return 'edge-left';
  }

  // Near right edge: shift label towards the left
  if (containerPoint.x > viewportSize.x - sideThreshold) {
    return 'edge-right';
  }

  return 'normal';
}

export interface GaugeMarkerRenderOptions {
  stationName: string;
  riverName?: string;
  currentWaterLevel_m: number;
  floodStatus: 'normal' | 'warning' | 'danger' | 'extreme';
  isCompact?: boolean;
  edgePlacement?: MarkerEdgePlacement;
}

/**
 * Generates robust, containment-safe HTML for a Leaflet divIcon river gauge marker.
 *
 * Preferred 3-Tier Layout:
 * ----------------------------
 * | 🌊 Gotta Barrage         |
 * | (Hiramandalam / Kotturu) |
 * | 35.8 m        [NORMAL]   |
 * ----------------------------
 *              \/
 *              ● (at lat, lng)
 *
 * Compact Layout (mobile / crowded zoom):
 * ----------------------------
 * | 🌊 Gotta Barrage · 35.8 m|
 * ----------------------------
 *              \/
 *              ● (at lat, lng)
 */
export function buildGaugeMarkerHtml(options: GaugeMarkerRenderOptions): string {
  const {
    stationName,
    riverName = '',
    currentWaterLevel_m,
    floodStatus,
    isCompact = false,
    edgePlacement = 'normal',
  } = options;

  const isDanger = floodStatus === 'danger' || floodStatus === 'extreme';
  const isWarning = floodStatus === 'warning';
  const statusColor = isDanger ? '#dc2626' : isWarning ? '#d97706' : '#2563eb';

  const statusLabel =
    floodStatus === 'extreme'
      ? 'CRITICAL'
      : floodStatus === 'danger'
      ? 'DANGER'
      : floodStatus === 'warning'
      ? 'ALERT'
      : 'NORMAL';

  const parts = parseGaugeStationName(stationName, currentWaterLevel_m);

  const edgeClass = edgePlacement !== 'normal' ? edgePlacement : '';
  const compactClass = isCompact ? 'compact-mode' : '';

  // SVG Water Wave Icon
  const waveSvg = `<svg class="cwc-gauge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="M12 2v10"/></svg>`;

  return `
    <div class="cwc-gauge-wrapper ${edgeClass} ${compactClass}" title="CWC Station: ${escapeHtml(parts.fullName)}${riverName ? ` (${escapeHtml(riverName)})` : ''} · Stage: ${parts.stageText}">
      <!-- Card Container with strict containment -->
      <div class="cwc-gauge-card" style="background-color: ${statusColor};">
        ${
          isCompact
            ? `
          <!-- Compact View: Single line with icon + stage -->
          <div class="cwc-gauge-compact-row">
            ${waveSvg}
            <span class="cwc-gauge-compact-text">${escapeHtml(parts.compactLabel)}</span>
          </div>
        `
            : `
          <!-- Preferred 3-Tier Multi-line View -->
          <div class="cwc-gauge-full-view">
            <div class="cwc-gauge-header">
              ${waveSvg}
              <div class="cwc-gauge-title">${escapeHtml(parts.primaryName)}</div>
            </div>
            ${parts.subLocation ? `<div class="cwc-gauge-sub">${escapeHtml(parts.subLocation)}</div>` : ''}
            <div class="cwc-gauge-stage-row">
              <span class="cwc-gauge-stage-val">${parts.stageText}</span>
              <span class="cwc-gauge-status-tag">${statusLabel}</span>
            </div>
          </div>
        `
        }
      </div>

      <!-- Connecting Stem Caret -->
      <div class="cwc-gauge-stem" style="border-top-color: ${statusColor}; border-bottom-color: ${statusColor};"></div>

      <!-- Physical Station Pin Dot (Centered at true coordinates) -->
      <div class="cwc-gauge-beacon" style="background-color: ${statusColor};"></div>
    </div>
  `.trim();
}

/**
 * Escapes characters for safe HTML attribute and text injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

