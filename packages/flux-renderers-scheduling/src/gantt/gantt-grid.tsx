import React, { useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import type { GanttTask, GanttColumn, GanttStoreApi } from './gantt.types.js';

function buildDefaultColumns(): GanttColumn[] {
  return [
    { name: 'text', label: t('scheduling.gantt.columnTask'), width: 200, resizable: true },
    { name: 'start', label: t('scheduling.gantt.start'), width: 100 },
    { name: 'end', label: t('scheduling.gantt.end'), width: 100 },
    { name: 'duration', label: t('scheduling.gantt.duration'), width: 60 },
    { name: 'predecessor', label: t('scheduling.gantt.columnPredecessor'), width: 80 },
  ];
}

interface GanttGridProps {
  store: GanttStoreApi;
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
  /** 22-07: 行内编辑提交回调（宿主借此派发 onTaskEdit schema 事件）。 */
  onCellCommit?: (taskId: string | number, column: string, value: string) => void;
}

export function GanttGrid({ store, columns, onSelectTask, selectedTaskId, className, columnRegions, onTaskClick, onTaskDoubleClick, onEmptyCellClick, editable, scrollContainerRef, onCellCommit }: GanttGridProps) {
  const resolvedColumns = columns ?? buildDefaultColumns();
  useSyncExternalStore(store.subscribe, () => store.layoutRevision);
  useSyncExternalStore(store.subscribe, () => store.treeRevision);
  const [editingCell, setEditingCell] = useState<{ taskId: string | number; column: string } | null>(null);

  const tasks = store.getVisibleTasks();
  const rowHeight = store.rowHeight;

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => rowHeight,
    overscan: 5,
  });
  const virtualItems = virtualizer.getVirtualItems();

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
    // 22-07: 行内编辑变更对外派发通道（宿主 onTaskEdit）。
    onCellCommit?.(taskId, column, value);
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
  const totalSize = virtualItems.length > 0 ? virtualizer.getTotalSize() : tasks.length * rowHeight;
  const renderTasks = virtualItems.length > 0
    ? virtualItems.map(vi => ({ task: tasks[vi.index] })).filter(x => x.task)
    : tasks.map((task) => ({ task }));
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div className={cn('nop-gantt-grid h-full overflow-auto min-h-[400px]', className)} data-slot="gantt-grid" role="treegrid" aria-label={t('scheduling.gantt.taskListLabel')} onClick={(e) => { if (e.target === e.currentTarget) onEmptyCellClick?.(); }} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onEmptyCellClick?.(); }}>
      <table className="w-full border-collapse table-fixed">
        <thead data-slot="gantt-grid-header">
          <tr>
            {resolvedColumns.map((col) => (
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
          {virtualItems.length > 0 && paddingTop > 0 && <tr style={{ height: paddingTop, display: 'block' }} />}
          {renderTasks.map(({ task }) => (
            <tr
              key={String(task.id)}
                data-task-id={String(task.id)}
                data-depth={task.$level}
                data-slot="gantt-grid-row"
                role="row"
                aria-level={task.$level + 1}
                aria-setsize={task.$branchSize}
                aria-posinset={task.$posInBranch}
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
                {resolvedColumns.map((col) => (
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
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-expanded={store.isOpen(task.id)}
                            aria-label={store.isOpen(task.id) ? t('scheduling.gantt.collapseTask', { text: task.text }) : t('scheduling.gantt.expandTask', { text: task.text })}
                            className="w-4 h-4 p-0 text-gray-400 hover:text-gray-700 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                          >
                            {'>'}
                          </Button>
                        )}
                        {editingCell?.taskId === task.id && editingCell?.column === 'text' ? (
                          <Input
                            className="w-full h-6 px-1 text-xs"
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
          {virtualItems.length > 0 && paddingBottom > 0 && <tr style={{ height: paddingBottom, display: 'block' }} />}
        </tbody>
      </table>
    </div>
  );
}
