import { expect, test } from '@playwright/test';

// M1 (plan 2026-11-18-m1): StabilityTracker + ForestSnapshot + automation V2.
// Programmatic assertions only (page.evaluate). Scope writes happen on the
// flux-basic renderer playground, so forest-snapshot epochs are asserted there.

async function openFluxBasicPage(page: import('@playwright/test').Page) {
  await page.goto('/#/flux-basic');
  await page
    .getByRole('heading', { name: 'Renderer Playground', level: 1 })
    .waitFor({ state: 'visible', timeout: 15000 });
}

async function openDebuggerLab(page: import('@playwright/test').Page) {
  await page.goto('/#/debugger-lab');
  await page
    .getByRole('heading', { name: 'Debugger Lab' })
    .waitFor({ state: 'visible', timeout: 15000 });
}

interface V2Api {
  getStability?: () => { stable: boolean; counters: Record<string, number> };
  getSnapshotEpochs?: () => number[];
  getSnapshotAt?: (epoch: number) => unknown | null;
}

function getApi(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__;
    if (!api?.getStability || !api.getSnapshotEpochs || !api.getSnapshotAt) {
      return null;
    }
    return api;
  });
}

test('automation V2 exposes stability probes and reports stable after settling', async ({ page }) => {
  await openFluxBasicPage(page);
  await page.waitForTimeout(500);

  const api = await getApi(page);
  expect(api).not.toBeNull();

  const stability = await page.evaluate(() => {
    const probe = ((window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__ as V2Api)
      .getStability!();
    return probe;
  });
  expect(stability.stable).toBe(true);
  expect(Object.keys(stability.counters).length).toBeGreaterThan(0);
});

test('forest snapshots are collected on scope writes and getSnapshotAt resolves them', async ({ page }) => {
  await openDebuggerLab(page);
  await page.waitForTimeout(500);

  // trigger a real scope write through the runtime (lab demo button)
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === 'Trigger Scope Write',
    );
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__!;
    const epochs = api.getSnapshotEpochs!();
    if (epochs.length === 0) return { epochs, snapshot: null };
    const latestEpoch = epochs[epochs.length - 1]!;
    const snapshot = api.getSnapshotAt!(latestEpoch) as {
      epoch: number;
      revisions: Record<string, number>;
      scopes: Record<string, Record<string, unknown>>;
    } | null;
    return { epochs, snapshot };
  });

  expect(result.epochs.length).toBeGreaterThan(0);
  expect(result.snapshot).not.toBeNull();
  expect(Object.keys(result.snapshot!.scopes).length).toBeGreaterThan(0);
  expect(Object.values(result.snapshot!.revisions).some((rev) => rev > 0)).toBe(true);
});

test('stability indicator renders on the lab page', async ({ page }) => {
  await openDebuggerLab(page);
  await page.waitForTimeout(500);
  const indicator = page.getByTestId('debugger-lab-stability');
  await expect(indicator).toContainText(/stable|busy|n\/a/);
});
