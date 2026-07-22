import { useEffect } from 'react';
import type { GanttStore } from '../gantt-store.js';
import { t } from '@nop-chaos/flux-i18n';

interface UseGanttKeyboardOptions {
  store: GanttStore;
  containerRef: React.RefObject<HTMLElement | null>;
  selectedTaskId: string | number | null;
  onSelectTask: (id: string | number | null) => void;
  onOpenEditor?: (id: string | number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useGanttKeyboard({
  store,
  containerRef,
  selectedTaskId,
  onSelectTask,
  onOpenEditor,
  onUndo,
  onRedo,
}: UseGanttKeyboardOptions) {

  const updateRowAria = (taskId: string | number, isSelected: boolean) => {
    const container = containerRef.current;
    if (!container) return;
    const row = container.querySelector(`[data-task-id="${String(taskId)}"]`);
    if (row) {
      row.setAttribute('role', 'row');
      row.setAttribute('aria-selected', String(isSelected));
      row.setAttribute('tabindex', isSelected ? '0' : '-1');
      if (isSelected) (row as HTMLElement).focus();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          e.preventDefault();
          const tasks = store.getVisibleTasks();
          if (tasks.length === 0) return;
          let idx = selectedTaskId ? tasks.findIndex((t) => t.id === selectedTaskId) : -1;
          if (e.key === 'ArrowDown') idx = Math.min(idx + 1, tasks.length - 1);
          else idx = Math.max(idx - 1, 0);
          if (idx >= 0) {
            onSelectTask(tasks[idx].id);
            updateRowAria(tasks[idx].id, true);
          }
          break;
        }
        case 'ArrowLeft': {
          if (!selectedTaskId) break;
          e.preventDefault();
          const task = store.tasks.get(selectedTaskId);
          if (!task) break;
          const children = store.getVisibleDescendantCount(selectedTaskId);
          if (children > 0 && store.isOpen(selectedTaskId)) {
            store.toggleOpen(selectedTaskId);
          }
          break;
        }
        case 'ArrowRight': {
          if (!selectedTaskId) break;
          e.preventDefault();
          const task = store.tasks.get(selectedTaskId);
          if (!task) break;
          const children = store.getVisibleDescendantCount(selectedTaskId);
          if (children > 0 && !store.isOpen(selectedTaskId)) {
            store.toggleOpen(selectedTaskId);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (selectedTaskId && onOpenEditor) {
            onOpenEditor(selectedTaskId);
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          if (!selectedTaskId) break;
          e.preventDefault();
          const tasks = store.getVisibleTasks();
          const _deletedIdx = tasks.findIndex((t) => t.id === selectedTaskId);
          store.deleteTask(selectedTaskId);
          onSelectTask(null);
          containerRef.current?.focus();
          break;
        }
        case 'z':
        case 'Z': {
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey && onUndo) {
            e.preventDefault();
            onUndo();
          } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && onRedo) {
            e.preventDefault();
            onRedo();
          }
          break;
        }
      }
    };

    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'grid');
    el.setAttribute('aria-label', t('scheduling.gantt.chartLabel'));
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
    };
  /* eslint-disable react-hooks/exhaustive-deps, react-compiler/react-compiler */
  }, [containerRef, selectedTaskId, onSelectTask, onOpenEditor, onUndo, onRedo, updateRowAria]);
  /* eslint-enable react-hooks/exhaustive-deps, react-compiler/react-compiler */

  return { updateRowAria };
}
