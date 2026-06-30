import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import { cleanup, render, waitFor } from '@testing-library/react';
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
});
