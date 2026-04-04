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

async function prepareFreshPage(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);
}

async function openFluxBasicPage(page: import('@playwright/test').Page): Promise<void> {
  await prepareFreshPage(page);
  await page.getByText('Core Renderers').click();
  await page.waitForTimeout(1200);
}

test.describe('Nop Debugger', () => {
  test('launcher renders on home page with zero console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await expect(page.locator('.nop-debugger-launcher')).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('clicking launcher opens the full debugger panel', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.nop-debugger')).toBeVisible();

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
        overviewTotalEvents: typeof overview?.totalEvents
      };
    });

    expect(apiInfo.available).toBe(true);
    expect(apiInfo.snapshotEnabled).toBe(true);
    expect(typeof apiInfo.snapshotPanelOpen).toBe('boolean');
    expect(apiInfo.overviewTotalEvents).toBe('number');
  });

  test('debugger launcher renders on FluxBasicPage', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await page.getByText('Core Renderers').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('.nop-debugger-launcher')).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('debugger launcher renders on DebuggerLabPage', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await page.getByText('DevTools').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('.nop-debugger-launcher')).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('DebuggerLabPage controls fire events and query diagnostics', async ({ page }) => {
    await prepareFreshPage(page);

    await page.getByText('DevTools').click();
    await page.waitForTimeout(500);

    const outputPanel = page.locator('pre').first();

    await page.getByRole('button', { name: 'Fire Render' }).click();
    await page.waitForTimeout(300);
    await expect(outputPanel).toContainText('[Render Event]');

    await page.getByRole('button', { name: 'Get Snapshot' }).click();
    await page.waitForTimeout(300);
    await expect(outputPanel).toContainText('[Snapshot]');
    await expect(outputPanel).toContainText('"enabled": true');
  });

  test('automation contract covers real form submit, trace, inspect, and redaction', async ({ page }) => {
    await openFluxBasicPage(page);

    await page.getByLabel('Username').fill('debugger-user');
    await page.getByLabel('Email').fill('debugger@example.com');
    await page.getByLabel('Role').click();
    await page.getByRole('option', { name: 'Admin' }).click();
    await page.getByLabel('Admin Code').fill('4321');
    await page.getByLabel('Reviewer Notes').fill('ready for debugger validation');

    const submitButton = page.getByRole('button', { name: 'Submit Form' });
    await submitButton.click();

    const result = await page.evaluate(async () => {
      const api = (window as unknown as { __NOP_DEBUGGER_API__: { waitForEvent(options?: unknown): Promise<any>; getInteractionTrace(options: unknown): any; getLatestFailedRequest(): any; exportSession(options?: unknown): any; inspectByElement(element: HTMLElement): any } }).__NOP_DEBUGGER_API__;
      const submitted = await api.waitForEvent({ kind: 'api:end', text: '/api/users', timeoutMs: 4000 });
      const trace = api.getInteractionTrace({ eventId: submitted.id, mode: 'related' });
      const latestFailedRequest = api.getLatestFailedRequest();
      const exported = api.exportSession({ query: { kind: ['api:start', 'api:end'] }, eventLimit: 10 });
      const field = document.querySelector('[data-cid]') as HTMLElement | null;
      const inspected = field ? api.inspectByElement(field) : undefined;

      return {
        submitted,
        trace,
        latestFailedRequest,
        exported,
        inspected
      };
    });

    expect(result.submitted.kind).toBe('api:end');
    expect(result.submitted.requestInstanceId).toBeTruthy();
    expect(result.trace.requestInstanceIds).toContain(result.submitted.requestInstanceId);
    expect(result.trace.interactionIds.length).toBeGreaterThan(0);
    expect(result.latestFailedRequest ?? null).toBeNull();
    expect(result.exported.events.some((event: { network?: { url?: string } }) => event.network?.url === '/api/users')).toBe(true);
    expect(result.inspected?.scopeChain?.length ?? 0).toBeGreaterThan(0);
  });

  test('no console errors on any page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    const errors1 = [...errors];

    await page.getByText('Core Renderers').click();
    await page.waitForTimeout(1500);
    const errors2 = [...errors];

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);
    await page.getByText('DevTools').click();
    await page.waitForTimeout(1500);
    const errors3 = [...errors];

    expect(filterFaviconErrors(errors1)).toEqual([]);
    expect(filterFaviconErrors(errors2)).toEqual([]);
    expect(filterFaviconErrors(errors3)).toEqual([]);
  });

  test('panel open/minimize state persists across reloads', async ({ page }) => {
    await prepareFreshPage(page);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();

    const minimizeBtn = page.locator('[data-tooltip="Minimize"]');
    await minimizeBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger--minimized')).toBeVisible();
    await expect(page.locator('.nop-debugger--minimized')).toContainText('Debugger');

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger--minimized')).toBeVisible();

    await page.locator('.nop-debugger--minimized').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger--minimized')).not.toBeVisible();
    await expect(page.locator('.nop-debugger')).toBeVisible();
  });

  test('minimize shows compact bar instead of hiding panel', async ({ page }) => {
    await prepareFreshPage(page);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();

    await page.locator('[data-tooltip="Minimize"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.nop-debugger--minimized')).toBeVisible();
    await expect(page.locator('.nop-debugger--minimized')).toContainText('Debugger');

    const className = await page.locator('.nop-debugger--minimized').getAttribute('class');
    expect(className).toContain('nop-debugger--minimized');

    const minimizedStyle = await page.locator('.nop-debugger--minimized').evaluate((el) => {
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

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();

    await page.locator('[data-tooltip="Minimize"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger--minimized')).toBeVisible();

    await page.locator('.nop-debugger--minimized').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.nop-debugger--minimized')).not.toBeVisible();
    await expect(page.locator('.nop-debugger')).toBeVisible();
    await expect(page.locator('.ndbg-drag-handle')).toBeVisible();
    await expect(page.locator('.ndbg-tab')).toHaveCount(4);
  });

  test('minimized bar is draggable', async ({ page }) => {
    await prepareFreshPage(page);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);

    await page.locator('[data-tooltip="Minimize"]').click();
    await page.waitForTimeout(500);

    const bar = page.locator('.nop-debugger--minimized');
    const boxBefore = await bar.boundingBox();
    expect(boxBefore).not.toBeNull();
    if (!boxBefore) {
      throw new Error('Expected minimized bar bounding box');
    }

    await page.mouse.move(boxBefore.x + boxBefore.width / 2, boxBefore.y + boxBefore.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxBefore.x + boxBefore.width / 2 + 100, boxBefore.y + boxBefore.height / 2 + 80, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const boxAfter = await bar.boundingBox();
    expect(boxAfter).not.toBeNull();
    if (!boxAfter) {
      throw new Error('Expected dragged bar bounding box');
    }
    expect(Math.abs(boxAfter.x - boxBefore.x)).toBeGreaterThan(20);
    expect(Math.abs(boxAfter.y - boxBefore.y)).toBeGreaterThan(20);
  });

  test('minimized bar shows event count badge', async ({ page }) => {
    await prepareFreshPage(page);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);

    await page.locator('[data-tooltip="Minimize"]').click();
    await page.waitForTimeout(500);

    const bar = page.locator('.nop-debugger--minimized');
    await expect(bar.locator('.ndbg-minimized-badge')).toBeVisible();
    await expect(bar.locator('.ndbg-minimized-badge')).toContainText('0');
  });

  test('minimized bar shows error count badge when errors exist', async ({ page }) => {
    await prepareFreshPage(page);

    await page.getByText('DevTools').click();
    await page.waitForTimeout(1000);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();

    await page.getByRole('button', { name: 'Fire Error' }).click();
    await page.waitForTimeout(500);

    await page.locator('[data-tooltip="Minimize"]').click();
    await page.waitForTimeout(500);

    const bar = page.locator('.nop-debugger--minimized');
    await expect(bar.locator('.ndbg-minimized-error-badge')).toBeVisible();
  });
});
