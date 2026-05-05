import { afterEach, describe, expect, it } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import {
  createFormulaCompiler,
  createFormulaRegistry,
  getFormulaRegistrySnapshot,
  registerFunction,
  registerNamespace,
  resetFormulaRegistry,
} from './index';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  resetFormulaRegistry();
});

describe('formula registry', () => {
  it('registers functions and namespaces into the global snapshot', () => {
    registerFunction('DOUBLE', (value: number) => value * 2);
    registerNamespace('$Demo', { value: 3 });

    const snapshot = getFormulaRegistrySnapshot();
    expect(snapshot.functions.DOUBLE?.(2)).toBe(4);
    expect((snapshot.namespaces.$Demo as { value: number }).value).toBe(3);
  });

  it('re-installs builtins for a fresh compiler after registry reset', () => {
    const first = createFormulaCompiler();
    expect(first.compileExpression('${SUM(1, 2)}').exec({}, env)).toBe(3);

    resetFormulaRegistry();

    const second = createFormulaCompiler();
    expect(second.compileExpression('${SUM(1, 2)}').exec({}, env)).toBe(3);
  });

  it('two createFormulaRegistry() instances do not pollute each other', () => {
    const reg1 = createFormulaRegistry();
    const reg2 = createFormulaRegistry();

    reg1.registerFunction('FOO', () => 'from-reg1');
    reg2.registerFunction('BAR', () => 'from-reg2');

    const snap1 = reg1.getSnapshot();
    const snap2 = reg2.getSnapshot();

    expect(snap1.functions.FOO()).toBe('from-reg1');
    expect(snap1.functions.BAR).toBeUndefined();
    expect(snap2.functions.BAR()).toBe('from-reg2');
    expect(snap2.functions.FOO).toBeUndefined();
  });
});
