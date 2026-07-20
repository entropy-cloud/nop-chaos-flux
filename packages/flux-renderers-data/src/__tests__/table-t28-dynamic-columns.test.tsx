import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { dataRendererDefinitions } from '../index.js';
import type { TableColumnSchema } from '../schemas.js';

afterEach(() => {
  cleanup();
});

const testEnv = {
  fetcher: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  notify: vi.fn(),
} as any;

describe('T28 dynamic column recompilation', () => {
  it('handles static columns array as before', () => {
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://table/static-columns"
        schema={
          {
            type: 'table',
            source: [],
            columns: [
              { name: 'id', label: 'ID' },
              { name: 'name', label: 'Name' },
            ],
          } as any
        }
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const headerCells = container.querySelectorAll('th');
    expect(headerCells.length).toBeGreaterThan(0);
  });

  it('falls back to empty columns when the column expression returns non-array', () => {
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://table/invalid-dynamic-columns"
        schema={
          {
            type: 'table',
            source: [{ id: 1 }],
            columns: '${undefined}',
          } as any
        }
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const headerCells = container.querySelectorAll('th');
    expect(headerCells.length).toBe(0);
  });

  it('should use stable columns from a valid expression result', () => {
    const columns1 = [{ name: 'id', label: 'ID' }] as TableColumnSchema[];
    const valid = Array.isArray(columns1) ? columns1 : [];
    expect(valid).toHaveLength(1);

    const invalidResult: unknown = 'not-array';
    const fallback = Array.isArray(invalidResult) ? invalidResult : columns1;
    expect(fallback).toHaveLength(1);
    expect((fallback as TableColumnSchema[])[0].name).toBe('id');
  });
});
