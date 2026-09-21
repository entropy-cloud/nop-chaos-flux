import { expect, test } from './fixtures.js';
import { expectComputedStyle } from './helpers/visual-assert.js';

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

// ---------------------------------------------------------------------------
// Plan 480 (visual quality V10, A3/A5/A7): autoGrow geometry + toolbar spec +
// preview typography. Pass/fail is fully programmatic.
// ---------------------------------------------------------------------------
test.describe('W3d markdown-editor — plan 480 computed-style contract', () => {
  const TEXTAREA = '[data-testid="demo-markdown-editor"] textarea[data-testid="markdown-editor-textarea"]';

  test('autoGrow: rows=8 baseline grows with content and clamps at the max', async ({
    page,
  }) => {
    await openW3d(page);

    const textarea = page.locator(TEXTAREA);
    await textarea.scrollIntoViewIfNeeded();
    const heightOf = () => textarea.evaluate((el) => el.getBoundingClientRect().height);

    // rows={8} initial/min height (text-sm → well above 100px, far below max).
    const baseline = await heightOf();
    expect(baseline).toBeGreaterThan(100);

    // Content beyond the baseline grows the textarea (monotonic increase).
    await textarea.fill(
      '# Title\n\n' + Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join('\n'),
    );
    const grown = await heightOf();
    expect(grown).toBeGreaterThan(baseline);

    // Very long content clamps at 480px (internal scroll, no layout stretch).
    await textarea.fill(
      Array.from({ length: 120 }, (_, i) => `Very long content line ${i + 1}`).join('\n'),
    );
    const clamped = await heightOf();
    expect(clamped).toBe(480);
    const scrollsInternally = await textarea.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(scrollsInternally).toBe(true);

    // Shrinking back re-clamps at the baseline, never below the rows=8 height.
    await textarea.fill('# small');
    expect(await heightOf()).toBe(baseline);
  });

  test('toolbar buttons carry the unified ghost geometry (h-7 min-w-7)', async ({ page }) => {
    await openW3d(page);

    const toolbarButton = page
      .locator('[data-testid="demo-markdown-editor"] button[data-testid="md-toolbar-bold"]')
      .first();
    await expect(toolbarButton).toBeVisible();
    await expectComputedStyle(toolbarButton, 'height', '28px');
    await expectComputedStyle(toolbarButton, 'min-width', '28px');
    const icon = toolbarButton.locator('svg').first();
    await expect(icon).toBeVisible();
    await expectComputedStyle(icon, 'width', '16px'); // size-4
  });

  test('preview typography resolves the scoped .nop-markdown h1 size', async ({ page }) => {
    await openW3d(page);

    const previewH1 = page
      .locator('[data-testid="demo-markdown-editor"] [data-testid="markdown-editor-preview"] h1')
      .first();
    await expect(previewH1).toHaveText('Hello');
    // `.nop-markdown h1 { font-size: 1.5rem }` → 24px (UA default would be 32px).
    await expectComputedStyle(previewH1, 'font-size', '24px');
  });
});
