import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';
import {
  buttonRenderer,
  env,
  handlerIdentityProbeRenderer,
  handlerIdentitySnapshots,
  sharedFormulaCompiler,
  submitCalls,
} from './form-test-support';

describe('formRendererDefinitions - input types and field handlers', () => {
  it('allows appending multiple characters in input-email fields', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers"
        schema={{
          type: 'form',
          data: {
            email: '',
          },
          body: [
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByLabelText(/Email/) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'a' } });
    expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe('a');

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ab' } });
    expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe('ab');

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'abc@example.com' } });
    expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe('abc@example.com');
  });

  it('keeps field handler object identity stable across host rerenders when inputs are unchanged', () => {
    cleanup();
    handlerIdentitySnapshots.length = 0;
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      handlerIdentityProbeRenderer,
    ]);

    const schema = {
      type: 'form',
      data: {
        username: 'alice',
      },
      body: [
        {
          type: 'handler-identity-probe',
          name: 'username',
        },
      ],
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers"
        schema={schema}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(handlerIdentitySnapshots).toHaveLength(1);

    rerender(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers"
        schema={schema}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(handlerIdentitySnapshots).toHaveLength(1);
  });

  it('submits checkbox values through shared field handlers', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers"
        schema={{
          type: 'form',
          data: {
            approved: false,
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/approval',
              method: 'post',
            },
          },
          body: [
            {
              type: 'checkbox',
              name: 'approved',
              label: 'Approval',
              option: {
                label: 'Approved',
              },
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit approval',
              onClick: {
                action: 'submitForm',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Submit approval'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({ approved: true });
  });

  it('submits textarea and radio-group values through shared field helpers', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers"
        schema={{
          type: 'form',
          data: {
            notes: 'Initial note',
            status: 'draft',
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/article',
              method: 'post',
            },
          },
          body: [
            {
              type: 'textarea',
              name: 'notes',
              label: 'Notes',
              rows: 5,
            },
            {
              type: 'radio-group',
              name: 'status',
              label: 'Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
              ],
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit article',
              onClick: {
                action: 'submitForm',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Updated note' } });
    fireEvent.click(screen.getByRole('radio', { name: /Published/ }));
    fireEvent.click(screen.getByText('Submit article'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      notes: 'Updated note',
      status: 'published',
    });
  });

  it('submits switch and checkbox-group values through shared field helpers', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers"
        schema={{
          type: 'form',
          data: {
            featured: false,
            tags: ['stable'],
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/release',
              method: 'post',
            },
          },
          body: [
            {
              type: 'switch',
              name: 'featured',
              label: 'Featured',
              option: {
                onLabel: 'Live',
                offLabel: 'Hidden',
              },
            },
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Tags',
              options: [
                { label: 'Stable', value: 'stable' },
                { label: 'Beta', value: 'beta' },
              ],
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit release',
              onClick: {
                action: 'submitForm',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: /Featured/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Beta/ }));
    fireEvent.click(screen.getByText('Submit release'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      featured: true,
      tags: ['stable', 'beta'],
    });
  });

  it('keeps input-text null values rendered as empty string', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers#null-input"
        schema={{
          type: 'form',
          data: {
            title: null,
          },
          body: [
            {
              type: 'input-text',
              name: 'title',
              label: 'Title',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('');
  });

  it('submits checkbox false values through shared field handlers', async () => {
    submitCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/field-handlers#checkbox-false"
        schema={{
          type: 'form',
          data: {
            approved: true,
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/approval',
              method: 'post',
            },
          },
          body: [
            {
              type: 'checkbox',
              name: 'approved',
              label: 'Approval',
              option: {
                label: 'Approved',
              },
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit approval',
              onClick: {
                action: 'submitForm',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Submit approval'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({ approved: false });
  });
});
