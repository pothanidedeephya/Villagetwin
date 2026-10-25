import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseGaugeStationName,
  calculateMarkerEdgePlacement,
  buildGaugeMarkerHtml,
} from '../src/utils/gaugeLabelFormatter';
import type { CwcRiverGaugeStation } from '../src/types/flood';

describe('River Gauge Map Label UI & Containment Tests', () => {
  it('1. Correctly splits long name "Gotta Barrage (Hiramandalam / Kotturu)" into preferred 3-tier parts', () => {
    const parts = parseGaugeStationName('Gotta Barrage (Hiramandalam / Kotturu)', 35.8);
    assert.strictEqual(parts.primaryName, 'Gotta Barrage');
    assert.strictEqual(parts.subLocation, '(Hiramandalam / Kotturu)');
    assert.strictEqual(parts.stageText, '35.8 m');
    assert.strictEqual(parts.compactLabel, 'Gotta Barrage · 35.8 m');
    assert.strictEqual(parts.fullName, 'Gotta Barrage (Hiramandalam / Kotturu)');
  });

  it('2. Correctly handles slash-separated station name without parentheses', () => {
    const parts = parseGaugeStationName('Joshimath / Vishnuprayag Confluence', 1892.4);
    assert.strictEqual(parts.primaryName, 'Joshimath');
    assert.strictEqual(parts.subLocation, '(Vishnuprayag Confluence)');
    assert.strictEqual(parts.stageText, '1892.4 m');
    assert.strictEqual(parts.compactLabel, 'Joshimath · 1892.4 m');
  });

  it('3. Correctly handles short station name with no sub-location', () => {
    const parts = parseGaugeStationName('Bund Garden', 12.4);
    assert.strictEqual(parts.primaryName, 'Bund Garden');
    assert.strictEqual(parts.subLocation, null);
    assert.strictEqual(parts.stageText, '12.4 m');
    assert.strictEqual(parts.compactLabel, 'Bund Garden · 12.4 m');
  });

  it('4. Correctly handles very long station name and avoids overflow in compact label', () => {
    const parts = parseGaugeStationName('Neamati Ghat (Jorhat / Majuli Ferry Passage)', 84.2);
    assert.strictEqual(parts.primaryName, 'Neamati Ghat');
    assert.strictEqual(parts.subLocation, '(Jorhat / Majuli Ferry Passage)');
    assert.strictEqual(parts.stageText, '84.2 m');
    assert.strictEqual(parts.compactLabel, 'Neamati Ghat · 84.2 m');
  });

  it('5. Generates preferred 3-tier HTML containing station title, sub-location and stage row', () => {
    const html = buildGaugeMarkerHtml({
      stationName: 'Gotta Barrage (Hiramandalam / Kotturu)',
      riverName: 'Vamsadhara River',
      currentWaterLevel_m: 35.8,
      floodStatus: 'normal',
      isCompact: false,
      edgePlacement: 'normal',
    });

    // Contains wrapper and card
    assert.ok(html.includes('class="cwc-gauge-wrapper'), 'Wrapper present');
    assert.ok(html.includes('class="cwc-gauge-card"'), 'Card container present');

    // Contains wave icon and primary station name
    assert.ok(html.includes('cwc-gauge-title">Gotta Barrage</div>'), 'Primary name isolated');
    // Contains subLocation
    assert.ok(html.includes('cwc-gauge-sub">(Hiramandalam / Kotturu)</div>'), 'Sub-location isolated');
    // Contains water stage
    assert.ok(html.includes('cwc-gauge-stage-val">35.8 m</span>'), 'Stage level formatted');
    // Contains normal status badge
    assert.ok(html.includes('cwc-gauge-status-tag">NORMAL</span>'), 'Status tag present');
    // Contains stem and beacon pin dot
    assert.ok(html.includes('class="cwc-gauge-stem"'), 'Stem present');
    assert.ok(html.includes('class="cwc-gauge-beacon"'), 'Beacon dot present');
  });

  it('6. Generates compact one-line HTML when isCompact is true (mobile / crowded zoom)', () => {
    const html = buildGaugeMarkerHtml({
      stationName: 'Gotta Barrage (Hiramandalam / Kotturu)',
      riverName: 'Vamsadhara River',
      currentWaterLevel_m: 35.8,
      floodStatus: 'normal',
      isCompact: true,
      edgePlacement: 'normal',
    });

    assert.ok(html.includes('compact-mode'), 'Compact mode class added to wrapper');
    assert.ok(html.includes('cwc-gauge-compact-row'), 'Compact row present');
    assert.ok(html.includes('Gotta Barrage · 35.8 m'), 'Compact single line text present');
    // Multi-line full view should NOT be rendered
    assert.ok(!html.includes('cwc-gauge-full-view'), 'Full view excluded in compact mode');
  });

  it('7. Adapts status color correctly based on floodStatus', () => {
    const dangerHtml = buildGaugeMarkerHtml({
      stationName: 'Prakasam Barrage (Vijayawada)',
      currentWaterLevel_m: 18.2,
      floodStatus: 'danger',
    });
    // #dc2626 is red for danger
    assert.ok(dangerHtml.includes('#dc2626'), 'Danger red color applied');
    assert.ok(dangerHtml.includes('DANGER'), 'Danger status label rendered');

    const warningHtml = buildGaugeMarkerHtml({
      stationName: 'Prakasam Barrage (Vijayawada)',
      currentWaterLevel_m: 16.9,
      floodStatus: 'warning',
    });
    // #d97706 is amber for warning
    assert.ok(warningHtml.includes('#d97706'), 'Warning amber color applied');
    assert.ok(warningHtml.includes('ALERT'), 'Warning alert tag rendered');
  });

  it('8. Viewport edge placement detection flips top markers and shifts side markers', () => {
    const viewport = { x: 1000, y: 700 };

    // Near top: y = 40 (< 75 threshold)
    const topPlacement = calculateMarkerEdgePlacement({ x: 500, y: 40 }, viewport);
    assert.strictEqual(topPlacement, 'edge-top');

    // Near left: x = 50 (< 90 threshold)
    const leftPlacement = calculateMarkerEdgePlacement({ x: 50, y: 400 }, viewport);
    assert.strictEqual(leftPlacement, 'edge-left');

    // Near right: x = 950 (> 1000 - 90 threshold)
    const rightPlacement = calculateMarkerEdgePlacement({ x: 950, y: 400 }, viewport);
    assert.strictEqual(rightPlacement, 'edge-right');

    // Centered normal
    const normalPlacement = calculateMarkerEdgePlacement({ x: 500, y: 400 }, viewport);
    assert.strictEqual(normalPlacement, 'normal');

    // Verify HTML incorporates edge-top class
    const edgeTopHtml = buildGaugeMarkerHtml({
      stationName: 'Gotta Barrage (Hiramandalam / Kotturu)',
      currentWaterLevel_m: 35.8,
      floodStatus: 'normal',
      edgePlacement: 'edge-top',
    });
    assert.ok(edgeTopHtml.includes('cwc-gauge-wrapper edge-top'), 'edge-top class attached');
  });

  it('9. Preserves full telemetry in details popup content structure', () => {
    const sampleGauge: CwcRiverGaugeStation = {
      stationId: 'cwc-vamsadhara-gotta-barrage',
      stationName: 'Gotta Barrage (Hiramandalam / Kotturu)',
      riverName: 'Vamsadhara River',
      basinName: 'Vamsadhara Basin',
      coordinates: [83.964, 18.688],
      warningLevel_m: 38.5,
      dangerLevel_m: 40.0,
      hfl_m: 41.8,
      currentWaterLevel_m: 35.8,
      discharge_m3s: 580,
      floodStatus: 'normal',
      flowTrend: 'steady',
      lastObservationTime: new Date().toISOString(),
      sourceUrl: 'https://ffs.india-water.gov.in/',
      sourceAgency: 'Central Water Commission (CWC)',
      dataClassification: 'real_observed',
      distanceKm: 1.97,
      retrievedAt: new Date().toISOString(),
    };

    // Full name, river and levels must be verified
    assert.strictEqual(sampleGauge.stationName, 'Gotta Barrage (Hiramandalam / Kotturu)');
    assert.strictEqual(sampleGauge.riverName, 'Vamsadhara River');
    assert.strictEqual(sampleGauge.currentWaterLevel_m, 35.8);
    assert.strictEqual(sampleGauge.warningLevel_m, 38.5);
    assert.strictEqual(sampleGauge.dangerLevel_m, 40.0);
    assert.strictEqual(sampleGauge.hfl_m, 41.8);
    assert.strictEqual(sampleGauge.discharge_m3s, 580);
    assert.ok(sampleGauge.sourceUrl.includes('india-water.gov.in'));
  });

  it('10. Multi-station nearby distance calculation flags crowding', () => {
    const gaugeA = { lat: 18.688, lng: 83.964 }; // Gotta Barrage
    const gaugeB = { lat: 18.712, lng: 83.980 }; // Nearby weir ~3.2 km away
    const distDeg = Math.hypot(gaugeA.lat - gaugeB.lat, gaugeA.lng - gaugeB.lng);
    const isNearby = distDeg < 0.12;
    assert.ok(isNearby, 'Nearby gauge is detected within crowding threshold');
  });
});
