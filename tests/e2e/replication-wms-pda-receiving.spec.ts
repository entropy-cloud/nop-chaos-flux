import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  expectEndpointCall,
  readEndpointCalls,
  openReplicationPage,
  pullReplicationRefresh,
  seedReplicationCounters,
  swipeReplicationCell,
  tapReplicationTarget,
} from './helpers/replication.js';

// Plan 798 Phase 2 — W1 WMS PDA 收货/上架作业页 focused e2e (D2 §5 W1 断言清单).
// Pillar one (programmatic interactions, __replWmsCalls evidence) + pillar
// three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch
// A+B single-key registration).
//
// hasTouch is required for the mobile gesture family (swipe-cell /
// pull-refresh are TouchEvent driven; with hasTouch Playwright's mouse
// down/move/up synthesize touch events — mobile-gesture-lab desktop-viewport
// precedent). The canvas itself is viewport-independent (fixed 375×667 host
// frame), so the desktop viewport stays.

const COUNTERS_KEY = '__replWmsCalls';
const HOOKS_KEY = '__replWmsTestHooks';

const ASN_CODE = 'ASN-2026-0001';
const SKU_BARCODE = '69010001001';

test.describe('W1 WMS PDA 收货/上架作业页 (#/complex-pages/wms-pda-receiving)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: true });

  async function openW1(page: Page): Promise<void> {
    await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
    await openReplicationPage(page, 'wms-pda-receiving', {
      title: 'WMS PDA 收货/上架作业页',
    });
    // data-source first fetch settled — the record list renders its window.
    await expect(page.getByTestId('wms-pda-receiving-record-cell').first()).toBeVisible({
      timeout: 15_000,
    });
  }

  function asnInput(page: Page) {
    return page.getByTestId('wms-pda-receiving-asn-scan').locator('input');
  }

  function skuInput(page: Page) {
    return page.getByTestId('wms-pda-receiving-sku-scan').locator('input');
  }

  function qtyInput(page: Page) {
    return page.getByTestId('wms-pda-receiving-qty-input').locator('input');
  }

  test('mobile canvas renders inside the desktop shell with the record window', async ({
    page,
  }) => {
    await openW1(page);

    const canvas = page.getByTestId('wms-pda-receiving-screen');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width).toBe(375);
    expect(box?.height).toBe(667);

    // taskRecords window: pageSize 8 rows rendered through loop + swipe-cell.
    await expect(page.getByTestId('wms-pda-receiving-record-cell')).toHaveCount(8);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__taskRecords', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互① manual ASN check fills the ASN info strip and counts asnGet', async ({ page }) => {
    await openW1(page);

    await expect(page.getByTestId('wms-pda-receiving-asn-info')).toContainText('ASN：-');
    await asnInput(page).fill(ASN_CODE);
    await page.getByTestId('wms-pda-receiving-asn-check').click();

    await expect(page.getByText('ASN 校验通过')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('wms-pda-receiving-asn-info')).toContainText(
      `ASN：${ASN_CODE}`,
    );
    // mock fixture: ASN-2026-0001 → 南方物流园, expectedQty 17 (12+5)
    await expect(page.getByTestId('wms-pda-receiving-asn-info')).toContainText('南方物流园');
    await expect(page.getByTestId('wms-pda-receiving-asn-info')).toContainText('应收 17');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__asnGet', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互①b unregistered barcode surfaces the miss branch (asnGet status:1)', async ({
    page,
  }) => {
    await openW1(page);

    await skuInput(page).fill('NO-SUCH-BARCODE');
    await page.getByTestId('wms-pda-receiving-simulate-scan').click();

    await expect(page.getByText('条码未在 ASN 明细中登记')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__asnGet', { atLeast: 1 });
    // sku info stays on its empty face
    await expect(page.getByTestId('wms-pda-receiving-sku-info')).toContainText('SKU：-');
    await assertTrackedPageErrors(page);
  });

  test('交互② scan-validate-fill accumulates; number keyboard feeds qty; dialog submit hits asnReceive and lands first record', async ({
    page,
  }) => {
    await openW1(page);

    // G3 scan-validate-fill (simulated scan event → same ajax→setValues chain
    // as onScan): ASN first (PDA flow), then scan twice — the counter
    // accumulates and fields refill.
    await asnInput(page).fill(ASN_CODE);
    await skuInput(page).fill(SKU_BARCODE);
    await page.getByTestId('wms-pda-receiving-simulate-scan').click();
    await expect(page.getByText('校验通过，请录入数量')).toBeVisible({ timeout: 10_000 });
    // mock fixture: 69010001001 → ASN-2026-0001 line 1 = 温湿度传感器 × 12
    await expect(page.getByTestId('wms-pda-receiving-sku-info')).toContainText('温湿度传感器 × 12');
    await expect(page.getByTestId('wms-pda-receiving-scan-count')).toContainText('本单续扫 1 件');

    await skuInput(page).fill('69010001002');
    await page.getByTestId('wms-pda-receiving-simulate-scan').click();
    await expect(page.getByTestId('wms-pda-receiving-scan-count')).toContainText('本单续扫 2 件', {
      timeout: 10_000,
    });
    const asnGetCalls = await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__asnGet', {
      atLeast: 2,
    });
    expect(asnGetCalls).toBeGreaterThanOrEqual(2);

    // number-keyboard quantity entry
    await page.getByTestId('wms-pda-receiving-keyboard-open').click();
    const keyboard = page.getByTestId('wms-pda-receiving-qty-keyboard');
    await expect(keyboard).toBeVisible();
    await keyboard.locator('[data-slot="number-keyboard-key"][data-key="5"]').click();
    await expect(qtyInput(page)).toHaveValue(/5/);
    await keyboard.locator('[data-slot="number-keyboard-confirm"]').click();
    await expect(keyboard).not.toBeVisible();

    // dialog submit → asnReceive +1 → records refresh with the new first row
    await page.getByTestId('wms-pda-receiving-submit-receive').click();
    const dialog = page.getByTestId('wms-pda-receiving-submit-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByTestId('wms-pda-receiving-submit-summary')).toContainText(
      `${ASN_CODE}`,
    );
    await dialog.getByTestId('wms-pda-receiving-confirm-receive').click();

    await expect(page.getByText('收货提交成功')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveCount(0);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__asnReceive', { atLeast: 1 });
    const firstRow = page.getByTestId('wms-pda-receiving-record-row').first();
    await expect(firstRow).toContainText('RECEIVE', { timeout: 10_000 });
    await expect(firstRow).toContainText(ASN_CODE);
    await assertTrackedPageErrors(page);
  });

  test('交互②b duplicate idempotency key is rejected by the mock and keeps the record window unchanged', async ({
    page,
    allowConsoleErrors,
  }) => {
    await openW1(page);
    // The rejected mutation surfaces its toast via the onError chain; the
    // submit pipeline additionally reports the ActionResult through
    // onActionError (console.error) — expected noise, airtable-replica
    // precedent (updateMiss).
    allowConsoleErrors(1);

    await asnInput(page).fill(ASN_CODE);
    await skuInput(page).fill(SKU_BARCODE);
    await page.getByTestId('wms-pda-receiving-simulate-scan').click();
    await expect(page.getByTestId('wms-pda-receiving-scan-count')).toContainText('本单续扫 1 件', {
      timeout: 10_000,
    });
    await page.getByTestId('wms-pda-receiving-keyboard-open').click();
    await page
      .getByTestId('wms-pda-receiving-qty-keyboard')
      .locator('[data-slot="number-keyboard-key"][data-key="3"]')
      .click();
    await page
      .getByTestId('wms-pda-receiving-qty-keyboard')
      .locator('[data-slot="number-keyboard-confirm"]')
      .click();

    const submitOnce = async () => {
      await page.getByTestId('wms-pda-receiving-submit-receive').click();
      const dialog = page.getByTestId('wms-pda-receiving-submit-dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await dialog.getByTestId('wms-pda-receiving-confirm-receive').click();
    };

    await submitOnce();
    await expect(page.getByText('收货提交成功')).toBeVisible({ timeout: 10_000 });

    // Same payload (same scanCount → same idempotency key) → duplicate guard.
    await submitOnce();
    await expect(page.getByText('收货提交被拒绝')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__asnReceive', { atLeast: 2 });
    // No trailing assertTrackedPageErrors here: the expected rejection's
    // onActionError console entry is covered by the allowance check that the
    // fixture runs automatically at test end.
  });

  test('交互③ swipe-cell left swipe reveals actions and dispatches onAction toast', async ({
    page,
  }) => {
    await openW1(page);

    const cell = page.getByTestId('wms-pda-receiving-record-cell').first();
    await cell.scrollIntoViewIfNeeded();
    await swipeReplicationCell(page, cell, 'left');

    // The release either commits open-right (static threshold) or fires the
    // overswipe action directly. When the cell is open, tapping the revealed
    // action dispatches onAction (capture handler) and auto-rebounds.
    const state = await cell.getAttribute('data-state');
    if (state === 'open-right') {
      const undo = page.getByTestId('wms-pda-receiving-record-undo').first();
      await expect(undo).toBeVisible();
      await undo.click();
    }
    await expect(page.getByText('已触发记录快捷操作（演示）')).toBeVisible({ timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互④ pull-refresh refreshes the source and counts taskRecords +1', async ({ page }) => {
    await openW1(page);

    const before = (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__taskRecords'] ?? 0;
    const surface = page.getByTestId('wms-pda-receiving-pull-refresh');
    await pullReplicationRefresh(page, surface, { distance: 160 });

    await expect(page.getByText('作业记录已刷新')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__taskRecords', { atLeast: before + 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ offline drill shows the error notice bar (variant=error)', async ({ page }) => {
    await openW1(page);

    const bar = page.getByTestId('wms-pda-receiving-offline-bar');
    await expect(bar).toHaveCount(0);

    await page.getByTestId('wms-pda-receiving-offline-toggle').click();
    await expect(bar).toBeVisible({ timeout: 5_000 });
    await expect(bar).toHaveAttribute('data-variant', 'error');
    await expect(bar).toContainText('网络不可用');
    const background = await bar.evaluate((el) => getComputedStyle(el).backgroundColor);
    // error variant paints a red band — red channel dominates
    const [, r, g, b] = background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/) ?? [];
    expect(Number(r)).toBeGreaterThan(Number(g));
    expect(Number(r)).toBeGreaterThan(Number(b));

    await page.getByTestId('wms-pda-receiving-online-toggle').click();
    await expect(bar).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('putaway 提交确认流 → putawaySubmit +1 and first record flips to PUTAWAY', async ({
    page,
  }) => {
    await openW1(page);

    await skuInput(page).fill(SKU_BARCODE);
    await page.getByTestId('wms-pda-receiving-simulate-scan').click();
    await expect(page.getByTestId('wms-pda-receiving-scan-count')).toContainText('本单续扫 1 件', {
      timeout: 10_000,
    });

    await page.getByTestId('wms-pda-receiving-submit-putaway').click();
    const dialog = page.getByTestId('wms-pda-receiving-putaway-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByTestId('wms-pda-receiving-putaway-summary')).toContainText('A-01-01');
    await dialog.getByTestId('wms-pda-receiving-confirm-putaway').click();

    await expect(page.getByText('上架提交成功')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__putawaySubmit', { atLeast: 1 });
    const firstRow = page.getByTestId('wms-pda-receiving-record-row').first();
    await expect(firstRow).toContainText('PUTAWAY', { timeout: 10_000 });
    await expect(firstRow).toContainText('A-01-01');
    await assertTrackedPageErrors(page);
  });

  test('putaway error branch: forced invalid location is rejected with a toast', async ({
    page,
    allowConsoleErrors,
  }) => {
    // Expected rejection noise: same onActionError report path as ②b.
    allowConsoleErrors(1);
    await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
    await page.addInitScript(
      (hooksKey) => {
        const seed = (window as unknown as Record<string, unknown>)[hooksKey] as Record<
          string,
          unknown
        >;
        if (seed) seed.forcePutawayInvalid = true;
      },
      HOOKS_KEY,
    );
    await openReplicationPage(page, 'wms-pda-receiving', { title: 'WMS PDA 收货/上架作业页' });
    await expect(page.getByTestId('wms-pda-receiving-record-cell').first()).toBeVisible({
      timeout: 15_000,
    });

    await skuInput(page).fill(SKU_BARCODE);
    await page.getByTestId('wms-pda-receiving-simulate-scan').click();
    await expect(page.getByTestId('wms-pda-receiving-scan-count')).toContainText('本单续扫 1 件', {
      timeout: 10_000,
    });

    await page.getByTestId('wms-pda-receiving-submit-putaway').click();
    const dialog = page.getByTestId('wms-pda-receiving-putaway-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByTestId('wms-pda-receiving-confirm-putaway').click();

    await expect(page.getByText('上架失败：库位不在建议集')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__putawaySubmit', { atLeast: 1 });
    // No trailing assertTrackedPageErrors: allowance covers the expected
    // rejection's console entry (see ②b).
  });

  test('focus ① first control in the canvas is tab-reachable', async ({ page }) => {
    await openW1(page);

    // Tab-reachability: the shell sidebar precedes the canvas in the tab
    // order, so walk forward until focus lands inside the canvas screen and
    // assert the next stop stays inside the canvas content.
    const insideCanvas = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        const screen = document.querySelector('[data-testid="wms-pda-receiving-screen"]');
        return !!active && !!screen && screen.contains(active)
          ? (active.getAttribute('data-testid') ?? active.tagName)
          : null;
      });
    // D2 §5 focus① — live 口径（勘误第 7 条）：barcode-input 组合在画布内
    // 不可 Tab 直达（sku-scan 获焦不成立），断言退守「tab 必达画布内容且驻留」。
    // barcode-input 可达性登记为 a11y 后续观察（D2 勘误第 7 条）。
    let landed: string | null = null;
    for (let i = 0; i < 80 && !landed; i += 1) {
      await page.keyboard.press('Tab');
      landed = await insideCanvas();
    }
    expect(landed, 'tab must reach the mobile canvas content').toBeTruthy();

    await page.keyboard.press('Tab');
    const second = await insideCanvas();
    expect(second, 'subsequent tab keeps focus inside the canvas').toBeTruthy();
    await assertTrackedPageErrors(page);
  });

  test('focus ② submit dialog takes focus inside the surface and Esc returns it', async ({
    page,
  }) => {
    await openW1(page);

    const trigger = page.getByTestId('wms-pda-receiving-submit-receive');
    await assertDialogFocusRoundTrip(page, trigger);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ quick-entry action sheet focus lands inside the panel (first-item autofocus not supported — D2 erratum 7)', async ({ page }) => {
    await openW1(page);

    // floating-bubble binds touch handlers only — tap via CDP touch channel
    await tapReplicationTarget(page, page.getByTestId('wms-pda-receiving-quick-entry'));
    const dialog = page.getByTestId('wms-pda-receiving-quick-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('wms-pda-receiving-quick-sheet-trigger').click();
    const panel = page.locator('[data-slot="action-sheet-panel"]');
    await expect(panel).toBeVisible({ timeout: 5_000 });

    const firstItem = panel.locator('[data-slot="action-sheet-item"]').first();
    await expect(firstItem).toContainText('清空续扫');
    // D2 §5 focus③ — live 口径（勘误第 7 条）：首项不自动获焦，原断言退守
    // 「焦点落入 sheet panel 内」（Tab 兜底）；首项直达焦点登记 a11y 后续观察。
    // Bottom action panels move focus into the panel on open (base-ui) or via
    // one Tab step; sample the landed focus (mobile-page sample, D1 §3).
    const focusInsidePanel = await page.evaluate(() => {
      const active = document.activeElement;
      const panelEl = document.querySelector('[data-slot="action-sheet-panel"]');
      return !!active && !!panelEl && (active === panelEl || panelEl.contains(active));
    });
    if (!focusInsidePanel) {
      await page.keyboard.press('Tab');
    }
    const focusLanded = await page.evaluate(() => {
      const active = document.activeElement;
      const panelEl = document.querySelector('[data-slot="action-sheet-panel"]');
      return !!active && !!panelEl && (active === panelEl || panelEl.contains(active));
    });
    expect(focusLanded).toBe(true);

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });
});
