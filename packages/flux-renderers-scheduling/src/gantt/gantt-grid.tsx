import React, { useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import { useGanttStore, useGanttLayoutSnapshot, useGanttTreeSnapshot } from './gantt-context.js';
import type { GanttTask, GanttColumn } from './gantt.types.js';

const DEFAULT_COLUMNS: GanttColumn[] = [
  { name: 'text', label: 'Task', width: 200, resizable: true },
  { name: 'start', label: 'Start', width: 100 },
  { name: 'end', label: 'End', width: 100 },
  { name: 'duration', label: 'Dur', width: 60 },
  { name: 'predecessor', label: 'Pred', width: 80 },
];

interface GanttGridProps {
  columns?: GanttColumn[];
  onSelectTask?: (taskId: string | number) => void;
  selectedTaskId?: string | number | null;
  className?: string;
  columnRegions?: Record<string, RenderRegionHandle>;
  onTaskClick?: (taskId: string | number) => void;
  onTaskDoubleClick?: (taskId: string | number) => void;
  onEmptyCellClick?: () => void;
  editable?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function GanttGrid({ columns = DEFAULT_COLUMNS, onSelectTask, selectedTaskId, className, columnRegions, onTaskClick, onTaskDoubleClick, onEmptyCellClick, editable, scrollContainerRef }: GanttGridProps) {
  const store = useGanttStore();
  useGanttLayoutSnapshot();
  useGanttTreeSnapshot();
  const [editingCell, setEditingCell] = useState<{ taskId: string | number; column: string } | null>(null);

  const tasks = store.getVisibleTasks();
  const rowHeight = store.rowHeight;

  const [hasScrollContainer, setHasScrollContainer] = useState(false);
  const virtualizer = useVirtualizer({
    count: hasScrollContainer ? tasks.length : 0,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => rowHeight,
    overscan: 5,
  });
  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    setHasScrollContainer(!!scrollContainerRef?.current);
  }, [scrollContainerRef]);

  const handleToggle = (taskId: string | number) => {
    store.toggleOpen(taskId);
  };

  const handleCellClick = (taskId: string | number, column: string) => {
    onTaskClick?.(taskId);
    if (column === 'text') {
      onSelectTask?.(taskId);
    }
  };

  const handleCellDoubleClick = (taskId: string | number, column: string) => {
    onTaskDoubleClick?.(taskId);
    if (column === 'text' && editable !== false) {
      setEditingCell({ taskId, column });
    }
  };

  const handleCellCommit = (taskId: string | number, column: string, value: string) => {
    store.updateTask(taskId, { [column]: value });
    setEditingCell(null);
  };

  const getCellValue = (task: GanttTask, column: GanttColumn): string => {
    switch (column.name) {
      case 'text': return task.text;
      case 'start': return task.start;
      case 'end': return task.end;
      case 'duration': return String(task.duration ?? '');
      case 'predecessor': return task.$target?.join(', ') ?? '';
      default: return (task as any)[column.name] ?? '';
    }
  };

  const getColumnWidth = (column: GanttColumn): number => column.width ?? 100;
  const totalSize = hasScrollContainer ? virtualizer.getTotalSize() : tasks.length * rowHeight;
  const renderTasks = hasScrollContainer
    ? virtualItems.map(vi => ({ task: tasks[vi.index] })).filter(x => x.task)
    : tasks.map((task) => ({ task }));
  const paddingTop = hasScrollContainer && virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = hasScrollContainer && virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div className={cn('nop-gantt-grid h-full overflow-auto min-h-[400px]', className)} data-slot="gantt-grid" role="grid" onClick={(e) => { if (e.target === e.currentTarget) onEmptyCellClick?.(); }} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onEmptyCellClick?.(); }}>
      <table className="w-full border-collapse table-fixed">
        <thead data-slot="gantt-grid-header">
          <tr>
            {columns.map((col) => (
              <th
                key={col.name}
                className="sticky top-0 z-10 bg-gray-100 border-b border-r px-2 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                style={{ width: getColumnWidth(col), minWidth: col.minWidth ?? 50 }}
                data-slot="gantt-grid-header-cell"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasScrollContainer && paddingTop > 0 && <tr style={{ height: paddingTop, display: 'block' }} />}
          {renderTasks.map(({ task }) => (
            <tr
              key={String(task.id)}
                data-task-id={String(task.id)}
                data-depth={task.$level}
                data-slot="gantt-grid-row"
                role="row"
                aria-selected={selectedTaskId === task.id}
                tabIndex={selectedTaskId === task.id ? 0 : -1}
                className={cn(
                  'border-b border-gray-100 hover:bg-blue-50/50',
                  selectedTaskId === task.id && 'bg-blue-50',
                )}
                style={{ height: rowHeight }}
                onClick={() => handleCellClick(task.id, 'text')}
                onDoubleClick={() => handleCellDoubleClick(task.id, 'text')}
              >
                {columns.map((col) => (
                  <td
                    key={col.name}
                    className="border-r px-1 py-0.5 text-xs align-middle"
                    data-slot="gantt-grid-cell"
                    style={{ width: getColumnWidth(col) }}
                    onDoubleClick={() => handleCellDoubleClick(task.id, col.name)}
                  >
                    {col.name === 'text' ? (
                      <div className="flex items-center gap-1" style={{ paddingLeft: task.$level * 16 }}>
                        {store.getVisibleDescendantCount(task.id) > 0 && (
                          <button
                            type="button"
                            aria-expanded={store.isOpen(task.id)}
                            aria-label={store.isOpen(task.id) ? t('scheduling.gantt.collapseTask', { text: task.text }) : t('scheduling.gantt.expandTask', { text: task.text })}
                            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                          >
                            {'>'}
                          </button>
                        )}
                        {editingCell?.taskId === task.id && editingCell?.column === 'text' ? (
                          <input
                            className="w-full border border-blue-400 px-1 py-0.5 text-xs rounded"
                            defaultValue={task.text}
                            onBlur={(e) => handleCellCommit(task.id, 'text', e.currentTarget.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellCommit(task.id, 'text', e.currentTarget.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span className="truncate">{task.text}</span>
                        )}
                      </div>
                      ) : columnRegions?.[col.name] ? columnRegions[col.name].render({ bindings: { task } }) : (
                      <span className="truncate block">{getCellValue(task, col)}</span>
                    )}
                  </td>
                ))}
              </tr>
          ))}
          {hasScrollContainer && paddingBottom > 0 && <tr style={{ height: paddingBottom, display: 'block' }} />}
        </tbody>
      </table>
    </div>
  );
}
