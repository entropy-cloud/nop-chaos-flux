import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { XIcon } from 'lucide-react';
import type { GanttStoreApi } from './gantt.types.js';
import { diffInDays } from './utils/date.js';

interface GanttLinksProps {
  store: GanttStoreApi;
  className?: string;
  onLinkClick?: (linkId: string | number) => void;
  onLinkRemove?: (linkId: string | number) => void;
}

export function GanttLinks({ store, className, onLinkClick, onLinkRemove }: GanttLinksProps) {
  useSyncExternalStore(store.subscribe, () => store.linkRevision);
  useSyncExternalStore(store.subscribe, () => store.layoutRevision);
  const [hoveredLink, setHoveredLink] = useState<string | number | null>(null);

  const tasks = store.getVisibleTasks();
  const totalHeight = tasks.length > 0
    ? tasks.reduce((max, t) => Math.max(max, (t.$y ?? 0) + (t.$h ?? 0)), 0)
    : 0;
  const maxWidth = store.scaleRange
    ? (diffInDays(store.scaleRange.end, store.scaleRange.start) * store.cellWidth)
    : 800;

  const links = Array.from(store.links.values());
  const hasLinks = links.length > 0;

  const handleDelete = (linkId: string | number) => {
    if (onLinkRemove) {
      onLinkRemove(linkId);
    } else {
      store.removeLink(linkId);
    }
  };

  const handleLinkClick = (linkId: string | number) => {
    onLinkClick?.(linkId);
  };

  // FM-1b P1: the hover X anchors at the link midpoint, which for short FS
  // links sits exactly on the source bar's right-edge resize zone. A
  // hover-intent press there used to delete the dependency link instead of
  // interacting with the bar (also the deterministic red behind the e2e
  // "bar drag resize-right changes width"). A render-side reposition of the X
  // breaks onClick dispatch under the react-compiler dev transform (verified
  // by bisect in the FM-1b gantt closure), so ownership is fixed at the event
  // layer instead: a press on the X that lands inside a bar rect is forwarded
  // to the bar, and the click it would produce is suppressed.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const btn = target?.closest?.('.nop-gantt-link-delete-btn') as HTMLElement | null;
      if (!btn) return;
      // Read-only hit-test via the full stack: toggling pointerEvents here
      // would recompute :hover mid-press, fire mouseleave on the link group
      // and unmount the X before the click (FM-1b gantt closure reading).
      const stack = document.elementsFromPoint(e.clientX, e.clientY);
      const btnIdx = stack.indexOf(btn);
      const barEl = btnIdx >= 0
        ? stack.slice(btnIdx + 1).find((el) => el.hasAttribute?.('data-task-id'))
        : null;
      if (barEl) {
        btn.dataset.pressForwardedToBar = '1';
        barEl.dispatchEvent(new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, bubbles: true, cancelable: true }));
      } else {
        btn.dataset.pressForwardedToBar = '0';
      }
    };
    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const btn = target?.closest?.('.nop-gantt-link-delete-btn') as HTMLElement | null;
      if (!btn) return;
      if (btn.dataset.pressForwardedToBar === '1') {
        e.stopPropagation();
        e.preventDefault();
      }
      btn.dataset.pressForwardedToBar = '0';
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClickCapture, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  if (!hasLinks) return null;

  return (
    <svg
      className={cn('nop-gantt-links absolute inset-0 overflow-visible', className)}
      data-slot="gantt-link"
      style={{ width: maxWidth, height: totalHeight || '100%' }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" className="nop-gantt-link-arrow" />
        </marker>
      </defs>
      {links.map((link) => {
        const isHovered = hoveredLink === link.id;
        return (
          <g
            key={String(link.id)}
            onMouseEnter={() => setHoveredLink(link.id)}
            onMouseLeave={() => setHoveredLink(null)}
          >
            <polyline
              points={link.$p}
              fill="none"
              className={cn(
                'nop-gantt-link-line transition-colors duration-150',
                isHovered && 'hovered',
              )}
              strokeWidth={isHovered ? 2.5 : 1.5}
              markerEnd="url(#arrowhead)"
            />
            <polyline
              points={link.$p}
              fill="none"
              stroke="transparent"
              strokeWidth={10}
              className="cursor-pointer"
              style={{ pointerEvents: 'all' }}
              onPointerDown={(e) => {
                (e.target as SVGElement).style.pointerEvents = 'none';
                const elBelow = document.elementFromPoint(e.clientX, e.clientY);
                (e.target as SVGElement).style.pointerEvents = '';
                const barEl = elBelow?.closest('[data-task-id]');
                if (barEl) {
                  const clone = new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, bubbles: true, cancelable: true });
                  barEl.dispatchEvent(clone);
                  return;
                }
              }}
              onClick={() => { handleLinkClick(link.id); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleLinkClick(link.id); } }}
              role="button"
              tabIndex={0}
              aria-label={t('scheduling.gantt.linkLabel', { id: String(link.id) })}
            />
            {isHovered && (
              <foreignObject
                x={(() => {
                  const coords = link.$p.split(' ').map((p) => p.split(',').map(Number));
                  const mid = Math.floor(coords.length / 2);
                  return coords[mid][0];
                })()}
                y={(() => {
                  const coords = link.$p.split(' ').map((p) => p.split(',').map(Number));
                  const mid = Math.floor(coords.length / 2);
                  return coords[mid][1] - 12;
                })()}
                width={20}
                height={20}
              >
                <div
                  className="flex items-center justify-center w-5 h-5 nop-gantt-link-delete-btn rounded-full text-xs cursor-pointer shadow"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => handleDelete(link.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(link.id); }}
                  role="button"
                  tabIndex={0}
                  aria-label={t('scheduling.gantt.deleteLinkLabel')}
                >
                  <XIcon className="size-3" aria-hidden="true" />
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
