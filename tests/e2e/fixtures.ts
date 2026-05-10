import { test as base, expect } from '@playwright/test';

export interface ConsoleErrorsFixture {
  consoleErrors: string[];
}

export const test = base.extend<ConsoleErrorsFixture>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(errors);
  },
});

export function filterNoise(errors: string[]): string[] {
  return errors.filter((e) => !e.includes('favicon'));
}

export { expect };
