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

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0, { timeout: 10000 });

  const flowDesignerCard = page.locator('button', { hasText: 'Visual Workflow' });
  await expect(flowDesignerCard).toBeVisible({ timeout: 5000 });
  await flowDesignerCard.click();

  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('playground entry page renders all nav cards', async ({ page }) => {
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0, { timeout: 10000 });

  const expectedEyebrows = [
    'All Renderers',
    'Core Renderers',
    'Visual Workflow',
    'Style Prototype',
    'Spreadsheet + Metadata',
    'DevTools',
    'Form Control',
    'CodeMirror 6',
    'Document Template',
    'Large Data Stress',
  ];
  for (const eyebrow of expectedEyebrows) {
    await expect(page.locator('button', { hasText: eyebrow })).toBeVisible({ timeout: 3000 });
  }

  const expectedTitles = [
    'Component Lab',
    'Flux Basic',
    'Flow Designer',
    'DingTalk Flow Demo',
    'Report Designer',
    'Debugger Lab',
    'Condition Builder',
    'Code Editor',
    'Word Editor',
    'Performance Table',
  ];
  for (const title of expectedTitles) {
    await expect(page.locator('h2', { hasText: title })).toBeVisible({ timeout: 3000 });
  }

  await assertTrackedPageErrors(page);
});

test('entry page "Flow Designer" card navigates to flow designer', async ({ page }) => {
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0, { timeout: 10000 });

  const flowDesignerCard = page.locator('button', { hasText: 'Visual Workflow' });
  await expect(flowDesignerCard).toBeVisible({ timeout: 5000 });
  await flowDesignerCard.click();

  await expect(page).toHaveURL(/#\/flow-designer/);
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 30000 });

  await assertTrackedPageErrors(page);
});

test('TaskFlow (Graph) tab renders 7 nodes and toolbar', async ({ page }) => {
  await openFlowDesigner(page);

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
  await openFlowDesigner(page);
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

test('switching between TaskFlow and existing tabs produces no errors', async ({ page }) => {
  await openFlowDesigner(page);
  await page.waitForTimeout(1000);

  const tabCycles = ['TaskFlow (Graph)', '工作流', 'TaskFlow (Tree)', '钉钉审批流'];
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
  await openFlowDesigner(page);
  await page.waitForTimeout(1000);

  const taskflowGraphTab = page.getByRole('tab', { name: 'TaskFlow (Graph)' });
  await taskflowGraphTab.click();
  await page.waitForTimeout(2000);
  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 15000 });

  const toolbar = page.locator('[data-testid="designer-toolbar"]').first();
  await expect(toolbar).toBeVisible();

  const exportBtn = toolbar.getByRole('button', { name: 'Export' });
  await expect(exportBtn).toBeVisible();
  await exportBtn.click();
  await page.waitForTimeout(500);

  const saveBtn = toolbar.getByRole('button', { name: 'Save' });
  await expect(saveBtn).toBeVisible();
  await saveBtn.click();
  await page.waitForTimeout(500);

  await assertTrackedPageErrors(page);
});

test('TaskFlow (Graph) palette shows node types', async ({ page }) => {
  await openFlowDesigner(page);
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
  await openFlowDesigner(page);
  await page.waitForTimeout(1000);

  const taskflowGraphTab = page.getByRole('tab', { name: 'TaskFlow (Graph)' });
  await taskflowGraphTab.click();
  await page.waitForTimeout(2000);
  await expect(page.locator('.react-flow__node')).toHaveCount(7, { timeout: 15000 });

  const edges = page.locator('.react-flow__edge');
  await expect(edges.first()).toBeVisible({ timeout: 5000 });

  await assertTrackedPageErrors(page);
});
