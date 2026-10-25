import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeOverallStatus } from '../src/components/dashboard/SimpleTopNavbar';
import { deriveSimpleHazardStatus } from '../src/components/hazard/SimpleHazardSelector';
import type { HazardAssessment } from '../src/types/hazard';

console.log('\n=============================================================');
console.log(' Bharat Village Twin: Simple User-Friendly Dashboard Test Suite');
console.log(' Verification of Status Banner, Hazard Cards, Weather & River');
console.log('=============================================================\n');

describe('Simple User-Friendly Dashboard Tests', () => {

  it('1. Overall Status computes "Cyclone warning" when active cyclone intersects', () => {
    const status = computeOverallStatus({
      cycloneWindIntersects: true,
      imdCycloneStage: 'cyclonic_storm',
      imdWarningColor: 'orange',
      gaugeStatus: 'normal',
      isGovFeedsAvailable: true,
    });
    assert.strictEqual(status.type, 'cyclone_warning');
    assert.strictEqual(status.label, 'Cyclone warning');
    console.log('  ✓ 1. Cyclone warning prioritized when location is within wind radii');
  });

  it('2. Overall Status computes "Weather warning" when IMD issued orange/red alert', () => {
    const status = computeOverallStatus({
      cycloneWindIntersects: false,
      imdCycloneStage: 'none',
      imdWarningColor: 'orange',
      gaugeStatus: 'normal',
      isGovFeedsAvailable: true,
    });
    assert.strictEqual(status.type, 'weather_warning');
    assert.strictEqual(status.label, 'Weather warning');
    console.log('  ✓ 2. Weather warning prioritized when IMD alert is active');
  });

  it('3. Overall Status computes "Flood risk" when river gauge exceeds warning level', () => {
    const status = computeOverallStatus({
      cycloneWindIntersects: false,
      imdCycloneStage: 'none',
      imdWarningColor: 'green',
      gaugeStatus: 'warning',
      isGovFeedsAvailable: true,
    });
    assert.strictEqual(status.type, 'flood_risk');
    assert.strictEqual(status.label, 'Flood risk');
    console.log('  ✓ 3. Flood risk computed when CWC water level is at/above warning');
  });

  it('4. Overall Status computes "All clear in available alerts" when no alerts active', () => {
    const status = computeOverallStatus({
      cycloneWindIntersects: false,
      imdCycloneStage: 'none',
      imdWarningColor: 'green',
      gaugeStatus: 'normal',
      isGovFeedsAvailable: true,
    });
    assert.strictEqual(status.type, 'all_clear');
    assert.strictEqual(status.label, 'All clear in available alerts');
    console.log('  ✓ 4. All clear displayed honestly when monitors report normal');
  });

  it('5. Overall Status computes "Data unavailable" when feeds are disconnected', () => {
    const status = computeOverallStatus({
      cycloneWindIntersects: false,
      imdCycloneStage: 'none',
      imdWarningColor: 'green',
      gaugeStatus: 'normal',
      isGovFeedsAvailable: false,
    });
    assert.strictEqual(status.type, 'data_unavailable');
    assert.strictEqual(status.label, 'Data unavailable');
    console.log('  ✓ 5. Data unavailable displayed when government feeds are offline');
  });

  it('6. Separates baseline atlas susceptibility from active warning in hazard card', () => {
    const mockBaselineAssessment: Partial<HazardAssessment> = {
      isGeographicallyApplicable: true,
      riskLevel: 'very_high',
      baselineSusceptibility: {
        level: 'very_high',
        score: 85,
        rationale: 'Long-term historical floodplain exposure',
        zoneClassification: 'Floodplain',
        authoritativeStandard: 'NDMA Atlas',
      },
      officialWarning: {
        alertStage: 'no_warning',
        warningColor: 'green',
        warningTitle: 'No warning in effect',
        agency: 'CWC',
        issuedAt: '2026-10-24T00:00:00Z',
        validUntil: '2026-10-25T00:00:00Z',
        geographicCoverage: 'Krishna Delta',
        advisoryText: 'Normal condition',
        officialInstructions: [],
      },
      activeThreat: {
        level: 'low',
        score: 10,
        threatLabel: 'Normal conditions',
        summary: 'No active threat',
      },
    };

    const result = deriveSimpleHazardStatus(mockBaselineAssessment as HazardAssessment);
    // Must NOT be active_warning!
    assert.notStrictEqual(result.status, 'active_warning');
    assert.strictEqual(result.status, 'historical_risk');
    assert.strictEqual(result.statusLabel, 'Historical risk');
    assert(result.explanation.includes('Long-term atlas susceptibility'));
    console.log('  ✓ 6. Baseline atlas score classified as "Historical risk", NOT active warning');
  });

  it('7. Flags active warning when government agency issued an alert', () => {
    const mockWarningAssessment: Partial<HazardAssessment> = {
      isGeographicallyApplicable: true,
      riskLevel: 'high',
      baselineSusceptibility: {
        level: 'moderate',
        score: 50,
        rationale: 'Moderate baseline',
        zoneClassification: 'Moderate Rain Zone',
        authoritativeStandard: 'IMD Atlas',
      },
      officialWarning: {
        alertStage: 'warning',
        warningColor: 'red',
        warningTitle: 'IMD Red Warning: Heavy Inundation Predicted',
        agency: 'IMD',
        issuedAt: '2026-10-24T08:00:00Z',
        validUntil: '2026-10-24T20:00:00Z',
        geographicCoverage: 'Srikakulam',
        advisoryText: 'Move to safe shelter',
        officialInstructions: [],
      },
    };

    const result = deriveSimpleHazardStatus(mockWarningAssessment as HazardAssessment);
    assert.strictEqual(result.status, 'active_warning');
    assert.strictEqual(result.statusLabel, 'Active warning');
    console.log('  ✓ 7. Active warning properly triggers "Active warning" status');
  });

  it('8. Physically inapplicable hazards return "Not applicable"', () => {
    const mockInapplicableAssessment: Partial<HazardAssessment> = {
      isGeographicallyApplicable: false,
      applicabilityRationale: 'Flat alluvial delta terrain; landslide physically inapplicable.',
    };

    const result = deriveSimpleHazardStatus(mockInapplicableAssessment as HazardAssessment);
    assert.strictEqual(result.status, 'not_applicable');
    assert.strictEqual(result.statusLabel, 'Not applicable');
    assert(result.explanation.includes('Flat alluvial delta'));
    console.log('  ✓ 8. Inapplicable hazards clearly report "Not applicable" with scientific rationale');
  });

});

