import React, { useState, useCallback } from 'react';
import { cn } from '@nop-chaos/ui';
import { useGanttStore, useGanttStoreSnapshot } from './gantt-context.js';
import { diffInDays } from './utils/date.js';

interface GanttLinksProps {
  className?: string;
}

export function GanttLinks({ className }: GanttLinksProps) {
  const store = useGanttStore();
  useGanttStoreSnapshot();
  const [hoveredLink, setHoveredLink] = useState<string | number | null>(null);

  const tasks = store.getVisibleTasks();
  const totalHeight = tasks.length > 0
    ? tasks.reduce((max, t) => Math.max(max, t.$y + t.$h), 0)
    : 0;
  const maxWidth = store.scaleRange
    ? (diffInDays(store.scaleRange.end, store.scaleRange.start) * store.cellWidth)
    : 800;

  const links = Array.from(store.links.values());
  const hasLinks = links.length > 0;

  const handleDelete = useCallback((linkId: string | number) => {
    store.removeLink(linkId);
  }, [store]);

  if (!hasLinks) return null;

  return (
    <svg
      className={cn('nop-gantt-links absolute inset-0 pointer-events-none overflow-visible', className)}
      data-slot="gantt-link"
      style={{ width: maxWidth, height: totalHeight || '100%' }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#6b7280" />
        </marker>
      </defs>
      {links.map((link) => {
        const isHovered = hoveredLink === link.id;
        return (
          <g key={String(link.id)} className="pointer-events-auto">
            <polyline
              points={link.$p}
              fill="none"
              stroke={isHovered ? '#3b82f6' : '#9ca3af'}
              strokeWidth={isHovered ? 2.5 : 1.5}
              markerEnd="url(#arrowhead)"
              className="transition-colors duration-150"
            />
            <polyline
              points={link.$p}
              fill="none"
              stroke="transparent"
              strokeWidth={10}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredLink(link.id)}
              onMouseLeave={() => setHoveredLink(null)}
              onClick={() => setHoveredLink(link.id === hoveredLink ? null : link.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') setHoveredLink(link.id === hoveredLink ? null : link.id); }}
              role="button"
              tabIndex={0}
              aria-label={`Link ${link.id}`}
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
                  className="flex items-center justify-center w-5 h-5 bg-red-500 text-white rounded-full text-xs cursor-pointer shadow"
                  onClick={() => handleDelete(link.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(link.id); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Delete link"
                >
                  ×
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
