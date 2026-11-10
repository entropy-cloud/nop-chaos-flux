import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentForm: vi.fn(),
  useCurrentFormState: vi.fn(() => undefined),
  useCurrentValidationScope: vi.fn(() => undefined),
  useRendererRuntime: vi.fn(() => undefined),
  useRenderScope: vi.fn(() => ({})),
  useScopeSelector: vi.fn(() => undefined),
}));

import { useCurrentForm } from '@nop-chaos/flux-react';
import { useFieldHandlers } from '../field-utils.js';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Plan 862 L8: `adapter.out` generation must advance on the synchronous path
// too, otherwise a late async `adapter.out` resolution overwrites a later
// synchronous write.
describe('useFieldHandlers adapter.out generation parity', () => {
  it('a late async adapter.out does not overwrite a subsequent synchronous write', async () => {
    const setValue = vi.fn();
    vi.mocked(useCurrentForm).mockReturnValue({ setValue } as never);

    const adapter = {
      out: (value: unknown) => {
        if (value === 'slow') {
          return new Promise((resolve) => setTimeout(() => resolve('SLOW'), 20));
        }
        return value;
      },
      in: (value: unknown) => value,
    };

    const { result } = renderHook(() =>
      useFieldHandlers({
        name: 'f',
        currentForm: useCurrentForm() as never,
        scope: { id: 's' } as never,
        adapter: adapter as never,
      }),
    );

    result.current.onChange('slow');
    await new Promise((r) => setTimeout(r, 0));
    result.current.onChange('fast');

    await new Promise((r) => setTimeout(r, 40));

    const lastWrite = setValue.mock.calls.at(-1);
    expect(lastWrite).toEqual(['f', 'fast']);
    expect(setValue.mock.calls).not.toContainEqual(['f', 'SLOW']);
  });
});
