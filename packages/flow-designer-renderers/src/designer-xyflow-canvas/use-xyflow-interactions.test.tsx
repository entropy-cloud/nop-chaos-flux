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
