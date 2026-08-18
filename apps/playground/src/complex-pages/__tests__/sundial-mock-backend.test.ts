import { describe, expect, it } from 'vitest';
import { createMockDatabase, filterSundialTasks, updateSundialTask } from '../shared/mock-backend';

describe('Sundial mock backend', () => {
  it('seeds 10 tasks with done/trashed/recur/list fields', () => {
    const db = createMockDatabase();
    expect(db.sundialTasks).toHaveLength(10);
    const done = db.sundialTasks.filter((t) => t.done);
    expect(done.length).toBeGreaterThanOrEqual(2);
    const trashed = db.sundialTasks.filter((t) => t.trashed);
    expect(trashed).toHaveLength(1);
  });

  it('filters Sundial__todos by view (all/today/scheduled/done/trash)', () => {
    const db = createMockDatabase();
    const all = filterSundialTasks(db.sundialTasks, 'all');
    expect(all.length).toBe(9); // 10 minus 1 trashed

    const today = filterSundialTasks(db.sundialTasks, 'today');
    expect(today.every((t) => t.dueTone === 'today' && !t.done && !t.trashed)).toBe(true);

    const scheduled = filterSundialTasks(db.sundialTasks, 'scheduled');
    expect(scheduled.every((t) => (t.dueTone === 'overdue' || t.dueTone === 'future') && !t.done && !t.trashed)).toBe(true);

    const done = filterSundialTasks(db.sundialTasks, 'done');
    expect(done.every((t) => t.done && !t.trashed)).toBe(true);

    const trash = filterSundialTasks(db.sundialTasks, 'trash');
    expect(trash.every((t) => t.trashed)).toBe(true);
    expect(trash).toHaveLength(1);
  });

  it('updates a task in-memory via updateSundialTask', () => {
    const db = createMockDatabase();
    const updated = updateSundialTask(db.sundialTasks, 2, { flagged: true, recur: 'daily' });
    expect(updated).not.toBeNull();
    expect(db.sundialTasks.find((t) => t.id === 2)?.flagged).toBe(true);
    expect(db.sundialTasks.find((t) => t.id === 2)?.recur).toBe('daily');

    const missing = updateSundialTask(db.sundialTasks, 999, { flagged: true });
    expect(missing).toBeNull();
  });

  it('returns null when updating an unknown task', () => {
    const db = createMockDatabase();
    expect(updateSundialTask(db.sundialTasks, 12345, { done: true })).toBeNull();
  });
});
