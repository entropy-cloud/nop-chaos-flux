import React, { useRef, useEffect } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useGanttStore, useGanttTaskSnapshot, useGanttLayoutSnapshot, useGanttTreeSnapshot } from './gantt-context.js';

interface GanttBarsProps {
  className?: string;
  onBarPointerDown?: (e: PointerEvent, taskId: string | number, mode: 'move' | 'resize-start' | 'resize-end', barElement: HTMLElement) => void;
  onLinkHandlePointerDown?: (e: PointerEvent, taskId: string | number) => void;
  onBarDoubleClick?: (taskId: string | number) => void;
  onBarKeyAction?: (taskId: string | number, action: 'move-up' | 'move-down' | 'resize-left' | 'resize-right' | 'select') => void;
}

export function GanttBars({ className, onBarPointerDown, onLinkHandlePointerDown, onBarDoubleClick, onBarKeyAction }: GanttBarsProps) {
  const store = useGanttStore();
  useGanttTaskSnapshot();
  useGanttLayoutSnapshot();
  useGanttTreeSnapshot();
  const tasks = store.getVisibleTasks();
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const barsEl = barsRef.current;
    if (!barsEl) return;
    if (!onBarPointerDown && !onLinkHandlePointerDown) return;

    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const barEl = target.closest('[data-task-id]') as HTMLElement | null;
      if (!barEl) return;
      const taskId = barEl.getAttribute('data-task-id');
      if (!taskId) return;

      const linkHandle = target.closest('[data-slot="gantt-bar-link-handle"]');
      if (linkHandle && onLinkHandlePointerDown) {
        onLinkHandlePointerDown(e, taskId);
        return;
      }

      if (!onBarPointerDown) return;
      const barRect = barEl.getBoundingClientRect();
      const x = e.clientX - barRect.left;
      const edgeThreshold = 6;
      let mode: 'move' | 'resize-start' | 'resize-end';
      if (x < edgeThreshold) mode = 'resize-start';
      else if (x > barRect.width - edgeThreshold) mode = 'resize-end';
      else mode = 'move';
      onBarPointerDown(e, taskId, mode, barEl);
    };

    barsEl.addEventListener('pointerdown', handler);
    return () => barsEl.removeEventListener('pointerdown', handler);
  }, [onBarPointerDown, onLinkHandlePointerDown]);

  const handleBarKeyDown = (e: React.KeyboardEvent, taskId: string | number) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onBarKeyAction?.(taskId, 'resize-left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        onBarKeyAction?.(taskId, 'resize-right');
        break;
      case 'ArrowUp':
        e.preventDefault();
        onBarKeyAction?.(taskId, 'move-up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onBarKeyAction?.(taskId, 'move-down');
        break;
      case ' ':
      case 'Space':
        e.preventDefault();
        onBarKeyAction?.(taskId, 'select');
        break;
      case 'Enter':
        e.preventDefault();
        onBarDoubleClick?.(taskId);
        break;
    }
  };

  useEffect(() => {
    const barsEl = barsRef.current;
    if (!barsEl || !onBarDoubleClick) return;
    const dblHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const barEl = target.closest('[data-task-id]') as HTMLElement | null;
      if (!barEl) return;
      const taskId = barEl.getAttribute('data-task-id');
      if (taskId) onBarDoubleClick(taskId);
    };
    barsEl.addEventListener('dblclick', dblHandler);
    return () => barsEl.removeEventListener('dblclick', dblHandler);
  }, [onBarDoubleClick]);

  return (
    <div ref={barsRef} className={cn('nop-gantt-bars absolute inset-0', className)} data-slot="gantt-bars">
      {tasks.map((task) => {
        const isMilestone = task.type === 'milestone';
        const isProject = task.type === 'project';

        if (isMilestone) {
          const size = 12;
          const cx = task.$x;
          const cy = task.$y + task.$h / 2;
          return (
            <div key={String(task.id)} data-task-id={String(task.id)} data-bar-type="milestone">
              <svg
                className="absolute pointer-events-none"
                style={{ left: cx - size / 2, top: cy - size / 2, width: size, height: size }}
              >
                <polygon
                  points={`${size / 2},0 ${size},${size / 2} ${size / 2},${size} 0,${size / 2}`}
                  className="nop-gantt-bar-milestone-fill"
                  stroke="var(--color-gantt-milestone-stroke, #d97706)"
                  strokeWidth={1}
                />
              </svg>
            </div>
          );
        }

        return (
          <div
            key={String(task.id)}
            data-task-id={String(task.id)}
            data-bar-type={task.type ?? 'task'}
            data-slot="gantt-bar"
            tabIndex={0}
            role="button"
            aria-label={task.text ? t('scheduling.gantt.taskBarLabel', { text: task.text }) : t('scheduling.gantt.barLabel')}
            aria-roledescription="gantt bar"
            className={cn(
              'absolute rounded-sm group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400',
              isProject ? 'nop-gantt-bar-project' : 'nop-gantt-bar-task',
            )}
            style={{
              left: task.$x,
              top: task.$y,
              width: Math.max(task.$w, 4),
              height: task.$h,
            }}
            onKeyDown={(e) => handleBarKeyDown(e, task.id)}
          >
            {task.progress != null && task.progress > 0 && (
              <div
                data-slot="gantt-bar-progress"
                className="absolute left-0 top-0 h-full nop-gantt-bar-progress rounded-l-sm"
                style={{ width: `${Math.min(task.progress, 100)}%` }}
              />
            )}
            <span className="nop-gantt-bar-text absolute left-1 top-0 text-[10px] leading-[28px] truncate max-w-[calc(100%-8px)]">
              {task.text}
            </span>
            <div
              data-slot="gantt-bar-link-handle"
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
              style={{ left: 0 }}
            />
            <div
              data-slot="gantt-bar-link-handle"
              className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
            />
          </div>
        );
      })}
    </div>
  );
}
