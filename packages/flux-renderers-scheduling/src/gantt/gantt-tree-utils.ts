import type { GanttId, GanttLink, GanttTask, GanttTaskData } from './gantt.types.js';
import { getVisibleDescendantCount } from './gantt-utils.js';

export function* flattenTasks(tasks: GanttTaskData[], parent: GanttId | null): Generator<GanttTaskData> {
  for (const task of tasks) {
    const flat: GanttTaskData = { ...task, parent, children: undefined };
    yield flat;
    if (task.children && task.children.length > 0) {
      yield* flattenTasks(task.children, task.id);
    }
  }
}

export function buildParentIndex(tasks: Map<GanttId, GanttTask>): Map<GanttId | null, GanttId[]> {
  const index = new Map<GanttId | null, GanttId[]>();
  for (const task of tasks.values()) {
    const p: GanttId | null = task.parent ?? null;
    if (!index.has(p)) {
      index.set(p, []);
    }
    index.get(p)!.push(task.id);
  }
  return index;
}

export function seedExpandedSet(tasks: Map<GanttId, GanttTask>, expandedSet: Set<GanttId>): Set<GanttId> {
  const newExpanded = new Set(expandedSet);
  for (const task of tasks.values()) {
    if (task.open ?? true) {
      newExpanded.add(task.id);
    }
  }
  return newExpanded;
}

export function collectVisible(parent: GanttId | null, parentIndex: Map<GanttId | null, GanttId[]>, tasks: Map<GanttId, GanttTask>, expandedSet: Set<GanttId>): GanttTask[] {
  const result: GanttTask[] = [];
  function recurse(p: GanttId | null): void {
    const children = parentIndex.get(p);
    if (!children) return;
    for (const childId of children) {
      const task = tasks.get(childId);
      if (!task) continue;
      result.push(task);
      if (parentIndex.has(childId) && expandedSet.has(childId)) {
        recurse(childId);
      }
    }
  }
  recurse(parent);
  return result;
}

export function getVisibleTasks(tasks: Map<GanttId, GanttTask>, parentIndex: Map<GanttId | null, GanttId[]>, expandedSet: Set<GanttId>): GanttTask[] {
  return collectVisible(null, parentIndex, tasks, expandedSet);
}

export function computeLevels(tasks: Map<GanttId, GanttTask>, parentIndex: Map<GanttId | null, GanttId[]>): Map<GanttId, GanttTask> {
  const newTasks = new Map(tasks);
  const queue: Array<{ parent: GanttId | null; level: number }> = [{ parent: null, level: 0 }];
  while (queue.length > 0) {
    const { parent, level } = queue.shift()!;
    const children = parentIndex.get(parent);
    if (children) for (const childId of children) {
      const task = newTasks.get(childId);
      if (task) { newTasks.set(childId, { ...task, $level: level }); queue.push({ parent: childId, level: level + 1 }); }
    }
  }
  return newTasks;
}

export function computeSourceTarget(tasks: Map<GanttId, GanttTask>, links: Map<GanttId, GanttLink>): Map<GanttId, GanttTask> {
  const newTasks = new Map(tasks);
  for (const [, task] of newTasks) newTasks.set(task.id, { ...task, $source: [], $target: [] });
  for (const link of links.values()) {
    const src = newTasks.get(link.source), tgt = newTasks.get(link.target);
    if (src) newTasks.set(link.source, { ...src, $source: [...src.$source, link.target] });
    if (tgt) newTasks.set(link.target, { ...tgt, $target: [...tgt.$target, link.source] });
  }
  return newTasks;
}

export function collectDescendantIds(parentId: GanttId, parentIndex: Map<GanttId | null, GanttId[]>, result: GanttId[]): void {
  const children = parentIndex.get(parentId);
  if (!children) return;
  for (const childId of children) { result.push(childId); collectDescendantIds(childId, parentIndex, result); }
}

export { getVisibleDescendantCount };
