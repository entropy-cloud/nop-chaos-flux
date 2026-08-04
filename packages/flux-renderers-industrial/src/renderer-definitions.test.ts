import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRendererRegistry, registerRendererDefinitions } from '@nop-chaos/flux-core';
import { industrialRendererDefinitions } from './renderer-definitions.js';
import { registerScadaRenderers } from './index.js';
import { hasScadaSymbol, clearScadaSymbolRegistry } from './symbols/symbol-registry.js';
import { builtinScadaSymbolDefinitions } from './symbols/register-builtin.js';
import { ScadaCanvasRenderer } from './renderer/scada-canvas.js';

// index.ts 引入链含 registerScadaSymbols → base-shapes → leafer-ui；
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
    // Phase 3: defaultSchema 含合法 config（author-less schema 不再永久 loading）。
    expect(def.defaultSchema).toEqual({
      type: 'scada-canvas',
      config: { version: 1, variables: [], symbols: [] },
    });
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

  it('scada-canvas static metadata is tooling-discoverable: rendererClass + propContracts + 5 eventContracts + 9 capabilityContracts (Phase 3)', () => {
    const def = industrialRendererDefinitions[0];
    // rendererClass（范本 basic-renderer-definitions.ts:174 instance-renderer）
    expect(def.rendererClass).toBe('instance-renderer');
    // propContracts：覆盖 5 个授权 prop key（config/width/height/viewport/events）
    expect(Object.keys(def.propContracts ?? {}).sort()).toEqual(
      ['config', 'events', 'height', 'viewport', 'width'],
    );
    // eventContracts：5 events（onSymbolClick/onSymbolDblClick/onSymbolHover/onReady/onError）
    expect(Object.keys(def.eventContracts ?? {}).sort()).toEqual(
      ['onError', 'onReady', 'onSymbolClick', 'onSymbolDblClick', 'onSymbolHover'],
    );
    // componentCapabilityContracts：9 handles（design-renderer.md §8.5 表）
    const handles = (def.componentCapabilityContracts ?? []).map((c) => c.handle);
    expect(handles.sort()).toEqual(
      [
        'center',
        'destroy',
        'exportConfig',
        'fit',
        'getPointTable',
        'getSymbol',
        'getSymbols',
        'importConfig',
        'setPointValue',
      ],
    );
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

// Phase 1（plan 2026-08-04-1558-1）：注册语义与幂等。
// index.ts 不再有模块加载副作用；registerScadaRenderers 调用后内置 24 图元必须可解析。
describe('registration semantics (registerScadaRenderers → builtin symbols)', () => {
  beforeEach(() => {
    clearScadaSymbolRegistry();
  });

  it('index.ts module load does NOT auto-register builtin symbols (no side effect)', () => {
    // After the Phase 1 fix, merely importing the package entry must not register anything.
    // (registry cleared in beforeEach; no call to registerScadaRenderers/registerScadaSymbols yet.)
    expect(hasScadaSymbol('scada-rect')).toBe(false);
    expect(hasScadaSymbol('scada-device-motor')).toBe(false);
  });

  it('registerScadaRenderers registers all 24 builtin symbols (full list)', () => {
    const registry = createRendererRegistry();
    registerScadaRenderers(registry);

    const expectedTypes = builtinScadaSymbolDefinitions.map((def) => def.type);
    expect(expectedTypes).toHaveLength(24);
    for (const type of expectedTypes) {
      expect(hasScadaSymbol(type), `expected ${type} to be registered`).toBe(true);
    }
  });

  it('registerScadaRenderers registers builtin symbols (sample of authorized handles)', () => {
    const registry = createRendererRegistry();
    registerScadaRenderers(registry);

    // 抽样覆盖每个族（shape/device/instrument/sensor-control/pipe/group）
    expect(hasScadaSymbol('scada-rect')).toBe(true);
    expect(hasScadaSymbol('scada-device-motor')).toBe(true);
    expect(hasScadaSymbol('scada-instrument-gauge')).toBe(true);
    expect(hasScadaSymbol('scada-sensor-control-sensor')).toBe(true);
    expect(hasScadaSymbol('scada-pipe-junction')).toBe(true);
    expect(hasScadaSymbol('scada-group')).toBe(true);
  });

  it('registerScadaRenderers is idempotent (repeat calls keep registry consistent, no throw)', () => {
    const registry = createRendererRegistry();
    expect(() => {
      registerScadaRenderers(registry);
      registerScadaRenderers(registry);
      registerScadaRenderers(registry);
    }).not.toThrow();
    expect(hasScadaSymbol('scada-rect')).toBe(true);
    expect(registry.list()).toHaveLength(1);
  });

  it('registerScadaRenderers does not depend on prior registerBuiltinScadaSymbols call', () => {
    // Proves self-sufficiency: clear → single registerScadaRenderers call → builtins present.
    expect(hasScadaSymbol('scada-ellipse')).toBe(false);
    const registry = createRendererRegistry();
    registerScadaRenderers(registry);
    expect(hasScadaSymbol('scada-ellipse')).toBe(true);
  });
});
