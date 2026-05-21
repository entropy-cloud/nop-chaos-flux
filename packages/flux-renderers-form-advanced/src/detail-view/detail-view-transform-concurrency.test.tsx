import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  baseEnv,
  createPageSchemaRenderer,
  formulaCompiler,
  scopeStateProbeRenderer,
} from '../test-support.js';

describe('detail-view renderer concurrency behavior', () => {
  it('drops stale open completions when a newer detail-view open request wins', async () => {
    cleanup();
    const pendingOpens: Array<
      (value: { ok: true; data: { name: string; status: string } }) => void
    > = [];
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
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform-concurrency.test.tsx#1"
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

  it('reports detail-view open transform failures through env.notify', async () => {
    cleanup();
    const notify = vi.fn();
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => {
            throw new Error('detail open failed');
          },
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform-concurrency.test.tsx#open-failure"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { name: 'Original' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  triggerLabel: 'Edit',
                  'xui:imports': [{ from: 'detail-view-lib', as: 'detailViewLib' }],
                  transformInAction: { action: 'detailViewLib:toDraft' },
                  content: [{ type: 'input-text', name: 'name', label: 'Name' }],
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, notify, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());
    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'warning',
        '[flux] transformIn failed: detail open failed',
      ),
    );
    expect(screen.queryByLabelText('Name')).toBeNull();
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
            return await new Promise<{
              ok: true;
              data: { updates: { name: string; status: string } };
            }>((resolve) => {
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
            });
          },
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform-concurrency.test.tsx#2"
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

  it('keeps form-owned sibling observers unchanged when async transformOut returns an invalid final value', async () => {
    cleanup();
    let resolveCommit: ((value: { ok: true; data: { updates: { title: string } } }) => void) | undefined;
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (_method: string) =>
            await new Promise<{ ok: true; data: { updates: { title: string } } }>((resolve) => {
              resolveCommit = resolve;
            }),
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

    render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform-concurrency.test.tsx#3"
          schema={{
            type: 'page',
            body: [
              {
                type: 'form',
                name: 'testForm',
                data: { summary: { title: 'Original' } },
                body: [
                  {
                    type: 'detail-view',
                    name: 'summary',
                    triggerLabel: 'Edit Summary',
                    surface: { mode: 'dialog', title: 'Edit Summary' },
                    'xui:imports': [{ from: 'detail-view-lib', as: 'detailViewLib' }],
                    transformOutAction: { action: 'detailViewLib:toUpdates' },
                    content: [{ type: 'input-text', name: 'title', label: 'Title', required: true }],
                  },
                  { type: 'scope-state-probe', name: 'summary' },
                ],
              },
            ],
          }}
          env={{ ...baseEnv, importLoader }}
          formulaCompiler={formulaCompiler}
        />,
      );

    await waitFor(() => expect(screen.getByText('Edit Summary')).toBeTruthy());
    expect(screen.getByTestId('scope-state:summary').textContent).toContain('"title":"Original"');

    fireEvent.click(screen.getByText('Edit Summary'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(resolveCommit).toBeTypeOf('function'));
    resolveCommit?.({ ok: true, data: { updates: { title: '' } } });

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toBeTruthy();
      expect(screen.getByText(/required/i)).toBeTruthy();
    });

    expect(screen.getByTestId('scope-state:summary').textContent).toContain('"title":"Original"');
  });
});
