import { expect, test } from './fixtures.js';

async function openW1a(page: import('@playwright/test').Page) {
  await page.goto('#/w1a-content', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '内容展示组 — markdown / html / link / image / json-view',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('W1a content display family — flux-renderers-content', () => {
  test('markdown renders headings and a GFM table', async ({ page }) => {
    await openW1a(page);
    const md = page.locator('[data-testid="demo-markdown"]');
    await expect(md).toBeVisible();
    await expect(md.locator('h2')).toHaveText('Release notes');
    await expect(md.locator('table')).toBeVisible();
    expect(await md.locator('td').count()).toBeGreaterThanOrEqual(2);
  });

  test('html sanitize gate strips <script> so it never executes (programmatic XSS check)', async ({ page }) => {
    await openW1a(page);
    const html = page.locator('[data-testid="demo-html"]');
    await expect(html).toBeVisible();
    // safe presentational tag survives
    await expect(html.locator('strong')).toBeVisible();
    // no <script> element is present in the rendered DOM
    expect(await html.locator('script').count()).toBe(0);
    // the script never executed — the global it would set is undefined
    const fired = await page.evaluate(
      () => (window as unknown as { __W1A_XSS_HTML__?: boolean }).__W1A_XSS_HTML__,
    );
    expect(fired).toBeUndefined();
  });

  test('html renders the empty state when content is empty', async ({ page }) => {
    await openW1a(page);
    const empty = page.locator('[data-testid="demo-html-empty"]');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute('data-state', 'empty');
    await expect(empty).toContainText('No HTML content');
  });

  test('image uses native lazy loading and renders the src', async ({ page }) => {
    await openW1a(page);
    const img = page.locator('[data-testid="demo-image"]');
    await expect(img).toBeVisible();
    expect(await img.getAttribute('loading')).toBe('lazy');
    expect((await img.getAttribute('src')) || '').toContain('data:image/svg+xml');
  });

  test('image falls back when the src fails to load', async ({ page }) => {
    await openW1a(page);
    const fallback = page.locator('[data-testid="demo-image-error"][data-state="error"]');
    await expect(fallback).toBeVisible({ timeout: 10_000 });
  });

  test('link fires onClick (setValue) while keeping navigation field-bound', async ({ page }) => {
    await openW1a(page);
    const link = page.locator('[data-testid="demo-link"]');
    await expect(link).toBeVisible();
    await expect(page.locator('[data-testid="link-click-flag"]')).toHaveText('pending');
    await link.click();
    await expect(page.locator('[data-testid="link-click-flag"]')).toHaveText('clicked');
  });

  test('json-view renders the object tree and shows an empty state for null', async ({ page }) => {
    await openW1a(page);
    const tree = page.locator('[data-testid="demo-json-view"]');
    await expect(tree).toBeVisible();
    expect(await tree.locator('.json-viewer').count()).toBe(1);
    expect(await tree.textContent()).toContain('Alice');

    const empty = page.locator('[data-testid="demo-json-view-empty"]');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute('data-state', 'empty');
    await expect(empty).toContainText('No data to inspect');
  });
});
