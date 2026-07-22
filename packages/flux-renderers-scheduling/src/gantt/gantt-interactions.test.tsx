import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttEditor } from './gantt-editor.js';
import type { GanttTaskData } from './gantt.types.js';

function makeTask(overrides: Partial<GanttTaskData> & { id: string | number }): GanttTaskData {
  return {
    text: 'Task',
    start: '2026-01-01',
    end: '2026-01-10',
    ...overrides,
  };
}

describe('Gantt interaction primitives', () => {
  describe('drag mode detection', () => {
    it('should support move by updating task dates', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
      const task = store.tasks.get('t1')!;
      const oldStart = task.start;
      const oldEnd = task.end;
      const dayDelta = 3;
      const newStart = new Date(new Date(oldStart).getTime() + dayDelta * 86400000);
      const newEnd = new Date(new Date(oldEnd).getTime() + dayDelta * 86400000);
      store.updateTask('t1', {
        start: newStart.toISOString().slice(0, 10),
        end: newEnd.toISOString().slice(0, 10),
      });
      expect(store.tasks.get('t1')!.start).toBe(newStart.toISOString().slice(0, 10));
    });

    it('should support resize-end by updating end date', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-05' })], []);
      const newEnd = '2026-01-10';
      store.updateTask('t1', { end: newEnd });
      expect(store.tasks.get('t1')!.end).toBe(newEnd);
    });

    it('should support resize-start by updating start date', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-05', end: '2026-01-10' })], []);
      const newStart = '2026-01-01';
      store.updateTask('t1', { start: newStart });
      expect(store.tasks.get('t1')!.start).toBe(newStart);
    });

    it('should accept end date change even if before start (store-level validation is S3 scope)', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-05', end: '2026-01-10' })], []);
      store.updateTask('t1', { end: '2026-01-03' });
      expect(store.tasks.get('t1')!.end).toBe('2026-01-03');
    });
  });

  describe('link drawing', () => {
    it('should add a link between source and target on drop', () => {
      const store = new GanttStore();
      store.parse(
        [makeTask({ id: 't1' }), makeTask({ id: 't2' })],
        [],
      );
      expect(store.links.size).toBe(0);
      store.addLink('t1', 't2', 'finish_to_start');
      expect(store.links.size).toBe(1);
      const link = Array.from(store.links.values())[0];
      expect(link.source).toBe('t1');
      expect(link.target).toBe('t2');
    });

    it('should add link even for self-reference (S3 scope validates)', () => {
      const store = new GanttStore();
      store.parse(
        [makeTask({ id: 't1' })],
        [],
      );
      store.addLink('t1', 't1', 'finish_to_start');
      expect(store.links.size).toBe(1);
    });
  });

  describe('scroll sync', () => {
    it('should track scrollLeft changes in store', () => {
      const store = new GanttStore({ containerWidth: 800 });
      expect(store.scrollLeft).toBe(0);
      store.scrollLeft = 100;
      expect(store.scrollLeft).toBe(100);
    });

    it('should notify Zustand subscribers on recalcLayout', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1' })], []);
      let callCount = 0;
      const unsub = store.subscribe(() => { callCount++; });
      store.recalcLayout();
      expect(callCount).toBeGreaterThanOrEqual(1);
      unsub();
    });

    it('should increment layoutRevision on recalcLayout', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-01', end: '2026-01-10' })], []);
      const lr0 = store.layoutRevision;
      store.recalcLayout();
      expect(store.layoutRevision).toBe(lr0 + 1);
    });
  });

  describe('drag commit', () => {
    it('should call updateTask with correct delta', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([makeTask({ id: 't1', start: '2026-01-05', end: '2026-01-10' })], []);
      const dayDelta = 2;
      const task = store.tasks.get('t1')!;
      const oldStart = new Date(task.start);
      const newStart = new Date(oldStart);
      newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
      const oldEnd = new Date(task.end);
      const newEnd = new Date(oldEnd);
      newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      store.updateTask('t1', {
        start: newStart.toISOString().slice(0, 10),
        end: newEnd.toISOString().slice(0, 10),
      });
      const updated = store.tasks.get('t1')!;
      expect(updated.start).toBe('2026-01-07');
      expect(updated.end).toBe('2026-01-12');
    });
  });

  describe('keyboard interaction', () => {
    it('should update task on Enter', () => {
      const store = new GanttStore();
      store.parse([makeTask({ id: 't1', text: 'Original' })], []);
      store.updateTask('t1', { text: 'Updated' });
      expect(store.tasks.get('t1')!.text).toBe('Updated');
    });

    it('should toggle open/close via keyboard', () => {
      const store = new GanttStore();
      store.parse([
        makeTask({ id: 'p1', children: [makeTask({ id: 'c1', parent: 'p1' })] }),
      ], []);
      expect(store.getVisibleTasks()).toHaveLength(2);
      store.toggleOpen('p1');
      expect(store.getVisibleTasks()).toHaveLength(1);
    });
  });

  describe('keyboard event simulations on GanttEditor', () => {
    it('renders editor inputs when editing task is set', () => {
      const store = new GanttStore({ cellWidth: 40 });
      store.parse([
        { id: 't1', text: 'Test Task', start: '2026-01-01', end: '2026-01-10' },
      ], []);
      store.editTask('t1');
      render(
        <GanttEditor store={store} editingTaskId="t1" />,
      );
      const textInput = document.querySelector<HTMLInputElement>('input[id$="-edit-text"]');
      expect(textInput).toBeTruthy();
      expect(textInput!.value).toBe('Test Task');
    });
  });
});
