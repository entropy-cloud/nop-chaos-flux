import { describe, expect, it } from 'vitest';
import {
  buildFeatureClickPayload,
  buildPinFeatures,
  buildRegionFeatures,
  sanitizeGeojsonActionResult,
} from './map-data.js';
import type { MapPinDatum, MapRegionDatum } from './schemas.js';
import type { GeoJsonFeatureCollection } from './map-data.js';

function makeGeojson(names: string[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: names.map((name) => ({
      type: 'Feature',
      properties: { name },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    })),
  };
}

describe('sanitizeGeojsonActionResult', () => {
  it('accepts a well-formed FeatureCollection', () => {
    const result = sanitizeGeojsonActionResult(makeGeojson(['北京']));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.geojson.type).toBe('FeatureCollection');
      expect(result.geojson.features).toHaveLength(1);
    }
  });

  it('rejects non-object payloads', () => {
    for (const payload of [undefined, null, 42, 'geojson', [], true]) {
      const result = sanitizeGeojsonActionResult(payload);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects FeatureCollections without a features array', () => {
    expect(sanitizeGeojsonActionResult({ type: 'FeatureCollection' }).ok).toBe(false);
    expect(sanitizeGeojsonActionResult({ type: 'FeatureCollection', features: {} }).ok).toBe(false);
    expect(sanitizeGeojsonActionResult({ type: 'FeatureCollection', features: 'nope' }).ok).toBe(false);
  });

  it('rejects non-FeatureCollection objects', () => {
    expect(sanitizeGeojsonActionResult({ type: 'Feature', properties: {} }).ok).toBe(false);
    expect(sanitizeGeojsonActionResult({ type: 'GeometryCollection' }).ok).toBe(false);
  });

  it('rejects features entries that are not objects', () => {
    const bad = makeGeojson(['北京']);
    (bad.features as unknown[]).push('nope');
    expect(sanitizeGeojsonActionResult(bad).ok).toBe(false);
  });
});

describe('buildRegionFeatures', () => {
  it('maps regionData values onto matching geojson features by properties.name', () => {
    const geojson = makeGeojson(['北京市', '上海市', '广东省']);
    const regionData: MapRegionDatum[] = [
      { name: '北京市', value: 120 },
      { name: '广东省', value: 80 },
    ];
    const build = buildRegionFeatures(regionData, geojson);
    expect(build.featureCollection.features).toHaveLength(2);
    expect(build.featureCollection.features[0].properties.name).toBe('北京市');
    expect(build.featureCollection.features[0].properties.value).toBe(120);
    expect(build.featureCollection.features[1].properties.value).toBe(80);
    expect(build.skipped).toEqual([]);
    expect(build.dataRange).toEqual({ min: 80, max: 120 });
  });

  it('keeps entries without a value (default color path) and excludes them from dataRange', () => {
    const geojson = makeGeojson(['北京市', '上海市']);
    const regionData: MapRegionDatum[] = [
      { name: '北京市', value: 10 },
      { name: '上海市' },
    ];
    const build = buildRegionFeatures(regionData, geojson);
    expect(build.featureCollection.features).toHaveLength(2);
    expect(build.dataRange).toEqual({ min: 10, max: 10 });
  });

  it('drops regionData names without a matching feature and reports them as skipped', () => {
    const geojson = makeGeojson(['北京市']);
    const regionData: MapRegionDatum[] = [
      { name: '北京市', value: 1 },
      { name: '不存在省', value: 99 },
    ];
    const build = buildRegionFeatures(regionData, geojson);
    expect(build.featureCollection.features).toHaveLength(1);
    expect(build.skipped).toEqual(['不存在省']);
  });

  it('returns an empty collection for empty regionData', () => {
    const geojson = makeGeojson(['北京市']);
    const build = buildRegionFeatures([], geojson);
    expect(build.featureCollection.features).toHaveLength(0);
    expect(build.dataRange).toBeNull();
  });
});

describe('buildPinFeatures', () => {
  it('passes valid pins through with normalized name/value', () => {
    const pinData: MapPinDatum[] = [
      { name: '北京店', lat: 39.9, lng: 116.4, value: 5 },
      { name: '上海店', lat: 31.2, lng: 121.5 },
    ];
    const build = buildPinFeatures(pinData);
    expect(build.features).toHaveLength(2);
    expect(build.features[0]).toEqual({ name: '北京店', value: 5, lat: 39.9, lng: 116.4 });
    expect(build.features[1]).toEqual({ name: '上海店', value: undefined, lat: 31.2, lng: 121.5 });
    expect(build.skipped).toBe(0);
    expect(build.dataRange).toEqual({ min: 5, max: 5 });
  });

  it('drops pins with out-of-range or non-finite coordinates', () => {
    const pinData: MapPinDatum[] = [
      { name: 'ok', lat: 0, lng: 0 },
      { name: 'lat-too-high', lat: 91, lng: 0 },
      { name: 'lat-too-low', lat: -91, lng: 0 },
      { name: 'lng-too-high', lat: 0, lng: 181 },
      { name: 'lng-too-low', lat: 0, lng: -181 },
      { name: 'nan', lat: Number.NaN, lng: 0 },
      { name: 'infinity', lat: 0, lng: Number.POSITIVE_INFINITY },
      { name: 'missing', lat: undefined as never, lng: 0 },
    ];
    const build = buildPinFeatures(pinData);
    expect(build.features).toHaveLength(1);
    expect(build.skipped).toBe(7);
  });

  it('excludes non-finite values from the data range', () => {
    const pinData: MapPinDatum[] = [
      { name: 'a', lat: 0, lng: 0, value: 3 },
      { name: 'b', lat: 1, lng: 1, value: Number.NaN },
    ];
    const build = buildPinFeatures(pinData);
    expect(build.dataRange).toEqual({ min: 3, max: 3 });
  });
});

describe('buildFeatureClickPayload', () => {
  it('resolves name/value/feature from feature properties', () => {
    const payload = buildFeatureClickPayload(
      { type: 'Feature', properties: { name: '北京市', value: 12 } },
      'region',
    );
    expect(payload).toEqual({
      type: 'map:feature-click',
      mapType: 'region',
      name: '北京市',
      value: 12,
      feature: { name: '北京市', value: 12 },
    });
  });

  it('falls back to NAME property and feature id when name is absent', () => {
    const payload = buildFeatureClickPayload(
      { type: 'Feature', id: 'CN-BJ', properties: { NAME: 'Beijing', value: 1 } },
      'region',
    );
    expect(payload.name).toBe('Beijing');
  });

  it('keeps mapType pin and tolerates missing properties', () => {
    const payload = buildFeatureClickPayload({ type: 'Feature', properties: {} }, 'pin');
    expect(payload.mapType).toBe('pin');
    expect(payload.name).toBeUndefined();
    expect(payload.value).toBeUndefined();
  });
});
