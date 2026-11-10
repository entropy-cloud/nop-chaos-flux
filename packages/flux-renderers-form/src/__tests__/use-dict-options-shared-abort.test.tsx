import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererEnv: vi.fn(),
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

import { useRendererEnv } from '@nop-chaos/flux-react';
import {
  useDictOptions,
  __inFlightDictLoadsForTests,
} from '../renderers/use-dict-options.js';

function abortAwareLoadDict(delayMs: number) {
  return vi.fn(
    (_name: string, signal?: AbortSignal) =>
      new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
        setTimeout(() => resolve({ name: 'role', options: [{ label: 'Admin', value: 'admin' }] }), delayMs);
      }),
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('plan 862 L1: shared dict load survives one consumer aborting', () => {
  it('two consumers of the same dict: unmounting one still delivers options to the other', async () => {
    const loadDict = abortAwareLoadDict(20);
    vi.mocked(useRendererEnv).mockReturnValue({ loadDict } as never);

    const a = renderHook(() => useDictOptions('role'));
    const b = renderHook(() => useDictOptions('role'));
    expect(loadDict).toHaveBeenCalledTimes(1);

    // Unmount A only (its own AbortController must not tear down the shared request).
    a.unmount();

    await waitFor(() => {
      expect(b.result.current.options.length).toBe(1);
    });
    expect(b.result.current.errorMessage).toBeUndefined();
  });

  it('StrictMode single consumer still receives options (no zombie aborted shared promise)', async () => {
    const loadDict = abortAwareLoadDict(20);
    vi.mocked(useRendererEnv).mockReturnValue({ loadDict } as never);

    const { result } = renderHook(() => useDictOptions('role'), {
      wrapper: React.StrictMode,
    });

    await waitFor(() => {
      expect(result.current.options.length).toBe(1);
    });
    expect(result.current.errorMessage).toBeUndefined();
  });
});

describe('plan 862 L10: in-flight registry holds no strong per-env entries', () => {
  it('registry is a WeakMap keyed by loadDict identity', () => {
    expect(__inFlightDictLoadsForTests).toBeInstanceOf(WeakMap);
  });

  it('aborted shared load removes its entry immediately (no zombie in-flight entry)', async () => {
    const loadDict = abortAwareLoadDict(20);
    vi.mocked(useRendererEnv).mockReturnValue({ loadDict } as never);

    const { result } = renderHook(() => useDictOptions('role'));
    await waitFor(() => {
      expect(result.current.options.length).toBe(1);
    });

    // Mid-flight entry is removed as soon as it settles or the last subscriber leaves.
    const byDict = __inFlightDictLoadsForTests.get(loadDict);
    expect(byDict === undefined || byDict.size === 0).toBe(true);
  });
});
