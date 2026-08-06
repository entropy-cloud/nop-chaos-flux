import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { dataRendererDefinitions } from '../index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const testEnv = {
  fetcher: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  notify: vi.fn(),
} as any;

// columns is an expression resolved against the page scope data (`cols`).
const SCHEMA = {
  type: 'table',
  source: [{ id: 1, name: 'Alice' }],
  columns: '${cols}',
} as any;

const ID_COL = { name: 'id', label: 'ID' };
const NAME_COL = { name: 'name', label: 'Name' };

describe('T29 dynamic columns last-good retention (04-01)', () => {
  it('renders new columns when the columns expression result changes', () => {
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://table/last-good-columns"
        schema={SCHEMA}
        data={{ cols: [ID_COL] }}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(container.querySelectorAll('th').length).toBe(1);
    expect(container.querySelector('th')?.textContent).toBe('ID');

    rerender(
      <SchemaRenderer
        schemaUrl="test://table/last-good-columns"
        schema={SCHEMA}
        data={{ cols: [ID_COL, NAME_COL] }}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(container.querySelectorAll('th').length).toBe(2);
    expect(container.querySelector('th:last-child')?.textContent).toBe('Name');
  });

  it('keeps the last valid columns and warns when the expression returns an invalid format', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://table/last-good-columns"
        schema={SCHEMA}
        data={{ cols: [ID_COL, NAME_COL] }}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(container.querySelectorAll('th').length).toBe(2);

    rerender(
      <SchemaRenderer
        schemaUrl="test://table/last-good-columns"
        schema={SCHEMA}
        data={{ cols: 'not-an-array' }}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(container.querySelectorAll('th').length).toBe(2);
    expect(container.querySelector('th')?.textContent).toBe('ID');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid format'));
  });

  it('falls back to empty columns when the initial expression result is invalid', () => {
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://table/last-good-columns"
        schema={SCHEMA}
        data={{ cols: 'not-an-array' }}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(container.querySelectorAll('th').length).toBe(0);
  });
});
