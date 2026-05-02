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
});
