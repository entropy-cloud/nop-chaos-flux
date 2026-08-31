import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from '../scheduling-renderer-definitions.js';

// G-C kanban per-column header aggregate contract (owner plan
// 2026-08-31-0721-1): board-level `columnAggregate` declaration evaluated per
// column over the column's filtered card set, rendered in the default header
// beside the count badge; region override suppresses it; missing declaration
// is a zero-regression no-op.

const probeDefinition: RendererDefinition = {
  type: 'aggregate-probe',
  component: ((props: { props: { text?: unknown } }) => (
    <span>{String(props.props?.text ?? '')}</span>
  )) as unknown as RendererDefinition['component'],
  fields: [{ key: 'text', kind: 'prop' }],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: () => undefined,
};
const formulaCompiler = createFormulaCompiler();

function boardData(): Record<string, unknown> {
  return {
    root: { id: 'root', type: 'root', children: ['col1', 'col2'], data: {}, meta: {} },
    col1: {
      id: 'col1', type: 'column', parentId: 'root', children: ['c1', 'c2'],
      data: { title: 'Backlog' }, meta: {},
    },
    col2: {
      id: 'col2', type: 'column', parentId: 'root', children: ['c3'],
      data: { title: 'Done' }, meta: {},
    },
    c1: { id: 'c1', type: 'card', parentId: 'col1', children: [], data: { title: 'A', points: 10 }, meta: {} },
    c2: { id: 'c2', type: 'card', parentId: 'col1', children: [], data: { title: 'B', points: 20 }, meta: {} },
    c3: { id: 'c3', type: 'card', parentId: 'col2', children: [], data: { title: 'C', points: 40 }, meta: {} },
  };
}

function renderBoard(overrides: Record<string, unknown> = {}, data: Record<string, unknown> = boardData()) {
  const SchemaRenderer = createSchemaRenderer([...schedulingRendererDefinitions, probeDefinition]);
  return render(
    <SchemaRenderer
      schema={{ type: 'kanban', draggable: false, columnDraggable: false, data, ...overrides } as any}
      schemaUrl="/kanban-aggregate"
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function aggregateTexts(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="kanban-column-aggregate"]')).map(
    (el) => el.textContent ?? '',
  );
}

describe('kanban column aggregate — render integration', () => {
  it('renders per-column values from one board-level declaration (per-column isolation)', async () => {
    renderBoard({ columnAggregate: { fn: 'sum', field: 'points' } });

    await waitFor(() => expect(aggregateTexts()).toHaveLength(2));
    expect(aggregateTexts()[0]).toBe('sum: 30');
    expect(aggregateTexts()[1]).toBe('sum: 40');
  });

  it('uses the fn token as the default label and honors a label override', async () => {
    renderBoard({ columnAggregate: { fn: 'count', label: 'Cards' } });

    await waitFor(() => expect(aggregateTexts()).toHaveLength(2));
    expect(aggregateTexts()[0]).toBe('Cards: 2');
    expect(aggregateTexts()[1]).toBe('Cards: 1');
  });

  it('shows the "-" fallback with a one-time board-level dev warn on missing values', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = boardData();
    for (const cardId of ['c1', 'c2', 'c3']) {
      delete ((data[cardId] as Record<string, unknown>).data as Record<string, unknown>).points;
    }
    renderBoard({ columnAggregate: { fn: 'avg', field: 'points' } }, data);

    await waitFor(() => expect(aggregateTexts()).toHaveLength(2));
    expect(aggregateTexts()[0]).toBe('avg: -');
    expect(aggregateTexts()[1]).toBe('avg: -');
    const aggregateWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('kanban-aggregate-missing-field'),
    );
    expect(aggregateWarns).toHaveLength(1);
  });

  it('without a columnAggregate declaration the header is aggregate-free (zero regression)', async () => {
    renderBoard();

    await waitFor(() => expect(document.querySelectorAll('[data-slot="kanban-column"]')).toHaveLength(2));
    expect(aggregateTexts()).toHaveLength(0);
  });

  it('a columnHeader region override takes the whole header and suppresses the aggregate', async () => {
    renderBoard({
      columnAggregate: { fn: 'sum', field: 'points' },
      columnHeader: { type: 'aggregate-probe', text: 'CUSTOM-HEADER' },
    });

    await waitFor(() => expect(screen.getAllByText('CUSTOM-HEADER')).toHaveLength(2));
    expect(aggregateTexts()).toHaveLength(0);
  });
});
