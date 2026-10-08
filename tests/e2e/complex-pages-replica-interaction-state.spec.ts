import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-7b (plan 551) P1 red→green specs for the complex-pages replica batch.
// Each case reproduces a finding from the plan-551 dual-review live audit;
// convictions cite programmatic readings, never screenshots.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test.describe('IS-7b complex-pages replica interaction state (plan 551)', () => {
  // IS-antdpro-list-001/002: the toolbar 密度 and page 批量导出 buttons
  // rendered with no behavior (schema had no onClick) — dead controls.
  // Green (controls removed per the 550 dead-control precedent): the dead
  // testids no longer render and the surviving toolbar still works.
  test('antdpro-list: dead toolbar controls are gone, refresh still works', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/antdpro-list');
    await expect(page.locator('[data-testid="antdpro-list-crud"]').first()).toBeVisible({ timeout: 15_000 });
    const dead = await page.evaluate(() => ({
      density: document.querySelectorAll('[data-testid="antdpro-toolbar-density"]').length,
      export: document.querySelectorAll('[data-testid="antdpro-list-export"]').length,
    }));
    expect(dead.density, 'dead 密度 control must not render').toBe(0);
    expect(dead.export, 'dead 批量导出 control must not render').toBe(0);
    const refresh = page.getByTestId('antdpro-toolbar-refresh');
    await expect(refresh, 'the live toolbar affordance survives').toBeVisible();
    await assertTrackedPageErrors(page);
  });

  // IS-antdpro-form-grouped-001: the page was three sibling forms — only the
  // owner card had a submit channel, so zero-fill submits SUCCEEDED with a
  // false「入库登记已提交」while the required-starred 入库编号/经手人 never
  // validated. Green (cards merged under one real form): empty submit is
  // gated with per-field errors and no success toast.
  test('antdpro-form-grouped: empty submit is gated by required validation', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/antdpro-form-grouped');
    const submit = page.getByTestId('antdpro-grouped-submit');
    await expect(submit).toBeVisible({ timeout: 15_000 });
    await submit.click();
    await page.waitForTimeout(800);
    const state = await page.evaluate(() => ({
      toasts: [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''),
      invalid: document.querySelectorAll('[aria-invalid="true"], [data-invalid]').length,
    }));
    expect(
      state.toasts.join(''),
      'empty submit must not succeed (the false 入库登记已提交 feedback)',
    ).not.toContain('入库登记已提交');
    expect(state.toasts.join(''), 'required fields must surface a validation toast').toContain('不能为空');
    expect(state.invalid, 'required fields must be flagged invalid').toBeGreaterThan(0);
    // the merge must preserve all 10 fields across the three cards (R1 Blocker:
    // the first merge silently dropped remark/needReview/ownerDept/ownerPerson)
    const fieldInventory = await page.evaluate(() => {
      const form = document.querySelector('[data-testid="antdpro-grouped-form"]');
      const names = [...(form?.querySelectorAll('input, textarea, select') ?? [])].map((el) => el.getAttribute('name'));
      const labels = [...(form?.querySelectorAll('label') ?? [])].map((el) => el.textContent ?? '');
      const text = form?.textContent ?? '';
      return {
        count: names.length,
        // the four fields the first merge silently dropped (R1 Blocker), by
        // schema name or visible label
        hasRemark: names.includes('remark') || text.includes('货物备注'),
        hasNeedReview: labels.some((l) => l.includes('入库后需质检复核')),
        hasOwnerDept: names.includes('ownerDept') || text.includes('责任部门'),
        hasOwnerPerson: names.includes('ownerPerson') || text.includes('责任人'),
      };
    });
    expect(fieldInventory.count, 'all fields must render across the three cards (10 schema fields; 入库日期 renders as a popover trigger button, hence 9 form elements)').toBeGreaterThanOrEqual(9);
    expect(fieldInventory.hasRemark, 'the remark field must survive the merge').toBe(true);
    expect(fieldInventory.hasNeedReview, 'the needReview field must survive the merge').toBe(true);
    expect(fieldInventory.hasOwnerDept, 'the ownerDept field must survive the merge').toBe(true);
    expect(fieldInventory.hasOwnerPerson, 'the ownerPerson field must survive the merge').toBe(true);
    // reset covers the whole merged form (grouped-002): fill → reset → cleared
    const entryNo = page.locator('[data-testid="antdpro-grouped-form"] input').first();
    await entryNo.fill('RK-AFTER-RESET');
    await page.getByTestId('antdpro-grouped-reset').click();
    await page.waitForTimeout(500);
    await expect(entryNo, 'reset must clear the merged form (grouped-002)').toHaveValue('');
    await assertTrackedPageErrors(page);
  });

  // IS-antdpro-form-dialog-001: AntdPro__submitForm returned {ok, id} without
  // persisting — 「订单已创建」 was false feedback. Green (mock persists via
  // the saveOrder path): the created order is findable in the list.
  test('antdpro-form-dialog: created order persists to the list', async ({ page }) => {
    const customer = `IS7B验证${Date.now() % 100000}`;
    await gotoPage(page, '/#/complex-pages/antdpro-form-dialog');
    await page.getByTestId('antdpro-dialog-open').click();
    await page.waitForTimeout(600);
    const firstInput = page.locator('[data-testid="antdpro-dialog-form"] input').first();
    await firstInput.fill(customer);
    await page
      .locator('[data-testid="antdpro-dialog-form"]')
      .getByRole('button', { name: /提交|保存|确定/ })
      .first()
      .click();
    await page.waitForTimeout(1200);
    const toast = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''));
    expect(toast.join(''), 'the creation toast must appear').toContain('订单已创建');
    // same-session list search must find the persisted order
    await gotoPage(page, '/#/complex-pages/antdpro-list');
    const kw = page.locator('[data-testid="antdpro-list-crud"] input').first();
    await kw.fill(customer);
    await page
      .locator('[data-testid="antdpro-list-crud"]')
      .getByRole('button', { name: '搜索' })
      .click()
      .catch(() => {});
    await page.waitForTimeout(1200);
    const found = await page.evaluate((name) => document.body.innerText.includes(name), customer);
    expect(found, 'the created order must be findable in the list (persist, not just toast)').toBe(true);
    await assertTrackedPageErrors(page);
  });

  // IS-linear-inbox-001: the fixed h-12 topbar band painted over the lower
  // half of the bulk buttons — center clicks hit the group header. Green
  // (self-sizing topbar band): a center click lands on the button and applies.
  test('linear-inbox: bulk mark-all-read works from a center click', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/linear-inbox');
    const btn = page.getByRole('button', { name: /全部标为已读/ }).first();
    await expect(btn).toBeVisible({ timeout: 15_000 });
    const before = await page.evaluate(() => document.body.innerText.match(/\d+ 条未读/)?.[0] ?? null);
    await btn.click();
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => document.body.innerText.match(/\d+ 条未读/)?.[0] ?? null);
    const toasts = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''));
    expect(after, `center click must apply (before ${before}, after ${after}; unchanged = the occlusion defect)`).toBe('0 条未读');
    expect(toasts.join(''), 'the success toast must surface').toContain('已全部标为已读');
    await assertTrackedPageErrors(page);
  });
});
