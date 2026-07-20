import { describe, it, expect } from 'vitest';
import type { GanttTask, GanttResource, GanttAssignment, GanttId } from '../gantt.types.js';
import { computeResourceLoads, getUnitLoadColor, getUnitLoadTooltip } from './resource-load.js';

function makeResource(id: GanttId, text: string): GanttResource {
  return { id, text };
}

function makeTask(id: GanttId, start: string, end: string): GanttTask {
  return {
    id, text: `Task ${id}`, start, end, $x: 0, $y: 0, $w: 0, $h: 0, $level: 0, $source: [], $target: [],
  };
}

function makeAssignment(id: GanttId, taskId: GanttId, resourceId: GanttId, units?: number): GanttAssignment {
  return { id, taskId, resourceId, units };
}

describe('computeResourceLoads', () => {
  it('returns empty array for no resources', () => {
    const result = computeResourceLoads({
      resources: new Map(),
      assignments: new Map(),
      tasks: new Map(),
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-07'),
    });
    expect(result).toEqual([]);
  });

  it('computes 0 load for resource with no assignments', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Alice'));
    const result = computeResourceLoads({
      resources: r,
      assignments: new Map(),
      tasks: new Map(),
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-03'),
    });
    expect(result).toHaveLength(1);
    expect(result[0].totalLoad).toBe(0);
    expect(result[0].timelineLoad).toHaveLength(2);
  });

  it('computes partial load for a resource with one assignment spanning full range', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Alice'));
    const t = new Map<GanttId, GanttTask>();
    t.set('task1', makeTask('task1', '2026-01-01', '2026-01-03'));
    const a = new Map<GanttId, GanttAssignment>();
    a.set('a1', makeAssignment('a1', 'task1', 'r1', 100));
    const result = computeResourceLoads({
      resources: r,
      assignments: a,
      tasks: t,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-03'),
    });
    expect(result).toHaveLength(1);
    expect(result[0].timelineLoad[0].unitLoad).toBeGreaterThan(0);
  });

  it('handles 50% unit assignment correctly', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Bob'));
    const t = new Map<GanttId, GanttTask>();
    t.set('task1', makeTask('task1', '2026-01-01', '2026-01-02'));
    const a = new Map<GanttId, GanttAssignment>();
    a.set('a1', makeAssignment('a1', 'task1', 'r1', 50));
    const result = computeResourceLoads({
      resources: r,
      assignments: a,
      tasks: t,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-02'),
    });
    expect(result[0].timelineLoad[0].unitLoad).toBeLessThan(100);
  });

  it('caps unitLoad at 100 for overload scenarios', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Charlie'));
    const t = new Map<GanttId, GanttTask>();
    t.set('task1', makeTask('task1', '2026-01-01', '2026-01-02'));
    t.set('task2', makeTask('task2', '2026-01-01', '2026-01-02'));
    const a = new Map<GanttId, GanttAssignment>();
    a.set('a1', makeAssignment('a1', 'task1', 'r1', 200));
    a.set('a2', makeAssignment('a2', 'task2', 'r1', 200));
    const result = computeResourceLoads({
      resources: r,
      assignments: a,
      tasks: t,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-02'),
    });
    expect(result[0].timelineLoad[0].unitLoad).toBeLessThanOrEqual(100);
  });

  it('skips tasks outside the date range', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Dave'));
    const t = new Map<GanttId, GanttTask>();
    t.set('task1', makeTask('task1', '2026-02-01', '2026-02-05'));
    const a = new Map<GanttId, GanttAssignment>();
    a.set('a1', makeAssignment('a1', 'task1', 'r1', 100));
    const result = computeResourceLoads({
      resources: r,
      assignments: a,
      tasks: t,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-07'),
    });
    for (const day of result[0].timelineLoad) {
      expect(day.unitLoad).toBe(0);
    }
  });

  it('handles multiple resources independently', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Alice'));
    r.set('r2', makeResource('r2', 'Bob'));
    const t = new Map<GanttId, GanttTask>();
    t.set('task1', makeTask('task1', '2026-01-01', '2026-01-02'));
    const a = new Map<GanttId, GanttAssignment>();
    a.set('a1', makeAssignment('a1', 'task1', 'r1', 100));
    a.set('a2', makeAssignment('a2', 'task1', 'r2', 100));
    const result = computeResourceLoads({
      resources: r,
      assignments: a,
      tasks: t,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-02'),
    });
    expect(result).toHaveLength(2);
    expect(result[0].timelineLoad[0].unitLoad).toBeGreaterThan(0);
    expect(result[1].timelineLoad[0].unitLoad).toBeGreaterThan(0);
  });

  it('handles assignment with missing task gracefully', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Eve'));
    const a = new Map<GanttId, GanttAssignment>();
    a.set('a1', makeAssignment('a1', 'nonexistent', 'r1', 100));
    const result = computeResourceLoads({
      resources: r,
      assignments: a,
      tasks: new Map(),
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-02'),
    });
    expect(result[0].totalLoad).toBe(0);
  });

  it('handles empty date range (single day)', () => {
    const r = new Map<GanttId, GanttResource>();
    r.set('r1', makeResource('r1', 'Frank'));
    const result = computeResourceLoads({
      resources: r,
      assignments: new Map(),
      tasks: new Map(),
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-01'),
    });
    expect(result[0].timelineLoad).toHaveLength(1);
  });
});

describe('getUnitLoadColor', () => {
  it('returns green for loads under 70', () => {
    expect(getUnitLoadColor(0)).toBe('bg-green-400');
    expect(getUnitLoadColor(50)).toBe('bg-green-400');
    expect(getUnitLoadColor(69)).toBe('bg-green-400');
  });

  it('returns yellow for loads 70-89', () => {
    expect(getUnitLoadColor(70)).toBe('bg-yellow-400');
    expect(getUnitLoadColor(80)).toBe('bg-yellow-400');
    expect(getUnitLoadColor(89)).toBe('bg-yellow-400');
  });

  it('returns red for loads 90+', () => {
    expect(getUnitLoadColor(90)).toBe('bg-red-400');
    expect(getUnitLoadColor(100)).toBe('bg-red-400');
  });
});

describe('getUnitLoadTooltip', () => {
  it('returns Idle for load under 1', () => {
    expect(getUnitLoadTooltip(0)).toBe('Idle');
  });

  it('returns Normal for moderate loads', () => {
    expect(getUnitLoadTooltip(50)).toBe('Normal (50%)');
  });

  it('returns Warning for high loads', () => {
    expect(getUnitLoadTooltip(80)).toBe('Warning (80%)');
  });

  it('returns Overload for critical loads', () => {
    expect(getUnitLoadTooltip(95)).toBe('Overload (95%)');
  });
});
