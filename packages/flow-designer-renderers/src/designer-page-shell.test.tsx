// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import { render, waitFor, fireEvent, within } from '@testing-library/react';
import { flowDesignerRendererDefinitions } from './index';
import {
  basicTestRendererDefinitions,
  createRendererEnv,
  createTestConfig,
  formulaCompiler,
  installFlowDesignerTestHooks,
} from './index-test-support';

installFlowDesignerTestHooks();

describe('designer-page status publication', () => {
  it('publishes designer host status through statusPath', async () => {
    function StatusProbe() {
      const status = useScopeSelector((data: any) => data.designerStatus);
      return <span data-testid="designer-status">{status ? `${status.kind}:${status.selectionKind}:${status.selectionCount}` : ''}</span>;
    }

    const statusProbeRenderer = {
      type: 'designer-status-probe',
      component: StatusProbe
    } as any;
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions, statusProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-status"
        schema={{
          type: 'page',
          body: [
            {
              type: 'designer-page',
              document: { id: 'doc-1', kind: 'flow', name: 'Example', version: '1.0.0', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
              config: createTestConfig(),
              statusPath: 'designerStatus'
            },
            {
              type: 'designer-status-probe'
            }
          ]
        } as any}
        env={createRendererEnv() as any}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="designer-status"]')?.textContent).toBe('designer:none:0');
    });
  });
});

describe('DesignerPageRenderer basic rendering', () => {
  it('renders the designer page with xyflow canvas', () => {
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions]);

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
              { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
              { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } }
            ],
            edges: [{ id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Edge 1' } }],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          config: createTestConfig()
        } as any}
        env={createRendererEnv()}
        formulaCompiler={formulaCompiler}
      />
    );

    const canvas = within(view.container);
    expect(canvas.getByRole('application')).toBeTruthy();
    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(2);
  });

  it('renders a fallback when document or config is missing', () => {
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-fallback"
        schema={{ type: 'designer-page' } as any}
        env={createRendererEnv()}
        formulaCompiler={formulaCompiler}
      />
    );

    expect(view.getByText('Designer requires config prop')).toBeTruthy();
  });

  it('uses data-slot for the node quick toolbar instead of internal toolbar marker classes', async () => {
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions]);

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
            nodes: [{ id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } }],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          config: {
            ...createTestConfig(),
            nodeTypes: [
              {
                id: 'task',
                label: 'Task',
                body: { type: 'text', text: 'Task' },
                defaults: { label: 'Task' },
                quickActions: { type: 'text', text: 'Quick actions' }
              },
              {
                id: 'end',
                label: 'End',
                body: { type: 'text', text: 'End' },
                defaults: { label: 'End' }
              }
            ]
          }
        } as any}
        env={createRendererEnv()}
        formulaCompiler={formulaCompiler}
      />
    );

    const node = view.container.querySelector('.nop-designer-node') as HTMLElement;
    fireEvent.mouseEnter(node);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="designer-node-toolbar"]')).toBeTruthy();
      expect(document.querySelector('.nop-designer-node-toolbar')).toBeNull();
    });
  });
});
