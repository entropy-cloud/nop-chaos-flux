import { expect, test, type Page, assertTrackedPageErrors } from '../fixtures.js';
import { DOMAIN_RENDERER_ROUTES } from '../../../apps/playground/src/route-model';

type RouteAssertion = (page: Page) => Promise<void>;

const ROUTE_ASSERTIONS: Record<string, RouteAssertion> = {
  'flux-basic': async (page) => {
    await expect(page.getByRole('heading', { name: 'Renderer Playground', level: 1 })).toBeVisible({ timeout: 15_000 });
  },
  'flow-designer': async (page) => {
    await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30_000 });
  },
  'dingtalk-flow-demo': async (page) => {
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.react-flow')).toBeVisible();
  },
  'report-designer': async (page) => {
    await expect(page.getByRole('heading', { name: 'Report Designer Playground', level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.report-designer-demo')).toBeVisible();
  },
  'debugger-lab': async (page) => {
    await expect(page.getByRole('heading', { name: 'Debugger Lab', level: 1 })).toBeVisible({ timeout: 15_000 });
  },
  'condition-builder': async (page) => {
    await expect(page.getByRole('heading', { name: '条件构建器测试', level: 1 })).toBeVisible({ timeout: 15_000 });
  },
  'code-editor': async (page) => {
    await expect(page.getByRole('heading', { name: 'Code Editor Playground', level: 1 })).toBeVisible({ timeout: 15_000 });
  },
  'word-editor': async (page) => {
    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 30_000 });
  },
  'performance-table': async (page) => {
    await expect(page.getByRole('heading', { name: 'Table Performance Playground', level: 1 })).toBeVisible({ timeout: 15_000 });
  },
};

test.describe('Exploratory: domain page zero-error load', () => {
  for (const route of DOMAIN_RENDERER_ROUTES) {
    test(`zero-error load: ${route.id}`, async ({ page }) => {
      await page.goto(`/#/${route.id}`, { waitUntil: 'load' });
      await ROUTE_ASSERTIONS[route.id]?.(page);
      await assertTrackedPageErrors(page);

      const debuggerErrors = await page.evaluate(() => {
        const api = (window as any).__NOP_DEBUGGER_API__;
        return api ? api.queryEvents({ kind: 'error' }) : [];
      });
      expect(debuggerErrors).toHaveLength(0);
    });
  }

  test('round-trip navigation: flux-basic -> code-editor -> flux-basic has no errors', async ({ page }) => {
    await page.goto('/#/flux-basic', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Renderer Playground', level: 1 })).toBeVisible({ timeout: 15_000 });
    await assertTrackedPageErrors(page);

    await page.goto('/#/code-editor', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Code Editor Playground', level: 1 })).toBeVisible({ timeout: 15_000 });
    await assertTrackedPageErrors(page);

    await page.goto('/#/flux-basic', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Renderer Playground', level: 1 })).toBeVisible({ timeout: 15_000 });
    await assertTrackedPageErrors(page);
  });

  test('round-trip navigation: flow-designer -> report-designer -> flow-designer has no errors', async ({ page }) => {
    await page.goto('/#/flow-designer', { waitUntil: 'load' });
    await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: 30_000 });
    await assertTrackedPageErrors(page);

    await page.goto('/#/report-designer', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Report Designer Playground', level: 1 })).toBeVisible({ timeout: 30_000 });
    await assertTrackedPageErrors(page);

    await page.goto('/#/flow-designer', { waitUntil: 'load' });
    await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: 30_000 });
    await assertTrackedPageErrors(page);
  });
});
