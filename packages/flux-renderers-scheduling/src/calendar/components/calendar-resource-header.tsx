import React from 'react';
import type { CalendarResource } from '../../schemas.js';

export interface CalendarResourceHeaderProps {
  resource: CalendarResource;
}

/** @deprecated Unused — calendar-month-view inlines its own resource header. Retained for future migration when avatar/type display is needed. */
export function CalendarResourceHeader({ resource }: CalendarResourceHeaderProps) {
  return (
    <div data-slot="calendar-resource-header" className="flex items-center gap-2 px-2 py-1">
      {resource.avatar ? (
        <img
          src={resource.avatar}
          alt=""
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : null}
      <span className="text-sm font-medium truncate">{resource.title || resource.text}</span>
      {resource.type ? (
        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {resource.type}
        </span>
      ) : null}
    </div>
  );
}
