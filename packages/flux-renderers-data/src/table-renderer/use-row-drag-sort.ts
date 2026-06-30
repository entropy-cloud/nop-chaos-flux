import { useCallback, useMemo, useRef, useState } from 'react';
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
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
    role: 'button';
    tabIndex: number;
    'aria-label': string;
  };
  dragOverRowKey: string | null;
  draggingRowKey: string | null;
  orderedRows: ReorderableRow[];
  orderedKeys: string[];
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

function buildOrderPayload(nextOrder: string[]): Record<string, number> {
  const payload: Record<string, number> = {};
  nextOrder.forEach((key, index) => {
    payload[key] = index;
  });
  return payload;
}

export function useRowDragSort(options: UseRowDragSortOptions): RowDragSortApi | null {
  const { enabled, orderField, statePath, ownership = 'local', rows, onReorder } = options;
  const renderScope = useRenderScope();
  const [draggingRowKey, setDraggingRowKey] = useState<string | null>(null);
  const [dragOverRowKey, setDragOverRowKey] = useState<string | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);
  // Local persistence of the reordered key sequence. Null means "use the natural
  // order of `rows`". Under 'local' ownership without a statePath, reorder results
  // are retained here so they survive re-renders (P0-1).
  const [localOrderKeys, setLocalOrderKeys] = useState<string[] | null>(null);

  const orderedKeys = useMemo(() => {
    const natural = rows.map((row) => row.rowKey);
    if (!localOrderKeys) {
      return natural;
    }
    // Reconcile against the current rows: drop vanished keys, append new ones.
    const currentKeys = new Set(natural);
    const reconciled = localOrderKeys.filter((key) => currentKeys.has(key));
    const seen = new Set(reconciled);
    for (const key of natural) {
      if (!seen.has(key)) {
        reconciled.push(key);
      }
    }
    return reconciled;
  }, [localOrderKeys, rows]);

  const rowsByKey = useMemo(() => {
    const map = new Map<string, ReorderableRow>();
    for (const row of rows) {
      map.set(row.rowKey, row);
    }
    return map;
  }, [rows]);

  const orderedRows = useMemo(
    () => orderedKeys.map((key) => rowsByKey.get(key)).filter((row): row is ReorderableRow => Boolean(row)),
    [orderedKeys, rowsByKey],
  );

  if (enabled && isDevRuntime()) {
    // H12: mirror sibling hooks (use-column-resize) — scope ownership without a
    // statePath cannot publish reorder results to scope.
    if (ownership === 'scope' && !statePath) {
      console.warn(
        '[TableRenderer] orderOwnership "scope" requires orderStatePath; reorder results cannot be published to scope and fall back to local-only persistence.',
      );
    }
    if (!orderField) {
      console.warn(
        '[TableRenderer] draggable: true should pair with orderField to persist reorder results. ' +
          `Without it, ownership "${ownership}"${statePath ? ` + statePath "${statePath}"` : ' (no statePath)'} ` +
          'cannot publish the new order; the drag will reorder visually but the orderField payload is unavailable.',
      );
    }
    // G10: controlled ownership without an onReorder handler is a fully silent
    // no-op (the order is parent-owned and nothing is notified). Surface it as a
    // dev warning so the misconfiguration is diagnosable instead of invisible.
    if (ownership === 'controlled' && !onReorder) {
      console.warn(
        '[TableRenderer] draggable with orderOwnership "controlled" has no onReorder handler. ' +
          'Drops are a silent no-op: the order stays parent-owned and no handler is notified. ' +
          'Supply onReorder so the parent can persist the new order.',
      );
    }
  }

  // Shared persistence path for both mouse (drop) and keyboard reorder, so the
  // ownership matrix stays consistent across input modalities (H6).
  const commitReorder = useCallback(
    (nextOrder: string[]) => {
      if (ownership === 'scope' && statePath && orderField) {
        renderScope.update(`${statePath}.${orderField}`, buildOrderPayload(nextOrder));
      } else if (ownership === 'local') {
        setLocalOrderKeys(nextOrder);
        if (statePath && orderField) {
          renderScope.update(`${statePath}.${orderField}`, buildOrderPayload(nextOrder));
        }
      }
      // controlled: the parent owns the order; persist nothing locally, just notify.
      onReorder?.(nextOrder);
    },
    [onReorder, orderField, ownership, renderScope, statePath],
  );

  const resetDragState = useCallback(() => {
    setDraggingRowKey(null);
    setDragOverRowKey(null);
    dragStartIndexRef.current = null;
  }, []);

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
        resetDragState();
        return;
      }

      const nextOrder = reorderArray(orderedKeys, fromIndex, rowIndex);
      commitReorder(nextOrder);
      resetDragState();
    },
    [commitReorder, orderedKeys, resetDragState],
  );

  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  // H6: keyboard activation. The drag handle declares role="button" + tabIndex=0,
  // so it must be operable without a mouse (WCAG 2.1 SC 4.1.2 / 2.1.1). ArrowUp /
  // ArrowDown move the row one position along the same commit path as a drop.
  const handleKeyDown = useCallback(
    (rowIndex: number) => (event: React.KeyboardEvent<HTMLElement>) => {
      let targetIndex: number | null = null;
      if (event.key === 'ArrowDown') {
        targetIndex = rowIndex + 1;
      } else if (event.key === 'ArrowUp') {
        targetIndex = rowIndex - 1;
      } else {
        return;
      }
      event.preventDefault();
      if (targetIndex < 0 || targetIndex >= orderedKeys.length) return;
      const nextOrder = reorderArray(orderedKeys, rowIndex, targetIndex);
      commitReorder(nextOrder);
    },
    [commitReorder, orderedKeys],
  );

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
      onKeyDown: handleKeyDown(rowIndex),
      // H19: a click on the handle with no movement must not bubble to the row's
      // onRowClick / expandRowByClick (T8 click-dispatch priority).
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
      },
      role: 'button' as const,
      tabIndex: 0,
      'aria-label': 'Drag to reorder row',
    }),
    [handleDragEnd, handleDragOver, handleDragStart, handleDrop, handleKeyDown],
  );

  if (!enabled) {
    return null;
  }

  return {
    dragHandleProps,
    dragOverRowKey,
    draggingRowKey,
    orderedRows,
    orderedKeys,
  };
}

export type { ReorderableRow };
