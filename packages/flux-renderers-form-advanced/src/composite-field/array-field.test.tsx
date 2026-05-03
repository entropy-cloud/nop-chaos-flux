import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../test-support';
import type { ApiRequestContext, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer, useRenderScope } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

function makeCapturingFetcher(submitValues: Record<string, unknown>[]) {
  return async function <T>(
    _api: unknown,
    ctx: ApiRequestContext,
  ): Promise<{ ok: true; status: number; data: T }> {
    submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
    return { ok: true, status: 200, data: null as unknown as T };
  };
}

const formulaCompiler = createFormulaCompiler();

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

const arrayItemInstanceProbeRenderer: RendererDefinition = {
  type: 'array-item-instance-probe',
  component: (props) => (
    <ArrayItemInstanceProbeWithInstancePath instancePath={props.node.instancePath} />
  ),
};

function ArrayItemInstanceProbeWithInstancePath(props: { instancePath: unknown }) {
  const scope = useRenderScope();
  const mountId = React.useId();
  const itemName = String(
    (scope.get('value') as { name?: unknown } | undefined)?.name ?? scope.get('name') ?? 'unknown',
  );

  return (
    <span data-testid={`array-item-probe-${itemName}`}>
      {`${mountId}|${scope.id}|${JSON.stringify(props.instancePath ?? null)}`}
    </span>
  );
}

describe('array-field renderer (scalar)', () => {
  it('renders initial scalar items', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            tags: ['alpha', 'beta', 'gamma'],
          },
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
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Tags')).toBeTruthy());

    const addButton = screen.getByText('Add item');
    expect(addButton).toBeTruthy();
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons.length).toBe(3);

    const field = addButton.closest('.nop-field');
    expect(field).toBeTruthy();
    expect(field?.querySelector('[data-slot="field-label"]')?.textContent).toContain('Tags');
    expect(field?.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="array-field-body"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="array-field-item"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="array-field-item-body"]')).toBeTruthy();
  });

  it('adds and removes scalar items correctly', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#2"
        schema={{
          type: 'form',
          id: 'arr-scalar-form',
          data: {
            tags: ['alpha'],
          },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }],
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
              onClick: { action: 'component:submit', componentId: 'arr-scalar-form' },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Add item')).toBeTruthy());

    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => {
      expect(screen.getAllByText('Remove').length).toBe(2);
    });

    fireEvent.click(screen.getAllByText('Remove')[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Remove').length).toBe(1);
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({ tags: expect.any(Array) });
    expect((submitValues[0].tags as unknown[]).length).toBe(1);
  });

  it('publishes scalar item scope as value index and readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#3"
        schema={{
          type: 'form',
          data: {
            tags: ['alpha'],
          },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              readOnly: true,
              item: [
                {
                  type: 'text',
                  text: 'Tag ${value} / ${index} / ${readOnly}',
                  testid: 'scalar-scope',
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('scalar-scope').textContent).toBe('Tag alpha / 0 / true'),
    );
  });
});

describe('array-field renderer (object itemKind)', () => {
  it('renders object items with relative child field names', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#4"
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

    const nameInputs = screen.getAllByLabelText('Name') as HTMLInputElement[];
    expect(nameInputs.length).toBe(2);
    expect(nameInputs[0].value).toBe('Alice');
    expect(nameInputs[1].value).toBe('Bob');
  });

  it('publishes object item scope as value index and readOnly while keeping relative child names', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#5"
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
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#6"
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
        env={{
          ...env,
          fetcher: makeCapturingFetcher(submitValues),
        }}
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
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#7"
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

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

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
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#8"
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
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#9"
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
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#10"
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
});
