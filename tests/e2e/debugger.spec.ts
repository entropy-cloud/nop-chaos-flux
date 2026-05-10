import { test, expect } from '@playwright/test';

function collectConsoleErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

function filterFaviconErrors(errors: string[]): string[] {
  return errors.filter((e) => !e.includes('favicon'));
}

async function waitForDebuggerPanel(page: import('@playwright/test').Page) {
  await expect(page.locator('.nop-debugger')).toBeVisible();
  await expect(page.locator('.ndbg-tab')).toHaveCount(4);
}

async function waitForMinimizedBar(page: import('@playwright/test').Page) {
  await expect(page.locator('.ndbg-minimized')).toBeVisible();
}

function getLauncher(page: import('@playwright/test').Page) {
  return page.locator('.nop-debugger-launcher, button[title="Open Debugger"], body > button').last();
}

async function prepareFreshPage(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('/', { waitUntil: 'load' });
  await page.getByRole('heading', { name: 'Playground', level: 1 }).waitFor({
    state: 'visible',
    timeout: 45000,
  });
  await getLauncher(page).waitFor({ state: 'visible', timeout: 45000 });
}

async function openFluxBasicPage(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/#/flux-basic');
  await page
    .getByRole('heading', { name: 'Renderer Playground', level: 1 })
    .waitFor({ state: 'visible', timeout: 15000 });
}

async function seedFluxBasicExplanationFixture(page: import('@playwright/test').Page): Promise<{
  usernameCid: number;
  userFormCid: number;
  adminCodeCid: number;
  searchButtonCid: number;
}> {
  await openFluxBasicPage(page);
  await page.getByLabel('Username').fill('alice');
  await page.getByLabel('Username').blur();
  await page.getByLabel('Search Users').fill('alice');
  await page.getByLabel('Role').click();
  await page.getByRole('option', { name: 'Admin' }).click();
  await page.evaluate(() => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: { clear(): void } }).__NOP_DEBUGGER_API__;
    api?.clear();
  });

  await page.getByRole('button', { name: 'Search Directory' }).click();
  await page.waitForTimeout(450);
  await page.getByRole('button', { name: 'Search Directory' }).click();
  await page.waitForTimeout(2200);

  const cids = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('[data-slot="field-label"]'));
    const readCidForLabel = (text: string) => {
      const label = labels.find((node) => node.textContent?.includes(text));
      return Number(label?.closest('[data-cid]')?.getAttribute('data-cid'));
    };
    const readCidForInput = (selector: string) =>
      Number(
        (document.querySelector(selector) as HTMLElement | null)
          ?.closest('[data-cid]')
          ?.getAttribute('data-cid'),
      );

    return {
      usernameCid: readCidForInput('[aria-label="Username"]'),
      userFormCid: Number(
        (document.querySelector('[aria-label="Username"]') as HTMLElement | null)
          ?.closest('.nop-form')
          ?.getAttribute('data-cid'),
      ),
      adminCodeCid: readCidForInput('[aria-label="Admin Code"]') || readCidForLabel('Admin Code'),
      searchButtonCid: Number(
        Array.from(document.querySelectorAll('button'))
          .find((node) => node.textContent?.includes('Search Directory'))
          ?.getAttribute('data-cid'),
      ),
    };
  });

  expect(cids.usernameCid).toBeGreaterThan(0);
  expect(cids.userFormCid).toBeGreaterThan(0);
  expect(cids.adminCodeCid).toBeGreaterThan(0);
  expect(cids.searchButtonCid).toBeGreaterThan(0);
  return cids as {
    usernameCid: number;
    userFormCid: number;
    adminCodeCid: number;
    searchButtonCid: number;
  };
}

test.describe('Nop Debugger', () => {
  test('launcher renders on home page with zero console errors', async ({ page }) => {
    test.setTimeout(60_000);
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await expect(getLauncher(page)).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('clicking launcher opens the full debugger panel', async ({ page }) => {
    test.setTimeout(60_000);
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await getLauncher(page).click();
    await waitForDebuggerPanel(page);

    const tabButtons = page.locator('.ndbg-tab');
    await expect(tabButtons).toHaveCount(4);

    const headerButtons = page.locator('.ndbg-header-actions button');
    await expect(headerButtons).toHaveCount(4);
    const tooltips = await page.evaluate(() => {
      const btns = document.querySelectorAll('.ndbg-header-actions button');
      return Array.from(btns).map((b) => b.getAttribute('data-tooltip'));
    });
    expect(tooltips).toEqual(['Pause', 'Clear', 'Pick element', 'Minimize']);

    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('automation API (window.__NOP_DEBUGGER_API__) is available', async ({ page }) => {
    test.setTimeout(60_000);
    await prepareFreshPage(page);

    const apiInfo = await page.evaluate(() => {
      const api = (window as unknown as { __NOP_DEBUGGER_API__?: unknown }).__NOP_DEBUGGER_API__;
      if (!api || typeof api !== 'object') return { available: false };
      const snap = (api as { getSnapshot: () => Record<string, unknown> }).getSnapshot();
      const overview = (api as { getOverview: () => Record<string, unknown> }).getOverview();
      return {
        available: true,
        snapshotEnabled: snap?.enabled,
        snapshotPanelOpen: snap?.panelOpen,
        overviewTotalEvents: typeof overview?.totalEvents,
      };
    });

    expect(apiInfo.available).toBe(true);
    expect(apiInfo.snapshotEnabled).toBe(true);
    expect(typeof apiInfo.snapshotPanelOpen).toBe('boolean');
    expect(apiInfo.overviewTotalEvents).toBe('number');
  });

  test('debugger launcher renders on FluxBasicPage', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openFluxBasicPage(page);

    await expect(getLauncher(page)).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('debugger launcher renders on DebuggerLabPage', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/#/debugger-lab');
    await page
      .getByRole('heading', { name: 'Debugger Lab' })
      .waitFor({ state: 'visible', timeout: 15000 });

    await expect(getLauncher(page)).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('DebuggerLabPage controls fire events and query diagnostics', async ({ page }) => {
    await page.goto('/#/debugger-lab');
    await page
      .getByRole('heading', { name: 'Debugger Lab' })
      .waitFor({ state: 'visible', timeout: 15000 });

    const outputPanel = page.locator('pre').first();

    await page.getByRole('button', { name: 'Fire Render' }).click();
    await expect(outputPanel).toContainText('[Render Event]');

    await page.getByRole('button', { name: 'Get Snapshot' }).click();
    await expect(outputPanel).toContainText('[Snapshot]');
    await expect(outputPanel).toContainText('"enabled": true');
  });

  test('automation contract covers debugger API methods', async ({ page }) => {
    await prepareFreshPage(page);

    const result = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __NOP_DEBUGGER_API__?: {
            getSnapshot(): any;
            exportSession(options?: unknown): any;
            getLatestFailedRequest(): any;
          };
        }
      ).__NOP_DEBUGGER_API__;
      if (!api) return { available: false };

      const snapshot = api.getSnapshot();
      const exported = api.exportSession({ eventLimit: 10 });
      const latestFailedRequest = api.getLatestFailedRequest();

      return {
        available: true,
        snapshotEnabled: snapshot?.enabled,
        exportedEventsIsArray: Array.isArray(exported?.events),
        latestFailedRequest,
      };
    });

    expect(result.available).toBe(true);
    expect(result.snapshotEnabled).toBe(true);
    expect(result.exportedEventsIsArray).toBe(true);
    expect(result.latestFailedRequest ?? null).toBeNull();
  });

  test('automation explanation contracts answer value/meta/failure/async questions on live page', async ({
    page,
  }) => {
    const { usernameCid, userFormCid, adminCodeCid, searchButtonCid } =
      await seedFluxBasicExplanationFixture(page);

    const result = await page.evaluate(
      async ({ usernameCid, userFormCid, adminCodeCid, searchButtonCid }) => {
        const api = (
          window as unknown as {
            __NOP_DEBUGGER_API__?: {
              inspectByCid(cid: number): any;
              explainNodeValue(query: { cid: number; field?: string }): any;
              explainNodeMeta(query: { cid: number; field: string }): any;
              explainNodeFailure(query?: { cid?: number }): any;
              explainNodeAsync(query?: { cid?: number }): any;
            };
          }
        ).__NOP_DEBUGGER_API__;

        if (!api) {
          return { available: false };
        }

        const startedAt = Date.now();
        while (Date.now() - startedAt < 5000) {
          const inspect = api.inspectByCid(adminCodeCid);
          if (inspect?.metaSummary?.visible === true) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        return {
          available: true,
          inspect: api.inspectByCid(adminCodeCid),
          value: api.explainNodeValue({ cid: usernameCid, field: 'username' }),
          meta: api.explainNodeMeta({ cid: adminCodeCid, field: 'visible' }),
          failure: api.explainNodeFailure({ cid: searchButtonCid }),
          asyncInfo: api.explainNodeAsync({ cid: userFormCid }),
        };
      },
      { usernameCid, userFormCid, adminCodeCid, searchButtonCid },
    );

    expect(result.available).toBe(true);
    expect(result.value).toMatchObject({
      kind: 'value',
      data: {
        field: 'username',
      },
    });
    expect(['current-scope', 'form-state', 'unknown']).toContain(result.value.data.valueSource);
    expect(typeof result.value.answer).toBe('string');
    expect(result.inspect).toMatchObject({
      cid: adminCodeCid,
      metaSummary: {
        visible: true,
      },
    });
    expect(result.meta).toMatchObject({
      kind: 'meta',
      data: {
        field: 'visible',
        source: 'resolved-meta',
        value: true,
        dependencyPaths: ['role'],
      },
    });
    expect(result.meta.answer).toContain('${role === "admin"}');
    expect(result.meta.limitations).toEqual([]);
    expect(result.failure).toMatchObject({
      kind: 'failure',
    });
    expect(result.failure.data.failureType).not.toBe('unknown');
    expect(Array.isArray(result.failure.data.relatedEventIds)).toBe(true);
    expect(result.asyncInfo).toMatchObject({
      kind: 'async',
    });
    expect(Array.isArray(result.asyncInfo.data.owners)).toBe(true);
  });

  test('no console errors on any page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    const errors1 = [...errors];

    await openFluxBasicPage(page);
    const errors2 = [...errors];

    await page.goto('/#/debugger-lab');
    await page
      .getByRole('heading', { name: 'Debugger Lab' })
      .waitFor({ state: 'visible', timeout: 15000 });
    const errors3 = [...errors];

    expect(filterFaviconErrors(errors1)).toEqual([]);
    expect(filterFaviconErrors(errors2)).toEqual([]);
    expect(filterFaviconErrors(errors3)).toEqual([]);
  });

  test('panel open/minimize state persists across reloads', async ({ page }) => {
    await prepareFreshPage(page);

    await getLauncher(page).click();
    await waitForDebuggerPanel(page);

    await page.reload();
    await page.locator('.nop-debugger').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('.nop-debugger')).toBeVisible();

    const minimizeBtn = page.locator('[data-tooltip="Minimize"]');
    await minimizeBtn.click();
    await waitForMinimizedBar(page);

    await page.reload();
    await page.locator('.ndbg-minimized').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('.ndbg-minimized')).toBeVisible();

    await page.locator('.ndbg-minimized').click();
    await expect(page.locator('.ndbg-minimized')).not.toBeVisible();
    await expect(page.locator('.nop-debugger')).toBeVisible();
  });

  test('minimize shows compact bar instead of hiding panel', async ({ page }) => {
    await prepareFreshPage(page);

    await getLauncher(page).click();
    await waitForDebuggerPanel(page);

    await page.locator('[data-tooltip="Minimize"]').click();
    await waitForMinimizedBar(page);

    const className = await page.locator('.ndbg-minimized').getAttribute('class');
    expect(className).toContain('ndbg-minimized');

    const minimizedStyle = await page.locator('.ndbg-minimized').evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        display: s.display,
        borderRadius: s.borderRadius,
        cursor: s.cursor,
        padding: s.padding,
        height: el.getBoundingClientRect().height,
      };
    });

    expect(minimizedStyle.display).toBe('flex');
    expect(minimizedStyle.borderRadius).toBe('999px');
    expect(minimizedStyle.cursor).toBe('grab');
    expect(minimizedStyle.height).toBeLessThan(60);
  });

  test('clicking minimized bar restores full panel', async ({ page }) => {
    await prepareFreshPage(page);

    await getLauncher(page).click();
    await waitForDebuggerPanel(page);

    await page.locator('[data-tooltip="Minimize"]').click();
    await waitForMinimizedBar(page);

    await page.locator('.ndbg-minimized').click();

    await expect(page.locator('.ndbg-minimized')).not.toBeVisible();
    await expect(page.locator('.nop-debugger')).toBeVisible();
    await expect(page.locator('.ndbg-drag-handle')).toBeVisible();
    await expect(page.locator('.ndbg-tab')).toHaveCount(4);
  });

  test('minimized bar is draggable', async ({ page }) => {
    await prepareFreshPage(page);

    await getLauncher(page).click();
    await waitForDebuggerPanel(page);

    await page.locator('[data-tooltip="Minimize"]').click();
    await waitForMinimizedBar(page);

    const bar = page.locator('.ndbg-minimized');
    const boxBefore = await bar.boundingBox();
    expect(boxBefore).not.toBeNull();
    if (!boxBefore) {
      throw new Error('Expected minimized bar bounding box');
    }

    await page.mouse.move(boxBefore.x + boxBefore.width / 2, boxBefore.y + boxBefore.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      boxBefore.x + boxBefore.width / 2 + 100,
      boxBefore.y + boxBefore.height / 2 + 80,
      { steps: 5 },
    );
    await page.mouse.up();

    await expect
      .poll(async () => await bar.boundingBox())
      .not.toBeNull();
    const resolvedBoxAfter = await bar.boundingBox();
    if (!resolvedBoxAfter) {
      throw new Error('Expected dragged bar bounding box');
    }
    expect(Math.abs(resolvedBoxAfter.x - boxBefore.x)).toBeGreaterThan(20);
    expect(Math.abs(resolvedBoxAfter.y - boxBefore.y)).toBeGreaterThan(20);
  });

  test('minimized bar shows event count badge', async ({ page }) => {
    await prepareFreshPage(page);

    await getLauncher(page).click();
    await waitForDebuggerPanel(page);

    await page.locator('[data-tooltip="Minimize"]').click();
    await waitForMinimizedBar(page);

    const bar = page.locator('.ndbg-minimized');
    await expect(bar.locator('.ndbg-minimized-badge')).toBeVisible();
    await expect(bar.locator('.ndbg-minimized-badge')).toContainText('0');
  });

  test('minimized bar shows error count badge when errors exist', async ({ page }) => {
    await page.goto('/#/debugger-lab');
    await page
      .getByRole('heading', { name: 'Debugger Lab' })
      .waitFor({ state: 'visible', timeout: 15000 });

    await getLauncher(page).click();
    await waitForDebuggerPanel(page);

    await page.getByRole('button', { name: 'Fire Error' }).click();

    await page.locator('[data-tooltip="Minimize"]').click();
    await waitForMinimizedBar(page);

    const bar = page.locator('.ndbg-minimized');
    await expect(bar.locator('.ndbg-minimized-error-badge')).toBeVisible();
  });
});
