import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  allFormDefs,
  env,
  formulaCompiler,
  fieldValueProbeRenderer,
  submitButtonRenderer,
  makeCapturingFetcher
} from './__tests__/object-field-test-support';

describe('object-field renderer', () => {
  it('renders child fields and reads relative paths correctly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, fieldValueProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith'
            }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              className: 'border',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeTruthy();
    });

    const field = screen.getByText('Profile').closest('.nop-field');
    expect(field).toBeTruthy();
    expect(field?.className).toContain('border');
    expect(field?.querySelector('[data-slot="field-label"]')?.textContent).toContain('Profile');
    expect(field?.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="object-field-body"]')).toBeTruthy();

    expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice');
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');
  });

  it('writes child field changes through prefixed path to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];

    const SchemaRenderer = createSchemaRenderer([...allFormDefs, submitButtonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#2"
        schema={{
          type: 'form',
          id: 'obj-form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith'
            }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' }
              ]
            }
          ],
          submitAction: {
            action: 'ajax',
            args: { url: '/api/test', method: 'post' }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form' }
            }
          ]
        }}
        env={{
          ...env,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Bob' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'Bob', lastName: 'Smith' }
    });
  });

  it('shows child field validation errors via the object-prefixed path', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#3"
        schema={{
          type: 'form',
          data: {
            profile: { email: '' }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                {
                  type: 'input-text',
                  name: 'email',
                  label: 'Email',
                  required: true
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('Email', { exact: false })).toBeTruthy());

    fireEvent.blur(screen.getByLabelText('Email', { exact: false }));
    fireEvent.change(screen.getByLabelText('Email', { exact: false }), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Email', { exact: false }));

    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('keeps relative payload paths writable through the shared projected owner scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#4b"
        schema={{
          type: 'form',
          data: {
            profile: { firstName: 'Alice', lastName: 'Smith' }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    const firstName = await screen.findByLabelText('First Name');
    fireEvent.change(firstName, { target: { value: 'Bob' } });

    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Bob'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');
  });

  it('second edit to the same child field is reflected on submit', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];

    const SchemaRenderer = createSchemaRenderer([...allFormDefs, submitButtonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#5"
        schema={{
          type: 'form',
          id: 'obj-second-edit-form',
          data: { profile: { firstName: 'Alice', lastName: 'Smith' } },
          body: [{
            type: 'object-field', name: 'profile', label: 'Profile',
            body: [
              { type: 'input-text', name: 'firstName', label: 'First Name' },
              { type: 'input-text', name: 'lastName', label: 'Last Name' }
            ]
          }],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [{ type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'obj-second-edit-form' } }]
        }}
        env={{ ...env, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Charlie' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));
    expect(submitValues[0]).toMatchObject({ profile: { firstName: 'Charlie', lastName: 'Smith' } });
  });
});
