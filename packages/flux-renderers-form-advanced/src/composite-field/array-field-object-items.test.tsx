import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../test-support';
import { attachScopeDebugToSchema } from '../../../../apps/playground/src/component-lab/scope-debug.js';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions, registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '../index.js';
import {
  allFormDefs,
  arrayItemInstanceProbeRenderer,
  buttonRenderer,
  env,
  formulaCompiler,
  makeCapturingFetcher,
} from './array-field.test-support.js';

describe('array-field renderer (object itemKind)', () => {
  it('renders object items with relative child field names', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            contacts: [
              { name: 'Alice', email: 'alice@example.com' },
              { name: 'Bob', email: 'bob@example.com' },
            ],
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              item: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'email', label: 'Email' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Contacts')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByLabelText('Name')).toHaveLength(2));
    const nameInputs = screen.getAllByLabelText('Name') as HTMLInputElement[];
    expect(nameInputs[0].value).toBe('Alice');
    expect(nameInputs[1].value).toBe('Bob');
  });

  it('publishes object item scope as value index and readOnly while keeping relative child names', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            contacts: [{ name: 'Alice', email: 'alice@example.com' }],
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              readOnly: true,
              item: [
                {
                  type: 'text',
                  text: 'Contact ${value.name} / ${index} / ${readOnly}',
                  testid: 'object-item-scope',
                },
                { type: 'input-text', name: 'name', label: 'Name' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('object-item-scope').textContent).toBe('Contact Alice / 0 / true'),
    );
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Alice');
  });

  it('submits object array with child field changes', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#3"
        schema={{
          type: 'form',
          id: 'arr-obj-form',
          data: {
            contacts: [{ name: 'Alice', email: 'alice@example.com' }],
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              item: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'email', label: 'Email' },
              ],
            },
          ],
          submitAction: {
            action: 'ajax',
            args: { url: '/api/test', method: 'post' },
          },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-obj-form' },
            },
          ],
        }}
        env={{ ...env, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice Updated' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));
    expect(submitValues[0]).toMatchObject({
      contacts: [{ name: 'Alice Updated', email: 'alice@example.com' }],
    });
  });

  it('removes object item and does not leave stale child errors', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            contacts: [
              { name: 'Alice', email: '' },
              { name: 'Bob', email: 'bob@example.com' },
            ],
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              item: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'email', label: 'Email', required: true },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getAllByLabelText('Name').length).toBe(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    await waitFor(() => {
      expect(screen.getAllByLabelText('Name').length).toBe(1);
      expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Bob');
    });
  });

  it('second edit to the same object item child is reflected on submit', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#5"
        schema={{
          type: 'form',
          id: 'arr-second-edit-form',
          data: { contacts: [{ name: 'Alice', email: 'alice@example.com' }] },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              item: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'email', label: 'Email' },
              ],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-second-edit-form' },
            },
          ],
        }}
        env={{ ...env, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Charlie' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));
    expect(submitValues[0]).toMatchObject({
      contacts: [{ name: 'Charlie', email: 'alice@example.com' }],
    });
  });

  it('keeps object item scope and instance identity stable across page-data reorder when itemKey is configured', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      arrayItemInstanceProbeRenderer,
    ]);
    const schema = {
      type: 'page',
      body: [
        {
          type: 'array-field',
          name: 'contacts',
          itemKind: 'object',
          itemKey: 'meta.key',
          item: [{ type: 'array-item-instance-probe' }],
        },
      ],
    } as const;
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#6"
        schema={schema}
        data={{
          contacts: [
            { meta: { key: 'contact-a' }, name: 'Alice' },
            { meta: { key: 'contact-b' }, name: 'Bob' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const initialAliceIdentity = await screen.findByTestId('array-item-probe-Alice');
    const initialBobIdentity = await screen.findByTestId('array-item-probe-Bob');
    const aliceText = initialAliceIdentity.textContent;
    const bobText = initialBobIdentity.textContent;

    expect(aliceText).toContain('contact-a');
    expect(bobText).toContain('contact-b');

    rerender(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#7"
        schema={schema}
        data={{
          contacts: [
            { meta: { key: 'contact-b' }, name: 'Bob' },
            { meta: { key: 'contact-a' }, name: 'Alice' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const nextAliceText = screen.getByTestId('array-item-probe-Alice').textContent ?? '';
      const nextBobText = screen.getByTestId('array-item-probe-Bob').textContent ?? '';

      expect(nextAliceText.split('|')[0]).toBe(aliceText?.split('|')[0]);
      expect(nextBobText.split('|')[0]).toBe(bobText?.split('|')[0]);
      expect(nextAliceText).toContain('contact-a');
      expect(nextBobText).toContain('contact-b');
    });
  });

  it('matches the playground registry path and still renders object item children', async () => {
    cleanup();
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerFormAdvancedRenderers(registry);
    registerDataRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-object-items.test.tsx#8"
        schema={attachScopeDebugToSchema(
          {
            type: 'page',
            body: [
              {
                type: 'form',
                name: 'arrayFieldForm',
                data: {
                  members: [
                    { name: 'Alice', role: 'admin' },
                    { name: 'Bob', role: 'editor' },
                  ],
                },
                body: [
                  {
                    type: 'array-field',
                    name: 'members',
                    label: 'Team Members',
                    itemKind: 'object',
                    item: [
                      { type: 'input-text', name: 'name', label: 'Name', required: true },
                      {
                        type: 'select',
                        name: 'role',
                        label: 'Role',
                        options: [
                          { label: 'Admin', value: 'admin' },
                          { label: 'Editor', value: 'editor' },
                          { label: 'Viewer', value: 'viewer' },
                        ],
                      },
                    ],
                  },
                ],
                actions: [{ type: 'button', label: 'Save Team', onClick: { action: 'submit' } }],
              },
            ],
          } as any,
          'Team members with name and role Scope',
        )}
        data={{}}
        env={env}
        registry={registry}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getAllByLabelText('Name')).toHaveLength(2));
    const nameInputs = screen.getAllByLabelText('Name') as HTMLInputElement[];
    expect(nameInputs[0].value).toBe('Alice');
    expect(nameInputs[1].value).toBe('Bob');
  });
});
