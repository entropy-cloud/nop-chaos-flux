import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SOURCE = [
  { id: 'r1', name: 'Alice' },
  { id: 'r2', name: 'Bob' },
];

function tableRoot() {
  return document.querySelector('.nop-table') as HTMLElement;
}

afterEach(cleanup);

describe('table density tier (L4.1)', () => {
  it('emits data-density=compact/relaxed for declared tiers', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://table-density-compact"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              density: 'compact',
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(tableRoot()).toBeTruthy());
    expect(tableRoot().getAttribute('data-density')).toBe('compact');

    rerender(
      <SchemaRenderer
        schemaUrl="test://table-density-compact"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              density: 'relaxed',
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(tableRoot().getAttribute('data-density')).toBe('relaxed');
  });

  it('falls back to default for unknown tiers and emits no attribute by default', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://table-density-invalid"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              density: 'huge' as never,
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(tableRoot()).toBeTruthy());
    expect(tableRoot().hasAttribute('data-density')).toBe(false);

    rerender(
      <SchemaRenderer
        schemaUrl="test://table-density-invalid"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(tableRoot().hasAttribute('data-density')).toBe(false);
  });
});
