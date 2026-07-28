import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from '../scheduling-renderer-definitions.js';

const SchemaRenderer = createSchemaRenderer(schedulingRendererDefinitions);

const env: RendererEnv = {
  fetcher: async function <T>() { return { ok: true, status: 200, data: null as T }; },
  notify: () => undefined,
};
const formulaCompiler = createFormulaCompiler();

beforeAll(() => {
  document.body.style.height = '800px';
});

const kanbanSchema = {
  type: 'kanban',
  draggable: false,
  columnDraggable: false,
  data: {
    root: {
      id: 'root', type: 'root' as const, children: ['col1', 'col2', 'col3'], data: {}, meta: {},
    },
    col1: {
      id: 'col1', type: 'column' as const, parentId: 'root', children: ['card1', 'card2', 'card3'],
      data: { title: 'Backlog' }, meta: {},
    },
    col2: {
      id: 'col2', type: 'column' as const, parentId: 'root', children: ['card4', 'card5'],
      data: { title: 'In Progress' }, meta: {},
    },
    col3: {
      id: 'col3', type: 'column' as const, parentId: 'root', children: ['card6'],
      data: { title: 'Done' }, meta: {},
    },
    card1: {
      id: 'card1', type: 'card' as const, parentId: 'col1', children: [],
      data: { title: 'Task A' }, meta: {},
    },
    card2: {
      id: 'card2', type: 'card' as const, parentId: 'col1', children: [],
      data: { title: 'Task B' }, meta: {},
    },
    card3: {
      id: 'card3', type: 'card' as const, parentId: 'col1', children: [],
      data: { title: 'Task C' }, meta: {},
    },
    card4: {
      id: 'card4', type: 'card' as const, parentId: 'col2', children: [],
      data: { title: 'Task D' }, meta: {},
    },
    card5: {
      id: 'card5', type: 'card' as const, parentId: 'col2', children: [],
      data: { title: 'Task E' }, meta: {},
    },
    card6: {
      id: 'card6', type: 'card' as const, parentId: 'col3', children: [],
      data: { title: 'Task F' }, meta: {},
    },
  },
};

describe('Kanban Schema Renderer Integration', () => {
  it('renders kanban board via SchemaRenderer', () => {
    const { container } = render(
      <SchemaRenderer schema={kanbanSchema} schemaUrl="/kanban" env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(container.querySelector('[data-slot="kanban"]')).toBeTruthy();
  });

  it('renders expected number of columns', () => {
    const { container } = render(
      <SchemaRenderer schema={kanbanSchema} schemaUrl="/kanban" env={env} formulaCompiler={formulaCompiler} />,
    );
    const columns = container.querySelectorAll('[data-slot="kanban-column"]');
    expect(columns.length).toBe(3);
  });

  it('renders correct card counts on columns', () => {
    const { container } = render(
      <SchemaRenderer schema={kanbanSchema} schemaUrl="/kanban" env={env} formulaCompiler={formulaCompiler} />,
    );
    const columns = container.querySelectorAll('[data-slot="kanban-column"]');
    expect(columns[0].getAttribute('data-card-count')).toBe('3');
    expect(columns[1].getAttribute('data-card-count')).toBe('2');
    expect(columns[2].getAttribute('data-card-count')).toBe('1');
  });

  it('renders column titles', () => {
    const { container } = render(
      <SchemaRenderer schema={kanbanSchema} schemaUrl="/kanban" env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(container.textContent).toContain('Backlog');
    expect(container.textContent).toContain('In Progress');
    expect(container.textContent).toContain('Done');
  });
});
