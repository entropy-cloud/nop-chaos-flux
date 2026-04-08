import { describe, expect, it } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createSchemaCompiler } from '@nop-chaos/flux-runtime';
import { dataRendererDefinitions } from './index';

const tableRendererDefinition = dataRendererDefinitions.find((definition) => definition.type === 'table');

if (!tableRendererDefinition) {
  throw new Error('table renderer definition is required for schema validator tests');
}

describe('table schemaValidator', () => {
  const compiler = createSchemaCompiler({
    registry: createRendererRegistry([tableRendererDefinition]),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler())
  });

  it('requires scope ownership state paths', () => {
    expect(compiler.validate?.({
      type: 'table',
      paginationOwnership: 'scope',
      selectionOwnership: 'scope'
    } as any)).toEqual([
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/paginationStatePath',
        source: 'renderer'
      }),
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/selectionStatePath',
        source: 'renderer'
      })
    ]);
  });

  it('reports invalid nested table configuration shapes', () => {
    expect(compiler.validate?.({
      type: 'table',
      columns: 'bad',
      pagination: { pageSizeOptions: ['10'] },
      rowSelection: { selectedRowKeys: [1] },
      expandable: { expandedRowKeys: [1] }
    } as any)).toEqual([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/columns',
        source: 'renderer'
      }),
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/pagination/pageSizeOptions',
        source: 'renderer'
      }),
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/rowSelection/selectedRowKeys',
        source: 'renderer'
      }),
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/expandable/expandedRowKeys',
        source: 'renderer'
      })
    ]);
  });
});
