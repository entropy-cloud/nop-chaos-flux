import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEventHandler } from '@nop-chaos/flux-core';
import { createMockRendererProps } from './test-support.js';
import { createFakeOlApi, fakeMapInstances, FakeFeature } from './test-support/ol-fake.js';
import type { MapSchema } from './schemas.js';
import type { GeoJsonFeatureCollection } from './map-data.js';

const loadOlApiMock = vi.fn();

vi.mock('./map-ol-loader.js', () => ({
  loadOlApi: loadOlApiMock,
}));

const { MapRenderer } = await import('./map-renderer.js');

const REGION_GEOJSON: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: '北京市' }, geometry: { type: 'Polygon', coordinates: [] } },
    { type: 'Feature', properties: { name: '上海市' }, geometry: { type: 'Polygon', coordinates: [] } },
  ],
};

function lastMap() {
  return fakeMapInstances[fakeMapInstances.length - 1];
}

function dataLayerOf(map = lastMap()) {
  return map.layers[1] as {
    source: { features: FakeFeature[]; clear: () => void; addFeatures: (f: FakeFeature[]) => void };
    style: unknown;
    changedCount: number;
  };
}

function renderMap(
  props: Record<string, unknown> = {},
  events: Record<string, RendererEventHandler | undefined> = {},
  helpers: Record<string, unknown> = {},
) {
  const rendererProps = createMockRendererProps<MapSchema>({
    schema: { type: 'map' },
    props: { mapType: 'region', regionData: [{ name: '北京市', value: 10 }], ...props },
    events,
    meta: { cid: 42 },
    helpers,
  });
  const utils = render(<MapRenderer {...rendererProps} />);
  return { utils, rendererProps };
}

beforeEach(() => {
  loadOlApiMock.mockReset();
  loadOlApiMock.mockResolvedValue(createFakeOlApi());
  fakeMapInstances.length = 0;
});

afterEach(() => {
  cleanup();
});

describe('MapRenderer 挂载（mock OL）', () => {
  it('creates a Map with basemap Tile layer + region Vector(GeoJSON) layer and default china view', async () => {
    const { utils } = renderMap({ mapType: 'region', geojsonName: 'china-provinces' });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    expect(map.disposed).toBe(false);
    expect(map.view.center).toEqual([104, 35]);
    expect(map.view.zoom).toBe(4);
    expect(map.layers).toHaveLength(2);
    const dataLayer = dataLayerOf(map);
    expect(dataLayer.source.features).toHaveLength(1);
    expect(dataLayer.source.features[0].get('name')).toBe('北京市');
    expect(dataLayer.source.features[0].get('value')).toBe(10);
    expect(utils.container.querySelector('[data-slot="map"]')?.getAttribute('data-map-type')).toBe(
      'region',
    );
  });

  it('uses explicit center/zoom when provided (no auto-fit)', async () => {
    renderMap({ mapType: 'region', center: [120, 30], zoom: 6 });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    expect(map.view.center).toEqual([120, 30]);
    expect(map.view.zoom).toBe(6);
    expect(map.view.fitted).toHaveLength(0);
  });

  it('auto-fits the view to the region extent when no explicit center/zoom', async () => {
    renderMap({ mapType: 'region' });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    expect(lastMap().view.fitted.length).toBeGreaterThan(0);
  });

  it('assembles a cluster layer in pin mode (OL Cluster source)', async () => {
    renderMap({
      mapType: 'pin',
      pinData: [
        { name: 'a', lat: 39.9, lng: 116.4, value: 1 },
        { name: 'b', lat: 39.91, lng: 116.41, value: 2 },
      ],
    });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    expect(map.layers).toHaveLength(2);
    const dataLayer = map.layers[1] as { source: { innerSource?: { features: FakeFeature[] } } };
    expect(dataLayer.source).toHaveProperty('innerSource');
    const inner = (dataLayer.source as { innerSource: { features: FakeFeature[] } }).innerSource;
    expect(inner.features).toHaveLength(2);
    expect(inner.features[0].get('value')).toBe(1);
  });

  it('uses a plain vector source when cluster is disabled', async () => {
    renderMap({
      mapType: 'pin',
      cluster: false,
      pinData: [{ name: 'a', lat: 39.9, lng: 116.4 }],
    });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const dataLayer = lastMap().layers[1] as { source: { features: FakeFeature[] } };
    expect(dataLayer.source).not.toHaveProperty('innerSource');
    expect(dataLayer.source.features).toHaveLength(1);
  });

  it('creates a TileWMS basemap source for wms type and applies attribution', async () => {
    renderMap({
      basemap: { type: 'wms', url: 'https://example.test/wms', attribution: 'Test ©' },
    });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const basemap = lastMap().layers[0] as {
      source: { options: Record<string, unknown>; attributions: unknown[]; errorListeners: unknown[] };
    };
    expect(basemap.source.options.url).toBe('https://example.test/wms');
    expect(basemap.source.attributions).toEqual(['Test ©']);
  });
});

describe('MapRenderer 更新（无 remount，DD2 契约）', () => {
  it('updates the region layer features in place when regionData changes', async () => {
    const { rendererProps, utils } = renderMap({
      mapType: 'region',
      regionData: [{ name: '北京市', value: 10 }],
    });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    const before = dataLayerOf(map).source.features;

    rendererProps.props = {
      mapType: 'region',
      regionData: [
        { name: '北京市', value: 99 },
        { name: '上海市', value: 1 },
      ],
    };
    utils.rerender(<MapRenderer {...rendererProps} />);
    await waitFor(() => expect(dataLayerOf(map).source.features).not.toBe(before));
    expect(fakeMapInstances).toHaveLength(1);
    expect(map.disposed).toBe(false);
    const values = dataLayerOf(map).source.features.map((f) => f.get('value'));
    expect(values).toContain(99);
    expect(values).toContain(1);
  });

  it('replaces the style function when visualMap changes (same layer, no remount)', async () => {
    const { rendererProps, utils } = renderMap({
      mapType: 'region',
      regionData: [{ name: '北京市', value: 10 }],
    });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    const beforeStyle = dataLayerOf(map).style;

    rendererProps.props = {
      mapType: 'region',
      regionData: [{ name: '北京市', value: 10 }],
      visualMap: { min: 0, max: 100, colors: ['#000000', '#ffffff'] },
    };
    utils.rerender(<MapRenderer {...rendererProps} />);
    await waitFor(() => expect(dataLayerOf(map).style).not.toBe(beforeStyle));
    expect(fakeMapInstances).toHaveLength(1);
  });

  it('syncs the view when center/zoom props change', async () => {
    const { rendererProps, utils } = renderMap({ mapType: 'pin', pinData: [{ name: 'a', lat: 0, lng: 0 }], center: [0, 0], zoom: 2 });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();

    rendererProps.props = {
      mapType: 'pin',
      pinData: [{ name: 'a', lat: 0, lng: 0 }],
      center: [10, 20],
      zoom: 7,
    };
    utils.rerender(<MapRenderer {...rendererProps} />);
    await waitFor(() => expect(map.view.center).toEqual([10, 20]));
    expect(map.view.zoom).toBe(7);
  });

  it('switches mode region → pin on the same map instance', async () => {
    const { rendererProps, utils } = renderMap({
      mapType: 'region',
      regionData: [{ name: '北京市', value: 10 }],
    });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();

    rendererProps.props = {
      mapType: 'pin',
      pinData: [{ name: 'a', lat: 1, lng: 2 }],
    };
    utils.rerender(<MapRenderer {...rendererProps} />);
    await waitFor(() => {
      const dataLayer = map.layers[1] as { source: { innerSource?: { features: FakeFeature[] } } };
      expect(dataLayer.source).toHaveProperty('innerSource');
    });
    expect(fakeMapInstances).toHaveLength(1);
  });
});

describe('MapRenderer 卸载与生命周期', () => {
  it('disposes the map on unmount', async () => {
    renderMap({});
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    cleanup();
    expect(map.disposed).toBe(true);
  });
});

describe('MapRenderer 事件桥接', () => {
  it('dispatches onClick with the hit feature payload (region)', async () => {
    const onClick = vi.fn();
    renderMap({ mapType: 'region', regionData: [{ name: '北京市', value: 10 }] }, { onClick });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    map.__hitFeature = new FakeFeature({ name: '北京市', value: 10 });

    map.__emit('singleclick', { pixel: [10, 10] });
    expect(onClick).toHaveBeenCalledTimes(1);
    const [payload, ctx] = onClick.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(payload).toMatchObject({
      type: 'map:feature-click',
      mapType: 'region',
      name: '北京市',
      value: 10,
    });
    expect(ctx.scope).toBeDefined();
  });

  it('does not dispatch when clicking an empty area (map-click-no-feature)', async () => {
    const onClick = vi.fn();
    renderMap({ mapType: 'region', regionData: [{ name: '北京市', value: 10 }] }, { onClick });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    lastMap().__emit('singleclick', { pixel: [10, 10] });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('zooms in on multi-member cluster clicks without dispatching', async () => {
    const onClick = vi.fn();
    renderMap(
      {
        mapType: 'pin',
        pinData: [
          { name: 'a', lat: 0, lng: 0 },
          { name: 'b', lat: 0.01, lng: 0.01 },
        ],
      },
      { onClick },
    );
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    map.__hitFeature = new FakeFeature({
      cluster: true,
      features: [new FakeFeature({ name: 'a', value: 1 }), new FakeFeature({ name: 'b', value: 2 })],
    });
    const before = map.view.zoom ?? 4;

    map.__emit('singleclick', { pixel: [10, 10] });
    expect(onClick).not.toHaveBeenCalled();
    expect(map.view.zoom).toBe(before + 1);
  });

  it('dispatches the single member payload when clicking a one-member cluster', async () => {
    const onClick = vi.fn();
    renderMap(
      { mapType: 'pin', pinData: [{ name: 'solo', lat: 0, lng: 0, value: 7 }] },
      { onClick },
    );
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    map.__hitFeature = new FakeFeature({
      cluster: true,
      features: [new FakeFeature({ name: 'solo', value: 7 })],
    });

    map.__emit('singleclick', { pixel: [10, 10] });
    expect(onClick).toHaveBeenCalledTimes(1);
    const payload = onClick.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ mapType: 'pin', name: 'solo', value: 7 });
  });

  it('highlights the hovered feature (pointermove → setHighlight → layer.changed)', async () => {
    renderMap({ mapType: 'region', regionData: [{ name: '北京市', value: 10 }] });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = lastMap();
    map.__hitFeature = new FakeFeature({ name: '北京市', value: 10 });
    map.__emit('pointermove', { pixel: [10, 10] });
    expect(dataLayerOf(map).changedCount).toBeGreaterThan(0);
  });

  it('re-applies theme on document class change (MutationObserver → setTheme → layer.changed)', async () => {
    renderMap({ mapType: 'region', regionData: [{ name: '北京市', value: 10 }] });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const layer = dataLayerOf();
    const before = layer.changedCount;

    document.documentElement.classList.add('dark');
    await waitFor(() => expect(layer.changedCount).toBeGreaterThan(before));
    document.documentElement.classList.remove('dark');
  });
});

describe('MapRenderer 空态 / loading / 降级', () => {
  it('renders the empty slot and creates no map for empty regionData (map-empty-data)', async () => {
    const { utils } = renderMap({ mapType: 'region', regionData: [] });
    await waitFor(() => expect(fakeMapInstances).toHaveLength(0));
    expect(utils.container.querySelector('[data-slot="map-empty"]')).toBeTruthy();
    expect(utils.container.querySelector('[data-slot="map"]')?.getAttribute('data-state')).toBe('empty');
  });

  it('renders the empty slot for pin mode without pinData', async () => {
    const { utils } = renderMap({ mapType: 'pin', pinData: [] });
    await waitFor(() => expect(fakeMapInstances).toHaveLength(0));
    expect(utils.container.querySelector('[data-slot="map-empty"]')).toBeTruthy();
  });

  it('renders empty when regionData matches no geojson feature (dev warn)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { utils } = renderMap({ mapType: 'region', regionData: [{ name: '不存在省', value: 1 }] });
    await waitFor(() => expect(fakeMapInstances).toHaveLength(0));
    expect(utils.container.querySelector('[data-slot="map-empty"]')).toBeTruthy();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('without matching geojson feature'),
      expect.any(Array),
    );
    warnSpy.mockRestore();
  });

  it('renders the loading slot when external loading is set', async () => {
    const { utils } = renderMap({ mapType: 'region', regionData: [{ name: '北京市', value: 1 }], loading: true });
    await waitFor(() => expect(fakeMapInstances).toHaveLength(0));
    expect(utils.container.querySelector('[data-slot="map-loading"]')).toBeTruthy();
    expect(utils.container.querySelector('[data-slot="map"]')?.getAttribute('data-state')).toBe('loading');
  });

  it('renders an error slot when OL module loading fails (map-ol-import-fail)', async () => {
    loadOlApiMock.mockRejectedValue(new Error('ol import exploded'));
    const { utils } = renderMap({});
    await waitFor(() => expect(utils.container.querySelector('[data-slot="map-error"]')).toBeTruthy());
    expect(utils.container.textContent).toContain('ol import exploded');
    expect(fakeMapInstances).toHaveLength(0);
  });
});

describe('MapRenderer geojsonSource action 加载', () => {
  const geojsonAction = { action: 'ajax', api: '/boundaries' };
  const dispatchMock = vi.fn();
  const scope = { id: 'mock-scope', path: 'mock.path', value: {} };

  beforeEach(() => {
    dispatchMock.mockReset();
    dispatchMock.mockResolvedValue({ ok: true, data: REGION_GEOJSON });
  });

  it('dispatches the action on mount and renders the region layer from the result', async () => {
    const { utils } = renderMap(
      { mapType: 'region', regionData: [{ name: '北京市', value: 5 }], geojsonSource: geojsonAction },
      {},
      { dispatch: dispatchMock, createScope: vi.fn(), disposeScope: vi.fn() },
    );
    await waitFor(() => expect(dispatchMock).toHaveBeenCalledWith(geojsonAction, { scope }));
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    expect(dataLayerOf().source.features.map((f) => f.get('name'))).toEqual(['北京市']);
    expect(utils.container.querySelector('[data-slot="map"]')).toBeTruthy();
  });

  it('shows loading while the geojson action is in flight, then the map', async () => {
    let resolveDispatch: (value: { ok: boolean; data?: unknown }) => void = () => undefined;
    dispatchMock.mockImplementation(
      () => new Promise((resolve) => { resolveDispatch = resolve as never; }),
    );
    const { utils } = renderMap(
      { mapType: 'region', regionData: [{ name: '北京市', value: 5 }], geojsonSource: geojsonAction },
      {},
      { dispatch: dispatchMock },
    );
    await waitFor(() => expect(utils.container.querySelector('[data-slot="map-loading"]')).toBeTruthy());
    resolveDispatch({ ok: true, data: REGION_GEOJSON });
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
  });

  it('degrades to the error slot with retry when the action result is not a FeatureCollection (map-geojson-invalid)', async () => {
    dispatchMock.mockResolvedValue({ ok: true, data: { type: 'Feature' } });
    const { utils } = renderMap(
      { mapType: 'region', regionData: [{ name: '北京市', value: 5 }], geojsonSource: geojsonAction },
      {},
      { dispatch: dispatchMock },
    );
    await waitFor(() => expect(utils.container.querySelector('[data-slot="map-error"]')).toBeTruthy());
    expect(fakeMapInstances).toHaveLength(0);

    dispatchMock.mockResolvedValue({ ok: true, data: REGION_GEOJSON });
    const retry = utils.container.querySelector('button');
    expect(retry).toBeTruthy();
    retry!.click();
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
  });

  it('degrades to the error slot when the action fails (childrenSource error 态对齐)', async () => {
    dispatchMock.mockResolvedValue({ ok: false, error: 'boom' });
    const { utils } = renderMap(
      { mapType: 'region', regionData: [{ name: '北京市', value: 5 }], geojsonSource: geojsonAction },
      {},
      { dispatch: dispatchMock },
    );
    await waitFor(() => expect(utils.container.querySelector('[data-slot="map-error"]')).toBeTruthy());
    expect(utils.container.textContent).toContain('boom');
  });

  it('reuses the cached result without re-dispatching on re-render', async () => {
    const { rendererProps, utils } = renderMap(
      { mapType: 'region', regionData: [{ name: '北京市', value: 5 }], geojsonSource: geojsonAction },
      {},
      { dispatch: dispatchMock },
    );
    await waitFor(() => expect(dispatchMock).toHaveBeenCalledTimes(1));

    rendererProps.props = {
      mapType: 'region',
      regionData: [{ name: '北京市', value: 6 }],
      geojsonSource: geojsonAction,
    };
    utils.rerender(<MapRenderer {...rendererProps} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });
});
