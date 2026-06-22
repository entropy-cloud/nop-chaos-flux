import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openTextIconVisualFieldsPage(page: import('@playwright/test').Page) {
  await page.goto('/#/text-icon-visual-fields', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'text copyable/maxLine + icon size/color',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('E3 text/icon visual fields (copyable / maxLine / icon size+color)', () => {
  test('text copyable renders a copy button and clicking it copies text content', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await openTextIconVisualFieldsPage(page);

    const target = page.getByTestId('text-visual-copyable-target');
    await expect(target).toBeVisible({ timeout: 10_000 });

    const innerButton = target.locator('[data-slot="text-copy-button"]');
    await expect(innerButton).toBeVisible();

    await innerButton.click();

    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('hello@nop-chaos.dev');

    await assertTrackedPageErrors(page);
  });

  test('text maxLine=2 applies line-clamp-2 class to the root element', async ({ page }) => {
    await openTextIconVisualFieldsPage(page);

    const el = page.getByTestId('text-visual-maxline-2');
    await expect(el).toBeVisible({ timeout: 10_000 });
    const className = await el.evaluate((node) => node.className);
    expect(className).toContain('line-clamp-2');

    await assertTrackedPageErrors(page);
  });

  test('text maxLine=3 applies line-clamp-3 class to the root element', async ({ page }) => {
    await openTextIconVisualFieldsPage(page);

    const el = page.getByTestId('text-visual-maxline-3');
    await expect(el).toBeVisible({ timeout: 10_000 });
    const className = await el.evaluate((node) => node.className);
    expect(className).toContain('line-clamp-3');

    await assertTrackedPageErrors(page);
  });

  test('icon size=24 overrides the hardcoded default of 16', async ({ page }) => {
    await openTextIconVisualFieldsPage(page);

    const icon = page.getByTestId('text-visual-icon-size-24');
    await expect(icon).toBeVisible({ timeout: 10_000 });
    const widthAttr = await icon.evaluate((node) =>
      (node as SVGElement).getAttribute('width'),
    );
    const styleWidth = await icon.evaluate(
      (node) => (node as SVGElement).style.width,
    );
    expect(widthAttr === '24' || styleWidth === '24px').toBeTruthy();

    await assertTrackedPageErrors(page);
  });

  test('icon color is applied via inline style', async ({ page }) => {
    await openTextIconVisualFieldsPage(page);

    const icon = page.getByTestId('text-visual-icon-size-32-color');
    await expect(icon).toBeVisible({ timeout: 10_000 });
    const color = await icon.evaluate((node) => (node as SVGElement).style.color);
    expect(color).toBe('rgb(234, 179, 8)');

    await assertTrackedPageErrors(page);
  });

  test('icon defaults to size=16 when no size is configured (baseline)', async ({ page }) => {
    await openTextIconVisualFieldsPage(page);

    const icon = page.getByTestId('text-visual-icon-default');
    await expect(icon).toBeVisible({ timeout: 10_000 });
    const widthAttr = await icon.evaluate((node) =>
      (node as SVGElement).getAttribute('width'),
    );
    const styleWidth = await icon.evaluate(
      (node) => (node as SVGElement).style.width,
    );
    expect(widthAttr === '16' || styleWidth === '16px').toBeTruthy();

    await assertTrackedPageErrors(page);
  });

  test('text maxLineToggle renders a toggle that expands and collapses (aria-expanded + line-clamp)', async ({
    page,
  }) => {
    await openTextIconVisualFieldsPage(page);

    const textRoot = page.getByTestId('text-visual-maxline-toggle');
    await expect(textRoot).toBeVisible({ timeout: 10_000 });

    const toggle = textRoot.locator('[data-slot="text-maxline-toggle"]');
    await expect(toggle).toBeVisible();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const collapsedClass = await textRoot.evaluate((node) => node.className);
    expect(collapsedClass).toContain('line-clamp-2');

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(textRoot).toHaveAttribute('data-expanded', 'true');
    const expandedClass = await textRoot.evaluate((node) => node.className);
    expect(expandedClass).not.toMatch(/line-clamp-\d/);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const reCollapsedClass = await textRoot.evaluate((node) => node.className);
    expect(reCollapsedClass).toContain('line-clamp-2');

    await assertTrackedPageErrors(page);
  });

  test('icon size token maps sm/md/lg to 12/16/20 pixels', async ({ page }) => {
    await openTextIconVisualFieldsPage(page);

    for (const [token, pixels] of [
      ['sm', 12],
      ['md', 16],
      ['lg', 20],
    ] as const) {
      const icon = page.getByTestId(`text-visual-icon-token-${token}`);
      await expect(icon).toBeVisible({ timeout: 10_000 });
      const widthAttr = await icon.evaluate((node) =>
        (node as SVGElement).getAttribute('width'),
      );
      const styleWidth = await icon.evaluate(
        (node) => (node as SVGElement).style.width,
      );
      expect(widthAttr === String(pixels) || styleWidth === `${pixels}px`).toBeTruthy();
    }

    await assertTrackedPageErrors(page);
  });
});
