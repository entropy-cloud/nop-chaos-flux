import { describe, expect, it } from 'vitest';
import { codemod } from '../e2e-migrate-codemod.mjs';

const SAMPLE = `
import { expect, test, assertTrackedPageErrors } from './fixtures.js';

test.describe('demo family', () => {
  test('renders and toggles', async ({ page }) => {
    await page.goto('/#/lab/widget');
    await expect(page.locator('[data-testid="root"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('item').first()).toContainText('hello');
    const input = page.getByTestId('field');
    await input.fill('abc');
    await expect(page.locator('#out')).toHaveValue('abc', { timeout: 5_000 });
    await expect(page.locator('#absent')).not.toBeVisible();
    await page.setViewportSize({ width: 800, height: 600 });
    await page.keyboard.press('Enter');
    await assertTrackedPageErrors(page);
  });
});
`;

describe('e2e-migrate-codemod', () => {
  it('rewrites the common goto/testid/expectWeb/viewport/keyboard patterns', () => {
    const out = codemod(SAMPLE);
    expect(out).toContain("await ft.goto('/#/lab/widget')");
    expect(out).not.toContain('await await');
    expect(out).not.toContain('((');
    expect(out).toContain('await ft.expectWeb(ft.locator(\'[data-testid="root"]\')).toBeVisible({ timeoutMs: 10_000 })');
    expect(out).toContain('await ft.expectWeb(ft.getByTestId(\'item\').first()).toContainText(');
    expect(out).toContain('await ft.expectWeb(ft.locator(\'#out\')).toHaveValue(\'abc\', { timeoutMs: 5_000 })');
    expect(out).toContain("await ft.expectWeb(ft.locator('#absent')).not.toBeVisible()");
    expect(out).toContain('await ft.setViewportSize(800, 600)');
    expect(out).toContain("await ft.keyboard.press('Enter')");
    expect(out).toContain('await expectNoPageErrors(ft);');
    expect(out).not.toMatch(/@playwright|page\./);
    expect(out).not.toContain('timeout:');
  });

  it('flags unresolved APIs as TODO(migrate) markers', () => {
    const out = codemod(`
import { test, expect } from '@playwright/test';
test('x', async ({ page }) => {
  await page.addInitScript(() => {});
  await expect.poll(() => page.locator('#a').textContent()).toBe('x');
});
`);
    expect(out).toContain('TODO(migrate)');
    expect(out).toContain('expect.poll');
    expect(out).toContain('page.addInitScript');
  });

  it('does not rename timeout keys outside web-assert option objects', () => {
    const out = codemod(`const cfg = { timeout: 42 };`);
    expect(out).toContain('{ timeout: 42 }');
  });
});
