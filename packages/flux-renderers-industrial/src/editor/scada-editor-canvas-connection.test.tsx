import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
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

/** 连线场景 config：1 个 pipe-junction（主体 100×100 @ origin）+ 1 个目标 rect（300,100 80×60）。 */
function connectionConfig(): ScadaConfig {
  return {
    version: 1,
    variables: [],
    symbols: [
      {
        id: 'junction-1',
        type: 'scada-pipe-junction',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        custom: { connections: [] },
      },
      { id: 'device-1', type: 'scada-rect', x: 300, y: 100, width: 80, height: 60 },
    ],
  };
}

async function waitForReadyAndCid(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  return Number(root.getAttribute('data-cid'));
}

describe('scada-editor-canvas connection (E7.1, design-connection.md)', () => {
  it('connect writes connection into working copy custom.connections via linkage algorithm', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/connect"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'junction-1-conn-0',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
      direction: 'out',
    });

    const junction = handle.session.workingConfig.symbols.find((s) => s.id === 'junction-1')!;
    const conn = (junction.custom as { connections?: Array<{ id: string; x: number; y: number; direction: string; target: string }> }).connections![0];
    expect(conn.id).toBe('junction-1-conn-0');
    expect(conn.target).toBe('device-1');
    expect(conn.direction).toBe('out');
    // linkage: device-1 right-middle world = (380, 130); normalized = (3.8, 1.3)
    expect(conn.x).toBeCloseTo(3.8);
    expect(conn.y).toBeCloseTo(1.3);
  });

  it('listConnections returns written connections', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/list"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c1',
      targetNodeId: 'device-1',
      targetAnchor: { x: 0, y: 0.5 },
    });
    const list = handle.connection.listConnections();
    expect(list).toHaveLength(1);
    expect(list[0].junctionId).toBe('junction-1');
    expect(list[0].connection.id).toBe('c1');
    expect(list[0].connection.target).toBe('device-1');
    expect(list[0].dangling).toBe(false);
  });

  it('listConnections marks dangling when target does not exist', async () => {
    const config = connectionConfig();
    // pre-seed a dangling connection
    config.symbols[0].custom = {
      connections: [{ id: 'dangling-1', x: 0, y: 0, direction: 'out', target: 'no-such-device' }],
    };
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/dangling"
        schema={{ type: 'scada-editor-canvas', config: config as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const list = handle.connection.listConnections();
    expect(list).toHaveLength(1);
    expect(list[0].dangling).toBe(true);
  });

  it('redrag: connect with existing connectionId overwrites target/x/y', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/redrag"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    // first connect to device-1
    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c-redrag',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
    });
    // redrag: add a second device and re-connect to it
    handle.addSymbol({ id: 'device-2', type: 'scada-ellipse', x: 0, y: 300, width: 50, height: 50 });
    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c-redrag',
      targetNodeId: 'device-2',
      targetAnchor: { x: 0.5, y: 0 },
    });
    const junction = handle.session.workingConfig.symbols.find((s) => s.id === 'junction-1')!;
    const conns = (junction.custom as { connections?: Array<{ target: string }> }).connections!;
    expect(conns).toHaveLength(1);
    expect(conns[0].target).toBe('device-2');
  });

  it('disconnect removes the connection', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/disconnect"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c-del',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
    });
    expect(handle.connection.listConnections()).toHaveLength(1);
    handle.connection.disconnect({ junctionId: 'junction-1', connectionId: 'c-del' });
    expect(handle.connection.listConnections()).toHaveLength(0);
  });

  it('connect is a no-op when junction or target does not exist (test handle robustness)', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/robust"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // unknown junction → no-op
    handle.connection.connect({
      junctionId: 'no-junction',
      connectionId: 'c1',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
    });
    expect(handle.connection.listConnections()).toHaveLength(0);
    // unknown target → no-op
    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c1',
      targetNodeId: 'no-target',
      targetAnchor: { x: 1, y: 0.5 },
    });
    expect(handle.connection.listConnections()).toHaveLength(0);
    // disconnect unknown junction / connection → no-op (no throw)
    expect(() =>
      handle.connection.disconnect({ junctionId: 'no-junction', connectionId: 'c1' }),
    ).not.toThrow();
    expect(() =>
      handle.connection.disconnect({ junctionId: 'junction-1', connectionId: 'no-conn' }),
    ).not.toThrow();
  });

  it('figure-move linkage: moving target device recomputes connection.x/y (stub follows device)', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/linkage"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c-link',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
    });
    const before = handle.connection.listConnections()[0].connection;
    // move target device from (300,100) to (500,200)
    handle.updateSymbol('device-1', { x: 500, y: 200 });
    const after = handle.connection.listConnections()[0].connection;
    expect(after.x).not.toBeCloseTo(before.x);
    expect(after.y).not.toBeCloseTo(before.y);
    // new right-middle world = (580, 230); normalized = (5.8, 2.3)
    expect(after.x).toBeCloseTo(5.8);
    expect(after.y).toBeCloseTo(2.3);
  });

  it('connection operations do not modify runtime pipe-junction.ts (R5 isolation: editor only writes declaration)', async () => {
    // Smoke: connection write path stays in editor domain (no symbol:* action dispatch).
    // Verified structurally by asserting working copy structure (no screenshot, no runtime pipe-junction import).
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/r5"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c-r5',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
    });
    // working copy holds the declaration; junction type unchanged (editor只写声明)
    const junction = handle.session.workingConfig.symbols.find((s) => s.id === 'junction-1');
    expect(junction?.type).toBe('scada-pipe-junction');
    expect(handle.connection.listConnections()).toHaveLength(1);
  });

  it('undoRedo.getStackState reports empty stack in Phase 1 (canUndo/canRedo false)', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/stackstate"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const state = handle.undoRedo.getStackState();
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.undoStackDepth).toBe(0);
    expect(state.redoStackDepth).toBe(0);
  });

  it('figure-move linkage: moving the junction itself recomputes its connections', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/junction-move"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c-jm',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
    });
    const before = handle.connection.listConnections()[0].connection;
    // move the junction itself — connection.x/y recompute relative to new junction origin
    handle.updateSymbol('junction-1', { x: 200, y: 200 });
    const after = handle.connection.listConnections()[0].connection;
    // device-1 right-middle world = (380,130); junction now at (200,200) → normalized = (1.8, -0.7)
    expect(after.x).toBeCloseTo(1.8);
    expect(after.y).toBeCloseTo(-0.7);
    void before;
  });

  it('M-1: pointer drag on junction creates connection via production state machine wiring', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/pointer-drag"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvas = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;

    // (a) pointerdown within junction-1 body (50,50 ∈ [0,0,100,100]) → enter endpoint drag mode
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    // (b) pointermove to device-1 right-middle anchor world (380,130) within snap threshold → snap candidate
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 380, clientY: 130, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    // (c) pointerup → commit
    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: 380, clientY: 130, bubbles: true, pointerId: 1, pointerType: 'mouse' }));

    const conns = handle.connection.listConnections();
    expect(conns).toHaveLength(1);
    expect(conns[0].connection.target).toBe('device-1');
    expect(conns[0].junctionId).toBe('junction-1');
    // plan 2026-08-08-0900-2 Phase 1 / P2 #28：复核 linkage 坐标（snap 锚点归一化值）。
    // pointerup at (380,130) = device-1 right-middle world；snap 算法找到 right 边 (1,0.5) 锚点
    // （归一化相对目标设备几何，非 junction 相对——与 programmaticConnect 的 junction 归一化路径不同）。
    expect(conns[0].connection.x).toBe(1);
    expect(conns[0].connection.y).toBe(0.5);
    // m-2: undo stack top operationKind is 'connection-update' (not 'update-symbol')
    expect(handle.undoRedo.getStackState().topOperationKind).toBe('connection-update');
    expect(handle.undoRedo.getStackState().canUndo).toBe(true);
  });

  it('M-1: pointer drag with no snap target is a noop (no connection written)', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/pointer-noop"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvas = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;

    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    // pointermove far from any candidate anchor → no snap
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 5000, clientY: 5000, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: 5000, clientY: 5000, bubbles: true, pointerId: 1, pointerType: 'mouse' }));

    expect(handle.connection.listConnections()).toHaveLength(0);
    expect(handle.undoRedo.getStackState().canUndo).toBe(false);
  });

  it('M-1: pointerdown not on a junction does not start a connection drag', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/pointer-miss"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const canvas = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;

    // pointerdown on empty area (500,500 — not within any junction/device bounds)
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 500, clientY: 500, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 380, clientY: 130, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: 380, clientY: 130, bubbles: true, pointerId: 1, pointerType: 'mouse' }));

    expect(handle.connection.listConnections()).toHaveLength(0);
  });

  it('M-1: pointer events ignored in preview mode (edit-mode guard)', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/preview-guard"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.switchMode('preview');
    const canvas = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;

    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 380, clientY: 130, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: 380, clientY: 130, bubbles: true, pointerId: 1, pointerType: 'mouse' }));

    expect(handle.connection.listConnections()).toHaveLength(0);
  });

  it('m-2: programmatic connect pushes connection-update operationKind', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-conn/opkind"
        schema={{ type: 'scada-editor-canvas', config: connectionConfig() as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.connection.connect({
      junctionId: 'junction-1',
      connectionId: 'c-opkind',
      targetNodeId: 'device-1',
      targetAnchor: { x: 1, y: 0.5 },
    });
    expect(handle.undoRedo.getStackState().topOperationKind).toBe('connection-update');
  });
});
