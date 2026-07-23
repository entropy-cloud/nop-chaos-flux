import { describe, it, expect, afterAll } from 'vitest';

declare const process: {
  env: Record<string, string | undefined>;
};

describe('Gantt timezone-safe date math', () => {
  const origTz = process.env.TZ;
  afterAll(() => {
    process.env.TZ = origTz;
  });

  it('should diffInDays return correct result across DST transition in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const a = new Date('2026-03-08');
    const b = new Date('2026-03-15');
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    expect(diff).toBe(7);
  });

  it('should diffInDays return correct result across DST transition in UTC-5', () => {
    process.env.TZ = 'America/New_York';
    const a = new Date('2026-03-08');
    const b = new Date('2026-03-15');
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    expect(diff).toBe(7);
  });

  it('should Date.parse with YYYY-MM-DD format be timezone-safe in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const d = new Date('2026-01-01');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(1);
  });

  it('should Date.parse with YYYY-MM-DD format be timezone-safe in UTC-5', () => {
    process.env.TZ = 'America/New_York';
    const d = new Date('2026-01-01');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(1);
  });

  it('should store preserve date strings across timezones', async () => {
    process.env.TZ = 'Asia/Shanghai';
    const { GanttStore } = await import('./gantt-store.js');
    const store = new GanttStore();
    store.parse([{ id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' }], []);
    const task = store.tasks.get('t1')!;
    expect(task.start).toBe('2026-01-01');
    expect(task.end).toBe('2026-01-10');
  });

  it('should store preserve date strings in negative offset timezone', async () => {
    process.env.TZ = 'America/New_York';
    const { GanttStore } = await import('./gantt-store.js');
    const store = new GanttStore();
    store.parse([{ id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' }], []);
    const task = store.tasks.get('t1')!;
    expect(task.start).toBe('2026-01-01');
    expect(task.end).toBe('2026-01-10');
  });
});
