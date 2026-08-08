import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  configProp,
  createScadaTestEnvironment,
  makeScadaCanvasProps,
  renderScadaCanvas,
  scadaTestHandle,
  validCanvasConfig,
} from '../test-support/renderer-test-support.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const metaConfig = (): ScadaConfig =>
  validCanvasConfig({
    symbols: [
      {
        id: 'rect-1',
        type: 'scada-rect',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        fill: '#ff0000',
      },
    ],
  });

function hitSymbol(cid: number) {
  const engine = scadaTestHandle(cid)?.engine as ScadaCanvasEngine;
  const leaf = engine.getSymbol('rect-1')?.node;
  (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
    ({ target: leaf, path: [leaf] });
  return engine;
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

// plan 2026-08-08-1910-3 Phase 2 / A4（open-audit P1）：runtime scada-canvas 遵守 meta.disabled/visible 契约。
// 对照 `scada-editor-canvas.tsx:217`（编辑器画布已遵守 disabled），同包内同契约纪律对称落地。
describe('scada-canvas meta.disabled/visible contract (A4)', () => {
  it('does not dispatch symbol events when meta.disabled=true (disabled 不派发 click/hover)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 31,
        props: {
          config: configProp(metaConfig()),
          width: 800,
          height: 600,
          events: {
            onSymbolClick: { action: 'noop' },
            onSymbolDblClick: { action: 'noop' },
            onSymbolHover: { action: 'noop' },
          },
        },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
        meta: {
          visible: true,
          hidden: false,
          disabled: true,
          changed: false,
          cid: 31,
        } as RendererComponentProps<ScadaCanvasSchema>['meta'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(31)).toBeDefined());
    const engine = hitSymbol(31);
    // 立即事件（double_tap / pointer.move，无 tap 合并延迟）：disabled 时不应触发 dispatch
    engine.tree.emit('double_tap', { x: 50, y: 40 });
    engine.app.emit('pointer.move', { x: 50, y: 40 });
    // 等待任一可能的事件循环回流后仍无 dispatch
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches symbol events when meta.disabled=false (sanity: 非禁用正常派发)', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const environment = createScadaTestEnvironment([]);
    renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 32,
        props: {
          config: configProp(metaConfig()),
          width: 800,
          height: 600,
          events: {
            onSymbolDblClick: { action: 'noop' },
            onSymbolHover: { action: 'noop' },
          },
        },
        node: { scope: environment.scope } as RendererComponentProps<ScadaCanvasSchema>['node'],
        helpers: { dispatch } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
        meta: {
          visible: true,
          hidden: false,
          disabled: false,
          changed: false,
          cid: 32,
        } as RendererComponentProps<ScadaCanvasSchema>['meta'],
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(32)).toBeDefined());
    const engine = hitSymbol(32);
    engine.tree.emit('double_tap', { x: 50, y: 40 });
    engine.app.emit('pointer.move', { x: 50, y: 40 });
    await waitFor(() => expect(dispatch.mock.calls.length).toBe(2));
    const types = dispatch.mock.calls.map(
      (call) => (call[1] as { event: { type: string } }).event.type,
    );
    expect(types).toEqual(['symbol:dblclick', 'symbol:hover']);
  });

  it('reflects aria-disabled + inert on the wrapper when meta.disabled=true (与编辑器画布同契约)', async () => {
    const environment = createScadaTestEnvironment([]);
    const { container } = renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 33,
        props: { config: configProp(metaConfig()) },
        meta: {
          visible: true,
          hidden: false,
          disabled: true,
          changed: false,
          cid: 33,
        } as RendererComponentProps<ScadaCanvasSchema>['meta'],
      }),
      environment,
    );
    await waitFor(() =>
      expect(
        container.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
      ).toBe('ready'),
    );
    const wrapper = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(wrapper.getAttribute('aria-disabled')).toBe('true');
    expect(wrapper.hasAttribute('inert')).toBe(true);
  });

  it('leaves the wrapper interactive when meta.disabled=false (no aria-disabled/inert)', async () => {
    const environment = createScadaTestEnvironment([]);
    const { container } = renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 34,
        props: { config: configProp(metaConfig()) },
        meta: {
          visible: true,
          hidden: false,
          disabled: false,
          changed: false,
          cid: 34,
        } as RendererComponentProps<ScadaCanvasSchema>['meta'],
      }),
      environment,
    );
    await waitFor(() =>
      expect(
        container.querySelector('[data-slot="scada-canvas"]')?.getAttribute('data-status'),
      ).toBe('ready'),
    );
    const wrapper = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(wrapper.hasAttribute('aria-disabled')).toBe(false);
    expect(wrapper.hasAttribute('inert')).toBe(false);
  });

  it('does not render the canvas when meta.visible=false (visible:false 不渲染画布)', async () => {
    const environment = createScadaTestEnvironment([]);
    const { container } = renderScadaCanvas(
      makeScadaCanvasProps({
        cid: 35,
        props: { config: configProp(metaConfig()) },
        meta: {
          visible: false,
          hidden: false,
          disabled: false,
          changed: false,
          cid: 35,
        } as RendererComponentProps<ScadaCanvasSchema>['meta'],
      }),
      environment,
    );
    // visible:false → scada-canvas 不渲染画布（null）。框架层 node-renderer-resolved 也会对
    // !visible 整体返回 null；renderer 层显式守卫为同契约 defense-in-depth（与编辑器画布同纪律）。
    await waitFor(() =>
      expect(container.querySelector('[data-slot="scada-canvas"]')).toBeNull(),
    );
    // 不应创建引擎（无画布即无交互面/无点表消费）
    expect(scadaTestHandle(35)).toBeUndefined();
  });
});
