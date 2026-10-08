import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-7a (plan 550) P1 red→green specs for the complex-pages batch.
// Each case reproduces a finding from the plan-550 two-group live audit;
// convictions cite programmatic readings, never screenshots.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

async function toastTexts(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-sonner-toast]')].map((t) => t.textContent ?? ''),
  );
}

test.describe('IS-7a complex-pages interaction state (plan 550)', () => {
  // IS-master-detail-001: the operation-column 删除 button never rendered
  // (missing `type: "button"`), and once rendered it deleted nothing — the
  // ajax arg used the AMIS-style `${record?.id}` while the flux row scope
  // exposes the row as `${$slot.record}`. Green: the button renders per row,
  // the confirm resolves, and the row disappears (also after a forced reload).
  test('master-detail: item row delete renders and deletes', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/master-detail');
    await page.getByText('NO-20240702', { exact: false }).first().click();
    await page.waitForTimeout(1500);

    const table = page.locator('[data-testid="md-items-table"]');
    const rowsBefore = await table.locator('tbody tr').count();
    expect(rowsBefore, 'order 20240702 seeds two item rows').toBe(2);
    await expect(table.locator('[data-testid="btn-delete-item"]').first()).toBeVisible();

    await table.locator('[data-testid="btn-delete-item"]').first().click();
    const alert = page.getByRole('alertdialog');
    await expect(alert, 'confirmText gate must open the confirm alert').toBeVisible();
    await alert.getByRole('button', { name: '确认' }).click();

    await expect(alert).toBeHidden({ timeout: 3_000 });
    await expect(table.locator('tbody tr')).toHaveCount(1, { timeout: 4_000 });
    await expect(table.locator('tbody tr').first()).toContainText('SKU-B01');

    // Force a dependsOn reload (switch order away and back): the deletion
    // must be real (mock DB), not a client-side-only row removal.
    await page.getByText('NO-20240701', { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByText('NO-20240702', { exact: false }).first().click();
    await page.waitForTimeout(1500);
    await expect(table.locator('tbody tr')).toHaveCount(1);
    await assertTrackedPageErrors(page);
  });

  // IS-advanced-query-001: the client-side query channel (loadAllData mode)
  // matched dict-shaped cells ({value,label}) with scalar query values and had
  // no range semantics, so role/minId/maxId queries produced permanent empty
  // results with zero feedback. Green: role=管理员 matches 11 rows, minId=5
  // starts at id 5, maxId=3 yields 3 rows, status control stays green.
  test('advanced-query: role and ID-range filters return real results', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/advanced-query');
    const crud = page.locator('[data-testid="adv-query-crud"]');
    const query = crud.locator('[data-slot="crud-query"]');
    const tbodyRows = crud.locator('tbody tr');
    const emptyCell = crud.locator('tbody td');

    // Control: status=禁用 still filters (8 seeded rows).
    await query.locator('[role="combobox"]').first().click();
    await page.getByRole('option', { name: '禁用' }).first().click();
    await query.getByRole('button', { name: '搜索' }).click();
    await page.waitForTimeout(900);
    expect(await tbodyRows.count(), 'status=禁用 filters to 8 rows').toBe(8);
    await query.getByRole('button', { name: '重置' }).click();
    await page.waitForTimeout(700);

    // role=管理员 — 11 seeded matches.
    await query.locator('[role="combobox"]').nth(1).click();
    await page.getByRole('option', { name: '管理员' }).first().click();
    await query.getByRole('button', { name: '搜索' }).click();
    await page.waitForTimeout(900);
    const roleCells = await crud.locator('tbody tr td:nth-child(4)').allTextContents();
    expect(await tbodyRows.count(), 'role=管理员 must not collapse to the empty state').toBe(10);
    for (const cell of roleCells) {
      expect(cell.trim(), 'every result row must carry the 管理员 role').toBe('管理员');
    }
    const totalText = (await crud.textContent()) ?? '';
    expect(totalText).toContain('共 11 条');
    await query.getByRole('button', { name: '重置' }).click();
    await page.waitForTimeout(700);

    // minId=5 — range convention; first visible id must be 5.
    await query.getByPlaceholder('ID ≥').fill('5');
    await query.getByRole('button', { name: '搜索' }).click();
    await page.waitForTimeout(900);
    expect((await emptyCell.first().textContent())?.trim(), 'minId=5 must not produce the empty state').not.toBe('暂无数据');
    expect(await crud.locator('tbody tr td').first().textContent(), 'first row id must honor minId=5').toBe('5');
    await query.getByRole('button', { name: '重置' }).click();
    await page.waitForTimeout(700);

    // maxId=3 — upper bound convention.
    await query.getByPlaceholder('ID ≤').fill('3');
    await query.getByRole('button', { name: '搜索' }).click();
    await page.waitForTimeout(900);
    expect(await tbodyRows.count(), 'maxId=3 must yield exactly ids 1..3').toBe(3);
    await query.getByRole('button', { name: '重置' }).click();
    await page.waitForTimeout(700);
    expect(await tbodyRows.count(), 'reset restores the unfiltered page').toBe(10);
    await assertTrackedPageErrors(page);
  });

  // IS-business-document-001: the shell's fixed bottom-right theme switcher
  // covered the 提交采购单 button across the whole scroll range at 1280×720 —
  // the primary action was pointer-unreachable. Green: the showcase frame
  // reserves the switcher band (pb-20), so the button is clickable at
  // multiple scroll positions and never intersects the switcher rectangle.
  test('business-document: order-submit reachable past the theme switcher', async ({ page, allowConsoleErrors }) => {
    // The reachability probe deliberately submits the EMPTY form (the click
    // landing is the point); the demo backend logs each rejected submit as
    // `[showcase] action error` — a mock validation-failure log, not a page
    // defect (registered probe noise in the plan-550 audit). Two clicks,
    // two rejected submits (2 logs each). The success path is covered by the
    // business-document-002 case.
    allowConsoleErrors(4);
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoPage(page, '/#/complex-pages/business-document');

    const submit = page.getByTestId('order-submit');
    const rects = () =>
      page.evaluate(() => {
        const btn = document.querySelector('[data-testid="order-submit"]') as HTMLElement | null;
        const sw = document.querySelector('[data-testid="theme-switcher"]') as HTMLElement | null;
        if (!btn || !sw) return null;
        const b = btn.getBoundingClientRect();
        const s = sw.getBoundingClientRect();
        const overlap =
          !(b.right < s.left || b.left > s.right || b.bottom < s.top || b.top > s.bottom);
        return { overlap };
      });

    // The empty-form submit is blocked by validation (expected toast) — what
    // matters here is that the CLICK lands on the button, not the switcher.
    await submit.click({ timeout: 5_000 });
    await page.waitForTimeout(600);
    let geo = await rects();
    expect(geo?.overlap, 'no overlap after scrollIntoView click').toBe(false);
    expect((await toastTexts(page)).join(''), 'empty submit must be blocked by validation').toContain('不能为空');

    // Scroll the page frame to the very bottom and click again.
    await page.evaluate(() => {
      const frame = document.querySelector('[data-testid="business-document-frame"]') as HTMLElement | null;
      if (frame) frame.scrollTop = frame.scrollHeight;
    });
    await page.waitForTimeout(400);
    geo = await rects();
    expect(geo?.overlap, 'no overlap at max scroll').toBe(false);
    await submit.click({ timeout: 5_000 });

    // Shell sanity: the switcher stays visible and operable on other routes.
    await gotoPage(page, '/#/');
    const sw = page.getByTestId('theme-switcher');
    await expect(sw).toBeVisible();
    await sw.getByRole('combobox').first().selectOption('glass');
    await sw.getByRole('combobox').first().selectOption('classic');
    await gotoPage(page, '/#/complex-pages/standard-crud');
    await expect(page.getByTestId('theme-switcher')).toBeVisible();
  });

  // IS-form-wizard-002: step 2's department picker trigger was dead to real
  // pointer clicks — the APG step-entry focus focused the role combobox, and
  // the user's first click blurred it, firing blur validation whose inserted
  // required error shifted the layout mid-press so the click never landed.
  // Green: real coordinate click opens the picker dialog with zero console
  // errors (the step-2-mount render-phase setState warning is gone too —
  // IS-form-wizard-001, fixed by deferring the initial form publication).
  test('form-wizard: picker opens on a real pointer click', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/form-wizard');
    await page.locator('input').first().fill('王小明');
    await page.locator('input').nth(1).fill('wxm@example.com');
    await page.getByTestId('wizard-next').click();
    await page.waitForTimeout(2000);

    const trigger = page.locator('[data-slot="picker-trigger"]');
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect(trigger, 'real pointer click must open the picker').toHaveAttribute(
      'aria-expanded',
      'true',
      { timeout: 3_000 },
    );
    await expect(page.locator('[data-slot="picker-dialog-content"]')).toBeVisible();
    const roleError = await page.evaluate(() =>
      [...document.querySelectorAll('.field-error, [data-slot="field-error"]')].some((el) =>
        (el.textContent ?? '').includes('角色不能为空'),
      ),
    );
    expect(roleError, 'no spurious role required error may appear').toBe(false);
    await assertTrackedPageErrors(page);
  });

  // IS-approval-tasks-001: confirmText actions inside a dialog surface were
  // dead — the confirm alert reserved its z-index at page load and rendered
  // below the task dialog's overlay, so 确认 clicks landed on the overlay.
  // Green: the confirm stacks above (reserved at open), resolves, the reject
  // commits, and the row flips to 已驳回.
  test('approval-tasks: reject confirmText inside the task dialog commits', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/approval-tasks');
    const crud = page.locator('[data-testid="approval-crud"]');
    const firstRowBefore = (await crud.locator('tbody tr').first().textContent()) ?? '';
    expect(firstRowBefore).toContain('待审批');

    await crud.locator('[data-testid="btn-handle"]').first().click();
    await page.waitForTimeout(1200);
    await page.locator('[data-testid="btn-reject"]').click();
    const alert = page.getByRole('alertdialog');
    await expect(alert, 'confirmText gate opens').toBeVisible();

    await alert.getByRole('button', { name: '确认' }).click();
    await expect(alert, 'confirm must close').toBeHidden({ timeout: 3_000 });
    await page.waitForTimeout(1500);

    const toasts = await toastTexts(page);
    expect(toasts.join(''), 'reject must surface its success message').toContain('已驳回');
    const firstRowAfter = (await crud.locator('tbody tr').first().textContent()) ?? '';
    expect(firstRowAfter, 'row status must flip to 已驳回').toContain('已驳回');
    expect(
      await page.evaluate(() => !!document.querySelector('[data-slot="dialog-surface"]')),
      'task dialog closes after the commit',
    ).toBe(false);
    await assertTrackedPageErrors(page);
  });

  // IS-combo-editor-001: submitting seeded valid combo rows raised a false
  // 「姓名不能为空」 — the compiler put row-child rules at bare form-root
  // paths and submit validation read a scope path that never exists.
  // Green: 保存联系人 commits and the snapshot report flips to 已保存 ✓.
  test('combo-editor: seeded valid rows save without false required errors', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/combo-editor');
    await page.getByTestId('contacts-submit').click();
    await page.waitForTimeout(2000);

    const toasts = await toastTexts(page);
    expect(toasts.join(''), 'no false required toast may appear').not.toContain('不能为空');
    expect(toasts.join(''), 'save must succeed').toContain('联系人已保存');
    await expect(page.getByTestId('contacts-save-report')).toContainText('已保存 ✓');
    await assertTrackedPageErrors(page);
  });

  // IS-business-document-002: same family — input-table row children with a
  // required sub-field blocked the whole submit with a false「name不能为空」.
  // Green: filling only the supplier and submitting commits the purchase
  // order (seeded rows already carry names).
  test('business-document: valid form submits without false required errors', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/business-document');
    await page.locator('input').first().fill('华东供应链有限公司');
    await page.getByTestId('order-submit').click();
    await page.waitForTimeout(2200);

    const toasts = await toastTexts(page);
    expect(toasts.join(''), 'no false name-required toast may appear').not.toContain('不能为空');
    expect(toasts.join(''), 'submit must succeed').toContain('采购单已提交');
    await assertTrackedPageErrors(page);
  });

  // IS-approval-tasks-002: the dead dependsOn sentinel gated the reactive
  // reload channel — the status filter committed its label but the crud never
  // re-queried. Green (sentinel removed): filtering re-queries the mock.
  test('approval-tasks: status filter re-queries the visible row set', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/approval-tasks');
    const rows = page.locator('[data-testid="approval-crud"] tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const before = await rows.count();
    const combo = page.locator('[data-testid="approval-crud"] [role="combobox"]').first();
    await combo.click();
    await page.getByRole('option', { name: '已通过' }).first().click();
    // the crud query contract is search-button driven (same as standard-crud)
    await page.locator('[data-testid="approval-crud"]').getByRole('button', { name: '搜索' }).click();
    await page.waitForTimeout(1200);
    const after = await rows.count();
    const statuses = await page.evaluate(() => {
      return [...document.querySelectorAll('[data-testid="approval-crud"] tbody td')]
        .map((td) => td.textContent ?? '')
        .filter((t) => t === '已通过');
    });
    expect(after, `status filter must change the visible row set (before ${before}, after ${after})`).toBeLessThan(before);
    expect(statuses.length, 'every visible status cell is 已通过 after filtering').toBe(after);
    await assertTrackedPageErrors(page);
  });
});
