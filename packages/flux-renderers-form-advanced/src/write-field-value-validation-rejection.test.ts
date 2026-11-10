import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { writeFieldValue } from './write-field-value.js';

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

beforeEach(() => {
  unhandled.length = 0;
  vi.clearAllMocks();
  process.on('unhandledRejection', onUnhandled);
});

afterEach(() => {
  process.off('unhandledRejection', onUnhandled);
});

// Plan 862 L2: the shared composite-field writer must not leave a floating
// validateField promise — a rejecting validator must reach the report channel.
describe('writeFieldValue rejection handling', () => {
  function fakeOwner(validateField: () => Promise<unknown>) {
    return {
      validation: { behavior: { triggers: ['change'], showErrorOn: ['touched'] } },
      validateField,
    } as never;
  }

  it('a rejecting validator is routed to the report callback, no unhandled rejection', async () => {
    const validateField = vi.fn(() => Promise.reject(new Error('validator exploded')));
    const report = vi.fn();
    const fired = writeFieldValue(fakeOwner(validateField), 'name', 'name', 'change', report);
    expect(fired).toBe(true);

    await new Promise((r) => setTimeout(r, 20));
    expect(unhandled).toEqual([]);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('without a report callback the rejection still does not escape (console.warn channel)', async () => {
    const validateField = vi.fn(() => Promise.reject(new Error('validator exploded')));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    writeFieldValue(fakeOwner(validateField), 'name', 'name', 'change');

    await new Promise((r) => setTimeout(r, 20));
    expect(unhandled).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
