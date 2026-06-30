import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  env,
  formStateProbeRenderer,
  formulaCompiler,
  makeCapturingFetcher,
  selectOption,
} from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object, fetcher?: unknown) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://b32-submit-validate"
      schema={schema as never}
      env={fetcher ? { ...env, fetcher: fetcher as never } : env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function fieldErrors(): NodeListOf<HTMLElement> {
  return document.querySelectorAll('[data-slot="field-error"]');
}

// --- C7: add does not surface required; edit+clear does; submit validates all ---

describe('B3.2 C7: add-vs-validate timing (showErrorOn gating)', () => {
  it('adding an empty required row surfaces no error; touch+clear does; submit validates all', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      showErrorOn: ['touched', 'submit'],
      data: { reviewers: [{ value: 'alice' }] },
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          itemLabel: 'Reviewer',
        },
        { type: 'button', label: 'SubmitReviewers', onClick: { action: 'submitForm' } },
      ],
    });

    await waitFor(() => expect(screen.getByPlaceholderText('Reviewer 1')).toBeTruthy());

    // Add an empty row. The new row's required field must NOT surface an error
    // because showErrorOn=['touched','submit'] hides untouched errors.
    fireEvent.click(screen.getByText('Add item'));
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Reviewer/)).toHaveLength(2));
    expect(fieldErrors().length).toBe(0);

    // Touch the new empty row's required field (focus+blur) -> error surfaces.
    const inputs = screen.getAllByPlaceholderText(/Reviewer/) as HTMLInputElement[];
    fireEvent.focus(inputs[1]);
    fireEvent.blur(inputs[1]);
    await waitFor(() => expect(fieldErrors().length).toBeGreaterThan(0));

    // Fill it, then add another empty row, then submit -> submit validates all rows.
    fireEvent.change(inputs[1], { target: { value: 'bob' } });
    await waitFor(() => expect(fieldErrors().length).toBe(0));

    fireEvent.click(screen.getByText('Add item'));
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Reviewer/)).toHaveLength(3));
    // The newly added untouched row still shows no error before submit.
    expect(fieldErrors().length).toBe(0);

    fireEvent.click(screen.getByText('SubmitReviewers'));
    // After submit, the empty required row is validated and surfaces an error.
    await waitFor(() => expect(fieldErrors().length).toBeGreaterThan(0));
  });
});

// --- C9: submit payload contains only declared fields (transient options excluded) ---

describe('B3.2 C9: submit value contains only declared fields (transient options excluded)', () => {
  it('a per-item select with source-backed options does not leak transient option payload into submit', async () => {
    const submitValues: Record<string, unknown>[] = [];
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { lines: [{ name: 'a', role: 'admin' }] },
        submitAction: { action: 'ajax', args: { url: '/api/lines', method: 'post' } },
        body: [
          {
            type: 'combo',
            id: 'c',
            name: 'lines',
            label: 'Lines',
            items: [
              { type: 'input-text', name: 'name', label: 'Name', placeholder: 'ItemName' },
              {
                type: 'select',
                name: 'role',
                label: 'Role',
                options: {
                  type: 'source',
                  formula: [
                    { label: 'Admin', value: 'admin' },
                    { label: 'Editor', value: 'editor' },
                  ],
                },
              },
            ],
          },
          { type: 'button', label: 'SubmitPayload', onClick: { action: 'submitForm' } },
        ],
      },
      makeCapturingFetcher(submitValues),
    );

    await waitFor(() => expect(screen.getByPlaceholderText('ItemName')).toBeTruthy());
    await waitFor(async () => {
      await selectOption('Role', 'Editor');
    });

    fireEvent.click(screen.getByText('SubmitPayload'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const payload = submitValues[0] as { lines: Array<Record<string, unknown>> };
    expect(payload.lines).toHaveLength(1);
    // Only the declared child fields are present; the transient option payload
    // (the source options / optionsSourceState) must not leak into submit values.
    expect(payload.lines[0]).toMatchObject({ name: 'a', role: 'editor' });
    expect(payload.lines[0]).not.toHaveProperty('options');
    expect(payload.lines[0]).not.toHaveProperty('optionsSourceState');
    expect(payload).not.toHaveProperty('optionsSourceState');
  });
});

export {};
