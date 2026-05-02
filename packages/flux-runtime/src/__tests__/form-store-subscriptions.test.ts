import { describe, expect, it, vi } from 'vitest';
import { createFormStore } from '../form-store';

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
});
