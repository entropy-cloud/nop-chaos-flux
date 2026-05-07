import { describe, expect, it } from 'vitest';
import {
  createRendererRegistry,
  setIn,
  type NodeRuntimeState,
  type RuntimeValueState,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

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

describe('createRendererRuntime', () => {
  it('preserves arrays when writing nested numeric paths', () => {
    const result = setIn({ reviewers: [] }, 'reviewers.0.value', 'alice');

    expect(Array.isArray(result.reviewers)).toBe(true);
    expect(result.reviewers[0]).toMatchObject({ value: 'alice' });
  });

  it('reuses resolved props references when values stay unchanged', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = runtime.compile({
      type: 'text',
      text: '${message}',
    });
    const node = compiled.root as any;

    const page = runtime.createPageRuntime({ message: 'Hello' });
    const state = runtime.schemaCompiler.compileNode(
      { type: 'text', text: '${message}' },
      {
        path: '$',
        renderer: registry.get('text')!,
      },
    );
    const runtimeState = createRuntimeStateFromTemplateNode(state);
    const first = runtime.resolveNodeProps(node, page.scope, runtimeState);
    const second = runtime.resolveNodeProps(node, page.scope, runtimeState);

    expect(first.value).toBe(second.value);
    expect(second.reusedReference).toBe(true);
  });

  it('records changed-path dependencies for node props and meta', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = runtime.compile({
      type: 'text',
      text: '${user.name}',
      visible: '${showText}',
    });
    const node = compiled.root as any;

    const page = runtime.createPageRuntime({ user: { name: 'Alice' }, showText: true });
    const state = runtime.schemaCompiler.compileNode(
      { type: 'text', text: '${user.name}', visible: '${showText}' },
      {
        path: '$',
        renderer: registry.get('text')!,
      },
    );
    const runtimeState = createRuntimeStateFromTemplateNode(state);

    runtime.resolveNodeMeta(node, page.scope, runtimeState);
    runtime.resolveNodeProps(node, page.scope, runtimeState);

    expect(runtimeState.metaDependencies).toEqual({
      paths: ['showText'],
      wildcard: false,
      broadAccess: false,
    });
    expect(runtimeState.propsDependencies).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });
  });
});
