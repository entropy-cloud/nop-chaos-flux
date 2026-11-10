import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

const { notifySpy } = vi.hoisted(() => ({ notifySpy: vi.fn() }));

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: vi.fn(() => ({})),
  useCurrentForm: vi.fn(),
  useCurrentFormState: vi.fn(() => undefined),
  useCurrentValidationScope: vi.fn(() => undefined),
  useScopeSelector: vi.fn(() => undefined),
  useRendererRuntime: vi.fn(() => ({ env: { notify: notifySpy } })),
}));

import { useCurrentForm } from '@nop-chaos/flux-react';
import { useCodeEditorBinding } from './use-code-editor-binding.js';

const unhandledRejectionChannel = (
  globalThis as { process?: { on: (event: string, cb: (reason: unknown) => void) => void; off: (event: string, cb: (reason: unknown) => void) => void } }
).process;
const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  unhandled.length = 0;
  unhandledRejectionChannel?.on('unhandledRejection', onUnhandled);
});

afterEach(() => {
  cleanup();
  unhandledRejectionChannel?.off('unhandledRejection', onUnhandled);
});

// Plan 862 L2: floating validateField/validateAt promises must route rejections
// into the host reporting channel instead of escaping as unhandled rejections.
describe('code-editor binding validateField rejection handling', () => {
  it('handleBlur: a rejecting validator reports via env.notify with no unhandled rejection', async () => {
    const validateField = vi.fn(() => Promise.reject(new Error('validator exploded')));
    vi.mocked(useCurrentForm).mockReturnValue({
      setValue: vi.fn(),
      validateField,
      touchField: vi.fn(),
      visitField: vi.fn(),
      registerField: vi.fn(() => ({ unregister: vi.fn() })),
    } as never);

    const { result } = renderHook(() =>
      useCodeEditorBinding({ props: {}, meta: {}, regions: {}, events: {} } as never, 'expr'),
    );

    result.current.handleBlur();
    await new Promise((r) => setTimeout(r, 20));

    expect(unhandled).toEqual([]);
    expect(notifySpy).toHaveBeenCalled();
  });
});
