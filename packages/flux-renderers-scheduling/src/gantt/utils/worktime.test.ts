import { describe, expect, it } from 'vitest';
import { DefaultWorkCalendar, CalendarManager } from './worktime.js';

describe('DefaultWorkCalendar', () => {
  describe('isWorkingDay', () => {
    it('should return true for weekdays by default', () => {
      const cal = new DefaultWorkCalendar();
      expect(cal.isWorkingDay(new Date('2026-01-05'))).toBe(true);
    });

    it('should return false for weekends by default', () => {
      const cal = new DefaultWorkCalendar();
      expect(cal.isWorkingDay(new Date('2026-01-03'))).toBe(false);
      expect(cal.isWorkingDay(new Date('2026-01-04'))).toBe(false);
    });

    it('should return false for holidays', () => {
      const cal = new DefaultWorkCalendar({
        holidays: ['2026-01-05'],
      });
      expect(cal.isWorkingDay(new Date('2026-01-05'))).toBe(false);
    });

    it('should return true for extra work days', () => {
      const cal = new DefaultWorkCalendar({
        extraWorkDays: ['2026-01-03'],
      });
      expect(cal.isWorkingDay(new Date('2026-01-03'))).toBe(true);
    });

    it('extra work day overrides holiday', () => {
      const cal = new DefaultWorkCalendar({
        holidays: ['2026-01-05'],
        extraWorkDays: ['2026-01-05'],
      });
      expect(cal.isWorkingDay(new Date('2026-01-05'))).toBe(true);
    });

    it('should support custom week hours (all-weekend schedule)', () => {
      const cal = new DefaultWorkCalendar({
        weekHours: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      });
      expect(cal.isWorkingDay(new Date('2026-01-05'))).toBe(false);
    });
  });

  describe('addWorkDays', () => {
    it('should skip weekends', () => {
      const cal = new DefaultWorkCalendar();
      const start = new Date('2026-01-02');
      const result = cal.addWorkDays(start, 1);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-05');
    });

    it('should skip holidays', () => {
      const cal = new DefaultWorkCalendar({
        holidays: ['2026-01-05'],
      });
      const start = new Date('2026-01-02');
      const result = cal.addWorkDays(start, 2);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-07');
    });

    it('should handle multiple weeks', () => {
      const cal = new DefaultWorkCalendar();
      const start = new Date('2026-01-02');
      const result = cal.addWorkDays(start, 10);
      const daysDiff = Math.round((result.getTime() - start.getTime()) / 86400000);
      expect(daysDiff).toBeGreaterThan(10);
    });

    it('addWorkDays(0) returns same date', () => {
      const cal = new DefaultWorkCalendar();
      const start = new Date('2026-01-05');
      const result = cal.addWorkDays(start, 0);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-05');
    });
  });

  describe('subtractWorkDays', () => {
    it('should skip weekends going backwards', () => {
      const cal = new DefaultWorkCalendar();
      const start = new Date('2026-01-05');
      const result = cal.subtractWorkDays(start, 1);
      expect(result.toISOString().slice(0, 10)).toBe('2026-01-02');
    });
  });

  describe('countWorkDays', () => {
    it('should count weekdays between two dates', () => {
      const cal = new DefaultWorkCalendar();
      const count = cal.countWorkDays(new Date('2026-01-01'), new Date('2026-01-07'));
      expect(count).toBe(5);
    });

    it('should exclude holidays', () => {
      const cal = new DefaultWorkCalendar({
        holidays: ['2026-01-05'],
      });
      const count = cal.countWorkDays(new Date('2026-01-01'), new Date('2026-01-07'));
      expect(count).toBe(4);
    });

    it('should handle month boundaries', () => {
      const cal = new DefaultWorkCalendar();
      const count = cal.countWorkDays(new Date('2026-01-31'), new Date('2026-02-02'));
      expect(count).toBe(1);
    });
  });

  describe('getWorkMinutes', () => {
    it('should return 480 for weekday by default', () => {
      const cal = new DefaultWorkCalendar();
      expect(cal.getWorkMinutes(new Date('2026-01-05'))).toBe(480);
    });

    it('should return 0 for weekend', () => {
      const cal = new DefaultWorkCalendar();
      expect(cal.getWorkMinutes(new Date('2026-01-03'))).toBe(0);
    });
  });
});

describe('CalendarManager', () => {
  it('should register and retrieve a calendar', () => {
    const mgr = new CalendarManager();
    const cal = new DefaultWorkCalendar();
    mgr.registerCalendar('cal1', cal);
    expect(mgr.getCalendar('cal1')).toBe(cal);
  });

  it('should return null for unknown calendar', () => {
    const mgr = new CalendarManager();
    expect(mgr.getCalendar('nonexistent')).toBeNull();
  });

  it('should fall back to global calendar', () => {
    const mgr = new CalendarManager('global');
    const cal = new DefaultWorkCalendar();
    mgr.registerCalendar('global', cal);
    expect(mgr.getCalendar('nonexistent')).toBe(cal);
  });

  it('should resolve three-level fallback: resource → task → global', () => {
    const globalCal = new DefaultWorkCalendar();
    const taskCal = new DefaultWorkCalendar({ weekHours: { 0: 0, 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 0 } });
    const resourceCal = new DefaultWorkCalendar({ weekHours: { 0: 0, 1: 6, 2: 6, 3: 6, 4: 6, 5: 6, 6: 0 } });

    const mgr = new CalendarManager('global');
    mgr.registerCalendar('global', globalCal);
    mgr.registerCalendar('taskCal', taskCal);
    mgr.registerCalendar('resourceCal', resourceCal);

    expect(mgr.resolveCalendar(undefined, undefined)).toBe(globalCal);
    expect(mgr.resolveCalendar('taskCal', undefined)).toBe(taskCal);
    expect(mgr.resolveCalendar('taskCal', 'resourceCal')).toBe(resourceCal);
    expect(mgr.resolveCalendar(undefined, 'resourceCal')).toBe(resourceCal);
  });

  it('should return null when no calendar is configured', () => {
    const mgr = new CalendarManager();
    expect(mgr.getCalendar()).toBeNull();
    expect(mgr.resolveCalendar()).toBeNull();
  });
});
