import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

describe('runtime.getFormStoreDiagnosticsBridge', () => {
  function createRuntime() {
    return createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
  }

  it('exposes a stable bridge that returns an empty owner list before any form is created', () => {
    const runtime = createRuntime();
    const bridge = runtime.getFormStoreDiagnosticsBridge?.();
    expect(bridge).toBeDefined();
    expect(bridge?.listOwners()).toEqual([]);
  });

  it('listOwners reflects forms created via runtime.createFormRuntime', () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({});
    runtime.createFormRuntime({
      id: 'profile-form',
      name: 'profile',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
    });
    runtime.createFormRuntime({
      id: 'security-form',
      name: 'security',
      initialValues: {},
      parentScope: page.scope,
    });

    const owners = runtime.getFormStoreDiagnosticsBridge?.().listOwners() ?? [];
    expect(owners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formId: 'profile-form', formName: 'profile' }),
        expect.objectContaining({ formId: 'security-form', formName: 'security' }),
      ]),
    );
  });

  it('end-to-end: start/session/snapshot captures commits from form.store.setValue', () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
    });

    const bridge = runtime.getFormStoreDiagnosticsBridge!();

    form.store.setValue('username', 'Bob');
    expect(bridge.getSnapshot({ formId: 'profile-form' })).toMatchObject({
      enabled: false,
      commitCount: 0,
    });

    expect(bridge.startSession({ formId: 'profile-form' }, { maxRecentCommits: 3 })).toBe(true);
    form.store.setValue('username', 'Carol');
    form.store.setValue('username', 'Dan');

    const snapshot = bridge.getSnapshot({ formId: 'profile-form' });
    expect(snapshot).toMatchObject({
      enabled: true,
      commitCount: 2,
      droppedCommitCount: 0,
    });
    expect(snapshot?.recentCommits).toHaveLength(2);
    expect(snapshot?.recentCommits[0]).toMatchObject({
      changedPaths: ['username'],
      changedKinds: ['values'],
    });

    bridge.stopSession({ formId: 'profile-form' });
    form.store.setValue('username', 'Eve');
    expect(bridge.getSnapshot({ formId: 'profile-form' })?.commitCount).toBe(2);

    bridge.startSession({ formId: 'profile-form' });
    bridge.clearSession({ formId: 'profile-form' });
    expect(bridge.getSnapshot({ formId: 'profile-form' })).toMatchObject({
      enabled: true,
      commitCount: 0,
      recentCommits: [],
      droppedCommitCount: 0,
    });
  });

  it('returns false for queries against unknown form owners', () => {
    const runtime = createRuntime();
    const bridge = runtime.getFormStoreDiagnosticsBridge!();
    expect(bridge.startSession({ formId: 'missing' })).toBe(false);
    expect(bridge.stopSession({ formId: 'missing' })).toBe(false);
    expect(bridge.clearSession({ formId: 'missing' })).toBe(false);
    expect(bridge.getSnapshot({ formId: 'missing' })).toBeUndefined();
  });

  it('returns false for ambiguous queries when multiple owners exist and no selector is provided', () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({});
    runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: {},
      parentScope: page.scope,
    });
    runtime.createFormRuntime({
      id: 'security-form',
      initialValues: {},
      parentScope: page.scope,
    });

    const bridge = runtime.getFormStoreDiagnosticsBridge!();
    expect(bridge.startSession({})).toBe(false);
    expect(bridge.getSnapshot({})).toBeUndefined();
  });

  it('bounded payload: truncates recentCommits and tracks droppedCommitCount', () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { count: 0 },
      parentScope: page.scope,
    });

    const bridge = runtime.getFormStoreDiagnosticsBridge!();
    bridge.startSession({ formId: 'profile-form' }, { maxRecentCommits: 2 });

    form.store.setValue('count', 1);
    form.store.setValue('count', 2);
    form.store.setValue('count', 3);

    const snapshot = bridge.getSnapshot({ formId: 'profile-form' });
    expect(snapshot?.commitCount).toBe(3);
    expect(snapshot?.droppedCommitCount).toBe(1);
    expect(snapshot?.recentCommits).toHaveLength(2);
    expect(snapshot?.recentCommits.map((commit) => commit.sequence)).toEqual([2, 3]);
  });
});
