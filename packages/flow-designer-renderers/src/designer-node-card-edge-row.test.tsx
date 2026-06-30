import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { DesignerNodeCardRenderer } from './designer-node-card.js';
import { DesignerEdgeRowRenderer } from './designer-edge-row.js';
import {
  DesignerContext,
  type DesignerContextValue,
} from './designer-context.js';

type MockContext = {
  config: any;
  dispatch: ReturnType<typeof vi.fn>;
  core: { subscribe: () => () => void; getSnapshot: () => DesignerSnapshot };
  nodeTypes: { id: string; label: string; icon?: string }[];
  edgeTypes: { id: string; label: string }[];
};

const mockState: {
  context: MockContext;
  snapshot: DesignerSnapshot;
} = {
  context: undefined as unknown as MockContext,
  snapshot: undefined as unknown as DesignerSnapshot,
};

vi.mock('./designer-context', async () => {
  const actual = await vi.importActual<typeof import('./designer-context')>('./designer-context');
  return {
    ...actual,
    useDesignerContext: () => {
      if (mockState.context == null) {
        return actual.useDesignerContext();
      }
      return mockState.context;
    },
    useDesignerSnapshotSelector: (selector: (s: DesignerSnapshot) => unknown) =>
      selector(mockState.snapshot),
    useNodeTypeConfig: (typeId: string) =>
      mockState.context?.nodeTypes.find((nodeType) => nodeType.id === typeId),
    useEdgeTypeConfig: (typeId: string) =>
      mockState.context?.edgeTypes.find((edgeType) => edgeType.id === typeId),
    useNormalizedConfig: () => ({
      nodeTypes: new Map((mockState.context?.nodeTypes ?? []).map((n) => [n.id, n])),
      edgeTypes: new Map((mockState.context?.edgeTypes ?? []).map((e) => [e.id, e])),
      rules: {},
      features: {},
      canvas: {},
    }),
  };
});

vi.mock('./designer-icon', () => ({
  DesignerIcon: (props: { icon?: string; className?: string }) => (
    <span data-testid={`icon-${props.icon}`} className={props.className} data-icon={props.icon} />
  ),
}));

function createSnapshot(overrides: Partial<DesignerSnapshot> = {}): DesignerSnapshot {
  return {
    doc: {
      id: 'doc-1',
      kind: 'flow',
      name: 'Test',
      version: '1.0.0',
      nodes: [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 10, y: 20 },
          data: { label: 'Task' },
        },
        {
          id: 'node-2',
          type: 'end',
          position: { x: 30, y: 40 },
          data: {},
        },
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'default',
          source: 'node-1',
          target: 'node-2',
          sourcePort: 'out',
          data: {},
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    selection: {
      selectedNodeIds: [],
      selectedEdgeIds: [],
      activeNodeId: null,
      activeEdgeId: null,
      activeBranchId: null,
    },
    activeNode: null,
    activeEdge: null,
    activeBranch: null,
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    viewport: { x: 0, y: 0, zoom: 1 },
    ...overrides,
  };
}

function createMockContext(snapshot: DesignerSnapshot): MockContext {
  return {
    config: { toolbar: { items: [] }, palette: { groups: [] }, nodeTypes: [] },
    dispatch: vi.fn(),
    nodeTypes: [
      { id: 'task', label: 'Task Node', icon: 'workflow' },
      { id: 'end', label: 'End Node' },
    ],
    edgeTypes: [{ id: 'default', label: 'Default Edge' }],
    core: { subscribe: () => () => {}, getSnapshot: () => snapshot },
  };
}

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    path: '/r1' as const,
    schema: { type: 'designer-node-card' } as any,
    templateNode: {} as any,
    node: {} as any,
    props: { ...overrides } as any,
    meta: { className: undefined, testid: undefined, cid: undefined } as any,
    regions: {} as any,
    events: {} as any,
    helpers: {} as any,
  };
}

function wrapInContext(node: React.ReactNode) {
  const ctx = mockState.context as unknown as DesignerContextValue;
  return <DesignerContext.Provider value={ctx}>{node}</DesignerContext.Provider>;
}

describe('designer-node-card renderer', () => {
  beforeEach(() => {
    cleanup();
    mockState.snapshot = createSnapshot();
    mockState.context = createMockContext(mockState.snapshot);
  });
  afterEach(() => cleanup());

  it('emits the nop-designer-node-card marker and resolves type label + position when nodeId matches', () => {
    const { container } = render(
      wrapInContext(<DesignerNodeCardRenderer {...createProps({ nodeId: 'node-1' })} />),
    );
    const card = container.querySelector('.nop-designer-node-card');
    expect(card).toBeTruthy();
    expect(card?.getAttribute('data-node-id')).toBe('node-1');
    expect(card?.getAttribute('data-node-type')).toBe('task');
    expect(card?.textContent).toContain('Task Node');
    expect(card?.textContent).toContain('task');
    expect(card?.textContent).toContain('x:10');
    expect(card?.textContent).toContain('y:20');
  });

  it('dispatches selectNode command on click (focus)', () => {
    const { container } = render(
      wrapInContext(<DesignerNodeCardRenderer {...createProps({ nodeId: 'node-1' })} />),
    );
    const card = container.querySelector('.nop-designer-node-card') as HTMLElement;
    fireEvent.click(card);
    expect(mockState.context.dispatch).toHaveBeenCalledWith({ type: 'selectNode', nodeId: 'node-1' });
  });

  it('reflects active/selected selection state as data attributes', () => {
    mockState.snapshot = createSnapshot({
      selection: {
        selectedNodeIds: ['node-1'],
        selectedEdgeIds: [],
        activeNodeId: 'node-1',
        activeEdgeId: null,
        activeBranchId: null,
      },
    });
    mockState.context = createMockContext(mockState.snapshot);
    const { container } = render(
      wrapInContext(<DesignerNodeCardRenderer {...createProps({ nodeId: 'node-1' })} />),
    );
    const card = container.querySelector('.nop-designer-node-card') as HTMLElement;
    expect(card.getAttribute('data-active')).toBe('true');
    expect(card.getAttribute('data-selected')).toBe('true');
    expect(card.className).toContain('nop-designer-node-card--active');
  });

  it('degrades to an empty placeholder without throwing when nodeId is missing (node-card-missing / node-card-no-id)', () => {
    const missing = render(wrapInContext(<DesignerNodeCardRenderer {...createProps({ nodeId: 'missing' })} />));
    const missingCard = missing.container.querySelector('.nop-designer-node-card');
    expect(missingCard).toBeTruthy();
    expect(missingCard?.getAttribute('data-empty')).toBe('true');
    expect(missingCard?.getAttribute('aria-hidden')).toBe('true');
    missing.unmount();

    const empty = render(wrapInContext(<DesignerNodeCardRenderer {...createProps({})} />));
    const emptyCard = empty.container.querySelector('.nop-designer-node-card');
    expect(emptyCard).toBeTruthy();
    expect(emptyCard?.getAttribute('data-empty')).toBe('true');
    expect(emptyCard?.getAttribute('data-node-id')).toBeNull();
  });

  it('throws when rendered outside designer context (context-leak)', () => {
    const previousContext = mockState.context;
    mockState.context = undefined as unknown as MockContext;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<DesignerNodeCardRenderer {...createProps({ nodeId: 'node-1' })} />),
    ).toThrow(/designer-page/);
    errorSpy.mockRestore();
    mockState.context = previousContext;
  });
});

describe('designer-edge-row renderer', () => {
  beforeEach(() => {
    cleanup();
    mockState.snapshot = createSnapshot();
    mockState.context = createMockContext(mockState.snapshot);
  });
  afterEach(() => cleanup());

  it('emits the nop-designer-edge-row marker and renders source → target with edge type label', () => {
    const { container } = render(
      wrapInContext(<DesignerEdgeRowRenderer {...createProps({ edgeId: 'edge-1' })} />),
    );
    const row = container.querySelector('.nop-designer-edge-row');
    expect(row).toBeTruthy();
    expect(row?.getAttribute('data-edge-id')).toBe('edge-1');
    expect(row?.getAttribute('data-edge-type')).toBe('default');
    expect(row?.textContent).toContain('Task Node');
    expect(row?.textContent).toContain('End Node');
    expect(row?.textContent).toContain('Default Edge');
  });

  it('dispatches selectEdge command on click (focus edge)', () => {
    const { container } = render(
      wrapInContext(<DesignerEdgeRowRenderer {...createProps({ edgeId: 'edge-1' })} />),
    );
    const row = container.querySelector('.nop-designer-edge-row') as HTMLElement;
    fireEvent.click(row);
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'selectEdge',
      edgeId: 'edge-1',
    });
  });

  it('degrades to an empty placeholder without throwing when edgeId is missing (edge-row-missing)', () => {
    const { container } = render(
      wrapInContext(<DesignerEdgeRowRenderer {...createProps({ edgeId: 'missing-edge' })} />),
    );
    const row = container.querySelector('.nop-designer-edge-row');
    expect(row).toBeTruthy();
    expect(row?.getAttribute('data-empty')).toBe('true');
    expect(row?.getAttribute('aria-hidden')).toBe('true');
  });

  it('throws when rendered outside designer context (context-leak)', () => {
    const previousContext = mockState.context;
    mockState.context = undefined as unknown as MockContext;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<DesignerEdgeRowRenderer {...createProps({ edgeId: 'edge-1' })} />),
    ).toThrow(/designer-page/);
    errorSpy.mockRestore();
    mockState.context = previousContext;
  });
});
