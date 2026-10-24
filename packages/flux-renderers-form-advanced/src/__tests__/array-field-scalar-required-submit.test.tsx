import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer, useCurrentFormState } from '@nop-chaos/flux-react';
import { env, formulaCompiler, makeCapturingFetcher } from '../test-support.js';

// array-field scalar items have no item-level error render slot (audit
// Round C noted the only prior test asserted label presence); the publish
// target is the form store's fieldStates — probe it directly.
const childErrorProbeRenderer = {
  type: 'child-error-probe',
  component: function ChildErrorProbe() {
    const errors = useCurrentFormState(
      (state) => (state as { fieldStates?: Record<string, { errors?: unknown }> }).fieldStates?.['tags.0']?.errors ?? null,
      Object.is,
    );
    return <pre data-testid="child-error">{JSON.stringify(errors)}</pre>;
  },
};

// P1-MA4.2-003 regression guard: the array-field scalar-item required chain
// (collectScalarArrayItemErrors consumed by BOTH the registerField validate
// path (:431-456) and the recurse-submit child contract triggerValidation
// (:464-516)) must block submit and surface the child error for
// `tags: ['']`. The only prior "related" test asserted label presence only —
// never triggering validation (audit Round C / C-01).
beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function fieldErrors(): NodeListOf<HTMLElement> {
  return document.querySelectorAll('[data-slot="field-error"]');
}

describe('array-field scalar-item required chain blocks submit (P1-MA4.2-003)', () => {
  it('submitting an empty required scalar item surfaces the child error and never reaches the submit fetcher; filling it lets submit through', async () => {
    const submitValues: Record<string, unknown>[] = [];
    const fetcher = makeCapturingFetcher(submitValues);
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
      childErrorProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://array-field-scalar-required-submit"
        schema={
          {
            type: 'form',
            id: 'f',
            showErrorOn: ['touched', 'submit'],
            data: { tags: [''] },
            submitAction: { action: 'ajax', args: { url: '/api/tags', method: 'post' } },
            body: [
              {
                type: 'array-field',
                id: 'a',
                name: 'tags',
                label: 'Tags',
                itemKind: 'scalar',
                scalarItemValidation: { label: 'Tag', required: true },
                item: [{ type: 'input-text', placeholder: 'Tag' }],
              },
              { type: 'button', label: 'SaveTags', onClick: { action: 'submitForm' } },
              { type: 'child-error-probe' },
            ],
          } as never
        }
        env={{ ...env, fetcher: fetcher as never }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByPlaceholderText('Tag')).toBeTruthy());
    expect(fieldErrors().length).toBe(0);

    fireEvent.click(screen.getByText('SaveTags'));

    await waitFor(() => {
      expect(screen.getByTestId('child-error').textContent).not.toBe('null');
    });
    expect(submitValues).toHaveLength(0);

    // Non-vacuous leg: filling the item lets the same submit reach the fetcher.
    fireEvent.change(screen.getByPlaceholderText('Tag'), { target: { value: 'alpha' } });
    await waitFor(() => {
      expect(fieldErrors().length).toBe(0);
      expect(screen.getByTestId('child-error').textContent).toBe('null');
    });
    fireEvent.click(screen.getByText('SaveTags'));
    await waitFor(() => expect(submitValues).toHaveLength(1));
  });
});
