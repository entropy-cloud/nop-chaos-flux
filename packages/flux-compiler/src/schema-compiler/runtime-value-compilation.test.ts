import { describe, expect, it } from 'vitest';
import type {
  CompiledActionProgram,
  CompiledRuntimeValue,
  EvalContext,
  RendererEnv,
} from '@nop-chaos/flux-core';
import { compileRuntimeValueTree } from './runtime-value-compilation.js';

const context: EvalContext = {
  resolve: () => undefined,
  has: () => false,
  materialize: () => ({}),
};

const env = {
  fetcher: async <T>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
} as RendererEnv;

interface ScriptedResult {
  value: unknown;
  changed: boolean;
}

function scriptedDynamicLeaf(results: ScriptedResult[]): CompiledRuntimeValue<unknown> {
  let call = 0;
  return {
    kind: 'dynamic',
    isStatic: false,
    node: {
      kind: 'expression-node',
      source: 'scripted',
      compiled: {
        kind: 'expression',
        source: 'scripted',
        exec: () => undefined,
      },
    },
    createState: () => ({ root: { kind: 'leaf-state', initialized: false } }),
    exec: () => {
      const result = results[Math.min(call, results.length - 1)]!;
      call += 1;
      return { ...result, reusedReference: false };
    },
  };
}

function compiledProgram(): CompiledActionProgram {
  return {
    nodes: [
      {
        action: 'demo:program',
        payload: {},
        targeting: {},
        control: {},
        source: { action: 'demo:program' },
      },
    ],
    isFullyStatic: false,
  };
}

describe('compileRuntimeValueTree composite commit protocol (CX-1 characterization)', () => {
  it('array arm reuses lastValue by reference on the second exec with no child change', () => {
    const tree = compileRuntimeValueTree([scriptedDynamicLeaf([{ value: 'a', changed: false }])]);
    if (tree.kind !== 'dynamic') throw new Error('expected dynamic tree');
    const state = tree.createState();

    const first = tree.exec(context, env, state);
    expect(first.changed).toBe(true);
    expect(first.reusedReference).toBe(false);

    const second = tree.exec(context, env, state);
    expect(second.changed).toBe(false);
    expect(second.reusedReference).toBe(true);
    expect(second.value).toBe(first.value);
  });

  it('array arm hits the shallowEqual reuse path when children report change with equal values', () => {
    const tree = compileRuntimeValueTree([scriptedDynamicLeaf([{ value: 'a', changed: true }])]);
    if (tree.kind !== 'dynamic') throw new Error('expected dynamic tree');
    const state = tree.createState();

    const first = tree.exec(context, env, state);
    expect(first.value).toEqual(['a']);

    const second = tree.exec(context, env, state);
    expect(second.changed).toBe(false);
    expect(second.reusedReference).toBe(true);
    expect(second.value).toBe(first.value);
  });

  it('array arm commits changed:true when children change to different values', () => {
    const tree = compileRuntimeValueTree([
      scriptedDynamicLeaf([
        { value: 'a', changed: true },
        { value: 'b', changed: true },
      ]),
    ]);
    if (tree.kind !== 'dynamic') throw new Error('expected dynamic tree');
    const state = tree.createState();

    const first = tree.exec(context, env, state);
    expect(first.value).toEqual(['a']);

    const second = tree.exec(context, env, state);
    expect(second.changed).toBe(true);
    expect(second.reusedReference).toBe(false);
    expect(second.value).toEqual(['b']);
    expect(second.value).not.toBe(first.value);
  });

  it('object arm reuses lastValue by reference on the second exec with no child change', () => {
    const tree = compileRuntimeValueTree({
      key: scriptedDynamicLeaf([{ value: 'a', changed: false }]),
    });
    if (tree.kind !== 'dynamic') throw new Error('expected dynamic tree');
    const state = tree.createState();

    const first = tree.exec(context, env, state);
    expect(first.changed).toBe(true);
    expect(first.reusedReference).toBe(false);

    const second = tree.exec(context, env, state);
    expect(second.changed).toBe(false);
    expect(second.reusedReference).toBe(true);
    expect(second.value).toBe(first.value);
  });

  it('object arm hits the shallowEqual reuse path when children report change with equal values', () => {
    const tree = compileRuntimeValueTree({
      key: scriptedDynamicLeaf([{ value: 'a', changed: true }]),
    });
    if (tree.kind !== 'dynamic') throw new Error('expected dynamic tree');
    const state = tree.createState();

    const first = tree.exec(context, env, state);
    expect(first.value).toEqual({ key: 'a' });

    const second = tree.exec(context, env, state);
    expect(second.changed).toBe(false);
    expect(second.reusedReference).toBe(true);
    expect(second.value).toBe(first.value);
  });

  it('object arm commits changed:true when children change to different values', () => {
    const tree = compileRuntimeValueTree({
      key: scriptedDynamicLeaf([
        { value: 'a', changed: true },
        { value: 'b', changed: true },
      ]),
    });
    if (tree.kind !== 'dynamic') throw new Error('expected dynamic tree');
    const state = tree.createState();

    const first = tree.exec(context, env, state);
    expect(first.value).toEqual({ key: 'a' });

    const second = tree.exec(context, env, state);
    expect(second.changed).toBe(true);
    expect(second.reusedReference).toBe(false);
    expect(second.value).toEqual({ key: 'b' });
    expect(second.value).not.toBe(first.value);
  });

  it('keeps pre-compiled dynamic leaves and compiled action programs as tree members', () => {
    const program = compiledProgram();
    const tree = compileRuntimeValueTree([scriptedDynamicLeaf([{ value: 'a', changed: false }]), program]);
    if (tree.kind !== 'dynamic') throw new Error('expected dynamic tree');
    const state = tree.createState();

    const first = tree.exec(context, env, state);
    expect(first.value[1]).toBe(program);
  });
});
