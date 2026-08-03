import { describe, it, expect, vi } from 'vitest';
import { createRendererRegistry, registerRendererDefinitions } from '@nop-chaos/flux-core';
import { industrialRendererDefinitions } from './renderer-definitions.js';
import { registerScadaRenderers } from './index.js';
import { ScadaCanvasRenderer } from './renderer/scada-canvas.js';

// index.ts 引入链含 registerBuiltinScadaSymbols → base-shapes → leafer-ui；
// happy-dom 无 canvas 上下文，mock leafer-ui 类保证包入口在纯 JS 环境可加载。
vi.mock('leafer-ui', () => import('./test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

describe('industrialRendererDefinitions', () => {
  it('should export an array of RendererDefinition', () => {
    expect(Array.isArray(industrialRendererDefinitions)).toBe(true);
  });

  it('should contain exactly 1 definition (scada-canvas)', () => {
    expect(industrialRendererDefinitions).toHaveLength(1);
  });

  it('scada-canvas definition should have required fields', () => {
    const def = industrialRendererDefinitions[0];
    expect(def.type).toBe('scada-canvas');
    expect(def.displayName).toEqual(expect.any(String));
    expect(def.category).toEqual(expect.any(String));
    expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-industrial');
    expect(def.defaultSchema).toEqual({ type: 'scada-canvas' });
    expect(def.component).toBeTypeOf('function');
  });

  it('scada-canvas should register the real renderer component (placeholder retired, I10.1)', () => {
    expect(industrialRendererDefinitions[0].component).toBe(ScadaCanvasRenderer);
  });

  it('scada-canvas fields should be fully registered per design-renderer.md §5 (I10.2)', () => {
    const fields = industrialRendererDefinitions[0].fields ?? [];
    const byKey = new Map(fields.map((field) => [field.key, field]));

    expect(byKey.get('config')).toMatchObject({ key: 'config', kind: 'prop' });
    expect(byKey.get('width')).toMatchObject({ key: 'width', kind: 'prop' });
    expect(byKey.get('height')).toMatchObject({ key: 'height', kind: 'prop' });
    expect(byKey.get('viewport')).toMatchObject({ key: 'viewport', kind: 'prop' });
    expect(byKey.get('events')).toMatchObject({ key: 'events', kind: 'prop' });
    expect(byKey.get('loading')).toMatchObject({ key: 'loading', kind: 'region', regionKey: 'loading' });
    expect(byKey.get('empty')).toMatchObject({ key: 'empty', kind: 'region', regionKey: 'empty' });
  });

  it('definition should register without conflicts via registerScadaRenderers', () => {
    const registry = createRendererRegistry();
    registerScadaRenderers(registry);
    expect(registry.has('scada-canvas')).toBe(true);
    expect(registry.list()).toHaveLength(1);
    const def = registry.get('scada-canvas');
    expect(def?.type).toBe('scada-canvas');
    expect(def?.sourcePackage).toBe('@nop-chaos/flux-renderers-industrial');
    expect(def?.component).toBe(ScadaCanvasRenderer);
  });

  it('registerRendererDefinitions should return the registry', () => {
    const registry = createRendererRegistry();
    const result = registerRendererDefinitions(registry, industrialRendererDefinitions);
    expect(result).toBe(registry);
  });
});
