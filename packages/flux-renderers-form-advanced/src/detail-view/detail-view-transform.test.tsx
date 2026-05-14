import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { NodeRuntimeState, RendererDefinition, RuntimeValueState } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { useCurrentForm, useScopeSelector } from '@nop-chaos/flux-react';
import { createExpressionCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { describe, expect, it, vi } from 'vitest';
import {
  baseEnv,
  createPageSchemaRenderer,
  formulaCompiler,
  scopeStateProbeRenderer,
} from '../test-support.js';

const detailViewLikeRenderer: RendererDefinition = {
  type: 'detail-view-like',
  component: function DetailViewLike(props: any) {
    const form = useCurrentForm();
    const [, bumpTick] = React.useReducer((value: number) => value + 1, 0);

    return (
      <div>
        <div data-testid="detail-like-viewer">{props.regions.viewer?.render()}</div>
        <button
          type="button"
          onClick={() => {
            form?.setValues({
              'summary.name': 'Changed Name',
              'summary.status': 'published',
            });
            bumpTick();
          }}
        >
          {'Confirm detail-like edit'}
        </button>
      </div>
    );
  },
  fields: [{ key: 'viewer', kind: 'region', regionKey: 'viewer' }],
};

const importedSummaryProbeRenderer: RendererDefinition = {
  type: 'imported-summary-probe',
  component: function ImportedSummaryProbe() {
    const name = useScopeSelector(
      (data: { summary?: { name?: string } }) => data.summary?.name ?? '',
      Object.is,
      { paths: ['summary.name'] },
    );
    const status = useScopeSelector(
      (data: { summary?: { status?: string } }) => data.summary?.status ?? '',
      Object.is,
      { paths: ['summary.status'] },
    );

    return (
      <div>
        <span data-testid="probe-name">{name}</span>
        <span data-testid="probe-status">{status}</span>
      </div>
    );
  },
};

const propsTextProbeRenderer: RendererDefinition = {
  type: 'props-text-probe',
  component: function PropsTextProbe(props: any) {
    return <span data-testid={String(props.props.testid ?? 'props-text-probe')}>{String(props.props.text ?? '')}</span>;
  },
  fields: [
    { key: 'text', kind: 'prop', allowSource: true },
    { key: 'testid', kind: 'meta' },
  ],
};

function createRuntimeStateFromTemplateNode(
  node: import('@nop-chaos/flux-core').TemplateNode,
): NodeRuntimeState {
  const metaEntries: Record<string, RuntimeValueState<unknown>> = {};
  const meta = node.metaProgram;
  for (const key of Object.keys(meta) as Array<keyof typeof meta>) {
    const value = meta[key];
    if (value && typeof value === 'object' && (value as { kind?: string }).kind === 'dynamic') {
      metaEntries[key] = (value as { createState(): RuntimeValueState<unknown> }).createState();
    }
  }
  return {
    meta: metaEntries,
    props: node.propsProgram.kind === 'dynamic' ? node.propsProgram.createState() : undefined,
  };
}

describe('detail-view renderer transform behavior', () => {
  it('applyCommitResult handles updates dict shape', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

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
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

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
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

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
                { type: 'scope-state-probe', name: 'summary' },
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
    await waitFor(() =>
      expect(screen.getByTestId('scope-state:summary').textContent).toContain('"status":"published"'),
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
    expect(calls[2]?.payload).toEqual({
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
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

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

  it('refreshes sibling viewer bindings after multi-field updates commit', async () => {
    cleanup();
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({
            ok: true,
            data: {
              updates: {
                name: 'Changed Name',
                status: 'published',
              },
            },
          }),
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer([scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#4b"
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
                { type: 'scope-state-probe', name: 'summary' },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-name').textContent).toBe('Original'));
    await waitFor(() => expect(screen.getByTestId('viewer-status').textContent).toBe('draft'));

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
    expect(screen.getByTestId('scope-state:summary').textContent).toContain('"status":"published"');
    expect(screen.getByTestId('viewer-name').textContent).toBe('Changed Name');
    expect(screen.getByTestId('viewer-status').textContent).toBe('published');

    await waitFor(() => expect(screen.getByTestId('viewer-name').textContent).toBe('Changed Name'));
    await waitFor(() => expect(screen.getByTestId('viewer-status').textContent).toBe('published'));
  });

  it('keeps imported viewer siblings in sync for detail-view-like host updates', async () => {
    cleanup();
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      })),
    };
    const SchemaRenderer = createPageSchemaRenderer([
      scopeStateProbeRenderer,
      detailViewLikeRenderer,
      importedSummaryProbeRenderer,
      propsTextProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-transform.test.tsx#detail-like"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { name: 'Original', status: 'draft' } },
              body: [
                {
                  type: 'detail-view-like',
                  'xui:imports': [{ from: 'detail-view-lib', as: 'detailViewLib' }],
                  viewer: [
                     { type: 'imported-summary-probe' },
                     { type: 'props-text-probe', text: '${summary.name}', testid: 'viewer-name' },
                     { type: 'props-text-probe', text: '${summary.status}', testid: 'viewer-status' },
                  ],
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

    await waitFor(() => expect(screen.getByTestId('probe-name').textContent).toBe('Original'));
    await waitFor(() => expect(screen.getByTestId('probe-status').textContent).toBe('draft'));
    await waitFor(() => expect(screen.getByTestId('viewer-name').textContent).toBe('Original'));
    await waitFor(() => expect(screen.getByTestId('viewer-status').textContent).toBe('draft'));
    const initialViewerNameCid = screen.getByTestId('viewer-name').getAttribute('data-cid');
    const initialViewerStatusCid = screen.getByTestId('viewer-status').getAttribute('data-cid');

    fireEvent.click(screen.getByText('Confirm detail-like edit'));

    await waitFor(() =>
      expect(screen.getByTestId('scope-state:summary').textContent).toContain('"status":"published"'),
    );
    await waitFor(() => expect(screen.getByTestId('probe-name').textContent).toBe('Changed Name'));
    await waitFor(() => expect(screen.getByTestId('probe-status').textContent).toBe('published'));
    expect(screen.getByTestId('viewer-name').getAttribute('data-cid')).toBe(initialViewerNameCid);
    expect(screen.getByTestId('viewer-status').getAttribute('data-cid')).toBe(initialViewerStatusCid);
    await waitFor(() => expect(screen.getByTestId('viewer-name').textContent).toBe('Changed Name'));
    await waitFor(() => expect(screen.getByTestId('viewer-status').textContent).toBe('published'));
  });

  it('updates imported text node props in runtime outside React after multi-field form writes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([...basicRendererDefinitions]),
      env: baseEnv,
      expressionCompiler: createExpressionCompiler(formulaCompiler),
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'test-form',
      initialValues: { summary: { name: 'Original', status: 'draft' } },
      parentScope: page.scope,
    });
    const importScope = runtime.createChildScope(form.scope, { detailViewLib: {} }, {
      pathSuffix: 'imports',
      scopeKey: 'detail-view-like:imports',
    });

    const compiledName = runtime.compile({ type: 'text', text: '${summary.name}' });
    const compiledStatus = runtime.compile({ type: 'text', text: '${summary.status}' });
    const nameNode = compiledName.root as import('@nop-chaos/flux-core').TemplateNode;
    const statusNode = compiledStatus.root as import('@nop-chaos/flux-core').TemplateNode;
    const nameState = createRuntimeStateFromTemplateNode(nameNode);
    const statusState = createRuntimeStateFromTemplateNode(statusNode);

    expect(runtime.resolveNodeProps(nameNode, importScope, nameState).value.text).toBe('Original');
    expect(runtime.resolveNodeProps(statusNode, importScope, statusState).value.text).toBe('draft');

    form.setValues({
      'summary.name': 'Changed Name',
      'summary.status': 'published',
    });

    expect(runtime.resolveNodeProps(nameNode, importScope, nameState).value.text).toBe('Changed Name');
    expect(runtime.resolveNodeProps(statusNode, importScope, statusState).value.text).toBe('published');
  });

  it('records imported text node dependencies for both sibling fields', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([...basicRendererDefinitions]),
      env: baseEnv,
      expressionCompiler: createExpressionCompiler(formulaCompiler),
    });

    const nameNode = runtime.schemaCompiler.compileNode(
      { type: 'text', text: '${summary.name}' },
      {
        path: '$.viewer[0]',
        renderer: runtime.registry.get('text')!,
      },
    );
    const statusNode = runtime.schemaCompiler.compileNode(
      { type: 'text', text: '${summary.status}' },
      {
        path: '$.viewer[1]',
        renderer: runtime.registry.get('text')!,
      },
    );
    const page = runtime.createPageRuntime({ summary: { name: 'Original', status: 'draft' } });
    const importScope = runtime.createChildScope(page.scope, { detailViewLib: {} }, {
      pathSuffix: 'imports',
      scopeKey: 'detail-view-like:imports',
    });
    const nameState = createRuntimeStateFromTemplateNode(nameNode);
    const statusState = createRuntimeStateFromTemplateNode(statusNode);

    runtime.resolveNodeProps(nameNode, importScope, nameState);
    runtime.resolveNodeProps(statusNode, importScope, statusState);

    expect(nameState.propsDependencies).toEqual({
      paths: ['summary'],
      wildcard: false,
      broadAccess: false,
    });
    expect(statusState.propsDependencies).toEqual({
      paths: ['summary'],
      wildcard: false,
      broadAccess: false,
    });
  });
});

