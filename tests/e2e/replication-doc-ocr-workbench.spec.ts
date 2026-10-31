import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 814 — O1 OCR 校正工作台页 focused e2e (D4 §5 O1 断言清单 ①-⑤ +
// focus ①-③). Pillar one (programmatic interactions, __replDocCalls
// evidence + write mirrors) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch A desktop registration).
//
// Live-completed faces (D4 §2.3「O1 实现勘误」已就地落档):
// - 逐字段确认 = form 宿主 + detail-field（content=input-text value）的
//   surface 草稿校正 → 确认写回（detail-view 无 content 形态只能只读展示）。
// - 低置信高亮走 detail-field className（control root .nop-detail-field）：
//   flux-core 的 inputClassName 只存在于类型声明、零运行时消费者。
// - wizard 步骤 2 beforeLeave → ocrValidate 读 form valuesPath 发布的草稿
//   (ocrFieldDraft)；失败（failureHandled 仍 ok:false）阻断导航。

const COUNTERS_KEY = '__replDocCalls';
const HOOKS_KEY = '__replDocTestHooks';

/* Fixture mirror of mock-backend-repl-doc.ts buildOcrFields. */
const FIELD_CONFIDENCE: Record<string, number> = {
  invoiceNo: 0.62,
  invoiceDate: 0.95,
  sellerName: 0.88,
  buyerTaxId: 0.72,
  totalAmount: 0.93,
  taxAmount: 0.78,
};
const INVOICE_ORIGINAL = '0441-2O26-7781';
/** The OCR misread the letter O for zero — the correction under test. */
const INVOICE_CORRECTED = '0441-2026-7781';
const DETAIL_ROWS = 3;

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replDocTestHooks ?? {},
  );
}

async function openO1(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'doc-ocr-workbench', { title: 'OCR 校正工作台页' });
  await expect(page.getByTestId('doc-ocr-workbench-step-source')).toBeVisible({ timeout: 30_000 });
}

function wizard(page: Page) {
  return page.getByTestId('doc-ocr-workbench-wizard');
}

async function clickNext(page: Page): Promise<void> {
  await wizard(page).getByRole('button', { name: '下一步' }).click();
}

/** Step 1 → step 2 (no gate on the source step); waits for the loaded fields. */
async function enterFieldsStep(page: Page): Promise<void> {
  await clickNext(page);
  await expect(page.getByTestId('doc-ocr-workbench-value-invoiceNo')).toHaveText(INVOICE_ORIGINAL, {
    timeout: 15_000,
  });
}

/** detail-field surface draft: open 校正 → fill the value → 确认 write-back. */
async function correctField(page: Page, name: string, value: string): Promise<void> {
  await page.getByTestId(`doc-ocr-workbench-field-${name}`).getByRole('button', { name: '校正' }).click();
  const input = page.getByTestId(`doc-ocr-workbench-edit-${name}`).locator('input');
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.fill(value);
  await page.getByRole('dialog').getByRole('button', { name: '确认' }).click();
  await expect(page.getByTestId(`doc-ocr-workbench-value-${name}`)).toHaveText(value, { timeout: 10_000 });
}

/** Step 2 corrected → step 3 (rows). */
async function enterRowsStep(page: Page): Promise<void> {
  await enterFieldsStep(page);
  await correctField(page, 'invoiceNo', INVOICE_CORRECTED);
  await clickNext(page);
  await expect(page.getByTestId('doc-ocr-workbench-rows-form')).toBeVisible({ timeout: 15_000 });
}

test.describe('O1 OCR 校正工作台页 (#/complex-pages/doc-ocr-workbench)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：原件 image + image-compare 双图（/repl-assets/ 静态资产）+ wizard 四步首步 + ocrCase 计数', async ({
    page,
  }) => {
    await openO1(page);

    // The image renderer puts the testid on the <img> element itself.
    const original = page.getByTestId('doc-ocr-workbench-original');
    await expect(original).toHaveAttribute('src', /\/repl-assets\/ocr-invoice-original\.svg$/, { timeout: 15_000 });
    await expect.poll(() => original.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    const compare = page.getByTestId('doc-ocr-workbench-compare');
    await expect(compare.locator('[data-slot="image-compare-after"]')).toHaveAttribute(
      'src',
      /\/repl-assets\/ocr-invoice-annotated\.svg$/,
    );
    await expect(compare.locator('img')).toHaveCount(2);

    for (const title of ['原件对照', '字段确认', '明细行', '回流提交']) {
      await expect(wizard(page)).toContainText(title);
    }
    await expect(page.getByTestId('doc-ocr-workbench-case-title')).toContainText('ocr-case-0001');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__ocrCase', { atLeast: 1 });
    const calls = await readEndpointCalls(page, COUNTERS_KEY);
    expect((calls['ReplDoc__ocrValidate'] ?? 0) + (calls['ReplDoc__ocrCommit'] ?? 0)).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互②③ 步骤 2：低置信 wrapper 背景 = CSS 变量解析值（仅 invoiceNo）+ badge 三档计数 + labelRemark 原值', async ({
    page,
  }) => {
    await openO1(page);
    await enterFieldsStep(page);

    // ② exactly one highlighted control root, inside the low-confidence field.
    const form = page.getByTestId('doc-ocr-workbench-fields-form');
    await expect(form.locator('.repl-low-confidence')).toHaveCount(1);
    const lowRoot = page.getByTestId('doc-ocr-workbench-field-invoiceNo').locator('.nop-detail-field');
    await expect(lowRoot).toHaveClass(/repl-low-confidence/);
    const { bg, expected } = await lowRoot.evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      expected: getComputedStyle(document.documentElement).getPropertyValue('--repl-low-confidence-bg').trim(),
    }));
    expect(expected).not.toBe('');
    expect(bg).toBe(expected);

    // ③ badge tiers: ≥0.9 高 / 0.7-0.9 中 / <0.7 低.
    const tiers = { 高置信: 0, 中置信: 0, 低置信: 0 } as Record<string, number>;
    for (const confidence of Object.values(FIELD_CONFIDENCE)) {
      tiers[confidence >= 0.9 ? '高置信' : confidence >= 0.7 ? '中置信' : '低置信'] += 1;
    }
    for (const [label, count] of Object.entries(tiers)) {
      await expect(form.locator('[data-testid^="doc-ocr-workbench-conf-"]', { hasText: label })).toHaveCount(count);
    }
    await expect(page.getByTestId('doc-ocr-workbench-conf-invoiceNo')).toHaveClass(/repl-conf-low/);
    await expect(page.getByTestId('doc-ocr-workbench-conf-invoiceDate')).toHaveClass(/repl-conf-high/);

    // labelRemark carries the original value + confidence (原值悬浮).
    await expect(
      page.getByTestId('doc-ocr-workbench-field-invoiceNo').locator('[data-slot="field-label-remark"]'),
    ).toHaveAttribute('title', `原值：${INVOICE_ORIGINAL}（置信度 0.62）`);
    await assertTrackedPageErrors(page);
  });

  test('交互⑤a 低置信字段未校正即下一步 → ocrValidate REPL_DOC_FIELD_UNCONFIRMED 阻断，停留步骤 2', async ({
    page,
    allowConsoleErrors,
  }) => {
    // Expected rejection noise: the failed beforeLeave ajax reports through onActionError.
    allowConsoleErrors(1);
    await openO1(page);
    await enterFieldsStep(page);

    await clickNext(page);
    await expect(page.getByText('字段未确认（REPL_DOC_FIELD_UNCONFIRMED）：请校正低置信字段')).toBeVisible({
      timeout: 15_000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__ocrValidate', { atLeast: 1 });
    // The validate payload carried the untouched draft (valuesPath face).
    const body = (await hooksData(page)).lastOcrValidateBody as { fields?: Record<string, { value?: string }> };
    expect(body?.fields?.invoiceNo?.value).toBe(INVOICE_ORIGINAL);
    // Navigation blocked: still on step 2, rows form never mounted.
    await expect(page.getByTestId('doc-ocr-workbench-field-invoiceNo')).toBeVisible();
    await expect(page.getByTestId('doc-ocr-workbench-rows-form')).toHaveCount(0);
  });

  test('交互① 校正 invoiceNo（surface 草稿→确认写回）→ 下一步 → ocrValidate 载荷含校正值 → 进入步骤 3', async ({
    page,
  }) => {
    await openO1(page);
    await enterFieldsStep(page);

    await correctField(page, 'invoiceNo', INVOICE_CORRECTED);
    await clickNext(page);

    await expect(page.getByTestId('doc-ocr-workbench-rows-form')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__ocrValidate', { atLeast: 1 });
    const body = (await hooksData(page)).lastOcrValidateBody as {
      caseId?: string;
      fields?: Record<string, { value?: string; originalValue?: string }>;
    };
    expect(body?.caseId).toBe('ocr-case-0001');
    expect(body?.fields?.invoiceNo).toMatchObject({ value: INVOICE_CORRECTED, originalValue: INVOICE_ORIGINAL });
    await assertTrackedPageErrors(page);
  });

  test('交互④⑤ 明细行增改 + 必填校验阻断（formId）→ 回流提交 ocrCommit 载荷（校正值 + 4 行）+ docId 回显', async ({
    page,
  }) => {
    await openO1(page);
    await enterRowsStep(page);

    const rows = page.getByTestId('doc-ocr-workbench-rows');
    const descriptions = page.getByTestId('doc-ocr-workbench-row-description');
    await expect(descriptions).toHaveCount(DETAIL_ROWS, { timeout: 15_000 });

    // ④ add a row and edit an existing quantity; leave the new description empty.
    await rows.locator('[data-slot="input-table-add"]').click();
    await expect(descriptions).toHaveCount(DETAIL_ROWS + 1);
    await page.getByTestId('doc-ocr-workbench-row-quantity').nth(0).locator('input').fill('3');

    // Required description blocks the step (formId validation) — still step 3.
    await clickNext(page);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('doc-ocr-workbench-rows-form')).toBeVisible();
    await expect(page.getByTestId('doc-ocr-workbench-commit')).toHaveCount(0);

    await descriptions.nth(DETAIL_ROWS).locator('input').fill('数据线 1m');
    await page.getByTestId('doc-ocr-workbench-row-quantity').nth(DETAIL_ROWS).locator('input').fill('10');
    await page.getByTestId('doc-ocr-workbench-row-amount').nth(DETAIL_ROWS).locator('input').fill('200');
    await clickNext(page);
    await expect(page.getByTestId('doc-ocr-workbench-commit')).toBeVisible({ timeout: 15_000 });

    // ⑤ commit → ocrCommit +1 with corrected fields + 4 rows; docId echoed.
    await page.getByTestId('doc-ocr-workbench-commit').click();
    await expect(page.getByTestId('doc-ocr-workbench-commit-result')).toContainText('已生成单据 PINV-2026-0001', {
      timeout: 15_000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__ocrCommit', { atLeast: 1 });
    const body = (await hooksData(page)).lastOcrCommitBody as {
      fields?: Record<string, { value?: string }>;
      detailRows?: Array<{ description?: string; quantity?: number }>;
    };
    expect(body?.fields?.invoiceNo?.value).toBe(INVOICE_CORRECTED);
    expect(body?.detailRows?.length).toBe(DETAIL_ROWS + 1);
    expect(body?.detailRows?.[0]?.quantity).toBe(3);
    expect(body?.detailRows?.[DETAIL_ROWS]?.description).toBe('数据线 1m');
    await assertTrackedPageErrors(page);
  });

  test('交互⑤b 回流提交失败（forceOcrCommitError）→ REPL_DOC_COMMIT_VALIDATION_FAILED toast，无 docId', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(1);
    await openO1(page);
    await enterRowsStep(page);
    await clickNext(page);
    await expect(page.getByTestId('doc-ocr-workbench-commit')).toBeVisible({ timeout: 15_000 });

    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, Record<string, unknown>>).__replDocTestHooks;
      if (hooks) hooks.forceOcrCommitError = true;
    });
    await page.getByTestId('doc-ocr-workbench-commit').click();
    await expect(page.getByText('回流提交失败（REPL_DOC_COMMIT_VALIDATION_FAILED）')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('doc-ocr-workbench-commit-result')).toHaveCount(0);
  });

  test('focus ① wizard 步进后焦点落入新步首控件（步骤 2 首个校正按钮）', async ({ page }) => {
    await openO1(page);
    await enterFieldsStep(page);

    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          const form = document.querySelector('[data-testid="doc-ocr-workbench-fields-form"]');
          return !!active && !!form && form.contains(active) ? active.getAttribute('aria-label') : null;
        }),
      )
      .toBe('校正');
    await assertTrackedPageErrors(page);
  });

  test('focus ② 原件 image preview 放大 dialog 打开、Esc 关闭', async ({ page }) => {
    await openO1(page);

    await page.getByTestId('doc-ocr-workbench-original').click();
    const preview = page.locator('[data-slot="image-preview"]');
    await expect(preview).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(preview).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ detail-field 校正 surface 焦点落入、Esc 关闭返回', async ({ page }) => {
    await openO1(page);
    await enterFieldsStep(page);

    await page.getByTestId('doc-ocr-workbench-field-invoiceNo').getByRole('button', { name: '校正' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const dialogs = document.querySelectorAll('[role="dialog"]');
          const top = dialogs[dialogs.length - 1];
          const active = document.activeElement;
          return !!top && !!active && (active === top || top.contains(active));
        }),
      )
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // Cancel discards the draft: the viewer keeps the original value.
    await expect(page.getByTestId('doc-ocr-workbench-value-invoiceNo')).toHaveText(INVOICE_ORIGINAL);
    const focusBackInDocument = await page.evaluate(
      () => !!document.activeElement && document.activeElement !== document.body,
    );
    expect(focusBackInDocument).toBe(true);
    await assertTrackedPageErrors(page);
  });
});
