import { expect, test } from './fixtures.js';

// cron-editor L5 视觉复核（cron 轨道 C7, plan 542；roadmap 测试矩阵 L5 行落位）。
// pass/fail 全部程序化：可见性、单行/对齐几何、水平不溢出（沿 ai-bubble-visual 先例）；
// 截图仅人审佐证，写 tests/e2e/artifacts/（.gitignore，不入库、不作为断言依据）。

const LAB_URL = '/#/lab/cron-editor';

async function openLab(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(LAB_URL, { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow px').toBeLessThanOrEqual(0);
}

async function shoot(page: import('@playwright/test').Page, stage: import('@playwright/test').Locator, name: string) {
  await page.screenshot({ path: `tests/e2e/artifacts/cron-editor-visual/${name}.png`, fullPage: true });
  await stage.screenshot({ path: `tests/e2e/artifacts/cron-editor-visual/${name}-stage.png` });
}

test.describe('cron-editor visual layer (cron 轨道 C7, plan 542)', () => {
  test('tier bar: five tiers visible, single row, no overflow', async ({ page }) => {
    await openLab(page);
    const stage = page.getByTestId('scenario-stage-wizard-and-blocks');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    const tiers = stage.locator('[data-testid="cron-editor-tiers"] [role="radio"]');
    await expect(tiers).toHaveCount(5);
    const boxes = await tiers.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, width: r.width, height: r.height };
      }),
    );
    for (const box of boxes) {
      expect(box.width, 'tier button width > 0').toBeGreaterThan(0);
      expect(box.height, 'tier button height > 0').toBeGreaterThan(0);
    }
    // 单行：五档同一 top（±2px 容差）
    for (const box of boxes) {
      expect(Math.abs(box.top - boxes[0].top), 'tier buttons share one row').toBeLessThanOrEqual(2);
    }
    await assertNoHorizontalOverflow(page);
    await shoot(page, stage, 'tier-bar');
  });

  test('segment editor: seven inputs visible and aligned on custom tier', async ({ page }) => {
    await openLab(page);
    const stage = page.getByTestId('scenario-stage-visual-segments');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    await stage.locator('[data-testid="cron-editor-tier-custom"]').click();
    const segments = stage.locator('[data-slot="segment-group"] input');
    await expect(segments).toHaveCount(7);
    const boxes = await segments.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, width: r.width };
      }),
    );
    for (const box of boxes) {
      expect(box.width, 'segment input width > 0').toBeGreaterThan(0);
    }
    for (const box of boxes) {
      expect(Math.abs(box.top - boxes[0].top), 'segment inputs aligned').toBeLessThanOrEqual(2);
    }
    await assertNoHorizontalOverflow(page);
    await shoot(page, stage, 'segment-editor');
  });

  test('preview list: rendered rows inside stage bounds', async ({ page }) => {
    await openLab(page);
    const stage = page.getByTestId('scenario-stage-visual-segments');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    const list = stage.locator('[data-testid="cron-editor-preview"]');
    await expect(list).toBeVisible({ timeout: 15_000 });
    const rows = list.locator('li');
    const count = await rows.count();
    expect(count, 'preview rows rendered').toBeGreaterThan(0);
    const listBox = await list.boundingBox();
    const stageBox = await stage.boundingBox();
    expect(listBox).not.toBeNull();
    expect(stageBox).not.toBeNull();
    // 预览列表落在 stage 内（无越界渲染）
    expect(listBox!.x, 'preview left inside stage').toBeGreaterThanOrEqual(stageBox!.x - 1);
    expect(listBox!.x + listBox!.width, 'preview right inside stage').toBeLessThanOrEqual(stageBox!.x + stageBox!.width + 1);
    await assertNoHorizontalOverflow(page);
    await shoot(page, stage, 'preview');
  });

  test('wizard + blocks layout: legends visible, blocks inside stage, no overflow', async ({ page }) => {
    await openLab(page);
    const stage = page.getByTestId('scenario-stage-wizard-and-blocks');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    // 向导时间字段与周几多选可见
    for (const key of ['s', 'mi', 'h']) {
      await expect(stage.locator(`[data-testid="cron-editor-wizard-${key}"]`)).toBeVisible();
    }
    // 区块 fieldset/legend 可见
    const repeatLegend = stage.locator('[data-slot="repeat-block"] legend');
    const rangeLegend = stage.locator('[data-slot="range-block"] legend');
    await expect(repeatLegend).toBeVisible();
    await expect(rangeLegend).toBeVisible();
    const legendText = (await repeatLegend.textContent())?.trim() ?? '';
    expect(legendText.length, 'repeat legend text non-empty').toBeGreaterThan(0);

    // 区块不越出 stage
    const repeatBox = await stage.locator('[data-slot="repeat-block"]').boundingBox();
    const stageBox = await stage.boundingBox();
    expect(repeatBox).not.toBeNull();
    expect(repeatBox!.x, 'repeat block left inside stage').toBeGreaterThanOrEqual(stageBox!.x - 1);
    expect(repeatBox!.x + repeatBox!.width, 'repeat block right inside stage').toBeLessThanOrEqual(stageBox!.x + stageBox!.width + 1);

    await assertNoHorizontalOverflow(page);
    await shoot(page, stage, 'wizard-blocks');
  });
});
