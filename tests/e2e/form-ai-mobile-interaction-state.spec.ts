import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-6 (plan 549) P1 red→green specs for the form/AI/mobile batch.
// Each case reproduces a finding from the plan-549 three-group live audit;
// convictions cite programmatic readings, never screenshots.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test.describe('IS-6 form/AI/mobile interaction state (plan 549)', () => {
  // IS-w2b-date-family-001: the ui Calendar rebuilt its components object per
  // render, so the focused-day re-render a real pointerdown causes remounted
  // the whole day tree mid-click — the pressed button was replaced and the
  // selection silently lost. Green: a real coordinate click commits.
  test('date: day-cell click commits the selection', async ({ page }) => {
    await gotoPage(page, '/#/w2b-date-family');
    const trigger = page.locator('button').filter({ hasText: /^\d{2}\/\d{2}\/\d{4}$/ }).first();
    await trigger.click();
    const dayBtn = page.locator('button[data-day="2024/6/15"]').first();
    await expect(dayBtn, 'calendar must mount day buttons').toBeVisible({ timeout: 10_000 });
    const box = await dayBtn.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(
      trigger,
      'day-cell click must commit (trigger shows DD/MM/YYYY display format)',
    ).toHaveText('15/06/2024', { timeout: 3_000 });
    await assertTrackedPageErrors(page);
  });

  // IS-diff-view-001: host controls updated state but the mounted renderer
  // never saw schema-prop updates (SchemaRenderer static-schema semantics).
  // Green: switching View Type to unified rebuilds the diff as unified.
  test('diff-view: host View Type control reaches the renderer', async ({ page }) => {
    await gotoPage(page, '/#/diff-view');
    const viewType = page.locator('select').nth(1);
    await expect(viewType).toBeVisible({ timeout: 10_000 });
    await viewType.selectOption('unified');
    await page.waitForTimeout(800);
    const unified = await page.locator('.nop-diff-unified-view').count();
    expect(unified, 'unified view must mount after the host select change').toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  // IS-component-handles-001: the checkbox-group handle only declared focus,
  // so component:clear resolved to "Unsupported component method" and was
  // silently swallowed. Green: Clear Checkbox Group unchecks every option.
  test('component-handles: clear checkbox group clears all options', async ({ page }) => {
    await gotoPage(page, '/#/component-handles');
    const clearBtn = page.getByRole('button', { name: 'Clear Checkbox Group' });
    await expect(clearBtn).toBeVisible({ timeout: 10_000 });
    const before = await page
      .locator('[role="checkbox"][aria-checked="true"], [data-slot="checkbox"][data-checked="true"], input[type="checkbox"]:checked')
      .count();
    expect(before, 'fixture starts with two checked options').toBeGreaterThan(0);
    await clearBtn.click();
    await page.waitForTimeout(500);
    const after = await page
      .locator('[role="checkbox"][aria-checked="true"], [data-slot="checkbox"][data-checked="true"], input[type="checkbox"]:checked')
      .count();
    expect(after, 'component:clear must uncheck the group').toBe(0);
    await assertTrackedPageErrors(page);
  });

  // IS-component-handles-002: form.reset() with no explicit values wiped every
  // field to "" instead of restoring the creation-time defaults. Green: after
  // editing the name, Reset Form restores Alice.
  test('component-handles: Reset Form restores data defaults', async ({ page }) => {
    await gotoPage(page, '/#/component-handles');
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill('Bob');
    const resetBtn = page.getByRole('button', { name: 'Reset Form' });
    await resetBtn.click();
    await page.waitForTimeout(500);
    await expect(nameInput, 'form-level reset must restore data defaults').toHaveValue('Alice');
    await assertTrackedPageErrors(page);
  });

  // IS-ai-conversations-001: the demo page declared xui:imports whose overlay
  // captured schema-event writes and blocked page-data notifications (bug 163)
  // — the sidebar was functionally dead. Green (bug-163 mitigation, ai-coverage
  // precedent): New Conversation creates a list entry.
  test('ai-conversations: New Conversation creates a list entry', async ({ page }) => {
    await gotoPage(page, '/#/ai-conversations');
    const createBtn = page.locator('[data-slot="ai-conversations-create"]');
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
    await expect
      .poll(async () => (await page.locator('[data-slot="ai-conversations-list"] > *').count()), {
        timeout: 5_000,
        message: 'created conversation must appear in the list',
      })
      .toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  // IS-mobile-components-001: the host's unmount clearTimeout canceled the
  // in-flight fake fetch during StrictMode's simulated remount and nothing
  // re-armed the flow — stuck on 加载中... forever. Green: the first page-load
  // completes (status leaves loading, items grow past the first page).
  test('mobile-components: infinite scroll completes its first load', async ({ page }) => {
    await gotoPage(page, '/#/mobile-components');
    const status = page.locator('[data-testid="demo-infinite-scroll"]');
    await expect(status).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(
        async () => status.getAttribute('data-status'),
        { timeout: 6_000, message: 'initial load-more must settle (stuck loading = the timer defect)' },
      )
      .not.toBe('loading');
    const items = await page.locator('[data-testid="infinite-scroll-body-text"] > div').count();
    expect(items, 'first loaded page appends items').toBeGreaterThan(4);
    await assertTrackedPageErrors(page);
  });

  // IS-m5-showcase-001: the demo schema declared onClick.ajax.onSuccess but
  // the button ajax path only consumes messages.* — zero feedback. Green (demo
  // switched to messages.success): add-to-cart surfaces the promised toast.
  test('m5-showcase: add-to-cart surfaces the success toast', async ({ page }) => {
    await gotoPage(page, '/#/m5-showcase');
    const addBtn = page.getByRole('button', { name: '加入购物车' }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast, 'button ajax success must surface the promised feedback').toBeVisible({
      timeout: 5_000,
    });
    await expect(toast).toContainText('已加入购物车');
    await assertTrackedPageErrors(page);
  });
});
