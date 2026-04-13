import { afterEach, describe, expect, it } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler, getFormulaRegistrySnapshot, registerFunction, registerNamespace, resetFormulaRegistry } from './index';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined
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
});
