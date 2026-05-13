import { expect, test, type Page } from '@playwright/test';
import { DOMAIN_RENDERER_ROUTES } from '../../../apps/playground/src/route-model';

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

async function assertZeroErrors(errors: string[]) {
  expect(filterKnownNoise(errors)).toEqual([]);
}

async function assertDebuggerZeroErrors(page: Page) {
  const debuggerErrors = await page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    return api ? api.queryEvents({ kind: 'error' }) : [];
  });
  expect(debuggerErrors).toHaveLength(0);
}

async function _getDebuggerApi(page: Page) {
  return page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    if (!api) return null;
    return {
      controllerId: api.controllerId,
      sessionId: api.sessionId,
      version: api.version,
    };
  });
}

test.describe.skip('Subagent-A: Debugger API deep inspection across pages', () => {
  test('getNodeDiagnostics returns well-formed result on flux-basic page', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/flux-basic', { waitUntil: 'load' });
    await expect(
      page.getByRole('heading', { name: 'Renderer Playground', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    const diag = await page.evaluate(() => {
      const api = (window as any).__NOP_DEBUGGER_API__;
      if (!api) return null;
      const firstCidEl = document.querySelector('[data-cid]');
      const cid = firstCidEl ? Number(firstCidEl.getAttribute('data-cid')) : 0;
      if (cid === 0) return { noCid: true };
      return api.getNodeDiagnostics({ cid });
    });

    if (diag && !diag.noCid) {
      expect(diag).toHaveProperty('totalEvents');
      expect(diag).toHaveProperty('recentEvents');
      expect(diag).toHaveProperty('countsByGroup');
      expect(Array.isArray(diag.recentEvents)).toBe(true);
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('getNodeAnomalies returns undefined or valid summary on code-editor page', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/code-editor', { waitUntil: 'load' });
    await expect(
      page.getByRole('heading', { name: 'Code Editor Playground', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    const anomaly = await page.evaluate(() => {
      const api = (window as any).__NOP_DEBUGGER_API__;
      if (!api) return null;
      const firstCidEl = document.querySelector('[data-cid]');
      const cid = firstCidEl ? Number(firstCidEl.getAttribute('data-cid')) : 0;
      if (cid === 0) return { noCid: true };
      return api.getNodeAnomalies({ cid });
    });

    if (anomaly && !anomaly.noCid && anomaly !== undefined) {
      expect(anomaly).toHaveProperty('hints');
      expect(Array.isArray(anomaly.hints)).toBe(true);
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('getRecentFailures returns empty array on clean debugger-lab page', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/debugger-lab', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Debugger Lab' })).toBeVisible({
      timeout: 15_000,
    });

    const failures = await page.evaluate(() => {
      const api = (window as any).__NOP_DEBUGGER_API__;
      if (!api) return null;
      return api.getRecentFailures({ limit: 10 });
    });

    expect(failures).toEqual([]);

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('createDiagnosticReport returns well-formed report on performance-table page', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/performance-table', { waitUntil: 'load' });
    await expect(
      page.getByRole('heading', { name: 'Table Performance Playground', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    const report = await page.evaluate(() => {
      const api = (window as any).__NOP_DEBUGGER_API__;
      if (!api) return null;
      return api.createDiagnosticReport({ includeEventSamples: true });
    });

    if (report) {
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('overview');
      expect(report).toHaveProperty('recentEvents');
      expect(report).toHaveProperty('pinnedErrors');
      expect(typeof report.generatedAt).toBe('number');
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('inspectByCid returns component info on condition-builder page', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/condition-builder', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: '条件构建器测试', level: 1 })).toBeVisible({
      timeout: 15_000,
    });

    const inspectResult = await page.evaluate(() => {
      const api = (window as any).__NOP_DEBUGGER_API__;
      if (!api) return null;
      const firstCidEl = document.querySelector('[data-cid]');
      const cid = firstCidEl ? Number(firstCidEl.getAttribute('data-cid')) : 0;
      if (cid === 0) return { noCid: true };
      return api.inspectByCid(cid);
    });

    if (inspectResult && !inspectResult.noCid) {
      expect(inspectResult).toHaveProperty('cid');
      expect(typeof inspectResult.cid).toBe('number');
      expect(inspectResult).toHaveProperty('type');
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe.skip('Subagent-A: Cross-page navigation stress', () => {
  test('rapid sequential navigation through all 9 domain pages collects zero errors', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = collectPageErrors(page);

    const routeIds = DOMAIN_RENDERER_ROUTES.map((r) => r.id);
    expect(routeIds).toHaveLength(9);

    const headings: Record<string, string> = {
      'flux-basic': 'Renderer Playground',
      'flow-designer': '工作流',
      'dingtalk-flow-demo': 'Back',
      'report-designer': 'Report Designer Playground',
      'debugger-lab': 'Debugger Lab',
      'condition-builder': '条件构建器测试',
      'code-editor': 'Code Editor Playground',
      'word-editor': 'Word Editor',
      'performance-table': 'Table Performance Playground',
    };

    for (const routeId of routeIds) {
      await page.goto(`/#/${routeId}`, { waitUntil: 'domcontentloaded' });
      const heading = headings[routeId];
      if (heading) {
        await page.getByText(heading).first().waitFor({ state: 'visible', timeout: 30_000 });
      }
      await page.waitForTimeout(200);
    }

    for (const routeId of routeIds.reverse()) {
      await page.goto(`/#/${routeId}`, { waitUntil: 'domcontentloaded' });
      const heading = headings[routeId];
      if (heading) {
        await page.getByText(heading).first().waitFor({ state: 'visible', timeout: 30_000 });
      }
      await page.waitForTimeout(200);
    }

    await assertZeroErrors(errors);
  });

  test('rapid ping-pong between heavy pages (flow-designer <-> report-designer) is clean', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors = collectPageErrors(page);

    for (let i = 0; i < 3; i++) {
      await page.goto('/#/flow-designer', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: 30_000 });

      await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: 'Report Designer Playground', level: 1 }),
      ).toBeVisible({ timeout: 30_000 });
    }

    await assertZeroErrors(errors);
    const failures = await page.evaluate(() => {
      const api = (window as any).__NOP_DEBUGGER_API__;
      return api ? api.getRecentFailures({ limit: 5 }) : [];
    });
    expect(failures).toEqual([]);
  });
});

test.describe.skip('Subagent-A: Flow Designer interaction stress', () => {
  test('click multiple canvas nodes sequentially and verify inspector updates', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/flow-designer', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30_000 });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < Math.min(nodeCount, 5); i++) {
      const node = page.locator('.react-flow__node').nth(i);
      await node.click();
      await page.waitForTimeout(300);
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('add node from palette, click it, delete it — no errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/flow-designer', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30_000 });

    const initialCount = await page.locator('.react-flow__node').count();

    const addTaskButton = page
      .locator('[data-slot="designer-palette-item"]')
      .filter({ hasText: '任务节点' })
      .locator('button')
      .nth(1);
    if (await addTaskButton.isVisible().catch(() => false)) {
      await addTaskButton.click();
      await page.waitForTimeout(500);

      const newCount = await page.locator('.react-flow__node').count();
      expect(newCount).toBe(initialCount + 1);

      const lastNode = page.locator('.react-flow__node').last();
      await lastNode.click();
      await page.waitForTimeout(300);

      const deleteBtn = page.getByRole('button', { name: '删除节点' }).first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
        const finalCount = await page.locator('.react-flow__node').count();
        expect(finalCount).toBe(initialCount);
      }
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe.skip('Subagent-A: Concurrency stress — rapid button clicking', () => {
  test('rapidly click Search Directory button 5 times on flux-basic', async ({ page }) => {
    test.setTimeout(60_000);
    const errors = collectPageErrors(page);
    await page.goto('/#/flux-basic', { waitUntil: 'load' });
    await expect(
      page.getByRole('heading', { name: 'Renderer Playground', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('Username').fill('alice');
    await page.getByLabel('Username').blur();

    const searchBtn = page.getByRole('button', { name: 'Search Directory' });
    if (await searchBtn.isVisible().catch(() => false)) {
      for (let i = 0; i < 5; i++) {
        await searchBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(2000);
    }

    await assertZeroErrors(errors);
  });

  test('rapidly open and close dialog on lab renderer', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/lab/dialog', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('component-lab')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('component-lab-renderer-dialog')).toBeVisible({
      timeout: 30_000,
    });

    const stage = page.getByTestId('scenario-stage-dialog-with-form-fields-and-writeback');
    if (await stage.isVisible().catch(() => false)) {
      const openBtn = stage.getByRole('button', { name: /open|dialog/i }).first();
      if (await openBtn.isVisible().catch(() => false)) {
        for (let i = 0; i < 3; i++) {
          await openBtn.click();
          await page.waitForTimeout(300);
          const dialog = page.locator('[role="dialog"]').first();
          if (await dialog.isVisible().catch(() => false)) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
        }
      }
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe.skip('Subagent-A: Form field edge cases — rapid fill, clear, submit', () => {
  test('rapidly fill and clear input-text field 5 times', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/lab/input-text', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('component-lab-renderer-input-text')).toBeVisible({
      timeout: 30_000,
    });

    const stage = page.getByTestId(
      'scenario-stage-basic-required-and-optional-fields',
    );
    if (await stage.isVisible().catch(() => false)) {
      const input = stage.locator('input').first();
      if (await input.isVisible().catch(() => false)) {
        for (let i = 0; i < 5; i++) {
          await input.fill(`test-value-${i}`);
          await page.waitForTimeout(50);
          await input.clear();
          await page.waitForTimeout(50);
        }
      }
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('submit form with empty required fields, then fill and resubmit — repeat 3 times', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/lab/form', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('component-lab-renderer-form')).toBeVisible({
      timeout: 30_000,
    });

    const stage = page.getByTestId(
      'scenario-stage-form-with-visible-submit-success-state',
    );
    if (await stage.isVisible().catch(() => false)) {
      const submitBtn = stage.getByRole('button', { name: /submit/i }).first();
      const firstInput = stage.locator('input').first();

      for (let i = 0; i < 3; i++) {
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(200);
        }
        if (await firstInput.isVisible().catch(() => false)) {
          await firstInput.fill(`user-${i}`);
          await page.waitForTimeout(100);
        }
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(300);
        }
        if (await firstInput.isVisible().catch(() => false)) {
          await firstInput.clear();
          await page.waitForTimeout(100);
        }
      }
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe.skip('Subagent-A: Report Designer basic interaction', () => {
  test('click 5 different cells, verify inspector updates, no errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Report Designer Playground', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.ss-cell').first()).toBeVisible({ timeout: 15_000 });

    const cells = page.locator('.ss-cell');
    const count = await cells.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      await cells.nth(i).click();
      await page.waitForTimeout(200);
    }

    const inspector = page.locator('[data-slot="workbench-right-panel"]');
    await expect(inspector).toContainText('Inspector');

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('toolbar buttons are all clickable without errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.rd-toolbar')).toBeVisible({ timeout: 30_000 });

    const toolbarButtons = page.locator('.rd-toolbar button');
    const count = await toolbarButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 4); i++) {
      const btn = toolbarButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
        if (!page.isClosed()) break;
      }
    }

    if (!page.isClosed()) {
      await assertZeroErrors(errors);
      await assertDebuggerZeroErrors(page);
    }
  });
});

test.describe.skip('Subagent-A: Word Editor basic interaction', () => {
  test('click canvas, type, click formatting buttons — no errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/word-editor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({
      timeout: 30_000,
    });

    const canvasEl = page.locator('canvas').first();
    if (await canvasEl.isVisible().catch(() => false)) {
      await canvasEl.click();
      await page.waitForTimeout(300);
      await page.keyboard.type('Test typing in word editor');
      await page.waitForTimeout(300);
    }

    const boldBtn = page.getByTitle('Bold');
    if (await boldBtn.isVisible().catch(() => false)) {
      await boldBtn.click();
      await page.waitForTimeout(200);
    }

    const italicBtn = page.getByTitle('Italic');
    if (await italicBtn.isVisible().catch(() => false)) {
      await italicBtn.click();
      await page.waitForTimeout(200);
    }

    const saveBtn = page.getByRole('button', { name: '保存' });
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(500);
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('open and close dialogs (hyperlink, expression) without errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/word-editor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({
      timeout: 30_000,
    });

    const hyperlinkBtn = page.getByTitle('Insert Hyperlink');
    if (await hyperlinkBtn.isVisible().catch(() => false)) {
      await hyperlinkBtn.click();
      await page.waitForTimeout(500);
      const cancelBtn = page.getByRole('button', { name: '取消' }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
      await page.waitForTimeout(300);
    }

    const exprBtn = page.getByTitle('Insert Expression');
    if (await exprBtn.isVisible().catch(() => false)) {
      await exprBtn.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    await assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});
