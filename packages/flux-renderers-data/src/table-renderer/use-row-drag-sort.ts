import { useCallback, useRef, useState } from 'react';
import { useRenderScope } from '@nop-chaos/flux-react';
import type { TableRowEntry } from './types.js';

type ReorderableRow = TableRowEntry;

export interface RowDragSortApi {
  dragHandleProps: (rowKey: string, rowIndex: number) => {
    'data-slot': 'table-row-drag-handle';
    draggable: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onDragStart: (event: React.DragEvent<HTMLElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLElement>) => void;
    onDrop: (event: React.DragEvent<HTMLElement>) => void;
    onDragEnd: (event: React.DragEvent<HTMLElement>) => void;
    role: 'button';
    tabIndex: number;
    'aria-label': string;
  };
  dragOverRowKey: string | null;
  draggingRowKey: string | null;
}

export interface UseRowDragSortOptions {
  enabled: boolean;
  orderField?: string;
  statePath?: string;
  ownership?: 'local' | 'controlled' | 'scope';
  rows: ReorderableRow[];
  onReorder?: (nextOrder: string[]) => void;
}

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

function reorderArray<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) {
    next.splice(to, 0, moved);
  }
  return next;
}

export function useRowDragSort(options: UseRowDragSortOptions): RowDragSortApi | null {
  const { enabled, orderField, statePath, ownership = 'local', rows, onReorder } = options;
  const renderScope = useRenderScope();
  const [draggingRowKey, setDraggingRowKey] = useState<string | null>(null);
  const [dragOverRowKey, setDragOverRowKey] = useState<string | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);

  if (enabled && !orderField && isDevRuntime()) {
    console.warn(
      '[TableRenderer] draggable: true requires orderField to persist reorder results; drag will work visually but order will be lost on unmount.',
    );
  }

  const handleDragStart = useCallback(
    (rowKey: string, rowIndex: number) => (event: React.DragEvent<HTMLElement>) => {
      setDraggingRowKey(rowKey);
      dragStartIndexRef.current = rowIndex;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try {
          event.dataTransfer.setData('text/plain', rowKey);
        } catch {
          // some test environments do not implement setData
        }
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (rowKey: string) => (event: React.DragEvent<HTMLElement>) => {
      if (draggingRowKey === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      if (dragOverRowKey !== rowKey) {
        setDragOverRowKey(rowKey);
      }
    },
    [dragOverRowKey, draggingRowKey],
  );

  const handleDrop = useCallback(
    (rowKey: string, rowIndex: number) => (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const fromIndex = dragStartIndexRef.current;
      if (fromIndex === null || fromIndex === rowIndex) {
        setDraggingRowKey(null);
        setDragOverRowKey(null);
        dragStartIndexRef.current = null;
        return;
      }

      const nextRows = reorderArray(rows, fromIndex, rowIndex);
      const nextOrder = nextRows.map((row) => row.rowKey);

      if (ownership === 'scope' && statePath && orderField) {
        const payload: Record<string, number> = {};
        nextOrder.forEach((key, index) => {
          payload[key] = index;
        });
        renderScope.update(`${statePath}.${orderField}`, payload);
      } else if (ownership === 'local' && orderField) {
        const payload: Record<string, number> = {};
        nextOrder.forEach((key, index) => {
          payload[key] = index;
        });
        if (statePath) {
          renderScope.update(`${statePath}.${orderField}`, payload);
        }
      }

      onReorder?.(nextOrder);

      setDraggingRowKey(null);
      setDragOverRowKey(null);
      dragStartIndexRef.current = null;
    },
    [onReorder, orderField, ownership, renderScope, rows, statePath],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingRowKey(null);
    setDragOverRowKey(null);
    dragStartIndexRef.current = null;
  }, []);

  const dragHandleProps = useCallback(
    (rowKey: string, rowIndex: number) => ({
      'data-slot': 'table-row-drag-handle' as const,
      draggable: true as const,
      onPointerDown: (_event: React.PointerEvent<HTMLElement>) => {
        // pointer-down placeholder for future pointer-based drag if needed
      },
      onDragStart: handleDragStart(rowKey, rowIndex),
      onDragOver: handleDragOver(rowKey),
      onDrop: handleDrop(rowKey, rowIndex),
      onDragEnd: handleDragEnd,
      role: 'button' as const,
      tabIndex: 0,
      'aria-label': 'Drag to reorder row',
    }),
    [handleDragEnd, handleDragOver, handleDragStart, handleDrop],
  );

  if (!enabled) {
    return null;
  }

  return {
    dragHandleProps,
    dragOverRowKey,
    draggingRowKey,
  };
}

export type { ReorderableRow };
