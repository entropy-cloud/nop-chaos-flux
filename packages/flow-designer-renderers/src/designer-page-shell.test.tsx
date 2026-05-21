// @vitest-environment happy-dom
/* eslint-disable max-lines */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import { cleanup, render, waitFor, fireEvent, within, screen } from '@testing-library/react';
import { flowDesignerRendererDefinitions } from './index.js';
import {
  basicTestRendererDefinitions,
  createRendererEnv,
  createTestConfig,
  formulaCompiler,
  installFlowDesignerTestHooks,
} from './index-test-support.js';
import { createDesignerPageSchemaRenderer } from './designer-page.test-support.js';

installFlowDesignerTestHooks();

afterEach(() => {
  cleanup();
});

describe('designer-page status publication', () => {
  it('publishes designer host status through literal statusPath', async () => {
    function StatusProbe() {
      const status = useScopeSelector(
        (data: Record<string, unknown>) =>
          data.designerStatus as
            | { kind: string; selectionKind: string; selectionCount: number }
            | undefined,
      );
      return (
        <span data-testid="designer-status">
          {status ? `${status.kind}:${status.selectionKind}:${status.selectionCount}` : ''}
        </span>
      );
    }

    const statusProbeRenderer = {
      type: 'designer-status-probe',
      component: StatusProbe,
    } as RendererDefinition;
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
      statusProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-status"
        schema={{
          type: 'page',
          body: [
            {
              type: 'designer-page',
              document: {
                id: 'doc-1',
                kind: 'flow',
                name: 'Example',
                version: '1.0.0',
                nodes: [],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
              },
              config: createTestConfig(),
              statusPath: 'designerStatus',
            },
            {
              type: 'designer-status-probe',
            },
          ],
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="designer-status"]')?.textContent).toBe(
        'designer:none:0',
      );
    });
  });

  it('reports lifecycle hook failures through structured host issue monitoring', async () => {
    const onError = vi.fn();
    const actionButtonRenderer = {
      type: 'action-button',
      component: (props: { props: { label?: string }; events: { onClick?: () => void } }) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? 'Action')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }],
    } as RendererDefinition;
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
      actionButtonRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-lifecycle-hook-error"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: {
            ...createTestConfig(),
            hooks: {
              beforeCreateNode: () => {
                throw new Error('beforeCreateNode exploded');
              },
            },
          },
          toolbar: {
            type: 'action-button',
            label: 'Add node',
            onClick: {
              action: 'designer:addNode',
              args: { nodeType: 'task', position: { x: 40, y: 60 } },
            },
          },
        }}
        env={{
          ...createRendererEnv() as RendererEnv,
          monitor: { onError },
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add node' }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'render',
          error: expect.any(Error),
          details: expect.objectContaining({
            reason: 'designer-lifecycle-hook-failed',
            hook: 'beforeCreateNode',
            documentMode: undefined,
          }),
        }),
      );
    });
  });

  it('reports create dialog submitAction failures through monitor and notify without closing the dialog', async () => {
    const notify = vi.fn();
    const onError = vi.fn();
    const failedActionResult = {
      ok: false,
      cancelled: true,
      timedOut: true,
      cause: { reason: 'timeout' },
    };
    let registeredActionScope:
      | import('@nop-chaos/flux-core').ActionScope
      | null
      | undefined = undefined;
    const actionButtonRenderer = {
      type: 'action-button',
      component: (props: { props: { label?: string }; events: { onClick?: () => void } }) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? 'Action')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }],
    } as RendererDefinition;
    const createDialogBodyRenderer = {
      type: 'create-dialog-body-probe',
      component: () => <span>Create dialog body</span>,
    } as RendererDefinition;
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
      actionButtonRenderer,
      createDialogBodyRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-create-dialog-failure"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: {
            ...createTestConfig(),
            nodeTypes: [
              {
                id: 'task',
                label: 'Task',
                body: { type: 'text', text: 'Task' },
                defaults: { label: 'Task' },
                createDialog: {
                  title: 'Create task',
                  body: { type: 'create-dialog-body-probe' },
                  submitAction: { action: 'test:failCreate' },
                },
              },
            ],
          },
        }}
        env={{
          ...(createRendererEnv(notify) as RendererEnv),
          monitor: { onError },
        }}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(scope) => {
          if (registeredActionScope === scope) {
            return;
          }
          registeredActionScope?.unregisterNamespace('test');
          registeredActionScope = scope;
          scope?.registerNamespace('test', {
            kind: 'host',
            listMethods: () => ['failCreate'],
            invoke: async () => failedActionResult,
          });
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Task' }));

    await waitFor(() => {
      expect(screen.getByText('Create task')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'Create dialog submit action was cancelled.');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'render',
          error: expect.any(Error),
          details: expect.objectContaining({
            reason: 'designer-create-dialog-submit-failed',
            documentId: 'doc-1',
            documentMode: undefined,
            nodeType: 'task',
            cancelled: true,
            timedOut: true,
            actionResult: expect.objectContaining({
              ...failedActionResult,
              providerKind: 'host',
              sourceScopeId: 'root-action-scope',
            }),
          }),
        }),
      );
    });

    expect(screen.getByText('Create task')).toBeTruthy();
  });

  it('mounts toolbar, inspector, and dialogs regions with designer host scope and keeps edge selection on fallback inspector path', async () => {
    const actionButtonRenderer = {
      type: 'action-button',
      component: (props: { props: { label?: string }; events: { onClick?: () => void } }) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? 'Action')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }],
    } as RendererDefinition;

    function RegionProbe() {
      const summary = useScopeSelector((data: Record<string, unknown>) => {
        const selection = data.selection as { kind?: string } | undefined;
        const runtime = data.runtime as { dirty?: boolean } | undefined;
        return `${selection?.kind ?? 'missing'}:${runtime?.dirty ?? 'missing'}`;
      });
      return <span data-testid="designer-region-probe">{String(summary)}</span>;
    }

    const regionProbeRenderer = {
      type: 'designer-region-probe',
      component: RegionProbe,
    } as RendererDefinition;
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
      actionButtonRenderer,
      regionProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-region-scope"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              {
                id: 'node-1',
                type: 'task',
                position: { x: 20, y: 40 },
                data: { label: 'Task 1' },
              },
              {
                id: 'node-2',
                type: 'end',
                position: { x: 220, y: 40 },
                data: { label: 'Task 2' },
              },
            ],
            edges: [
              {
                id: 'edge-1',
                type: 'default',
                source: 'node-1',
                target: 'node-2',
                data: { label: 'Edge 1' },
              },
            ],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createTestConfig(),
          toolbar: [
            { type: 'designer-region-probe' },
            {
              type: 'action-button',
              label: 'Select edge',
              onClick: {
                action: 'designer:selectEdge',
                args: { edgeId: 'edge-1' },
              },
            },
          ],
          inspector: { type: 'designer-region-probe' },
          dialogs: { type: 'designer-region-probe' },
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('designer-region-probe')).toHaveLength(3);
      expect(
        screen
          .getAllByTestId('designer-region-probe')
          .every((node) => node.textContent?.startsWith('none:')),
      ).toBe(true);
    });

    window.dispatchEvent(
      new CustomEvent('nop-designer:test-connect', {
        detail: { source: 'node-1', target: 'node-2' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select edge' }));

    await waitFor(() => {
      expect(
        screen
          .getAllByTestId('designer-region-probe')
          .some((node) => node.textContent?.startsWith('edge:')),
      ).toBe(true);
    });
  });
});

describe('DesignerPageRenderer basic rendering', () => {
  it('passes root meta through designer-canvas and designer-palette wrappers', () => {
    const canvasDef = flowDesignerRendererDefinitions.find(
      (definition) => definition.type === 'designer-canvas',
    );
    const paletteDef = flowDesignerRendererDefinitions.find(
      (definition) => definition.type === 'designer-palette',
    );

    const canvas = canvasDef?.component?.({
      meta: { className: 'canvas-root', testid: 'canvas-root', cid: 42 },
    } as any) as React.ReactElement;
    const palette = paletteDef?.component?.({
      meta: { className: 'palette-root', testid: 'palette-root', cid: 7 },
    } as any) as React.ReactElement;

    expect(canvas.props.rootProps).toEqual({
      className: 'canvas-root',
      'data-testid': 'canvas-root',
      'data-cid': '42',
    });
    expect(palette.props.rootProps).toEqual({
      className: 'palette-root',
      'data-testid': 'palette-root',
      'data-cid': '7',
    });
  });

  it('declares designer-field authored fields and renders a stable root marker', () => {
    const fieldDef = flowDesignerRendererDefinitions.find(
      (definition) => definition.type === 'designer-field',
    );

    expect(fieldDef?.fields?.map((field) => field.key)).toEqual([
      'label',
      'name',
      'fieldType',
      'options',
    ]);

    const SchemaRenderer = createDesignerPageSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-designer-field"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createTestConfig(),
          inspector: {
            type: 'designer-field',
            name: 'title',
            label: 'Title',
            fieldType: 'text',
          },
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = view.container.querySelector('.nop-designer-field');
    expect(root).toBeTruthy();
  });

  it('renders designer-field label regions when label is authored as schema input', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-designer-field-label-region"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createTestConfig(),
          inspector: {
            type: 'designer-field',
            name: 'title',
            label: { type: 'text', text: 'Region Label' },
            fieldType: 'text',
          },
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Region Label')).toBeTruthy();
  });

  it('passes meta.disabled through designer-field control variants', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-designer-field-disabled"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createTestConfig(),
          inspector: [
            {
              type: 'designer-field',
              name: 'title',
              label: 'Title',
              fieldType: 'text',
              disabled: true,
            },
            {
              type: 'designer-field',
              name: 'description',
              label: 'Description',
              fieldType: 'textarea',
              disabled: true,
            },
            {
              type: 'designer-field',
              name: 'count',
              label: 'Count',
              fieldType: 'number',
              disabled: true,
            },
          ],
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect((view.container.querySelector('input[type="text"]') as HTMLInputElement)?.disabled).toBe(true);
    expect((view.container.querySelector('textarea') as HTMLTextAreaElement)?.disabled).toBe(true);
    expect((view.container.querySelector('input[type="number"]') as HTMLInputElement)?.disabled).toBe(true);
  });

  it('renders title as a supported value-or-region contract above the toolbar', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-title-slot"
        schema={{
          type: 'designer-page',
          title: { type: 'text', text: 'Flow Title' },
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createTestConfig(),
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Flow Title')).toBeTruthy();
    const designerPageDef = flowDesignerRendererDefinitions.find((definition) => definition.type === 'designer-page');
    expect(designerPageDef?.fields?.some((field) => field.key === 'title' && field.regionKey === 'title')).toBe(true);
  });

  it('renders the designer page with xyflow canvas', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-rendering"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              {
                id: 'node-1',
                type: 'task',
                position: { x: 20, y: 40 },
                data: { label: 'Task 1' },
              },
              {
                id: 'node-2',
                type: 'end',
                position: { x: 220, y: 40 },
                data: { label: 'Task 2' },
              },
            ],
            edges: [
              {
                id: 'edge-1',
                type: 'default',
                source: 'node-1',
                target: 'node-2',
                data: { label: 'Edge 1' },
              },
            ],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createTestConfig(),
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const canvas = within(view.container);
    expect(canvas.getByRole('application')).toBeTruthy();
    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(2);
  });

  it('renders a fallback when document or config is missing', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-fallback"
        schema={{ type: 'designer-page' }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(view.getAllByText('Designer requires config prop').length).toBeGreaterThan(0);
  });

  it('keeps root meta on fallback branches', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-fallback-meta"
        schema={{ type: 'designer-page', className: 'designer-fallback-root', testid: 'designer-fallback' }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const fallback = view.getByTestId('designer-fallback');
    expect(fallback.className).toContain('designer-fallback-root');
    expect(fallback.textContent).toContain('Designer requires config prop');
  });

  it('hides sides without resolved palette or inspector config', () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-hidden-sides"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: {
            version: '1.0.0',
            kind: 'flow',
            nodeTypes: [
              {
                id: 'task',
                label: 'Task',
                body: { type: 'text', text: 'Task' },
              },
            ],
          },
          inspector: { type: 'text', text: 'Host inspector override' },
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByTestId('left-panel-expanded')).toBeNull();
    expect(screen.queryByTestId('left-panel-collapsed')).toBeNull();
    expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
    expect(screen.queryByTestId('right-panel-collapsed')).toBeNull();
    expect(screen.queryByText('Host inspector override')).toBeNull();
  });

  it('uses data-slot for the node quick toolbar instead of internal toolbar marker classes', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-toolbar"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              {
                id: 'node-1',
                type: 'task',
                position: { x: 20, y: 40 },
                data: { label: 'Task 1' },
              },
            ],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: {
            ...createTestConfig(),
            nodeTypes: [
              {
                id: 'task',
                label: 'Task',
                body: { type: 'text', text: 'Task' },
                defaults: { label: 'Task' },
                quickActions: { type: 'text', text: 'Quick actions' },
              },
              {
                id: 'end',
                label: 'End',
                body: { type: 'text', text: 'End' },
                defaults: { label: 'End' },
              },
            ],
          },
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const node = view.container.querySelector('.nop-designer-node') as HTMLElement;
    fireEvent.mouseEnter(node);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="designer-node-toolbar"]')).toBeTruthy();
      expect(document.querySelector('.nop-designer-node-toolbar')).toBeNull();
    });
  });

});
