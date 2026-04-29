import { expect, test } from '@playwright/test';

test('diagnose performance table display', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/#/performance-table', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Table Performance Playground' })).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(3000);

  // Header info
  const headerInfo = await page.evaluate(() => {
    const all = document.querySelectorAll('div, span, p');
    const matches: string[] = [];
    for (const el of all) {
      const t = el.textContent?.trim();
      if (t && t.includes('Dataset size')) {
        matches.push(t);
      }
    }
    return matches;
  });
  console.log('=== HEADER (page 1) ===');
  console.log(headerInfo.join('\n'));

  // Pagination bar
  const pagBar = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="table-pagination"]');
    return el ? el.innerText : 'NOT FOUND';
  });
  console.log('=== PAGINATION (page 1) ===');
  console.log(pagBar);

  // First 3 data rows
  const rows1 = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const result: string[][] = [];
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const cells = rows[i].querySelectorAll('td');
      result.push(Array.from(cells).map(c => c.textContent?.trim().substring(0, 100) ?? ''));
    }
    return { count: rows.length, data: result };
  });
  console.log(`=== FIRST 3 ROWS (total visible: ${rows1.count}) ===`);
  rows1.data.forEach((r, i) => console.log(`Row ${i}:`, r));

  // Click Next page
  const nextBtn = page.locator('[data-slot="table-pagination"] a, [data-slot="table-pagination"] button').last();
  await nextBtn.click();
  await page.waitForTimeout(2000);

  const headerInfo2 = await page.evaluate(() => {
    const all = document.querySelectorAll('div, span, p');
    const matches: string[] = [];
    for (const el of all) {
      const t = el.textContent?.trim();
      if (t && t.includes('Dataset size')) {
        matches.push(t);
      }
    }
    return matches;
  });
  console.log('\n=== HEADER (page 2) ===');
  console.log(headerInfo2.join('\n'));

  const pagBar2 = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="table-pagination"]');
    return el ? el.innerText : 'NOT FOUND';
  });
  console.log('=== PAGINATION (page 2) ===');
  console.log(pagBar2);

  const rows2 = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const result: string[][] = [];
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const cells = rows[i].querySelectorAll('td');
      result.push(Array.from(cells).map(c => c.textContent?.trim().substring(0, 100) ?? ''));
    }
    return { count: rows.length, data: result };
  });
  console.log(`=== PAGE 2 FIRST 3 ROWS (total visible: ${rows2.count}) ===`);
  rows2.data.forEach((r, i) => console.log(`Row ${i}:`, r));

  // Go to last page (20)
  const lastPageBtn = page.locator('[data-slot="table-pagination"]').getByText('20');
  if (await lastPageBtn.isVisible()) {
    await lastPageBtn.click();
  } else {
    // Try navigating forward several times
    for (let i = 0; i < 20; i++) {
      const next = page.locator('[data-slot="table-pagination"] a, [data-slot="table-pagination"] button').last();
      await next.click();
      await page.waitForTimeout(500);
    }
  }
  await page.waitForTimeout(2000);

  const headerInfo3 = await page.evaluate(() => {
    const all = document.querySelectorAll('div, span, p');
    const matches: string[] = [];
    for (const el of all) {
      const t = el.textContent?.trim();
      if (t && t.includes('Dataset size')) {
        matches.push(t);
      }
    }
    return matches;
  });
  console.log('\n=== HEADER (last page) ===');
  console.log(headerInfo3.join('\n'));

  const pagBar3 = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="table-pagination"]');
    return el ? el.innerText : 'NOT FOUND';
  });
  console.log('=== PAGINATION (last page) ===');
  console.log(pagBar3);

  const rows3 = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const result: { idx: number; cells: string[] }[] = [];
    for (let i = 0; i < Math.min(2, rows.length); i++) {
      const cells = rows[i].querySelectorAll('td');
      result.push({ idx: i, cells: Array.from(cells).map(c => c.textContent?.trim().substring(0, 100) ?? '') });
    }
    if (rows.length > 2) {
      const lastIdx = rows.length - 1;
      const cells = rows[lastIdx].querySelectorAll('td');
      result.push({ idx: lastIdx, cells: Array.from(cells).map(c => c.textContent?.trim().substring(0, 100) ?? '') });
    }
    return { count: rows.length, data: result };
  });
  console.log(`=== LAST PAGE ROWS (total visible: ${rows3.count}) ===`);
  rows3.data.forEach(r => console.log(`Row ${r.idx}:`, r.cells));

  // Check that at least one row is rendered
  expect(rows1.count).toBeGreaterThan(0);
  expect(rows2.count).toBeGreaterThan(0);
  expect(rows3.count).toBeGreaterThan(0);
});
