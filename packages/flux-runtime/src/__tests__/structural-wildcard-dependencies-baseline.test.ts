import { describe, expect, it } from 'vitest';
import {
  createRendererRegistry,
  type NodeRuntimeState,
  type RuntimeValueState,
  type RendererDefinition,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { env } from './test-fixtures.js';

// plan 2026-09-28-6 Phase 1 — P13 baseline: today ANY dynamic structural
// (lazyEval) field forces WILDCARD propsDependencies regardless of what the
// compiled value actually reads. This pins the current trigger surface so the
// P13 narrowing (collect the compiled value's real dependencies, wildcard
// fallback when un-collectible) must preserve the same render-trigger behavior
// for nodes without dynamic structural fields.

const structuralRenderer: RendererDefinition = {
  type: 'structural-probe',
  displayName: 'Structural Probe',
  category: 'Test',
  sourcePackage: 'test',
  component: function StructuralProbe() {
    return null;
  },
  wrap: true,
  fields: [
    { key: 'plain', kind: 'prop' },
    { key: 'itemData', kind: 'prop', lazyEval: true, params: ['item', 'index'] },
  ],
} as unknown as RendererDefinition;

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

describe('structural field wildcard dependencies baseline (plan 2026-09-28-6 P13)', () => {
  it('dynamic structural field forces wildcard propsDependencies (current behavior)', () => {
    const registry = createRendererRegistry([structuralRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const schema = {
      type: 'structural-probe',
      itemData: '${rows}',
      plain: 'static',
    };
    const state = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: registry.get('structural-probe')!,
    });
    expect(state.structuralFields?.itemData).toBeTruthy();
    expect(state.structuralFields?.itemData?.kind).toBe('dynamic');

    const node = runtime.compile(schema).root as any;
    const page = runtime.createPageRuntime({ rows: [{ id: 1 }] });
    const runtimeState = createRuntimeStateFromTemplateNode(state);

    runtime.resolveNodeProps(node, page.scope, runtimeState);

    expect(runtimeState.propsDependencies).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    });
  });

  it('node without dynamic structural fields keeps collected dependencies', () => {
    const registry = createRendererRegistry([structuralRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const schema = {
      type: 'structural-probe',
      plain: '${user.name}',
    };
    const state = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: registry.get('structural-probe')!,
    });
    expect(state.structuralFields?.itemData).toBeUndefined();

    const node = runtime.compile(schema).root as any;
    const page = runtime.createPageRuntime({ user: { name: 'Alice' } });
    const runtimeState = createRuntimeStateFromTemplateNode(state);

    runtime.resolveNodeProps(node, page.scope, runtimeState);

    expect(runtimeState.propsDependencies).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });
  });

  it('static structural field does not force wildcard', () => {
    const registry = createRendererRegistry([structuralRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const schema = {
      type: 'structural-probe',
      itemData: [{ id: 1 }],
      plain: '${user.name}',
    };
    const state = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: registry.get('structural-probe')!,
    });
    expect(state.structuralFields?.itemData?.kind).toBe('static');

    const node = runtime.compile(schema).root as any;
    const page = runtime.createPageRuntime({ user: { name: 'Alice' } });
    const runtimeState = createRuntimeStateFromTemplateNode(state);

    runtime.resolveNodeProps(node, page.scope, runtimeState);

    expect(runtimeState.propsDependencies).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });
  });
});
