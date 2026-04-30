import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function openPerformanceTable(page: import('@playwright/test').Page) {
  await page.goto('/#/performance-table', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: 'Table Performance Playground', level: 1 }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeVisible();
}

test.describe('Performance Table Page', () => {
  test('switches scenario modes and updates host-mutation measurement output', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTable(page);

    await expect(page.getByText('user_1 / emea / offline')).toBeVisible();
    await expect(page.getByText('Primary: editor-offline').first()).toBeVisible();
    await expect(page.getByText('Region: emea').first()).toBeVisible();
    await expect(page.getByText('Scenario D: Editable subset form')).toBeVisible();

    await page.getByRole('button', { name: 'Table Only' }).click();
    await expect(page.getByText('Scenario D: Editable subset form')).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByText('user_1 / emea / offline')).toHaveCount(0, { timeout: 20_000 });

    await page.getByRole('button', { name: 'Full Stress' }).click();
    await expect(page.getByText('Scenario D: Editable subset form')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('user_1 / emea / offline')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Run 20 Host Mutations' }).click();
    await expect(page.getByText('Last Measurement')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Host row mutation benchmark: 20 updates')).toBeVisible({
      timeout: 60_000,
    });
  });

  test('resets the measurement panel after a host benchmark run', async ({ page }) => {
    await openPerformanceTable(page);

    await page.getByRole('button', { name: 'Run 20 Host Mutations' }).click();
    await expect(page.getByText('Last Measurement')).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Reset Metrics' }).click();
    await expect(page.getByText('Last Measurement')).toHaveCount(0);
  });

  test('renders all cell types with correct record-bound values on first and last pages', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPerformanceTable(page);

    const firstRow = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const dataRow = rows[0];
      if (!dataRow) return null;
      const cells = dataRow.querySelectorAll('td');
      const profile = cells[2]?.textContent?.trim();
      const badge = cells[3]?.textContent?.trim();
      const status = cells[4]?.textContent?.trim();
      const selectBtn = cells[5]?.querySelector('button[role="combobox"]');
      const checkbox = cells[6]?.querySelector('[role="checkbox"]');
      const sw = cells[7]?.querySelector('[role="switch"]');
      const textarea = cells[8]?.querySelector('textarea');
      return {
        profile,
        badge,
        status,
        select: selectBtn?.textContent?.trim(),
        checkboxChecked: checkbox?.getAttribute('aria-checked'),
        switchChecked: sw?.getAttribute('aria-checked'),
        notes: textarea?.value?.trim(),
      };
    });

    expect(firstRow).not.toBeNull();
    expect(firstRow!.profile).toBe('1. user_1 <user_1@perf.dev>');
    expect(firstRow!.badge).toBe('editor');
    expect(firstRow!.status).toBe('PAUSED / offline');
    expect(firstRow!.select).toContain('EMEA');
    expect(firstRow!.checkboxChecked).toBe('true');
    expect(firstRow!.switchChecked).toBe('false');
    expect(firstRow!.notes).toContain('Row 1 note');

    const lastPageBtn = page.locator('[data-slot="table-pagination"]').getByText('20');
    if (await lastPageBtn.isVisible()) {
      await lastPageBtn.click();
    } else {
      for (let i = 0; i < 20; i++) {
        const next = page
          .locator('[data-slot="table-pagination"] button, [data-slot="table-pagination"] a')
          .last();
        await next.click();
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(2000);

    const lastPageFirstRow = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        const profile = cells[2]?.textContent?.trim();
        if (profile && profile.includes('951')) {
          const sw = cells[7]?.querySelector('[role="switch"]');
          return { profile, switchChecked: sw?.getAttribute('aria-checked') };
        }
      }
      return null;
    });
    expect(lastPageFirstRow).not.toBeNull();
    expect(lastPageFirstRow!.profile).toContain('951');

    const lastRow = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      for (let i = rows.length - 1; i >= 0; i--) {
        const cells = rows[i].querySelectorAll('td');
        const profile = cells[2]?.textContent?.trim();
        if (profile && profile.includes('1000')) {
          const sw = cells[7]?.querySelector('[role="switch"]');
          const cb = cells[6]?.querySelector('[role="checkbox"]');
          return {
            profile,
            switchChecked: sw?.getAttribute('aria-checked'),
            checkboxChecked: cb?.getAttribute('aria-checked'),
          };
        }
      }
      return null;
    });
    expect(lastRow).not.toBeNull();
    expect(lastRow!.profile).toContain('1000');
    expect(lastRow!.switchChecked).toBe('true');
    expect(lastRow!.checkboxChecked).toBe('false');
  });
});
