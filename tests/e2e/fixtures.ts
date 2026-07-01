import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test';

export interface ConsoleErrorsFixture {
  consoleErrors: string[];
  pageErrors: string[];
  assertZeroPageErrors(): Promise<void>;
  allowConsoleErrors(count: number): void;
  allowPageErrors(count: number): void;
}

interface ErrorMonitor {
  consoleErrors: string[];
  pageErrors: string[];
  assertZeroPageErrors(): Promise<void>;
  allowConsoleErrors(count: number): void;
  allowPageErrors(count: number): void;
  assertCountsWithinAllowance(): void;
}

type TestFixtures = ConsoleErrorsFixture & {
  errorMonitor: ErrorMonitor;
};

const TRACKED_PAGE_ASSERTS_KEY = Symbol.for('nop.e2e.trackedPageAsserts');

type PageWithGuid = Page & {
  _guid?: string;
};

function getTrackedPageKey(page: Page): Page | string {
  const guid = (page as PageWithGuid)._guid;
  return typeof guid === 'string' && guid.length > 0 ? guid : page;
}

function getTrackedPageAssertsStore() {
  const globalState = globalThis as typeof globalThis & {
    [TRACKED_PAGE_ASSERTS_KEY]?: Map<Page | string, () => Promise<void>>;
  };

  if (!globalState[TRACKED_PAGE_ASSERTS_KEY]) {
    globalState[TRACKED_PAGE_ASSERTS_KEY] = new Map<Page | string, () => Promise<void>>();
  }

  return globalState[TRACKED_PAGE_ASSERTS_KEY];
}

const trackedPageAsserts = getTrackedPageAssertsStore();

function getTrackedPageAssert(page: Page): (() => Promise<void>) | undefined {
  return trackedPageAsserts.get(getTrackedPageKey(page));
}

const KNOWN_NOISE_PATTERNS = ['favicon', 'Download the React DevTools', 'net::ERR_NAME_NOT_RESOLVED'];

function formatConsoleMessage(msg: ConsoleMessage): string {
  return `[console.error] ${msg.text()}`;
}

function formatPageError(error: Error): string {
  return `[pageerror] ${error.message}`;
}

function filterKnownNoise(errors: string[]): string[] {
  return errors.filter((error) => !KNOWN_NOISE_PATTERNS.some((pattern) => error.includes(pattern)));
}

async function expectZeroPageErrors(page: Page, consoleErrors: string[], pageErrors: string[]) {
  const filteredConsoleErrors = filterKnownNoise(consoleErrors);
  const filteredPageErrors = filterKnownNoise(pageErrors);

  expect(filteredConsoleErrors, `Expected zero console.error entries on ${page.url()}`).toEqual([]);
  expect(filteredPageErrors, `Expected zero pageerror entries on ${page.url()}`).toEqual([]);
}

export async function assertTrackedPageErrors(page: Page): Promise<void> {
  const assertFn = getTrackedPageAssert(page);
  if (!assertFn) {
    throw new Error(
      'assertTrackedPageErrors(page) requires the fixture-managed `page` from tests/e2e/fixtures.ts. Supported specs must not create an untracked page via browser.newContext().newPage() and then call this helper.',
    );
  }
  await assertFn();
}

export const test = base.extend<TestFixtures>({
  errorMonitor: [
    async ({ page }, provide) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      let allowedConsoleErrors = 0;
      let allowedPageErrors = 0;

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(formatConsoleMessage(msg));
        }
      });
      page.on('pageerror', (err) => pageErrors.push(formatPageError(err)));

      const assertZeroPageErrors = async () => {
        await expectZeroPageErrors(page, consoleErrors, pageErrors);
      };

      const assertCountsWithinAllowance = () => {
        const filteredConsoleErrors = filterKnownNoise(consoleErrors);
        const filteredPageErrors = filterKnownNoise(pageErrors);

        expect(
          filteredConsoleErrors.length,
          `Expected at most ${allowedConsoleErrors} console.error entries on ${page.url()}\n${filteredConsoleErrors.join('\n')}`,
        ).toBeLessThanOrEqual(allowedConsoleErrors);
        expect(
          filteredPageErrors.length,
          `Expected at most ${allowedPageErrors} pageerror entries on ${page.url()}\n${filteredPageErrors.join('\n')}`,
        ).toBeLessThanOrEqual(allowedPageErrors);
      };

      const trackedPageKey = getTrackedPageKey(page);
      trackedPageAsserts.set(trackedPageKey, assertZeroPageErrors);

      try {
        await provide({
          consoleErrors,
          pageErrors,
          assertZeroPageErrors,
          allowConsoleErrors(count: number) {
            allowedConsoleErrors = count;
          },
          allowPageErrors(count: number) {
            allowedPageErrors = count;
          },
          assertCountsWithinAllowance,
        });
      } finally {
        trackedPageAsserts.delete(trackedPageKey);
        assertCountsWithinAllowance();
      }
    },
    { scope: 'test', auto: true },
  ] as const,
  consoleErrors: async ({ errorMonitor }, provide) => {
    await provide(errorMonitor.consoleErrors);
  },
  pageErrors: async ({ errorMonitor }, provide) => {
    await provide(errorMonitor.pageErrors);
  },
  assertZeroPageErrors: async ({ errorMonitor }, provide) => {
    await provide(errorMonitor.assertZeroPageErrors);
  },
  allowConsoleErrors: async ({ errorMonitor }, provide) => {
    await provide(errorMonitor.allowConsoleErrors);
  },
  allowPageErrors: async ({ errorMonitor }, provide) => {
    await provide(errorMonitor.allowPageErrors);
  },
});

export function filterNoise(errors: string[]): string[] {
  return filterKnownNoise(errors);
}

export { expect };
export type { Page };
