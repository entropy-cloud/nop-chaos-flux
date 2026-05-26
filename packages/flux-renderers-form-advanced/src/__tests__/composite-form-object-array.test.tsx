import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { useScopeSelector } from '@nop-chaos/flux-react';
import {
  allRenderers,
  baseEnv,
  formulaCompiler,
  makeCapturingFetcher,
} from './composite-form-support.js';

function ScopeSelectorProbeRenderer() {
  const snapshot = useScopeSelector(
    (scope) => ({
      value: scope.value,
      index: scope.index,
      readOnly: scope.readOnly,
    }),
    Object.is,
  ) as Record<string, unknown>;
  return <span data-testid="scope-selector-probe">{JSON.stringify(snapshot)}</span>;
}

const scopeSelectorProbeRenderer: RendererDefinition = {
  type: 'scope-selector-probe',
  component: () => <ScopeSelectorProbeRenderer />,
};

describe('composite form - object-field validation', () => {
  it('blocks submit when required child field is empty', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-object-array.test.tsx#1"
        schema={{
          type: 'form',
          id: 'obj-form-block',
          data: { profile: { firstName: '', lastName: 'Smith' } },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true },
              ],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form-block' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    expect(submitValues.length).toBe(0);
  });

  it('submits with valid object-field nested values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-object-array.test.tsx#2"
        schema={{
          type: 'form',
          id: 'obj-form-pass',
          data: { profile: { firstName: 'Jane', lastName: 'Doe' } },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true },
              ],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form-pass' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'Jane', lastName: 'Doe' },
    });
  });

  it('editing an object-field child field updates parent form values on submit', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-object-array.test.tsx#3"
        schema={{
          type: 'form',
          id: 'obj-form-edit',
          data: { profile: { firstName: 'Jane', lastName: 'Doe' } },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' },
              ],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form-edit' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'Alice', lastName: 'Doe' },
    });
  });
});

describe('composite form - array-field add/remove', () => {
  it('renders existing items and supports add/remove', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-object-array.test.tsx#4"
        schema={{
          type: 'form',
          data: { tags: ['alpha', 'beta', 'gamma'] },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Tags')).toBeTruthy());

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    expect(removeButtons.length).toBe(3);

    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(2);
    });
  });

  it('blocks submit when required array items have empty values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-object-array.test.tsx#5"
        schema={{
          type: 'form',
          id: 'arr-form-req',
          data: { tags: ['alpha', ''] },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag', required: true }],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-form-req' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    expect(submitValues.length).toBe(0);
  });

  it('submits valid array-field values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-object-array.test.tsx#6"
        schema={{
          type: 'form',
          id: 'arr-form-pass',
          data: { tags: ['alpha', 'beta'] },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-form-pass' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const tags = (submitValues[0] as Record<string, unknown>).tags as unknown[];
    expect(tags.length).toBe(2);
  });

  it('publishes projected array item scope through useScopeSelector', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allRenderers, scopeSelectorProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-object-array.test.tsx#7"
        schema={{
          type: 'form',
          data: { tags: ['alpha'] },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'scope-selector-probe' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('scope-selector-probe').textContent).toBe(
        JSON.stringify({
          value: 'alpha',
          index: 0,
          readOnly: false,
        }),
      );
    });
  });
});
