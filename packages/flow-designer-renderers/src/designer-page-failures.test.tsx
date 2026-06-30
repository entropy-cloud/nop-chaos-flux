import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { flowDesignerRendererDefinitions } from './index.js';
import {
  basicTestRendererDefinitions,
  createRendererEnv,
  createTestConfig,
  formulaCompiler,
  installFlowDesignerTestHooks,
} from './index-test-support.js';

installFlowDesignerTestHooks();

afterEach(() => {
  cleanup();
});

describe('designer-page failure paths', () => {
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
          ...(createRendererEnv() as RendererEnv),
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
});
