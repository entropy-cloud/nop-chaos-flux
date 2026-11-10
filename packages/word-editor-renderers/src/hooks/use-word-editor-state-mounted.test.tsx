import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

vi.mock('@nop-chaos/flux-react', () => ({
  resolveRendererSlotContent: vi.fn(() => null),
  useCurrentActionScope: vi.fn(() => ({})),
  useHostScope: vi.fn(() => ({})),
  useNamespaceRegistration: vi.fn(),
  useRendererEnv: vi.fn(() => ({})),
  useStatusPathPublication: vi.fn(),
}));

import { useWordEditorState } from './use-word-editor-state.js';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Plan 862 L3: the mount marker must be re-armed in the effect body so a
// StrictMode simulated unmount/remount (or Activity re-activation) does not
// leave `mountedRef.current` permanently false.
describe('useWordEditorState mountedRef (plan 862 L3)', () => {
  it('StrictMode remount leaves mountedRef.current true', () => {
    const { result } = renderHook(
      () =>
        useWordEditorState({
          props: {},
          meta: {},
          regions: {},
          events: {},
          node: { scope: { parent: null, id: 's', path: '/p', value: {} } },
        } as never),
      { wrapper: React.StrictMode },
    );

    expect((result.current as { mountedRef: { current: boolean } }).mountedRef.current).toBe(true);
  });
});
