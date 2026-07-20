import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { BoardData } from '../kanban.types.js';
import { useColumnDnd } from './use-column-dnd.js';
import { moveColumn } from '../kanban-helpers.js';

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1', 'col2', 'col3'], data: {}, meta: {} },
  col1: { id: 'col1', type: 'column', parentId: 'root', children: [], data: { title: 'A' }, meta: {} },
  col2: { id: 'col2', type: 'column', parentId: 'root', children: [], data: { title: 'B' }, meta: {} },
  col3: { id: 'col3', type: 'column', parentId: 'root', children: [], data: { title: 'C' }, meta: {} },
};

describe('useColumnDnd', () => {
  it('returns registerColumnHeader and registerBoardDropZone functions', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange }),
    );

    expect(result.current.registerColumnHeader).toBeInstanceOf(Function);
    expect(result.current.registerBoardDropZone).toBeInstanceOf(Function);
  });

  it('moveColumn helper reorders columns correctly', () => {
    const result = moveColumn(sampleBoard, 'col3', 0);
    expect(result.root.children).toEqual(['col3', 'col1', 'col2']);
  });

  it('moveColumn helper is immutable', () => {
    const original = JSON.parse(JSON.stringify(sampleBoard));
    moveColumn(sampleBoard, 'col3', 0);
    expect(sampleBoard).toEqual(original);
  });
});
