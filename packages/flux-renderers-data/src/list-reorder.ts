import { useCallback, useMemo, useState } from 'react';
import { t } from '@nop-chaos/flux-i18n';

/**
 * G6D contract (docs/components/list/design.md §8/§10): reorder is a
 * display-collection, event-mediated capability — the list never writes data
 * itself; the host writes scope `items` back from the `onReorder` payload.
 * This hook follows the table row drag-sort DnD conventions (HTML5 DnD on the
 * handle element, ArrowUp/ArrowDown per-move commit, data-dragging /
 * data-drag-over markers) without importing the table-private module.
 */

export interface ListReorderHandleProps {
  'data-slot': 'list-item-drag-handle';
  draggable: boolean;
  role: 'button';
  tabIndex: number;
  'aria-label': string;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

type ListReorderPayload = {
  type: 'list:reorder';
  items: unknown[];
  keys: string[];
};

interface ListReorderApi {
  handleProps: (key: string, index: number) => ListReorderHandleProps;
  isDragging: (key: string) => boolean;
  isOver: (key: string) => boolean;
}

function reorderArray<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) {
    return next;
  }
  next.splice(to, 0, moved);
  return next;
}

export function useListReorder(input: {
  enabled: boolean;
  items: readonly unknown[];
  keys: readonly string[];
  onReorder?: (payload: ListReorderPayload) => void;
}): ListReorderApi {
  const { enabled, items, keys, onReorder } = input;
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const commit = useCallback(
    (from: number, to: number) => {
      if (from < 0 || to < 0 || from === to || from >= items.length || to >= items.length) {
        return;
      }
      onReorder?.({
        type: 'list:reorder',
        items: reorderArray(items, from, to),
        keys: reorderArray(keys, from, to),
      });
    },
    [items, keys, onReorder],
  );

  return useMemo(
    () => ({
      handleProps(key: string, index: number): ListReorderHandleProps {
        return {
          'data-slot': 'list-item-drag-handle',
          draggable: true,
          role: 'button',
          tabIndex: 0,
          'aria-label': t('flux.list.dragToReorder'),
          onPointerDown: (event) => {
            event.stopPropagation();
          },
          onClick: (event) => {
            // design.md §8: handle click must not trigger item selection.
            event.stopPropagation();
          },
          onDragStart: (event) => {
            setDraggingKey(key);
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move';
              // jsdom/happy-dom stubs may not implement setData
              if (typeof event.dataTransfer.setData === 'function') {
                event.dataTransfer.setData('text/plain', key);
              }
            }
          },
          onDragOver: (event) => {
            event.preventDefault();
            if (draggingKey !== null && draggingKey !== key) {
              setOverKey(key);
            }
          },
          onDrop: (event) => {
            event.preventDefault();
            const from = draggingKey !== null ? keys.indexOf(draggingKey) : -1;
            commit(from, index);
            setDraggingKey(null);
            setOverKey(null);
          },
          onDragEnd: () => {
            setDraggingKey(null);
            setOverKey(null);
          },
          onKeyDown: (event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              commit(index, index - 1);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              commit(index, index + 1);
            }
          },
        };
      },
      isDragging: (key: string) => enabled && draggingKey === key,
      isOver: (key: string) => enabled && overKey === key && draggingKey !== null && overKey !== draggingKey,
    }),
    [commit, draggingKey, enabled, keys, overKey],
  );
}
