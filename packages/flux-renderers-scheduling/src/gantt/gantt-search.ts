import type { GanttTask } from './gantt.types.js';

export function searchTasks(tasks: GanttTask[], query: string): GanttTask[] {
  if (!query) return tasks;
  const lower = query.toLowerCase();
  return tasks.filter(
    (task) =>
      task.text.toLowerCase().includes(lower) ||
      task.id.toString().toLowerCase().includes(lower),
  );
}
