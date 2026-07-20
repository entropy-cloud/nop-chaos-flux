import React from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { CalendarView } from '../../schemas.js';
import type { CalendarNavigationResult } from '../hooks/use-calendar-navigation.js';

export interface CalendarHeaderProps {
  currentDate: Date;
  activeView: CalendarView;
  navigation: CalendarNavigationResult;
  onViewChange: (view: CalendarView) => void;
  className?: string;
}

function formatPeriodLabel(date: Date, view: CalendarView, locale: string = 'zh-CN'): string {
  switch (view) {
    case 'month':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
    case 'week':
      return `${date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
    case 'day':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: '月' },
  { value: 'week', label: '周' },
  { value: 'day', label: '日' },
];

export function CalendarHeader({
  currentDate,
  activeView,
  navigation,
  onViewChange,
  className,
}: CalendarHeaderProps) {
  return (
    <div
      data-slot="calendar-header"
      className={cn('flex items-center justify-between px-4 py-2 border-b', className)}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={navigation.goPrev}
          className="hover:bg-gray-100"
          aria-label="Previous"
        >
          ‹
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={navigation.goToday}
          className="text-xs"
        >
          {t('scheduling.today')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={navigation.goNext}
          className="hover:bg-gray-100"
          aria-label="Next"
        >
          ›
        </Button>
        <h2 className="text-base font-semibold ml-2">
          {formatPeriodLabel(currentDate, activeView)}
        </h2>
      </div>

      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
        {VIEW_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={activeView === opt.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange(opt.value)}
            className={cn(
              'text-xs px-3',
              activeView === opt.value ? '' : 'hover:bg-gray-200',
            )}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
