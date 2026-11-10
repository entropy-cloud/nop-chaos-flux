import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ActionSchema, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import { useMapGeojson } from './use-map-geojson.js';

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

function geojson(name: string) {
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { region: name }, geometry: null }] };
}

// Plan 862 L4: a slow earlier geojson response must not overwrite the state of
// a later (current) key — latest-key guard before the write-back.
describe('useMapGeojson latest-key guard (plan 862 L4)', () => {
  it('A slow, B fast: final geojson stays B', async () => {
    let resolveA: (v: unknown) => void = () => {};
    const dispatch = vi.fn((action: ActionSchema) => {
      const serialized = JSON.stringify(action);
      if (serialized.includes('"slow"')) {
        return new Promise((resolve) => {
          resolveA = resolve;
        });
      }
      return Promise.resolve({ ok: true, data: geojson('B') });
    });
    const helpers = { dispatch, createScope: vi.fn(), disposeScope: vi.fn() } as unknown as RendererHelpers;
    const scope = { id: 'scope-1' } as ScopeRef;

    const { result, rerender } = renderHook(
      (props: { sourceKey: string }) => {
        const source = React.useMemo<ActionSchema>(
          () => ({ actionType: 'fetch', options: { region: props.sourceKey } }) as unknown as ActionSchema,
          [props.sourceKey],
        );
        return useMapGeojson({ geojsonSource: source, helpers, scope });
      },
      { initialProps: { sourceKey: 'slow' } },
    );

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalled();
    });
    rerender({ sourceKey: 'fast' });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(result.current.geojson?.features[0]?.properties.region).toBe('B');
    });

    resolveA({ ok: true, data: geojson('A') });
    await new Promise((r) => setTimeout(r, 20));

    expect(result.current.geojson?.features[0]?.properties.region).toBe('B');
  });
});
