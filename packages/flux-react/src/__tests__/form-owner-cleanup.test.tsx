import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '../schema-renderer.js';
import { useCurrentForm } from '../hooks.js';
import { env, formRenderer, pageRenderer, sharedFormulaCompiler } from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Form owner boundary cleanup', () => {
  it('H9: useCurrentForm returns undefined after owning form unmounts', async () => {
    let capturedFormIds: (string | undefined)[] = [];

    function FormAwareProbe() {
      const form = useCurrentForm();
      capturedFormIds.push((form as any)?.scopeId);
      return <span data-testid="form-aware">{form ? 'in-form' : 'no-form'}</span>;
    }

    const formAwareProbeRenderer = {
      type: 'form-aware-probe',
      component: FormAwareProbe,
    };

    const toggleFormRenderer: RendererDefinition = {
      type: 'toggle-form-host',
      component: function ToggleFormHost(props: any) {
        const [showForm, setShowForm] = React.useState(true);
        return (
          <div>
            <button
              type="button"
              data-testid="toggle-form"
              onClick={() => setShowForm((v: boolean) => !v)}
            >
              {showForm ? 'Hide form' : 'Show form'}
            </button>
            {showForm
              ? (props.regions as any).withForm?.render()
              : (props.regions as any).withoutForm?.render()}
          </div>
        );
      },
      fields: [
        { key: 'withForm', kind: 'region', regionKey: 'withForm' },
        { key: 'withoutForm', kind: 'region', regionKey: 'withoutForm' },
      ],
    };

    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      formAwareProbeRenderer,
      toggleFormRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'toggle-form-host',
              withForm: [
                {
                  type: 'form',
                  body: [{ type: 'form-aware-probe' }],
                },
              ],
              withoutForm: [{ type: 'form-aware-probe' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(screen.getByTestId('form-aware').textContent).toBe('in-form');
    const inFormId = capturedFormIds[capturedFormIds.length - 1];
    expect(inFormId).toBeTruthy();

    capturedFormIds = [];
    fireEvent.click(screen.getByTestId('toggle-form'));
    await waitFor(() => {
      expect(screen.getByTestId('form-aware').textContent).toBe('no-form');
    });
    const afterUnmount = capturedFormIds[capturedFormIds.length - 1];
    expect(afterUnmount).toBeUndefined();
  });
});
