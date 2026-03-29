import { describe, expect, it } from 'vitest';
import type { ApiObject, ScopeRef } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      setSnapshot: () => {},
      subscribe: () => () => {}
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    read: () => ({})
  };
}

describe('FormRuntime.submit() concurrent submission bug', () => {
  it('should not allow concurrent submissions to execute two API calls', async () => {
    let apiCallCount = 0;
    let resolveApi: (() => void) | undefined;

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {},
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => {
        apiCallCount++;
        await new Promise<void>((resolve) => {
          resolveApi = resolve;
        });
        return { ok: true, data: {} };
      }
    });

    const api: ApiObject = { url: '/api/submit', method: 'post' };

    const first = form.submit(api);
    const second = form.submit(api);

    await new Promise<void>((resolve) => {
      const check = () => {
        if (apiCallCount >= 1) {
          resolve();
        } else {
          setTimeout(check, 0);
        }
      };
      check();
    });

    expect(apiCallCount).toBe(1);

    await expect(second).resolves.toMatchObject({
      ok: false,
      cancelled: true,
      error: expect.any(Error)
    });
    expect(form.store.getState().submitting).toBe(true);

    resolveApi?.();

    await expect(first).resolves.toMatchObject({ ok: true, data: {} });
    expect(form.store.getState().submitting).toBe(false);
  });
});

