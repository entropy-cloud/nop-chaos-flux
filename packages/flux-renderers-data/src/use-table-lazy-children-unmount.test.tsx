import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

const stateWriteCounter = vi.hoisted(() => ({ calls: 0 }));

vi.mock('react', async () => {
  const actual = (await import('react')) as typeof import('react');
  const originalUseState = actual.useState;
  return {
    ...actual,
    useState: (init: unknown) => {
      const [value, set] = originalUseState(init as never);
      const wrapped = (action: unknown) => {
        stateWriteCounter.calls += 1;
        return set(action as never);
      };
      return [value, wrapped] as unknown as [unknown, (action: unknown) => void];
    },
  };
});

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

import { useTableLazyChildren } from './table-renderer/use-table-lazy-children.js';

function makeHelpers() {
  return {
    dispatch: vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, data: [] }), 20)),
    ),
    createScope: vi.fn(() => ({ id: 'lazy-scope' })),
    disposeScope: vi.fn(),
  } as never;
}

beforeEach(() => {
  cleanup();
  stateWriteCounter.calls = 0;
});

afterEach(() => {
  cleanup();
});

// Plan 862 L9: after unmount, a late lazy-children response must not attempt
// a state write on the unmounted fiber.
describe('useTableLazyChildren unmount guard (plan 862 L9)', () => {
  it('late dispatch resolution after unmount performs no state write', async () => {
    const helpers = makeHelpers();
    const childrenSource = { actionType: 'fetch', options: {} } as never;

    const { result, unmount } = renderHook(() => useTableLazyChildren({ childrenSource, helpers }));
    result.current.loadChildren('row-1', {});

    unmount();
    const callsAtUnmount = stateWriteCounter.calls;

    await new Promise((r) => setTimeout(r, 60));
    expect(stateWriteCounter.calls).toBe(callsAtUnmount);
  });
});
