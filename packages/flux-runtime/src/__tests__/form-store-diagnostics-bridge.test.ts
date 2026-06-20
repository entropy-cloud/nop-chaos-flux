import { describe, expect, it } from 'vitest';
import type { FormRuntime, FormStoreDiagnosticsOwnerQuery } from '@nop-chaos/flux-core';
import {
  createFormStoreDiagnosticsBridge,
  matchFormStoreDiagnosticsOwnerForTesting,
  pickFormStoreDiagnosticsOwnerForTesting,
} from '../form-store-diagnostics-bridge.js';

function createFormStub(input: { id: string; name?: string; scopeId: string }): FormRuntime {
  const commits: Array<{
    changedPaths: readonly string[];
    changedKinds: readonly string[];
  }> = [];
  let enabled = false;
  let sequence = 0;
  let commitCount = 0;
  let droppedCommitCount = 0;
  const recentCommits: any[] = [];

  return {
    id: input.id,
    name: input.name,
    scopeId: input.scopeId,
    lifecycleState: 'active',
    modelGeneration: 1,
    store: {
      startDiagnosticsSession(options?: { maxRecentCommits?: number }) {
        enabled = true;
        if (options?.maxRecentCommits !== undefined) {
          // Test stub accepts but does not need to enforce.
        }
      },
      stopDiagnosticsSession() {
        enabled = false;
      },
      clearDiagnosticsSession() {
        sequence = 0;
        commitCount = 0;
        droppedCommitCount = 0;
        recentCommits.length = 0;
      },
      getDiagnosticsSnapshot() {
        return {
          enabled,
          commitCount,
          recentCommits: recentCommits.slice(),
          droppedCommitCount,
        };
      },
      // Below methods are not used by the bridge but required by the type.
      getState: () => ({ values: {}, fieldStates: {}, submitting: false, submitAttempted: false }),
      subscribe: () => () => {},
      subscribeToPath: () => () => {},
      subscribeToPaths: () => () => {},
      subscribeToSubmitting: () => () => {},
      getPathState: () => ({
        errors: undefined,
        validating: false,
        touched: false,
        dirty: false,
        visited: false,
      }),
      getFieldState: () => undefined,
      setFieldState: () => {},
      setValues: () => {},
      setValue: (path: string) => {
        if (!enabled) return;
        sequence += 1;
        commitCount += 1;
        recentCommits.push({
          timestamp: Date.now(),
          sequence,
          ownerId: input.id,
          changedPaths: [path],
          changedKinds: ['values'],
        });
        commits.push({ changedPaths: [path], changedKinds: ['values'] });
      },
      setPathErrors: () => {},
      setValidating: () => {},
      setTouched: () => {},
      setDirty: () => {},
      setVisited: () => {},
      setSubmitting: () => {},
      setSubmitAttempted: () => {},
      batchUpdate: () => {},
    },
  } as unknown as FormRuntime;
}

describe('createFormStoreDiagnosticsBridge', () => {
  it('listOwners returns formId/formName/scopeId for each registered form', () => {
    const formA = createFormStub({ id: 'form-a', name: 'profile', scopeId: 'scope-a' });
    const formB = createFormStub({ id: 'form-b', name: 'security', scopeId: 'scope-b' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([formA, formB]));

    const owners = bridge.listOwners();
    expect(owners).toEqual(
      expect.arrayContaining([
        { formId: 'form-a', formName: 'profile', scopeId: 'scope-a' },
        { formId: 'form-b', formName: 'security', scopeId: 'scope-b' },
      ]),
    );
  });

  it('returns false and does not throw when no owner matches the query', () => {
    const form = createFormStub({ id: 'form-a', name: 'profile', scopeId: 'scope-a' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([form]));

    expect(bridge.startSession({ formId: 'missing' })).toBe(false);
    expect(bridge.stopSession({ formId: 'missing' })).toBe(false);
    expect(bridge.clearSession({ formId: 'missing' })).toBe(false);
    expect(bridge.getSnapshot({ formId: 'missing' })).toBeUndefined();
  });

  it('returns false and does not mutate state when no query is provided but multiple owners exist', () => {
    const formA = createFormStub({ id: 'form-a', scopeId: 'scope-a' });
    const formB = createFormStub({ id: 'form-b', scopeId: 'scope-b' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([formA, formB]));

    expect(bridge.startSession({})).toBe(false);
    expect(bridge.getSnapshot({})).toBeUndefined();
  });

  it('forwards startSession options to the underlying FormStoreApi session', () => {
    const form = createFormStub({ id: 'form-a', scopeId: 'scope-a' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([form]));

    expect(bridge.startSession({ formId: 'form-a' }, { maxRecentCommits: 5 })).toBe(true);
    expect(bridge.getSnapshot({ formId: 'form-a' })?.enabled).toBe(true);
  });

  it('start/stop/clear/snapshot route to the same owner when selected consistently', () => {
    const form = createFormStub({ id: 'form-a', scopeId: 'scope-a' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([form]));

    bridge.startSession({ formId: 'form-a' });
    form.store.setValue('profile.email', 'a@example.com');
    form.store.setValue('profile.email', 'b@example.com');
    expect(bridge.getSnapshot({ formId: 'form-a' })?.commitCount).toBe(2);

    bridge.stopSession({ formId: 'form-a' });
    form.store.setValue('profile.email', 'c@example.com');
    expect(bridge.getSnapshot({ formId: 'form-a' })?.enabled).toBe(false);
    expect(bridge.getSnapshot({ formId: 'form-a' })?.commitCount).toBe(2);

    bridge.startSession({ formId: 'form-a' });
    bridge.clearSession({ formId: 'form-a' });
    expect(bridge.getSnapshot({ formId: 'form-a' })).toMatchObject({
      enabled: true,
      commitCount: 0,
      recentCommits: [],
      droppedCommitCount: 0,
    });
  });

  it('selects owner via formId, formName, or scopeId independently', () => {
    const formA = createFormStub({ id: 'form-a', name: 'profile', scopeId: 'scope-a' });
    const formB = createFormStub({ id: 'form-b', name: 'security', scopeId: 'scope-b' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([formA, formB]));

    expect(bridge.startSession({ formId: 'form-b' })).toBe(true);
    expect(bridge.getSnapshot({ formId: 'form-b' })?.enabled).toBe(true);
    expect(bridge.getSnapshot({ formId: 'form-a' })?.enabled).toBe(false);

    bridge.stopSession({ formId: 'form-b' });
    expect(bridge.startSession({ formName: 'profile' })).toBe(true);
    expect(bridge.getSnapshot({ scopeId: 'scope-a' })?.enabled).toBe(true);

    bridge.stopSession({ formName: 'profile' });
    expect(bridge.startSession({ scopeId: 'scope-b' })).toBe(true);
    expect(bridge.getSnapshot({ formName: 'security' })?.enabled).toBe(true);
  });

  it('returns a fresh snapshot array per call (consumer cannot mutate retained history)', () => {
    const form = createFormStub({ id: 'form-a', scopeId: 'scope-a' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([form]));

    bridge.startSession({ formId: 'form-a' });
    form.store.setValue('count', 1);

    const first = bridge.getSnapshot({ formId: 'form-a' });
    const second = bridge.getSnapshot({ formId: 'form-a' });
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.recentCommits).not.toBe(second?.recentCommits);
    expect(first?.recentCommits).toEqual(second?.recentCommits);
  });

  it('selects sole owner when query is empty', () => {
    const form = createFormStub({ id: 'form-a', scopeId: 'scope-a' });
    const bridge = createFormStoreDiagnosticsBridge(new Set([form]));

    expect(bridge.startSession({})).toBe(true);
    expect(bridge.getSnapshot({})?.enabled).toBe(true);
  });
});

describe('createFormStoreDiagnosticsBridge owner matching helpers', () => {
  it('matchFormStoreDiagnosticsOwnerForTesting returns true for empty query', () => {
    const form = createFormStub({ id: 'form-a', name: 'profile', scopeId: 'scope-a' });
    expect(matchFormStoreDiagnosticsOwnerForTesting(form, {})).toBe(true);
    expect(matchFormStoreDiagnosticsOwnerForTesting(form, undefined)).toBe(true);
  });

  it('matchFormStoreDiagnosticsOwnerForTesting returns true for any matching selector', () => {
    const form = createFormStub({ id: 'form-a', name: 'profile', scopeId: 'scope-a' });
    expect(
      matchFormStoreDiagnosticsOwnerForTesting(form, { formId: 'form-a' } as FormStoreDiagnosticsOwnerQuery),
    ).toBe(true);
    expect(
      matchFormStoreDiagnosticsOwnerForTesting(form, {
        formName: 'profile',
      } as FormStoreDiagnosticsOwnerQuery),
    ).toBe(true);
    expect(
      matchFormStoreDiagnosticsOwnerForTesting(form, {
        scopeId: 'scope-a',
      } as FormStoreDiagnosticsOwnerQuery),
    ).toBe(true);
  });

  it('matchFormStoreDiagnosticsOwnerForTesting returns false when no selector matches', () => {
    const form = createFormStub({ id: 'form-a', name: 'profile', scopeId: 'scope-a' });
    expect(matchFormStoreDiagnosticsOwnerForTesting(form, { formId: 'other' })).toBe(false);
  });

  it('pickFormStoreDiagnosticsOwnerForTesting returns undefined for empty query and multiple forms', () => {
    const formA = createFormStub({ id: 'form-a', scopeId: 'scope-a' });
    const formB = createFormStub({ id: 'form-b', scopeId: 'scope-b' });
    expect(pickFormStoreDiagnosticsOwnerForTesting(new Set([formA, formB]), undefined)).toBeUndefined();
  });
});
