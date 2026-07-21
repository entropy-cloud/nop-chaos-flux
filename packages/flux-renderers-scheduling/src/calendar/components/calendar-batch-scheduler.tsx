import React, { useState, useRef } from 'react';
import { Button, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import { toISODateString, getDateRange } from '../utils/calendar-date-utils.js';
import { useFocusTrap } from '../hooks/use-focus-trap.js';

export interface BatchSchedulePayload {
  resources: string[];
  dateRange: { start: string; end: string };
  shiftType: string;
}

export interface CalendarBatchSchedulerProps {
  resources: CalendarResource[];
  events: CalendarEvent[];
  shiftTypes: { type: string; label: string; color: string }[];
  open: boolean;
  onClose: () => void;
  onBatchSchedule: (payload: BatchSchedulePayload) => void;
}

export function CalendarBatchScheduler({
  resources,
  events,
  shiftTypes,
  open,
  onClose,
  onBatchSchedule,
}: CalendarBatchSchedulerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef, open);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [selectedShiftType, setSelectedShiftType] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  const toggleResource = (resourceId: string) => {
    setSelectedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectAll((prev) => {
      const next = !prev;
      if (next) {
        setSelectedResources(new Set(resources.map((r) => r.id)));
      } else {
        setSelectedResources(new Set());
      }
      return next;
    });
  };

  const dateRange = (() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (start > end) return [];
    return getDateRange(start, end);
  })();

  const cellCount = dateRange.length * selectedResources.size;
  const exceedsLimit = cellCount > 100;

  const conflictCells = (() => {
    const conflicts = new Set<string>();
    for (const rid of selectedResources) {
      for (const day of dateRange) {
        const dateStr = toISODateString(day);
        const hasEvent = events.some(
          (evt) => evt.resourceId === rid && evt.start.split('T')[0] === dateStr,
        );
        if (hasEvent) {
          conflicts.add(`${rid}:${dateStr}`);
        }
      }
    }
    return conflicts;
  })();

  const handleConfirm = () => {
    if (!startDate || !endDate || !selectedShiftType || selectedResources.size === 0) return;
    if (exceedsLimit) return;

    onBatchSchedule({
      resources: Array.from(selectedResources),
      dateRange: { start: startDate, end: endDate },
      shiftType: selectedShiftType,
    });

    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="nop-batch-scheduler-overlay"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={onClose}
    >
      <div
        className="nop-batch-scheduler"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="nop-batch-scheduler-title">
          {t('scheduling.calendar.batchSchedule')}
        </h3>

        <div className="nop-batch-scheduler-section">
          <span className="nop-batch-scheduler-label">
            {t('scheduling.calendar.dateRange')}
          </span>
          <div className="nop-batch-scheduler-date-row">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 text-sm"
            />
            <span className="nop-batch-scheduler-date-sep">{t('scheduling.calendar.to')}</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 text-sm"
            />
          </div>
        </div>

        <div className="nop-batch-scheduler-section">
          <span className="nop-batch-scheduler-label">
            {t('scheduling.calendar.selectResource')}
          </span>
          <div className="nop-batch-scheduler-resource-list">
            <label className="nop-batch-scheduler-resource-item">
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              {t('scheduling.calendar.selectAllNone')}
            </label>
            {resources.map((r) => (
              <label key={r.id} className="nop-batch-scheduler-resource-item">
                <input
                  type="checkbox"
                  checked={selectedResources.has(r.id)}
                  onChange={() => toggleResource(r.id)}
                />
                {r.title || r.text}
              </label>
            ))}
          </div>
        </div>

        <div className="nop-batch-scheduler-section">
          <span className="nop-batch-scheduler-label">
            {t('scheduling.calendar.shiftType')}
          </span>
          <div className="nop-batch-scheduler-shift-grid">
            {shiftTypes.map((st) => (
              <label
                key={st.type}
                className={cn(
                  'nop-batch-scheduler-shift-chip',
                  selectedShiftType === st.type && 'selected',
                )}
                style={{
                  backgroundColor: selectedShiftType === st.type ? st.color + '30' : undefined,
                  borderColor: selectedShiftType === st.type ? st.color : undefined,
                }}
              >
                <input
                  type="radio"
                  name="shiftType"
                  value={st.type}
                  checked={selectedShiftType === st.type}
                  onChange={() => setSelectedShiftType(st.type)}
                  className="sr-only"
                />
                <span className="nop-batch-scheduler-shift-dot" style={{ backgroundColor: st.color }} />
                {st.label}
              </label>
            ))}
          </div>
        </div>

        {dateRange.length > 0 && selectedResources.size > 0 && (
          <div className="nop-batch-scheduler-preview-section">
            <div className="nop-batch-scheduler-preview-title">
              {t('scheduling.calendar.preview', { count: cellCount })}
            </div>
            <div
              className="nop-batch-scheduler-preview-grid"
              style={{
                gridTemplateColumns: `80px repeat(${dateRange.length}, 1fr)`,
              }}
            >
              <div className="nop-batch-scheduler-preview-header">
                {t('scheduling.calendar.resourceAndDate')}
              </div>
              {dateRange.map((day) => (
                <div key={day.getTime()} className="nop-batch-scheduler-preview-cell" style={{ fontWeight: 500 }}>
                  {day.getUTCDate()}
                </div>
              ))}
              {Array.from(selectedResources).map((rid) => {
                const res = resources.find((r) => r.id === rid);
                return (
                  <React.Fragment key={rid}>
                    <div className="nop-batch-scheduler-preview-resource">
                      {res?.title || res?.text || rid}
                    </div>
                    {dateRange.map((day) => {
                      const dateStr = toISODateString(day);
                      const isConflict = conflictCells.has(`${rid}:${dateStr}`);
                      return (
                        <div
                          key={dateStr}
                          className={cn(
                            'nop-batch-scheduler-preview-cell',
                            isConflict ? 'conflict' : 'ok',
                          )}
                          style={{
                            backgroundColor: isConflict ? '#fef2f2' : (selectedShiftType ? (shiftTypes.find(st => st.type === selectedShiftType)?.color ?? '#e5e7eb') : '#e5e7eb'),
                          }}
                          title={isConflict ? t('scheduling.calendar.conflict') : undefined}
                        >
                          {isConflict ? '⚠' : '✓'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {exceedsLimit && (
          <div className="nop-batch-scheduler-error">
            {t('scheduling.calendar.exceedsLimit')}
          </div>
        )}

        <div className="nop-batch-scheduler-actions">
          <Button variant="outline" type="button" onClick={onClose}>
            {t('flux.common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!startDate || !endDate || !selectedShiftType || selectedResources.size === 0 || exceedsLimit}
          >
            {t('scheduling.calendar.confirmCount', { count: cellCount })}
          </Button>
        </div>
      </div>
    </div>
  );
}
