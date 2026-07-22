import React from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { CalendarResource } from '../../schemas.js';

export interface CalendarResourceGroupProps {
  group: CalendarResource;
  level: number;
  open: boolean;
  onToggle: (groupId: string) => void;
  children?: React.ReactNode;
}

/** @deprecated Unwired — retained for future connection per design §12.3. Not used by the main Calendar renderer. */
export function CalendarResourceGroup({
  group,
  level,
  open,
  onToggle,
  children,
}: CalendarResourceGroupProps) {
  const indent = level * 16;

  return (
    <div data-slot="calendar-resource-group" data-group-id={group.id} data-open={open ? 'true' : 'false'}>
      <div
        data-slot="calendar-resource-group-header"
        className={cn(
          'flex items-center border-b bg-gray-50/80',
          level > 0 && 'bg-gray-100/50',
        )}
        style={{ paddingLeft: 8 + indent }}
      >
        <button
          type="button"
          data-slot="calendar-group-toggle"
          className="w-5 h-5 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 mr-1"
          onClick={() => onToggle(group.id)}
          aria-label={open ? t('flux.common.collapse') : t('flux.common.expand')}
        >
          {open ? '▼' : '▶'}
        </button>
        <span className="text-sm font-medium truncate">{group.title || group.text}</span>
        {group.resources && (
          <span className="ml-2 text-xs text-gray-400">
            {t('scheduling.calendar.subGroupCount', { count: group.resources.length })}
          </span>
        )}
      </div>
      {open && children}
    </div>
  );
}
