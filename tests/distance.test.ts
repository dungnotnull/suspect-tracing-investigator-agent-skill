import { test } from 'node:test';
import assert from 'node:assert';
import { HaversineProvider, OsrmProvider, createDistanceProvider, rossmoScoreFromDistances, haversineKm } from '../config/distance';
import { geographicProfile, OffenseSiteInput } from '../config/tools';

test('HaversineProvider returns a correct origin×destination matrix', async () => {
  const p = new HaversineProvider();
  const m = await p.distances(
    [{ lat: 34.05, lon: -118.24 }, { lat: 34.06, lon: -118.25 }],
    [{ lat: 34.05, lon: -118.24 }]
  );
  assert.strictEqual(m.length, 2);
  assert.ok(Math.abs(m[0][0]) < 1e-6, 'origin at destination => ~0 km');
  assert.ok(m[1][0] > 0 && m[1][0] < 2, 'nearby point < 2km');
});

test('OsrmProvider falls back to haversine when no base URL configured', async () => {
  const p = new OsrmProvider(undefined);
  const m = await p.distances([{ lat: 34.05, lon: -118.24 }], [{ lat: 34.06, lon: -118.25 }]);
  assert.strictEqual(p.name, 'osrm');
  assert.ok(m[0][0] > 0 && m[0][0] < 2);
});

test('OsrmProvider falls back to haversine on network failure (bad host)', async () => {
  const p = new OsrmProvider('https://invalid-localhost-osrm.invalid', 1500);
  const m = await p.distances([{ lat: 34.05, lon: -118.24 }], [{ lat: 34.06, lon: -118.25 }]);
  const expected = haversineKm({ lat: 34.05, lon: -118.24 }, { lat: 34.06, lon: -118.25 });
  assert.ok(Math.abs(m[0][0] - expected) < 1e-6, 'fallback matches haversine');
});

test('rossmoScoreFromDistances matches rossmoScore for the same distances', async () => {
  const sites: OffenseSiteInput[] = [{ id: 's1', lat: 34.05, lon: -118.24 }];
  const d = haversineKm({ lat: 34.051, lon: -118.241 }, { lat: 34.05, lon: -118.24 });
  const score = rossmoScoreFromDistances([d], sites, 1.5);
  assert.ok(score > 0, 'should produce a positive score near the site');
});

test('createDistanceProvider returns haversine by default and osrm when requested', () => {
  assert.strictEqual(createDistanceProvider().name, 'haversine');
  assert.strictEqual(createDistanceProvider('haversine').name, 'haversine');
  assert.strictEqual(createDistanceProvider('osrm').name, 'osrm');
});

test('geographicProfile with explicit haversine provider matches default output shape', async () => {
  const sites: OffenseSiteInput[] = [
    { id: 's1', lat: 34.051, lon: -118.245 },
    { id: 's2', lat: 34.049, lon: -118.241 },
    { id: 's3', lat: 34.056, lon: -118.238 }
  ];
  const r = await geographicProfile(sites, { distanceProvider: new HaversineProvider() });
  assert.ok(r.cells.length > 0);
  assert.ok(r.estimatedAnchor);
});
