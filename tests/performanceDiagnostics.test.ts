import assert from 'node:assert';
import test from 'node:test';
import {
  performanceTracker,
  sanitizeEndpointUrl,
  ApiTelemetryEvent,
} from '../src/services/performanceTracker';
import '../src/services/simulationService';
import '../src/services/geospatialService';
import '../src/services/nationwideRoadService';

console.log('\n========================================================================');
console.log(' Bharat Village Twin — Performance & Telemetry Diagnostics Audit');
console.log('========================================================================\n');

test('1. Endpoint URL Sanitization & Credential Protection', () => {
  // Sensitive keys must be redacted
  const testUrl1 = 'https://api.open-meteo.com/v1/forecast?latitude=18.7&longitude=83.9&apikey=SECRET_KEY_12345';
  const res1 = sanitizeEndpointUrl(testUrl1);
  assert(!res1.sanitized.includes('SECRET_KEY_12345'), 'API key must be redacted');
  assert(res1.sanitized.includes('[REDACTED]'), 'Redaction placeholder must be present');
  assert.strictEqual(res1.type, 'external_provider');

  const testUrl2 = '/api/weather?lat=18.7&lng=83.9&token=BEARER_999';
  const res2 = sanitizeEndpointUrl(testUrl2);
  assert(!res2.sanitized.includes('BEARER_999'), 'Bearer token must be redacted');
  assert.strictEqual(res2.type, 'browser_to_backend');

  const testUrl3 = '/api/simulation/run';
  const res3 = sanitizeEndpointUrl(testUrl3);
  assert.strictEqual(res3.sanitized, '/api/simulation/run');
  assert.strictEqual(res3.type, 'browser_to_backend');
});

test('2. Cache Hit Ratio handles zero lookups (N/A) and real ratios accurately', () => {
  performanceTracker.resetCounters();

  // Initially 0 lookups -> must return null (N/A)
  assert.strictEqual(performanceTracker.getCacheHitRatio(), null, 'Cache hit ratio must be null when 0 lookups occur');

  // 1 hit, 1 miss -> 50%
  performanceTracker.recordCacheHit('test_cache');
  performanceTracker.recordCacheMiss('test_cache');
  assert.strictEqual(performanceTracker.getCacheHitRatio(), 50.0);

  // 2 hits, 1 miss -> 66.7%
  performanceTracker.recordCacheHit('test_cache');
  assert.strictEqual(performanceTracker.getCacheHitRatio(), 66.7);
});

test('3. Authoritative 15 Map Layer Diagnostic Registration & Inventory', () => {
  const snapshot = performanceTracker.getSnapshot();
  assert(snapshot.mapLayers.length >= 15, `Must register at least 15 layers (found: ${snapshot.mapLayers.length})`);

  const expectedLayers = [
    'floodExtent',
    'buildings',
    'roads',
    'drainageExisting',
    'drainageProposed',
    'retentionPonds',
    'waterBodies',
    'boundary',
    'impactZone',
    'earthquakes',
    'candidateSites',
    'cwcGauges',
    'flowPaths',
    'evacRoute',
    'imdCycloneWind',
  ];

  for (const layerId of expectedLayers) {
    const layer = snapshot.mapLayers.find((l) => l.id === layerId);
    assert(layer !== undefined, `Layer ${layerId} must be registered in diagnostics engine`);
    assert(layer.name.length > 0, `Layer ${layerId} must have human-readable name`);
    assert(layer.source.length > 0, `Layer ${layerId} must have an authoritative data source`);
  }
});

test('4. Layer Duration & Lifecycle Updates with Real Feature Counts', () => {
  performanceTracker.updateMapLayer({
    id: 'buildings',
    visible: true,
    status: 'rendered',
    featureCount: 142,
  });
  performanceTracker.recordLayerDuration('buildings', 24.5, 142);

  const snapshot = performanceTracker.getSnapshot();
  const bld = snapshot.mapLayers.find((l) => l.id === 'buildings');
  assert(bld !== undefined);
  assert.strictEqual(bld.status, 'rendered');
  assert.strictEqual(bld.featureCount, 142);
  assert.strictEqual(bld.renderDurationMs, 24.5);

  // Empty unmapped layer test
  performanceTracker.updateMapLayer({
    id: 'impactZone',
    visible: true,
    status: 'empty_unmapped',
    featureCount: 0,
    renderDurationMs: 0,
  });
  const updatedSnapshot = performanceTracker.getSnapshot();
  const iz = updatedSnapshot.mapLayers.find((l) => l.id === 'impactZone');
  assert(iz !== undefined);
  assert.strictEqual(iz.status, 'empty_unmapped');
  assert.strictEqual(iz.featureCount, 0);
});

test('5. Multi-Cache Provider Registration & Safe Flushing', () => {
  // Ensure caches are registered
  const snapshot = performanceTracker.getSnapshot();
  assert(snapshot.cacheBreakdown.length >= 3, 'Must have at least 3 registered cache providers');

  // Execute safe clear
  const clearResult = performanceTracker.clearAllApplicationCaches();
  assert(typeof clearResult.clearedProvidersCount === 'number');
  assert(typeof clearResult.clearedEntriesCount === 'number');

  const afterClear = performanceTracker.getSnapshot();
  assert.strictEqual(afterClear.totalCacheEntries, 0, 'Total cache entries must be 0 after clear');
});

test('6. API Telemetry Ring Buffer & Durations', () => {
  performanceTracker.clearMetrics();

  const mockEvent: ApiTelemetryEvent = {
    id: 'test-1',
    endpoint: '/api/weather/current?lat=18.7&lng=83.9',
    method: 'GET',
    status: 200,
    statusText: 'OK',
    durationMs: 85.4,
    startTime: Date.now() - 100,
    completedTime: Date.now(),
    type: 'browser_to_backend',
    success: true,
  };

  performanceTracker.recordApiEvent(mockEvent);

  const snapshot = performanceTracker.getSnapshot();
  assert.strictEqual(snapshot.recentApiEvents.length, 1);
  assert.strictEqual(snapshot.recentApiEvents[0].endpoint, '/api/weather/current?lat=18.7&lng=83.9');
  assert.strictEqual(snapshot.recentApiEvents[0].durationMs, 85.4);
});

test('7. Simulation Duration & Solver Recording', () => {
  performanceTracker.recordSimulationDuration(125.8, false, '2D Rational-Depression Solver');

  const snapshot = performanceTracker.getSnapshot();
  assert.strictEqual(snapshot.latestSimulationMs, 125.8);
  assert.strictEqual(snapshot.latestSimulationSolver, '2D Rational-Depression Solver');
});
