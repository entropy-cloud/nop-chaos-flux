import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSchemaDiagnosticCollector,
  type RendererEnv,
  type ScopeRef,
} from '@nop-chaos/flux-core';
import {
  createExpressionCompiler,
  createFormulaCompiler,
  registerFunction,
  resetFormulaRegistry,
} from './index';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  resetFormulaRegistry();
});

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
    readVisible: () => data,
    materializeVisible: () => data,
    value: data,
    update: () => undefined,
    merge: () => {},
  };
}

describe('createFormulaCompiler', () => {
  it('supports builtins and namespaces without amis-formula', () => {
    const compiler = createFormulaCompiler();
    const expression = compiler.compileExpression('${IF(flag, $Math.max(1, 4), 0)}');
    expect(expression.exec(createScope({ flag: true }), env)).toBe(4);
  });

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

  it('supports imported alias expression calls', () => {
    const compiler = createFormulaCompiler();
    const expression = compiler.compileExpression(
      '${$demo.formatName(user.firstName, user.lastName)}',
    );
    const scope = createScope({
      user: { firstName: 'Ada', lastName: 'Lovelace' },
      $demo: {
        formatName(first: string, last: string) {
          return `${last}, ${first}`;
        },
      },
    });

    expect(expression.exec(scope, env)).toBe('Lovelace, Ada');
  });

  it('rewrites filter-pipe compatibility syntax to function calls', () => {
    resetFormulaRegistry();
    registerFunction(
      'wrap',
      (value: unknown, left: string, right: string) => `${left}${String(value)}${right}`,
    );
    const compiler = createFormulaCompiler();
    const expression = compiler.compileExpression('${name | wrap:"[":"]"}');

    expect(expression.exec(createScope({ name: 'Ada' }), env)).toBe('[Ada]');
  });

  it('reports runtime expression errors through monitor.onError and throws', () => {
    const onError = vi.fn();
    const compiler = createFormulaCompiler();
    const expression = compiler.compileExpression('${user.name.first}');

    expect(() =>
      expression.exec(createScope({ user: null }), {
        ...env,
        monitor: { onError },
      }),
    ).toThrow(/Expression evaluation failed/);

    expect(onError).toHaveBeenCalled();
  });

  it('keeps IF lazy and does not evaluate the untaken branch', () => {
    const compiler = createFormulaCompiler();
    const expression = compiler.compileExpression('${IF(flag, value, missing.deep.path)}');

    expect(expression.exec(createScope({ flag: true, value: 'safe' }), env)).toBe('safe');
  });

  it('keeps SWITCH lazy and does not evaluate unmatched branches', () => {
    const compiler = createFormulaCompiler();
    const expression = compiler.compileExpression(
      '${SWITCH(kind, "a", title, "b", missing.deep.path, "fallback")}',
    );

    expect(expression.exec(createScope({ kind: 'a', title: 'picked' }), env)).toBe('picked');
  });

  it('supports manual migration paths for and/or operators and $Date namespace helpers', () => {
    const compiler = createFormulaCompiler();

    expect(
      compiler
        .compileExpression('${flag and alt}')
        .exec(createScope({ flag: true, alt: 'ok' }), env),
    ).toBe('ok');
    expect(
      compiler
        .compileExpression('${primary or backup}')
        .exec(createScope({ primary: '', backup: 'fallback' }), env),
    ).toBe('fallback');
    expect(
      compiler
        .compileExpression('${$Date.format("2026-04-13T12:34:56Z", "iso-date")}')
        .exec(createScope({}), env),
    ).toBe('2026-04-13');
  });

  it('rejects unsupported migration syntax like AND/ABS/window/cookie access', () => {
    const compiler = createFormulaCompiler();

    expect(() => compiler.compileExpression('${window:token}')).toThrow();
    expect(() => compiler.compileExpression('${cookie:key}')).toThrow();
    expect(compiler.compileExpression('${$$}').exec(createScope({ $$: 'plain-value' }), env)).toBe(
      'plain-value',
    );
    expect(
      compiler.compileExpression('${$varName}').exec(createScope({ $varName: 'scoped' }), env),
    ).toBe('scoped');
    expect(() =>
      compiler
        .compileExpression('${AND(flag, other)}')
        .exec(createScope({ flag: true, other: true }), env),
    ).toThrow();
    expect(() => compiler.compileExpression('${ABS(-3)}').exec(createScope({}), env)).toThrow();
  });

  it('emits compile-time diagnostics for invalid dollar references', () => {
    const compiler = createFormulaCompiler();
    const { collector, diagnostics } = createSchemaDiagnosticCollector();

    compiler.compileExpression('${$slot.missing}', {
      sourcePath: '$.body[0].text',
      reportDiagnostic: (issue) =>
        collector.add({
          code: issue.code,
          path: issue.path,
          message: issue.message,
          severity: issue.severity ?? 'error',
          source: issue.source ?? 'core',
        }),
      symbolTable: {
        frames: [],
        push(_frame) {
          return this;
        },
        resolve() {
          return undefined;
        },
      },
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'slot-used-outside-region', path: '$.body[0].text' }),
    ]);
  });

  it('folds pure builtin expressions to static nodes', () => {
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue('${$Math.max(1, 2)}');

    expect(compiled.kind).toBe('static');
    if (compiled.kind !== 'static') {
      throw new Error('Expected static compiled value');
    }

    expect(compiled.value).toBe(2);
  });

  it('does not fold runtime-dependent imported alias expressions', () => {
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue('${$demo.formatName(user.firstName, user.lastName)}');

    expect(compiled.kind).toBe('dynamic');
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
      summary: 'Role: ${user.role}',
    });

    if (compiled.kind !== 'dynamic') {
      throw new Error('Expected dynamic compiled value');
    }

    const state = compiler.createState(compiled);
    const scopeA = createScope({ user: { name: 'Alice', role: 'admin' } });
    const first = compiler.evaluateWithState(compiled, scopeA, env, state);
    const second = compiler.evaluateWithState(
      compiled,
      createScope({ user: { name: 'Alice', role: 'admin' } }),
      env,
      state,
    );

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

  it('falls back to static for strings with invalid ${...} template syntax', () => {
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue('Text with ${...} expressions');

    expect(compiled.kind).toBe('static');
    if (compiled.kind !== 'static') {
      throw new Error('Expected static compiled value');
    }
    expect(compiled.value).toBe('Text with ${...} expressions');
  });

  it('falls back to static for nested objects with invalid expression strings', () => {
    const compiler = createExpressionCompiler();
    const input = {
      config: {
        variables: [
          { label: 'Name', value: 'data.name', type: 'string' },
          { label: 'Order', value: 'data.order.amount', type: 'number' },
        ],
      },
      validTemplate: 'Hello ${name}',
    };
    const compiled = compiler.compileValue(input);

    expect(compiled.kind).toBe('dynamic');
    if (compiled.kind !== 'dynamic') {
      throw new Error('Expected dynamic compiled value');
    }

    const state = compiler.createState(compiled);
    const scope = createScope({ name: 'World' });
    const result = compiler.evaluateWithState(compiled, scope, env, state);

    expect(result.value.config).toEqual(input.config);
    expect((result.value as any).validTemplate).toBe('Hello World');
  });

  it('falls back to static for pure expression with invalid syntax', () => {
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileValue('${...}');

    expect(compiled.kind).toBe('static');
    if (compiled.kind !== 'static') {
      throw new Error('Expected static compiled value');
    }
    expect(compiled.value).toBe('${...}');
  });

  it('calls reportDiagnostic when expression compilation fails', () => {
    const reportDiagnostic = vi.fn();
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileNode('${new X()}', {
      sourcePath: '$.body[0]',
      reportDiagnostic,
    });

    expect(compiled.kind).toBe('static-node');
    expect(reportDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'unhandled-compilation-error',
        message: expect.stringContaining('Expression compilation failed'),
      }),
    );
  });

  it('calls reportDiagnostic when template compilation fails', () => {
    const reportDiagnostic = vi.fn();
    const compiler = createExpressionCompiler();
    const compiled = compiler.compileNode('Hello ${new X()} world', {
      sourcePath: '$.body[1]',
      reportDiagnostic,
    });

    expect(compiled.kind).toBe('static-node');
    expect(reportDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'unhandled-compilation-error',
        message: expect.stringContaining('Template compilation failed'),
      }),
    );
  });

  it('returns error marker in template when segment evaluation fails', () => {
    const onError = vi.fn();
    const compiler = createFormulaCompiler();
    const template = compiler.compileTemplate('Hello ${user.name.first}!');

    const result = template.exec(createScope({ user: null }), {
      ...env,
      monitor: { onError },
    });

    expect(result).toBe('Hello [error]!');
    expect(onError).toHaveBeenCalled();
  });
});
