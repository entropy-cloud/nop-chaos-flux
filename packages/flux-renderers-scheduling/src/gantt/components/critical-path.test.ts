import { describe, it, expect } from 'vitest';
import type { GanttId, GanttTask, GanttLink } from '../gantt.types.js';
import { calculateCriticalPath, isCriticalTask } from './critical-path.js';

function makeTask(id: GanttId, start: string, end: string): GanttTask {
  return {
    id, text: `Task ${id}`, start, end, $x: 0, $y: 0, $w: 0, $h: 0, $level: 0, $source: [], $target: [],
  };
}

function makeLink(id: GanttId, source: GanttId, target: GanttId, lag?: number): GanttLink {
  return { id, source, target, type: 'finish_to_start', lag, $p: '' };
}

describe('calculateCriticalPath', () => {
  it('returns empty set for empty task list', () => {
    const result = calculateCriticalPath(new Map(), new Map());
    expect(result.criticalTaskIds.size).toBe(0);
    expect(result.totalDuration).toBe(0);
  });

  it('single task is always critical', () => {
    const t = new Map<GanttId, GanttTask>();
    t.set('t1', makeTask('t1', '2026-01-01', '2026-01-03'));
    const result = calculateCriticalPath(t, new Map());
    expect(isCriticalTask('t1', result)).toBe(true);
    expect(result.criticalTaskIds.size).toBe(1);
  });

  it('two tasks in chain are both critical', () => {
    const t = new Map<GanttId, GanttTask>();
    t.set('t1', makeTask('t1', '2026-01-01', '2026-01-02'));
    t.set('t2', makeTask('t2', '2026-01-02', '2026-01-03'));
    const l = new Map<GanttId, GanttLink>();
    l.set('l1', makeLink('l1', 't1', 't2'));
    const result = calculateCriticalPath(t, l);
    expect(result.criticalTaskIds.size).toBe(2);
    expect(isCriticalTask('t1', result)).toBe(true);
    expect(isCriticalTask('t2', result)).toBe(true);
  });

  it('chain: all tasks in a linear chain are critical', () => {
    const t = new Map<GanttId, GanttTask>();
    t.set('t1', makeTask('t1', '2026-01-01', '2026-01-02'));
    t.set('t2', makeTask('t2', '2026-01-03', '2026-01-05'));
    t.set('t3', makeTask('t3', '2026-01-06', '2026-01-08'));
    const l = new Map<GanttId, GanttLink>();
    l.set('l1', makeLink('l1', 't1', 't2'));
    l.set('l2', makeLink('l2', 't2', 't3'));
    const result = calculateCriticalPath(t, l);
    expect(result.criticalTaskIds.size).toBe(3);
  });

  it('parallel: only the longest path is critical', () => {
    const t = new Map<GanttId, GanttTask>();
    t.set('t1', makeTask('t1', '2026-01-01', '2026-01-02'));
    t.set('t2', makeTask('t2', '2026-01-01', '2026-01-05'));
    t.set('t3', makeTask('t3', '2026-01-05', '2026-01-06'));
    const l = new Map<GanttId, GanttLink>();
    l.set('l1', makeLink('l1', 't1', 't3'));
    l.set('l2', makeLink('l2', 't2', 't3'));
    const result = calculateCriticalPath(t, l);
    expect(isCriticalTask('t2', result)).toBe(true);
    expect(isCriticalTask('t1', result)).toBe(false);
  });

  it('branching: correct critical tasks identified', () => {
    const t = new Map<GanttId, GanttTask>();
    t.set('t1', makeTask('t1', '2026-01-01', '2026-01-03'));
    t.set('t2', makeTask('t2', '2026-01-03', '2026-01-04'));
    t.set('t3', makeTask('t3', '2026-01-03', '2026-01-06'));
    t.set('t4', makeTask('t4', '2026-01-06', '2026-01-07'));
    const l = new Map<GanttId, GanttLink>();
    l.set('l1', makeLink('l1', 't1', 't2'));
    l.set('l2', makeLink('l2', 't1', 't3'));
    l.set('l3', makeLink('l3', 't2', 't4'));
    l.set('l4', makeLink('l4', 't3', 't4'));
    const result = calculateCriticalPath(t, l);
    expect(isCriticalTask('t1', result)).toBe(true);
    expect(isCriticalTask('t3', result)).toBe(true);
    expect(isCriticalTask('t4', result)).toBe(true);
    expect(isCriticalTask('t2', result)).toBe(false);
  });

  it('handles links with lag', () => {
    const t = new Map<GanttId, GanttTask>();
    t.set('t1', makeTask('t1', '2026-01-01', '2026-01-02'));
    t.set('t2', makeTask('t2', '2026-01-04', '2026-01-05'));
    const l = new Map<GanttId, GanttLink>();
    l.set('l1', makeLink('l1', 't1', 't2', 1));
    const result = calculateCriticalPath(t, l);
    expect(result.criticalTaskIds.size).toBe(2);
  });
});
