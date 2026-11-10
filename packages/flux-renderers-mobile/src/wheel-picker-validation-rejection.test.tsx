import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

const { notifySpy } = vi.hoisted(() => ({ notifySpy: vi.fn() }));

vi.mock('@nop-chaos/flux-react', async () => {
  const testSupport = await import('@nop-chaos/flux-react/test-support');
  return {
    ...testSupport,
    FieldFrame: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useCurrentForm: vi.fn(),
    useRendererRuntime: vi.fn(() => ({ env: { notify: notifySpy } })),
  };
});

import { useCurrentForm } from '@nop-chaos/flux-react';
import { createMockRendererProps } from '@nop-chaos/flux-react/test-support';
import { WheelPickerRenderer } from './wheel-picker.js';

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
  vi.restoreAllMocks();
});

const COLUMNS = [
  { label: '红', value: 'red' },
  { label: '绿', value: 'green' },
];

// Plan 862 L2: a validator that rejects must be reported through the host
// channel, not escape as an unhandled rejection from a floating promise.
describe('wheel-picker confirm validateField rejection handling', () => {
  it('confirm with a rejecting validator reports via env.notify, no unhandled rejection', async () => {
    const validateField = vi.fn(() => Promise.reject(new Error('validator exploded')));
    vi.mocked(useCurrentForm).mockReturnValue({
      setValue: vi.fn(),
      validateField,
    } as never);

    const props = createMockRendererProps({
      schema: { type: 'wheel-picker' as const },
      props: { name: 'color', columns: [COLUMNS] },
      meta: { testid: 'wp' },
      events: {},
    });
    const view = render(<WheelPickerRenderer {...props} />);
    fireEvent.click(view.getByTestId('wp-trigger'));
    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-confirm"]') as HTMLElement);

    await waitFor(() => {
      expect(validateField).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(unhandled).toEqual([]);
    expect(notifySpy).toHaveBeenCalled();
  });
});
