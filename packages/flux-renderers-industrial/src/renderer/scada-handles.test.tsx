import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentHandle, RendererComponentProps } from '@nop-chaos/flux-core';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { createScadaTestEnvironment, renderScadaCanvas } from '../test-support/renderer-test-support.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const validConfig = (overrides: Record<string, unknown> = {}): ScadaConfig =>
  ({
    version: 1,
    variables: [
      { id: 'level', source: 'static', value: 10 },
      { id: 'speed', source: 'static', value: 100 },
      { id: 'calc', source: 'expression', expression: '@{level} * 2' },
    ],
    symbols: [
      { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
    ],
    ...overrides,
  }) as ScadaConfig;

function makeProps(
  overrides: Partial<RendererComponentProps<ScadaCanvasSchema>> & { props?: Record<string, unknown> } = {},
): RendererComponentProps<ScadaCanvasSchema> {
  return {
    id: 'scada-1',
    path: 'test.scada-1',
    schema: { type: 'scada-canvas' } as ScadaCanvasSchema,
    templateNode: {} as RendererComponentProps<ScadaCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaCanvasSchema>['node'],
    props: { config: validConfig() } as RendererComponentProps<ScadaCanvasSchema>['props'],
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      cid: 9,
    } as RendererComponentProps<ScadaCanvasSchema>['meta'],
    regions: {},
    events: {},
    reactions: {},
    helpers: { dispatch: vi.fn().mockResolvedValue({ ok: true }) } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
    ...overrides,
  };
}

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
    renderScadaCanvas(makeProps(), environment);
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
    renderScadaCanvas(makeProps(), environment);
    const handle = await resolveScadaHandle(environment);
    const engine = ((window as unknown as Record<string, unknown>)[`__flux_scada_9`] as { engine: ScadaCanvasEngine }).engine;

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
    renderScadaCanvas(makeProps(), environment);
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
    renderScadaCanvas(makeProps(), environment);
    const handle = await resolveScadaHandle(environment);

    const write = await handle.capabilities.invoke('setPointValue', { pointId: 'level', value: 42 }, {});
    expect(write.ok).toBe(true);
    // P1-2 首帧刷新：表达式点 calc 挂载即求值（@{level} * 2 = 20），进入点表快照；
    // 写入 level 后等 rAF 合帧 flush 触发依赖链重算（calc → 84），断言确定化
    await new Promise((resolve) => setTimeout(resolve, 30));

    const table = await handle.capabilities.invoke('getPointTable', undefined, {});
    expect(table.ok).toBe(true);
    expect(table.data).toEqual({ level: 42, speed: 100, calc: 84 });

    const handleWindow = (window as unknown as Record<string, unknown>)[`__flux_scada_9`] as {
      getPointValue: (pointId: string) => unknown;
    };
    expect(handleWindow.getPointValue('level')).toBe(42);
  });

  it('exportConfig/importConfig honor the serialization contract (invalid-config failure path)', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeProps(), environment);
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
    const view = renderScadaCanvas(makeProps({ props: {} }), environment);
    const handle = await resolveScadaHandle(environment);
    const engine = ((window as unknown as Record<string, unknown>)[`__flux_scada_9`] as {
      engine: ScadaCanvasEngine;
    }).engine;

    expect(
      view.container.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
    ).toBe('loading');

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
    renderScadaCanvas(makeProps(), environment);
    const handle = await resolveScadaHandle(environment);
    const handleKey = '__flux_scada_9';

    const destroyed = await handle.capabilities.invoke('destroy', undefined, {});
    expect(destroyed.ok).toBe(true);
    await waitFor(() => expect((window as unknown as Record<string, unknown>)[handleKey]).toBeUndefined());

    const later = await handle.capabilities.invoke('fit', undefined, {});
    expect(later.ok).toBe(false);
    expect(String(later.error)).toContain('not mounted');
  });

  it('unmounts unregister the handle from the component registry', async () => {
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(makeProps(), environment);
    const handle = await resolveScadaHandle(environment);
    expect(handle).toBeDefined();
    view.unmount();
    await waitFor(() =>
      expect(environment.componentRegistry.resolve({ componentId: 'scada-1' })).toBeUndefined(),
    );
  });

  it('returns no-config errors for viewport/config commands before a scene is loaded', async () => {
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(makeProps({ props: {} }), environment);
    const handle = await resolveScadaHandle(environment);
    const fit = await handle.capabilities.invoke('fit', undefined, {});
    expect(fit.ok).toBe(false);
    expect(String(fit.error)).toContain('no config');
    const exported = await handle.capabilities.invoke('exportConfig', undefined, {});
    expect(exported.ok).toBe(false);
    expect(String(exported.error)).toContain('no config');
    const symbols = await handle.capabilities.invoke('getSymbols', undefined, {});
    expect(symbols.ok).toBe(true);
    expect(symbols.data).toEqual([]);
  });
});
