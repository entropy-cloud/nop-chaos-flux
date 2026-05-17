import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// This measurement page mutates one shared host/runtime and is intentionally serialized.
test.describe.configure({ mode: 'serial' });

async function openPerformanceTable(page: import('@playwright/test').Page) {
  await page.goto('/#/performance-table', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Table Performance Playground', level: 1 })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function waitForTableRows(page: import('@playwright/test').Page) {
  await expect(page.locator('table tbody tr[data-slot="table-row"]').first()).toBeVisible({
    timeout: 45_000,
  });
}

test.describe('Performance Table Page', () => {
  test('switches scenario modes and updates host-mutation measurement output', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTable(page);

    await page.getByRole('button', { name: 'Scope Read Stress' }).click();

    await expect(page.getByText('Scenario A: Broad aggregate watchers')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario A2: Scope read / full snapshot stress')).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Table Only' }).click();
    await expect(page.getByText('Scenario A: Broad aggregate watchers')).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario A2: Scope read / full snapshot stress')).toHaveCount(0, {
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Full Stress' }).click();
    await expect(page.getByText('Scenario B: Nested loop card list')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario C: Scope-owned selection and pagination')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario D: Editable subset form')).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Run 20 Host Mutations' }).click();
    await expect(page.getByText('Last Measurement')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Host row mutation benchmark: 20 updates')).toBeVisible({
      timeout: 60_000,
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.text-lg.font-semibold'));
          const commitsCard = cards[3]?.textContent?.trim() ?? '0';
          return Number.parseInt(commitsCard, 10);
        }),
      )
      .toBeGreaterThan(0);
    await expect(page.getByText(/Scheduling \+ settle:/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Commit count:/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Total commit duration:/)).toBeVisible({ timeout: 60_000 });
  });

  test('resets the measurement panel after a host benchmark run', async ({ page }) => {
    test.setTimeout(120_000);

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
    await waitForTableRows(page);

    const firstRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
      const dataRow = rows.find((row) => row.querySelectorAll('td').length >= 10);
      if (!dataRow) return null;
      const cells = dataRow.querySelectorAll('td');
      const profile = cells[2]?.textContent?.trim();
      const badge = cells[3]?.textContent?.trim();
      const status = cells[4]?.textContent?.trim();
      const selectBtn = cells[5]?.querySelector('button[role="combobox"]');
      const selectEl = cells[5]?.querySelector('select') as HTMLSelectElement | null;
      const checkbox = cells[6]?.querySelector('[data-slot="checkbox"]');
      const sw = cells[7]?.querySelector('[role="switch"]');
      const textarea = cells[8]?.querySelector('textarea');
      return {
        profile,
        badge,
        status,
        select: selectBtn?.textContent?.trim() ?? selectEl?.selectedOptions[0]?.textContent?.trim(),
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
        await expect(page.locator('table tbody tr')).toHaveCount(50);
      }
    }
    await expect
      .poll(() =>
        page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
          return rows
            .some((row) => row.textContent?.includes('951'));
        }),
      )
      .toBe(true);

    const lastPageFirstRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
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
      const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
      for (let i = rows.length - 1; i >= 0; i--) {
        const cells = rows[i].querySelectorAll('td');
        const profile = cells[2]?.textContent?.trim();
        if (profile && profile.includes('1000')) {
          const sw = cells[7]?.querySelector('[role="switch"]');
          const cb = cells[6]?.querySelector('[data-slot="checkbox"]');
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

  test('keeps tag-list validation local to the edited row', async ({ page }) => {
    test.setTimeout(120_000);
    await openPerformanceTable(page);
    await waitForTableRows(page);

    const firstTagButton = page.getByRole('button', { name: 'tag-1' }).first();
    await expect(firstTagButton).toBeVisible();

    await firstTagButton.click();

    await expect(page.getByText('requires at least one tag')).toHaveCount(0);
  });
});
