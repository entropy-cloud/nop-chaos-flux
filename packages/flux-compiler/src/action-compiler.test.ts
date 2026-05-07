import { describe, expect, it } from 'vitest';
import type { ActionSchema, ExpressionCompiler } from '@nop-chaos/flux-core';
import { compileAction, compileActions } from './action-compiler.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

function createCompiler(): ExpressionCompiler {
  return createExpressionCompiler(createFormulaCompiler());
}

describe('compileAction', () => {
  it('compiles a simple action with args', () => {
    const compiler = createCompiler();
    const result = compileAction(
      { action: 'setValue', args: { path: 'name', value: 'test' } } as ActionSchema,
      compiler,
    );

    expect(result.isFullyStatic).toBe(true);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].action).toBe('setValue');
    expect((result.nodes[0].payload.args as any)?.isStatic).toBe(true);
    expect((result.nodes[0].payload.args as any)?.value).toEqual({ path: 'name', value: 'test' });
  });

  it('compiles an action with expression args as dynamic', () => {
    const compiler = createCompiler();
    const result = compileAction(
      { action: 'setValue', args: { path: 'name', value: '${userInput}' } } as ActionSchema,
      compiler,
    );

    expect(result.isFullyStatic).toBe(false);
    expect((result.nodes[0].payload.args as any)?.isStatic).toBe(false);
  });

  it('returns empty payload when no args or legacy payload', () => {
    const compiler = createCompiler();
    const result = compileAction({ action: 'closeDialog' } as ActionSchema, compiler);

    expect(result.nodes[0].payload.args).toBeUndefined();
  });

  it('uses explicit args when provided', () => {
    const compiler = createCompiler();
    const withArgs = compileAction(
      { action: 'ajax', args: { url: '/explicit' } } as ActionSchema,
      compiler,
    );
    expect((withArgs.nodes[0].payload.args as any)?.value).toEqual({ url: '/explicit' });

    const withoutArgs = compileAction(
      { action: 'ajax', api: { url: '/legacy' } } as ActionSchema,
      compiler,
    );
    expect(withoutArgs.nodes[0].payload.args).toBeUndefined();
  });

  it('compiles targeting fields', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'setValue',
        args: { path: 'name', value: 'test' },
        targetId: 'target-1',
        componentId: 'comp-1',
        componentName: 'myForm',
        formId: 'form-1',
        dialogId: 'dialog-1',
        surfaceId: 'surface-1',
      } as unknown as ActionSchema,
      compiler,
    );

    const targeting = result.nodes[0].targeting;
    expect(targeting.targetId).toBe('target-1');
    expect(targeting.componentId).toBe('comp-1');
    expect(targeting.componentName).toBe('myForm');
    expect(targeting.formId).toBe('form-1');
    expect(targeting.dialogId).toBe('dialog-1');
    expect(targeting.surfaceId).toBe('surface-1');
  });

  it('compiles control fields', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'ajax',
        args: { url: '/api' },
        timeout: 5000,
        continueOnError: true,
      } as unknown as ActionSchema,
      compiler,
    );

    const control = result.nodes[0].control;
    expect(control.timeout).toBe(5000);
    expect(control.continueOnError).toBe(true);
  });

  it('compiles when condition as dynamic', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'setValue',
        args: { path: 'name', value: 'test' },
        when: '${isEnabled}',
      } as unknown as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].when).toBeDefined();
    expect(result.nodes[0].when?.isStatic).toBe(false);
    expect(result.isFullyStatic).toBe(false);
  });

  it('compiles static when condition', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'setValue',
        args: { path: 'name', value: 'test' },
        when: 'true',
      } as unknown as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].when?.isStatic).toBe(true);
    expect(result.isFullyStatic).toBe(true);
  });

  it('compiles then branch as single action', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'ajax',
        args: { url: '/api' },
        then: { action: 'navigate', args: { url: '/success' } },
      } as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].then).toHaveLength(1);
    expect(result.nodes[0].then?.[0].action).toBe('navigate');
  });

  it('compiles then branch as array', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'ajax',
        args: { url: '/api' },
        then: [{ action: 'navigate', args: { url: '/success' } }, { action: 'closeDialog' }],
      } as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].then).toHaveLength(2);
    expect(result.nodes[0].then?.[0].action).toBe('navigate');
    expect(result.nodes[0].then?.[1].action).toBe('closeDialog');
  });

  it('compiles onError branch as single action', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'ajax',
        args: { url: '/api' },
        onError: { action: 'alert', args: { message: 'Failed' } },
      } as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].onError).toHaveLength(1);
    expect(result.nodes[0].onError?.[0].action).toBe('alert');
  });

  it('compiles onError branch as array', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'ajax',
        args: { url: '/api' },
        onError: [{ action: 'alert', args: { message: 'Error' } }, { action: 'closeDialog' }],
      } as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].onError).toHaveLength(2);
  });

  it('compiles onSettled branch as single action', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'ajax',
        args: { url: '/api' },
        onSettled: { action: 'clearLoading' },
      } as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].onSettled).toHaveLength(1);
    expect(result.nodes[0].onSettled?.[0].action).toBe('clearLoading');
  });

  it('compiles onSettled branch as array', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'ajax',
        args: { url: '/api' },
        onSettled: [{ action: 'clearLoading' }, { action: 'logEvent' }],
      } as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].onSettled).toHaveLength(2);
  });

  it('compiles parallel branches', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'parallel',
        parallel: [
          { action: 'fetchA', args: { url: '/a' } },
          { action: 'fetchB', args: { url: '/b' } },
        ],
      } as ActionSchema,
      compiler,
    );

    expect(result.nodes[0].parallel).toHaveLength(2);
    expect(result.nodes[0].parallel?.[0].action).toBe('fetchA');
    expect(result.nodes[0].parallel?.[1].action).toBe('fetchB');
  });

  it('sets sourcePath on compiled nodes', () => {
    const compiler = createCompiler();
    const result = compileAction({ action: 'test' } as ActionSchema, compiler, {
      basePath: '$.onClick',
    });

    expect(result.nodes[0].sourcePath).toBe('$.onClick');
  });

  it('sets sourcePath for then branches', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'test',
        then: [{ action: 'next' }],
      } as ActionSchema,
      compiler,
      { basePath: '$.onClick' },
    );

    expect(result.nodes[0].then?.[0].sourcePath).toBe('$.onClick.then[0]');
  });

  it('sets sourcePath for parallel branches', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'test',
        parallel: [{ action: 'p1' }, { action: 'p2' }],
      } as ActionSchema,
      compiler,
      { basePath: '$' },
    );

    expect(result.nodes[0].parallel?.[0].sourcePath).toBe('$.parallel[0]');
    expect(result.nodes[0].parallel?.[1].sourcePath).toBe('$.parallel[1]');
  });

  it('isFullyStatic is false when then branch is dynamic', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'test',
        args: { path: 'x' },
        then: [{ action: 'test', args: { val: '${dynamic}' } }],
      } as ActionSchema,
      compiler,
    );

    expect(result.isFullyStatic).toBe(false);
  });

  it('isFullyStatic is false when onError branch is dynamic', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'test',
        args: { path: 'x' },
        onError: [{ action: 'test', args: { val: '${dynamic}' } }],
      } as ActionSchema,
      compiler,
    );

    expect(result.isFullyStatic).toBe(false);
  });

  it('isFullyStatic is false when onSettled branch is dynamic', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'test',
        args: { path: 'x' },
        onSettled: [{ action: 'test', args: { val: '${dynamic}' } }],
      } as ActionSchema,
      compiler,
    );

    expect(result.isFullyStatic).toBe(false);
  });

  it('isFullyStatic is false when parallel branch is dynamic', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'test',
        args: { path: 'x' },
        parallel: [{ action: 'test', args: { val: '${dynamic}' } }],
      } as ActionSchema,
      compiler,
    );

    expect(result.isFullyStatic).toBe(false);
  });

  it('isFullyStatic is true when all branches are static', () => {
    const compiler = createCompiler();
    const result = compileAction(
      {
        action: 'test',
        args: { path: 'x' },
        then: [{ action: 'next', args: { step: 1 } }],
        onError: [{ action: 'error' }],
        onSettled: [{ action: 'cleanup' }],
      } as ActionSchema,
      compiler,
    );

    expect(result.isFullyStatic).toBe(true);
  });

  it('stores source on compiled node', () => {
    const compiler = createCompiler();
    const schema: ActionSchema = { action: 'test', args: { a: 1 } };
    const result = compileAction(schema, compiler);

    expect(result.nodes[0].source).toBe(schema);
  });
});

describe('compileActions', () => {
  it('compiles a single action schema (not array)', () => {
    const compiler = createCompiler();
    const result = compileActions({ action: 'test', args: { a: 1 } } as ActionSchema, compiler);

    expect(result.nodes).toHaveLength(1);
    expect(result.isFullyStatic).toBe(true);
  });

  it('compiles an array of action schemas', () => {
    const compiler = createCompiler();
    const result = compileActions(
      [
        { action: 'test', args: { a: 1 } },
        { action: 'other', args: { b: 2 } },
      ] as ActionSchema[],
      compiler,
    );

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].sourcePath).toBe('$[0]');
    expect(result.nodes[1].sourcePath).toBe('$[1]');
  });

  it('isFullyStatic is false if any node is dynamic', () => {
    const compiler = createCompiler();
    const result = compileActions(
      [
        { action: 'static', args: { a: 1 } },
        { action: 'dynamic', args: { b: '${val}' } },
      ] as ActionSchema[],
      compiler,
    );

    expect(result.isFullyStatic).toBe(false);
  });

  it('isFullyStatic is true if all nodes are static', () => {
    const compiler = createCompiler();
    const result = compileActions(
      [
        { action: 'static1', args: { a: 1 } },
        { action: 'static2', args: { b: 2 } },
      ] as ActionSchema[],
      compiler,
    );

    expect(result.isFullyStatic).toBe(true);
  });

  it('uses basePath for all nodes', () => {
    const compiler = createCompiler();
    const result = compileActions({ action: 'test' } as ActionSchema, compiler, {
      basePath: '$.events.onClick',
    });

    expect(result.nodes[0].sourcePath).toBe('$.events.onClick[0]');
  });
});
