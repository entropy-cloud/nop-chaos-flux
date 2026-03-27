import { describe, expect, it } from 'vitest';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from './index';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined
};

function createScope(data: Record<string, any>): ScopeRef {
  return {
    id: 'scope',
    path: 'scope',
    get(path: string) {
      return path.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') {
          return undefined;
        }

        return (current as Record<string, unknown>)[segment];
      }, data);
    },
    has(path: string) {
      return this.get(path) !== undefined;
    },
    readOwn: () => data,
    value: data,
    read: () => data,
    update: () => undefined
  };
}

describe('createFormulaCompiler', () => {
  it('detects template expressions', () => {
    const compiler = createFormulaCompiler();
    expect(compiler.hasExpression('hello ${name}')).toBe(true);
    expect(compiler.hasExpression('hello world')).toBe(false);
  });

  it('parses ternary expressions in templates', () => {
    const compiler = createFormulaCompiler();
    const template = compiler.compileTemplate('${isDirty ? "warning" : "success"}');
    const scope = createScope({ isDirty: true });
    const result = template.exec(scope, env);
    expect(result).toBe('warning');
  });

  it('parses nested braces in ternary expressions', () => {
    const compiler = createFormulaCompiler();
    const template = compiler.compileTemplate('Status: ${isDirty ? "dirty" : "clean"}');
    const scope = createScope({ isDirty: false });
    const result = template.exec(scope, env);
    expect(result).toBe('Status: clean');
  });

  it('handles multiple ternary expressions', () => {
    const compiler = createFormulaCompiler();
    const template = compiler.compileTemplate('${a ? 1 : 0} and ${b ? 2 : 3}');
    const scope = createScope({ a: true, b: false });
    const result = template.exec(scope, env);
    expect(result).toBe('1 and 3');
  });
});

describe('createExpressionCompiler', () => {
  it('returns original reference for fully static objects', () => {
    const input = { title: 'Static', options: { variant: 'primary' } };
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue(input);

    expect(compiled.kind).toBe('static');
    if (compiled.kind !== 'static') {
      throw new Error('Expected static compiled value');
    }

    expect(compiled.value).toBe(input);
  });

  it('reuses object references when evaluated results stay unchanged', () => {
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue({
      title: '${user.name}',
      summary: 'Role: ${user.role}'
    });

    if (compiled.kind !== 'dynamic') {
      throw new Error('Expected dynamic compiled value');
    }

    const state = compiler.createState(compiled);
    const scopeA = createScope({ user: { name: 'Alice', role: 'admin' } });
    const first = compiler.evaluateWithState(compiled, scopeA, env, state);
    const second = compiler.evaluateWithState(compiled, createScope({ user: { name: 'Alice', role: 'admin' } }), env, state);

    expect(first.value).toEqual({ title: 'Alice', summary: 'Role: admin' });
    expect(second.value).toBe(first.value);
    expect(second.reusedReference).toBe(true);
  });

  it('updates array references when nested values change', () => {
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue(['${value}', 'fixed']);

    if (compiled.kind !== 'dynamic') {
      throw new Error('Expected dynamic compiled value');
    }

    const state = compiler.createState(compiled);
    const first = compiler.evaluateWithState(compiled, createScope({ value: 'A' }), env, state);
    const second = compiler.evaluateWithState(compiled, createScope({ value: 'B' }), env, state);

    expect(first.value).toEqual(['A', 'fixed']);
    expect(second.value).toEqual(['B', 'fixed']);
    expect(second.value).not.toBe(first.value);
  });

  it('evaluates expressions through scope.get and lexical lookups', () => {
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue('${record.name}');

    if (compiled.kind !== 'dynamic') {
      throw new Error('Expected dynamic compiled value');
    }

    const state = compiler.createState(compiled);
    const scope = createScope({ record: { name: 'Bob' } });
    const result = compiler.evaluateWithState(compiled, scope, env, state);

    expect(result.value).toBe('Bob');
  });
});

