import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env } from '../test-support.js';

// plan 595: `placeholder` is declared on the input-tree definition and feeds
// the tree-select controller (`triggerText`). Characterization: the inline
// tree accepts the prop, compiles clean under strict validation, and renders
// its empty state — the placeholder itself surfaces through the
// tree-select trigger surface, not the inline option list.
describe('input-tree declared placeholder (plan 595 coverage)', () => {
  afterEach(cleanup);

  it('accepts placeholder, compiles clean, and renders the empty state', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://input-tree-placeholder"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'input-tree',
                name: 'dept',
                label: 'Department',
                placeholder: 'Pick a department',
                options: [],
              },
            ],
          } as never
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByText('Department')).toBeTruthy();
    expect(screen.getByText(/未找到结果/)).toBeTruthy();
  });
});
