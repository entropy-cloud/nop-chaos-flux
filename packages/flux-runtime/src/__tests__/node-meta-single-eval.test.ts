import { describe, expect, it } from 'vitest';
import {
  createRendererRegistry,
  type NodeRuntimeState,
  type RuntimeValueState,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

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

// [perf P2] resolveNodeProps re-executed the four meta leaves that
// resolveNodeMeta had just executed in the same getNodeResolution pass.
describe('node meta single-evaluation per resolution pass', () => {
  function setup() {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const schema = {
      type: 'text',
      text: 'hello',
      className: '${"c-" + label}',
      testid: '${"tid-" + label}',
      disabled: '${label === "off"}',
    };
    const compiledSchema = runtime.compile(schema);
    const node = compiledSchema.root as import('@nop-chaos/flux-core').TemplateNode;
    const compiledNode = runtime.schemaCompiler.compileNode(schema, {
      path: '$',
      renderer: runtime.registry.get('text')!,
    });
    const state = createRuntimeStateFromTemplateNode(compiledNode);
    const page = runtime.createPageRuntime({ label: 'on' });
    return { runtime, node, state, scope: page.scope };
  }

  it('executes each dynamic meta leaf once across meta+props resolution', () => {
    const { runtime, node, state, scope } = setup();
    const leaf = node.metaProgram.className as unknown as {
      exec: (...args: unknown[]) => unknown;
    };
    let execCount = 0;
    const originalExec = leaf.exec;
    leaf.exec = (...args: unknown[]) => {
      execCount += 1;
      return originalExec(...args);
    };

    runtime.resolveNodeMeta(node, scope, state);
    runtime.resolveNodeProps(node, scope, state);
    expect(execCount).toBe(1);
  });

  it('projects the same meta values that resolveNodeMeta stored', () => {
    const { runtime, node, state, scope } = setup();
    const meta = runtime.resolveNodeMeta(node, scope, state);
    const props = runtime.resolveNodeProps(node, scope, state);
    const value = props.value as Record<string, unknown>;
    expect(value.className).toBe(meta.className);
    expect(value.testid).toBe(meta.testid);
    expect(value.disabled).toBe(meta.disabled);
    expect(meta.className).toBe('c-on');
    expect(meta.testid).toBe('tid-on');
    expect(meta.disabled).toBe(false);
  });

  it('falls back to evaluation when meta was not resolved for this state', () => {
    const { runtime, node, scope } = setup();
    const freshNode = runtime.schemaCompiler.compileNode(
      {
        type: 'text',
        text: 'hello',
        className: '${"c-" + label}',
      },
      { path: '$', renderer: runtime.registry.get('text')! },
    );
    const freshState = createRuntimeStateFromTemplateNode(freshNode);
    const props = runtime.resolveNodeProps(node, scope, freshState);
    const value = props.value as Record<string, unknown>;
    expect(value.className).toBe('c-on');
  });
});
