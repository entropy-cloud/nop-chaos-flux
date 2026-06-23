import { expect, test } from './fixtures.js';

async function openW3c(page: import('@playwright/test').Page) {
  await page.goto('#/w3c-value-mapping', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: '值映射组 — mapping / status', level: 1 }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W3c value mapping family — mapping/status', () => {
  test('mapping renders the nop-mapping marker and a hit value as text', async ({ page }) => {
    await openW3c(page);

    const mapping = page.locator('[data-testid="mapping-hit"]');
    await expect(mapping).toBeVisible({ timeout: 10_000 });
    await expect(mapping).toHaveAttribute('data-slot', 'mapping-root');
    await expect(mapping).toHaveAttribute('data-state', 'hit');
    // className carries the marker
    const cls = await mapping.evaluate((el) => el.className);
    expect(cls).toContain('nop-mapping');
    // Hit value text rendered inside mapping-item
    await expect(mapping.locator('[data-slot="mapping-item"]')).toHaveText('Active');
  });

  test('mapping miss prefers defaultLabel over placeholder', async ({ page }) => {
    await openW3c(page);

    const missDefault = page.locator('[data-testid="mapping-miss-default"]');
    await expect(missDefault).toHaveAttribute('data-state', 'miss');
    await expect(missDefault.locator('[data-slot="mapping-item"]')).toHaveText('Unknown state');
  });

  test('mapping miss falls back to placeholder when no defaultLabel', async ({ page }) => {
    await openW3c(page);

    const missPlaceholder = page.locator('[data-testid="mapping-miss-placeholder"]');
    await expect(missPlaceholder).toHaveAttribute('data-state', 'miss');
    await expect(missPlaceholder.locator('[data-slot="mapping-item"]')).toHaveText(
      'Placeholder fallback',
    );
  });

  test('mapping renders placeholder for an empty (null) value (no throw)', async ({ page }) => {
    await openW3c(page);

    const empty = page.locator('[data-testid="mapping-empty"]');
    await expect(empty).toHaveAttribute('data-state', 'empty');
    await expect(empty.locator('[data-slot="mapping-item"]')).toHaveText('No value');
  });

  test('mapping item region template renders when value hits', async ({ page }) => {
    await openW3c(page);

    const itemRegion = page.locator('[data-testid="mapping-item-region"]');
    await expect(itemRegion).toHaveAttribute('data-state', 'hit');
    await expect(itemRegion.locator('[data-slot="mapping-item"]')).toContainText(
      'Custom hit template',
    );
  });

  test('mapping resolves value from a scope expression', async ({ page }) => {
    await openW3c(page);

    // taskStatus=doing → In Progress
    const expr = page.locator('[data-testid="mapping-expr"]');
    await expect(expr).toHaveAttribute('data-state', 'hit');
    await expect(expr.locator('[data-slot="mapping-item"]')).toHaveText('In Progress');
  });

  test('status renders the nop-status marker and label from labelMap', async ({ page }) => {
    await openW3c(page);

    const status = page.locator('[data-testid="status-success"]');
    await expect(status).toBeVisible({ timeout: 10_000 });
    await expect(status).toHaveAttribute('data-slot', 'status-root');
    await expect(status).toHaveAttribute('data-state', 'hit');
    const cls = await status.evaluate((el) => el.className);
    expect(cls).toContain('nop-status');
    await expect(status.locator('[data-slot="status-badge"]')).toHaveText('Completed');
  });

  test('status levelMap projects to Badge semantic color classes (programmatic)', async ({
    page,
  }) => {
    await openW3c(page);

    // success → emerald; warning → amber; error → destructive
    const successBadgeClass = await page
      .locator('[data-testid="status-success"] [data-slot="status-badge"]')
      .evaluate((el) => el.className);
    expect(successBadgeClass).toContain('emerald');

    const warningBadgeClass = await page
      .locator('[data-testid="status-warning"] [data-slot="status-badge"]')
      .evaluate((el) => el.className);
    expect(warningBadgeClass).toContain('amber');

    const errorBadgeClass = await page
      .locator('[data-testid="status-error"] [data-slot="status-badge"]')
      .evaluate((el) => el.className);
    expect(errorBadgeClass).toContain('destructive');

    // data-level attributes reflect the mapped level
    await expect(
      page.locator('[data-testid="status-success"]'),
    ).toHaveAttribute('data-level', 'success');
    await expect(
      page.locator('[data-testid="status-warning"]'),
    ).toHaveAttribute('data-level', 'warning');
    await expect(
      page.locator('[data-testid="status-error"]'),
    ).toHaveAttribute('data-level', 'error');
  });

  test('status iconMap renders an icon inside the badge', async ({ page }) => {
    await openW3c(page);

    const iconBadge = page.locator('[data-testid="status-icon"] [data-slot="status-badge"]');
    await expect(iconBadge).toBeVisible();
    const svgCount = await iconBadge.evaluate((el) => el.querySelectorAll('svg').length);
    expect(svgCount).toBeGreaterThanOrEqual(1);
  });

  test('status miss renders placeholder and no badge', async ({ page }) => {
    await openW3c(page);

    const miss = page.locator('[data-testid="status-miss"]');
    await expect(miss).toHaveAttribute('data-state', 'miss');
    await expect(miss).toHaveText('Unknown status');
    expect(await miss.locator('[data-slot="status-badge"]').count()).toBe(0);
  });

  test('status resolves value from a scope expression and projects its level', async ({ page }) => {
    await openW3c(page);

    // deployState=running → Running + success level
    const expr = page.locator('[data-testid="status-expr"]');
    await expect(expr).toHaveAttribute('data-state', 'hit');
    await expect(expr).toHaveAttribute('data-level', 'success');
    await expect(expr.locator('[data-slot="status-badge"]')).toHaveText('Running');
  });
});
