import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRendererRegistry, registerRendererDefinitions } from '@nop-chaos/flux-core';
import { industrialRendererDefinitions } from './renderer-definitions.js';
import { registerScadaRenderers } from './index.js';
import { hasScadaSymbol, clearScadaSymbolRegistry } from './symbols/symbol-registry.js';
import { builtinScadaSymbolDefinitions } from './symbols/register-builtin.js';
import { ScadaCanvasRenderer } from './renderer/scada-canvas.js';
import { LazyScadaCanvasRenderer, loadScadaCanvasRenderer } from './scada-canvas-lazy.js';

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

  it('scada-canvas registers the unified lazy wrapper that resolves to ScadaCanvasRenderer (I10.1 + lazy loading)', async () => {
    expect(industrialRendererDefinitions[0].component).toBe(LazyScadaCanvasRenderer);
    expect(await loadScadaCanvasRenderer()).toBe(ScadaCanvasRenderer);
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
    expect(def?.component).toBe(LazyScadaCanvasRenderer);
  });

  it('registerRendererDefinitions should return the registry', () => {
    const registry = createRendererRegistry();
    const result = registerRendererDefinitions(registry, industrialRendererDefinitions);
    expect(result).toBe(registry);
  });
});

// Phase 1（plan 2026-08-04-1558-1）+ 统一延迟加载：注册语义与幂等。
// index.ts / renderer-definitions 无模块加载副作用、注册路径不静态触达 leafer-ui；
// 内置 24 图元随 scada-canvas 异步 chunk 装载自注册（scada-canvas-lazy.ts）。
describe('registration semantics (scada-canvas chunk load → builtin symbols)', () => {
  beforeEach(() => {
    clearScadaSymbolRegistry();
  });

  it('index.ts module load does NOT auto-register builtin symbols (no side effect)', async () => {
    // Registry cleared above; merely importing the package entry must not register anything.
    await import('./index.js');
    expect(hasScadaSymbol('scada-rect')).toBe(false);
    expect(hasScadaSymbol('scada-device-motor')).toBe(false);
  });

  it('registerScadaRenderers registers the definition but does NOT eagerly register builtin symbols', () => {
    const registry = createRendererRegistry();
    registerScadaRenderers(registry);
    expect(registry.has('scada-canvas')).toBe(true);
    // 符号注册表保持为空：leafer-ui 不进宿主注册路径，图元随 chunk 装载。
    expect(hasScadaSymbol('scada-rect')).toBe(false);
    expect(hasScadaSymbol('scada-device-motor')).toBe(false);
  });

  it('scada-canvas chunk load self-registers all 24 builtin symbols without a prior registerBuiltinScadaSymbols call (full list)', async () => {
    const registry = createRendererRegistry();
    registerScadaRenderers(registry);

    await loadScadaCanvasRenderer();
    const expectedTypes = builtinScadaSymbolDefinitions.map((def) => def.type);
    expect(expectedTypes).toHaveLength(24);
    for (const type of expectedTypes) {
      expect(hasScadaSymbol(type), `expected ${type} to be registered`).toBe(true);
    }
  });

  it('chunk load resolves to the real renderer and stays consistent on repeat registration', async () => {
    // 承接上一用例的装载结果（load promise 记忆化＝生产语义：每次应用生命周期注册一次）。
    const component = await loadScadaCanvasRenderer();
    expect(component).toBe(ScadaCanvasRenderer);
    for (const def of builtinScadaSymbolDefinitions) {
      expect(hasScadaSymbol(def.type)).toBe(true);
    }
  });

  it('registerScadaRenderers is idempotent (repeat calls keep definition registry consistent)', () => {
    const registry = createRendererRegistry();
    // T6（plan 2026-08-04-2243-3）：移除 not.toThrow() 弱断言——直接调用 3 次，
    // 若抛错测试自然失败；idempotency 由下方 toHaveLength(1) 负向副作用断言证明（无重复注册）。
    registerScadaRenderers(registry);
    registerScadaRenderers(registry);
    registerScadaRenderers(registry);
    expect(registry.list()).toHaveLength(1);
  });
});
