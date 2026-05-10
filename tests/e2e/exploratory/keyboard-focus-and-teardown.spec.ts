import { expect, test, type Page } from '@playwright/test';
import { ComponentLabHelper, scenarioSlug } from '../component-lab/helpers';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

function filterKnownNoise(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('WebSocket connection'),
  );
}

function assertZeroPageErrors(errors: string[]) {
  expect(filterKnownNoise(errors)).toEqual([]);
}

async function clearDebugger(page: Page) {
  await page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    api?.clear?.();
  });
}

async function assertDebuggerHealthy(page: Page) {
  const result = await page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    if (!api) {
      return { errors: [], failures: [] };
    }

    return {
      errors: api.queryEvents({ kind: 'error' }),
      failures: api.getRecentFailures({ limit: 10 }),
    };
  });

  expect(result.errors).toHaveLength(0);
  expect(result.failures).toHaveLength(0);
}

test.describe('Exploratory run-02: keyboard, focus, and teardown', () => {
  test('dialog: Enter opens dialog, Escape closes, focus returns to trigger', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('dialog');
    await clearDebugger(page);

    const stage = lab.scenarioStage(scenarioSlug('Dialog with form fields and writeback'));
    await expect(stage).toBeVisible();

    const trigger = stage.getByRole('button', { name: 'Edit Contact' });
    await trigger.focus();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });

  test('drawer: keyboard open/close keeps focus stable and zero errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('drawer');
    await clearDebugger(page);

    const stage = lab.scenarioStage(scenarioSlug('Right drawer with form and writeback'));
    await expect(stage).toBeVisible();

    const trigger = stage.getByRole('button', { name: 'Open Right Drawer' });
    await trigger.focus();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });

  test('tabs: keyboard navigation moves focus and Enter activates next tab without errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('tabs');
    await clearDebugger(page);

    const stage = lab.scenarioStage(scenarioSlug('Horizontal tabs (top)'));
    await expect(stage).toBeVisible();

    const overviewTab = stage.getByRole('tab', { name: 'Overview' });
    const teamTab = stage.getByRole('tab', { name: 'Team' });

    await overviewTab.focus();
    await expect(overviewTab).toBeFocused();
    await page.keyboard.press('ArrowRight');

    await expect(teamTab).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(teamTab).toHaveAttribute('aria-selected', 'true');
    await expect(stage.getByText('Alice Johnson')).toBeVisible();

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });

  test('select: keyboard selection updates scope-debug and no runtime failures', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('select');
    await clearDebugger(page);

    const stage = lab.scenarioStage(scenarioSlug('Single-value select with inline options'));
    await expect(stage).toBeVisible();

    const trigger = stage.getByRole('combobox').first();
    const scopeDebug = stage.locator('[data-slot="scope-debug-json"]');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('option', { name: 'United Kingdom' })).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(trigger).toContainText('United Kingdom');
    await expect(scopeDebug).toContainText('"country": "uk"');

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });

  test('tree-select: keyboard opens popover and selects a tree item without errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('tree-select');
    await clearDebugger(page);

    const stage = lab.scenarioStage(scenarioSlug('Single-value tree select with search'));
    await expect(stage).toBeVisible();

    const trigger = stage.locator('[data-slot="tree-select-trigger-row"] button').first();
    const scopeDebug = stage.locator('[data-slot="scope-debug-json"]');
    await trigger.focus();
    await page.keyboard.press('Enter');

    const platformNode = page
      .locator('[data-slot="tree-option-node"] [role="treeitem"]')
      .filter({ hasText: 'Platform' })
      .first();
    await expect(platformNode).toBeVisible();
    await platformNode.focus();
    await page.keyboard.press('Enter');

    await expect(stage.locator('[data-slot="tree-select-value"]')).toContainText('Platform');
    await expect(scopeDebug).toContainText('"team": "platform"');

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });

  test('code-editor: keyboard typing and Escape-driven panels keep debugger clean', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('/#/code-editor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Code Editor Playground', level: 1 })).toBeVisible({ timeout: 30_000 });
    await clearDebugger(page);

    const plainField = page.locator('.nop-field').filter({ hasText: 'Plain Text' }).first();
    await expect(plainField).toBeVisible();
    const editor = plainField.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.type('keyboard-run-02');

    const sqlField = page
      .locator('.nop-field')
      .filter({ hasText: 'SQL Editor (Format + Snippets + Variables + Execution)' })
      .first();
    await expect(sqlField).toBeVisible();
    await sqlField.locator('[data-slot="code-editor-snippet-toggle"]').first().click();
    await expect(page.locator('[data-slot="code-editor-snippet-dropdown"]').first()).toBeVisible();
    await page.keyboard.press('Escape');

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });

  test('word-editor: keyboard typing and Escape dialog close produce no failures', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('/#/word-editor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 30_000 });
    await clearDebugger(page);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await canvas.click();
    await page.keyboard.type('run-02 word keyboard probe');

    const exprButton = page.getByTitle('Insert Expression');
    await expect(exprButton).toBeVisible();
    await exprButton.click();
    await expect(page.getByText('插入模板表达式')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('插入模板表达式')).toHaveCount(0);

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });

  test('cross-page teardown: open dialog then navigate across heavy routes with no lingering failures', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('/#/lab/dialog', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('component-lab-renderer-dialog')).toBeVisible({ timeout: 30_000 });
    await clearDebugger(page);

    const stage = page.getByTestId('scenario-stage-dialog-with-form-fields-and-writeback');
    await stage.getByRole('button', { name: 'Edit Contact' }).click();
    await expect(page.getByRole('dialog').first()).toBeVisible();

    await page.goto('/#/code-editor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Code Editor Playground', level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.goto('/#/flow-designer', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: 30_000 });

    await page.goto('/#/lab/dialog', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('component-lab-renderer-dialog')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);

    assertZeroPageErrors(errors);
    await assertDebuggerHealthy(page);
  });
});
