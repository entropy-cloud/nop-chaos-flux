import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { FormContext } from '../contexts.js';
import {
  env,
  formRenderer,
  pageRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support.js';
import {
  containerRenderer,
  detailViewLikeRenderer,
  importedLocalStateHostRenderer,
  importedSummaryProbeRenderer,
} from './scope-and-reactivity.test-support.js';

describe('createSchemaRenderer import-region reactivity', () => {
  it('refreshes sibling schema text nodes after form setValues updates multiple fields under xui:imports', async () => {
    const importLoader = {
      load: async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      }),
    };
    const updateRenderer = {
      type: 'update-summary-button',
      component: function UpdateSummaryButton() {
        const currentForm = React.useContext(FormContext);

        return (
          <button
            type="button"
            onClick={() => {
              currentForm?.setValues({
                'summary.name': 'Changed Name',
                'summary.status': 'published',
              });
            }}
          >
            Update imported summary
          </button>
        );
      },
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      textRenderer,
      containerRenderer,
      importedSummaryProbeRenderer,
      updateRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'container',
                  'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
                  body: [
                    { type: 'imported-summary-probe' },
                    { type: 'text', text: '${summary.name}' },
                    { type: 'text', text: '${summary.status}' },
                  ],
                },
                { type: 'update-summary-button' },
              ],
            },
          ],
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('import-probe-name').textContent).toBe('Original'));
    await waitFor(() => expect(screen.getByTestId('import-probe-status').textContent).toBe('draft'));

    fireEvent.click(screen.getByText('Update imported summary'));

    await waitFor(() => expect(screen.getByTestId('import-probe-name').textContent).toBe('Changed Name'));
    await waitFor(() => expect(screen.getByTestId('import-probe-status').textContent).toBe('published'));
    await waitFor(() => expect(screen.getAllByText('Changed Name').length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.getAllByText('published').length).toBeGreaterThanOrEqual(2));
  });

  it('refreshes imported region children after combined local rerender and form setValues', async () => {
    const importLoader = {
      load: async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      }),
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      importedLocalStateHostRenderer,
      importedSummaryProbeRenderer,
      textRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'imported-local-state-host',
                  'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
                  body: [
                    { type: 'imported-summary-probe' },
                    { type: 'text', text: '${summary.name}' },
                    { type: 'text', text: '${summary.status}' },
                  ],
                },
              ],
            },
          ],
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('import-probe-name').textContent).toBe('Original'));
    await waitFor(() => expect(screen.getByTestId('import-probe-status').textContent).toBe('draft'));

    fireEvent.click(screen.getByText('Update imported host summary'));

    await waitFor(() => expect(screen.getByTestId('import-probe-name').textContent).toBe('Changed Name'));
    await waitFor(() => expect(screen.getByTestId('import-probe-status').textContent).toBe('published'));
    await waitFor(() => expect(screen.getAllByText('Changed Name').length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.getAllByText('published').length).toBeGreaterThanOrEqual(2));
  });

  it('refreshes imported viewer region after detail-view-like confirm flow', async () => {
    const importLoader = {
      load: async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      }),
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      detailViewLikeRenderer,
      importedSummaryProbeRenderer,
      textRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'detail-view-like',
                  'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
                  viewer: [
                    { type: 'imported-summary-probe' },
                    { type: 'text', text: '${summary.name}' },
                    { type: 'text', text: '${summary.status}' },
                  ],
                },
              ],
            },
          ],
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('import-probe-name').textContent).toBe('Original'));
    await waitFor(() => expect(screen.getByTestId('import-probe-status').textContent).toBe('draft'));

    fireEvent.click(screen.getByText('Confirm detail-like edit'));

    await waitFor(() => expect(screen.getByTestId('import-probe-name').textContent).toBe('Changed Name'));
    await waitFor(() => expect(screen.getByTestId('import-probe-status').textContent).toBe('published'));
    await waitFor(() => expect(screen.getAllByText('Changed Name').length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.getAllByText('published').length).toBeGreaterThanOrEqual(2));
  });
});
