import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../test-support';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import {
  allFormDefs,
  buttonRenderer,
  env,
  formulaCompiler,
  makeCapturingFetcher,
} from './array-field.test-support.js';

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
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
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
      expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(2);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(1);
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

  it('publishes parameterized item region bindings through $slot while preserving owner scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#slot"
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
              item: [
                {
                  type: 'text',
                  text: 'slot:${$slot ? $slot.index : "missing"}:${$slot ? $slot.value : "missing"}|owner:${value}:${index}',
                  testid: 'array-slot-scope',
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('array-slot-scope').textContent).toBe('slot:0:alpha|owner:alpha:0');
    });
  });

  it('preserves scalar required marker from the compiled item region contract', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#scalar-required"
        schema={{
          type: 'form',
          data: {
            tags: [''],
          },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag', required: true }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const tagField = screen.getByLabelText('Tag').closest('.nop-field');
      expect(tagField?.querySelector('[data-slot="field-required"]')?.textContent).toBe('*');
    });
  });

  it('does not trigger add-item when the wrapped field shell is clicked', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#shell"
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
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(1));
    fireEvent.click(screen.getByText('Tags').closest('.nop-field')!);
    expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(1);
  });

  it('removes an item when the wrapped remove action is activated from the keyboard', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field.test.tsx#keyboard-remove"
        schema={{
          type: 'form',
          data: {
            tags: ['alpha', 'beta'],
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

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(2));
    const removeAction = screen.getAllByRole('button', { name: 'Remove' })[0];
    fireEvent.keyDown(removeAction, { key: 'Enter' });

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBe(1));
  });
});
