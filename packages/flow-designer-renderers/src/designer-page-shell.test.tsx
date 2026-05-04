// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import { cleanup, render, waitFor, fireEvent, within, screen } from '@testing-library/react';
import { flowDesignerRendererDefinitions } from './index';
import {
  basicTestRendererDefinitions,
  createRendererEnv,
  createTestConfig,
  formulaCompiler,
  installFlowDesignerTestHooks,
} from './index-test-support';

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
        const runtime = data.runtime as { isDirty?: boolean } | undefined;
        return `${selection?.kind ?? 'missing'}:${runtime?.isDirty ?? 'missing'}`;
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
