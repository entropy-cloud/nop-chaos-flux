import { describe, expect, it, vi } from 'vitest';
import { createFormStore } from '../form-store.js';
import { createOwnedFormStore } from '../form-store-owned.js';

describe('createFormStore subscribeToPaths', () => {
  it('notifies only listeners whose paths overlap the changed value paths', () => {
    const store = createFormStore({
      profile: { email: 'a@example.com', name: 'Alice' },
      settings: { theme: 'light' },
    });
    const profileListener = vi.fn();
    const settingsListener = vi.fn();

    store.subscribeToPaths(['profile.email', 'profile.name'], profileListener);
    store.subscribeToPaths(['settings.theme'], settingsListener);

    store.setValue('profile.email', 'b@example.com');

    expect(profileListener).toHaveBeenCalledTimes(1);
    expect(settingsListener).not.toHaveBeenCalled();
  });

  it('deduplicates listener calls when one update changes multiple subscribed paths', () => {
    const store = createFormStore({
      profile: { email: 'a@example.com', name: 'Alice' },
    });
    const listener = vi.fn();

    store.subscribeToPaths(['profile.email', 'profile.name'], listener);
    store.setValues({
      profile: { email: 'b@example.com', name: 'Bob' },
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies exact, ancestor, and descendant listeners for one changed path', () => {
    const store = createFormStore({
      profile: { email: 'a@example.com', name: 'Alice' },
    });
    const exactListener = vi.fn();
    const ancestorListener = vi.fn();
    const descendantListener = vi.fn();

    store.subscribeToPath('profile.email', exactListener);
    store.subscribeToPath('profile', ancestorListener);
    store.subscribeToPath('profile.email.localPart', descendantListener);

    store.setValue('profile.email', 'b@example.com');

    expect(exactListener).toHaveBeenCalledTimes(1);
    expect(ancestorListener).toHaveBeenCalledTimes(1);
    expect(descendantListener).toHaveBeenCalledTimes(1);
  });

  it('does not notify descendant listeners when an unrelated sibling path changes', () => {
    const store = createFormStore({
      profile: { email: 'a@example.com', name: 'Alice' },
    });
    const descendantListener = vi.fn();

    store.subscribeToPath('profile.email.localPart', descendantListener);

    store.setValue('profile.name', 'Bob');

    expect(descendantListener).not.toHaveBeenCalled();
  });

  it('keeps diagnostics disabled by default and records commits only inside an explicit session', () => {
    const store = createFormStore({ profile: { email: 'a@example.com' } });

    store.setValue('profile.email', 'b@example.com');
    expect(store.getDiagnosticsSnapshot()).toMatchObject({ enabled: false, commitCount: 0 });

    store.startDiagnosticsSession();
    store.setValue('profile.email', 'c@example.com');

    expect(store.getDiagnosticsSnapshot()).toMatchObject({
      enabled: true,
      commitCount: 1,
      droppedCommitCount: 0,
    });
    expect(store.getDiagnosticsSnapshot().recentCommits[0]).toMatchObject({
      ownerId: 'form-store',
      changedKinds: ['values'],
      changedPaths: ['profile.email'],
    });
  });

  it('supports stop and clear session controls', () => {
    const store = createFormStore({ profile: { email: 'a@example.com' } });

    store.startDiagnosticsSession();
    store.setValue('profile.email', 'b@example.com');
    expect(store.getDiagnosticsSnapshot().commitCount).toBe(1);

    store.stopDiagnosticsSession();
    store.setValue('profile.email', 'c@example.com');
    expect(store.getDiagnosticsSnapshot()).toMatchObject({
      enabled: false,
      commitCount: 1,
      recentCommits: [expect.objectContaining({ changedPaths: ['profile.email'] })],
    });

    store.startDiagnosticsSession();
    store.clearDiagnosticsSession();
    expect(store.getDiagnosticsSnapshot()).toEqual({
      enabled: true,
      commitCount: 0,
      recentCommits: [],
      droppedCommitCount: 0,
    });
  });

  it('keeps bounded recent commit retention and tracks dropped commit count', () => {
    const store = createFormStore({ count: 0 });

    store.startDiagnosticsSession({ maxRecentCommits: 2 });
    store.setValue('count', 1);
    store.setValue('count', 2);
    store.setValue('count', 3);

    const snapshot = store.getDiagnosticsSnapshot();
    expect(snapshot.commitCount).toBe(3);
    expect(snapshot.droppedCommitCount).toBe(1);
    expect(snapshot.recentCommits).toHaveLength(2);
    expect(snapshot.recentCommits.map((commit) => commit.sequence)).toEqual([2, 3]);
  });

  it('records one mixed commit for batch updates', () => {
    const store = createFormStore({ profile: { email: 'a@example.com' } });

    store.startDiagnosticsSession();
    store.batchUpdate({
      values: { profile: { email: 'b@example.com' } },
      fieldStates: { 'profile.email': { touched: true } },
      submitting: true,
    });

    const snapshot = store.getDiagnosticsSnapshot();
    expect(snapshot.commitCount).toBe(1);
    expect(snapshot.recentCommits[0]).toMatchObject({
      changedKinds: ['values', 'fieldStates', 'submitting'],
    });
    expect(snapshot.recentCommits[0]?.changedPaths).toEqual(
      expect.arrayContaining(['profile.email', '*']),
    );
  });

  it('translates owned-store diagnostics field-state paths into owner-relative coordinates', () => {
    const baseStore = createFormStore({ profile: { email: 'a@example.com' } });
    const ownedStore = createOwnedFormStore(baseStore, 'detail-owner');

    ownedStore.startDiagnosticsSession();
    ownedStore.setFieldState('profile.email', { touched: true });

    expect(ownedStore.getDiagnosticsSnapshot()).toMatchObject({
      enabled: true,
      commitCount: 1,
      recentCommits: [
        {
          ownerId: 'detail-owner',
          changedKinds: ['fieldStates'],
          changedPaths: ['profile.email'],
        },
      ],
    });
  });
});
