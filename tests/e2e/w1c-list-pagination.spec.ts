import { expect, test } from './fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './component-lab/helpers.js';

async function openListLab(page: import('@playwright/test').Page) {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('list');
  await expect(lab.multiScenarioLab).toBeVisible({ timeout: 20_000 });
  return lab;
}

test.describe('list pagination + infinite-scroll — flux-renderers-data', () => {
  test('slices items by page when gotoPage is invoked via buttons (local ownership)', async ({
    page,
  }) => {
    const lab = await openListLab(page);
    const slug = scenarioSlug('Pagination via gotoPage');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const list = stage.getByTestId('demo-list-pagination');
    await expect(list).toBeVisible();
    const items = list.locator('[data-slot="list-item"]');

    // Page 1 (default): Task #1–#4
    await expect(items).toHaveCount(4);
    await expect(list).toHaveAttribute('data-current-page', '1');
    await expect(list.getByText('Task #1')).toBeVisible();
    await expect(list.getByText('Task #4')).toBeVisible();

    // Goto page 2 via capability action: Task #5–#8
    await stage.getByRole('button', { name: 'Page 2' }).click();
    await expect(list).toHaveAttribute('data-current-page', '2');
    await expect(items).toHaveCount(4);
    await expect(list.getByText('Task #5')).toBeVisible();
    await expect(list.getByText('Task #8')).toBeVisible();

    // Goto page 3 (last page): Task #9–#12
    await stage.getByRole('button', { name: 'Page 3' }).click();
    await expect(list).toHaveAttribute('data-current-page', '3');
    await expect(list.getByText('Task #12')).toBeVisible();
  });

  test('loads more cumulatively on sentinel intersect and stops at the last page', async ({
    page,
  }) => {
    const lab = await openListLab(page);
    const slug = scenarioSlug('Infinite scroll load more');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const list = stage.getByTestId('demo-list-infinite');
    await expect(list).toBeVisible();
    const items = list.locator('[data-slot="list-item"]');
    const sentinel = () => list.locator('[data-slot="list-infinite-sentinel"]');

    // Initial: page 1 = 4 items, sentinel present (hasMore true).
    await expect(items).toHaveCount(4);
    await expect(sentinel()).toHaveCount(1);

    // Programmatically fire the sentinel intersection (documented IO test seam).
    await fireListIntersection(page);
    await expect(items).toHaveCount(8);

    // Fire again → reaches the last page (12 items), hasMore becomes false → sentinel removed.
    await fireListIntersection(page);
    await expect(items).toHaveCount(12);
    await expect(sentinel()).toHaveCount(0);
    // Locale-tolerant: zh-CN "没有更多了" / en-US "No more data".
    await expect(list.locator('[data-slot="list-infinite-status"]')).toContainText(
      /没有更多|no more/i,
    );

    // No further dispatch possible (sentinel gone).
    await fireListIntersection(page);
    await expect(items).toHaveCount(12);
  });
});

async function fireListIntersection(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const sentinel = document.querySelector('[data-slot="list-infinite-sentinel"]');
    const observer = (
      window as unknown as {
        __crudInfiniteObserver?: { __fireIntersection?: (el: Element) => void };
      }
    ).__crudInfiniteObserver;
    if (sentinel && observer && typeof observer.__fireIntersection === 'function') {
      observer.__fireIntersection(sentinel);
    }
  });
}
