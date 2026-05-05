import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { dataRendererDefinitions } from './index';

const tableRendererDefinition = dataRendererDefinitions.find(
  (definition) => definition.type === 'table',
);
const crudRendererDefinition = dataRendererDefinitions.find(
  (definition) => definition.type === 'crud',
);

if (!tableRendererDefinition) {
  throw new Error('table renderer definition is required for schema validator tests');
}

if (!crudRendererDefinition) {
  throw new Error('crud renderer definition is required for schema validator tests');
}

describe('table schemaValidator', () => {
  const compiler = createSchemaCompiler({
    registry: createRendererRegistry([tableRendererDefinition]),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });

  it('requires scope ownership state paths', () => {
    expect(
      compiler.validate?.({
        type: 'table',
        paginationOwnership: 'scope',
        selectionOwnership: 'scope',
      } as any),
    ).toEqual([
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/paginationStatePath',
        source: 'renderer',
      }),
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/selectionStatePath',
        source: 'renderer',
      }),
    ]);
  });

  it('reports invalid nested table configuration shapes', () => {
    expect(
      compiler.validate?.({
        type: 'table',
        columns: 'bad',
        pagination: { pageSizeOptions: ['10'] },
        rowSelection: { selectedRowKeys: [1] },
        expandable: { expandedRowKeys: [1] },
      } as any),
    ).toEqual([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/columns',
        source: 'renderer',
      }),
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/pagination/pageSizeOptions',
        source: 'renderer',
      }),
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/rowSelection/selectedRowKeys',
        source: 'renderer',
      }),
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/expandable/expandedRowKeys',
        source: 'renderer',
      }),
    ]);
  });
});

describe('crud schemaValidator', () => {
  const compiler = createSchemaCompiler({
    registry: createRendererRegistry([
      crudRendererDefinition,
      {
        type: 'text',
        component: () => null,
      },
    ]),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });

  it('requires scope ownership state paths', () => {
    expect(
      compiler.validate?.({
        type: 'crud',
        paginationOwnership: 'scope',
        selectionOwnership: 'scope',
        sortOwnership: 'scope',
        filterOwnership: 'scope',
      } as any),
    ).toEqual([
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/paginationStatePath',
        source: 'renderer',
      }),
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/selectionStatePath',
        source: 'renderer',
      }),
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/sortStatePath',
        source: 'renderer',
      }),
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/filterStatePath',
        source: 'renderer',
      }),
    ]);
  });

  it('reports invalid columns shape', () => {
    expect(
      compiler.validate?.({
        type: 'crud',
        columns: 'bad',
      } as any),
    ).toEqual([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/columns',
        source: 'renderer',
      }),
    ]);
  });

  it('rejects legacy bulkActions authoring', () => {
    expect(
      compiler.validate?.({
        type: 'crud',
        bulkActions: [
          {
            type: 'text',
            text: 'Delete',
          },
        ],
        columns: [],
      } as any),
    ).toEqual(
      expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/bulkActions',
        source: 'renderer',
      }),
      ]),
    );
  });

  it('rejects legacy bulkActions when canonical listActions is also present', () => {
    expect(
      compiler.validate?.({
        type: 'crud',
        bulkActions: [{ type: 'text', text: 'Delete' }],
        listActions: [{ type: 'text', text: 'Refresh' }],
        columns: [],
      } as any),
    ).toEqual(
      expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/bulkActions',
        source: 'renderer',
      }),
      ]),
    );
  });

  it('rejects legacy filter, primaryField, and perPageField authoring', () => {
    expect(
      compiler.validate?.({
        type: 'crud',
        filter: {
          body: [{ type: 'text', text: 'Query form' }],
        },
        primaryField: 'id',
        perPageField: 'pageSize',
        columns: [],
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-property-shape', path: '/filter', source: 'renderer' }),
        expect.objectContaining({ code: 'invalid-property-shape', path: '/primaryField', source: 'renderer' }),
        expect.objectContaining({ code: 'invalid-property-shape', path: '/perPageField', source: 'renderer' }),
      ]),
    );
  });
});
