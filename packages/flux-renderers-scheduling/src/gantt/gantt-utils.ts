import type { GanttTask, GanttId } from './gantt.types.js';

export function buildParentIndex(tasks: GanttTask[]): Map<GanttId | null, GanttId[]> {
  const index = new Map<GanttId | null, GanttId[]>();
  for (const task of tasks) {
    const p: GanttId | null = task.parent ?? null;
    if (!index.has(p)) {
      index.set(p, []);
    }
    index.get(p)!.push(task.id);
  }
  return index;
}

export function getVisibleDescendantCount(
  taskId: GanttId,
  parentIndex: Map<GanttId | null, GanttId[]>,
): number {
  let count = 0;
  const children = parentIndex.get(taskId);
  if (!children) return 0;
  for (const childId of children) {
    count += 1 + getVisibleDescendantCount(childId, parentIndex);
  }
  return count;
}
