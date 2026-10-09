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

// plan 557 Phase 1 (D1): the tree-mode debug emitter in designer-page-body
// unconditionally notifies "[flow-designer tree-layout] {...}" on every
// snapshot change — entering the Tree tab stacks info toasts over the
// inspector. The emission is a debug leftover; pin its removal: no sonner
// toast may contain the layout dump marker.
test('Tree tab produces no tree-layout debug toasts (plan 557 D1)', async ({ page }) => {
  await openTaskFlowDesigner(page);

  const taskflowTreeTab = page.getByRole('tab', { name: 'TaskFlow (Tree)' });
  await taskflowTreeTab.click();
  await page.waitForTimeout(3000);

  // Trigger at least one editor interaction so post-mount snapshot changes are
  // covered too (the old emitter fired on every statusSnapshot change).
  const canvas = page.locator('.react-flow__node').first();
  await canvas.click();
  await page.waitForTimeout(1000);

  const layoutToasts = await page.evaluate(() =>
    [...document.querySelectorAll('[data-sonner-toast]')]
      .map((el) => el.textContent ?? '')
      .filter((text) => text.includes('tree-layout')),
  );
  expect(layoutToasts).toEqual([]);

  await assertTrackedPageErrors(page);
});

// plan 557 Phase 2 (D2): taskflow tree nodes previously rendered as minimal
// icon+text pills (minWidth 130/140); the redesigned node bodies render real
// cards (tf-node data-slot, 220px-class rendered width) matching the
// dingtalk-workflow-tree reference. Measured via offsetWidth (layout pixels):
// tree mode sizes come from tree.layoutSize layout writes, and the canvas
// fit-view transform makes getBoundingClientRect read the zoomed visual size.
test('Tree tab renders carded taskflow nodes (plan 557 D2)', async ({ page }) => {
  await openTaskFlowDesigner(page);

  const taskflowTreeTab = page.getByRole('tab', { name: 'TaskFlow (Tree)' });
  await taskflowTreeTab.click();
  await page.waitForTimeout(3000);

  const cardReadout = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-slot="tf-node"]')];
    // offsetWidth = layout pixels, unaffected by the canvas fit-view transform
    // (getBoundingClientRect would read the zoomed visual size).
    return {
      count: cards.length,
      minWidth: cards.length ? Math.min(...cards.map((c) => c.offsetWidth)) : 0,
      hasHeader: cards.filter((c) => c.querySelector('[data-slot="tf-node-header"]')).length,
      hasSubtitle: cards.filter((c) => c.querySelector('[data-slot="tf-node-subtitle"]')).length,
    };
  });

  expect(cardReadout.count).toBeGreaterThanOrEqual(5);
  expect(cardReadout.minWidth).toBeGreaterThanOrEqual(200);
  expect(cardReadout.hasHeader).toBe(cardReadout.count);
  expect(cardReadout.hasSubtitle).toBe(cardReadout.count);

  await assertTrackedPageErrors(page);
});

// plan 557 follow-up (IS-taskflow-designer-007, user-reported): the tree chain
// + button appeared offset right of the vertical connector line. Root cause:
// the tree handle carried a DOUBLE centering shift (xyflow base
// `transform: translate(-50%, 6px)` plus the Tailwind `translate: -50%`
// property from `!-translate-x-1/2` — two independent CSS channels, -12px
// total), so every chain edge line ran 6px left of the card center while the
// + button centered on the card. This guard pins the concentric invariant:
// line center ≈ handle/card center ≈ + center (screen px, tolerance 2px).
test('Tree chain + button is concentric with the connector line (plan 557 follow-up)', async ({ page }) => {
  await openTaskFlowDesigner(page);
  const taskflowTreeTab = page.getByRole('tab', { name: 'TaskFlow (Tree)' });
  await taskflowTreeTab.click();
  await page.waitForTimeout(3000);

  // Edges re-mount on container resizes, so a single instantaneous read can
  // catch a half-mounted frame — sample in-page (yielding between samples so
  // React can commit) until the connector lines are settled, then extract the
  // vertical segments and measure lines, + buttons and cards from that frame.
  const geometry = await page.evaluate(async () => {
    const centerX = (el: Element) => {
      const r = el.getBoundingClientRect();
      return +(r.x + r.width / 2).toFixed(1);
    };
    // Extract the x of every VERTICAL segment from an edge path (M/L point
    // pairs sharing the same x — chains are single verticals, branch elbows
    // contribute their split/merge verticals). Segment local x maps to screen
    // x through the path bbox→rect scale, so everything below compares in
    // screen pixels.
    const verticalSegmentXs = () => {
      const xs: number[] = [];
      for (const p of document.querySelectorAll('path')) {
        const d = p.getAttribute('d') ?? '';
        if (!d.startsWith('M') || !d.includes('L')) continue;
        const points = d
          .slice(1)
          .split('L')
          .map((pair) => pair.trim().split(/\s+/).map(Number));
        const bbox = p.getBBox();
        const rect = p.getBoundingClientRect();
        const scaleX = bbox.width > 0 ? rect.width / bbox.width : 1;
        for (let i = 1; i < points.length; i++) {
          const [x1, y1] = points[i - 1];
          const [x2, y2] = points[i];
          if (x1 === x2 && Math.abs(y2 - y1) >= 20) {
            xs.push(+(rect.x + (x1 - bbox.x) * scaleX).toFixed(1));
          }
        }
      }
      return xs;
    };
    const plusCenters = () =>
      [...document.querySelectorAll('button.absolute')]
        .filter((b) => (b.getAttribute('aria-label') ?? '').includes('节点'))
        .map(centerX);
    const cardCenters = () => [...document.querySelectorAll('[data-slot="tf-node"]')].map(centerX);

    const deadline = Date.now() + 10_000;
    let best = { segments: verticalSegmentXs(), plusCenters: plusCenters(), cardCenters: cardCenters() };
    while (best.segments.length < 3 && Date.now() < deadline) {
      // Yield so React can commit edge re-renders between samples — a busy
      // loop would block the very commit this wait is for.
      await new Promise((resolve) => setTimeout(resolve, 100));
      const next = { segments: verticalSegmentXs(), plusCenters: plusCenters(), cardCenters: cardCenters() };
      if (next.segments.length >= best.segments.length) best = next;
    }
    return best;
  });

  expect(geometry.segments.length).toBeGreaterThanOrEqual(3);
  expect(geometry.plusCenters.length).toBeGreaterThanOrEqual(5);
  expect(geometry.cardCenters.length).toBeGreaterThanOrEqual(5);

  // Concentric invariant: every chain/branch + sits on a vertical connector
  // segment (≤2 screen px), every connector segment runs through a card
  // center, and every + sits on its card center. The handle double-translate
  // (IS-taskflow-designer-007) pushed segments 6 layout px left of the card
  // centers — ~4 screen px, which this tolerance convicts.
  for (const plus of geometry.plusCenters) {
    const nearestSegment = Math.min(...geometry.segments.map((x) => Math.abs(x - plus)));
    expect(nearestSegment, `+ at ${plus} must sit on a connector segment`).toBeLessThanOrEqual(2);
    const nearestCard = Math.min(...geometry.cardCenters.map((c) => Math.abs(c - plus)));
    expect(nearestCard, `+ at ${plus} must sit on a card center`).toBeLessThanOrEqual(2);
  }
  for (const segment of geometry.segments) {
    const nearestCard = Math.min(...geometry.cardCenters.map((c) => Math.abs(c - segment)));
    expect(nearestCard, `connector segment at ${segment} must run through a card center`).toBeLessThanOrEqual(2);
  }

  await assertTrackedPageErrors(page);
});
