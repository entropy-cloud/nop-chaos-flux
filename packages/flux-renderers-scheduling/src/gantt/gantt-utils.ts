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

export function flattenTree(
  tasks: GanttTask[],
  parentIndex: Map<GanttId | null, GanttId[]>,
  expandedSet: Set<GanttId>,
  rootTaskIds?: GanttId[],
): GanttTask[] {
  const taskMap = new Map<GanttId, GanttTask>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const result: GanttTask[] = [];
  const roots = rootTaskIds ?? parentIndex.get(null) ?? [];

  function collect(parentId: GanttId | null): void {
    const children = parentIndex.get(parentId);
    if (!children) return;
    for (const childId of children) {
      const task = taskMap.get(childId);
      if (!task) continue;
      result.push(task);
      if (expandedSet.has(childId) && parentIndex.has(childId)) {
        collect(childId);
      }
    }
  }

  for (const rootId of roots) {
    const task = taskMap.get(rootId);
    if (task) {
      result.push(task);
    }
    if (parentIndex.has(rootId) && expandedSet.has(rootId)) {
      collect(rootId);
    }
  }

  return result;
}

export function toggleOpen(taskId: GanttId, expandedSet: Set<GanttId>): void {
  if (expandedSet.has(taskId)) {
    expandedSet.delete(taskId);
  } else {
    expandedSet.add(taskId);
  }
}

export function expandAll(parentIndex: Map<GanttId | null, GanttId[]>, expandedSet: Set<GanttId>): void {
  for (const [key, children] of parentIndex) {
    if (key !== null && children.length > 0) {
      expandedSet.add(key);
    }
  }
}

export function collapseAll(expandedSet: Set<GanttId>): void {
  expandedSet.clear();
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
