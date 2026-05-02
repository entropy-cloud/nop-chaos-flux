import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  baseEnv,
  createFormSchemaRenderer,
  createPageSchemaRenderer,
  formulaCompiler,
} from '../test-support';

describe('variant-field renderer transform behavior', () => {
  it('runs target variant transformInAction when switching variants', async () => {
    cleanup();
    const calls: Array<Record<string, unknown> | undefined> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (_method: string, payload: Record<string, unknown> | undefined) => {
            calls.push(payload);
            return {
              ok: true,
              data: { amount: 42 },
            };
          },
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-transform.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            payload: 'alpha',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              defaultVariant: 'text',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Text Value' }],
                  initialValue: 'initial-text',
                },
                {
                  key: 'number',
                  label: 'Number',
                  content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
                  initialValue: { amount: 0 },
                  transformInAction: { action: 'variantLib:migrate' },
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Number')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'Number' }));

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('number');
    });
    await waitFor(() =>
      expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('42'),
    );

    expect(calls[0]).toEqual({ value: 'alpha', name: 'number', readOnly: false });
  });

  it('uses explicit args for target variant transformInAction instead of merging default payloads', async () => {
    cleanup();
    const calls: Array<Record<string, unknown> | undefined> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (_method: string, payload: Record<string, unknown> | undefined) => {
            calls.push(payload);
            return {
              ok: true,
              data: { amount: 7 },
            };
          },
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-transform.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            payload: 'alpha',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              defaultVariant: 'text',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Text Value' }],
                  initialValue: 'initial-text',
                },
                {
                  key: 'number',
                  label: 'Number',
                  content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
                  initialValue: { amount: 0 },
                  transformInAction: {
                    action: 'variantLib:migrate',
                    args: { reason: 'explicit-only' },
                  },
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Number')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'Number' }));
    await waitFor(() =>
      expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('7'),
    );

    expect(calls[0]).toEqual({ reason: 'explicit-only' });
  });

  it('switches between string and list editors and keeps repeated edits on the active variant', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-transform.test.tsx#3"
        schema={{
          type: 'form',
          id: 'variant-submit-form',
          data: {
            payload: 'alpha',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  match: { kind: 'typeof', value: 'string' },
                  initialValue: 'alpha',
                  content: [{ type: 'input-text', name: '', label: 'Text Value', required: true }],
                },
                {
                  key: 'list',
                  label: 'List',
                  match: { kind: 'array' },
                  initialValue: ['one'],
                  content: [
                    {
                      type: 'array-field',
                      name: '',
                      label: 'List Value',
                      itemKind: 'scalar',
                      item: [{ type: 'input-text', name: 'value', label: 'Item', required: true }],
                    },
                  ],
                },
              ],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'variant-submit-form' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          fetcher: async function <T>(_api: unknown, ctx: any) {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null as T };
          },
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(1));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'first text' } });
    fireEvent.click(screen.getByRole('tab', { name: 'List' }));

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(1));

    const listItemInput = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(listItemInput, { target: { value: 'first item' } });
    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(2));

    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'second item' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(1));
    expect(submitValues[0]).toMatchObject({ payload: ['first item', 'second item'] });

    fireEvent.click(screen.getByRole('tab', { name: 'Text' }));

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(1));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('alpha');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'second text' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(2));
    expect(submitValues[1]).toMatchObject({ payload: 'second text' });
  });

  it('drops stale async variant migrations when a newer switch wins', async () => {
    cleanup();
    const pendingMigrations: Array<(result: { ok: true; data: Record<string, unknown> }) => void> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () =>
            await new Promise<{ ok: true; data: Record<string, unknown> }>((resolve) => {
              pendingMigrations.push(resolve);
            }),
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-transform.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            payload: 'alpha',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              defaultVariant: 'text',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: '', label: 'Text Value' }],
                  initialValue: 'alpha',
                },
                {
                  key: 'number',
                  label: 'Number',
                  content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
                  initialValue: { amount: 0 },
                  transformInAction: { action: 'variantLib:migrate' },
                },
                {
                  key: 'object',
                  label: 'Object',
                  content: [{ type: 'input-text', name: 'title', label: 'Title' }],
                  initialValue: { title: '' },
                  transformInAction: { action: 'variantLib:migrate' },
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Number')).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Number' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Object' }));

    await waitFor(() => expect(pendingMigrations).toHaveLength(2));

    pendingMigrations[1]!({ ok: true, data: { title: 'latest object' } });

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('object');
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('latest object');
    });

    pendingMigrations[0]!({ ok: true, data: { amount: 42 } });

    await new Promise((resolve) => setTimeout(resolve, 25));

    const container = document.querySelector('[data-active-variant]');
    expect(container?.getAttribute('data-active-variant')).toBe('object');
    expect(screen.queryByLabelText('Amount')).toBeNull();
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('latest object');
  });
});
