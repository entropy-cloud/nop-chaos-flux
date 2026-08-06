import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validEditorConfig } from '../test-support/editor-config-fixtures.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { serializeScadaConfig } from '../serialization/serialize.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

// happy-dom 不提供 ResizeObserver —— polyfill 使 use-editor-engine 的 ResizeObserver 分支可达。
// polyfill 在 observe 时同步触发回调一次（覆盖 callback body 分支）。
vi.stubGlobal(
  'ResizeObserver',
  class {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      this.cb(
        [
          {
            target,
            contentRect: { width: 800, height: 600, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 600 },
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          },
        ] as unknown as ResizeObserverEntry[],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
  },
);

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

function renderEditor(cid: number, config = validEditorConfig()) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  const result = render(
    <SchemaRenderer
      schemaUrl={`test://industrial-editor/${cid}`}
      schema={{ type: 'scada-editor-canvas', config: config as never }}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
  return result;
}

/** 从渲染 DOM 读真实 cid（SchemaRenderer 经 props.meta.cid 赋值，非测试侧硬编码）。 */
async function waitForReadyAndCid(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  const cid = Number(root.getAttribute('data-cid'));
  expect(Number.isFinite(cid)).toBe(true);
  return cid;
}

describe('scada-editor-canvas dual-state isolation (R5, design-architecture.md §4.2)', () => {
  it('serialize(workingConfig) produces no `editable` field (R5 不泄漏验证 #1)', async () => {
    const cid = await waitForReadyAndCid(renderEditor(501).container);
    const handle = readScadaEditorTestHandle(cid);
    expect(handle).toBeDefined();
    const serialized = serializeScadaConfig(handle!.session.workingConfig);
    // serializeScadaConfig 恒不输出 editable（R5 Layer 1: editable 为运行时态，不入 config 节点字段）。
    expect(serialized).not.toContain('editable');
  });

  it('test handle session projection reflects loaded config (R5 Layer 2: working copy separate)', async () => {
    const cid = await waitForReadyAndCid(renderEditor(502, validEditorConfig()).container);
    const handle = readScadaEditorTestHandle(cid);
    expect(handle).toBeDefined();
    expect(handle!.session.workingConfig.symbols).toHaveLength(1);
    expect(handle!.session.workingConfig.symbols[0].id).toBe('editor-rect');
    expect(handle!.session.committedBaseline.symbols[0].id).toBe('editor-rect');
    expect(handle!.session.mode).toBe('edit');
    expect(handle!.session.canUndo).toBe(false);
    expect(handle!.session.canRedo).toBe(false);
    // Test handle getters (§8.4 contract): editor/engine/app instances exposed.
    expect(handle!.editor).toBeDefined();
    expect(handle!.engine).toBeDefined();
    expect(handle!.app).toBeDefined();
  });

  it('test handle removed on unmount (R5 不泄漏验证 #4: unmount 无残留)', async () => {
    const result = renderEditor(503);
    const cid = await waitForReadyAndCid(result.container);
    expect(readScadaEditorTestHandle(cid)).toBeDefined();
    result.unmount();
    expect(readScadaEditorTestHandle(cid)).toBeUndefined();
  });

  it('save() returns serializedConfig without editable (manual 提交语义)', async () => {
    const cid = await waitForReadyAndCid(renderEditor(504).container);
    const handle = readScadaEditorTestHandle(cid);
    const serialized = handle!.save();
    expect(serialized).toContain('"editor-rect"');
    expect(serialized).not.toContain('editable');
  });

  it('switchMode preview then edit toggles mode in session projection', async () => {
    const cid = await waitForReadyAndCid(renderEditor(505).container);
    const handle = readScadaEditorTestHandle(cid);
    expect(handle!.session.mode).toBe('edit');
    handle!.switchMode('preview');
    expect(handle!.session.mode).toBe('preview');
    handle!.switchMode('edit');
    expect(handle!.session.mode).toBe('edit');
  });

  it('load() replaces working copy + resets session', async () => {
    const cid = await waitForReadyAndCid(renderEditor(506).container);
    const handle = readScadaEditorTestHandle(cid);
    const newConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        { id: 'loaded-ellipse', type: 'scada-ellipse', x: 0, y: 0, width: 50, height: 50 },
      ],
    };
    handle!.load(newConfig);
    expect(handle!.session.workingConfig.symbols).toHaveLength(1);
    expect(handle!.session.workingConfig.symbols[0].id).toBe('loaded-ellipse');
    expect(handle!.session.selection).toEqual([]);
    expect(handle!.session.mode).toBe('edit');
  });

  it('canvas element gets data-slot marker after ready', async () => {
    const { container } = renderEditor(507);
    await waitForReadyAndCid(container);
    // canvas slot 落点经 effect 标记（design-renderer.md §10）。
    await waitFor(() => {
      const canvas = container.querySelector('[data-slot="scada-editor-canvas-canvas"]');
      expect(canvas).toBeTruthy();
    });
  });
});
