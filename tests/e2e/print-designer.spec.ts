import { test, expect } from '@playwright/test';

test.describe('print designer playground', () => {
  test.beforeEach(async ({ page }) => {
    // vite dev 冷启动按需编译整图，首次可达 30s+，初始可见性放宽
    await page.goto('/#/print-designer', { waitUntil: 'commit' });
    await expect(page.getByTestId('print-designer-demo')).toBeVisible({ timeout: 90000 });
  });

  test('route loads the full designer shell', async ({ page }) => {
    await expect(page.getByTestId('print-designer')).toBeVisible();
    await expect(page.getByTestId('print-toolbar')).toBeVisible();
    await expect(page.getByTestId('print-palette')).toBeVisible();
    await expect(page.getByTestId('print-designer-canvas')).toBeVisible();
    await expect(page.getByTestId('print-inspector')).toBeVisible();
    // A4 出库单示例：表格 + 二维码元素已在画布上
    const canvas = page.getByTestId('print-designer-canvas');
    await expect(canvas.locator('[data-element-id="items"]')).toBeVisible();
  });

  test('palette click adds an element to the canvas', async ({ page }) => {
    const canvas = page.getByTestId('print-designer-canvas');
    const before = await canvas.locator('.nop-print-element').count();
    await page.getByTestId('print-palette').locator('[data-palette-type="text"]').click();
    await expect(canvas.locator('.nop-print-element')).toHaveCount(before + 1);
  });

  test('preview renders paginated same-source output with bound values and page count', async ({ page }) => {
    await page.getByRole('button', { name: '预览' }).click();
    const dialog = page.getByTestId('print-preview');
    await expect(dialog).toBeVisible();
    const frame = page.getByTestId('print-preview-frame');
    const srcdoc = await frame.getAttribute('srcdoc');
    expect(srcdoc).toContain('出库单');
    expect(srcdoc).toContain('CK-2026-0901'); // field 绑定（orderNo）
    expect(srcdoc).toContain('货物-40'); // 表格最后一行（40 行数据）
    expect(srcdoc).toContain('fmt-page');
    const pageCount = Number(await page.getByTestId('print-preview-page-count').textContent());
    expect(pageCount).toBeGreaterThanOrEqual(2); // 40 行 × 7mm 跨页
  });

  test('barcode renders as a real svg element in the preview (P3 handover)', async ({ page }) => {
    await page.getByRole('button', { name: '80mm 小票' }).click();
    await page.getByRole('button', { name: '预览' }).click();
    const frame = page.getByTestId('print-preview-frame');
    const srcdoc = await frame.getAttribute('srcdoc');
    // 真机浏览器中 jsbarcode 渲染 CODE128 → 内嵌 svg；happy-dom 降级空串时此断言必红
    expect(srcdoc).toContain('<svg');
    expect(srcdoc).toContain('收银小票');
  });

  test('export button triggers a pdf download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: '导出 PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('A4 出库单.pdf');
  });

  test('print button is present without opening a print dialog', async ({ page }) => {
    await expect(page.locator('[data-testid="print-demo-actions"]').getByRole('button', { name: '打印', exact: true })).toBeVisible();
  });

  test('P5: rendered table rows stay inside their slice frames (row-height closure)', async ({ page }) => {
    await page.getByRole('button', { name: '预览' }).click();
    const frame = page.getByTestId('print-preview-frame');
    await expect(frame).toBeVisible();
    const frameLocator = page.frameLocator('[data-testid="print-preview-frame"]');
    await expect(frameLocator.locator('.fmt-page').first()).toBeVisible();
    // D21-04 数值闭合：每个 tr 的渲染高度 ≤ 排版行高 7mm 换算 px + 20% 容差（真实 Chromium 布局）
    const overflow = await frameLocator.locator('tbody tr').evaluateAll((rows) =>
      rows.filter((row) => {
        const rect = row.getBoundingClientRect();
        return rect.height > 7 * (96 / 25.4) * 1.2; // 7mm ≈ 26.46px，容差后 ≈31.75px
      }).length,
    );
    expect(overflow).toBe(0);
  });

  test('P5: aggregate row and page number are visible in the paginated output', async ({ page }) => {
    await page.getByRole('button', { name: '预览' }).click();
    const frame = page.getByTestId('print-preview-frame');
    await expect(frame).toBeVisible();
    const frameLocator = page.frameLocator('[data-testid="print-preview-frame"]');
    // D21-03：聚合行落在 frame 内（末页 tfoot 数量 = 页数至少 1，且金额列含聚合文本）
    await expect(frameLocator.locator('tfoot .fmt-aggregate').first()).toBeVisible();
    // pageNumber 元素：页码 token 已按页注入
    const srcdoc = await frame.getAttribute('srcdoc');
    // pageNumber 已按页解析为文本（页脚 region），HTML 中不存在 'pageNumber' 字面量
    expect(srcdoc).toContain('>1/2<');
  });
});
