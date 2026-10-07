import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import { openDesignerTab, openFlowDesigner, readPlusButtonGeometry } from './helpers/flow-canvas-sequence.js';

// IS-1 (plan 544) interaction-sequence specs for #/flow-designer.
// Convictions cite programmatic readings (graph coordinates via the viewport
// DOMMatrix), never screenshots — docs/skills/interaction-state-audit-prompt.md.
// Bootstrap/tab/readings helpers live in helpers/flow-canvas-sequence.ts (the
// canvas-sequence template IS-4 canvas batches reuse).

type TabName = '钉钉审批流' | 'Action 编排';

const openTreeTab = (page: import('@playwright/test').Page, tab: TabName) => openDesignerTab(page, tab);

// Demo-schema constants (dingtalk-workflow-tree-schema.json layerSpacing: 100;
// action-flow-tree-schema.json layerSpacing: 80) — the legal chain-gap band is
// [MIN_CHAIN_GAP=60, layerSpacing]. Merge-zone continuations sit at
// MIN_MERGE_GAP=120 and are excluded, so the strict midpoint assertion only
// ever sees true chain pairs, in the old implementation as well as the new.
const CHAIN_GAP_BAND_BY_TAB: Record<TabName, { min: number; max: number }> = {
  钉钉审批流: { min: 60, max: 100 },
  'Action 编排': { min: 60, max: 80 },
};

test.describe('IS-1 flow-designer interaction state (plan 544)', () => {
  for (const tab of ['钉钉审批流', 'Action 编排'] as TabName[]) {
    test(`V4: chain plus-buttons center on the parent-child gap midpoint (${tab})`, async ({ page }) => {
      await openFlowDesigner(page);
      await openTreeTab(page, tab);
      const reading = await readPlusButtonGeometry(page, CHAIN_GAP_BAND_BY_TAB[tab]);
      // sanity: the demo trees must expose chain pairs and leaf buttons,
      // otherwise the assertions below would pass vacuously.
      expect(reading.chainPairCount, 'chain pairs present').toBeGreaterThan(0);
      expect(reading.leafButtonCount, 'leaf buttons present').toBeGreaterThan(0);
      expect(
        reading.chainOffsets.every((offset) => Math.abs(offset) <= 2),
        `chain button centers within ±2px of gap midpoint, got: ${JSON.stringify(reading.chainOffsets)}`,
      ).toBe(true);
      expect(reading.clippedLeafButtons, 'leaf buttons not clipped by the canvas').toBe(0);
      await assertTrackedPageErrors(page);
    });
  }

  // V2 (plan 544 seed 2): tree commands must not silently move the viewport.
  // Red evidence (pre-fix, stashed fix): insert snapped the controlled viewport
  // from translate(399.01px, 48px) scale(0.456) to translate(0px, 0px) scale(1).
  test('V2: viewport transform persists across insert/delete/undo', async ({ page }) => {
    await openFlowDesigner(page);
    await openTreeTab(page, '钉钉审批流');
    const readViewport = () =>
      page.evaluate(() => ({
        transform: document.querySelector('.react-flow__viewport')?.getAttribute('style') ?? null,
        nodeCount: document.querySelectorAll('.react-flow__node').length,
      }));
    const identity = 'transform: translate(0px, 0px) scale(1);';
    const before = await readViewport();
    expect(before.transform, 'onInit fitView settled (non-identity transform)').not.toBe(identity);
    expect(before.transform).not.toBeNull();

    const idsBefore = await page.evaluate(() =>
      [...document.querySelectorAll('.react-flow__node')].map((n) => n.getAttribute('data-id')),
    );

    // insert leg
    await page
      .locator('button[aria-label="添加节点"], button[aria-label="Add node"]')
      .first()
      .click();
    const firstItem = page.getByRole('menuitem').first();
    await expect(firstItem).toBeVisible({ timeout: 5_000 });
    await firstItem.click();
    await page.waitForTimeout(600);
    const afterInsert = await readViewport();
    expect(afterInsert.nodeCount).toBe(before.nodeCount + 1);
    expect(afterInsert.transform, 'insert keeps the viewport transform').toBe(before.transform);

    // delete leg: right-click the newly inserted node and delete it
    const newId = await page.evaluate((beforeIds) => {
      for (const el of document.querySelectorAll('.react-flow__node')) {
        const id = el.getAttribute('data-id');
        if (id && !beforeIds.includes(id)) return id;
      }
      return null;
    }, idsBefore);
    expect(newId, 'inserted node found').not.toBeNull();
    await page.locator(`.react-flow__node[data-id="${newId}"]`).click({ button: 'right' });
    const deleteItem = page.locator('[data-testid="designer-context-delete-node"]');
    await expect(deleteItem).toBeVisible({ timeout: 5_000 });
    await deleteItem.click();
    await page.waitForTimeout(600);
    const afterDelete = await readViewport();
    expect(afterDelete.nodeCount).toBe(before.nodeCount);
    expect(afterDelete.transform, 'delete keeps the viewport transform').toBe(before.transform);

    // Undo leg lives at core level (tree-session.test.ts "undo/redo keeps the
    // viewport" regression guard): tree-mode tabs render no undo toolbar and no
    // keyboard undo shortcut, so there is no UI path to drive here. Core
    // preserved the viewport through undo before plan 544 and must keep doing so.
    await assertTrackedPageErrors(page);
  });

  // V4-collision (plan 544 Phase 4): on split-owner (condition) nodes the
  // in-node chain plus-button used to sit under the addCondition overlay
  // (viewport-portal z-order) — Playwright's actionability check proved the
  // overlay intercepted ALL pointer events, making insertBranchPair
  // unreachable (and insertBranchPair would overwrite existing branches).
  // Branch-group owners no longer render the in-node button.
  test('V4: chain plus-button does not intersect the branch overlay hit area', async ({ page }) => {
    await openFlowDesigner(page);
    await openTreeTab(page, '钉钉审批流');
    const reading = await page.evaluate(() => {
      const branch = [...document.querySelectorAll('button')].find((b) =>
        /添加分支|Add branch/i.test(b.getAttribute('aria-label') ?? ''),
      );
      if (!branch) return { branchCount: 0, chainCount: 0, intersections: [] };
      const br = branch.getBoundingClientRect();
      const chain = [...document.querySelectorAll('button')].filter((b) =>
        /添加节点|Add node/i.test(b.getAttribute('aria-label') ?? ''),
      );
      const intersections = [];
      for (const btn of chain) {
        const r = btn.getBoundingClientRect();
        const overlapX = Math.min(br.right, r.right) - Math.max(br.left, r.left);
        const overlapY = Math.min(br.bottom, r.bottom) - Math.max(br.top, r.top);
        if (overlapX > 0 && overlapY > 0) {
          intersections.push({ overlap: Math.round(overlapX * overlapY) });
        }
      }
      return { branchCount: 1, chainCount: chain.length, intersections };
    });
    expect(reading.branchCount, 'branch overlay present').toBe(1);
    expect(reading.chainCount, 'chain buttons remain on non-owner nodes').toBeGreaterThan(0);
    expect(
      reading.intersections,
      `chain button must not intersect the branch overlay hit area, got: ${JSON.stringify(reading.intersections)}`,
    ).toEqual([]);
    await assertTrackedPageErrors(page);
  });

  // V6 (plan 544 seed 3): summary entities must have perceivable resting
  // boundaries; missing node/edge references must render a visible placeholder
  // instead of a zero-height bare div.
  test('V6: summary card boundaries perceivable and missing placeholders visible', async ({ page }) => {
    await openFlowDesigner(page);
    await page.getByRole('tab', { name: '节点/边摘要' }).click();
    const panel = page.locator('[data-testid="right-panel-expanded"]');
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel.locator('.nop-designer-node-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(panel.locator('.nop-designer-edge-row').first()).toBeVisible({ timeout: 10_000 });

    const readings = await page.evaluate(() => {
      const parseBorder = (el: Element) => {
        const style = getComputedStyle(el);
        const match = style.borderColor.match(/rgba?\(([^)]+)\)/);
        const alpha = match ? Number(match[1].split(',')[3] ?? 1) : 1;
        return { width: style.borderWidth, style: style.borderStyle, color: style.borderColor, alpha };
      };
      const nodeCard = document.querySelector('.nop-designer-node-card:not([data-empty])');
      const edgeRow = document.querySelector('.nop-designer-edge-row:not([data-empty])');
      const emptyNode = document.querySelector('.nop-designer-node-card[data-empty="true"]');
      const emptyEdge = document.querySelector('.nop-designer-edge-row[data-empty="true"]');
      return {
        nodeCard: nodeCard ? parseBorder(nodeCard) : null,
        edgeRow: edgeRow ? parseBorder(edgeRow) : null,
        emptyNodeHeight: emptyNode ? emptyNode.getBoundingClientRect().height : null,
        emptyEdgeHeight: emptyEdge ? emptyEdge.getBoundingClientRect().height : null,
        emptyEdgeText: emptyEdge ? (emptyEdge.textContent ?? '').trim() : null,
      };
    });

    expect(readings.nodeCard, 'node card present').not.toBeNull();
    expect(readings.edgeRow, 'edge row present').not.toBeNull();
    expect(readings.nodeCard?.alpha, `node card resting border opaque, got ${JSON.stringify(readings.nodeCard)}`).toBe(1);
    expect(readings.edgeRow?.alpha, `edge row resting border opaque, got ${JSON.stringify(readings.edgeRow)}`).toBe(1);
    expect(readings.emptyNodeHeight, 'missing node placeholder has height').toBeGreaterThan(0);
    expect(readings.emptyEdgeHeight, 'missing edge placeholder has height').toBeGreaterThan(0);
    expect(readings.emptyEdgeText?.length, 'missing edge placeholder carries text').toBeGreaterThan(0);

    // state distinguishability: clicking selects the card (data-selected +
    // onMouseEnter focus) and the selected boundary reading must differ from
    // resting (computedStyle-level, not class-list-level).
    const card = page.locator('.nop-designer-node-card:not([data-empty])').first();
    const restingColor = readings.nodeCard?.color;
    await card.hover();
    await page.waitForTimeout(200);
    await expect(card).toHaveAttribute('data-selected', 'true', { timeout: 5_000 });
    const selectedColor = await card.evaluate((el) => getComputedStyle(el).borderColor);
    expect(selectedColor, 'selected boundary differs from resting').not.toBe(restingColor);
    await assertTrackedPageErrors(page);
  });
});
