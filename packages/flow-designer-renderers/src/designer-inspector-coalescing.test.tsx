import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, act } from '@testing-library/react';

const mockState: {
  context: {
    dispatch: ReturnType<typeof vi.fn>;
    [key: string]: unknown;
  };
  snapshot: Record<string, unknown>;
} = {
  context: {} as never,
  snapshot: {},
};

vi.mock('./designer-context', async () => {
  const actual = await vi.importActual<typeof import('./designer-context')>('./designer-context');
  return {
    ...actual,
    useDesignerContext: () => mockState.context,
    useDesignerFullSnapshot: () => mockState.snapshot,
    useDesignerSnapshotSelector: (selector: (snapshot: Record<string, unknown>) => unknown) =>
      selector(mockState.snapshot),
    useNodeTypeConfig: (typeId: string) =>
      mockState.context.config.nodeTypes.find((nodeType: { id: string }) => nodeType.id === typeId),
  };
});

vi.mock('./designer-icon', () => ({
  DesignerIcon: () => null,
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => undefined,
  useSchemaProps: (props: { props: Record<string, unknown> }) => props.props,
}));

import { DefaultInspector } from './designer-inspector.js';

function nodeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    doc: { name: 'Test Flow', nodes: [{ id: 'n1' }], edges: [] },
    activeNode: {
      id: 'n1',
      type: 'start',
      data: { label: 'Start', description: 'First node', score: 5 },
      position: { x: 0, y: 0 },
      ...overrides,
    },
    activeEdge: null,
    activeBranch: null,
    selection: { selectedNodeIds: [], selectedEdgeIds: [], activeNodeId: 'n1', activeEdgeId: null, activeBranchId: null },
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    ...overrides,
  } as Record<string, unknown>;
}

describe('inspector keystroke coalescing (plan 2026-09-29-4 R2-P14 / audit F1)', () => {
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers();
    mockState.snapshot = nodeSnapshot();
    mockState.context = {
      config: { toolbar: { items: [] }, palette: { groups: [] }, nodeTypes: [] },
      dispatch: vi.fn(),
      openCreateDialog: vi.fn(),
      designerScope: { materializeVisible: () => mockState.snapshot },
      core: { subscribe: () => () => {}, getSnapshot: () => mockState.snapshot },
    } as never;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function labelInput(container: HTMLElement): HTMLInputElement {
    const inputs = Array.from(container.querySelectorAll('input[type="text"]'));
    const label = inputs.find((el) => (el as HTMLInputElement).value === 'Start');
    if (!label) throw new Error('label input not found');
    return label as HTMLInputElement;
  }

  it('coalesces rapid keystrokes into one dispatch per window and flushes on blur', () => {
    const { container } = render(<DefaultInspector />);
    const input = labelInput(container);

    fireEvent.change(input, { target: { value: 'S' } });
    fireEvent.change(input, { target: { value: 'St' } });
    fireEvent.change(input, { target: { value: 'Sta' } });

    const nodeDataDispatches = () =>
      (mockState.context.dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([cmd]) => (cmd as { type: string }).type === 'updateNodeData',
      );
    expect(nodeDataDispatches().length).toBe(0);

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(nodeDataDispatches().length).toBe(1);
    expect(nodeDataDispatches()[0]![0]).toMatchObject({
      type: 'updateNodeData',
      nodeId: 'n1',
      data: { label: 'Sta' },
    });

    // blur flush: next edit commits on blur without waiting for the window
    fireEvent.change(input, { target: { value: 'Stan' } });
    fireEvent.blur(input);
    expect(nodeDataDispatches().length).toBe(2);
    expect(nodeDataDispatches()[1]![0]).toMatchObject({ data: { label: 'Stan' } });
  });

  it('flushes the pending edit when the active node switches (no lost edit)', () => {
    const { rerender } = render(<DefaultInspector />);
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    const label = inputs.find((el) => (el as HTMLInputElement).value === 'Start') as HTMLInputElement;
    fireEvent.change(label, { target: { value: 'Renamed' } });

    mockState.snapshot = nodeSnapshot({ id: 'n1', label: 'Renamed', activeNodeId: null });
    (mockState.snapshot as Record<string, unknown>).activeNode = null;
    rerender(<DefaultInspector />);

    const nodeDataDispatches = (mockState.context.dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([cmd]) => (cmd as { type: string }).type === 'updateNodeData',
    );
    expect(nodeDataDispatches.length).toBe(1);
    expect(nodeDataDispatches[0]![0]).toMatchObject({ data: { label: 'Renamed' } });
  });

  it('coalesces edge data edits through the same window (audit F1)', () => {
    mockState.snapshot = {
      ...(nodeSnapshot() as Record<string, unknown>),
      activeNode: null,
      activeEdge: { id: 'e1', source: 'n1', target: 'n2', data: { label: 'to' } },
    };
    const { container } = render(<DefaultInspector />);
    const input = Array.from(container.querySelectorAll('input[type="text"]')).find(
      (el) => (el as HTMLInputElement).value === 'to',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'to-next' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    const edgeDispatches = (mockState.context.dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([cmd]) => (cmd as { type: string }).type === 'updateEdgeData',
    );
    expect(edgeDispatches.length).toBe(1);
    expect(edgeDispatches[0]![0]).toMatchObject({ edgeId: 'e1', data: { label: 'to-next' } });
  });
});
