import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { flowDesignerRendererDefinitions } from './index';
import { createTestConfig, createRendererEnv } from './test-support';

describe('designer-page resolved props contract', () => {
  it('resolves document and statusPath through renderer prop fields', () => {
    const registry = createRendererRegistry(flowDesignerRendererDefinitions);
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
});
