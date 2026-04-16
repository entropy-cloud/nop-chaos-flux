import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';
import { buttonRenderer, env, submitCalls } from '@nop-chaos/flux-renderers-form';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe('formRendererDefinitions - runtime-registered composite fields', () => {
  it('validates a runtime-registered complex field and blocks submit', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: 'submit',
          data: {
            tags: []
          },
          body: [
            {
              type: 'tag-list',
              name: 'tags',
              label: 'Tag List',
              tags: ['alpha', 'beta']
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit tags',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/tags',
                  method: 'post'
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit tags'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(0);
    });
    expect(screen.getByText('Tag List requires at least one tag')).toBeTruthy();
    expect(document.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);

    fireEvent.click(screen.getByText('alpha'));

    await waitFor(() => {
      expect(screen.queryByText('Tag List requires at least one tag')).toBeNull();
    });

    fireEvent.click(screen.getByText('Submit tags'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({ tags: ['alpha'] });
  });

  it('submits and validates a runtime-registered key-value editor', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: 'submit',
          data: {
            metadata: []
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              addLabel: 'Add metadata entry'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit metadata',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/metadata',
                  method: 'post'
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit metadata'));

    expect(await screen.findByText('Metadata requires at least one entry')).toBeTruthy();
    expect(document.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);

    const firstMetadataCall = submitCalls.length;

    fireEvent.click(screen.getByText('Add metadata entry'));
    fireEvent.change(screen.getByPlaceholderText('Key'), { target: { value: 'env' } });
    fireEvent.click(screen.getByText('Submit metadata'));

    expect(await screen.findByText('Entry 1 value is required')).toBeTruthy();
    expect(submitCalls).toHaveLength(firstMetadataCall);

    fireEvent.change(screen.getByPlaceholderText('Value'), { target: { value: 'prod' } });
    fireEvent.click(screen.getByText('Submit metadata'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      metadata: [{ key: 'env', value: 'prod' }]
    });
  });

  it('renders child validation state for runtime-registered key-value cells', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'dirty', 'submit'],
          data: {
            metadata: [{ key: '', value: '' }]
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const keyInput = screen.getByPlaceholderText('Key');
    const valueInput = screen.getByPlaceholderText('Value');
    const keyField = keyInput.closest('div');
    const valueField = valueInput.closest('div');

    fireEvent.change(valueInput, { target: { value: 'prod' } });
    fireEvent.focus(keyInput);
    fireEvent.blur(keyInput);

    expect(await screen.findByText('Entry 1 key is required')).toBeTruthy();
    expect(keyField?.hasAttribute('data-child-field-visited')).toBe(true);
    expect(keyField?.hasAttribute('data-child-field-touched')).toBe(true);
    expect(keyField?.hasAttribute('data-child-field-invalid')).toBe(true);
    expect(valueField?.hasAttribute('data-child-field-invalid')).toBe(false);

    fireEvent.change(keyInput, { target: { value: 'env' } });

    await waitFor(() => {
      expect(screen.queryByText('Entry 1 key is required')).toBeNull();
    });

    await waitFor(() => {
      expect((keyInput as HTMLInputElement).value).toBe('env');
    });
    expect(valueField?.hasAttribute('data-child-field-dirty')).toBe(true);
  });

  it('submits and validates a runtime-registered array editor', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: 'submit',
          data: {
            reviewers: []
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit reviewers',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/reviewers',
                  method: 'post'
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit reviewers'));

    expect(await screen.findByText('Reviewers requires at least one item')).toBeTruthy();
    expect(document.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(submitCalls).toHaveLength(0);

    const firstReviewerCall = submitCalls.length;

    fireEvent.click(screen.getByText('Add item'));
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByText('Submit reviewers'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(firstReviewerCall + 1);
    });

    expect(Array.isArray(submitCalls[0].reviewers)).toBe(true);
    expect(submitCalls[0].reviewers[0]).toMatchObject({ value: 'alice' });
  });

  it('tracks runtime-registered array editor child interaction state', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            reviewers: [{ value: '' }]
          },
          body: [
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.focus(screen.getByPlaceholderText('Reviewer 1'));
    fireEvent.blur(screen.getByPlaceholderText('Reviewer 1'));
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('Reviewer 1'), { target: { value: '' } });

    expect(await screen.findByText('Reviewer 1 is required')).toBeTruthy();
    const childField = screen.getByPlaceholderText('Reviewer 1').closest('div');
    expect(childField?.hasAttribute('data-child-field-visited')).toBe(true);
    expect(childField?.hasAttribute('data-child-field-touched')).toBe(true);
    expect(childField?.hasAttribute('data-child-field-dirty')).toBe(true);
    expect(childField?.hasAttribute('data-child-field-invalid')).toBe(true);
  });
});
