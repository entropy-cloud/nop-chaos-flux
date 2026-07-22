import { test, expect } from './fixtures.js';

test.describe('Diff View Demo', () => {
  test('split view renders with correct line types', async ({ page }) => {
    await page.goto('/#/diff-view', { waitUntil: 'commit' });
    await expect(page.locator('h1').filter({ hasText: 'Diff View Demo' })).toBeVisible({ timeout: 15_000 });

    const isSplit = await page.evaluate(() => {
      const el = document.querySelector('.nop-diff-view');
      return el?.getAttribute('data-view') === 'split';
    });
    expect(isSplit).toBeTruthy();

    const addLines = page.locator('[data-diff-type="add"]');
    const deleteLines = page.locator('[data-diff-type="delete"]');
    const contextLines = page.locator('[data-diff-type="context"]');

    await expect(addLines.first()).toBeVisible({ timeout: 10_000 });
    await expect(deleteLines.first()).toBeVisible({ timeout: 10_000 });
    await expect(contextLines.first()).toBeVisible({ timeout: 10_000 });

    const addCount = await addLines.count();
    const deleteCount = await deleteLines.count();
    const contextCount = await contextLines.count();

    expect(addCount).toBeGreaterThan(0);
    expect(deleteCount).toBeGreaterThan(0);
    expect(contextCount).toBeGreaterThan(0);

    const totalLines = addCount + deleteCount + contextCount;
    expect(totalLines).toBeGreaterThan(5);
  });

  test('unified view toggle works via internal button', async ({ page }) => {
    await page.goto('/#/diff-view', { waitUntil: 'commit' });
    await expect(page.locator('h1').filter({ hasText: 'Diff View Demo' })).toBeVisible({ timeout: 15_000 });

    const getViewType = () =>
      page.evaluate(() => {
        const el = document.querySelector('.nop-diff-view');
        return el?.getAttribute('data-view');
      });

    expect(await getViewType()).toBe('split');

    await page.locator('.nop-diff-view-toggle').click();
    await page.waitForTimeout(300);

    expect(await getViewType()).toBe('unified');

    await page.locator('.nop-diff-view-toggle').click();
    await page.waitForTimeout(300);

    expect(await getViewType()).toBe('split');
  });

  test('hunk structure renders with header text and buttons', async ({ page }) => {
    await page.goto('/#/diff-view', { waitUntil: 'commit' });
    await expect(page.locator('h1').filter({ hasText: 'Diff View Demo' })).toBeVisible({ timeout: 15_000 });

    const hunkHeaders = page.locator('[data-slot="diff-hunk-header"]');
    await expect(hunkHeaders.first()).toBeVisible({ timeout: 10_000 });

    const hunkHeaderText = await hunkHeaders.first().textContent();
    expect(hunkHeaderText).toContain('@@');

    const expandBtns = page.locator('.nop-diff-hunk-expand-btn');
    const collapseBtns = page.locator('.nop-diff-hunk-collapse-btn');

    const hasExpand = await expandBtns.count();
    const hasCollapse = await collapseBtns.count();

    if (hasCollapse > 0) {
      await collapseBtns.first().click();
      await page.waitForTimeout(500);
      const isNowCollapsed = await page.evaluate(() => {
        const headers = document.querySelectorAll('[data-slot="diff-hunk-header"]');
        return Array.from(headers).some((h) => h.getAttribute('data-expanded') === 'false');
      });
      expect(isNowCollapsed).toBeTruthy();
    } else if (hasExpand > 0) {
      await expandBtns.first().click();
      await page.waitForTimeout(500);
      const isNowExpanded = await page.evaluate(() => {
        const headers = document.querySelectorAll('[data-slot="diff-hunk-header"]');
        return Array.from(headers).some((h) => h.getAttribute('data-expanded') === 'true');
      });
      expect(isNowExpanded).toBeTruthy();
    }
  });

  test('cross-file mode renders file list and diff content', async ({ page }) => {
    await page.goto('/?mode=cross-file#/diff-view', { waitUntil: 'commit' });
    await expect(page.locator('h1').filter({ hasText: 'Diff View Demo' })).toBeVisible({ timeout: 15_000 });

    await page.waitForTimeout(500);

    await expect(page.locator('[data-slot="diff-file-list"]')).toBeVisible({ timeout: 10_000 });

    const fileItemCount = await page.locator('[data-slot="diff-file-list"] [role="button"]').count();
    expect(fileItemCount).toBe(5);

    const hasDiffLines = await page.evaluate(() => {
      return document.querySelectorAll('[data-diff-type="add"]').length > 0;
    });
    expect(hasDiffLines).toBeTruthy();
  });

  test('cross-file navigation renders and file switching works', async ({ page }) => {
    await page.goto('/?mode=cross-file#/diff-view', { waitUntil: 'commit' });
    await expect(page.locator('h1').filter({ hasText: 'Diff View Demo' })).toBeVisible({ timeout: 15_000 });

    await page.waitForTimeout(500);

    await expect(page.locator('[data-slot="diff-file-list"]')).toBeVisible({ timeout: 10_000 });

    const fileItems = page.locator('[data-slot="diff-file-list"] [role="button"]');
    await expect(fileItems.first()).toBeVisible();

    const getFileName = () =>
      page.evaluate(() => {
        const el = document.querySelector('.nop-diff-file-name');
        return el?.textContent ?? null;
      });

    const initialFileName = await getFileName();
    expect(initialFileName).toBeTruthy();

    await fileItems.nth(1).click();
    await page.waitForTimeout(300);

    const newFileName = await getFileName();
    expect(newFileName).not.toBe(initialFileName);
  });
});
