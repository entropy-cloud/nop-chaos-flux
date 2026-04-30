import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  baseEnv,
  createFormSchemaRenderer,
  createFormSchemaRendererWithButton,
  formulaCompiler,
  makeCapturingFetcher,
} from '../test-support';

describe('detail-field renderer commit behavior', () => {
  it('cancel closes dialog without writing back to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createFormSchemaRendererWithButton();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-commit.test.tsx#1"
        schema={{
          type: 'form',
          id: 'cancel-form',
          data: { address: { street: '123 Main St' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
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
              onClick: { action: 'component:submit', componentId: 'cancel-form' },
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

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '999 Changed St' } });
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '123 Main St' },
    });
  });

  it('confirm writes back edits to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createFormSchemaRendererWithButton();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-commit.test.tsx#2"
        schema={{
          type: 'form',
          id: 'confirm-form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' },
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
              onClick: { action: 'component:submit', componentId: 'confirm-form' },
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

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '456 Oak Ave' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '456 Oak Ave', city: 'Springfield' },
    });
  });

  it('second confirm writes second set of edits to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createFormSchemaRendererWithButton();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-commit.test.tsx#3"
        schema={{
          type: 'form',
          id: 'double-confirm-form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' },
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
              onClick: { action: 'component:submit', componentId: 'double-confirm-form' },
            },
          ],
        }}
        env={{ ...baseEnv, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '456 Oak Ave' } });
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());
    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('456 Oak Ave');
    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '789 Pine Rd' } });
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '789 Pine Rd', city: 'Springfield' },
    });
  });

  it('runs transformIn before opening and transformOut after validate for field writeback', async () => {
    cleanup();
    const calls: Array<{ method: string; payload: Record<string, unknown> | undefined }> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => {
            calls.push({ method, payload });
            if (method === 'toDraft') {
              return {
                ok: true,
                data: {
                  street: `${String(payload?.value ?? '')} Draft`,
                },
              };
            }
            if (method === 'validateDraft') {
              return {
                ok: true,
                data: { valid: true },
              };
            }
            if (method === 'toCommit') {
              return {
                ok: true,
                data: `Committed ${String((payload?.value as Record<string, unknown> | undefined)?.street ?? '')}`,
              };
            }
            return { ok: true };
          },
        }),
      })),
    };
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createFormSchemaRendererWithButton();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-commit.test.tsx#4"
        schema={{
          type: 'form',
          id: 'adapt-field-form',
          data: { address: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              triggerLabel: 'Edit Address',
              'xui:imports': [{ from: 'detail-field-lib', as: 'detailFieldLib' }],
              transformInAction: { action: 'detailFieldLib:toDraft' },
              validateValueAction: { action: 'detailFieldLib:validateDraft' },
              transformOutAction: { action: 'detailFieldLib:toCommit' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
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
              onClick: { action: 'component:submit', componentId: 'adapt-field-form' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          importLoader,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());
    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('Alpha Draft');

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: 'Beta Draft' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: 'Committed Beta Draft',
    });
    expect(calls.map((entry) => entry.method)).toEqual(['toDraft', 'validateDraft', 'toCommit']);
    expect(calls[0]?.payload).toMatchObject({ value: 'Alpha', name: 'address', readOnly: false });
    expect(calls[1]?.payload).toMatchObject({
      value: { street: 'Beta Draft' },
      originalValue: 'Alpha',
      name: 'address',
    });
    expect(calls[2]?.payload).toMatchObject({
      value: { street: 'Beta Draft' },
      originalValue: 'Alpha',
      name: 'address',
      readOnly: false,
    });
  });

  it('uses explicit args instead of default validation payloads', async () => {
    cleanup();
    const calls: Array<{ method: string; payload: Record<string, unknown> | undefined }> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => {
            calls.push({ method, payload });
            if (method === 'validateWithExplicitArgs') {
              return {
                ok: true,
                data: {
                  valid: false,
                  issues: [{ level: 'error', message: String(payload?.reason ?? 'invalid') }],
                },
              };
            }
            return { ok: true };
          },
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-commit.test.tsx#5"
        schema={{
          type: 'form',
          data: { address: { street: 'Alpha' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              triggerLabel: 'Edit Address',
              'xui:imports': [{ from: 'detail-field-lib', as: 'detailFieldLib' }],
              validateValueAction: {
                action: 'detailFieldLib:validateWithExplicitArgs',
                args: { reason: 'explicit-only' },
              },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={{
          ...baseEnv,
          importLoader,
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());
    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('explicit-only')).toBeTruthy();
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload).toEqual({ reason: 'explicit-only' });
  });
});
