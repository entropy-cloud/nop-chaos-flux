import { describe, it, expect } from 'vitest';
import { deriveOverlayState, EMPTY_OVERLAY_STATE } from './connection-overlay.js';
import type { ScadaSymbolBounds } from './anchor-snap.js';

const bounds: ScadaSymbolBounds = { id: 'dev-1', x: 100, y: 200, width: 80, height: 60 };

describe('deriveOverlayState (design-connection.md §6)', () => {
  it('emits snap-dot highlight + drag-line when candidate present', () => {
    const state = deriveOverlayState({
      pointerWorld: { x: 240, y: 230 },
      candidate: { nodeId: 'dev-1', normalizedPoint: { x: 1, y: 0.5 }, edge: 'right' },
      candidateBounds: bounds,
    });
    expect(state.highlights).toHaveLength(1);
    expect(state.highlights[0].kind).toBe('snap-dot');
    expect(state.highlights[0].nodeId).toBe('dev-1');
    expect(state.highlights[0].tooltip).toContain('dev-1');
    // anchor world = (180, 230)
    expect(state.highlights[0].world).toEqual({ x: 180, y: 230 });
    expect(state.dragLines).toHaveLength(1);
    expect(state.dragLines[0].from).toEqual({ x: 240, y: 230 });
    expect(state.dragLines[0].to).toEqual({ x: 180, y: 230 });
  });

  it('emits zero-length drag-line (free drag) when no candidate', () => {
    const state = deriveOverlayState({ pointerWorld: { x: 50, y: 50 } });
    expect(state.highlights).toHaveLength(0);
    expect(state.dragLines).toHaveLength(1);
    expect(state.dragLines[0].from).toEqual({ x: 50, y: 50 });
    expect(state.dragLines[0].to).toEqual({ x: 50, y: 50 });
  });

  it('emits zero-length drag-line when candidate present but bounds missing', () => {
    const state = deriveOverlayState({
      pointerWorld: { x: 50, y: 50 },
      candidate: { nodeId: 'dev-1', normalizedPoint: { x: 1, y: 0.5 }, edge: 'right' },
    });
    expect(state.highlights).toHaveLength(0);
    expect(state.dragLines).toHaveLength(1);
    expect(state.dragLines[0].to).toEqual({ x: 50, y: 50 });
  });

  it('EMPTY_OVERLAY_STATE has no marks', () => {
    expect(EMPTY_OVERLAY_STATE.highlights).toEqual([]);
    expect(EMPTY_OVERLAY_STATE.dragLines).toEqual([]);
  });
});
