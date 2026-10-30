import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  dragReplicationCard,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 799 — W2 WMS 拣货路径看板与波次管理页 focused e2e (D2 §5 W2 断言清单 ①-⑤).
// Pillar one (programmatic interactions, __replWmsCalls evidence) + pillar
// three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch A
// single registration — W2 is a desktop page, no mobile describe).
//
// G2 (D2 §3.3 ③): the contract layer (onCardMove payload shape) is pinned by
// the scheduling package's kanban-dnd-integration unit tests; the business
// binding layer is asserted HERE field-by-field against `lastWaveMoveBody`
// (waveId ↔ dragged card id, fromStatus ↔ source column, toStatus ↔ target
// column).

const COUNTERS_KEY = '__replWmsCalls';
const HOOKS_KEY = '__replWmsTestHooks';

const BOARD = '[data-testid="wms-wave-picking-board"]';
const COLUMN = (stage: string) =>
  `${BOARD} [data-slot="kanban-column"][data-column-id="${stage}"]`;
const CARD = (waveId: string) => `${BOARD} [data-card-id="${waveId}"]`;
/** Total wave fixtures: 26 rows; PLANNED cycle keeps the first card wave-0001. */
const TOTAL_WAVES = 26;
/** wave-0001 line math (mock-backend-repl-wms createWaveLines(1)) for the
 * tfoot delta assertion: pickedQty starts at Σ 8+12+12+4 = 36. */
const WAVE1_PICKED_QTY_SUM = 36;

test.describe('W2 WMS 拣货路径看板与波次管理页 (#/complex-pages/wms-wave-picking)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function openW2(page: Page): Promise<void> {
    await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
    await openReplicationPage(page, 'wms-wave-picking', {
      title: 'WMS 拣货路径看板与波次管理页',
    });
    await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  async function openTab(page: Page, tabValue: string): Promise<void> {
    await page.locator(`[data-slot="tabs-trigger"][data-tab-value="${tabValue}"]`).click();
  }

  function lastWaveMoveBody(page: Page): Promise<Record<string, unknown>> {
    return page.evaluate(
      () =>
        ((window as unknown as Record<string, Record<string, unknown>>).__replWmsTestHooks ?? {})
          .lastWaveMoveBody ?? {},
    );
  }

  test('交互断言前置：看板分组渲染 —— 4 个波次阶段列、26 张波次卡、列头件数合计', async ({
    page,
  }) => {
    await openW2(page);

    // D2 §5 ①前置: kanban renders the four wave stages in lifecycle order.
    const columns = page.locator(`${BOARD} [data-slot="kanban-column"]`);
    await expect(columns).toHaveCount(4);
    const columnIds = await page.locator(`${BOARD} [data-slot="kanban-column"]`).evaluateAll(
      (els) => els.map((el) => el.getAttribute('data-column-id')),
    );
    expect(columnIds).toEqual(['PLANNED', 'RELEASED', 'PICKING', 'DONE']);

    // All 26 wave fixtures render as cards across the board (≥4 per column).
    await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`)).toHaveCount(TOTAL_WAVES);
    await expect(page.locator(`${COLUMN('PLANNED')} [data-slot="kanban-card"]`)).toHaveCount(7);
    await expect(page.locator(`${COLUMN('RELEASED')} [data-slot="kanban-card"]`)).toHaveCount(7);
    await expect(page.locator(`${COLUMN('PICKING')} [data-slot="kanban-card"]`)).toHaveCount(6);
    await expect(page.locator(`${COLUMN('DONE')} [data-slot="kanban-card"]`)).toHaveCount(6);

    // columnAggregate (sum totalQty): PLANNED waves {1,5,9,13,17,21,25} →
    // totalQty 50+90+40+80+120+70+110 = 560.
    const plannedHeader = page.locator(`${COLUMN('PLANNED')} [data-slot="kanban-column-aggregate"]`);
    await expect(plannedHeader).toContainText('件数');
    await expect(plannedHeader).toContainText('560');

    // The board is fed by the waveBoard endpoint; the summary table by waveFindPage.
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__waveBoard', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__waveFindPage', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互① kanban 拖卡至 RELEASED → waveMove +1、列迁移、lastWaveMoveBody 逐字段命中（G2）', async ({
    page,
  }) => {
    await openW2(page);

    const moveBefore = (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__waveMove'] ?? 0;

    // Real pointer drag (replication.ts helper, kanban-demo mouse steps 12
    // precedent + double-mount settle wait): first PLANNED card → RELEASED.
    await dragReplicationCard(
      page,
      page.locator(CARD('wave-0001')),
      page.locator(COLUMN('RELEASED')),
    );

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__waveMove', {
      atLeast: moveBefore + 1,
    });

    // G2 (D2 §3.3 ③) — the request body is asserted FIELD BY FIELD:
    // waveId = dragged card id; fromStatus = source column id; toStatus =
    // target column id.
    const body = await lastWaveMoveBody(page);
    expect(body).toEqual({
      waveId: 'wave-0001',
      fromStatus: 'PLANNED',
      toStatus: 'RELEASED',
    });

    // The ajax `then` refreshes the waveBoard source; the mock mutated session
    // state, so the card re-renders inside the RELEASED column (列迁移).
    await expect(page.locator(CARD('wave-0001'))).toHaveAttribute('data-column-id', 'RELEASED', {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('PLANNED')} [data-slot="kanban-card"]`)).toHaveCount(6, {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('RELEASED')} [data-slot="kanban-card"]`)).toHaveCount(8, {
      timeout: 15_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('交互② 波次释放 → waveRelease +1 + toast + PLANNED 清空；二次释放命中 wave not in PLANNED 拒绝分支', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The second (rejected) release reports its ActionResult through
    // onActionError (console.error) — expected noise, W1 ②b precedent.
    allowConsoleErrors(1);
    await openW2(page);

    // First release: all 7 PLANNED waves flip to RELEASED (7 + 7 = 14 there).
    await page.getByTestId('wms-wave-picking-release-open').click();
    const dialog = page.getByTestId('wms-wave-picking-release-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByTestId('wms-wave-picking-release-confirm').click();

    await expect(page.getByText('波次释放成功')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__waveRelease', { atLeast: 1 });
    await expect(dialog).toHaveCount(0);

    // onSubmitSuccess refreshed the board — PLANNED is now empty.
    await expect(page.locator(`${COLUMN('PLANNED')} [data-slot="kanban-card"]`)).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('RELEASED')} [data-slot="kanban-card"]`)).toHaveCount(14, {
      timeout: 15_000,
    });

    // Second release: the mock guard returns `wave not in PLANNED` → the
    // error toast fires and the dialog stays open (close binds to success).
    await page.getByTestId('wms-wave-picking-release-open').click();
    const dialog2 = page.getByTestId('wms-wave-picking-release-dialog');
    await expect(dialog2).toBeVisible({ timeout: 5_000 });
    await dialog2.getByTestId('wms-wave-picking-release-confirm').click();

    await expect(page.getByText('释放被拒绝：当前没有 PLANNED 状态的波次')).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog2).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog2).toHaveCount(0);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__waveRelease', { atLeast: 2 });
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // expected rejection's console entry (W1 ②b pattern).
  });

  test('交互④ 拣货路径 gantt 渲染（15 行任务链 + bars）且 zoomLevels 缩放触发 onZoomChange', async ({
    page,
  }) => {
    await openW2(page);

    await openTab(page, 'path');
    const gantt = page.getByTestId('wms-wave-picking-gantt');
    await expect(gantt).toBeVisible({ timeout: 15_000 });

    // 3 zones × 5 chained picking tasks = 15 rows + 15 bars (mock pre-sorted
    // by upstream sequence — GanttTaskData carries no sequence field).
    await expect(gantt.locator('[data-slot="gantt-grid-row"]')).toHaveCount(15);
    await expect(gantt.locator('[data-slot="gantt-bars"] [data-task-id]')).toHaveCount(15);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__pickingTasks', { atLeast: 1 });

    // zoomLevels day/week/month; defaultZoom day → the default toolbar zoom-in
    // (second toolbar button) moves day → week and fires onZoomChange.
    const zoomLabel = page.getByTestId('wms-wave-picking-zoom-label');
    await expect(zoomLabel).toContainText('当前缩放：day');
    await gantt.locator('[data-slot="gantt-toolbar"] button').nth(1).click();
    await expect(zoomLabel).toContainText('当前缩放：week', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互③ input-table 改实拣数量 → tfoot 合计按差值更新 + onRowChange 刷新明细源', async ({
    page,
  }) => {
    await openW2(page);

    await openTab(page, 'lines');
    const linesTable = page.getByTestId('wms-wave-picking-lines');
    await expect(linesTable).toBeVisible({ timeout: 15_000 });

    // wave-0001 has 4 deterministic pick lines.
    const rows = linesTable.locator('tbody tr');
    await expect(rows).toHaveCount(4);

    const tfootCells = linesTable.locator('[data-slot="input-table-summary-cell"]');
    const pickedCell = tfootCells.nth(4); // column order: lineNo/sku/location/qty/picked/amount
    await expect(pickedCell).toHaveText(String(WAVE1_PICKED_QTY_SUM));

    const linesBefore = (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__waveLines'] ?? 0;

    // Edit row 1 pickedQty 8 → 11 (Δ +3): the tfoot aggregate updates by the
    // same delta and summaryBinding keeps the form total in sync.
    const firstPicked = page
      .getByTestId('wms-wave-picking-picked-qty')
      .first()
      .locator('input');
    await firstPicked.fill('11');
    await expect(pickedCell).toHaveText(String(WAVE1_PICKED_QTY_SUM + 3), { timeout: 10_000 });

    // summaryBinding wrote the amount sum into the form field — the summary
    // line reads the written-back field (单对象回写).
    const amountCell = tfootCells.nth(5);
    const amountSum = (await amountCell.textContent())?.trim() ?? '';
    await expect(page.getByTestId('wms-wave-picking-amount-summary')).toContainText(amountSum);

    // onRowChange → component:refresh on the waveLines source → +1 fetch.
    await expect
      .poll(
        async () => (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__waveLines'] ?? 0,
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(linesBefore + 1);
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ zone 过滤 → waveBoard 重取且看板只留该分区卡片', async ({ page }) => {
    await openW2(page);

    const boardBefore = (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__waveBoard'] ?? 0;
    await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`)).toHaveCount(TOTAL_WAVES);

    await page
      .getByTestId('wms-wave-picking-zone-select')
      .locator('[data-slot="combobox-trigger"]')
      .click();
    await page.locator('[data-slot="combobox-item"]', { hasText: 'Z-A' }).click();

    // dependsOn zoneFilter → the board source refetches with zone=Z-A.
    await expect
      .poll(
        async () => (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__waveBoard'] ?? 0,
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(boardBefore + 1);

    // Zone Z-A owns 9 of the 26 fixtures; every card description carries Z-A.
    await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`)).toHaveCount(9, {
      timeout: 15_000,
    });
    const descriptions = await page
      .locator(`${BOARD} [data-slot="kanban-card"]`)
      .evaluateAll((els) => els.map((el) => el.textContent ?? ''));
    expect(descriptions.length).toBe(9);
    for (const text of descriptions) {
      expect(text).toContain('Z-A');
    }
    await assertTrackedPageErrors(page);
  });

  test('focus ① 板 tab 首站可达（tab 链路落入波次分组看板 tab）', async ({ page }) => {
    await openW2(page);

    const activeInside = () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const root = document.querySelector('[data-testid="wms-wave-picking-root"]');
        if (!active || !root || !root.contains(active)) return null;
        const trigger = active.closest('[data-slot="tabs-trigger"]');
        return trigger?.getAttribute('data-tab-value') ?? (active.getAttribute('data-testid') ?? active.tagName);
      });

    let landed: string | null = null;
    for (let i = 0; i < 120 && landed === null; i += 1) {
      await page.keyboard.press('Tab');
      landed = await activeInside();
    }
    expect(landed, 'tab must reach the page content').toBeTruthy();

    // Walk on until a tabs trigger takes focus — the board tab is the first
    // stop inside the tab strip (D2 §5 focus①: kanban 板 tab 首站).
    for (let i = 0; i < 60; i += 1) {
      if (landed === 'board') break;
      await page.keyboard.press('Tab');
      landed = await activeInside();
    }
    expect(landed).toBe('board');
    await assertTrackedPageErrors(page);
  });

  test('focus ② 释放确认 dialog 焦点入面板、Esc 返回触发按钮', async ({ page }) => {
    await openW2(page);

    const trigger = page.getByTestId('wms-wave-picking-release-open');
    await assertDialogFocusRoundTrip(page, trigger);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ input-table 实拣编辑器获焦且编辑后焦点驻留', async ({ page }) => {
    await openW2(page);

    await openTab(page, 'lines');
    const firstPicked = page
      .getByTestId('wms-wave-picking-picked-qty')
      .first()
      .locator('input');
    await expect(firstPicked).toBeVisible({ timeout: 15_000 });
    await firstPicked.click();
    await expect(firstPicked).toBeFocused();

    await firstPicked.fill('12');
    await expect(firstPicked).toBeFocused();
    await expect(firstPicked).toHaveValue('12');

    // Tab from the editor stays inside the input-table (next cell editor).
    await page.keyboard.press('Tab');
    const stillInsideTable = await page.evaluate(() => {
      const active = document.activeElement;
      const table = document.querySelector('[data-testid="wms-wave-picking-lines"]');
      return !!active && !!table && table.contains(active);
    });
    expect(stillInsideTable).toBe(true);
    await assertTrackedPageErrors(page);
  });
});
