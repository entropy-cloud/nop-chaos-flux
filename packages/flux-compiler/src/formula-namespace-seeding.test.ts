import { describe, expect, it } from 'vitest';
import { createFormulaRegistry, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createExpressionCompiler } from '@nop-chaos/flux-formula';
import { createFormulaAwareCompileSymbolTable } from './compile-symbol-table.js';

// R1.4 / plan 723 T2 — P1-MA4.1-002: the three-layer host-namespace seeding
// chain (contract compilation.ts getFormulaNamespaces?() -> formula-compiler
// production -> compile-symbol-table consumption) had zero tests. Runtime
// namespace tests are dense and created a false-coverage illusion; this pins
// the compile-time seam: a host namespace registered in the formula registry
// must reach the compile symbol table (otherwise schemas referencing it emit
// unknown-import-alias / false ambient-dollar-reference diagnostics).
describe('getFormulaNamespaces compile-time seeding chain', () => {
  it('seeds registry host namespaces into the compile symbol table', () => {
    const registry = createFormulaRegistry();
    registry.registerNamespace('$Arr', { foo: () => 1, bar: 2 });
    const formulaCompiler = createFormulaCompiler(registry);
    const expressionCompiler = createExpressionCompiler(formulaCompiler);

    const table = createFormulaAwareCompileSymbolTable(expressionCompiler);

    const resolved = table.resolve('$Arr');
    expect(resolved).toBeDefined();
    expect(resolved?.kind).toBe('builtin-namespace');
    expect(resolved?.members).toEqual(expect.arrayContaining(['foo', 'bar']));
  });

  it('keeps the base table unseeded when the compiler exposes no namespaces (negative control)', () => {
    // A plain expression compiler over a fresh registry exposes no $ namespaces;
    // the table must fall back to the base (this is the state in which
    // referencing $Arr emits unknown-import-alias).
    const formulaCompiler = createFormulaCompiler(createFormulaRegistry());
    const expressionCompiler = createExpressionCompiler(formulaCompiler);

    const table = createFormulaAwareCompileSymbolTable(expressionCompiler);

    expect(table.resolve('$Arr')).toBeUndefined();
  });

  it('tolls through the layers when the compiler omits getFormulaNamespaces (legacy shape)', () => {
    // Contract compilation.ts:230 "Optional; legacy shapes omit it" — an
    // expression compiler without the hook must not crash the table build.
    const legacy = { formulaCompiler: {} as never } as never as Parameters<
      typeof createFormulaAwareCompileSymbolTable
    >[0];
    const table = createFormulaAwareCompileSymbolTable(legacy);
    expect(table.resolve('$Arr')).toBeUndefined();
  });
});
