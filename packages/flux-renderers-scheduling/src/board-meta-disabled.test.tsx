import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';

const SchemaRenderer = createSchemaRenderer(schedulingRendererDefinitions);

const env: RendererEnv = {
  fetcher: async function <T>() { return { status: 0, data: null as T }; },
  notify: () => undefined,
};
const formulaCompiler = createFormulaCompiler();

afterEach(cleanup);

const kanbanSchema = {
  type: 'kanban',
  disabled: true,
  data: {
    root: { id: 'root', type: 'root' as const, children: ['col1'], data: {}, meta: {} },
    col1: {
      id: 'col1', type: 'column' as const, parentId: 'root', children: ['card1'],
      data: { title: 'Backlog' }, meta: {},
    },
    card1: {
      id: 'card1', type: 'card' as const, parentId: 'col1', children: [],
      data: { title: 'Task A' }, meta: {},
    },
  },
};

const calendarSchema = {
  type: 'calendar',
  disabled: true,
  view: 'month' as const,
  date: '2026-07-01',
  events: [
    { id: 'e1', title: 'Morning Shift', start: '2026-07-21T08:00:00', end: '2026-07-21T16:00:00', type: 'shift', resourceId: 'r1' },
  ],
  resources: [{ id: 'r1', title: 'Team A' }],
};

const ganttSchema = {
  type: 'gantt',
  disabled: true,
  data: [
    { id: 't1', text: 'Task 1', start: '2026-07-01', end: '2026-07-05', duration: 4, progress: 10 },
  ],
  columns: ['text', 'start', 'end', 'duration'],
};

// [G4-R5-视角3-02] (R2 consistency audit, P2, swept with batch ①): the three
// board-class surfaces consumed zero meta.disabled — a "disabled" gantt /
// kanban / calendar stayed fully interactive (disabled-channel-block family,
// P2-5 disabled contract on whole interaction surfaces).
describe('[G4-R5-视角3-02] board-class surfaces honor meta.disabled', () => {
  function expectDisabledBoard(container: HTMLElement, slot: string) {
    const board = container.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
    expect(board, `board [data-slot=${slot}] must render`).toBeTruthy();
    expect(board!.hasAttribute('inert'), `${slot} must be inert`).toBe(true);
    expect(board!.getAttribute('aria-disabled')).toBe('true');
    expect(board!.getAttribute('data-disabled')).toBe('true');
  }

  it('disabled kanban renders an inert board', () => {
    const { container } = render(
      <SchemaRenderer schema={kanbanSchema} schemaUrl="/kanban-disabled" env={env} formulaCompiler={formulaCompiler} />,
    );
    expectDisabledBoard(container, 'kanban');
  });

  it('disabled calendar renders an inert board', () => {
    const { container } = render(
      <SchemaRenderer schema={calendarSchema} schemaUrl="/calendar-disabled" env={env} formulaCompiler={formulaCompiler} />,
    );
    expectDisabledBoard(container, 'calendar');
  });

  it('disabled gantt renders an inert board', () => {
    const { container } = render(
      <SchemaRenderer schema={ganttSchema} schemaUrl="/gantt-disabled" env={env} formulaCompiler={formulaCompiler} />,
    );
    expectDisabledBoard(container, 'gantt');
  });

  it('enabled kanban stays interactive (no regression)', () => {
    const enabled = { ...kanbanSchema, disabled: false } as typeof kanbanSchema;
    const { container } = render(
      <SchemaRenderer schema={enabled} schemaUrl="/kanban-enabled" env={env} formulaCompiler={formulaCompiler} />,
    );
    const board = container.querySelector('[data-slot="kanban"]') as HTMLElement;
    expect(board.hasAttribute('inert')).toBe(false);
    expect(board.getAttribute('data-disabled')).toBeNull();
  });
});
