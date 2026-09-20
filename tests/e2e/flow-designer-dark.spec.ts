import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import { getComputedStyleValue } from './helpers/visual-assert.js';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');

  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInButton.click();

    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }

    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('nop');
      await page.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }

  await expect(signInButton).toHaveCount(0, { timeout: 10000 });
  await page.locator('button', { hasText: 'Visual Workflow' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 30000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await assertTrackedPageErrors(page);
}

test.describe('flow designer dark mode (plan 475 Phase 3)', () => {
  // L3 计算样式断言：切 dark 后画布面/工具条/网格解析值变化，节点身份色不翻转。
  test('switching data-mode to dark retunes canvas surfaces but keeps node accents', async ({
    page,
  }) => {
    await openFlowDesigner(page);

    const surface = page.locator('.fd-xyflow-surface').first();
    const toolbar = page.locator('.nop-designer-toolbar').first();

    const lightCanvasBg = await getComputedStyleValue(surface, 'background-color');
    const lightToolbarBg = await getComputedStyleValue(toolbar, 'background-color');

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
    await page.waitForTimeout(100);

    const darkCanvasBg = await getComputedStyleValue(surface, 'background-color');
    const darkToolbarBg = await getComputedStyleValue(toolbar, 'background-color');
    expect(darkCanvasBg, 'canvas surface must flip in dark mode').not.toBe(lightCanvasBg);
    expect(darkToolbarBg, 'toolbar surface must flip in dark mode').not.toBe(lightToolbarBg);

    // --fd-* 定义在 .nop-designer 作用域生效（令牌面激活）。
    const darkGrid = await page.evaluate(
      () => getComputedStyle(document.querySelector('.nop-designer') as Element).getPropertyValue('--fd-grid-color').trim(),
    );
    expect(darkGrid).toBe('rgba(148, 163, 184, 0.14)');

    // 身份色不随模式翻转：palette accent 定义值保持 light 契约。
    const accent = await page.evaluate(
      () => getComputedStyle(document.querySelector('.nop-designer') as Element).getPropertyValue('--fd-node-accent-dt-approval').trim(),
    );
    expect(accent).toBe('#ff943e');

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
    await assertTrackedPageErrors(page);
  });

  test('designer root exposes the published --fd-* token family', async ({ page }) => {
    await openFlowDesigner(page);

    const root = page.locator('.nop-designer').first();
    for (const token of ['--fd-page-bg', '--fd-canvas-bg', '--fd-primary', '--fd-edge-stroke']) {
      const value = await root.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name).trim(), token);
      expect(value, `${token} must be defined on .nop-designer`).not.toBe('');
    }
    await assertTrackedPageErrors(page);
  });
});
