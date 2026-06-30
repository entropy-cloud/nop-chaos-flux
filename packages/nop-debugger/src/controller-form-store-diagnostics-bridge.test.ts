import { describe, expect, it } from 'vitest';
import type {
  FormStoreDiagnosticsBridge,
  FormStoreDiagnosticsOptions,
  FormStoreDiagnosticsOwnerQuery,
} from '@nop-chaos/flux-core';
import { createNopDebugger } from './index.js';

function createFakeBridge(): FormStoreDiagnosticsBridge & { _recordings: Record<string, unknown[]> } {
  const recordings: Record<string, unknown[]> = {
    listOwners: [],
    startSession: [],
    stopSession: [],
    clearSession: [],
    getSnapshot: [],
  };

  return {
    _recordings: recordings,
    listOwners() {
      recordings.listOwners.push([]);
      return [
        { formId: 'profile-form', formName: 'profile', scopeId: 'scope-a' },
        { formId: 'security-form', formName: 'security', scopeId: 'scope-b' },
      ];
    },
    startSession(query: FormStoreDiagnosticsOwnerQuery, options?: FormStoreDiagnosticsOptions) {
      recordings.startSession.push({ query, options });
      return true;
    },
    stopSession(query: FormStoreDiagnosticsOwnerQuery) {
      recordings.stopSession.push({ query });
      return true;
    },
    clearSession(query: FormStoreDiagnosticsOwnerQuery) {
      recordings.clearSession.push({ query });
      return true;
    },
    getSnapshot(query: FormStoreDiagnosticsOwnerQuery) {
      recordings.getSnapshot.push({ query });
      return {
        enabled: true,
        commitCount: 1,
        recentCommits: [],
        droppedCommitCount: 0,
      };
    },
  } as unknown as FormStoreDiagnosticsBridge & { _recordings: Record<string, unknown[]> };
}

describe('debugger automation form-store diagnostics bridge', () => {
  it('returns an empty owner list and undefined snapshot when runtime lacks the bridge', () => {
    const ctrl = createNopDebugger({ id: 'no-bridge', enabled: true });
    ctrl.setRuntime({ runtimeId: 'rt-empty' } as never);

    expect(ctrl.listFormStoreDiagnosticsOwners()).toEqual([]);
    expect(ctrl.startFormStoreDiagnosticsSession({ formId: 'x' })).toBe(false);
    expect(ctrl.stopFormStoreDiagnosticsSession({ formId: 'x' })).toBe(false);
    expect(ctrl.clearFormStoreDiagnosticsSession({ formId: 'x' })).toBe(false);
    expect(ctrl.getFormStoreDiagnosticsSnapshot({ formId: 'x' })).toBeUndefined();

    expect(ctrl.automation.listFormStoreDiagnosticsOwners()).toEqual([]);
    expect(ctrl.automation.startFormStoreDiagnosticsSession({ formId: 'x' })).toBe(false);
    expect(ctrl.automation.stopFormStoreDiagnosticsSession({ formId: 'x' })).toBe(false);
    expect(ctrl.automation.clearFormStoreDiagnosticsSession({ formId: 'x' })).toBe(false);
    expect(ctrl.automation.getFormStoreDiagnosticsSnapshot({ formId: 'x' })).toBeUndefined();
  });

  it('forwards bridge calls from controller and automation to the runtime-owned bridge', () => {
    const bridge = createFakeBridge();
    const ctrl = createNopDebugger({ id: 'bridge-fwd', enabled: true });
    ctrl.setRuntime({
      runtimeId: 'rt-bridge',
      getFormStoreDiagnosticsBridge: () => bridge,
    } as never);

    expect(ctrl.listFormStoreDiagnosticsOwners()).toEqual([
      { formId: 'profile-form', formName: 'profile', scopeId: 'scope-a' },
      { formId: 'security-form', formName: 'security', scopeId: 'scope-b' },
    ]);
    expect(
      ctrl.startFormStoreDiagnosticsSession({ formId: 'profile-form' }, { maxRecentCommits: 5 }),
    ).toBe(true);
    expect(ctrl.stopFormStoreDiagnosticsSession({ formId: 'profile-form' })).toBe(true);
    expect(ctrl.clearFormStoreDiagnosticsSession({ formId: 'profile-form' })).toBe(true);
    expect(ctrl.getFormStoreDiagnosticsSnapshot({ formId: 'profile-form' })).toBeDefined();

    expect(bridge._recordings.listOwners).toHaveLength(1);
    expect(bridge._recordings.startSession).toEqual([
      { query: { formId: 'profile-form' }, options: { maxRecentCommits: 5 } },
    ]);
    expect(bridge._recordings.stopSession).toEqual([{ query: { formId: 'profile-form' } }]);
    expect(bridge._recordings.clearSession).toEqual([{ query: { formId: 'profile-form' } }]);
    expect(bridge._recordings.getSnapshot).toEqual([{ query: { formId: 'profile-form' } }]);

    expect(ctrl.automation.listFormStoreDiagnosticsOwners()).toEqual([
      { formId: 'profile-form', formName: 'profile', scopeId: 'scope-a' },
      { formId: 'security-form', formName: 'security', scopeId: 'scope-b' },
    ]);
    expect(
      ctrl.automation.startFormStoreDiagnosticsSession(
        { scopeId: 'scope-b' },
        { maxRecentCommits: 3 },
      ),
    ).toBe(true);
    expect(ctrl.automation.stopFormStoreDiagnosticsSession({ scopeId: 'scope-b' })).toBe(true);
    expect(ctrl.automation.clearFormStoreDiagnosticsSession({ scopeId: 'scope-b' })).toBe(true);
    expect(ctrl.automation.getFormStoreDiagnosticsSnapshot({ scopeId: 'scope-b' })).toBeDefined();

    expect(bridge._recordings.startSession).toHaveLength(2);
    expect(bridge._recordings.startSession[1]).toEqual({
      query: { scopeId: 'scope-b' },
      options: { maxRecentCommits: 3 },
    });
  });

  it('does not mutate the bridge snapshot returned to the consumer (defensive copy semantics)', () => {
    const ctrl = createNopDebugger({ id: 'snapshot-immutable', enabled: true });
    const retained: any = {
      enabled: true,
      commitCount: 1,
      recentCommits: [
        {
          timestamp: 1,
          sequence: 1,
          ownerId: 'form-store',
          changedPaths: ['username'],
          changedKinds: ['values'],
        },
      ],
      droppedCommitCount: 0,
    };
    ctrl.setRuntime({
      runtimeId: 'rt-immutable',
      getFormStoreDiagnosticsBridge: () => ({
        listOwners: () => [{ formId: 'profile-form', scopeId: 'scope-a' }],
        startSession: () => true,
        stopSession: () => true,
        clearSession: () => true,
        getSnapshot: () => ({ ...retained, recentCommits: retained.recentCommits.slice() }),
      }),
    } as never);

    const first = ctrl.automation.getFormStoreDiagnosticsSnapshot({ formId: 'profile-form' });
    const second = ctrl.automation.getFormStoreDiagnosticsSnapshot({ formId: 'profile-form' });
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.recentCommits).not.toBe(second?.recentCommits);
    expect(first?.recentCommits).toEqual(second?.recentCommits);
  });

  it('surfaces a stable automation api shape including the new bridge methods', () => {
    const ctrl = createNopDebugger({ id: 'api-shape', enabled: true });
    const api = ctrl.automation;
    expect(typeof api.listFormStoreDiagnosticsOwners).toBe('function');
    expect(typeof api.startFormStoreDiagnosticsSession).toBe('function');
    expect(typeof api.stopFormStoreDiagnosticsSession).toBe('function');
    expect(typeof api.clearFormStoreDiagnosticsSession).toBe('function');
    expect(typeof api.getFormStoreDiagnosticsSnapshot).toBe('function');
  });
});
