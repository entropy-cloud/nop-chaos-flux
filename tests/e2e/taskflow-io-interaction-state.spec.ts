import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// plan 556 (IS-taskflow-designer-002 successor closure): Save/Export/Import on
// the TaskFlow demo must produce real, observable results.
//
//   - Tree-tab Save previously failed with "No authoring model available."
//     (the designer projection was never synced into a dingflow model); the
//     lib now bootstraps from the projection, so Save toasts 已保存.
//   - Export previously toasted "已导出到检查器输出" while the toolbar channel
//     discarded the provider result (fake feedback); it now toggles the
//     designer's built-in JSON panel (designer:export), a real surface.
//   - Import previously hard-failed ("requires a valid nop-task JSON payload")
//     because the toolbar channel cannot carry a payload; it now opens a
//     page-level paste dialog, and a valid DSL re-injects the canvas document.

// The import journey triggers a heavy SchemaRenderer remount; sonner toasts
// can expire while the main thread is blocked, so toasts are recorded
// monotonically from an init script instead of read from the live DOM.
async function installToastRecorder(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __toastLog?: string[] };
    w.__toastLog = [];
    const record = () => {
      for (const el of document.querySelectorAll('[data-sonner-toast]')) {
        const text = el.textContent ?? '';
        if (text && !w.__toastLog!.includes(text)) w.__toastLog!.push(text);
      }
    };
    setInterval(record, 250);
    const attachObserver = () => {
      if (document.body) {
        new MutationObserver(record).observe(document.body, { childList: true, subtree: true });
      } else {
        setTimeout(attachObserver, 100);
      }
    };
    attachObserver();
  });
}

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/');
  const hasSignIn = await page.getByRole('button', { name: 'Sign in' }).count();
  if (hasSignIn > 0) {
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForTimeout(500);
  }
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0, { timeout: 10000 });
}

async function openTaskFlowDesigner(page: import('@playwright/test').Page) {
  await signIn(page);
  const taskflowCard = page.locator('button', { hasText: 'TaskFlow' });
  await expect(taskflowCard).toBeVisible({ timeout: 5000 });
  await taskflowCard.click();
  await expect(page).toHaveURL(/#\/taskflow-designer/);
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30000 });
}

async function switchTab(page: import('@playwright/test').Page, label: 'TaskFlow (Graph)' | 'TaskFlow (Tree)') {
  const tab = page.getByRole('tab', { name: label });
  await expect(tab).toBeVisible({ timeout: 5000 });
  await tab.click();
  await page.waitForTimeout(2000);
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
}

function toolbar(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="designer-toolbar"]').first();
}

async function readToasts(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __toastLog?: string[] }).__toastLog ?? []);
}

const IMPORT_DSL = {
  kind: 'nop-taskflow',
  schemaVersion: '1.0',
  task: { graphMode: false },
  steps: [
    {
      type: 'sequential',
      name: 'importedSeq',
      steps: [{ type: 'script', name: 'importedScript' }],
    },
    {
      type: 'if',
      name: 'importedIf',
      branches: [
        { branchType: 'then', steps: [{ type: 'invoke', name: 'importedThenStep' }] },
      ],
    },
  ],
};

test.describe('TaskFlow designer Save/Export/Import (plan 556)', () => {
  test('Tree tab Save syncs the projection and toasts 已保存', async ({ page }) => {
    await installToastRecorder(page);
    await openTaskFlowDesigner(page);
    await switchTab(page, 'TaskFlow (Tree)');

    await toolbar(page).getByRole('button', { name: 'Save' }).click();
    await expect
      .poll(async () => (await readToasts(page)).some((text) => text.includes('已保存')), { timeout: 10_000 })
      .toBe(true);

    await assertTrackedPageErrors(page);
  });

  test('Graph tab Export opens the built-in JSON panel (no fake success toast)', async ({ page }) => {
    await installToastRecorder(page);
    await openTaskFlowDesigner(page);
    await switchTab(page, 'TaskFlow (Graph)');

    await toolbar(page).getByRole('button', { name: 'Export' }).click();
    const jsonPanel = page.locator('[data-slot="designer-json-panel"]');
    await expect(jsonPanel).toBeVisible({ timeout: 10_000 });
    await expect(jsonPanel).toContainText('nop-taskflow', { timeout: 10_000 });

    const toasts = await readToasts(page);
    expect(toasts.some((text) => text.includes('已导出到检查器输出'))).toBe(false);

    await assertTrackedPageErrors(page);
  });

  test('Tree tab Export opens the built-in JSON panel', async ({ page }) => {
    await installToastRecorder(page);
    await openTaskFlowDesigner(page);
    await switchTab(page, 'TaskFlow (Tree)');

    await toolbar(page).getByRole('button', { name: 'Export' }).click();
    const jsonPanel = page.locator('[data-slot="designer-json-panel"]');
    await expect(jsonPanel).toBeVisible({ timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('Tree tab Import: paste dialog replaces the canvas document and toasts 导入成功', async ({ page }) => {
    await installToastRecorder(page);
    await openTaskFlowDesigner(page);
    await switchTab(page, 'TaskFlow (Tree)');

    const nodeCountBefore = await page.locator('.react-flow__node').count();
    expect(nodeCountBefore).toBeGreaterThan(0);

    await toolbar(page).getByRole('button', { name: 'Import' }).click();
    const dialog = page.locator('[data-testid="taskflow-import-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="taskflow-import-input"]').fill(JSON.stringify(IMPORT_DSL));
    await page.locator('[data-testid="taskflow-import-confirm"]').click();

    await expect
      .poll(async () => (await readToasts(page)).some((text) => text.includes('导入成功')), { timeout: 10_000 })
      .toBe(true);

    // The imported document (2 top-level steps → entry + sequential + script +
    // if + branch invoke nodes in the dingflow projection) replaces the demo
    // canvas; the rendered node set must change.
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
    const nodeLabels = await page.locator('.react-flow__node').allTextContents();
    const combined = nodeLabels.join(' ');
    expect(combined).toContain('importedSeq');
    expect(combined).not.toContain('initSequence');

    await assertTrackedPageErrors(page);
  });

  test('Tree tab Import: invalid paste toasts the parse error and keeps the canvas', async ({ page }) => {
    await installToastRecorder(page);
    await openTaskFlowDesigner(page);
    await switchTab(page, 'TaskFlow (Tree)');

    const labelsBefore = (await page.locator('.react-flow__node').allTextContents()).join(' ');

    await toolbar(page).getByRole('button', { name: 'Import' }).click();
    const dialog = page.locator('[data-testid="taskflow-import-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="taskflow-import-input"]').fill('{ not valid json');
    await page.locator('[data-testid="taskflow-import-confirm"]').click();

    await expect
      .poll(async () => (await readToasts(page)).some((text) => text.includes('导入失败')), { timeout: 10_000 })
      .toBe(true);

    const labelsAfter = (await page.locator('.react-flow__node').allTextContents()).join(' ');
    expect(labelsAfter).toBe(labelsBefore);

    await assertTrackedPageErrors(page);
  });
});
