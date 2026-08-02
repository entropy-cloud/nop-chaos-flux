import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler, pageRenderer, textRenderer, buttonRenderer } from './test-support.js';
import { layoutRendererDefinitions } from './layout-renderer-definitions.js';

// Real dropdown-button definition only (carries the schema-definition
// propContracts); no duplicate registration with the inline test-support set.
const realDropdownButtonDefinition = layoutRendererDefinitions.find(
  (definition) => definition.type === 'dropdown-button',
)!;

const SchemaRenderer = createSchemaRenderer([
  pageRenderer,
  textRenderer,
  buttonRenderer,
  realDropdownButtonDefinition,
]);

/**
 * RED-LINE runtime contract (turns green): fully-static dropdown-button items
 * compiled through the REAL definition must keep their action/onClick as a
 * compiler-preserved envelope, and the renderer must unwrap + dispatch the
 * raw action. Before the schema-definition pipeline, the item action was
 * compiled into the props expression and evaluated against the row scope.
 *
 * Guards the static/object-node behavior split: a fully-static items array
 * keeps the envelope object in the compiled value; the renderer unwrap chain
 * must handle envelope / raw / mixed forms identically.
 */
describe('dropdown-button red-line: envelope unwrap + dispatch (real definition)', () => {
  afterEach(() => {
    cleanup();
  });

  it('dispatches the raw action from fully-static items (envelope unwrapped)', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://layout/dropdown-button-redline"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'Menu',
              items: [
                {
                  label: 'Set From Dropdown',
                  action: { action: 'setValue', args: { path: 'clicked', value: true } },
                },
              ],
            },
            { type: 'text', text: 'clicked:${clicked ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('clicked:no')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-slot="dropdown-button-trigger"]') as HTMLElement);
    await waitFor(() => expect(screen.getByText('Set From Dropdown')).toBeTruthy());
    fireEvent.click(screen.getByText('Set From Dropdown'));

    // Dispatch succeeded: the enveloped action was unwrapped and executed.
    await waitFor(() => expect(screen.getByText('clicked:yes')).toBeTruthy(), { timeout: 3000 });
  });
});
