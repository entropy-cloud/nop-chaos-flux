import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { processTableData } from '../table-renderer/table-data.js';
import { renderExpandedRow } from '../table-renderer/table-body-row-rendering.js';
import type { FlattenedExpandedRow } from '../table-renderer/table-flattened-items.js';
import type { TableSchema, TableColumnSchema } from '../schemas.js';

function makeRecordScope(record: Record<string, unknown>): ScopeRef {
  return {
    id: 'row-scope',
    path: '$row',
    value: { record },
    get(path: string) {
      if (path === 'record') return record;
      if (path === 'index') return 0;
      return undefined;
    },
    has: () => false,
    readOwn: () => ({ record }),
    readVisible: () => ({ record }),
    materializeVisible: () => ({ record }),
    update: () => {},
    merge() {},
  };
}

const NESTED_ROWS = [
  { id: 1, meta: { updatedAt: '2024-03-01', status: 'active' } },
  { id: 2, meta: { updatedAt: '2024-01-01', status: 'draft' } },
  { id: 3, meta: { updatedAt: '2024-02-01', status: 'active' } },
];

describe('table dotted/nested column path resolution (B3.1 / T6)', () => {
  afterEach(() => {
    cleanup();
  });

  it('sorts by a dotted column name through the nested path (path binder)', () => {
    const sorted = processTableData(
      NESTED_ROWS,
      'id',
      { column: 'meta.updatedAt', direction: 'asc' },
      {},
    );

    expect(sorted.map((row) => row.rowKey)).toEqual(['2', '3', '1']);
  });

  it('filters by a dotted column name through the nested path (path binder)', () => {
    const filtered = processTableData(NESTED_ROWS, 'id', [], {
      'meta.status': { values: new Set(['active']) },
    });

    expect(filtered.map((row) => row.rowKey)).toEqual(['1', '3']);
  });

  it('resolves a dotted column name for cell display through the nested path', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-dotted-column"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Updated', name: 'meta.updatedAt' }],
              source: NESTED_ROWS,
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('2024-01-01')).toBeTruthy();
    expect(screen.getByText('2024-02-01')).toBeTruthy();
    expect(screen.getByText('2024-03-01')).toBeTruthy();
  });

  it('still resolves flat column names after the path-binder upgrade (regression)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-flat-column"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });
});

// M-04: the responsive expanded row (narrow viewport, hidden columns rendered
// inline) must resolve a dotted `column.name` through the nested record — same
// getIn contract as the desktop cell chrome. Previously this newly-extracted
// branch read `record[column.name]` literally, so "user.address" yielded
// undefined and the expanded cell rendered empty.
describe('table dotted/nested column path resolution in the responsive expanded row (M-04)', () => {
  afterEach(() => {
    cleanup();
  });

  it('resolves a dotted hidden-column name through the nested record', () => {
    const record = { id: 1, user: { address: '123 Main St' } };
    const rowScopeCache = new Map<string, ScopeRef>([['1', makeRecordScope(record)]]);
    const parentProps = {
      props: {},
      helpers: {},
      regions: {},
      events: {},
      node: { instancePath: [{ repeatedTemplateId: 'page', instanceKey: 'root' }] },
    } as any;
    const item: FlattenedExpandedRow = { kind: 'expanded', rowKey: '1', columnCount: 2 };
    const hiddenColumns: TableColumnSchema[] = [
      { type: 'column', label: 'Address', name: 'user.address' },
    ];

    const { container } = render(
      <table>
        <tbody>
          {renderExpandedRow(
            item,
            { type: 'table' } as TableSchema,
            parentProps.helpers,
            parentProps,
            rowScopeCache,
            'table-row:unit',
            hiddenColumns,
          )}
        </tbody>
      </table>,
    );

    expect(container.textContent).toContain('123 Main St');
  });

  it('still resolves flat hidden-column names in the responsive expanded row (regression)', () => {
    const record = { id: 1, name: 'Alice' };
    const rowScopeCache = new Map<string, ScopeRef>([['1', makeRecordScope(record)]]);
    const parentProps = {
      props: {},
      helpers: {},
      regions: {},
      events: {},
      node: { instancePath: [{ repeatedTemplateId: 'page', instanceKey: 'root' }] },
    } as any;
    const item: FlattenedExpandedRow = { kind: 'expanded', rowKey: '1', columnCount: 2 };

    const { container } = render(
      <table>
        <tbody>
          {renderExpandedRow(
            item,
            { type: 'table' } as TableSchema,
            parentProps.helpers,
            parentProps,
            rowScopeCache,
            'table-row:unit',
            [{ type: 'column', label: 'Name', name: 'name' }],
          )}
        </tbody>
      </table>,
    );

    expect(container.textContent).toContain('Alice');
  });
});
