import { useState, useCallback, useEffect, useRef } from 'react';
import type { CalendarEvent } from '../../schemas.js';

export interface UseCalendarICalOptions {
  onImport?: (events: CalendarEvent[]) => void;
  onImportError?: (error: string) => void;
}

export interface UseCalendarICalResult {
  importFromICal: (file: File) => Promise<void>;
  exportToICal: (events: CalendarEvent[], filename?: string) => Promise<void>;
  isAvailable: boolean;
}

export function useCalendarICal(options: UseCalendarICalOptions = {}): UseCalendarICalResult {
  const { onImport, onImportError } = options;
  const [isAvailable, setIsAvailable] = useState(false);
  const genRef = useRef(0);

  useEffect(() => {
    const check = async () => {
      try {
        await import('ical.js');
        if (genRef.current === 0) {
          setIsAvailable(true);
        }
      } catch (err) {
        console.error('[useCalendarICal] Failed to load ical.js:', err);
        setIsAvailable(false);
      }
    };
    check();
  }, []);

  const importFromICal = useCallback(async (file: File) => {
    const gen = ++genRef.current;
    try {
      const ical = await import('ical.js');
      if (gen !== genRef.current) return;
      const text = await file.text();
      const jcalData = ical.default.parse(text);
      const comp = new ical.default.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      const events: CalendarEvent[] = vevents.map((vevent: { getFirstPropertyValue: (arg0: string) => any }) => {
        const uid = vevent.getFirstPropertyValue('uid') ?? `ical-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const summary = vevent.getFirstPropertyValue('summary') ?? '';
        const dtstart = vevent.getFirstPropertyValue('dtstart');
        const dtend = vevent.getFirstPropertyValue('dtend');
        const categories = vevent.getFirstPropertyValue('categories');

        const start = dtstart ? (typeof dtstart === 'object' && dtstart.toISOString ? (dtstart as Date).toISOString().split('T')[0] : String(dtstart).split('T')[0]) : '';
        const end = dtend ? (typeof dtend === 'object' && dtend.toISOString ? (dtend as Date).toISOString().split('T')[0] : String(dtend).split('T')[0]) : '';

        return {
          id: uid,
          title: summary,
          start,
          end: end || start,
          type: categories || 'shift',
          status: 'scheduled' as const,
        };
      });

      if (gen !== genRef.current) return;
      onImport?.(events);
    } catch (err) {
      console.error('[useCalendarICal] importFromICal failed:', err);
      const msg = err instanceof Error ? err.message : '导入失败：文件格式错误';
      onImportError?.(msg);
    }
  }, [onImport, onImportError]);

  const exportToICal = useCallback(async (events: CalendarEvent[], filename = 'calendar-export.ics') => {
    if (events.length === 0) {
      onImportError?.('没有可导出的排班数据');
      return;
    }

    const gen = ++genRef.current;
    try {
      const ical = await import('ical.js');
      if (gen !== genRef.current) return;

      const comp = new ical.default.Component('vcalendar');
      comp.updatePropertyWithValue('prodid', '-//NopChaos//Calendar//CN');
      comp.updatePropertyWithValue('version', '2.0');

      for (const event of events) {
        const vevent = new ical.default.Component('vevent');
        vevent.updatePropertyWithValue('uid', event.id);
        vevent.updatePropertyWithValue('summary', event.title);
        vevent.updatePropertyWithValue('dtstart', event.start);
        vevent.updatePropertyWithValue('dtend', event.end || event.start);
        if (event.type) {
          vevent.updatePropertyWithValue('categories', event.type);
        }
        comp.addSubcomponent(vevent);
      }

      if (gen !== genRef.current) return;

      const icalString = comp.toString();
      const blob = new Blob([icalString], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[useCalendarICal] exportToICal failed:', err);
      const msg = err instanceof Error ? err.message : '导出失败';
      onImportError?.(msg);
    }
  }, [onImportError]);

  return { importFromICal, exportToICal, isAvailable };
}
