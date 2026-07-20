import React, { useState, useMemo, useCallback } from 'react';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import { toISODateString, getDateRange } from '../utils/calendar-date-utils.js';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [selectedShiftType, setSelectedShiftType] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  const toggleResource = useCallback((resourceId: string) => {
    setSelectedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectAll((prev) => {
      const next = !prev;
      if (next) {
        setSelectedResources(new Set(resources.map((r) => r.id)));
      } else {
        setSelectedResources(new Set());
      }
      return next;
    });
  }, [resources]);

  const dateRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (start > end) return [];
    return getDateRange(start, end);
  }, [startDate, endDate]);

  const cellCount = dateRange.length * selectedResources.size;
  const exceedsLimit = cellCount > 100;

  const conflictCells = useMemo(() => {
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
  }, [selectedResources, dateRange, events]);

  const handleConfirm = useCallback(() => {
    if (!startDate || !endDate || !selectedShiftType || selectedResources.size === 0) return;
    if (exceedsLimit) return;

    onBatchSchedule({
      resources: Array.from(selectedResources),
      dateRange: { start: startDate, end: endDate },
      shiftType: selectedShiftType,
    });

    onClose();
  }, [startDate, endDate, selectedShiftType, selectedResources, exceedsLimit, onBatchSchedule, onClose]);

  if (!open) return null;

  return (
    <div
      className="nop-batch-scheduler-overlay"
      role="dialog"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        className="nop-batch-scheduler"
        role="presentation"
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 20,
          minWidth: 400,
          maxWidth: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
          批量排班
        </h3>

        <div style={{ marginBottom: 12 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            日期范围
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #d0d5dd', fontSize: 13 }}
            />
            <span style={{ fontSize: 13, color: '#666' }}>至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #d0d5dd', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            选择资源
          </span>
          <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 4, padding: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              全选/取消全选
            </label>
            {resources.map((r) => (
              <label
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
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

        <div style={{ marginBottom: 12 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            班次类型
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {shiftTypes.map((st) => (
              <label
                key={st.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: 'pointer',
                  backgroundColor: selectedShiftType === st.type ? st.color + '30' : '#f9fafb',
                  border: selectedShiftType === st.type ? `2px solid ${st.color}` : '1px solid #e5e7eb',
                }}
              >
                <input
                  type="radio"
                  name="shiftType"
                  value={st.type}
                  checked={selectedShiftType === st.type}
                  onChange={() => setSelectedShiftType(st.type)}
                  style={{ display: 'none' }}
                />
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: st.color,
                  display: 'inline-block',
                }} />
                {st.label}
              </label>
            ))}
          </div>
        </div>

        {dateRange.length > 0 && selectedResources.size > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              预览 ({cellCount} 个单元格)
            </div>
            <div
              className="nop-batch-preview-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: `80px repeat(${dateRange.length}, 1fr)`,
                gap: 1,
                backgroundColor: '#e5e7eb',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 200,
                fontSize: 11,
              }}
            >
              <div style={{ backgroundColor: '#fff', padding: 4, fontWeight: 500 }}>
                资源/日期
              </div>
              {dateRange.map((day) => (
                <div key={day.getTime()} style={{ backgroundColor: '#fff', padding: 4, textAlign: 'center', fontWeight: 500 }}>
                  {day.getUTCDate()}
                </div>
              ))}
              {Array.from(selectedResources).map((rid) => {
                const res = resources.find((r) => r.id === rid);
                return (
                  <React.Fragment key={rid}>
                    <div style={{ backgroundColor: '#fff', padding: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {res?.title || res?.text || rid}
                    </div>
                    {dateRange.map((day) => {
                      const dateStr = toISODateString(day);
                      const isConflict = conflictCells.has(`${rid}:${dateStr}`);
                      return (
                        <div
                          key={dateStr}
                          style={{
                            backgroundColor: isConflict ? '#fef2f2' : (selectedShiftType ? (shiftTypes.find(st => st.type === selectedShiftType)?.color ?? '#e5e7eb') : '#e5e7eb'),
                            padding: 4,
                            textAlign: 'center',
                            color: isConflict ? '#dc2626' : '#fff',
                            fontSize: 10,
                          }}
                          title={isConflict ? '此单元格已有排班' : undefined}
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
          <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>
            批量操作最多支持 100 个单元格
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #d0d5dd',
              borderRadius: 4,
              padding: '6px 16px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!startDate || !endDate || !selectedShiftType || selectedResources.size === 0 || exceedsLimit}
            style={{
              backgroundColor: !startDate || !endDate || !selectedShiftType || selectedResources.size === 0 || exceedsLimit ? '#9ca3af' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '6px 16px',
              cursor: !startDate || !endDate || !selectedShiftType || selectedResources.size === 0 || exceedsLimit ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            确认 ({cellCount} 条)
          </button>
        </div>
      </div>
    </div>
  );
}
