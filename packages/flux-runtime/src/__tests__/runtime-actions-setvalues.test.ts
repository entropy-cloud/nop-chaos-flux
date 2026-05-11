import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime', () => {
  it('updates multiple form values through setValues action with bounded commits', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', role: 'viewer' },
      parentScope: page.scope,
      page,
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    const result = await runtime.dispatch(
      {
        action: 'setValues',
        formId: 'profile-form',
        args: {
          values: {
            username: 'Bob',
            role: 'admin',
          },
        },
      },
      {
        runtime,
        scope: form.scope,
        page,
        form,
      },
    );

    unsubscribe();

    expect(result).toMatchObject({
      ok: true,
      data: {
        username: 'Bob',
        role: 'admin',
      },
    });
    expect(form.scope.get('username')).toBe('Bob');
    expect(form.scope.get('role')).toBe('admin');
    expect(commits).toBeLessThanOrEqual(1);
  });

  it('matches chained form.setValue updates with fewer commits', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', role: 'viewer' },
      parentScope: page.scope,
      page,
    });

    let chainedCommits = 0;
    const unsubscribeChained = form.store.subscribe(() => {
      chainedCommits += 1;
    });

    form.setValue('username', 'Bob');
    form.setValue('role', 'admin');

    unsubscribeChained();

    const chainedSnapshot = form.store.getState();

    form.reset({ username: 'Alice', role: 'viewer' });

    let batchedCommits = 0;
    const unsubscribeBatched = form.store.subscribe(() => {
      batchedCommits += 1;
    });

    form.setValues({
      username: 'Bob',
      role: 'admin',
    });

    unsubscribeBatched();

    const batchedSnapshot = form.store.getState();

    expect(chainedSnapshot.values).toEqual(batchedSnapshot.values);
    expect(chainedSnapshot.fieldStates).toEqual(batchedSnapshot.fieldStates);
    expect(batchedCommits).toBeLessThan(chainedCommits);
  });
});
