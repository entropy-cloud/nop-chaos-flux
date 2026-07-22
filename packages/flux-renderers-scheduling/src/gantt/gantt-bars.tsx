import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import { useGanttStore, useGanttTaskSnapshot, useGanttLayoutSnapshot, useGanttTreeSnapshot } from './gantt-context.js';

interface GanttBarsProps {
  className?: string;
  onBarPointerDown?: (e: PointerEvent, taskId: string | number, mode: 'move' | 'resize-start' | 'resize-end', barElement: HTMLElement) => void;
  onLinkHandlePointerDown?: (e: PointerEvent, taskId: string | number, side: 'start' | 'end') => void;
  onBarDoubleClick?: (taskId: string | number) => void;
  onBarKeyAction?: (taskId: string | number, action: 'move-up' | 'move-down' | 'resize-left' | 'resize-right' | 'select') => void;
  taskBarRegion?: RenderRegionHandle;
  onBarClick?: (taskId: string | number) => void;
  onBarDoubleClickEvent?: (taskId: string | number) => void;
  taskBarClassName?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function GanttBars({ className, onBarPointerDown, onLinkHandlePointerDown, onBarDoubleClick, onBarKeyAction, taskBarRegion, onBarClick, onBarDoubleClickEvent, taskBarClassName, scrollContainerRef }: GanttBarsProps) {
  const store = useGanttStore();
  useGanttTaskSnapshot();
  useGanttLayoutSnapshot();
  useGanttTreeSnapshot();
  const barsRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(-1);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const handleScroll = () => {
      setScrollTop(el.scrollTop);
      setViewportHeight(el.clientHeight);
    };
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  const allTasks = store.getVisibleTasks();
  const { tasks: visibleTasks, totalHeight } = scrollTop >= 0
    ? store.getVisibleTaskWindow(scrollTop, viewportHeight || 800, 5)
    : { tasks: allTasks, totalHeight: allTasks.length * store.rowHeight };

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
        const side = (linkHandle as HTMLElement).getAttribute('data-handle-side') as 'start' | 'end' || 'end';
        onLinkHandlePointerDown(e, taskId, side);
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

  const handleBarKeyDownEvent = (e: React.KeyboardEvent, taskId: string | number) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        e.stopPropagation();
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
    <div ref={barsRef} className={cn('nop-gantt-bars absolute left-0 top-0', className)} data-slot="gantt-bars" style={{ width: '100%', height: Math.max(totalHeight, 1) }}>
      {visibleTasks.map((task) => {
        const isMilestone = task.type === 'milestone';
        const isProject = task.type === 'project';

        if (isMilestone) {
          const size = 12;
          const cx = task.$x;
          const cy = task.$y + task.$h / 2;
          return (
            <div
              key={String(task.id)}
              data-task-id={String(task.id)}
              data-bar-type="milestone"
              tabIndex={0}
              role="button"
              aria-label={task.text ? t('scheduling.gantt.taskBarLabel', { text: task.text }) : t('scheduling.gantt.barLabel')}
              className="absolute cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ left: cx - size / 2, top: cy - size / 2, width: size, height: size }}
            >
              <svg className="w-full h-full" style={{ display: 'block' }}>
                <polygon
                  points={`${size / 2},0 ${size},${size / 2} ${size / 2},${size} 0,${size / 2}`}
                  className="nop-gantt-bar-milestone-fill"
                  stroke="var(--color-gantt-milestone-stroke, #d97706)"
                  strokeWidth={1}
                />
              </svg>
              <div
                data-slot="gantt-bar-link-handle"
                data-handle-side="start"
                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
              />
              <div
                data-slot="gantt-bar-link-handle"
                data-handle-side="end"
                className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
              />
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
              taskBarClassName,
            )}
            style={{
              left: task.$x,
              top: task.$y,
              width: Math.max(task.$w, 4),
              height: task.$h,
            }}
            onClick={() => onBarClick?.(task.id)}
            onDoubleClick={() => onBarDoubleClickEvent?.(task.id)}
            onKeyDown={(e) => handleBarKeyDownEvent(e, task.id)}
          >
            {task.progress != null && task.progress > 0 && (
              <div
                data-slot="gantt-bar-progress"
                className="absolute left-0 top-0 h-full nop-gantt-bar-progress rounded-l-sm"
                style={{ width: `${Math.min(task.progress, 100)}%` }}
              />
            )}
            {taskBarRegion ? taskBarRegion.render({ bindings: { task } }) : (
              <span className={cn('nop-gantt-bar-text absolute left-1 top-0 text-[10px] leading-[28px] truncate max-w-[calc(100%-8px)]', taskBarClassName)}>
                {task.text}
              </span>
            )}
            <div
              data-slot="gantt-bar-link-handle"
              data-handle-side="start"
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
            />
            <div
              data-slot="gantt-bar-link-handle"
              data-handle-side="end"
              className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
            />
          </div>
        );
      })}
    </div>
  );
}
