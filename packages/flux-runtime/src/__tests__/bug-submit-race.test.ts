import { describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'root', kind: 'replace' as const }),
      setSnapshot: () => {},
      subscribe: () => () => {},
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {},
  };
}

describe('FormRuntime.submit() concurrent submission bug', () => {
  it('should not allow concurrent submissions to execute two API calls', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {},
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    const first = form.submit();
    const second = form.submit();

    await expect(second).resolves.toMatchObject({
      ok: false,
      cancelled: true,
      error: expect.any(Error),
    });

    await expect(first).resolves.toMatchObject({ ok: true });
    expect(form.store.getState().submitting).toBe(false);
  });
});
