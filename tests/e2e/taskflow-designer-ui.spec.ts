import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function signIn(page: import('@playwright/test').Page) {
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (!(await signInButton.isVisible({ timeout: 2000 }).catch(() => false))) return;

  await signInButton.click();
  if (!(await signInButton.isVisible({ timeout: 1500 }).catch(() => false))) return;

  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).fill('123456');
  await signInButton.click();
  if (!(await signInButton.isVisible({ timeout: 1500 }).catch(() => false))) return;

  await page.getByRole('textbox', { name: 'Username' }).fill('nop');
  await page.getByRole('textbox', { name: 'Password' }).fill('123');
  await signInButton.click();
  await page.waitForTimeout(1000);
}

async function openTaskFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0, { timeout: 10000 });

  const taskflowCard = page.locator('button', { hasText: 'TaskFlow' });
  await expect(taskflowCard).toBeVisible({ timeout: 5000 });
  await taskflowCard.click();

  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('playground entry page renders all nav cards', async ({ page }) => {
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0, { timeout: 10000 });

  // plan 502 L0.1: home cards derive from DOMAIN_RENDERER_ROUTES (single source
  // of truth) and are keyed by data-home-card — the full 78-card registry makes
  // loose hasText matching ambiguous, so assert per-card id + registry eyebrow.
  const expectedCards = [
    ['component-lab', 'All Renderers'],
    ['flux-basic', 'Core Renderers'],
    ['flow-designer', 'Visual Workflow'],
    ['taskflow-designer', 'TaskFlow'],
    ['m5-showcase', 'All Mobile (M1–M5)'],
    ['report-designer', 'Spreadsheet + Metadata'],
    ['debugger-lab', 'DevTools'],
    ['condition-builder', 'Form Control'],
    ['code-editor', 'CodeMirror 6'],
    ['word-editor', 'Document Template'],
    ['performance-table', 'Large Data Stress'],
  ] as const;
  for (const [cardId, eyebrow] of expectedCards) {
    const card = page.locator(`[data-home-card="${cardId}"]`);
    await expect(card).toBeVisible({ timeout: 3000 });
    await expect(card).toContainText(eyebrow);
  }

  // plan 502 round-3 起卡片标题在 <button> 内以 <span> 承载（<button> 禁止 h2 子元素），
  // 标题断言随卡片容器走：data-home-card 内出现精确标题文案。
  const expectedTitles = [
    'component-lab',
    'flux-basic',
    'flow-designer',
    'taskflow-designer',
    'm5-showcase',
    'report-designer',
    'debugger-lab',
    'condition-builder',
    'code-editor',
    'word-editor',
    'performance-table',
  ] as const;
  const expectedTitleCopy: Record<(typeof expectedTitles)[number], string> = {
    'component-lab': 'Component Lab',
    'flux-basic': 'Flux Basic',
    'flow-designer': 'Flow Designer',
    'taskflow-designer': 'TaskFlow Designer',
    'm5-showcase': 'Mobile Component Showcase',
    'report-designer': 'Report Designer',
    'debugger-lab': 'Debugger Lab',
    'condition-builder': 'Condition Builder',
    'code-editor': 'Code Editor',
    'word-editor': 'Word Editor',
    'performance-table': 'Performance Table',
  };
  for (const cardId of expectedTitles) {
    await expect(
      page.locator(`[data-home-card="${cardId}"]`).filter({ hasText: expectedTitleCopy[cardId] }),
    ).toBeVisible({ timeout: 3000 });
  }

  await assertTrackedPageErrors(page);
});

test('entry page "TaskFlow" card navigates to taskflow designer', async ({ page }) => {
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0, { timeout: 10000 });

  const taskflowCard = page.locator('button', { hasText: 'TaskFlow' });
  await expect(taskflowCard).toBeVisible({ timeout: 5000 });
  await taskflowCard.click();

  await expect(page).toHaveURL(/#\/taskflow-designer/);
  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 30000 });

  await assertTrackedPageErrors(page);
});

test('TaskFlow (Graph) tab renders 7 nodes and toolbar', async ({ page }) => {
  await openTaskFlowDesigner(page);

  const taskflowGraphTab = page.getByRole('tab', { name: 'TaskFlow (Graph)' });
  await expect(taskflowGraphTab).toBeVisible();
  await taskflowGraphTab.click();
  await page.waitForTimeout(2000);

  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 15000 });

  const toolbar = page.locator('[data-testid="designer-toolbar"]').first();
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Export' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Import' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Save' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Back' })).toBeVisible();

  const nodeLabels = await page.locator('.react-flow__node').allTextContents();
  expect(nodeLabels.some((t) => t.includes('start'))).toBe(true);
  expect(nodeLabels.some((t) => t.includes('validateInput'))).toBe(true);
  expect(nodeLabels.some((t) => t.includes('subGraph'))).toBe(true);
  expect(nodeLabels.some((t) => t.includes('complete'))).toBe(true);

  await assertTrackedPageErrors(page);
});

test('TaskFlow (Tree) tab renders tree document', async ({ page }) => {
  await openTaskFlowDesigner(page);
  await page.waitForTimeout(1000);

  const taskflowTreeTab = page.getByRole('tab', { name: 'TaskFlow (Tree)' });
  await expect(taskflowTreeTab).toBeVisible();
  await taskflowTreeTab.click();
  await page.waitForTimeout(2000);

  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });

  const toolbar = page.locator('[data-testid="designer-toolbar"]').first();
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Export' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Save' })).toBeVisible();

  await assertTrackedPageErrors(page);
});

test('switching between TaskFlow modes produces no errors', async ({ page }) => {
  await openTaskFlowDesigner(page);
  await page.waitForTimeout(1000);

  const tabCycles = ['TaskFlow (Graph)', 'TaskFlow (Tree)'];
  for (const tabLabel of tabCycles) {
    const tab = page.getByRole('tab', { name: tabLabel });
    await expect(tab).toBeVisible({ timeout: 5000 });
    await tab.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 });
  }

  await assertTrackedPageErrors(page);
});

test('TaskFlow (Graph) toolbar buttons are functional (export + save)', async ({ page }) => {
  await openTaskFlowDesigner(page);
  await page.waitForTimeout(1000);

  const taskflowGraphTab = page.getByRole('tab', { name: 'TaskFlow (Graph)' });
  await taskflowGraphTab.click();
  await page.waitForTimeout(2000);
  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 15000 });

  const toolbar = page.locator('[data-testid="designer-toolbar"]').first();
  await expect(toolbar).toBeVisible();

  // plan 556: Export toggles the designer's built-in JSON panel (a real
  // surface). The panel is modal — background content (the toolbar) is
  // aria-hidden while it is open, so close it before pressing Save.
  const exportBtn = toolbar.getByRole('button', { name: 'Export' });
  await expect(exportBtn).toBeVisible();
  await exportBtn.click();
  const jsonPanel = page.locator('[data-slot="designer-json-panel"]');
  await expect(jsonPanel).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');
  await expect(jsonPanel).toBeHidden({ timeout: 10_000 });

  const saveBtn = toolbar.getByRole('button', { name: 'Save' });
  await expect(saveBtn).toBeVisible();
  await saveBtn.click();
  await page.waitForTimeout(500);

  await assertTrackedPageErrors(page);
});

test('TaskFlow (Graph) palette shows node types', async ({ page }) => {
  await openTaskFlowDesigner(page);
  await page.waitForTimeout(1000);

  const taskflowGraphTab = page.getByRole('tab', { name: 'TaskFlow (Graph)' });
  await taskflowGraphTab.click();
  await page.waitForTimeout(2000);
  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 15000 });

  const leftPanel = page.locator('[data-testid="left-panel-expanded"]').first();
  await expect(leftPanel).toBeVisible({ timeout: 10000 });

  const paletteGroups = leftPanel.locator('[data-slot="designer-palette-item"]');
  await expect(paletteGroups.first()).toBeVisible({ timeout: 5000 });

  await leftPanel.getByText('Control').click();
  await page.waitForTimeout(200);
  await leftPanel.getByText('Containers').click();
  await page.waitForTimeout(200);

  await expect(paletteGroups.first()).toBeVisible({ timeout: 3000 });
  const allTexts = await paletteGroups.allTextContents();
  const combined = allTexts.join(' ');
  expect(combined).toContain('Start');
  expect(combined).toContain('End');
  expect(combined).toContain('Script');

  await assertTrackedPageErrors(page);
});

test('TaskFlow (Graph) renders edges', async ({ page }) => {
  await openTaskFlowDesigner(page);
  await page.waitForTimeout(1000);

  const taskflowGraphTab = page.getByRole('tab', { name: 'TaskFlow (Graph)' });
  await taskflowGraphTab.click();
  await page.waitForTimeout(2000);
  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 15000 });

  const edges = page.locator('.react-flow__edge');
  await expect(edges.first()).toBeVisible({ timeout: 5000 });

  await assertTrackedPageErrors(page);
});
