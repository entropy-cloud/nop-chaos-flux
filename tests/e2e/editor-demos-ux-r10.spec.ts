import { expect, test } from './fixtures.js';

/**
 * ux-r10 编辑器演示页治理程序化断言（wd1/wd2/ce1，Phase 1；后续 Phase 追加）。
 * 全部程序化判据（文本/DOM/boundingBox），截图仅旁证不作为测试证明。
 */

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/#/word-editor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.nop-word-editor-page')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2000);
}

async function openCodeEditor(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto('/#/code-editor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.nop-code-editor').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
}

test('wd1-content: word editor opens with a seeded multi-level document and outline entries', async ({
  page,
}) => {
  await openWordEditor(page);

  // 文档预览条（DOM）反映 initialDocument 种子内容
  const preview = page.getByTestId('word-editor-saved-preview');
  await expect(preview).not.toHaveText(/无文档数据|No document data/, { timeout: 15_000 });
  await expect(preview).toContainText('产品发布计划');

  // 大纲面板出现多级标题条目（canvas 内文字不可 DOM 断言，大纲是程序化表面）
  const outlineEntry = page.locator('.nop-word-editor-page').getByText('一、发布范围', {
    exact: true,
  });
  await expect(outlineEntry.first()).toBeVisible({ timeout: 15_000 });

  // 无孤立残角字符出现在 DOM 文本层（canvas 边距角标为上游标准装饰，不在断言范围）
  const bodyText = await page.locator('.nop-word-editor-page').textContent();
  expect(bodyText).not.toContain('└');
});

test('ce1-samples: every feature editor ships representative sample code', async ({ page }) => {
  await openCodeEditor(page);

  const samples: Array<[string, RegExp]> = [
    // expression 编辑器开启 showFriendlyNames，data.age 显示为 Age——断言字面量片段
    ['code-editor-expression', /Adult: /],
    ['code-editor-template', /Hello \{UPPER/],
    ['code-editor-sql', /LEFT JOIN orders/],
    ['code-editor-sql-enhanced', /INNER JOIN orders/],
    ['code-editor-json', /"server"/],
    ['code-editor-javascript', /function formatPrice/],
    ['code-editor-css', /\.kpi-card/],
    ['code-editor-readonly', /Hello, World!/],
  ];

  for (const [testid, pattern] of samples) {
    const field = page.getByTestId(testid);
    await expect(field, `${testid} should be mounted`).toBeVisible({ timeout: 15_000 });
    await expect(
      field.locator('.cm-content'),
      `${testid} should contain seeded sample code`,
    ).toContainText(pattern, { timeout: 15_000 });
  }
});

test('ce1-geometry: sql editors keep their configured height with visible line numbers', async ({
  page,
}) => {
  await openCodeEditor(page);

  for (const [testid, minHeight] of [
    ['code-editor-sql', 240],
    ['code-editor-sql-enhanced', 340],
  ] as const) {
    const editor = page.getByTestId(testid).locator('.nop-code-editor');
    await expect(editor).toBeVisible();
    const box = await editor.boundingBox();
    expect(box?.height ?? 0, `${testid} height`).toBeGreaterThanOrEqual(minHeight);
    await expect(editor.locator('.cm-lineNumbers').first()).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// Phase 2 — SCADA + Dashboard/运营大屏
// ---------------------------------------------------------------------------

async function openScadaEditorDemo(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('/#/scada-editor-demo', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-slot="scada-editor-canvas"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
}

test('sc3-productized: dev wall folded away, live binding demo intact and previewable', async ({
  page,
}) => {
  await openScadaEditorDemo(page);

  // G-4 开发说明下墙：折叠后默认不可见（details 语义，展开仍可达）
  await expect(page.getByText(/commitPolicy 缺省为 manual/)).toBeHidden();
  await expect(page.getByText(/编辑器完整能力演示/)).toBeHidden();

  // live 绑定演示在位：导出 working copy 应携带 demo-live-text 的 tank_level 绑定
  // （画布符号绘制在 canvas 内无 DOM 文本，导出往返是绑定配置的可读证明面）
  await page.getByTestId('editor-btn-export').click();
  const exportOut = page.getByTestId('editor-output-export');
  await expect(exportOut).toContainText('tank_level', { timeout: 10_000 });
  await expect(exportOut).toContainText('bindings');

  // preview 切换可达（双态隔离语义未破坏；状态栏模式文本翻转）
  await page.getByTestId('editor-mode-preview').click();
  await expect(page.locator('[data-slot="scada-editor-status-bar"]')).toContainText('preview', {
    timeout: 10_000,
  });
});

test('sc1-toolbar-groups: toolbox buttons sit in bounded group containers', async ({ page }) => {
  await openScadaEditorDemo(page);

  const groups = page.locator('[data-slot="scada-editor-toolbox-group"]');
  const count = await groups.count();
  expect(count, 'toolbox group containers').toBeGreaterThanOrEqual(8);
  // 每个组容器都容纳至少一个按钮（分组非空壳）
  for (let i = 0; i < count; i += 1) {
    await expect(groups.nth(i).locator('button').first()).toBeVisible();
  }
});

test('sc2-palette-thumb: every palette item carries a shape preview node', async ({ page }) => {
  await openScadaEditorDemo(page);

  const palette = page.locator('[data-slot="scada-editor-palette"]');
  const items = palette.locator('button');
  const itemCount = await items.count();
  expect(itemCount, 'palette items').toBeGreaterThanOrEqual(20);
  const thumbs = palette.locator('[data-slot="scada-palette-thumb"]');
  await expect(thumbs, 'one thumb per item').toHaveCount(itemCount);
  // 缩略图是真实形状 SVG（非空占位）
  expect(await thumbs.first().locator('svg').count()).toBeGreaterThan(0);
});

async function openDashboardDemo(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('/#/dashboard-demo', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="bi-dashboard"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1200);
}

test('db4-editor-clean: dashboard editor header productized', async ({ page }) => {
  await openDashboardDemo(page);

  // G-4 开发说明下墙
  await expect(page.getByText(/WorkbenchShell 三段式外壳/)).toBeHidden();

  // 通栏巨型返回按钮收敛：约束宽度（页面底部常规 host Button 不受影响）
  const back = page.getByTestId('dashboard-back');
  await expect(back).toBeVisible();
  const box = await back.boundingBox();
  expect(box?.width ?? 0, 'schema back button width').toBeLessThanOrEqual(320);
});

test('db4-kpi-format: dashboard editor KPI values carry thousand separators', async ({ page }) => {
  await openDashboardDemo(page);

  await page.getByTestId('editor-mode-toggle').click();
  const values = page.locator('[data-slot="stat-tile-value"]');
  await expect(values).toHaveCount(2, { timeout: 15_000 });
  await expect(values.nth(0)).toHaveText(/1,284,300/);
  await expect(values.nth(1)).toHaveText(/8,642/);
});

test('op2-kpi-format: ops big-screen KPI readable, seeded, and header productized', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('/#/complex-pages/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dash-stat-revenue')).toBeVisible({ timeout: 30_000 });

  // KPI 千分位
  await expect(page.getByTestId('dash-stat-revenue')).toContainText(/104,663\.7/);
  // 今日订单种子修复：不再为 0
  const today = await page.getByTestId('dash-stat-today').textContent();
  expect(today ?? '', 'today orders seeded').not.toContain('今日订单0');
  // 页头实现标签 chip 下墙
  await expect(page.getByText('data-source 并行')).toHaveCount(0);
  await expect(page.getByText(/chart（area\/pie\/bar）/)).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Phase 3 — PD-5 Page Designer inspector 文案治理
// ---------------------------------------------------------------------------

async function openPageDesigner(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#/page-designer', { waitUntil: 'commit' });
  await expect(page.getByTestId('page-designer-root')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('page-designer-canvas')).toBeVisible({ timeout: 30_000 });
}

test('pd5-inspector-copy: form inspector paths carry product copy, not runtime mechanics', async ({
  page,
}) => {
  await openPageDesigner(page);

  // 拖入 form 节点并选中 → inspector 展示 propContracts 结构化字段
  await page.dragAndDrop('[data-palette-item="form"]', '[data-testid="page-designer-canvas"]');
  const formAnchor = page.locator('.nop-form').first();
  await expect(formAnchor).toBeAttached({ timeout: 15_000 });
  await formAnchor.click();

  const inspector = page.getByTestId('page-designer-inspector');
  const statusPathField = page.locator('[data-inspector-field="statusPath"]');
  await expect(statusPathField).toBeVisible({ timeout: 15_000 });

  // description 渲染在字段容器（data-inspector-field div）的兄弟 <p> 上——
  // 断言域取整个 inspector 面板文本
  const inspectorCopy = (await inspector.textContent()) ?? '';
  expect(inspectorCopy).toContain('Status Path');
  // PD-5：不再出现 "Dynamic rerouting … replacement disposal" 运行时机制长句
  expect(inspectorCopy).not.toContain('Dynamic rerouting');
  expect(inspectorCopy).not.toContain('replacement disposal');
  // 产品化描述在位（statusPath/valuesPath 新文案的稳定片段）
  expect(inspectorCopy).toContain('status summary');
  expect(inspectorCopy).toContain('snapshot of the current form values');
});

test('pd5-fieldset-contract: fieldset exposes structured inspector fields instead of raw JSON', async ({
  page,
}) => {
  await openPageDesigner(page);

  await page.dragAndDrop('[data-palette-item="fieldset"]', '[data-testid="page-designer-canvas"]');
  const fieldsetAnchor = page.locator('.nop-fieldset').first();
  await expect(fieldsetAnchor).toBeAttached({ timeout: 15_000 });
  await fieldsetAnchor.click();

  // propContracts 补齐裁定：fieldset 出结构化字段编辑面（title 文本域），非原始 JSON 兜底
  await expect(page.locator('[data-inspector-field="title"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-inspector-field="collapsible"]')).toBeVisible();
});
