import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ComponentCapabilityResult,
  ComponentHandle,
  ComponentHandleRegistry,
  RendererComponentProps,
  RendererDefinition,
  RendererHelpers,
} from '@nop-chaos/flux-core';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validEditorConfig } from '../test-support/editor-config-fixtures.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { ScadaEditorCanvasRenderer } from './scada-editor-canvas.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import type { ScadaEditorCanvasSchema } from './schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
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

/**
 * plan 2026-08-07-1835-2 Phase 2 / multi P1-04/05/06/08/09 契约接线 proof。
 *
 * 用 dispatch-spy 包裹 ScadaEditorCanvasRenderer，使 helpers.dispatch 注入 vi.fn()，
 * 可断言 save/load/onModeChange 等经 dispatch.mock.calls 验证（关 P1-12 false-green）。
 * 经 onComponentRegistryChange 捕获 registry，断言 runtime 9 句柄可达（P1-06）。
 */
function createSpiedDefinitions(dispatchSpy: ReturnType<typeof vi.fn>): RendererDefinition[] {
  function SpiedEditor(props: RendererComponentProps<ScadaEditorCanvasSchema>) {
    const helpers = ({ ...(props.helpers as object), dispatch: dispatchSpy }) as unknown as RendererHelpers;
    return <ScadaEditorCanvasRenderer {...props} helpers={helpers} />;
  }
  return [
    {
      ...industrialEditorRendererDefinitions[0],
      component: SpiedEditor,
    },
  ];
}

function renderSpiedEditor(
  dispatchSpy: ReturnType<typeof vi.fn>,
  options: {
    config?: unknown;
    mode?: 'edit' | 'preview';
    commitPolicy?: 'manual' | 'auto';
    events?: Record<string, unknown>;
    onRegistry?: (reg: ComponentHandleRegistry | undefined) => void;
    tag?: string;
  } = {},
) {
  const SchemaRenderer = createSchemaRenderer(createSpiedDefinitions(dispatchSpy));
  const schema: Record<string, unknown> = { type: 'scada-editor-canvas' };
  schema.config = options.config ?? validEditorConfig();
  if (options.mode) schema.mode = options.mode;
  if (options.commitPolicy) schema.commitPolicy = options.commitPolicy;
  if (options.events) schema.events = options.events;
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-contract/${options.tag ?? 'default'}`}
      schema={schema as never}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
      onComponentRegistryChange={options.onRegistry ? (r) => options.onRegistry!(r ?? undefined) : undefined}
    />,
  );
}

async function waitForReadyAndCid(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  return Number(root.getAttribute('data-cid'));
}

function dispatchTypes(spy: ReturnType<typeof vi.fn>): string[] {
  return spy.mock.calls.map((call) => {
    const event = (call[1] as { event?: { type?: string } } | undefined)?.event;
    return event?.type ?? '';
  });
}

/** invoke 句柄返回类型含 Promise 联合；本测试 invoke 恒同步，cast 为同步结果。 */
function invokeSync(
  handle: ComponentHandle,
  method: string,
  payload: Record<string, unknown> | undefined,
): ComponentCapabilityResult {
  return handle.capabilities.invoke(method, payload, {} as never) as ComponentCapabilityResult;
}

describe('P1-04 scada-editor:save / load dispatch (contract wiring)', () => {
  it('save() dispatches scada-editor:save with serializedConfig payload', async () => {
    const dispatch = vi.fn();
    const { container } = renderSpiedEditor(dispatch, {
      events: { onSave: { action: 'noop', args: {} } },
      tag: 'save-dispatch',
    });
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.save();
    const types = dispatchTypes(dispatch);
    expect(types).toContain('scada-editor:save');
    const saveCall = dispatch.mock.calls.find((c) => {
      const ev = (c[1] as { event?: { type?: string } } | undefined)?.event;
      return ev?.type === 'scada-editor:save';
    });
    expect((saveCall![1] as { event?: { serializedConfig?: string } }).event?.serializedConfig).toContain('editor-rect');
  });

  it('load() dispatches scada-editor:load with parsed config payload', async () => {
    const dispatch = vi.fn();
    const { container } = renderSpiedEditor(dispatch, {
      events: { onLoad: { action: 'noop', args: {} } },
      tag: 'load-dispatch',
    });
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const newConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [{ id: 'loaded-ellipse', type: 'scada-ellipse', x: 0, y: 0, width: 50, height: 50 }],
    };
    handle.load(newConfig);
    const types = dispatchTypes(dispatch);
    expect(types).toContain('scada-editor:load');
  });
});

describe('P1-05 commitPolicy=auto triggers save+onSave on edit (Decision: 方案 A)', () => {
  it('discrete edit (updateSymbol) triggers scada-editor:save when commitPolicy=auto', async () => {
    const dispatch = vi.fn();
    const { container } = renderSpiedEditor(dispatch, {
      commitPolicy: 'auto',
      events: { onSave: { action: 'noop', args: {} } },
      tag: 'commit-auto',
    });
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    dispatch.mockClear();
    handle.updateSymbol('editor-rect', { x: 333 });
    const types = dispatchTypes(dispatch);
    expect(types).toContain('scada-editor:save');
  });

  it('commitPolicy=manual (default) does NOT auto-save on edit', async () => {
    const dispatch = vi.fn();
    const { container } = renderSpiedEditor(dispatch, {
      tag: 'commit-manual',
    });
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    dispatch.mockClear();
    handle.updateSymbol('editor-rect', { x: 999 });
    expect(dispatchTypes(dispatch)).not.toContain('scada-editor:save');
  });
});

describe('P1-06 runtime 9 handles reachable from editor instance', () => {
  it('registers all runtime 9 methods (fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy)', async () => {
    const dispatch = vi.fn();
    let registry: ComponentHandleRegistry | undefined;
    const { container } = renderSpiedEditor(dispatch, {
      onRegistry: (r) => {
        registry = r;
      },
      tag: 'handles-list',
    });
    const cid = await waitForReadyAndCid(container);
    await waitFor(() => expect(registry).toBeDefined());
    const handle = registry!.resolve({ _targetCid: cid }) as ComponentHandle | undefined;
    expect(handle).toBeDefined();
    expect(handle!.type).toBe('scada-editor-canvas');
    for (const method of [
      'fit',
      'center',
      'getSymbols',
      'getSymbol',
      'setPointValue',
      'getPointTable',
      'exportConfig',
      'importConfig',
      'destroy',
    ]) {
      expect(handle!.capabilities.hasMethod?.(method)).toBe(true);
    }
  });

  it('destroy() handle sets canvas data-status to destroyed', async () => {
    const dispatch = vi.fn();
    let registry: ComponentHandleRegistry | undefined;
    const { container } = renderSpiedEditor(dispatch, {
      onRegistry: (r) => {
        registry = r;
      },
      tag: 'handles-destroy',
    });
    const cid = await waitForReadyAndCid(container);
    await waitFor(() => expect(registry).toBeDefined());
    const handle = registry!.resolve({ _targetCid: cid }) as ComponentHandle | undefined;
    invokeSync(handle!, 'destroy', undefined);
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe(
        'destroyed',
      );
    });
  });

  it('getSymbols / exportConfig handles return real data', async () => {
    const dispatch = vi.fn();
    let registry: ComponentHandleRegistry | undefined;
    const { container } = renderSpiedEditor(dispatch, {
      onRegistry: (r) => {
        registry = r;
      },
      tag: 'handles-data',
    });
    const cid = await waitForReadyAndCid(container);
    await waitFor(() => expect(registry).toBeDefined());
    const handle = registry!.resolve({ _targetCid: cid }) as ComponentHandle | undefined;
    const symbolsResult = invokeSync(handle!, 'getSymbols', undefined);
    expect(symbolsResult.ok).toBe(true);
    expect(Array.isArray(symbolsResult.data)).toBe(true);
    expect((symbolsResult.data as Array<{ id: string }>).some((s) => s.id === 'editor-rect')).toBe(true);
    const exportResult = invokeSync(handle!, 'exportConfig', undefined);
    expect(exportResult.ok).toBe(true);
    expect(typeof exportResult.data).toBe('string');
  });

  it('fit / center handles delegate to engine viewport ops', async () => {
    const dispatch = vi.fn();
    let registry: ComponentHandleRegistry | undefined;
    const { container } = renderSpiedEditor(dispatch, {
      onRegistry: (r) => {
        registry = r;
      },
      tag: 'handles-fit',
    });
    const cid = await waitForReadyAndCid(container);
    await waitFor(() => expect(registry).toBeDefined());
    const handle = registry!.resolve({ _targetCid: cid }) as ComponentHandle | undefined;
    const fitResult = invokeSync(handle!, 'fit', undefined);
    expect(fitResult.ok).toBe(true);
    const centerResult = invokeSync(handle!, 'center', undefined);
    expect(centerResult.ok).toBe(true);
  });

  it('invoking a method after destroy returns destroyed error', async () => {
    const dispatch = vi.fn();
    let registry: ComponentHandleRegistry | undefined;
    const { container } = renderSpiedEditor(dispatch, {
      onRegistry: (r) => {
        registry = r;
      },
      tag: 'handles-after-destroy',
    });
    const cid = await waitForReadyAndCid(container);
    await waitFor(() => expect(registry).toBeDefined());
    const handle = registry!.resolve({ _targetCid: cid }) as ComponentHandle | undefined;
    invokeSync(handle!, 'destroy', undefined);
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe(
        'destroyed',
      );
    });
    const after = invokeSync(handle!, 'getSymbols', undefined);
    expect(after.ok).toBe(false);
  });

  it('getSymbol / setPointValue / getPointTable / importConfig handle branches', async () => {
    const dispatch = vi.fn();
    let registry: ComponentHandleRegistry | undefined;
    const { container } = renderSpiedEditor(dispatch, {
      onRegistry: (r) => {
        registry = r;
      },
      tag: 'handles-misc',
    });
    const cid = await waitForReadyAndCid(container);
    await waitFor(() => expect(registry).toBeDefined());
    const handle = registry!.resolve({ _targetCid: cid }) as ComponentHandle | undefined;
    // getSymbol: valid id → ok with props
    const found = invokeSync(handle!, 'getSymbol', { id: 'editor-rect' });
    expect(found.ok).toBe(true);
    // getSymbol: unknown id → error
    const notFound = invokeSync(handle!, 'getSymbol', { id: 'missing' });
    expect(notFound.ok).toBe(false);
    // getSymbol: missing id payload → error
    const noId = invokeSync(handle!, 'getSymbol', undefined);
    expect(noId.ok).toBe(false);
    // setPointValue: not supported in editor mode (reachable but errors)
    const point = invokeSync(handle!, 'setPointValue', { pointId: 'p', value: 1 });
    expect(point.ok).toBe(false);
    // getPointTable: returns empty object
    const table = invokeSync(handle!, 'getPointTable', undefined);
    expect(table.ok).toBe(true);
    expect(table.data).toEqual({});
    // importConfig: valid config → ok
    const validImport = invokeSync(
      handle!,
      'importConfig',
      { config: { version: 1, variables: [], symbols: [] } },
    );
    expect(validImport.ok).toBe(true);
    // importConfig: undefined → error
    const badImport = invokeSync(handle!, 'importConfig', undefined);
    expect(badImport.ok).toBe(false);
    // importConfig: invalid config → error
    const invalidImport = invokeSync(
      handle!,
      'importConfig',
      { config: { version: 2, symbols: [] } },
    );
    expect(invalidImport.ok).toBe(false);
  });
});

describe('P1-08 initialMode=preview syncs engine.mode (mode desync fix)', () => {
  it('mount with mode=preview → engine.currentMode is preview', async () => {
    const dispatch = vi.fn();
    const { container } = renderSpiedEditor(dispatch, { mode: 'preview', tag: 'preview-mode' });
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const engine = handle.engine as { currentMode?: string };
    expect(engine.currentMode).toBe('preview');
  });
});

describe('P1-09 controlled-mode config/mode pushback (Decision: 方案 A)', () => {
  it('changing config prop triggers load of new config', async () => {
    const dispatch = vi.fn();
    const SchemaRenderer = createSchemaRenderer(createSpiedDefinitions(dispatch));
    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://editor-contract/controlled-config"
        schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(handle.session.workingConfig.symbols).toHaveLength(2);
    const newConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        { id: 'pushed-rect', type: 'scada-rect', x: 5, y: 5, width: 10, height: 10 },
        { id: 'pushed-rect2', type: 'scada-rect', x: 50, y: 50, width: 10, height: 10 },
        { id: 'pushed-rect3', type: 'scada-rect', x: 90, y: 90, width: 10, height: 10 },
      ],
    };
    rerender(
      <SchemaRenderer
        schemaUrl="test://editor-contract/controlled-config"
        schema={{ type: 'scada-editor-canvas', config: newConfig as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols.some((s) => s.id === 'pushed-rect')).toBe(true);
    });
  });

  it('changing mode prop triggers switchMode', async () => {
    const dispatch = vi.fn();
    const SchemaRenderer = createSchemaRenderer(createSpiedDefinitions(dispatch));
    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://editor-contract/controlled-mode"
        schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(handle.session.mode).toBe('edit');
    rerender(
      <SchemaRenderer
        schemaUrl="test://editor-contract/controlled-mode"
        schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never, mode: 'preview' }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    await waitFor(() => {
      expect(handle.session.mode).toBe('preview');
    });
  });
});
