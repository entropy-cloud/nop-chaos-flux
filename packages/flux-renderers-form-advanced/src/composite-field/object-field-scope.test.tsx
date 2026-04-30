import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import {
  allFormDefs,
  env,
  formulaCompiler,
  scopeSelectorProbeRenderer,
  objectScopeMutationRenderer,
} from './__tests__/object-field-test-support';

describe('object-field scope and state', () => {
  it('publishes object-field scope as value and readOnly while keeping relative child names', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      scopeSelectorProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            profile: { firstName: 'Alice', lastName: 'Smith' },
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              readOnly: true,
              body: [
                {
                  type: 'text',
                  text: 'Profile ${value.firstName} / ${readOnly}',
                  testid: 'profile-scope',
                },
                { type: 'scope-selector-probe' },
                { type: 'input-text', name: 'firstName', label: 'First Name' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('profile-scope').textContent).toBe('Profile Alice / true'),
    );
    expect(screen.getByTestId('scope-selector-probe').textContent).toBe(
      JSON.stringify({
        value: { firstName: 'Alice', lastName: 'Smith' },
        readOnly: true,
      }),
    );
    expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice');
  });

  it('reflects parent-owned object replacement through the projected view when no transform actions are declared', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      scopeSelectorProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#9"
        schema={{
          type: 'form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith',
            },
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              body: [
                { type: 'scope-selector-probe' },
                { type: 'input-text', name: 'firstName', label: 'First Name' },
              ],
            },
            {
              type: 'button',
              label: 'Replace Profile',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'profile',
                  value: { firstName: 'Dana', lastName: 'Jones' },
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice'),
    );
    expect(screen.getByTestId('scope-selector-probe').textContent).toBe(
      JSON.stringify({
        value: { firstName: 'Alice', lastName: 'Smith' },
        readOnly: false,
      }),
    );

    fireEvent.click(screen.getByText('Replace Profile'));

    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Dana'),
    );
    expect(screen.getByTestId('scope-selector-probe').textContent).toBe(
      JSON.stringify({
        value: { firstName: 'Dana', lastName: 'Jones' },
        readOnly: false,
      }),
    );
  });

  it('supports projected child scope merge replace and nested updates in a form owner', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      objectScopeMutationRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#10"
        schema={{
          type: 'form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith',
            },
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              body: [
                { type: 'object-scope-mutation-probe' },
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice'),
    );
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');

    fireEvent.click(screen.getByText('Set First Name'));
    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Bob'),
    );
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');

    fireEvent.click(screen.getByText('Merge Object'));
    await waitFor(() =>
      expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Jones'),
    );

    fireEvent.click(screen.getByText('Merge Value Wrapper'));
    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Merged'),
    );
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Value');

    fireEvent.click(screen.getByText('Replace Object'));
    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Dana'),
    );
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Lane');

    fireEvent.click(screen.getByText('Replace Value Wrapper'));
    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Fay'),
    );
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Mills');
  });
});
