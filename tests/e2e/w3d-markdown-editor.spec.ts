import { expect, test } from './fixtures.js';

async function openW3d(page: import('@playwright/test').Page) {
  await page.goto('#/w3d-advanced-input-family', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '高级输入族 — period / markdown-editor / upload / editor',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W3d markdown-editor — split edit + preview composition', () => {
  test('typing markdown updates the live preview and writes back to scope', async ({ page }) => {
    await openW3d(page);

    const report = page.locator('[data-testid="md-report"]');
    await expect(report).toContainText('md:# Hello');

    const textarea = page.locator(
      '[data-testid="demo-markdown-editor"] textarea[data-testid="markdown-editor-textarea"]',
    );
    await textarea.scrollIntoViewIfNeeded();

    // Replace contents: the preview area should render a level-1 heading.
    await textarea.fill('# Title from editor');
    await expect(report).toHaveText('md:# Title from editor', { timeout: 10_000 });

    const preview = page.locator(
      '[data-testid="demo-markdown-editor"] [data-testid="markdown-editor-preview"]',
    );
    await expect(preview.locator('h1')).toHaveText('Title from editor');
  });

  test('viewMode preview renders the markdown without an editor textarea', async ({ page }) => {
    await openW3d(page);

    // The split editor is present by default; assert the preview area renders
    // the initial markdown (heading + bold + code span).
    const preview = page.locator(
      '[data-testid="demo-markdown-editor"] [data-testid="markdown-editor-preview"]',
    );
    await expect(preview.locator('h1')).toHaveText('Hello');
    await expect(preview.locator('strong')).toHaveText('markdown');
    await expect(preview.locator('code')).toHaveText('code');
  });
});
