import { describe, it, expect } from 'vitest';
import { createMultiSelectState, handleMultiSelectClick, clearSelection, selectAll } from './multi-select.js';
import type { GanttId } from '../gantt.types.js';

const ids: GanttId[] = ['t1', 't2', 't3', 't4', 't5'];

describe('multi-select', () => {
  it('starts empty', () => {
    const state = createMultiSelectState();
    expect(state.selectedIds.size).toBe(0);
    expect(state.lastClickedId).toBeNull();
  });

  it('single click selects one task', () => {
    const state = createMultiSelectState();
    const next = handleMultiSelectClick(state, 't1', ids, { shiftKey: false, ctrlKey: false, metaKey: false });
    expect(next.selectedIds.size).toBe(1);
    expect(next.selectedIds.has('t1')).toBe(true);
    expect(next.rangeAnchorId).toBe('t1');
  });

  it('Shift+Click selects range', () => {
    const state = createMultiSelectState();
    const clicked = handleMultiSelectClick(state, 't2', ids, { shiftKey: false, ctrlKey: false, metaKey: false });
    const range = handleMultiSelectClick(clicked, 't4', ids, { shiftKey: true, ctrlKey: false, metaKey: false });
    expect(range.selectedIds.size).toBe(3);
    expect(range.selectedIds.has('t2')).toBe(true);
    expect(range.selectedIds.has('t3')).toBe(true);
    expect(range.selectedIds.has('t4')).toBe(true);
  });

  it('Ctrl+Click toggles individual selection', () => {
    const state = createMultiSelectState();
    const clicked = handleMultiSelectClick(state, 't1', ids, { shiftKey: false, ctrlKey: false, metaKey: false });
    const ctrl = handleMultiSelectClick(clicked, 't3', ids, { shiftKey: false, ctrlKey: true, metaKey: false });
    expect(ctrl.selectedIds.size).toBe(2);
    expect(ctrl.selectedIds.has('t1')).toBe(true);
    expect(ctrl.selectedIds.has('t3')).toBe(true);
  });

  it('Ctrl+Click on selected task deselects it', () => {
    const state = createMultiSelectState();
    const clicked = handleMultiSelectClick(state, 't1', ids, { shiftKey: false, ctrlKey: false, metaKey: false });
    const ctrl = handleMultiSelectClick(clicked, 't1', ids, { shiftKey: false, ctrlKey: true, metaKey: false });
    expect(ctrl.selectedIds.size).toBe(0);
  });

  it('clearSelection resets state', () => {
    const state = createMultiSelectState();
    const clicked = handleMultiSelectClick(state, 't1', ids, { shiftKey: false, ctrlKey: false, metaKey: false });
    expect(clicked.selectedIds.size).toBe(1);
    const cleared = clearSelection();
    expect(cleared.selectedIds.size).toBe(0);
    expect(cleared.lastClickedId).toBeNull();
  });

  it('selectAll selects all visible tasks', () => {
    const state = selectAll(ids);
    expect(state.selectedIds.size).toBe(5);
    expect(state.selectedIds.has('t1')).toBe(true);
    expect(state.selectedIds.has('t5')).toBe(true);
  });

  it('Shift+Click with Ctrl preserves existing selection', () => {
    const state = createMultiSelectState();
    const clicked = handleMultiSelectClick(state, 't1', ids, { shiftKey: false, ctrlKey: false, metaKey: false });
    const ctrl = handleMultiSelectClick(clicked, 't3', ids, { shiftKey: false, ctrlKey: true, metaKey: false });
    const range = handleMultiSelectClick(ctrl, 't5', ids, { shiftKey: true, ctrlKey: false, metaKey: false });
    expect(range.selectedIds.size).toBe(5);
  });
});
