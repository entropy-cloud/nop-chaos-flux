import { readFileSync } from 'node:fs';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEventHandler } from '@nop-chaos/flux-core';
import { createMockRendererProps } from './test-support.js';
import {
  createFakeOlApi,
  fakeMapInstances,
  FakeFeature,
  FakeMap,
} from './test-support/ol-fake.js';
import { createMapLayerManager } from './map-layer-manager.js';
import type { MapColorScale } from './map-color.js';
import type { MapSchema } from './schemas.js';

const loadOlApiMock = vi.fn();

vi.mock('./map-ol-loader.js', () => ({
  loadOlApi: loadOlApiMock,
}));

const { MapRenderer } = await import('./map-renderer.js');

beforeEach(() => {
  loadOlApiMock.mockReset();
  loadOlApiMock.mockResolvedValue(createFakeOlApi());
  fakeMapInstances.length = 0;
});

afterEach(() => {
  cleanup();
});

const THEME = { border: '#d0d7de', background: '#ffffff', text: '#1f2328', accent: '#0969da' };
const scale: MapColorScale = { color: () => '#aaa' } as unknown as MapColorScale;

function styleOptions(styleFn: (feature: unknown) => { options: Record<string, unknown> }, feature: unknown) {
  const style = styleFn(feature);
  const image = style.options.image as { options: Record<string, unknown> };
  const stroke = image.options.stroke as { options: { color: string; width: number } };
  return { image, stroke };
}

/**
 * Plan 488 Phase 3 wave A — map package items:
 * - [G5-视角9-01] interactive viewport gets role="application" + accessible name.
 * - [G5-R5-视角3-01] pin/cluster styles paint the highlight (hover parity with
 *   regions) — the pointermove wiring already existed, the styles ignored it.
 * - [G5-R2-视角5-02] map-error renders the destructive semantic color.
 */
describe('[G5-视角9-01] map viewport accessibility', () => {
  it('exposes role=application and an accessible name on the viewport', async () => {
    const rendererProps = createMockRendererProps<MapSchema>({
      schema: { type: 'map' },
      props: {
        mapType: 'region',
        regionData: [{ name: '北京市', value: 10 }],
        geojsonName: 'china-provinces',
        label: '销售分布图',
      },
      events: {} as Record<string, RendererEventHandler | undefined>,
    });
    render(<MapRenderer {...rendererProps} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));

    const viewport = document.querySelector('[data-slot="map-viewport"]') as HTMLElement;
    expect(viewport).toBeTruthy();
    expect(viewport.getAttribute('role')).toBe('application');
    expect(viewport.getAttribute('aria-label')).toBe('销售分布图');
  });

  it('falls back to the renderer id, then the generic i18n label', async () => {
    const rendererProps = createMockRendererProps<MapSchema>({
      schema: { type: 'map' },
      props: {
        mapType: 'region',
        regionData: [{ name: '北京市', value: 10 }],
        geojsonName: 'china-provinces',
      },
      events: {},
    });
    render(<MapRenderer {...rendererProps} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const viewport = document.querySelector('[data-slot="map-viewport"]') as HTMLElement;
    const label = viewport.getAttribute('aria-label') ?? '';
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('[G5-R5-视角3-01] pin/cluster highlight styles', () => {
  it('pin style paints the highlighted feature (accent stroke + larger radius)', () => {
    const api = createFakeOlApi();
    const map = new api.Map({ target: undefined }) as unknown as FakeMap;
    const manager = createMapLayerManager({ api, map: map as never, theme: THEME });
    manager.setPinLayer(
      {
        features: [{ lng: 116, lat: 39, name: '北京', value: 10 }],
        dataRange: { min: 0, max: 100 },
        skipped: 0,
      } as never,
      false,
      scale,
    );
    const layer = map.layers[0] as { style: (feature: unknown) => { options: Record<string, unknown> } };
    const feature = new FakeFeature({ name: '北京', value: 10 });

    const normal = styleOptions(layer.style, feature);
    expect(normal.image.options.radius).toBe(6);
    expect(normal.stroke.options.color).toBe(THEME.background);

    manager.setHighlight(feature as never);
    const highlighted = styleOptions(layer.style, feature);
    expect(highlighted.image.options.radius).toBe(8);
    expect(highlighted.stroke.options.color).toBe(THEME.accent);
    expect(highlighted.stroke.options.width).toBeGreaterThan(2);
  });

  it('cluster (multi-member) style also responds to the highlight', () => {
    const api = createFakeOlApi();
    const map = new api.Map({ target: undefined }) as unknown as FakeMap;
    const manager = createMapLayerManager({ api, map: map as never, theme: THEME });
    manager.setPinLayer(
      {
        features: [
          { lng: 116, lat: 39, name: 'a' },
          { lng: 116.5, lat: 39.2, name: 'b' },
        ],
        dataRange: { min: 0, max: 100 },
        skipped: 0,
      } as never,
      true,
      scale,
    );
    const layer = map.layers[0] as { style: (feature: unknown) => { options: Record<string, unknown> } };

    // a synthetic multi-member cluster feature
    const memberA = new FakeFeature({ name: 'a' });
    const memberB = new FakeFeature({ name: 'b' });
    const cluster = new FakeFeature({});
    cluster.set('features', [memberA, memberB]);

    const normal = styleOptions(layer.style, cluster);
    expect(normal.stroke.options.color).toBe(THEME.border);

    manager.setHighlight(cluster as never);
    const highlighted = styleOptions(layer.style, cluster);
    expect(highlighted.stroke.options.color).toBe(THEME.accent);
  });

  it('region style keeps its highlight branch (no regression)', () => {
    const api = createFakeOlApi();
    const map = new api.Map({ target: undefined }) as unknown as FakeMap;
    const manager = createMapLayerManager({ api, map: map as never, theme: THEME });
    manager.setRegionLayer({ featureCollection: { type: 'FeatureCollection', features: [] } } as never, scale);
    const layer = map.layers[0] as { style: (feature: unknown) => { options: Record<string, unknown> } };
    const feature = new FakeFeature({ name: '北京市', value: 10 });
    // region style carries fill/stroke at the TOP level (no image).
    const normalStroke = layer.style(feature).options.stroke as { options: { color: string } };
    expect(normalStroke.options.color).toBe(THEME.border);
    manager.setHighlight(feature as never);
    const highlightedStroke = layer.style(feature).options.stroke as { options: { color: string } };
    expect(highlightedStroke.options.color).toBe(THEME.accent);
  });
});

describe('[G5-R2-视角5-02] map error destructive semantic', () => {
  it('styles.css overrides the neutral state color with destructive for map-error', () => {
    const css = readFileSync('src/styles.css', 'utf-8');
    const errorRule = css.match(/\.nop-map \[data-slot='map-error'\]\s*\{[^}]*\}/g);
    expect(errorRule).toBeTruthy();
    // the LAST (override) rule must carry the destructive color token
    const override = errorRule![errorRule!.length - 1];
    expect(override).toContain('var(--destructive');
  });
});
