import { describe, expect, it } from 'vitest';
import { IOT_FENCES, buildFenceGeojson, haversineMeters } from '../shared/mock-backend-repl-iot-v3';

// D4 §3.3 V3 verification item (plan 819 P1 V3-1): the circular fence
// polygons are closed rings whose vertices stay within 5% of the radius.
describe('V3 fence geojson (toCircleGeojson approximation)', () => {
  const geojson = buildFenceGeojson();

  it('emits one closed polygon feature per fence, named by fenceName', () => {
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.map((f) => f.properties.name)).toEqual(IOT_FENCES.map((f) => f.fenceName));
    for (const feature of geojson.features) {
      const ring = feature.geometry.coordinates[0];
      expect(feature.geometry.type).toBe('Polygon');
      expect(ring.length).toBe(33);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });

  it('keeps every vertex within 5% of the fence radius from its centre', () => {
    geojson.features.forEach((feature, index) => {
      const fence = IOT_FENCES[index];
      for (const [lng, lat] of feature.geometry.coordinates[0]) {
        const distance = haversineMeters(fence.centerLat, fence.centerLng, lat, lng);
        expect(Math.abs(distance - fence.radiusMeters)).toBeLessThan(fence.radiusMeters * 0.05);
      }
    });
  });
});
