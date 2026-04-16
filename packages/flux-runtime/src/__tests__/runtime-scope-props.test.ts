import { describe, expect, it } from 'vitest';
import { setIn, type NodeRuntimeState } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { textRenderer, env } from './test-fixtures';

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
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = runtime.compile({
      type: 'text',
      text: '${message}'
    });
    const node = compiled.root as any;

    const page = runtime.createPageRuntime({ message: 'Hello' });
    const state = runtime.schemaCompiler.compileNode({ type: 'text', text: '${message}' }, {
      path: '$',
      renderer: registry.get('text')!
    });
    const runtimeState: NodeRuntimeState = { meta: {}, props: state.propsProgram.kind === 'dynamic' ? state.propsProgram.createState() : undefined };
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
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = runtime.compile({
      type: 'text',
      text: '${user.name}',
      visible: '${showText}'
    });
    const node = compiled.root as any;

    const page = runtime.createPageRuntime({ user: { name: 'Alice' }, showText: true });
    const state = runtime.schemaCompiler.compileNode({ type: 'text', text: '${user.name}', visible: '${showText}' }, {
      path: '$',
      renderer: registry.get('text')!
    });
    const runtimeState: NodeRuntimeState = { meta: {}, props: state.propsProgram.kind === 'dynamic' ? state.propsProgram.createState() : undefined };

    runtime.resolveNodeMeta(node, page.scope, runtimeState);
    runtime.resolveNodeProps(node, page.scope, runtimeState);

    expect(runtimeState.metaDependencies).toEqual({
      paths: ['showText'],
      wildcard: false,
      broadAccess: false
    });
    expect(runtimeState.propsDependencies).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false
    });
  });
});
