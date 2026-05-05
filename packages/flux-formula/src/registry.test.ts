import { describe, expect, it } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler, createFormulaRegistry } from './index';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

describe('formula registry', () => {
  it('registers functions and namespaces into an instance-owned snapshot', () => {
    const registry = createFormulaRegistry();
    registry.registerFunction('DOUBLE', (value: number) => value * 2);
    registry.registerNamespace('$Demo', { value: 3 });

    const snapshot = registry.getSnapshot();
    expect(snapshot.functions.DOUBLE?.(2)).toBe(4);
    expect((snapshot.namespaces.$Demo as { value: number }).value).toBe(3);
  });

  it('installs builtins for each fresh compiler registry', () => {
    const first = createFormulaCompiler(createFormulaRegistry());
    expect(first.compileExpression('${SUM(1, 2)}').exec({}, env)).toBe(3);

    const second = createFormulaCompiler(createFormulaRegistry());
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
