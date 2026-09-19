import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { registerThreeRenderers, threeCanvasRendererDefinition } from './renderer-definitions.js';

describe('three-canvas renderer definition (plan 465 Phase 2)', () => {
  it('registers into the registry under type "three-canvas"', () => {
    const registry = createRendererRegistry();
    expect(registry.get('three-canvas')).toBeUndefined();
    registerThreeRenderers(registry);
    expect(registry.get('three-canvas')).toBe(threeCanvasRendererDefinition);
  });

  it('registers idempotently', () => {
    const registry = createRendererRegistry();
    registerThreeRenderers(registry);
    registerThreeRenderers(registry);
    expect(registry.get('three-canvas')).toBe(threeCanvasRendererDefinition);
  });

  it('declares scene/bindings/animations/events as prop fields (D3: events object as single prop)', () => {
    const fields = threeCanvasRendererDefinition.fields ?? [];
    const kindOf = (key: string) => fields.find((f) => f.key === key)?.kind;
    expect(kindOf('scene')).toBe('prop');
    expect(kindOf('bindings')).toBe('prop');
    expect(kindOf('animations')).toBe('prop');
    expect(kindOf('events')).toBe('prop');
  });

  it('declares loading/empty as regions', () => {
    const fields = threeCanvasRendererDefinition.fields ?? [];
    const loading = fields.find((f) => f.key === 'loading');
    const empty = fields.find((f) => f.key === 'empty');
    expect(loading?.kind).toBe('region');
    expect(loading && 'regionKey' in loading && loading.regionKey).toBe('loading');
    expect(empty?.kind).toBe('region');
    expect(empty && 'regionKey' in empty && empty.regionKey).toBe('empty');
  });

  it('exposes propContracts for the four source-enabled props', () => {
    const contracts = threeCanvasRendererDefinition.propContracts ?? {};
    expect(Object.keys(contracts).sort()).toEqual(['animations', 'bindings', 'events', 'height', 'scene']);
    // plan 473: height joins as a plain string prop (editorType text); the
    // four structured props keep the source-enabled code editor
    for (const key of ['animations', 'bindings', 'events', 'scene']) {
      expect(contracts[key]?.editorType).toBe('code');
    }
    expect(contracts.height?.editorType).toBe('text');
    expect(contracts.height?.defaultValue).toBe('400px');
  });
});
