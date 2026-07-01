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

test.describe('W3d editor — TipTap WYSIWYG', () => {
  test('loads the initial HTML value into the ProseMirror surface', async ({ page }) => {
    await openW3d(page);

    const report = page.locator('[data-testid="rich-report"]');
    await expect(report).toContainText('rich:<p>');

    const content = page
      .locator('[data-testid="demo-editor"] .ProseMirror')
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });
    // The initial value renders the strong run.
    await expect(content.locator('strong')).toHaveText('rich');
  });

  test('applying bold formats the selection and writes <strong> into the field value', async ({
    page,
  }) => {
    await openW3d(page);

    // Use the empty scratchpad editor so the typed text has no inherited marks
    // (deterministic): type → plain, select → bold button → <strong>.
    const content = page
      .locator('[data-testid="demo-editor-scratch"] .ProseMirror')
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });

    await content.click();
    await page.keyboard.type('hello editor');
    await page.keyboard.press('ControlOrMeta+A');

    const boldButton = page
      .locator('[data-testid="demo-editor-scratch"] button[data-testid="editor-toolbar-bold"]')
      .first();
    await boldButton.click({ force: true });

    const report = page.locator('[data-testid="rich2-report"]');
    await expect(report).toContainText('<strong>', { timeout: 10_000 });
    await expect(report).toContainText('hello editor');
    // Sanitize boundary: no script ever leaks from the editor output.
    await expect(report).not.toContainText('<script>');
  });

  test('toggling a bullet list writes a <ul> into the field value', async ({ page }) => {
    await openW3d(page);

    // Use the empty scratchpad editor for deterministic list formatting.
    const content = page
      .locator('[data-testid="demo-editor-scratch"] .ProseMirror')
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });

    await content.click();
    await page.keyboard.type('item one');

    const listButton = page
      .locator('[data-testid="demo-editor-scratch"] button[data-testid="editor-toolbar-bulletList"]')
      .first();
    await listButton.click({ force: true });

    const report = page.locator('[data-testid="rich2-report"]');
    await expect(report).toContainText('<ul', { timeout: 10_000 });
    await expect(report).toContainText('item one');
  });
});
