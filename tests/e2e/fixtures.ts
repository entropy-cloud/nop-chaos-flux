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

type TrackedPage = Page & {
  __nopAssertZeroPageErrors__?: () => Promise<void>;
};

const KNOWN_NOISE_PATTERNS = ['favicon', 'Download the React DevTools', 'WebSocket connection'];

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
  await (page as TrackedPage).__nopAssertZeroPageErrors__?.();
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

      (page as TrackedPage).__nopAssertZeroPageErrors__ = assertZeroPageErrors;

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
        delete (page as TrackedPage).__nopAssertZeroPageErrors__;
        assertCountsWithinAllowance();
      }
    },
    { scope: 'test' },
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
