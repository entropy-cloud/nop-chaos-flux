import type { GanttId, GanttLink, GanttTask } from './gantt.types.js';
import { diffInDays } from './utils/date.js';

/**
 * CPM critical-path derivation (design.md §12.6). Pure read-only function over
 * the store's tasks/links maps — no IO, no mutation of the parse/update
 * channels, no schema surface.
 *
 * Failure-path behaviour (plan 481):
 * - no links (or no valid edges after dropping dangling endpoints): empty set,
 *   no highlight rendered;
 * - cycle in links: Kahn topological sort terminates with the cycle members
 *   (and their downstream) unprocessed — they never enter the critical set and
 *   nothing throws.
 */
export function calculateCriticalPath(tasks: Map<GanttId, GanttTask>, links: Map<GanttId, GanttLink>): GanttId[] {
  if (tasks.size === 0 || links.size === 0) return [];

  const edges = new Map<GanttId, Array<{ to: GanttId; weight: number }>>();
  const inDegree = new Map<GanttId, number>();
  for (const id of tasks.keys()) {
    edges.set(id, []);
    inDegree.set(id, 0);
  }

  const duration = (task: GanttTask): number => {
    if (task.type === 'milestone') return 0;
    const d = Number(task.duration);
    if (Number.isFinite(d) && d > 0) return d;
    const derived = diffInDays(new Date(task.end), new Date(task.start));
    if (Number.isFinite(derived) && derived > 0) return derived;
    return 1;
  };

  const durations = new Map<GanttId, number>();
  for (const [id, task] of tasks) durations.set(id, duration(task));

  // Edge weight = minimum separation imposed on the successor's ES:
  //   FS: ES[s] >= ES[t] + dur(t)   → w = dur(t)
  //   SS: ES[s] >= ES[t]            → w = 0
  //   FF: ES[s] >= EF[t] - dur(s)   → w = dur(t) - dur(s)
  //   SF: ES[s] >= ES[t] - dur(s)   → w = -dur(s)
  for (const link of links.values()) {
    if (!edges.has(link.source) || !edges.has(link.target)) continue;
    const wSrc = durations.get(link.source)!;
    const wDst = durations.get(link.target)!;
    let weight: number;
    switch (link.type) {
      case 'start_to_start': weight = 0; break;
      case 'finish_to_finish': weight = wSrc - wDst; break;
      case 'start_to_finish': weight = -wDst; break;
      case 'finish_to_start':
      default: weight = wSrc; break;
    }
    edges.get(link.source)!.push({ to: link.target, weight });
    inDegree.set(link.target, inDegree.get(link.target)! + 1);
  }

  // Kahn topological sort; nodes left with in-degree > 0 are on/behind a cycle
  // and are excluded from every downstream computation.
  const order: GanttId[] = [];
  const queue: GanttId[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  let queueHead = 0;
  while (queueHead < queue.length) {
    const id = queue[queueHead++];
    order.push(id);
    for (const edge of edges.get(id)!) {
      const next = inDegree.get(edge.to)! - 1;
      inDegree.set(edge.to, next);
      if (next === 0) queue.push(edge.to);
    }
  }
  if (order.length === 0) return [];

  // Forward pass: earliest start (longest path, floored at 0).
  const earliest = new Map<GanttId, number>();
  const preds = new Map<GanttId, Array<{ from: GanttId; weight: number }>>();
  for (const [id, out] of edges) {
    for (const edge of out) {
      if (!preds.has(edge.to)) preds.set(edge.to, []);
      preds.get(edge.to)!.push({ from: id, weight: edge.weight });
    }
  }
  for (const id of order) {
    const list = preds.get(id);
    let es = 0;
    if (list) {
      for (const pred of list) es = Math.max(es, (earliest.get(pred.from) ?? 0) + pred.weight);
    }
    earliest.set(id, Math.max(0, es));
  }

  let maxFinish = 0;
  for (const id of order) {
    maxFinish = Math.max(maxFinish, (earliest.get(id) ?? 0) + (durations.get(id) ?? 0));
  }

  // Backward pass (reverse topological order): latest start. Sinks anchor at
  // the project finish; float = latest - earliest; zero float = critical.
  const latest = new Map<GanttId, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]!;
    const out = edges.get(id)!;
    if (out.length === 0) {
      latest.set(id, maxFinish - (durations.get(id) ?? 0));
      continue;
    }
    let ls = Number.POSITIVE_INFINITY;
    for (const edge of out) {
      ls = Math.min(ls, (latest.get(edge.to) ?? maxFinish) - edge.weight);
    }
    latest.set(id, ls);
  }

  const critical: GanttId[] = [];
  for (const id of order) {
    const es = earliest.get(id) ?? 0;
    const ls = latest.get(id) ?? 0;
    const float = ls - es;
    if (Number.isFinite(float) && Math.abs(float) < 1e-9) critical.push(id);
  }
  return critical;
}
