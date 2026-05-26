import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { flowDesignerRendererDefinitions } from './index.js';
import { createTestConfig, createRendererEnv } from './test-support.js';

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
  fields: [
    { key: 'text', kind: 'prop', allowSource: true },
    { key: 'body', kind: 'prop' },
  ],
  staticCapable: true,
};

describe('designer-page resolved props contract', () => {
  it('resolves document and statusPath through renderer prop fields', () => {
    const registry = createRendererRegistry([textRenderer, ...flowDesignerRendererDefinitions]);
    const runtime = createRendererRuntime({
      registry,
      env: createRendererEnv(),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = runtime.compile({
      type: 'designer-page',
      document: '${document}',
      config: '${config}',
      statusPath: '${statusPath}',
    });
    const node = compiled.root as any;

    const page = runtime.createPageRuntime({
      document: {
        id: 'doc-runtime-1',
        kind: 'flow',
        name: 'Runtime Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      config: createTestConfig(),
      statusPath: 'designerStatus',
    });

    const resolved = runtime.resolveNodeProps(node, page.scope);

    expect((resolved.value as Record<string, unknown>).document).toMatchObject({
      id: 'doc-runtime-1',
      kind: 'flow',
    });
    expect((resolved.value as Record<string, unknown>).statusPath).toBe('designerStatus');
  });

  it('preserves nested schemas in config while resolving ordinary leaves', () => {
    const registry = createRendererRegistry([textRenderer, ...flowDesignerRendererDefinitions]);
    const runtime = createRendererRuntime({
      registry,
      env: createRendererEnv(),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = runtime.compile({
      type: 'designer-page',
      document: '${document}',
      config: {
        ...createTestConfig(),
        palette: {
          groups: [{ id: 'basic', label: '${paletteLabel}', nodeTypes: ['start'] }],
        },
        nodeTypes: [
          {
            id: 'start',
            label: '${nodeTypeLabel}',
            body: { type: 'text', text: '${label}' },
          },
        ],
        edgeTypes: [
          {
            id: 'default',
            label: 'Default',
            body: { type: 'text', text: '${condition}' },
            defaults: {},
          },
        ],
      },
    });
    const node = compiled.root as any;

    const page = runtime.createPageRuntime({
      document: {
        id: 'doc-runtime-2',
        kind: 'flow',
        name: 'Runtime Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      paletteLabel: 'Basic Nodes',
      nodeTypeLabel: 'Start Node',
    });

    const resolved = runtime.resolveNodeProps(node, page.scope);
    const config = (resolved.value as Record<string, any>).config;

    expect(config.palette.groups[0].label).toBe('Basic Nodes');
    expect(config.nodeTypes[0].label).toBe('Start Node');
    expect(config.nodeTypes[0].body).toBeTruthy();
    expect(config.edgeTypes[0].body).toBeTruthy();
    expect(config.nodeTypes[0].body).not.toEqual({ type: 'text', text: '${label}' });
    expect(config.edgeTypes[0].body).not.toEqual({ type: 'text', text: '${condition}' });
  });
});
