// @vitest-environment jsdom

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DesignerToolbarContent } from './designer-toolbar';
import { DesignerPaletteContent } from './designer-palette';
import { DefaultInspector } from './designer-inspector';

type MockContext = {
  config: any;
  dispatch: ReturnType<typeof vi.fn>;
  openCreateDialog?: ReturnType<typeof vi.fn>;
  core: { subscribe: () => () => void; getSnapshot: () => any };
};

const mockState: {
  context: MockContext;
  snapshot: any;
  resolve: ReturnType<typeof vi.fn>;
} = {
  context: undefined as unknown as MockContext,
  snapshot: undefined,
  resolve: vi.fn(),
};

vi.mock('./designer-context', () => ({
  useDesignerContext: () => mockState.context,
  useDesignerFullSnapshot: () => mockState.snapshot,
  useDesignerSnapshotSelector: (selector: (s: any) => any) => selector(mockState.snapshot),
  useNodeTypeConfig: (typeId: string) =>
    mockState.context.config.nodeTypes.find((nodeType: { id: string }) => nodeType.id === typeId),
}));

vi.mock('./designer-icon', () => ({
  DesignerIcon: (props: { icon: string; className?: string }) => (
    <span data-testid={`icon-${props.icon}`} className={props.className} />
  ),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentActionScope: () => ({
    resolve: mockState.resolve,
  }),
  useRendererRuntime: () => ({}),
  useRenderScope: () => ({}),
}));

function createSnapshot(overrides: Partial<any> = {}) {
  return {
    canUndo: true,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    selection: {
      selectedNodeIds: [],
      selectedEdgeIds: [],
      activeNodeId: null,
      activeEdgeId: null,
      activeBranchId: null,
    },
    doc: { name: 'Test Flow', nodes: [{ id: 'n1' }], edges: [] },
    activeNode: null,
    activeEdge: null,
    activeBranch: null,
    ...overrides,
  };
}

describe('flow designer controls', () => {
  beforeEach(() => {
    cleanup();
    mockState.resolve = vi.fn();
    mockState.snapshot = createSnapshot();
    mockState.context = {
      config: { toolbar: { items: [] }, palette: { groups: [] }, nodeTypes: [] },
      dispatch: vi.fn(),
      openCreateDialog: vi.fn(),
      core: { subscribe: () => () => {}, getSnapshot: () => mockState.snapshot },
    };
  });

  it('dispatches toolbar commands for action buttons', () => {
    mockState.context.config = {
      ...mockState.context.config,
      toolbar: {
        items: [
          { type: 'button', label: 'Undo', action: 'designer:undo', disabled: '${!canUndo}' },
          { type: 'button', label: 'Redo', action: 'designer:redo', disabled: '${!canRedo}' },
          {
            type: 'button',
            label: 'Grid',
            action: 'designer:toggle-grid',
            active: '${gridEnabled}',
          },
        ],
      },
    };

    render(<DesignerToolbarContent />);

    expect(screen.getByTestId('designer-toolbar').classList.contains('nop-designer-toolbar')).toBe(
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(mockState.context.dispatch).toHaveBeenCalledWith({ type: 'undo' });

    const redoButton = screen.getByRole('button', { name: 'Redo' });
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(redoButton);
    expect(mockState.context.dispatch).toHaveBeenCalledTimes(1);

    const gridButton = screen.getByRole('button', { name: 'Grid' });
    expect((gridButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(gridButton);
    expect(mockState.context.dispatch).toHaveBeenCalledWith({ type: 'toggleGrid' });
  });

  it('uses export toggle callback for JSON toolbar button', () => {
    const onExportToggle = vi.fn();
    mockState.context.config = {
      ...mockState.context.config,
      toolbar: {
        items: [{ type: 'button', label: 'JSON', action: 'designer:export' }],
      },
    };

    render(<DesignerToolbarContent onExportToggle={onExportToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));

    expect(onExportToggle).toHaveBeenCalledTimes(1);
    expect(mockState.context.dispatch).not.toHaveBeenCalled();
  });

  it('invokes upstream action for back button', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    mockState.resolve.mockReturnValue({ method: 'goBack', provider: { invoke } });
    mockState.context.config = {
      ...mockState.context.config,
      toolbar: {
        items: [{ type: 'back', label: 'Back', action: 'designer:navigate-back' }],
      },
    };

    render(<DesignerToolbarContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(mockState.resolve).toHaveBeenCalledWith('designer:navigate-back');
    expect(invoke).toHaveBeenCalledWith('goBack', undefined, expect.any(Object));
  });

  it('dispatches addNode from palette item button click', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    mockState.context.config = {
      ...mockState.context.config,
      nodeTypes: [
        { id: 'task', label: 'Task' },
        { id: 'end', label: 'End' },
      ],
      palette: {
        groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task', 'end'] }],
      },
    };

    render(<DesignerPaletteContent />);
    const paletteItem = document.querySelector('[data-slot="designer-palette-item"]');
    const paletteHeader = document.querySelector('[data-slot="designer-palette-group-header"]');
    expect(paletteHeader?.textContent).toContain('Basic');
    expect(paletteItem).toBeTruthy();
    expect((paletteItem as HTMLElement).querySelectorAll('[data-slot="button"]')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Task' }));

    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'addNode',
      nodeType: 'task',
      position: { x: 180, y: 120 },
    });
    randomSpy.mockRestore();
  });

  it('dispatches delete actions from inspector buttons', () => {
    mockState.snapshot = createSnapshot({
      activeNode: { id: 'node-1', type: 'task', data: { label: 'Task' } },
      activeEdge: null,
    });

    render(<DefaultInspector />);
    expect(document.querySelector('.nop-inspector')).toBeTruthy();
    expect(screen.getByText('名称')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '删除节点' }));
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'deleteNode',
      nodeId: 'node-1',
    });
  });

  it('uses nodeType inspector schema before fallback fields', () => {
    mockState.snapshot = createSnapshot({
      activeNode: { id: 'node-1', type: 'task', data: { label: 'Task' } },
      activeEdge: null,
    });
    mockState.context.config = {
      ...mockState.context.config,
      nodeTypes: [
        {
          id: 'task',
          label: 'Task',
          inspector: { body: { type: 'text', text: 'Schema inspector body' } },
        },
      ],
    };

    render(<DefaultInspector renderSchema={() => <div>Schema inspector body</div>} />);

    expect(screen.getByText('Schema inspector body')).toBeTruthy();
    expect(screen.getByDisplayValue('Task')).toBeTruthy();
    expect(screen.queryByText('action')).toBeNull();
  });

  it('dispatches branch-group editing commands from inspector when active node exposes branches', () => {
    mockState.snapshot = createSnapshot({
      selection: {
        selectedNodeIds: ['node-1'],
        selectedEdgeIds: [],
        activeNodeId: 'node-1',
        activeEdgeId: null,
        activeBranchId: 'b1',
      },
      activeNode: {
        id: 'node-1',
        type: 'condition',
        data: {
          label: 'Gateway',
          branches: [
            {
              id: 'b1',
              data: { label: 'Branch 1', priority: 1 },
              childId: 'n-branch-1',
              childLabel: 'Branch Node 1',
            },
            {
              id: 'b2',
              data: { label: 'Branch 2', priority: 2 },
              childId: 'n-branch-2',
              childLabel: 'Branch Node 2',
            },
            {
              id: 'b3',
              data: { label: 'Branch 3', priority: 3 },
              childId: 'n-branch-3',
              childLabel: 'Branch Node 3',
            },
          ],
        },
      },
      activeBranch: {
        id: 'b1',
        data: { label: 'Branch 1', priority: 1 },
        childId: 'n-branch-1',
        childLabel: 'Branch Node 1',
      },
      activeEdge: null,
    });

    render(<DefaultInspector />);

    fireEvent.change(screen.getByDisplayValue('Branch 1'), {
      target: { value: 'Renamed Branch 1' },
    });
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'updateBranchData',
      nodeId: 'node-1',
      branchId: 'b1',
      data: { label: 'Renamed Branch 1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Move branch 2 left' }));
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'moveBranch',
      nodeId: 'node-1',
      branchId: 'b2',
      direction: 'left',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete branch 3' }));
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'deleteBranch',
      nodeId: 'node-1',
      branchId: 'b3',
    });

    fireEvent.click(screen.getByRole('button', { name: '添加分支' }));
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'addBranch',
      nodeId: 'node-1',
      branchData: { label: '分支 4' },
      childType: 'condition',
      childData: { label: '新分支 4' },
    });

    fireEvent.click(screen.getByText('分支 2'));
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'selectBranch',
      nodeId: 'node-1',
      branchId: 'b2',
    });

    mockState.snapshot = createSnapshot({
      selection: {
        selectedNodeIds: ['node-1'],
        selectedEdgeIds: [],
        activeNodeId: 'node-1',
        activeEdgeId: null,
        activeBranchId: 'b2',
      },
      activeNode: {
        id: 'node-1',
        type: 'condition',
        data: {
          label: 'Gateway',
          branches: [
            {
              id: 'b1',
              data: { label: 'Branch 1', priority: 1 },
              childId: 'n-branch-1',
              childLabel: 'Branch Node 1',
            },
            {
              id: 'b2',
              data: { label: 'Branch 2', priority: 2 },
              childId: 'n-branch-2',
              childLabel: 'Branch Node 2',
            },
            {
              id: 'b3',
              data: { label: 'Branch 3', priority: 3 },
              childId: 'n-branch-3',
              childLabel: 'Branch Node 3',
            },
          ],
        },
      },
      activeBranch: {
        id: 'b2',
        data: { label: 'Branch 2', priority: 2 },
        childId: 'n-branch-2',
        childLabel: 'Branch Node 2',
      },
      activeEdge: null,
    });

    cleanup();
    render(<DefaultInspector />);
    expect(screen.getByText('Branch Node 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '定位节点' }));
    expect(mockState.context.dispatch).toHaveBeenCalledWith({
      type: 'selectNode',
      nodeId: 'n-branch-2',
    });
  });

  it('opens createDialog-configured node types instead of dispatching addNode immediately', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    mockState.context.config = {
      ...mockState.context.config,
      nodeTypes: [
        {
          id: 'task',
          label: 'Task',
          createDialog: { title: 'Create Task', body: { type: 'text', text: 'Dialog body' } },
        },
      ],
      palette: {
        groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task'] }],
      },
    };

    render(<DesignerPaletteContent />);
    const paletteItem = document.querySelector('[data-slot="designer-palette-item"]');
    expect(paletteItem).toBeTruthy();
    fireEvent.click(within(paletteItem as HTMLElement).getByRole('button', { name: 'Task' }));

    expect(mockState.context.openCreateDialog).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task' }),
      { x: 180, y: 120 },
    );
    expect(mockState.context.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'addNode' }),
    );
    randomSpy.mockRestore();
  });
});
