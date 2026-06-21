import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openTreeDisplayUxPage(page: import('@playwright/test').Page) {
  await page.goto('/#/tree-display-ux', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: 'tree 搜索/图标/引导线', level: 1 }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('E3 tree display UX enhancements (search/icon/guide-line)', () => {
  test('search filters to matching nodes and auto-expands the ancestor chain', async ({ page }) => {
    await openTreeDisplayUxPage(page);

    const tree = page.getByTestId('tdx-search-tree');
    await expect(tree).toBeVisible({ timeout: 10_000 });

    const searchInput = tree.locator('[data-slot="tree-search-input"]');
    await expect(searchInput).toBeVisible();

    // Initially collapsed: deep node Button.tsx not present in DOM.
    expect(await tree.getByText('Button.tsx').count()).toBe(0);

    await searchInput.fill('Button');

    // Match + ancestor chain (src > components) auto-expanded, deep leaf visible + highlighted.
    await expect(tree.getByText('Button.tsx')).toBeVisible({ timeout: 10_000 });
    await expect(tree.getByText('components')).toBeVisible();

    // Non-matching branches hidden by filter.
    expect(await tree.getByText('docs').count()).toBe(0);
    expect(await tree.getByText('package.json').count()).toBe(0);

    const highlight = tree.locator('[data-slot="tree-search-highlight"]').first();
    await expect(highlight).toBeVisible();
    expect((await highlight.textContent())?.toLowerCase()).toContain('button');

    await assertTrackedPageErrors(page);
  });

  test('clearing the search restores the pre-search collapsed snapshot', async ({ page }) => {
    await openTreeDisplayUxPage(page);

    const tree = page.getByTestId('tdx-search-tree');
    const searchInput = tree.locator('[data-slot="tree-search-input"]');

    await searchInput.fill('Button');
    await expect(tree.getByText('Button.tsx')).toBeVisible({ timeout: 10_000 });

    // Clear the query → snapshot restored (initiallyExpanded:false → deep leaf hidden again).
    await searchInput.fill('');

    await expect(tree.getByText('src')).toBeVisible();
    expect(await tree.getByText('Button.tsx').count()).toBe(0);

    await assertTrackedPageErrors(page);
  });

  test('search with no match shows the empty hint while keeping the search box', async ({ page }) => {
    await openTreeDisplayUxPage(page);

    const tree = page.getByTestId('tdx-search-tree');
    const searchInput = tree.locator('[data-slot="tree-search-input"]');

    await searchInput.fill('zzz-no-such-node');

    await expect(tree.locator('[data-slot="tree-empty"]')).toBeVisible({ timeout: 10_000 });
    expect(await tree.getByText('src').count()).toBe(0);

    // Search box remains interactive.
    await expect(searchInput).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('showIcon renders per-node Lucide icons from iconField', async ({ page }) => {
    await openTreeDisplayUxPage(page);

    const tree = page.getByTestId('tdx-icon-tree');
    await expect(tree).toBeVisible({ timeout: 10_000 });

    const iconCount = await tree.locator('[data-slot="tree-node-icon"]').count();
    expect(iconCount).toBeGreaterThanOrEqual(1);

    await assertTrackedPageErrors(page);
  });

  test('showGuideLine renders depth-scaled guide-line markers', async ({ page }) => {
    await openTreeDisplayUxPage(page);

    const tree = page.getByTestId('tdx-guide-tree');
    await expect(tree).toBeVisible({ timeout: 10_000 });

    const guideCount = await tree.locator('[data-slot="tree-guide-line"]').count();
    expect(guideCount).toBeGreaterThanOrEqual(1);

    await assertTrackedPageErrors(page);
  });

  test('combined tree (search + icon + guide-line) renders all three markers together', async ({
    page,
  }) => {
    await openTreeDisplayUxPage(page);

    const tree = page.getByTestId('tdx-combined-tree');
    await expect(tree).toBeVisible({ timeout: 10_000 });

    await expect(tree.locator('[data-slot="tree-search-input"]')).toBeVisible();
    expect(await tree.locator('[data-slot="tree-node-icon"]').count()).toBeGreaterThanOrEqual(1);

    // Drive expansion via search so depth>0 nodes (and their guide-lines) become visible.
    await tree.locator('[data-slot="tree-search-input"]').fill('Button');
    await expect(tree.getByText('Button.tsx')).toBeVisible({ timeout: 10_000 });

    expect(await tree.locator('[data-slot="tree-guide-line"]').count()).toBeGreaterThanOrEqual(1);
    expect(await tree.locator('[data-slot="tree-node-icon"]').count()).toBeGreaterThanOrEqual(1);

    await assertTrackedPageErrors(page);
  });
});
