import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentHandle } from '@nop-chaos/flux-core';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  configProp,
  createScadaTestEnvironment,
  makeScadaCanvasProps,
  renderScadaCanvas,
  ScadaTestProviders,
  scadaTestHandle,
  validCanvasConfig,
} from '../test-support/renderer-test-support.js';
import { ScadaCanvasRenderer } from './scada-canvas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const handlesConfig = (overrides: Record<string, unknown> = {}): ScadaConfig =>
  validCanvasConfig({
    variables: [
      { id: 'level', source: 'static', value: 10 },
      { id: 'speed', source: 'static', value: 100 },
      { id: 'calc', source: 'expression', expression: '${level * 2}' },
    ],
    symbols: [
      { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
    ],
    ...overrides,
  });

const EXPECTED_METHODS = [
  'fit',
  'center',
  'getSymbols',
  'getSymbol',
  'setPointValue',
  'getPointTable',
  'exportConfig',
  'importConfig',
  'destroy',
];

async function resolveScadaHandle(
  environment: ReturnType<typeof createScadaTestEnvironment>,
): Promise<ComponentHandle> {
  await waitFor(() =>
    expect(environment.componentRegistry.resolve({ componentId: 'scada-1' })).toBeDefined(),
  );
  return environment.componentRegistry.resolve({ componentId: 'scada-1' }) as ComponentHandle;
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('scada-canvas component handles (I10.2, design-renderer.md §8.5)', () => {
  it('registers component:* capabilities aligned with the §8.5 handle table', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } }), environment);
    const handle = await resolveScadaHandle(environment);
    expect(handle.id).toBe('scada-1');
    expect(handle.type).toBe('scada-canvas');
    for (const method of EXPECTED_METHODS) {
      expect(handle.capabilities.hasMethod?.(method)).toBe(true);
    }
    expect(handle.capabilities.hasMethod?.('getSymbolProps')).toBe(false);
    expect(handle.capabilities.listMethods?.()).toEqual(EXPECTED_METHODS);
  });

  it('fit/center drive the viewport and getSymbols/getSymbol read the scene tree', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } }), environment);
    const handle = await resolveScadaHandle(environment);
    const engine = scadaTestHandle(9)?.engine as ScadaCanvasEngine;

    const before = engine.getViewport();
    const fitResult = await handle.capabilities.invoke('fit', undefined, {});
    expect(fitResult.ok).toBe(true);
    const fitViewport = (fitResult.data as { x: number; y: number; scale: number });
    expect(fitViewport.scale).toBeGreaterThan(0);
    expect(engine.getViewport()).toEqual(fitViewport);
    expect(engine.getViewport()).not.toEqual(before);

    const centerResult = await handle.capabilities.invoke('center', undefined, {});
    expect(centerResult.ok).toBe(true);
    expect(engine.getViewport().scale).toBe(fitViewport.scale);

    const symbols = await handle.capabilities.invoke('getSymbols', undefined, {});
    expect(symbols.ok).toBe(true);
    expect(symbols.data).toEqual([
      { id: 'rect-1', type: 'scada-rect' },
      { id: 'rect-2', type: 'scada-rect' },
    ]);

    const symbol = await handle.capabilities.invoke('getSymbol', { id: 'rect-1' }, {});
    expect(symbol.ok).toBe(true);
    expect((symbol.data as { fill: string }).fill).toBe('#ff0000');
  });

  it('getSymbol/setPointValue return the §8.5 failure paths (symbol-not-found / point-not-found)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } }), environment);
    const handle = await resolveScadaHandle(environment);

    const missingSymbol = await handle.capabilities.invoke('getSymbol', { id: 'nope' }, {});
    expect(missingSymbol.ok).toBe(false);
    expect(String(missingSymbol.error)).toContain('symbol not found: nope');

    const missingPoint = await handle.capabilities.invoke('setPointValue', { pointId: 'nope', value: 1 }, {});
    expect(missingPoint.ok).toBe(false);
    expect(String(missingPoint.error)).toContain('point not found: nope');

    const noPointId = await handle.capabilities.invoke('setPointValue', { value: 1 }, {});
    expect(noPointId.ok).toBe(false);
    expect(String(noPointId.error)).toContain('pointId is required');

    const noSymbolId = await handle.capabilities.invoke('getSymbol', {}, {});
    expect(noSymbolId.ok).toBe(false);
    expect(String(noSymbolId.error)).toContain('symbol id is required');
  });

  it('setPointValue writes through the point store and getPointTable snapshots it', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } }), environment);
    const handle = await resolveScadaHandle(environment);

    const write = await handle.capabilities.invoke('setPointValue', { pointId: 'level', value: 42 }, {});
    expect(write.ok).toBe(true);
    // P1-2 首帧刷新：表达式点 calc 挂载即求值（${level * 2} = 20），进入点表快照；
    // 写入 level 后等 rAF 合帧 flush 触发依赖链重算（calc → 84），断言确定化
    await new Promise((resolve) => setTimeout(resolve, 30));

    const table = await handle.capabilities.invoke('getPointTable', undefined, {});
    expect(table.ok).toBe(true);
    expect(table.data).toEqual({ level: 42, speed: 100, calc: 84 });

    const handleWindow = scadaTestHandle(9);
    expect(handleWindow?.getPointValue('level')).toBe(42);
  });

  it('exportConfig/importConfig honor the serialization contract (invalid-config failure path)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } }), environment);
    const handle = await resolveScadaHandle(environment);

    const exported = await handle.capabilities.invoke('exportConfig', undefined, {});
    expect(exported.ok).toBe(true);
    expect((exported.data as ScadaConfig).symbols).toHaveLength(2);

    const imported = await handle.capabilities.invoke(
      'importConfig',
      { config: { version: 1, symbols: [{ id: 'new-1', type: 'scada-rect', x: 0, y: 0 }] } },
      {},
    );
    expect(imported.ok).toBe(true);
    const symbols = await handle.capabilities.invoke('getSymbols', undefined, {});
    expect((symbols.data as { id: string }[]).map((s) => s.id)).toEqual(['new-1']);

    const invalid = await handle.capabilities.invoke('importConfig', { config: { version: 2 } }, {});
    expect(invalid.ok).toBe(false);
    expect(String(invalid.error)).toContain('invalid scada config');

    const malformedJson = await handle.capabilities.invoke('importConfig', { config: '{broken' }, {});
    expect(malformedJson.ok).toBe(false);

    const unknown = await handle.capabilities.invoke('no-such-method', undefined, {});
    expect(unknown.ok).toBe(false);
    expect(String(unknown.error)).toContain('Unknown method: no-such-method');
  });

  it('importConfig is immediate, persistent and restores ready status without a props config (P1-5)', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: {} }), environment);
    const handle = await resolveScadaHandle(environment);
    const engine = scadaTestHandle(9)?.engine as ScadaCanvasEngine;

    // Phase 3 author-less fallback: 缺 config 兜底空场景 → ready（不再 loading）。
    // importConfig 后符号入树；effect 重跑沉降后 import 持久（不被空场景 props 回刷）。
    await waitFor(() =>
      expect(
        view.container.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
      ).toBe('ready'),
    );

    const imported = { version: 1, symbols: [{ id: 'imp-1', type: 'scada-pipe', width: 200, height: 0 }] };
    const result = await handle.capabilities.invoke('importConfig', { config: imported }, {});
    expect(result.ok).toBe(true);

    await waitFor(() => expect(engine.getSymbols().map((leaf) => leaf.id)).toEqual(['imp-1']));
    await waitFor(() =>
      expect(
        view.container.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
      ).toBe('ready'),
    );
    // effect 重跑沉降后 import 持久（不被 props 回刷）
    expect(engine.getSymbols().map((leaf) => leaf.id)).toEqual(['imp-1']);
    expect(engine.registry.size()).toBe(1);
  });

  it('destroy tears down the engine; later invocations return not-mounted', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } }), environment);
    const handle = await resolveScadaHandle(environment);

    const destroyed = await handle.capabilities.invoke('destroy', undefined, {});
    expect(destroyed.ok).toBe(true);
    await waitFor(() => expect(scadaTestHandle(9)).toBeUndefined());

    const later = await handle.capabilities.invoke('fit', undefined, {});
    expect(later.ok).toBe(false);
    expect(String(later.error)).toContain('not mounted');
  });

  it('unmounts unregister the handle from the component registry', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } }), environment);
    const handle = await resolveScadaHandle(environment);
    expect(handle).toBeDefined();
    view.unmount();
    await waitFor(() =>
      expect(environment.componentRegistry.resolve({ componentId: 'scada-1' })).toBeUndefined(),
    );
  });

  it('returns bounds-errors for viewport commands on an empty scene; exportConfig returns the empty fallback config (plan 2026-08-04-1558-1 Phase 3)', async () => {
    // Phase 3 author-less fallback: 缺 config 兜底空场景 → 引擎已建空场景。
    // - fit/center：空场景 computeSymbolBounds 返回 undefined → 失败。
    //   plan 2026-08-04-1558-2 Phase 4 WD-5：错误码对齐 §8.5 表 `not-visible`。
    // - exportConfig：空场景已构建 → 返回空场景 config（ok）。
    // - getSymbols：空场景 → 空数组。
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeScadaCanvasProps({ cid: 9, props: {} }), environment);
    const handle = await resolveScadaHandle(environment);
    const fit = await handle.capabilities.invoke('fit', undefined, {});
    expect(fit.ok).toBe(false);
    expect(String(fit.error)).toContain('not-visible');
    const center = await handle.capabilities.invoke('center', undefined, {});
    expect(center.ok).toBe(false);
    expect(String(center.error)).toContain('not-visible');
    const exported = await handle.capabilities.invoke('exportConfig', undefined, {});
    expect(exported.ok).toBe(true);
    expect((exported.data as { version: number; symbols: unknown[] }).version).toBe(1);
    expect((exported.data as { version: number; symbols: unknown[] }).symbols).toEqual([]);
    const symbols = await handle.capabilities.invoke('getSymbols', undefined, {});
    expect(symbols.ok).toBe(true);
    expect(symbols.data).toEqual([]);
  });

  // plan 2026-08-04-2243-1 Phase 3 L6：reloadConfig 包 useCallback → 稳定身份。
  // useScadaHandles effect deps 含 reloadConfig；稳定后 re-render（同 props）不重跑 effect → 不重登 handle。
  // 修复前：reloadConfig 为内联箭头（每渲染新身份）→ effect 每渲染重跑 → register 每渲染重登/反注。
  it('reloadConfig stable identity → handle not re-registered on same-props re-render (Phase 3 L6)', async () => {
    const environment = createScadaTestEnvironment([]);
    const registerSpy = vi.spyOn(environment.componentRegistry, 'register');
    const props = makeScadaCanvasProps({ cid: 9, props: { config: configProp(handlesConfig()) } });
    const view = renderScadaCanvas(props, environment);
    await resolveScadaHandle(environment);
    const mountCount = registerSpy.mock.calls.length;
    expect(mountCount).toBeGreaterThanOrEqual(1);

    // 同 props re-render（新 wrapper 元素，逻辑 props 不变）：reloadConfig 稳定 → effect 不重跑。
    view.rerender(
      <ScadaTestProviders environment={environment}>
        <ScadaCanvasRenderer {...props} />
      </ScadaTestProviders>,
    );
    await waitFor(() =>
      expect(environment.componentRegistry.resolve({ componentId: 'scada-1' })).toBeDefined(),
    );
    // L6 fix：register 不随渲染递增（仍是 mountCount）。修复前会 +1（effect 重跑重登）。
    expect(registerSpy.mock.calls.length).toBe(mountCount);
    registerSpy.mockRestore();
  });
});
