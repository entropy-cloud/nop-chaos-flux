import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from './formula-compiler.js';

const env: RendererEnv = {
  fetcher: async <T>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// plan 839 N3: static-eval folded every builtin-namespace member call at
// compile time with no purity check, so `${$Date.now()}` froze into the LRU
// and kept returning the compile-time timestamp for the whole session — the
// same class of impure sink the `t()` builtin already avoids (builtins.ts
// "not collapsed into a static literal" precedent).
describe('impure namespace calls stay call-time (plan 839 N3)', () => {
  it('re-evaluates $Date.now() per exec instead of freezing the compile-time value', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-13T00:00:00Z'));

    const compiler = createFormulaCompiler();
    const program = compiler.compileExpression<Date>('${$Date.now()}');
    const first = (program.exec({} as never, env) as Date).getTime();

    vi.setSystemTime(new Date('2026-04-13T00:00:01.500Z'));
    const second = (program.exec({} as never, env) as Date).getTime();

    expect(second).toBeGreaterThan(first);
  });

  it('keeps template-embedded $Date.now() fresh across execs', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-13T00:00:00Z'));

    const compiler = createFormulaCompiler();
    const program = compiler.compileTemplate<string>('生成时间: ${$Date.now()}');
    const first = program.exec({} as never, env);

    vi.setSystemTime(new Date('2026-04-13T00:00:02Z'));
    const second = program.exec({} as never, env);

    expect(second).not.toBe(first);
  });

  it('re-evaluates $Date.today() per exec', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-13T23:59:59Z'));

    const compiler = createFormulaCompiler();
    const program = compiler.compileExpression<number>('${$Date.today().getTime()}');
    const first = program.exec({} as never, env);

    vi.setSystemTime(new Date('2026-04-14T00:00:01Z'));
    const second = program.exec({} as never, env);

    expect(second).toBeGreaterThan(first);
  });

  it('re-evaluates $Math.random() per exec', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);

    const compiler = createFormulaCompiler();
    const program = compiler.compileExpression<number>('${$Math.random()}');

    expect(program.exec({} as never, env)).toBe(0.1);
    expect(program.exec({} as never, env)).toBe(0.9);
    expect(randomSpy).toHaveBeenCalledTimes(2);
  });

  it('still folds pure namespace members ($Math.max, $JSON.stringify)', () => {
    const compiler = createFormulaCompiler();

    const maxProgram = compiler.compileExpression<number>('${$Math.max(1, 2)}');
    expect(maxProgram.exec({} as never, env)).toBe(2);

    const jsonProgram = compiler.compileExpression<string>('${$JSON.stringify({a: 1})}');
    expect(jsonProgram.exec({} as never, env)).toBe('{"a":1}');
  });
});
