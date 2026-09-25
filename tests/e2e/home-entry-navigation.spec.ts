import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

/**
 * missing-components L0.3（plan 502 Phase 3）：五个关键缺失入口经首页卡片点击
 * 可导航到目标页。首页卡片集合由 route-entries 注册表派生（home-cards.ts），
 * 本 spec 抽查「注册表条目 → 首页卡片 → 目标页挂载」全链路；目标页断言模式
 * 与 playground-entry-pages.spec.ts 同源。
 */

const KEY_ENTRIES: Array<{ id: string; cardTitle: string; assert: (page: Page) => Promise<void> }> =
  [
    {
      id: 'print-designer',
      cardTitle: 'Print Designer',
      assert: async (page) => {
        await expect(page.getByTestId('print-designer-demo')).toBeVisible({ timeout: 30_000 });
      },
    },
    {
      id: 'scada-editor-demo',
      cardTitle: 'Scada Editor Demo',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'scada-editor-demo 编辑器演示页', level: 1 }),
        ).toBeVisible({ timeout: 30_000 });
      },
    },
    {
      id: 'report-designer-host',
      cardTitle: 'Report Designer Host',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Report Designer Host Playground', level: 1 }),
        ).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('[data-slot="report-designer-toolbar"]')).toBeVisible({
          timeout: 15_000,
        });
      },
    },
    {
      id: 'map-demo',
      cardTitle: 'Map (OpenLayers)',
      assert: async (page) => {
        await expect(page.locator('[data-slot="map"]').first()).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('[data-slot="map"] canvas').first()).toBeAttached({
          timeout: 30_000,
        });
      },
    },
    {
      id: 'pivot-table-demo',
      cardTitle: 'Pivot Table',
      assert: async (page) => {
        await expect(page.locator('[data-slot="pivot-canvas"] canvas').first()).toBeAttached({
          timeout: 30_000,
        });
      },
    },
  ];

test.describe('home entry navigation (missing-components L0.3)', () => {
  test('home renders cards for the five key previously-hidden entries', async ({ page }) => {
    await page.goto('/#/', { waitUntil: 'commit' });
    for (const entry of KEY_ENTRIES) {
      await expect(
        page.locator(`[data-home-card="${entry.id}"]`),
        `home card for '${entry.id}' must render`,
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  for (const entry of KEY_ENTRIES) {
    test(`clicking the '${entry.id}' home card navigates to the target page`, async ({ page }) => {
      await page.goto('/#/', { waitUntil: 'commit' });
      const card = page.locator(`[data-home-card="${entry.id}"]`);
      await expect(card).toBeVisible({ timeout: 15_000 });
      await card.click();
      await entry.assert(page);
      const hash = await page.evaluate(() => window.location.hash);
      expect(hash).toBe(`#/${entry.id}`);
      // 五个关键路由均不在 playground-entry-pages 的 KNOWN_ERRORS 白名单内，
      // 与既有冒烟同口径追加页面错误校验。
      await assertTrackedPageErrors(page);
    });
  }
});
