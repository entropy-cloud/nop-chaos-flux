import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';
import { DOMAIN_RENDERER_ROUTES } from '../../apps/playground/src/route-model';

type RouteAssertion = (page: Page) => Promise<void>;

const ROUTE_ASSERTIONS: Record<string, RouteAssertion> = {
  'flux-basic': async (page) => {
    await expect(page.getByRole('heading', { name: 'Renderer Playground', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
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
    await expect(
      page.getByRole('heading', { name: 'Report Designer Playground', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.report-designer-demo')).toBeVisible();
  },
  'debugger-lab': async (page) => {
    await expect(page.getByRole('heading', { name: 'Debugger Lab', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Fire Render' })).toBeVisible();
  },
  'condition-builder': async (page) => {
    await expect(page.getByRole('heading', { name: '条件构建器测试', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'code-editor': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'Code Editor Playground', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('.nop-field').filter({ hasText: 'Expression Editor (with completion)' }),
    ).toBeVisible();
  },
  'word-editor': async (page) => {
    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
  },
  'performance-table': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'Table Performance Playground', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeVisible();
  },
};

async function openDomainRoute(page: Page, routeId: string) {
  await page.goto(`/#/${routeId}`, { waitUntil: 'commit' });
}

test('domain route coverage matches playground route inventory', () => {
  const routeIds = new Set(DOMAIN_RENDERER_ROUTES.map((route) => route.id));
  const assertionIds = new Set(Object.keys(ROUTE_ASSERTIONS));

  expect(assertionIds).toEqual(routeIds);
});

for (const route of DOMAIN_RENDERER_ROUTES) {
  test(`playground entry page smoke: ${route.id}`, async ({ page }) => {
    await openDomainRoute(page, route.id);
    await ROUTE_ASSERTIONS[route.id]?.(page);
    await assertTrackedPageErrors(page);
  });
}
