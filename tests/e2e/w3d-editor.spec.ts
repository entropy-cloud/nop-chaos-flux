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
    // Select the typed text with Shift+Home (caret is at the end after typing).
    // ControlOrMeta+A is flaky here: in headless Chromium it does not reliably
    // trigger ProseMirror's selectAll keymap, leaving the editor's state
    // selection collapsed so `editor.chain().focus().toggleBold()` applies the
    // mark to nothing. Shift+Home produces a real text selection ProseMirror
    // reads from the DOM. The toolbar button's `.focus()` step can still
    // occasionally collapse a freshly-made selection, so retry select+toggle
    // until the `<strong>` mark lands.
    const boldButton = page
      .locator('[data-testid="demo-editor-scratch"] button[data-testid="editor-toolbar-bold"]')
      .first();
    const report = page.locator('[data-testid="rich2-report"]');
    for (let attempt = 0; ; attempt++) {
      await page.keyboard.press('Shift+Home');
      await boldButton.click({ force: true });
      try {
        await expect(report).toContainText('<strong>', { timeout: 2_000 });
        break;
      } catch (error) {
        if (attempt >= 4) {
          throw error;
        }
      }
    }
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
    await expect(content).toBeFocused();
    await page.keyboard.type('item one', { delay: 25 });
    // Guard against an input race where the editor hasn't settled the typed
    // text before the toolbar toggle (observed as a dropped leading char /
    // stray mark). Assert the text is committed before toggling the list.
    await expect(content).toContainText('item one', { timeout: 5_000 });

    const listButton = page
      .locator('[data-testid="demo-editor-scratch"] button[data-testid="editor-toolbar-bulletList"]')
      .first();
    await listButton.click({ force: true });

    const report = page.locator('[data-testid="rich2-report"]');
    await expect(report).toContainText('<ul', { timeout: 10_000 });
    await expect(report).toContainText('item one');
  });
});
