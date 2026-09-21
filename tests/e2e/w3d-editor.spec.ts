import { expect, test } from './fixtures.js';
import {
  expectComputedStyle,
  expectCssVarResolves,
  getComputedStyleValue,
} from './helpers/visual-assert.js';

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
    const boldButton = page
      .locator('[data-testid="demo-editor-scratch"] button[data-testid="editor-toolbar-bold"]')
      .first();
    const report = page.locator('[data-testid="rich2-report"]');
    for (let attempt = 0; ; attempt++) {
      await content.focus();
      await page.keyboard.press('ControlOrMeta+a');
      await page.waitForTimeout(100);
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

// ---------------------------------------------------------------------------
// Plan 480 (visual quality V10, A7): computed-style contract for the editor
// face. Pass/fail is fully programmatic (getComputedStyle via the visual-assert
// helpers); no screenshot is a pass/fail criterion.
// ---------------------------------------------------------------------------
test.describe('W3d editor — plan 480 A7 computed-style contract', () => {
  test('toolbar buttons carry the unified ghost geometry (h-7 min-w-7, size-4 icon)', async ({
    page,
  }) => {
    await openW3d(page);

    const bold = page
      .locator('[data-testid="demo-editor-scratch"] button[data-testid="editor-toolbar-bold"]')
      .first();
    await expect(bold).toBeVisible();
    // h-7 → 28px; min-w-7 → 28px minimum width (unified three-face spec).
    await expectComputedStyle(bold, 'height', '28px');
    await expectComputedStyle(bold, 'min-width', '28px');
    const icon = bold.locator('svg').first();
    await expect(icon).toBeVisible();
    await expectComputedStyle(icon, 'width', '16px'); // size-4
    await expectComputedStyle(icon, 'height', '16px');
  });

  test('activating bold flips the aria-pressed state onto the bg-accent token', async ({
    page,
  }) => {
    await openW3d(page);

    const content = page
      .locator('[data-testid="demo-editor-scratch"] .ProseMirror')
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });
    await content.click();
    await page.keyboard.type('accent probe');

    const bold = page
      .locator('[data-testid="demo-editor-scratch"] button[data-testid="editor-toolbar-bold"]')
      .first();
    const inactiveBg = await getComputedStyleValue(bold, 'background-color');
    await expectCssVarResolves(page, '--accent');

    // The select-all → toolbar-toggle click has an input-settling race (see the
    // bold-formatting test above); retry until the active state sticks.
    for (let attempt = 0; ; attempt++) {
      await content.focus();
      await page.keyboard.press('ControlOrMeta+a');
      await page.waitForTimeout(100);
      await bold.click({ force: true });
      try {
        await expect(bold).toHaveAttribute('data-active', '', { timeout: 2_000 });
        break;
      } catch (error) {
        if (attempt >= 4) {
          throw error;
        }
      }
    }
    const activeBg = await getComputedStyleValue(bold, 'background-color');
    // Ghost base is transparent; the active state resolves the --accent token.
    expect(inactiveBg).toBe('rgba(0, 0, 0, 0)');
    expect(activeBg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('placeholder is visible on the empty editor and resolves the muted token', async ({
    page,
  }) => {
    await openW3d(page);

    const content = page
      .locator('[data-testid="demo-editor-scratch"] .ProseMirror')
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });

    const readPlaceholder = (root: HTMLElement) => {
      const p = root.querySelector('p.is-editor-empty');
      if (!p) {
        return null;
      }
      const style = getComputedStyle(p, '::before');
      return { content: style.getPropertyValue('content'), color: style.getPropertyValue('color') };
    };
    const pseudo = await content.evaluate(readPlaceholder);
    // The Placeholder extension decorates the empty paragraph; the package CSS
    // renders the label through attr(data-placeholder).
    expect(pseudo).not.toBeNull();
    expect(pseudo?.content).toContain('Type here');
    expect(pseudo?.color).not.toBe('rgba(0, 0, 0, 0)');

    // Typing content drops the decoration → the placeholder disappears.
    await content.click();
    await page.keyboard.type('x');
    const afterTyping = await content.evaluate(readPlaceholder);
    expect(afterTyping).toBeNull();
  });

  test('light↔dark flip re-resolves the placeholder color (dual-track token)', async ({
    page,
  }) => {
    await openW3d(page);

    const content = page
      .locator('[data-testid="demo-editor-scratch"] .ProseMirror')
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });

    const readPseudoColor = (root: HTMLElement) => {
      const p = root.querySelector('p.is-editor-empty');
      return p ? getComputedStyle(p, '::before').getPropertyValue('color') : null;
    };
    const lightColor = await content.evaluate(readPseudoColor);
    expect(lightColor).not.toBeNull();

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
    const darkColor = await content.evaluate(readPseudoColor);
    expect(darkColor).not.toBe(lightColor);

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
    expect(await content.evaluate(readPseudoColor)).toBe(lightColor);
  });
});
