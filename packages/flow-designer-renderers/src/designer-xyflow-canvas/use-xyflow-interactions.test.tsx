import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useXyflowInteractions } from './use-xyflow-interactions.js';

// P1-MA4.3-002 sibling / P1-MA4.4-002 regression guard: xyflow remove-change
// -> delete translation. canvas-adapters.md:139-153 names the delete
// translation as the minimum regression surface; the 49 existing renderer
// tests never asserted the remove branch (audit Round A / A-02).

function createParams() {
  return {
    onNodesChangeInternal: vi.fn(),
    onEdgesChangeInternal: vi.fn(),
    onDeleteNode: vi.fn(),
    onDeleteEdge: vi.fn(),
    onMoveNode: vi.fn(),
    onCompleteReconnect: vi.fn(),
    onViewportChange: vi.fn(),
    lastCommittedPositionsRef: { current: new Map<string, string>() },
  } as never as Parameters<typeof useXyflowInteractions>[0];
}

describe('xyflow remove-change -> delete translation (P1-MA4.4-002)', () => {
  it('a node remove change translates to onDeleteNode for that node id', () => {
    const params = createParams();
    const { result } = renderHook(() => useXyflowInteractions(params));

    act(() => {
      result.current.handleNodesChange([
        { type: 'remove', id: 'node-1' },
      ] as never);
    });

    expect(params.onDeleteNode).toHaveBeenCalledTimes(1);
    expect(params.onDeleteNode).toHaveBeenCalledWith('node-1', undefined);
  });

  it('an edge remove change translates to onDeleteEdge for that edge id', () => {
    const params = createParams();
    const { result } = renderHook(() => useXyflowInteractions(params));

    act(() => {
      result.current.handleEdgesChange([
        { type: 'remove', id: 'edge-1' },
      ] as never);
    });

    expect(params.onDeleteEdge).toHaveBeenCalledTimes(1);
    expect(params.onDeleteEdge).toHaveBeenCalledWith('edge-1', undefined);
  });

  it('non-remove changes do not trigger deletes', () => {
    const params = createParams();
    const { result } = renderHook(() => useXyflowInteractions(params));

    act(() => {
      result.current.handleNodesChange([
        { type: 'select', id: 'node-1', selected: true },
      ] as never);
    });

    expect(params.onDeleteNode).not.toHaveBeenCalled();
    expect(params.onDeleteEdge).not.toHaveBeenCalled();
  });
});

// P1-MA5.1-002 (plan 738 R3.1 fix-002 discriminator): Escape must roll an
// active drag back to the pre-drag committed positions and clear the active
// multi-selection. Suite totals alone never exercised handleEscape — this is
// the discriminative unit evidence the 738 closure audit required.
describe('xyflow Escape cancels drag and clears selection (P1-MA5.1-002)', () => {
  it('rolls back dragged nodes to pre-drag positions and deselects on Escape', () => {
    const params = createParams();
    params.lastCommittedPositionsRef.current.set('node-1', '100,200');
    params.lastCommittedPositionsRef.current.set('node-2', '40,60');
    const { result } = renderHook(() => useXyflowInteractions(params));

    act(() => {
      result.current.handleNodesChange([
        { id: 'node-1', type: 'select', selected: true },
        { id: 'node-2', type: 'select', selected: true },
        // drag begins: pre-drag positions are captured from the committed map
        { id: 'node-1', type: 'position', dragging: true, position: { x: 100, y: 200 } },
        { id: 'node-2', type: 'position', dragging: true, position: { x: 40, y: 60 } },
        // drag ends elsewhere: the drag commit lands
        { id: 'node-1', type: 'position', dragging: false, position: { x: 300, y: 400 } },
        { id: 'node-2', type: 'position', dragging: false, position: { x: 500, y: 600 } },
      ] as never);
    });

    params.onNodesChangeInternal.mockClear();

    act(() => {
      result.current.handleEscape();
    });

    const rollbacks = params.onNodesChangeInternal.mock.calls
      .map((call) => call[0])
      .flat() as Array<{ id: string; type: string; position?: { x: number; y: number }; selected?: boolean }>;

    const node1Rollback = rollbacks.find((c) => c.id === 'node-1' && c.type === 'position');
    const node2Rollback = rollbacks.find((c) => c.id === 'node-2' && c.type === 'position');
    expect(node1Rollback?.position).toEqual({ x: 100, y: 200 });
    expect(node2Rollback?.position).toEqual({ x: 40, y: 60 });

    const deselects = rollbacks.filter((c) => c.type === 'select');
    expect(deselects).toHaveLength(2);
    expect(deselects.every((c) => c.selected === false)).toBe(true);
  });

  it('Escape with no active drag and no selection issues no changes', () => {
    const params = createParams();
    const { result } = renderHook(() => useXyflowInteractions(params));

    act(() => {
      result.current.handleEscape();
    });

    expect(params.onNodesChangeInternal).not.toHaveBeenCalled();
  });
});
