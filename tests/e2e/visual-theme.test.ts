import { expect, test } from '@playwright/test';
import { getDataMode, expectTheme, setTheme } from './helpers/visual-theme';

/**
 * Focused unit tests for tests/e2e/helpers/visual-theme.ts (plan 501
 * Phase 1). setTheme is browser-bound, so the contract is pinned through a
 * fake page: the evaluate callbacks run against a stubbed `document`/
 * `requestAnimationFrame` in node, which proves the B5-34 semantics — the
 * theme is applied as a `data-mode` ATTRIBUTE on documentElement (never
 * emulateMedia), verified by attribute read-back, then settled via animation
 * frames (no wall-clock sleep).
 */

interface FakePage {
  readonly calls: string[];
  readonly attributes: Map<string, string>;
  readonly page: never;
}

let currentFake: FakePage | null = null;

function createFakePage(initialMode: string | null = null): FakePage {
  const attributes = new Map<string, string>();
  if (initialMode !== null) attributes.set('data-mode', initialMode);
  const calls: string[] = [];
  const fake = {
    evaluate: async (fn: (arg?: unknown) => unknown, arg?: unknown) => {
      calls.push('evaluate');
      return fn(arg);
    },
    waitForFunction: async (fn: (arg?: unknown) => unknown, arg?: unknown) => {
      calls.push('waitForFunction');
      return fn(arg);
    },
  };
  return { calls, attributes, page: fake as never };
}

test.beforeEach(() => {
  currentFake = null;
  (globalThis as { document?: unknown }).document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        currentFake!.attributes.set(name, value);
      },
      getAttribute: (name: string) => currentFake!.attributes.get(name) ?? null,
    },
  };
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (cb: (now: number) => void) => {
    cb(0);
    return 0;
  };
});

test.afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame;
  currentFake = null;
});

for (const mode of ['light', 'dark'] as const) {
  test(`setTheme('${mode}') writes the data-mode attribute, verifies it, settles via rAF`, async () => {
    currentFake = createFakePage(mode === 'light' ? 'dark' : null);
    await setTheme(currentFake.page, mode);
    expect(currentFake.attributes.get('data-mode')).toBe(mode);
    expect(currentFake.calls).toEqual(['evaluate', 'waitForFunction', 'evaluate']);
  });
}

test('getDataMode reads the current data-mode attribute', async () => {
  currentFake = createFakePage('dark');
  expect(await getDataMode(currentFake.page)).toBe('dark');
});

test('expectTheme passes on match and throws on mismatch', async () => {
  currentFake = createFakePage('dark');
  await expectTheme(currentFake.page, 'dark');
  await expect(expectTheme(currentFake.page, 'light')).rejects.toThrow(/data-mode/);
});
