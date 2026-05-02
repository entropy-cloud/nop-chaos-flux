import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { baseEnv, createPageSchemaRenderer, formulaCompiler } from '../test-support';

describe('detail-view renderer transform behavior', () => {
  it('applyCommitResult handles updates dict shape', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#1"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              scopePath: 'settings',
              data: { updates: { theme: 'dark' } },
              triggerLabel: 'Edit Settings',
              surface: { mode: 'dialog', title: 'Edit Settings' },
              content: [
                {
                  type: 'object-field',
                  name: 'updates',
                  label: 'Updates',
                  body: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Settings')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Settings'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'solarized' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());
  });

  it('applyCommitResult handles patch array shape', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#2"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              scopePath: 'settings',
              data: { patch: [{ path: 'locale', value: 'en-US' }] },
              triggerLabel: 'Edit Settings',
              surface: { mode: 'dialog', title: 'Edit Settings' },
              content: [{ type: 'input-text', name: 'locale', label: 'Locale' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Settings')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Settings'));
    await waitFor(() => expect(screen.getByLabelText('Locale')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Locale'), { target: { value: 'fr-FR' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Locale')).toBeNull());
  });

  it('runs transformIn validate transformOut and applies updates commit results for detail-view owners', async () => {
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
                  name: `${String((payload?.value as Record<string, unknown> | undefined)?.name ?? '')} Draft`,
                  status: (payload?.value as Record<string, unknown> | undefined)?.status,
                },
              };
            }
            if (method === 'validateDraft') {
              return {
                ok: true,
                data: { valid: true },
              };
            }
            if (method === 'toUpdates') {
              return {
                ok: true,
                data: {
                  updates: {
                    name: `${String((payload?.value as Record<string, unknown> | undefined)?.name ?? '')} Final`,
                    status: 'published',
                  },
                },
              };
            }
            return { ok: true };
          },
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#3"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  triggerLabel: 'Edit',
                  'xui:imports': [{ from: 'detail-view-lib', as: 'detailViewLib' }],
                  transformInAction: { action: 'detailViewLib:toDraft' },
                  validateValueAction: { action: 'detailViewLib:validateDraft' },
                  transformOutAction: { action: 'detailViewLib:toUpdates' },
                  viewer: [
                    { type: 'text', text: '${summary.name}', testid: 'viewer-name' },
                    { type: 'text', text: '${summary.status}', testid: 'viewer-status' },
                  ],
                  content: [
                    { type: 'input-text', name: 'name', label: 'Name' },
                    { type: 'input-text', name: 'status', label: 'Status' },
                  ],
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-name').textContent).toBe('Original'));

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Original Draft');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Edited Draft' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
    await waitFor(() =>
      expect(screen.getByTestId('viewer-name').textContent).toBe('Edited Draft Final'),
    );
    await waitFor(() => expect(screen.getByTestId('viewer-status').textContent).toBe('published'));

    expect(calls.map((entry) => entry.method)).toEqual(['toDraft', 'validateDraft', 'toUpdates']);
    expect(calls[0]?.payload).toMatchObject({
      value: { name: 'Original', status: 'draft' },
      readOnly: false,
    });
    expect(calls[1]?.payload).toMatchObject({
      value: { name: 'Edited Draft', status: 'draft' },
      originalValue: { name: 'Original', status: 'draft' },
    });
    expect(calls[2]?.payload).toMatchObject({
      value: { name: 'Edited Draft', status: 'draft' },
      originalValue: { name: 'Original', status: 'draft' },
      readOnly: false,
    });
  });

  it('applies patch results returned from transformOutAction', async () => {
    cleanup();
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string) => {
            if (method === 'toPatch') {
              return {
                ok: true,
                data: {
                  patch: [{ path: 'status', value: 'patched' }],
                },
              };
            }
            return {
              ok: true,
              data: { valid: true },
            };
          },
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#4"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  triggerLabel: 'Edit',
                  'xui:imports': [{ from: 'detail-view-lib', as: 'detailViewLib' }],
                  transformOutAction: { action: 'detailViewLib:toPatch' },
                  viewer: [{ type: 'text', text: '${summary.status}', testid: 'viewer-status' }],
                  content: [{ type: 'input-text', name: 'status', label: 'Status' }],
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-status').textContent).toBe('draft'));

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Status')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ignored-local-edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Status')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-status').textContent).toBe('patched'));
  });

  it('drops stale open completions when a newer detail-view open request wins', async () => {
    cleanup();
    const pendingOpens: Array<(value: { ok: true; data: { name: string; status: string } }) => void> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () =>
            await new Promise<{ ok: true; data: { name: string; status: string } }>((resolve) => {
              pendingOpens.push(resolve);
            }),
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#5"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  triggerLabel: 'Edit',
                  'xui:imports': [{ from: 'detail-view-lib', as: 'detailViewLib' }],
                  transformInAction: { action: 'detailViewLib:toDraft' },
                  content: [
                    { type: 'input-text', name: 'name', label: 'Name' },
                    { type: 'input-text', name: 'status', label: 'Status' },
                  ],
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(pendingOpens).toHaveLength(1));

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(pendingOpens).toHaveLength(2));

    pendingOpens[1]!({ ok: true, data: { name: 'Second Draft', status: 'published' } });

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Second Draft');
    expect((screen.getByLabelText('Status') as HTMLInputElement).value).toBe('published');

    pendingOpens[0]!({ ok: true, data: { name: 'First Draft', status: 'archived' } });

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Second Draft');
    expect((screen.getByLabelText('Status') as HTMLInputElement).value).toBe('published');
  });

  it('drops stale confirm completions after a newer detail-view reopen session wins', async () => {
    cleanup();
    const pendingCommits: Array<() => void> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (_method: string, payload: Record<string, unknown> | undefined) => {
            const value = payload?.value as Record<string, unknown> | undefined;
            return await new Promise<{ ok: true; data: { updates: { name: string; status: string } } }>(
              (resolve) => {
                pendingCommits.push(() =>
                  resolve({
                    ok: true,
                    data: {
                      updates: {
                        name: String(value?.name ?? ''),
                        status: String(value?.status ?? ''),
                      },
                    },
                  }),
                );
              },
            );
          },
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#6"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  triggerLabel: 'Edit',
                  surface: { mode: 'dialog', title: 'Edit Summary' },
                  'xui:imports': [{ from: 'detail-view-lib', as: 'detailViewLib' }],
                  transformOutAction: { action: 'detailViewLib:toUpdates' },
                  viewer: [
                    { type: 'text', text: '${summary.name}', testid: 'viewer-name' },
                    { type: 'text', text: '${summary.status}', testid: 'viewer-status' },
                  ],
                  content: [
                    { type: 'input-text', name: 'name', label: 'Name' },
                    { type: 'input-text', name: 'status', label: 'Status' },
                  ],
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-name').textContent).toBe('Original'));

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'First Edit' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'review' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(pendingCommits).toHaveLength(1));
    expect(screen.getByText('Confirming...')).toBeTruthy();

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    expect(screen.queryByText('Confirming...')).toBeNull();
    expect(screen.getByText('Confirm')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Second Edit' } });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());

    pendingCommits[0]!();

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(screen.getByTestId('viewer-name').textContent).toBe('Original');
    expect(screen.getByTestId('viewer-status').textContent).toBe('draft');
  });
});
