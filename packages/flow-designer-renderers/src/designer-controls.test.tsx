// @vitest-environment jsdom

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DesignerToolbarContent } from './designer-toolbar';
import { DesignerPaletteContent } from './designer-palette';
import { DefaultInspector } from './designer-inspector';

type MockContext = {
  config: any;
  snapshot: any;
  dispatch: ReturnType<typeof vi.fn>;
};

let mockContext: MockContext;
let mockResolve = vi.fn();

vi.mock('./designer-context', () => ({
  useDesignerContext: () => mockContext
}));

vi.mock('./designer-icon', () => ({
  DesignerIcon: (props: { icon: string; className?: string }) => <span data-testid={`icon-${props.icon}`} className={props.className} />
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentActionScope: () => ({
    resolve: mockResolve
  }),
  useRendererRuntime: () => ({}),
  useRenderScope: () => ({})
}));

function createSnapshot(overrides: Partial<any> = {}) {
  return {
    canUndo: true,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    doc: { name: 'Test Flow', nodes: [{ id: 'n1' }], edges: [] },
    activeNode: null,
    activeEdge: null,
    ...overrides
  };
}

describe('flow designer controls', () => {
  beforeEach(() => {
    mockResolve = vi.fn();
    mockContext = {
      config: { toolbar: { items: [] }, palette: { groups: [] }, nodeTypes: [] },
      snapshot: createSnapshot(),
      dispatch: vi.fn()
    };
  });

  it('dispatches toolbar commands for action buttons', () => {
    mockContext.config = {
      ...mockContext.config,
      toolbar: {
        items: [
          { type: 'button', label: 'Undo', action: 'designer:undo', disabled: '${!canUndo}' },
          { type: 'button', label: 'Redo', action: 'designer:redo', disabled: '${!canRedo}' },
          { type: 'button', label: 'Grid', action: 'designer:toggle-grid', active: '${gridEnabled}' }
        ]
      }
    };

    render(<DesignerToolbarContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(mockContext.dispatch).toHaveBeenCalledWith({ type: 'undo' });

    const redoButton = screen.getByRole('button', { name: 'Redo' });
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(redoButton);
    expect(mockContext.dispatch).toHaveBeenCalledTimes(1);

    const gridButton = screen.getByRole('button', { name: 'Grid' });
    expect((gridButton as HTMLElement).getAttribute('data-variant')).toBe('default');
    fireEvent.click(gridButton);
    expect(mockContext.dispatch).toHaveBeenCalledWith({ type: 'toggleGrid' });
  });

  it('uses export toggle callback for JSON toolbar button', () => {
    const onExportToggle = vi.fn();
    mockContext.config = {
      ...mockContext.config,
      toolbar: {
        items: [{ type: 'button', label: 'JSON', action: 'designer:export' }]
      }
    };

    render(<DesignerToolbarContent onExportToggle={onExportToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));

    expect(onExportToggle).toHaveBeenCalledTimes(1);
    expect(mockContext.dispatch).not.toHaveBeenCalled();
  });

  it('invokes upstream action for back button', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    mockResolve.mockReturnValue({ method: 'goBack', provider: { invoke } });
    mockContext.config = {
      ...mockContext.config,
      toolbar: {
        items: [{ type: 'back', label: 'Back', action: 'designer:navigate-back' }]
      }
    };

    render(<DesignerToolbarContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(mockResolve).toHaveBeenCalledWith('designer:navigate-back');
    expect(invoke).toHaveBeenCalledWith('goBack', undefined, expect.any(Object));
  });

  it('dispatches addNode from palette item button click', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    mockContext.config = {
      ...mockContext.config,
      nodeTypes: [
        { id: 'task', label: 'Task' },
        { id: 'end', label: 'End' }
      ],
      palette: {
        groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task', 'end'] }]
      }
    };

    render(<DesignerPaletteContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Task' }));

    expect(mockContext.dispatch).toHaveBeenCalledWith({
      type: 'addNode',
      nodeType: 'task',
      position: { x: 180, y: 120 }
    });
    randomSpy.mockRestore();
  });

  it('dispatches delete actions from inspector buttons', () => {
    mockContext.snapshot = createSnapshot({
      activeNode: { id: 'node-1', type: 'task', data: { label: 'Task' } },
      activeEdge: null
    });

    render(<DefaultInspector />);
    fireEvent.click(screen.getByRole('button', { name: '删除节点' }));
    expect(mockContext.dispatch).toHaveBeenCalledWith({ type: 'deleteNode', nodeId: 'node-1' });
  });
});
